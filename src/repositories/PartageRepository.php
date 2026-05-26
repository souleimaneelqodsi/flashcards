<?php
// src/repositories/PartageRepository.php

require_once __DIR__ . '/../core/DB.php';
require_once __DIR__ . '/../models/Partage.php';
require_once __DIR__ . '/../models/Utilisateur.php';

/**
 * Acces aux donnees de la table `partages` (patron Repository).
 *
 * Centralise les SQL touchant la table `partages`. La cle primaire etant
 * composite (id_paquet, id_destinataire), on n'expose pas de
 * `trouver_par_id` mais des methodes orientees usage :
 *  - lister_par_paquet            : tous les partages d'un paquet.
 *  - lister_destinataires_par_paquet : utilisateurs avec qui un paquet est
 *    partage (utile pour l'ecran de visualisation d'un paquet, sec. 5).
 *  - revoquer                     : supprime un partage donne.
 */
class PartageRepository
{
    /**
     * Verifie qu'un partage existe deja pour un couple (paquet, destinataire).
     * Utilise par PaquetController::partager (SHARE-1.2) pour repondre 409
     * Conflict de maniere explicite avant meme d'essayer un INSERT, plutot
     * que de se reposer sur l'idempotence d'INSERT OR IGNORE.
     *
     * @param int $id_paquet
     * @param int $id_destinataire
     * @return bool
     */
    public function existe($id_paquet, $id_destinataire)
    {
        $statement = DB::getInstance()->executer(
            'SELECT 1 FROM partages WHERE id_paquet = ? AND id_destinataire = ?',
            array($id_paquet, $id_destinataire)
        );
        return $statement->fetch() !== false;
    }

    /**
     * Cree un nouveau partage (idempotent : si le partage existe deja, le
     * INSERT echoue silencieusement grace a INSERT OR IGNORE, ce qui evite
     * un doublon sur la cle primaire composite).
     *
     * @param Partage $partage
     * @return Partage
     */
    public function creer(Partage $partage)
    {
        DB::getInstance()->executer(
            'INSERT OR IGNORE INTO partages (id_paquet, id_destinataire, date_partage)
             VALUES (?, ?, ?)',
            array(
                $partage->getIdPaquet(),
                $partage->getIdDestinataire(),
                $partage->getDatePartage()
            )
        );
        return $partage;
    }

    /**
     * Liste tous les partages d'un paquet.
     *
     * @param int $id_paquet
     * @return Partage[]
     */
    public function lister_par_paquet($id_paquet)
    {
        $statement = DB::getInstance()->executer(
            'SELECT id_paquet, id_destinataire, date_partage
             FROM partages
             WHERE id_paquet = ?
             ORDER BY date_partage DESC',
            array($id_paquet)
        );
        $lignes = $statement->fetchAll();
        $partages = array();
        foreach ($lignes as $ligne) {
            $partages[] = Partage::fromRow($ligne);
        }
        return $partages;
    }

    /**
     * Liste les utilisateurs avec lesquels un paquet est partage.
     * Utilise pour l'ecran de visualisation d'un paquet (CLAUDE.md sec. 5
     * "afficher la liste des utilisateurs avec lesquels le paquet est partage").
     *
     * @param int $id_paquet
     * @return Utilisateur[]
     */
    public function lister_destinataires_par_paquet($id_paquet)
    {
        // Principe de moindre privilege : on ne selectionne PAS le hash du
        // mot de passe (inutile pour l'ecran de visualisation, evite de le
        // faire transiter en memoire PHP).
        $statement = DB::getInstance()->executer(
            'SELECT u.id_user, u.email, u.nom, u.prenom, u.date_naissance, u.avatar
             FROM utilisateurs u
             INNER JOIN partages pa ON pa.id_destinataire = u.id_user
             WHERE pa.id_paquet = ?
             ORDER BY pa.date_partage DESC',
            array($id_paquet)
        );
        $lignes = $statement->fetchAll();
        $destinataires = array();
        foreach ($lignes as $ligne) {
            $destinataires[] = Utilisateur::fromRow($ligne);
        }
        return $destinataires;
    }

    /**
     * Revoque un partage (supprime le couple paquet/destinataire).
     *
     * @param int $id_paquet
     * @param int $id_destinataire
     */
    public function revoquer($id_paquet, $id_destinataire)
    {
        DB::getInstance()->executer(
            'DELETE FROM partages WHERE id_paquet = ? AND id_destinataire = ?',
            array($id_paquet, $id_destinataire)
        );
    }

    /**
     * Revoque tous les partages d'un paquet (tous destinataires confondus).
     * Utilise par PaquetRepository::supprimer_avec_cascade (PAQ-1.4) :
     * SQLite n'a pas d'`ON DELETE CASCADE` actif par defaut sur les FK
     * declarees en install.php, on assure donc la cascade manuellement.
     *
     * @param int $id_paquet
     */
    public function revoquer_toutes_par_paquet($id_paquet)
    {
        DB::getInstance()->executer(
            'DELETE FROM partages WHERE id_paquet = ?',
            array($id_paquet)
        );
    }
}
