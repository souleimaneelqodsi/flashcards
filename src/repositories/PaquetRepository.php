<?php
// src/repositories/PaquetRepository.php

require_once __DIR__ . '/../core/DB.php';
require_once __DIR__ . '/../models/Paquet.php';
require_once __DIR__ . '/QuestionRepository.php';
require_once __DIR__ . '/PartageRepository.php';

/**
 * Acces aux donnees de la table `paquets` (patron Repository).
 *
 * Tous les SQL touchant la table `paquets` passent par cette classe. Les
 * controleurs en recoivent des objets `Paquet`, jamais des tableaux bruts.
 * Les deux methodes specifiques au dashboard (CLAUDE.md sec. 5) sont :
 *  - trouver_par_proprietaire($id) : "Mes paquets" (colonne gauche).
 *  - trouver_partages_avec($id)    : "Partages avec moi" (colonne droite).
 */
class PaquetRepository
{
    /**
     * Trouve un paquet par son identifiant.
     *
     * @param int $id_paquet
     * @return Paquet|null
     */
    public function trouver_par_id($id_paquet)
    {
        $statement = DB::getInstance()->executer(
            'SELECT id_paquet, titre, theme, date_creation, last_score, best_score, id_proprietaire
             FROM paquets
             WHERE id_paquet = ?',
            array($id_paquet)
        );
        $ligne = $statement->fetch();
        if ($ligne === false) {
            return null;
        }
        return Paquet::fromRow($ligne);
    }

    /**
     * Liste les paquets dont l'utilisateur est proprietaire.
     *
     * Tries par date de creation decroissante (plus recents en haut),
     * conformement au dashboard (CLAUDE.md sec. 5).
     *
     * **Tri garanti cote serveur (PAQ-1.6)** : la clause `ORDER BY
     * date_creation DESC` est appliquee par SQLite ; le controleur
     * `PaquetController::lister_mes_paquets` ne re-trie jamais. Ainsi le
     * front (`dashboard.js`) peut se contenter d'afficher les paquets
     * dans l'ordre recu, sans connaitre la regle metier.
     *
     * @param int $id_proprietaire
     * @return Paquet[]
     */
    public function trouver_par_proprietaire($id_proprietaire)
    {
        $statement = DB::getInstance()->executer(
            'SELECT id_paquet, titre, theme, date_creation, last_score, best_score, id_proprietaire
             FROM paquets
             WHERE id_proprietaire = ?
             ORDER BY date_creation DESC',
            array($id_proprietaire)
        );
        $lignes = $statement->fetchAll();
        $paquets = array();
        foreach ($lignes as $ligne) {
            $paquets[] = Paquet::fromRow($ligne);
        }
        return $paquets;
    }

    /**
     * Liste les paquets partages avec un utilisateur donne (i.e. dont il
     * est destinataire mais pas proprietaire). Joint la table `partages`
     * pour ne renvoyer que ceux marques comme partages.
     * Tries par date de partage decroissante.
     *
     * @param int $id_destinataire
     * @return Paquet[]
     */
    public function trouver_partages_avec($id_destinataire)
    {
        $statement = DB::getInstance()->executer(
            'SELECT p.id_paquet, p.titre, p.theme, p.date_creation, p.last_score, p.best_score, p.id_proprietaire
             FROM paquets p
             INNER JOIN partages pa ON pa.id_paquet = p.id_paquet
             WHERE pa.id_destinataire = ?
             ORDER BY pa.date_partage DESC',
            array($id_destinataire)
        );
        $lignes = $statement->fetchAll();
        $paquets = array();
        foreach ($lignes as $ligne) {
            $paquets[] = Paquet::fromRow($ligne);
        }
        return $paquets;
    }

    /**
     * Insere un nouveau paquet en base.
     *
     * @param Paquet $paquet
     * @return Paquet Meme entite, avec son id_paquet renseigne.
     */
    public function creer(Paquet $paquet)
    {
        DB::getInstance()->executer(
            'INSERT INTO paquets (titre, theme, date_creation, last_score, best_score, id_proprietaire)
             VALUES (?, ?, ?, ?, ?, ?)',
            array(
                $paquet->getTitre(),
                $paquet->getTheme(),
                $paquet->getDateCreation(),
                $paquet->getLastScore(),
                $paquet->getBestScore(),
                $paquet->getIdProprietaire()
            )
        );
        $id_genere = DB::getInstance()->dernier_id_insere();
        $paquet->setIdPaquet($id_genere);
        return $paquet;
    }

    /**
     * Met a jour un paquet existant.
     *
     * @param Paquet $paquet Doit avoir un id_paquet non null.
     */
    public function mettre_a_jour(Paquet $paquet)
    {
        DB::getInstance()->executer(
            'UPDATE paquets
             SET titre = ?, theme = ?, last_score = ?, best_score = ?
             WHERE id_paquet = ?',
            array(
                $paquet->getTitre(),
                $paquet->getTheme(),
                $paquet->getLastScore(),
                $paquet->getBestScore(),
                $paquet->getIdPaquet()
            )
        );
    }

    /**
     * Supprime un paquet par son identifiant.
     *
     * @param int $id_paquet
     */
    public function supprimer($id_paquet)
    {
        DB::getInstance()->executer(
            'DELETE FROM paquets WHERE id_paquet = ?',
            array($id_paquet)
        );
    }

    /**
     * Supprime un paquet en cascade : questions du paquet, partages du
     * paquet, puis le paquet lui-meme (PAQ-1.4). L'enchaînement est
     * encapsule dans une transaction SQLite : si une etape echoue, on
     * fait un rollback pour ne pas laisser la base dans un etat
     * incoherent (orphelins en questions ou partages).
     *
     * Pourquoi ici et pas dans le controleur ? Le patron Repository
     * impose que les controleurs ne pilotent jamais de SQL ni de
     * transactions ; la sequence de cascade est un detail de
     * persistance et appartient au repository de la ressource racine.
     *
     * @param int $id_paquet
     * @throws RuntimeException Si la transaction echoue (la couche DB
     *                          remappe deja PDOException en
     *                          RuntimeException pour ne pas exposer la
     *                          stack trace).
     */
    public function supprimer_avec_cascade($id_paquet)
    {
        $pdo = DB::getInstance()->pdo();

        $questions = new QuestionRepository();
        $partages  = new PartageRepository();

        $pdo->beginTransaction();
        try {
            $questions->supprimer_par_paquet($id_paquet);
            $partages->revoquer_toutes_par_paquet($id_paquet);
            $this->supprimer($id_paquet);
            $pdo->commit();
        } catch (Exception $exception) {
            $pdo->rollBack();
            throw $exception;
        }
    }
}
