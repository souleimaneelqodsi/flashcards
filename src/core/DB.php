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
     * @return PDO
     */
    public function pdo()
    {
        if ($this->pdo === null) {
            $chemin = __DIR__ . '/../data/flashcards.sqlite';
            $this->pdo = new PDO('sqlite:' . $chemin);
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
