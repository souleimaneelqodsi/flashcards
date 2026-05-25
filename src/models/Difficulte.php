<?php
// src/models/Difficulte.php

require_once __DIR__ . '/../core/BaseModel.php';

/**
 * Entite metier "Difficulte".
 *
 * Represente un niveau de difficulte du referentiel (table `difficultes`
 * de CLAUDE.md sec. 4, seedee : Facile / Moyen / Difficile). Une question
 * reference une difficulte par son id. Comme les autres entites du modele,
 * expose deux Factory Methods (`creer()` et `fromRow()`).
 */
class Difficulte extends BaseModel
{
    private $id_difficulte;
    private $nom_difficulte;

    private function __construct()
    {
    }

    /**
     * Factory : nouveau niveau de difficulte.
     *
     * @param string $nom_difficulte Libelle (ex : Facile, Moyen, Difficile).
     * @return Difficulte
     */
    public static function creer($nom_difficulte)
    {
        $difficulte = new Difficulte();
        $difficulte->id_difficulte  = null;
        $difficulte->nom_difficulte = $nom_difficulte;
        return $difficulte;
    }

    /**
     * Factory : reconstruit une difficulte depuis une ligne SQL.
     *
     * @param array $ligne
     * @return Difficulte
     */
    public static function fromRow($ligne)
    {
        $difficulte = new Difficulte();
        $difficulte->id_difficulte  = isset($ligne['id_difficulte']) ? (int) $ligne['id_difficulte'] : null;
        $difficulte->nom_difficulte = isset($ligne['nom_difficulte']) ? $ligne['nom_difficulte'] : null;
        return $difficulte;
    }

    // Getters

    public function getIdDifficulte()  { return $this->id_difficulte; }
    public function getNomDifficulte() { return $this->nom_difficulte; }

    public function setIdDifficulte($id_difficulte)
    {
        $this->id_difficulte = (int) $id_difficulte;
    }

    /**
     * Representation publique de la difficulte.
     *
     * @return array
     */
    public function toArray()
    {
        return array(
            'id_difficulte'  => $this->id_difficulte,
            'nom_difficulte' => $this->nom_difficulte
        );
    }
}
