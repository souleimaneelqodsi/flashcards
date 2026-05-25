<?php
// src/core/Logger.php

/**
 * Logger applicatif minimaliste (BACK-2.8).
 *
 * Ecrit chaque entree de log dans un fichier texte (src/data/app.log).
 * Trois niveaux : info / warn / erreur. Utile pour journaliser les
 * exceptions rattrapees par ErrorHandler sans les exposer au client.
 *
 * Note de conception : ce Logger est compose de methodes statiques sans
 * instance. Il NE compte PAS comme un Singleton (le sujet TER limite a
 * 3 patrons : Singleton pour DB, Repository, Factory). Conceptuellement,
 * c'est un simple namespace de fonctions utilitaires, equivalent a
 * Response::json. Cf. CSV repartition_taches_detaillee.csv BACK-2.8.
 *
 * Le fichier de log est ecrit en append. Si le dossier de destination
 * n'existe pas ou n'est pas accessible en ecriture, on ignore
 * silencieusement (le log ne doit jamais bloquer la requete).
 */
class Logger
{
    /**
     * Ecrit une ligne de log de niveau "info" (information generale).
     *
     * @param string $message Texte a journaliser.
     */
    public static function info($message)
    {
        self::ecrire('INFO', $message);
    }

    /**
     * Ecrit une ligne de log de niveau "warn" (anomalie non bloquante).
     *
     * @param string $message Texte a journaliser.
     */
    public static function warn($message)
    {
        self::ecrire('WARN', $message);
    }

    /**
     * Ecrit une ligne de log de niveau "erreur" (anomalie bloquante).
     *
     * @param string $message Texte a journaliser.
     */
    public static function erreur($message)
    {
        self::ecrire('ERREUR', $message);
    }

    /**
     * Ecrit une ligne formatee dans le fichier de log.
     *
     * Format : `[AAAA-MM-JJ HH:MM:SS] [NIVEAU] message`. Une ligne par
     * entree, ecriture en append (FILE_APPEND). Verrou pose pour eviter
     * les ecritures concurrentes (LOCK_EX). En cas d'echec d'ecriture
     * (droits, disque plein, ...), l'erreur est ignoree pour ne pas
     * casser la requete en cours.
     *
     * @param string $niveau  Etiquette du niveau (INFO, WARN, ERREUR).
     * @param string $message Texte du log.
     */
    private static function ecrire($niveau, $message)
    {
        $chemin = self::chemin_fichier_log();
        $horodatage = date('Y-m-d H:i:s');
        $ligne = '[' . $horodatage . '] [' . $niveau . '] ' . $message . PHP_EOL;
        // @ pour ignorer un eventuel warning d'ecriture : on ne veut pas
        // qu'un probleme de log se transforme en exception.
        @file_put_contents($chemin, $ligne, FILE_APPEND | LOCK_EX);
    }

    /**
     * Renvoie le chemin absolu du fichier de log (src/data/app.log).
     */
    private static function chemin_fichier_log()
    {
        return __DIR__ . '/../data/app.log';
    }
}
