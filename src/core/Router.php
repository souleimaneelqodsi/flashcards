<?php
// src/core/Router.php

require_once __DIR__ . '/Response.php';

/**
 * Routeur minimaliste de l'API.
 *
 * Associe une route (methode HTTP + chemin) a une action a executer, puis
 * retrouve la bonne action selon la requete recue dans le front-controller.
 *
 * Deux types de routes sont supportes :
 *  - **routes exactes** : le chemin ne contient pas de placeholder
 *    (ex : `/api/paquets`). L'action est appelee sans argument.
 *  - **routes a placeholders** : le chemin contient `:nom` (ex :
 *    `/api/paquets/:id`). L'action est appelee avec un tableau associatif
 *    de parametres extraits du chemin (ex : `array('id' => '42')`).
 *
 * Les routes exactes sont prioritaires sur les routes a placeholders :
 * un appel `GET /api/paquets` sera dispatche sur la route exacte meme
 * si une route `/api/paquets/:id` existe.
 */
class Router
{
    // Table des routes exactes : cle "METHODE CHEMIN" => action.
    private $routes_exactes = array();

    // Liste des routes a placeholders (regex). Chaque entree est un tableau
    // associatif {methode, regex, noms_params, action}.
    private $routes_motif = array();

    /**
     * Enregistre une route et l'action associee.
     *
     * Si le chemin contient un placeholder `:nom`, la route est rangee
     * dans la table des motifs ; sinon dans la table des routes exactes.
     *
     * @param string   $methode Methode HTTP (GET, POST, PUT, DELETE).
     * @param string   $chemin  Chemin de l'URL (ex : /api/paquets/:id).
     * @param callable $action  Fonction a executer quand la route correspond.
     */
    public function ajouter($methode, $chemin, $action)
    {
        if (strpos($chemin, ':') === false) {
            $cle = $methode . ' ' . $chemin;
            $this->routes_exactes[$cle] = $action;
            return;
        }

        // Extraction des noms de parametres dans l'ordre d'apparition.
        // Ex : "/api/paquets/:id" -> noms_params = array('id').
        $noms_params = array();
        preg_match_all('/:([a-zA-Z_]+)/', $chemin, $captures);
        if (isset($captures[1])) {
            $noms_params = $captures[1];
        }

        // Construction de la regex de matching. Chaque ":nom" est remplace
        // par "([^/]+)" (un ou plusieurs caracteres sauf le slash, pour ne
        // pas franchir une frontiere de segment).
        $motif = preg_replace('/:[a-zA-Z_]+/', '([^/]+)', $chemin);
        $regex = '#^' . $motif . '$#';

        $this->routes_motif[] = array(
            'methode'     => $methode,
            'regex'       => $regex,
            'noms_params' => $noms_params,
            'action'      => $action
        );
    }

    /**
     * Cherche la route correspondante et execute son action.
     *
     * Ordre de recherche :
     *  1. Routes exactes (match direct sur "METHODE CHEMIN").
     *  2. Routes a placeholders (regex). La premiere qui matche gagne.
     *
     * Si aucune route ne correspond, renvoie 404 au format JSON.
     *
     * @param string $methode Methode HTTP de la requete.
     * @param string $chemin  Chemin demande (sans la chaine de requete).
     */
    public function dispatcher($methode, $chemin)
    {
        // 1) Match exact.
        $cle = $methode . ' ' . $chemin;
        if (isset($this->routes_exactes[$cle])) {
            $action = $this->routes_exactes[$cle];
            $action();
            return;
        }

        // 2) Match a placeholders.
        $nb_motifs = count($this->routes_motif);
        for ($i = 0; $i < $nb_motifs; $i = $i + 1) {
            $route = $this->routes_motif[$i];
            if ($route['methode'] !== $methode) {
                continue;
            }
            if (preg_match($route['regex'], $chemin, $captures)) {
                // Construction du tableau associatif {nom => valeur} a
                // partir des groupes captures (a partir de l'indice 1).
                $params = array();
                $nb_noms = count($route['noms_params']);
                for ($j = 0; $j < $nb_noms; $j = $j + 1) {
                    $nom = $route['noms_params'][$j];
                    $params[$nom] = $captures[$j + 1];
                }
                $action = $route['action'];
                $action($params);
                return;
            }
        }

        Response::json(array('erreur' => 'Route inconnue'), 404);
    }
}
