<?php
// src/repositories/UtilisateurRepository.php

require_once __DIR__ . '/../core/DB.php';
require_once __DIR__ . '/../models/Utilisateur.php';

/**
 * Acces aux donnees de la table `utilisateurs` (patron Repository).
 *
 * Centralise toutes les requetes SQL touchant a la table `utilisateurs`.
 * Les controleurs ne doivent jamais ecrire de SQL pour les utilisateurs :
 * ils passent par ce Repository, qui leur renvoie des objets `Utilisateur`
 * (jamais des tableaux bruts).
 *
 * Utilise systematiquement DB::executer() pour la preparation et l'execution
 * des requetes (requetes preparees, gestion d'exception centralisee).
 */
class UtilisateurRepository
{
    /**
     * Trouve un utilisateur par son identifiant.
     *
     * @param int $id_user
     * @return Utilisateur|null Null si aucun utilisateur ne correspond.
     */
    public function trouver_par_id($id_user)
    {
        $statement = DB::getInstance()->executer(
            'SELECT id_user, email, mot_de_passe, nom, prenom, date_naissance, avatar
             FROM utilisateurs
             WHERE id_user = ?',
            array($id_user)
        );
        $ligne = $statement->fetch();
        if ($ligne === false) {
            return null;
        }
        return Utilisateur::fromRow($ligne);
    }

    /**
     * Trouve un utilisateur par son email (utilise au login et a la
     * verification d'unicite a l'inscription).
     *
     * @param string $email
     * @return Utilisateur|null
     */
    public function chercher_par_email($email)
    {
        $statement = DB::getInstance()->executer(
            'SELECT id_user, email, mot_de_passe, nom, prenom, date_naissance, avatar
             FROM utilisateurs
             WHERE email = ?',
            array($email)
        );
        $ligne = $statement->fetch();
        if ($ligne === false) {
            return null;
        }
        return Utilisateur::fromRow($ligne);
    }

    /**
     * Insere un nouvel utilisateur en base.
     * L'entite recoit son id_user genere par SQLite.
     *
     * @param Utilisateur $utilisateur
     * @return Utilisateur Meme entite, avec son id_user renseigne.
     */
    public function creer(Utilisateur $utilisateur)
    {
        DB::getInstance()->executer(
            'INSERT INTO utilisateurs (email, mot_de_passe, nom, prenom, date_naissance, avatar)
             VALUES (?, ?, ?, ?, ?, ?)',
            array(
                $utilisateur->getEmail(),
                $utilisateur->getMotDePasse(),
                $utilisateur->getNom(),
                $utilisateur->getPrenom(),
                $utilisateur->getDateNaissance(),
                $utilisateur->getAvatar()
            )
        );
        $id_genere = DB::getInstance()->dernier_id_insere();
        $utilisateur->setIdUser($id_genere);
        return $utilisateur;
    }

    /**
     * Met a jour un utilisateur existant (tous les champs sauf id_user).
     *
     * @param Utilisateur $utilisateur Doit avoir un id_user non null.
     */
    public function mettre_a_jour(Utilisateur $utilisateur)
    {
        DB::getInstance()->executer(
            'UPDATE utilisateurs
             SET email = ?, mot_de_passe = ?, nom = ?, prenom = ?, date_naissance = ?, avatar = ?
             WHERE id_user = ?',
            array(
                $utilisateur->getEmail(),
                $utilisateur->getMotDePasse(),
                $utilisateur->getNom(),
                $utilisateur->getPrenom(),
                $utilisateur->getDateNaissance(),
                $utilisateur->getAvatar(),
                $utilisateur->getIdUser()
            )
        );
    }

    /**
     * Supprime un utilisateur par son identifiant.
     *
     * @param int $id_user
     */
    public function supprimer($id_user)
    {
        DB::getInstance()->executer(
            'DELETE FROM utilisateurs WHERE id_user = ?',
            array($id_user)
        );
    }
}
