<?php
// src/core/ErrorHandler.php

require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/Logger.php';

/**
 * Gestionnaire global des erreurs et exceptions PHP de l'API.
 *
 * But : eviter qu'une erreur PHP (warning, fatal, exception non
 * rattrapee) produise une stack trace en clair dans la reponse JSON,
 * ce qui serait une fuite d'information securitaire. A la place, on
 * journalise l'erreur cote serveur (via Logger) et on renvoie un JSON
 * neutre au client.
 *
 * A appeler une fois dans le front-controller (src/public/index.php),
 * avant tout autre require et avant le dispatch.
 */
class ErrorHandler
{
    /**
     * Active la prise en main des erreurs / exceptions de l'API.
     *
     * - Coupe l'affichage des erreurs (display_errors = 0) pour ne pas
     *   polluer la reponse JSON.
     * - Active la journalisation cote serveur (log_errors = 1).
     * - Installe les handlers PHP pour exceptions, erreurs et fatales.
     */
    public static function enregistrer()
    {
        // Ne jamais afficher les erreurs dans la reponse (securite).
        ini_set('display_errors', '0');
        ini_set('log_errors', '1');
        // Rapporter tout, on filtrera ce qu'on log dans le handler.
        error_reporting(E_ALL);

        // Exceptions non rattrapees.
        set_exception_handler(array('ErrorHandler', 'gerer_exception'));

        // Erreurs classiques (notices, warnings, ...) : on les convertit
        // en ErrorException pour passer par le handler d'exceptions.
        set_error_handler(array('ErrorHandler', 'gerer_erreur'));

        // Erreurs fatales (parse, out of memory, ...) : on les rattrape
        // via register_shutdown_function.
        register_shutdown_function(array('ErrorHandler', 'gerer_fatale'));
    }

    /**
     * Handler des exceptions non rattrapees.
     *
     * Journalise l'erreur (cf. Logger) puis envoie une reponse JSON
     * generique avec le code 500. Aucun detail technique n'est expose.
     *
     * @param Throwable $e Exception ou erreur convertie.
     */
    public static function gerer_exception($e)
    {
        $message = $e->getMessage();
        $fichier = $e->getFile();
        $ligne = $e->getLine();
        Logger::erreur('Exception non rattrapee : ' . $message . ' (' . $fichier . ':' . $ligne . ')');

        // Reponse JSON neutre. Pas de trace, pas de fichier, pas de ligne.
        // Si la reponse a deja commence (rare), on ne fait rien.
        if (!headers_sent()) {
            Response::json(array('erreur' => 'Une erreur interne est survenue.'), 500);
        }
    }

    /**
     * Convertit une erreur PHP en exception et la laisse remonter.
     *
     * Cette conversion permet de centraliser le traitement dans
     * `gerer_exception()` et de respecter le perimetre du PDF cours
     * (try/catch + classes d'exceptions, chap. 5-6).
     *
     * @param int    $severite Niveau d'erreur PHP (E_NOTICE, E_WARNING...).
     * @param string $message  Texte de l'erreur.
     * @param string $fichier  Fichier source.
     * @param int    $ligne    Ligne source.
     */
    public static function gerer_erreur($severite, $message, $fichier, $ligne)
    {
        // Respecte la directive `error_reporting()` : ignore les erreurs
        // que le niveau courant ne demande pas de rapporter.
        if (!(error_reporting() & $severite)) {
            return false;
        }
        throw new ErrorException($message, 0, $severite, $fichier, $ligne);
    }

    /**
     * Recupere les erreurs fatales (parse, allocation, ...) qui ne
     * passent pas par set_error_handler.
     */
    public static function gerer_fatale()
    {
        $erreur = error_get_last();
        if ($erreur === null) {
            return;
        }
        $types_fatals = array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR);
        if (!in_array($erreur['type'], $types_fatals)) {
            return;
        }
        Logger::erreur('Erreur fatale : ' . $erreur['message'] . ' (' . $erreur['file'] . ':' . $erreur['line'] . ')');
        if (!headers_sent()) {
            Response::json(array('erreur' => 'Une erreur interne est survenue.'), 500);
        }
    }
}
