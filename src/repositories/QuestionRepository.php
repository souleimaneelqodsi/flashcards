<?php
// src/repositories/QuestionRepository.php

require_once __DIR__ . '/../core/DB.php';
require_once __DIR__ . '/../models/Question.php';

/**
 * Acces aux donnees de la table `questions` (patron Repository).
 *
 * Tous les SQL touchant la table `questions` passent par cette classe.
 * La methode specifique au mode revision (CLAUDE.md sec. 5) est
 * `trouver_par_paquet($id_paquet)` qui renvoie toutes les questions
 * d'un paquet pour les enchaîner cote front.
 */
class QuestionRepository
{
    /**
     * Trouve une question par son identifiant.
     *
     * @param int $id_question
     * @return Question|null
     */
    public function trouver_par_id($id_question)
    {
        $statement = DB::getInstance()->executer(
            'SELECT id_question, contenu_question, contenu_reponse, id_paquet, id_difficulte
             FROM questions
             WHERE id_question = ?',
            array($id_question)
        );
        $ligne = $statement->fetch();
        if ($ligne === false) {
            return null;
        }
        return Question::fromRow($ligne);
    }

    /**
     * Liste toutes les questions d'un paquet.
     * Tries par id_question croissant (ordre d'ajout).
     *
     * @param int $id_paquet
     * @return Question[]
     */
    public function trouver_par_paquet($id_paquet)
    {
        $statement = DB::getInstance()->executer(
            'SELECT id_question, contenu_question, contenu_reponse, id_paquet, id_difficulte
             FROM questions
             WHERE id_paquet = ?
             ORDER BY id_question ASC',
            array($id_paquet)
        );
        $lignes = $statement->fetchAll();
        $questions = array();
        foreach ($lignes as $ligne) {
            $questions[] = Question::fromRow($ligne);
        }
        return $questions;
    }

    /**
     * Insere une nouvelle question en base.
     *
     * @param Question $question
     * @return Question Meme entite, avec son id_question renseigne.
     */
    public function creer(Question $question)
    {
        DB::getInstance()->executer(
            'INSERT INTO questions (contenu_question, contenu_reponse, id_paquet, id_difficulte)
             VALUES (?, ?, ?, ?)',
            array(
                $question->getContenuQuestion(),
                $question->getContenuReponse(),
                $question->getIdPaquet(),
                $question->getIdDifficulte()
            )
        );
        $id_genere = DB::getInstance()->dernier_id_insere();
        $question->setIdQuestion($id_genere);
        return $question;
    }

    /**
     * Met a jour une question existante.
     *
     * @param Question $question Doit avoir un id_question non null.
     */
    public function mettre_a_jour(Question $question)
    {
        DB::getInstance()->executer(
            'UPDATE questions
             SET contenu_question = ?, contenu_reponse = ?, id_difficulte = ?
             WHERE id_question = ?',
            array(
                $question->getContenuQuestion(),
                $question->getContenuReponse(),
                $question->getIdDifficulte(),
                $question->getIdQuestion()
            )
        );
    }

    /**
     * Supprime une question par son identifiant.
     *
     * @param int $id_question
     */
    public function supprimer($id_question)
    {
        DB::getInstance()->executer(
            'DELETE FROM questions WHERE id_question = ?',
            array($id_question)
        );
    }
}
