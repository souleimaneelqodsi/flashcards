<?php
// src/core/Router.php

require_once __DIR__ . '/Response.php';

/**
 * Routeur minimaliste de l'API.
 *
 * Associe une route (methode HTTP + chemin) a une action a executer, puis
 * retrouve la bonne action selon la requete recue dans le front-controller.
 * Pour l'instant les actions enregistrees sont des stubs (fonctions qui
 * renvoient un JSON fictif) ; elles seront remplacees par les appels aux
 * controleurs reels lors de la phase BACK-2.
 */
class Router
{
    // Table des routes : cle "METHODE CHEMIN" => action (fonction a appeler).
    private $routes = array();

    /**
     * Enregistre une route et l'action associee.
     *
     * @param string   $methode Methode HTTP (GET, POST, PUT, DELETE).
     * @param string   $chemin  Chemin de l'URL (ex : /api/auth/inscription).
     * @param callable $action  Fonction a executer quand la route correspond.
     */
    public function ajouter($methode, $chemin, $action)
    {
        $cle = $methode . ' ' . $chemin;
        $this->routes[$cle] = $action;
    }

    /**
     * Cherche la route correspondante et execute son action.
     *
     * Si aucune route ne correspond, renvoie une erreur 404 au format JSON.
     *
     * @param string $methode Methode HTTP de la requete.
     * @param string $chemin  Chemin demande (sans la chaine de requete).
     */
    public function dispatcher($methode, $chemin)
    {
        $cle = $methode . ' ' . $chemin;
        if (isset($this->routes[$cle])) {
            $action = $this->routes[$cle];
            $action();
            return;
        }
        Response::json(array('erreur' => 'Route inconnue'), 404);
    }
}
