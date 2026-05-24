<?php
// src/core/Response.php

/**
 * Helper d'envoi des reponses HTTP au format JSON.
 *
 * Centralise le code HTTP, l'en-tete Content-Type et l'encodage JSON pour que
 * tous les endpoints de l'API renvoient un format unifie. Evite de repeter ces
 * trois etapes dans chaque controleur.
 */
class Response
{
    /**
     * Envoie une reponse JSON avec le code HTTP donne puis stoppe le script.
     *
     * @param mixed $donnees Donnees a serialiser (tableau associatif en general).
     * @param int   $code    Code HTTP (200 par defaut, 201 creation, 400, 401, 404, 500...).
     */
    public static function json($donnees, $code = 200)
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($donnees);
        exit;
    }
}
