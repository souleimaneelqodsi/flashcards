<?php
// src/core/BaseController.php

require_once __DIR__ . '/Response.php';

/**
 * Classe mere abstraite de tous les controleurs de l'API.
 *
 * Regroupe les operations communes a chaque controleur (envoi d'une reponse
 * JSON via Response, verification d'authentification, lecture du corps JSON).
 * Les controleurs concrets (AuthController, PaquetController...) en heritent
 * et ajoutent leurs actions. On respecte ainsi le principe Ouvert/Ferme : on
 * etend sans modifier la base.
 */
abstract class BaseController
{
    /**
     * Envoie une reponse JSON au client via le helper Response.
     *
     * @param mixed $donnees Donnees a renvoyer.
     * @param int   $code    Code HTTP.
     */
    protected function repondre($donnees, $code = 200)
    {
        Response::json($donnees, $code);
    }

    /**
     * Middleware checkAuth (AUTH-2.4) : verifie qu'un utilisateur est
     * connecte avant d'executer l'action courante.
     *
     * Si `$_SESSION['id_user']` est absent, repond 401 et stoppe le
     * script (les actions protegees n'ont qu'a appeler cette methode
     * en premiere ligne).
     *
     * @return int L'id_user de l'utilisateur connecte (utile pour
     *             enchainer les operations en aval).
     */
    protected function verifier_authentifie()
    {
        if (!isset($_SESSION['id_user'])) {
            $this->repondre(array('erreur' => 'Non authentifié'), 401);
        }
        return (int) $_SESSION['id_user'];
    }

    /**
     * Lit le corps de la requete au format JSON et le decode en tableau
     * associatif. Renvoie un tableau vide si le corps est absent ou
     * invalide (les controleurs verifieront les champs requis ensuite).
     *
     * Le front-end (AjaxService, src/public/js/ajax.js) envoie ses
     * donnees en JSON, donc `$_POST` est vide ; on lit le corps brut
     * via `php://input`.
     *
     * @return array
     */
    protected function lire_corps_json()
    {
        $contenu = file_get_contents('php://input');
        if ($contenu === false || $contenu === '') {
            return array();
        }
        $donnees = json_decode($contenu, true);
        if (!is_array($donnees)) {
            return array();
        }
        return $donnees;
    }
}
