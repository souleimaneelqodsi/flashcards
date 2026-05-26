<?php
// src/controllers/UtilisateurController.php

require_once __DIR__ . '/../core/BaseController.php';
require_once __DIR__ . '/../repositories/UtilisateurRepository.php';

/**
 * Controleur des endpoints lies aux utilisateurs (hors authentification,
 * qui reste dans AuthController).
 *
 * Pour l'instant n'expose qu'une action :
 *  - search() : recherche d'utilisateurs par debut d'email, utilisee
 *    pour l'auto-completion du partage de paquets (SHARE-1.1).
 *
 * Securite (CLAUDE.md sec. 7) :
 *  - authentification obligatoire : `verifier_authentifie()` en premiere
 *    ligne. Un utilisateur non connecte ne doit pas pouvoir enumerer la
 *    base d'utilisateurs ;
 *  - on exclut systematiquement l'utilisateur courant des resultats (on
 *    ne se partage pas un paquet a soi-meme) ;
 *  - les emails ne sont jamais utilises dans une concatenation SQL :
 *    le LIKE passe par une requete preparee dans le Repository ;
 *  - aucune fuite d'informations sensibles : `Utilisateur::toArray()`
 *    exclut deja le mot de passe.
 */
class UtilisateurController extends BaseController
{
    /** @var UtilisateurRepository */
    private $utilisateurs;

    public function __construct()
    {
        $this->utilisateurs = new UtilisateurRepository();
    }

    /**
     * GET /api/users/search?q=<debut-email> (SHARE-1.1).
     *
     * Renvoie jusqu'a 10 utilisateurs dont l'email commence par la chaine
     * fournie dans `q`. L'utilisateur courant est exclu de la liste.
     *
     *  1. Verifie l'authentification (sinon 401) - GET donc pas de CSRF.
     *  2. Lit `q` dans la query string ($_GET).
     *  3. Si `q` est vide ou < 2 caracteres : renvoie une liste vide
     *     (evite de balayer toute la BD au premier caractere tape).
     *  4. Cherche via le Repository (LIKE prepare avec echappement).
     *  5. Repond 200 avec un tableau `utilisateurs` (toArray sans MDP).
     */
    public function search()
    {
        $id_user = $this->verifier_authentifie();

        // Lecture du parametre `q` dans la query string. $_GET est
        // alimente automatiquement par PHP a partir de l'URL.
        $q = '';
        if (isset($_GET['q']) && is_string($_GET['q'])) {
            $q = trim($_GET['q']);
        }

        // Borne basse : on ne lance pas de recherche au-dessous de 2
        // caracteres pour ne pas saturer la BD ni envoyer des resultats
        // trop larges. Cas typique : l'utilisateur tape "j" -> on attend.
        if (strlen($q) < 2) {
            $this->repondre(array('utilisateurs' => array()), 200);
            return;
        }

        // Borne haute : evite de laisser un client envoyer un prefixe
        // gigantesque (defense en profondeur, pas indispensable mais sain).
        if (strlen($q) > 150) {
            $this->repondre(array('utilisateurs' => array()), 200);
            return;
        }

        $resultats = $this->utilisateurs->rechercher_par_email_partiel($q, $id_user, 10);

        $resultats_array = array();
        foreach ($resultats as $utilisateur) {
            $resultats_array[] = $utilisateur->toArray();
        }

        $this->repondre(array('utilisateurs' => $resultats_array), 200);
    }
}
