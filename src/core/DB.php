<?php
// src/core/DB.php

/**
 * Connexion unique a la base SQLite (patron Singleton).
 *
 * Une seule instance PDO est partagee pour toute la duree d'une requete HTTP.
 * On evite ainsi d'ouvrir plusieurs connexions au fichier SQLite. La connexion
 * est creee a la demande (premier appel a pdo()) car le squelette n'interroge
 * pas encore la base : les controleurs renvoient pour l'instant des stubs JSON.
 */
class DB
{
    // Instance unique du Singleton.
    private static $instance = null;

    // Connexion PDO (creee au premier appel a pdo()).
    private $pdo = null;

    /**
     * Constructeur prive : empeche la creation directe avec "new DB()".
     */
    private function __construct()
    {
    }

    /**
     * Retourne l'instance unique de la connexion, en la creant si besoin.
     *
     * @return DB
     */
    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new DB();
        }
        return self::$instance;
    }

    /**
     * Retourne l'objet PDO, en ouvrant la connexion SQLite au premier appel.
     *
     * Configuration appliquee (BD-2.3) :
     *  - PDO::ERRMODE_EXCEPTION : toute erreur SQL leve une PDOException
     *    (sinon SQLite reste silencieux et masque les bugs).
     *  - PDO::FETCH_ASSOC : fetch retourne un tableau associatif par defaut
     *    (plus simple a manipuler dans les Repositories).
     *  - PRAGMA foreign_keys = ON : SQLite desactive les cles etrangeres par
     *    defaut ; on les active a chaque connexion pour faire respecter les
     *    contraintes definies dans install.php.
     *
     * @return PDO
     */
    public function pdo()
    {
        if ($this->pdo === null) {
            $dossier_data = __DIR__ . '/../data';
            if (!is_dir($dossier_data)) {
                mkdir($dossier_data, 0775, true);
            }
            $chemin = $dossier_data . '/flashcards.sqlite';
            $this->pdo = new PDO('sqlite:' . $chemin);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->pdo->exec('PRAGMA foreign_keys = ON');
        }
        return $this->pdo;
    }

    /**
     * Interdit le clonage de l'instance unique.
     */
    private function __clone()
    {
    }
}
