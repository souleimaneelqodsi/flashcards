<?php
// src/repositories/DifficulteRepository.php

require_once __DIR__ . '/../core/DB.php';
require_once __DIR__ . '/../models/Difficulte.php';

/**
 * Acces aux donnees de la table `difficultes` (patron Repository).
 *
 * La table `difficultes` est un referentiel statique seede par install.php
 * (Facile / Moyen / Difficile). Ce repository sert surtout a alimenter les
 * listes deroulantes cote front (choix de la difficulte d'une question) :
 * d'ou les deux seules methodes de lecture, sans creation ni suppression.
 */
class DifficulteRepository
{
    /**
     * Liste tous les niveaux de difficulte du referentiel.
     * Tries par id_difficulte croissant (ordre de seed : Facile, Moyen, Difficile).
     *
     * @return Difficulte[]
     */
    public function trouver_tous()
    {
        $statement = DB::getInstance()->executer(
            'SELECT id_difficulte, nom_difficulte
             FROM difficultes
             ORDER BY id_difficulte ASC'
        );
        $lignes = $statement->fetchAll();
        $difficultes = array();
        foreach ($lignes as $ligne) {
            $difficultes[] = Difficulte::fromRow($ligne);
        }
        return $difficultes;
    }

    /**
     * Trouve un niveau de difficulte par son identifiant.
     *
     * @param int $id_difficulte
     * @return Difficulte|null
     */
    public function trouver_par_id($id_difficulte)
    {
        $statement = DB::getInstance()->executer(
            'SELECT id_difficulte, nom_difficulte
             FROM difficultes
             WHERE id_difficulte = ?',
            array($id_difficulte)
        );
        $ligne = $statement->fetch();
        if ($ligne === false) {
            return null;
        }
        return Difficulte::fromRow($ligne);
    }
}
