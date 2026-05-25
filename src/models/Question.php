<?php
// src/models/Question.php

require_once __DIR__ . '/../core/BaseModel.php';

/**
 * Entite metier "Question".
 *
 * Represente une carte question/reponse appartenant a un paquet
 * (table `questions` de CLAUDE.md sec. 4). Comme les autres entites
 * du modele, expose deux Factory Methods (`creer()` pour la creation
 * formulaire, `fromRow()` pour la reconstruction SQL).
 *
 * Le contenu de la question et de la reponse est en clair (TEXT). La
 * difficulte est referencee par son id (table referentiel `difficultes`,
 * seedee : Facile / Moyen / Difficile).
 */
class Question extends BaseModel
{
    private $id_question;
    private $contenu_question;
    private $contenu_reponse;
    private $id_paquet;
    private $id_difficulte;

    private function __construct()
    {
    }

    /**
     * Factory : nouvelle question creee depuis le formulaire.
     *
     * @param string $contenu_question Non vide.
     * @param string $contenu_reponse  Non vide.
     * @param int    $id_paquet        Paquet auquel appartient la question.
     * @param int    $id_difficulte    Reference dans la table `difficultes`.
     * @return Question
     */
    public static function creer($contenu_question, $contenu_reponse, $id_paquet, $id_difficulte)
    {
        $question = new Question();
        $question->id_question      = null;
        $question->contenu_question = $contenu_question;
        $question->contenu_reponse  = $contenu_reponse;
        $question->id_paquet        = (int) $id_paquet;
        $question->id_difficulte    = (int) $id_difficulte;
        return $question;
    }

    /**
     * Factory : reconstruit une question depuis une ligne SQL.
     *
     * @param array $ligne
     * @return Question
     */
    public static function fromRow($ligne)
    {
        $question = new Question();
        $question->id_question      = isset($ligne['id_question']) ? (int) $ligne['id_question'] : null;
        $question->contenu_question = isset($ligne['contenu_question']) ? $ligne['contenu_question'] : null;
        $question->contenu_reponse  = isset($ligne['contenu_reponse']) ? $ligne['contenu_reponse'] : null;
        $question->id_paquet        = isset($ligne['id_paquet']) ? (int) $ligne['id_paquet'] : null;
        $question->id_difficulte    = isset($ligne['id_difficulte']) ? (int) $ligne['id_difficulte'] : null;
        return $question;
    }

    // Getters

    public function getIdQuestion()     { return $this->id_question; }
    public function getContenuQuestion() { return $this->contenu_question; }
    public function getContenuReponse() { return $this->contenu_reponse; }
    public function getIdPaquet()       { return $this->id_paquet; }
    public function getIdDifficulte()   { return $this->id_difficulte; }

    public function setIdQuestion($id_question)
    {
        $this->id_question = (int) $id_question;
    }

    public function setContenuQuestion($contenu_question)
    {
        $this->contenu_question = $contenu_question;
    }

    public function setContenuReponse($contenu_reponse)
    {
        $this->contenu_reponse = $contenu_reponse;
    }

    public function setIdDifficulte($id_difficulte)
    {
        $this->id_difficulte = (int) $id_difficulte;
    }

    /**
     * Representation publique de la question.
     *
     * @return array
     */
    public function toArray()
    {
        return array(
            'id_question'      => $this->id_question,
            'contenu_question' => $this->contenu_question,
            'contenu_reponse'  => $this->contenu_reponse,
            'id_paquet'        => $this->id_paquet,
            'id_difficulte'    => $this->id_difficulte
        );
    }
}
