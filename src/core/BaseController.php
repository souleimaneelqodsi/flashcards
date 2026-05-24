<?php
// src/core/BaseController.php

require_once __DIR__ . '/Response.php';

/**
 * Classe mere abstraite de tous les controleurs de l'API.
 *
 * Regroupe les operations communes a chaque controleur (envoi d'une reponse
 * JSON via Response). Les controleurs concrets (AuthController,
 * PaquetController...) en heritent et ajoutent leurs actions. On respecte ainsi
 * le principe Ouvert/Ferme : on etend sans modifier la base.
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
}
