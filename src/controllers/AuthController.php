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
