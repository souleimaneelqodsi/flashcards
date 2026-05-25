<?php
// src/controllers/AuthController.php

require_once __DIR__ . '/../core/BaseController.php';
require_once __DIR__ . '/../core/Csrf.php';
require_once __DIR__ . '/../repositories/UtilisateurRepository.php';
require_once __DIR__ . '/../models/Utilisateur.php';

/**
 * Controleur d'authentification (AUTH-2).
 *
 * Centralise les actions liees a la connexion / deconnexion / inscription
 * d'un utilisateur. Toutes les operations sensibles passent par BCRYPT
 * (`password_hash`, `password_verify`) et par des sessions PHP. Le
 * controleur ne touche jamais a PDO directement : il delegue toutes les
 * lectures et ecritures BD a `UtilisateurRepository` (patron Repository).
 *
 * Securite :
 *  - mots de passe : `password_hash($mdp, PASSWORD_BCRYPT)` a l'inscription,
 *    `password_verify` au login. Aucun mot de passe en clair n'est conserve.
 *  - sessions : `session_regenerate_id(true)` apres une connexion reussie
 *    pour limiter les attaques de fixation de session.
 *  - CSRF : `Csrf::verifier_requete()` au debut de chaque endpoint qui
 *    modifie l'etat (inscription, connexion, deconnexion). Le wrapper
 *    AjaxService cote front pose l'en-tete X-CSRF-Token automatiquement.
 *  - validation : tous les champs sont valides cote serveur (regex + tailles)
 *    avant tout acces a la base. Un client malveillant ne peut pas court-
 *    circuiter la validation client.
 */
class AuthController extends BaseController
{
    /** @var UtilisateurRepository */
    private $utilisateurs;

    public function __construct()
    {
        $this->utilisateurs = new UtilisateurRepository();
    }

    /**
     * POST /api/auth/inscription
     *
     * Inscription d'un nouvel utilisateur (AUTH-2.1, AUTH-2.5, AUTH-2.6).
     *
     *  1. Verifie le token CSRF (AUTH-2.12).
     *  2. Lit les donnees JSON envoyees par le front (AjaxService).
     *  3. Valide chaque champ cote serveur (regex email, MDP >= 6,
     *     date AAAAMMJJ, longueurs).
     *  4. Verifie que l'email n'est pas deja utilise (AUTH-2.6) :
     *     reponse 409 Conflict si oui.
     *  5. Hashe le mot de passe en BCRYPT (AUTH-2.1).
     *  6. Insere l'utilisateur via le Repository.
     *  7. Repond 201 Created avec l'utilisateur (sans mot de passe).
     */
    public function inscription()
    {
        Csrf::verifier_requete();

        $donnees = $this->lire_corps_json();

        // Champs attendus
        $email           = isset($donnees['email']) ? trim($donnees['email']) : '';
        $mot_de_passe    = isset($donnees['mot_de_passe']) ? $donnees['mot_de_passe'] : '';
        $nom             = isset($donnees['nom']) ? trim($donnees['nom']) : '';
        $prenom          = isset($donnees['prenom']) ? trim($donnees['prenom']) : '';
        $date_naissance  = isset($donnees['date_naissance']) ? trim($donnees['date_naissance']) : '';

        // Validation serveur (AUTH-2.5)
        $erreurs = $this->valider_inscription($email, $mot_de_passe, $nom, $prenom, $date_naissance);
        if (count($erreurs) > 0) {
            $this->repondre(array('erreurs' => $erreurs), 400);
            return;
        }

        // Verification d'unicite de l'email (AUTH-2.6).
        $existant = $this->utilisateurs->chercher_par_email($email);
        if ($existant !== null) {
            $this->repondre(array('erreur' => 'Email deja utilise.'), 409);
            return;
        }

        // Hashage du mot de passe (AUTH-2.1).
        $hash = password_hash($mot_de_passe, PASSWORD_BCRYPT);

        // Conversion de la date AAAAMMJJ vers AAAA-MM-JJ (format DATE SQLite).
        $date_sqlite = $this->convertir_date_aaaammjj($date_naissance);

        $utilisateur = Utilisateur::creer($email, $hash, $nom, $prenom, $date_sqlite, null);

        // Insertion via le Repository (patron Repository).
        // Si la contrainte UNIQUE sur email est violee malgre la verification
        // ci-dessus (race condition), on capture la PDOException et on
        // repond 409 (AUTH-2.6).
        try {
            $utilisateur = $this->utilisateurs->creer($utilisateur);
        } catch (RuntimeException $e) {
            $this->repondre(array('erreur' => 'Email deja utilise.'), 409);
            return;
        }

        $this->repondre(
            array(
                'message'     => 'Inscription reussie.',
                'utilisateur' => $utilisateur->toArray()
            ),
            201
        );
    }

    /**
     * POST /api/auth/connexion
     *
     * Connexion d'un utilisateur existant (AUTH-2.2).
     *
     *  1. Verifie le token CSRF (AUTH-2.12).
     *  2. Lit l'email et le mot de passe (JSON).
     *  3. Cherche l'utilisateur par email via le Repository.
     *  4. Verifie le mot de passe avec `password_verify`.
     *  5. Regenere l'identifiant de session (`session_regenerate_id`)
     *     pour limiter les attaques de fixation de session, puis pose
     *     `$_SESSION['id_user']`.
     *  6. Repond 200 avec l'utilisateur (sans mot de passe).
     *
     * En cas d'echec (utilisateur inconnu ou mot de passe invalide), on
     * repond 401 avec un message generique pour ne pas reveler quel
     * champ etait incorrect (bonne pratique de securite).
     */
    public function connexion()
    {
        Csrf::verifier_requete();

        $donnees = $this->lire_corps_json();
        $email        = isset($donnees['email']) ? trim($donnees['email']) : '';
        $mot_de_passe = isset($donnees['mot_de_passe']) ? $donnees['mot_de_passe'] : '';

        if ($email === '' || $mot_de_passe === '') {
            $this->repondre(array('erreur' => 'Email et mot de passe obligatoires.'), 400);
            return;
        }

        $utilisateur = $this->utilisateurs->chercher_par_email($email);
        if ($utilisateur === null) {
            $this->repondre(array('erreur' => 'Identifiants invalides.'), 401);
            return;
        }

        $mdp_correct = password_verify($mot_de_passe, $utilisateur->getMotDePasse());
        if (!$mdp_correct) {
            $this->repondre(array('erreur' => 'Identifiants invalides.'), 401);
            return;
        }

        // Session : regeneration de l'identifiant apres authentification.
        session_regenerate_id(true);
        $_SESSION['id_user'] = $utilisateur->getIdUser();
        $_SESSION['email']   = $utilisateur->getEmail();

        // Nouveau token CSRF apres connexion (un token capture sur la
        // page de login ne doit pas rester valide une fois connecte).
        // Le nouveau token est renvoye au client (csrf_token) pour qu'il
        // mette a jour sa balise <meta> : la SPA ne rechargeant pas la page,
        // sans cela les requetes mutantes suivantes enverraient l'ancien
        // token et seraient rejetees en 403.
        Csrf::regenerer();

        $this->repondre(
            array(
                'message'     => 'Connexion reussie.',
                'utilisateur' => $utilisateur->toArray(),
                'csrf_token'  => Csrf::obtenir()
            ),
            200
        );
    }

    /**
     * POST /api/auth/deconnexion
     *
     * Deconnexion de l'utilisateur courant (AUTH-2.3).
     *
     *  1. Verifie le token CSRF (AUTH-2.12).
     *  2. Vide le tableau $_SESSION.
     *  3. Supprime le cookie de session cote client.
     *  4. Detruit la session cote serveur via `session_destroy`.
     *  5. Repond 200.
     */
    public function deconnexion()
    {
        Csrf::verifier_requete();

        // Vide le tableau de session.
        $_SESSION = array();

        // Supprime le cookie de session cote client (AUTH-2.3).
        // Sans cela, le navigateur garde le cookie PHPSESSID jusqu'a sa
        // peremption naturelle, ce qui n'est pas conforme a une vraie
        // deconnexion.
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        // Detruit la session cote serveur.
        session_destroy();

        $this->repondre(array('message' => 'Deconnexion reussie.'), 200);
    }

    /**
     * GET /api/auth/moi
     *
     * Renvoie l'utilisateur actuellement connecte.
     * - Si la session ne contient pas d'utilisateur, repond 401.
     * - Sinon, recharge l'utilisateur depuis la BD (les informations
     *   peuvent avoir change depuis la connexion) et le renvoie.
     */
    public function moi()
    {
        $id_user = $this->verifier_authentifie();

        $utilisateur = $this->utilisateurs->trouver_par_id($id_user);
        if ($utilisateur === null) {
            // Cas tres rare : compte supprime mais session encore active.
            $this->repondre(array('erreur' => 'Compte introuvable.'), 401);
            return;
        }

        $this->repondre(array('utilisateur' => $utilisateur->toArray()), 200);
    }

    // ── Validation serveur (AUTH-2.5) ────────────────────────────────

    /**
     * Valide les champs du formulaire d'inscription.
     *
     * Regles (CLAUDE.md section 6) :
     *  - email : format `login@domaine.extension` (regex stricte).
     *  - mot de passe : >= 6 caracteres.
     *  - date de naissance : 8 chiffres AAAAMMJJ + date reelle valide.
     *  - nom / prenom : non vides, longueur raisonnable (<= 100).
     *
     * Renvoie un tableau associatif "nom_du_champ" => "message" pour
     * que le client puisse pointer chaque erreur sous le bon champ.
     *
     * @return array<string,string>
     */
    private function valider_inscription($email, $mot_de_passe, $nom, $prenom, $date_naissance)
    {
        $erreurs = array();

        // Email
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

        // Mot de passe
        if ($mot_de_passe === '') {
            $erreurs['mot_de_passe'] = 'Le mot de passe est obligatoire.';
        } else if (strlen($mot_de_passe) < 6) {
            $erreurs['mot_de_passe'] = 'Le mot de passe doit faire au moins 6 caracteres.';
        }

        // Nom
        if ($nom === '') {
            $erreurs['nom'] = 'Le nom est obligatoire.';
        } else if (strlen($nom) > 100) {
            $erreurs['nom'] = 'Le nom est trop long (100 caracteres maximum).';
        }

        // Prenom
        if ($prenom === '') {
            $erreurs['prenom'] = 'Le prenom est obligatoire.';
        } else if (strlen($prenom) > 100) {
            $erreurs['prenom'] = 'Le prenom est trop long (100 caracteres maximum).';
        }

        // Date de naissance : format AAAAMMJJ strict (8 chiffres).
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
     * Convertit une date du format AAAAMMJJ (saisie utilisateur, 8 chiffres)
     * vers AAAA-MM-JJ (format DATE SQLite). La validation prealable garantit
     * que la chaine est exactement 8 chiffres.
     *
     * @param string $aaaammjj Ex : "19990315".
     * @return string Ex : "1999-03-15".
     */
    private function convertir_date_aaaammjj($aaaammjj)
    {
        $annee = substr($aaaammjj, 0, 4);
        $mois  = substr($aaaammjj, 4, 2);
        $jour  = substr($aaaammjj, 6, 2);
        return $annee . '-' . $mois . '-' . $jour;
    }
}
