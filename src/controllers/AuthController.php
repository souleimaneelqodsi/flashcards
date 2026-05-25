<?php
// src/controllers/AuthController.php

require_once __DIR__ . '/../core/BaseController.php';

/**
 * Controleur d'authentification (phase 1 : mocks).
 *
 * Centralise les actions liees a la connexion / deconnexion / inscription
 * d'un utilisateur. A ce stade (AUTH-1), aucune persistance en base : les
 * methodes renvoient des donnees fictives qui respectent neanmoins le
 * contrat d'API attendu par le front. Les vraies implementations (BCRYPT,
 * verification en base, regeneration d'identifiant de session) arriveront
 * en AUTH-2.
 */
class AuthController extends BaseController
{
    /**
     * POST /api/auth/inscription
     *
     * Inscription d'un nouvel utilisateur (MOCK).
     * Lit le formulaire dans $_POST, controle la presence des champs
     * obligatoires, puis renvoie un utilisateur fictif au format JSON.
     */
    public function inscription()
    {
        $champs_obligatoires = array('email', 'mot_de_passe', 'nom', 'prenom', 'date_naissance');
        $erreurs = $this->verifier_champs_presents($_POST, $champs_obligatoires);
        if (count($erreurs) > 0) {
            $this->repondre(array('erreurs' => $erreurs), 400);
            return;
        }

        $utilisateur_fictif = array(
            'id_user'         => 1,
            'email'           => $_POST['email'],
            'nom'             => $_POST['nom'],
            'prenom'          => $_POST['prenom'],
            'date_naissance'  => $_POST['date_naissance'],
            'avatar'          => null
        );
        $this->repondre(
            array(
                'message'     => 'Inscription reussie (mock)',
                'utilisateur' => $utilisateur_fictif
            ),
            201
        );
    }

    /**
     * POST /api/auth/connexion
     *
     * Connexion d'un utilisateur existant (MOCK).
     * Lit l'email et le mot de passe dans $_POST, controle leur presence,
     * puis ouvre une session PHP fictive et renvoie un utilisateur fictif.
     * Aucune verification de mot de passe a ce stade (sera ajoutee en AUTH-2
     * avec password_verify et session_regenerate_id).
     */
    public function connexion()
    {
        $champs_obligatoires = array('email', 'mot_de_passe');
        $erreurs = $this->verifier_champs_presents($_POST, $champs_obligatoires);
        if (count($erreurs) > 0) {
            $this->repondre(array('erreurs' => $erreurs), 400);
            return;
        }

        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['id_user'] = 1;
        $_SESSION['email']   = $_POST['email'];

        $utilisateur_fictif = array(
            'id_user' => 1,
            'email'   => $_POST['email'],
            'nom'     => 'Doe',
            'prenom'  => 'John',
            'avatar'  => null
        );
        $this->repondre(
            array(
                'message'     => 'Connexion reussie (mock)',
                'utilisateur' => $utilisateur_fictif
            ),
            200
        );
    }

    /**
     * Verifie que chacun des champs attendus est present et non vide dans
     * le tableau fourni. Renvoie un tableau associatif "champ => message".
     *
     * @param array $donnees Tableau a controler (typiquement $_POST).
     * @param array $champs  Liste des noms de champs obligatoires.
     * @return array         Erreurs detectees (vide si tout est bon).
     */
    private function verifier_champs_presents($donnees, $champs)
    {
        $erreurs = array();
        foreach ($champs as $champ) {
            $valeur_absente = !isset($donnees[$champ]);
            if ($valeur_absente) {
                $erreurs[$champ] = 'Champ obligatoire';
                continue;
            }
            $valeur_vide = (trim($donnees[$champ]) === '');
            if ($valeur_vide) {
                $erreurs[$champ] = 'Champ obligatoire';
            }
        }
        return $erreurs;
    }
}
