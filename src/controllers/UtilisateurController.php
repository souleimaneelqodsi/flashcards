<?php
// src/controllers/UtilisateurController.php

require_once __DIR__ . '/../core/BaseController.php';
require_once __DIR__ . '/../core/Csrf.php';
require_once __DIR__ . '/../repositories/UtilisateurRepository.php';
require_once __DIR__ . '/../models/Utilisateur.php';

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

    /**
     * PUT /api/profil
     *
     * Mise a jour des informations de l'utilisateur connecte (prenom, nom,
     * date de naissance, email). Le mot de passe et l'avatar ne sont PAS
     * touches ici (endpoints dedies).
     *
     *  1. Authentification obligatoire + token CSRF (endpoint mutant).
     *  2. Validation serveur (regex email, longueurs, date AAAAMMJJ).
     *  3. Unicite de l'email : si l'email change, il ne doit pas etre
     *     deja pris par un autre compte (409).
     *  4. Charge l'utilisateur, modifie les champs, persiste via le
     *     Repository (patron Repository : pas de PDO ici).
     */
    public function mettre_a_jour_profil()
    {
        $id_user = $this->verifier_authentifie();
        Csrf::verifier_requete();

        $donnees = $this->lire_corps_json();
        $email          = isset($donnees['email']) ? trim($donnees['email']) : '';
        $nom            = isset($donnees['nom']) ? trim($donnees['nom']) : '';
        $prenom         = isset($donnees['prenom']) ? trim($donnees['prenom']) : '';
        $date_naissance = isset($donnees['date_naissance']) ? trim($donnees['date_naissance']) : '';

        $erreurs = $this->valider_profil($email, $nom, $prenom, $date_naissance);
        if (count($erreurs) > 0) {
            $this->repondre(array('erreurs' => $erreurs), 400);
            return;
        }

        $utilisateur = $this->utilisateurs->trouver_par_id($id_user);
        if ($utilisateur === null) {
            $this->repondre(array('erreur' => 'Compte introuvable.'), 404);
            return;
        }

        // Unicite de l'email : autorise a garder le sien, interdit de
        // prendre celui d'un autre utilisateur.
        if ($email !== $utilisateur->getEmail()) {
            $autre = $this->utilisateurs->chercher_par_email($email);
            if ($autre !== null) {
                $this->repondre(array('erreurs' => array('email' => 'Email deja utilise.')), 409);
                return;
            }
        }

        $utilisateur->setEmail($email);
        $utilisateur->setNom($nom);
        $utilisateur->setPrenom($prenom);
        $utilisateur->setDateNaissance($this->convertir_date_aaaammjj($date_naissance));

        $this->utilisateurs->mettre_a_jour($utilisateur);

        // La session memorise l'email : on le resynchronise s'il a change.
        $_SESSION['email'] = $utilisateur->getEmail();

        $this->repondre(
            array(
                'message'     => 'Profil mis a jour.',
                'utilisateur' => $utilisateur->toArray()
            ),
            200
        );
    }

    /**
     * POST /api/profil/mot-de-passe (OPT-1.3)
     *
     * Changement de mot de passe de l'utilisateur connecte.
     *
     *  1. Authentification + token CSRF.
     *  2. Verifie le mot de passe actuel avec password_verify (on ne
     *     change pas un mot de passe sans prouver qu'on connait l'ancien).
     *  3. Valide le nouveau (>= 6 caracteres + confirmation identique).
     *  4. Hashe en BCRYPT et persiste via le Repository.
     */
    public function changer_mot_de_passe()
    {
        $id_user = $this->verifier_authentifie();
        Csrf::verifier_requete();

        $donnees = $this->lire_corps_json();
        $actuel       = isset($donnees['mot_de_passe_actuel']) ? $donnees['mot_de_passe_actuel'] : '';
        $nouveau      = isset($donnees['nouveau_mot_de_passe']) ? $donnees['nouveau_mot_de_passe'] : '';
        $confirmation = isset($donnees['confirmation_mot_de_passe']) ? $donnees['confirmation_mot_de_passe'] : '';

        $utilisateur = $this->utilisateurs->trouver_par_id($id_user);
        if ($utilisateur === null) {
            $this->repondre(array('erreur' => 'Compte introuvable.'), 404);
            return;
        }

        $erreurs = array();
        if ($actuel === '' || !password_verify($actuel, $utilisateur->getMotDePasse())) {
            $erreurs['mot_de_passe_actuel'] = 'Mot de passe actuel incorrect.';
        }
        if ($nouveau === '') {
            $erreurs['nouveau_mot_de_passe'] = 'Le nouveau mot de passe est obligatoire.';
        } else if (strlen($nouveau) < 6) {
            $erreurs['nouveau_mot_de_passe'] = 'Le mot de passe doit faire au moins 6 caracteres.';
        }
        if ($nouveau !== $confirmation) {
            $erreurs['confirmation_mot_de_passe'] = 'Les deux mots de passe ne correspondent pas.';
        }
        if (count($erreurs) > 0) {
            $this->repondre(array('erreurs' => $erreurs), 400);
            return;
        }

        $utilisateur->setMotDePasse(password_hash($nouveau, PASSWORD_BCRYPT));
        $this->utilisateurs->mettre_a_jour($utilisateur);

        $this->repondre(array('message' => 'Mot de passe mis a jour.'), 200);
    }

    /**
     * POST /api/profil/avatar (OPT-1.4, variante "initiales colorees")
     *
     * Enregistre la couleur d'accent choisie par l'utilisateur pour le
     * cercle de ses initiales. La couleur est stockee dans la colonne
     * `avatar` existante (pas d'upload de fichier, hors perimetre du cours).
     *
     * Securite : la couleur est validee contre une liste blanche de la
     * palette officielle (color_palette.png). Aucune valeur arbitraire
     * n'est stockee, donc aucun risque d'injection de style cote front.
     */
    public function mettre_a_jour_avatar()
    {
        $id_user = $this->verifier_authentifie();
        Csrf::verifier_requete();

        $donnees = $this->lire_corps_json();
        $couleur = isset($donnees['couleur']) ? trim($donnees['couleur']) : '';

        if (!in_array($couleur, $this->palette_avatar(), true)) {
            $this->repondre(array('erreur' => 'Couleur d\'avatar invalide.'), 400);
            return;
        }

        $utilisateur = $this->utilisateurs->trouver_par_id($id_user);
        if ($utilisateur === null) {
            $this->repondre(array('erreur' => 'Compte introuvable.'), 404);
            return;
        }

        $utilisateur->setAvatar($couleur);
        $this->utilisateurs->mettre_a_jour($utilisateur);

        $this->repondre(
            array(
                'message'     => 'Avatar mis a jour.',
                'utilisateur' => $utilisateur->toArray()
            ),
            200
        );
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Liste blanche des couleurs d'avatar autorisees (palette officielle,
     * project-files/interface/color_palette.png). Toute autre valeur est
     * refusee cote serveur.
     *
     * @return string[]
     */
    private function palette_avatar()
    {
        return array(
            '#7C4DFF', '#FF6584', '#22C55E', '#F59E0B',
            '#3B82F6', '#EC4899', '#14B8A6', '#6366F1'
        );
    }

    /**
     * Valide les champs editables du profil (memes regles que l'inscription,
     * sans le mot de passe). Renvoie un tableau "champ" => "message".
     *
     * @return array<string,string>
     */
    private function valider_profil($email, $nom, $prenom, $date_naissance)
    {
        $erreurs = array();

        if ($email === '') {
            $erreurs['email'] = 'L\'email est obligatoire.';
        } else if (strlen($email) > 150) {
            $erreurs['email'] = 'L\'email est trop long (150 caracteres maximum).';
        } else {
            $regex_email = '/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/';
            if (!preg_match($regex_email, $email)) {
                $erreurs['email'] = 'Format d\'email invalide.';
            }
        }

        if ($nom === '') {
            $erreurs['nom'] = 'Le nom est obligatoire.';
        } else if (strlen($nom) > 100) {
            $erreurs['nom'] = 'Le nom est trop long (100 caracteres maximum).';
        }

        if ($prenom === '') {
            $erreurs['prenom'] = 'Le prenom est obligatoire.';
        } else if (strlen($prenom) > 100) {
            $erreurs['prenom'] = 'Le prenom est trop long (100 caracteres maximum).';
        }

        if ($date_naissance === '') {
            $erreurs['date_naissance'] = 'La date de naissance est obligatoire.';
        } else if (!preg_match('/^[0-9]{8}$/', $date_naissance)) {
            $erreurs['date_naissance'] = 'Date attendue au format AAAAMMJJ (ex : 19990315).';
        } else {
            $annee = (int) substr($date_naissance, 0, 4);
            $mois  = (int) substr($date_naissance, 4, 2);
            $jour  = (int) substr($date_naissance, 6, 2);
            if (!checkdate($mois, $jour, $annee)) {
                $erreurs['date_naissance'] = 'Date de naissance invalide.';
            }
        }

        return $erreurs;
    }

    /**
     * Convertit AAAAMMJJ (8 chiffres) vers AAAA-MM-JJ (format DATE SQLite).
     * La validation prealable garantit 8 chiffres.
     */
    private function convertir_date_aaaammjj($aaaammjj)
    {
        $annee = substr($aaaammjj, 0, 4);
        $mois  = substr($aaaammjj, 4, 2);
        $jour  = substr($aaaammjj, 6, 2);
        return $annee . '-' . $mois . '-' . $jour;
    }
}
