<?php
// src/models/Partage.php

require_once __DIR__ . '/../core/BaseModel.php';

/**
 * Entite metier "Partage".
 *
 * Represente le lien de partage d'un paquet vers un destinataire
 * (table `partages` de CLAUDE.md sec. 4). C'est une entite-association :
 * sa cle primaire est le couple `(id_paquet, id_destinataire)` (pas
 * d'identifiant simple). Conformement au sujet, un partage transfere
 * l'acces au contenu du paquet mais **pas** la progression
 * (last_score / best_score restent personnels au proprietaire).
 *
 * Factory Methods : `creer()` pour un nouveau partage (date du jour),
 * `fromRow()` pour la reconstruction SQL.
 */
class Partage extends BaseModel
{
    private $id_paquet;
    private $id_destinataire;
    private $date_partage;

    private function __construct()
    {
    }

    /**
     * Factory : nouveau partage cree depuis la modale de partage.
     * La date est positionnee au jour courant.
     *
     * @param int $id_paquet       Paquet partage.
     * @param int $id_destinataire Utilisateur destinataire (different du proprietaire).
     * @return Partage
     */
    public static function creer($id_paquet, $id_destinataire)
    {
        $partage = new Partage();
        $partage->id_paquet       = (int) $id_paquet;
        $partage->id_destinataire = (int) $id_destinataire;
        $partage->date_partage    = date('Y-m-d');
        return $partage;
    }

    /**
     * Factory : reconstruit un partage depuis une ligne SQL.
     *
     * @param array $ligne
     * @return Partage
     */
    public static function fromRow($ligne)
    {
        $partage = new Partage();
        $partage->id_paquet       = isset($ligne['id_paquet']) ? (int) $ligne['id_paquet'] : null;
        $partage->id_destinataire = isset($ligne['id_destinataire']) ? (int) $ligne['id_destinataire'] : null;
        $partage->date_partage    = isset($ligne['date_partage']) ? $ligne['date_partage'] : null;
        return $partage;
    }

    // Getters

    public function getIdPaquet()       { return $this->id_paquet; }
    public function getIdDestinataire() { return $this->id_destinataire; }
    public function getDatePartage()    { return $this->date_partage; }

    /**
     * Representation publique du partage.
     *
     * @return array
     */
    public function toArray()
    {
        return array(
            'id_paquet'       => $this->id_paquet,
            'id_destinataire' => $this->id_destinataire,
            'date_partage'    => $this->date_partage
        );
    }
}
