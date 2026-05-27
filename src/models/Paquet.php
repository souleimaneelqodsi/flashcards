<?php
// src/models/Paquet.php

require_once __DIR__ . '/../core/BaseModel.php';

/**
 * Entite metier "Paquet".
 *
 * Represente un paquet de flashcards (table `paquets` de CLAUDE.md sec. 4).
 * Comme `Utilisateur`, l'entite expose deux Factory Methods statiques
 * (patron Factory) : `creer()` pour un nouveau paquet (cree depuis le
 * formulaire), `fromRow()` pour reconstituer un paquet a partir d'une
 * ligne SQL.
 *
 * Rappel metier (CLAUDE.md sec. 4) : `last_score` et `best_score` sont
 * **strictement personnels au proprietaire** ; le partage transfere
 * l'acces au contenu, jamais la progression.
 */
class Paquet extends BaseModel
{
    private $id_paquet;
    private $titre;
    private $theme;
    private $date_creation;
    private $last_score;
    private $best_score;
    private $id_proprietaire;
    // Nombre de questions du paquet. Champ DERIVE (pas une colonne de la
    // table `paquets`) : renseigne par les requetes de liste qui comptent
    // les questions via un LEFT JOIN (dashboard / badge "X cartes"). Vaut
    // 0 par defaut quand l'info n'est pas jointe.
    private $nombre_cartes = 0;

    private function __construct()
    {
    }

    /**
     * Factory : nouveau paquet cree depuis le formulaire. La date de
     * creation est positionnee au jour courant. Les scores sont a null
     * tant qu'aucune session de revision n'a ete jouee.
     *
     * @param string $titre           Max 150 caracteres, non vide.
     * @param string $theme           Theme libre.
     * @param int    $id_proprietaire Id de l'utilisateur createur.
     * @return Paquet
     */
    public static function creer($titre, $theme, $id_proprietaire)
    {
        $paquet = new Paquet();
        $paquet->id_paquet       = null;
        $paquet->titre           = $titre;
        $paquet->theme           = $theme;
        $paquet->date_creation   = date('Y-m-d');
        $paquet->last_score      = null;
        $paquet->best_score      = null;
        $paquet->id_proprietaire = (int) $id_proprietaire;
        return $paquet;
    }

    /**
     * Factory : reconstruit un paquet depuis une ligne SQL.
     *
     * @param array $ligne Ligne issue de la table `paquets`.
     * @return Paquet
     */
    public static function fromRow($ligne)
    {
        $paquet = new Paquet();
        $paquet->id_paquet       = isset($ligne['id_paquet']) ? (int) $ligne['id_paquet'] : null;
        $paquet->titre           = isset($ligne['titre']) ? $ligne['titre'] : null;
        $paquet->theme           = isset($ligne['theme']) ? $ligne['theme'] : null;
        $paquet->date_creation   = isset($ligne['date_creation']) ? $ligne['date_creation'] : null;
        $paquet->last_score      = isset($ligne['last_score']) ? (int) $ligne['last_score'] : null;
        $paquet->best_score      = isset($ligne['best_score']) ? (int) $ligne['best_score'] : null;
        $paquet->id_proprietaire = isset($ligne['id_proprietaire']) ? (int) $ligne['id_proprietaire'] : null;
        $paquet->nombre_cartes   = isset($ligne['nombre_cartes']) ? (int) $ligne['nombre_cartes'] : 0;
        return $paquet;
    }

    // Getters

    public function getIdPaquet()       { return $this->id_paquet; }
    public function getTitre()          { return $this->titre; }
    public function getTheme()          { return $this->theme; }
    public function getDateCreation()   { return $this->date_creation; }
    public function getLastScore()      { return $this->last_score; }
    public function getBestScore()      { return $this->best_score; }
    public function getIdProprietaire() { return $this->id_proprietaire; }
    public function getNombreCartes()   { return $this->nombre_cartes; }

    public function setIdPaquet($id_paquet)
    {
        $this->id_paquet = (int) $id_paquet;
    }

    public function setTitre($titre)
    {
        $this->titre = $titre;
    }

    public function setTheme($theme)
    {
        $this->theme = $theme;
    }

    public function setLastScore($last_score)
    {
        $this->last_score = ($last_score === null) ? null : (int) $last_score;
    }

    public function setBestScore($best_score)
    {
        $this->best_score = ($best_score === null) ? null : (int) $best_score;
    }

    /**
     * Representation publique du paquet (utilisee par les reponses API).
     *
     * @return array
     */
    public function toArray()
    {
        return array(
            'id_paquet'       => $this->id_paquet,
            'titre'           => $this->titre,
            'theme'           => $this->theme,
            'date_creation'   => $this->date_creation,
            'last_score'      => $this->last_score,
            'best_score'      => $this->best_score,
            'id_proprietaire' => $this->id_proprietaire,
            'nombre_cartes'   => $this->nombre_cartes
        );
    }
}
