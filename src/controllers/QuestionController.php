<?php
// src/controllers/QuestionController.php

require_once __DIR__ . '/../core/BaseController.php';
require_once __DIR__ . '/../core/Csrf.php';
require_once __DIR__ . '/../repositories/PaquetRepository.php';
require_once __DIR__ . '/../repositories/QuestionRepository.php';
require_once __DIR__ . '/../repositories/DifficulteRepository.php';
require_once __DIR__ . '/../models/Question.php';

/**
 * Controleur du CRUD des questions (QST-1).
 *
 * Gere les actions sur les questions d'un paquet : creation
 * (POST /api/paquets/:id/questions), edition (PUT /api/questions/:id),
 * suppression (DELETE /api/questions/:id), listing
 * (GET /api/paquets/:id/questions).
 *
 * Controle d'acces : la table `questions` n'a pas de proprietaire
 * direct ; le proprietaire d'une question est celui du paquet parent
 * (`paquets.id_proprietaire`). Toutes les actions mutantes verifient
 * donc le proprietaire du paquet parent (PaquetRepository::trouver_par_id
 * + comparaison id_user_session).
 *
 * Securite (CLAUDE.md sec. 7) :
 *  - CSRF : `Csrf::verifier_requete()` sur POST / PUT / DELETE.
 *  - Auth : `verifier_authentifie()` en premier appel.
 *  - SQL : delegation totale aux Repositories (patron Repository).
 *  - Validation centralisee dans `valider_donnees_question` (QST-1.5).
 *  - Defense type pour les chaines (lire_chaine_corps), comme dans
 *    PaquetController.
 */
class QuestionController extends BaseController
{
    /** @var PaquetRepository */
    private $paquets;

    /** @var QuestionRepository */
    private $questions;

    /** @var DifficulteRepository */
    private $difficultes;

    public function __construct()
    {
        $this->paquets     = new PaquetRepository();
        $this->questions   = new QuestionRepository();
        $this->difficultes = new DifficulteRepository();
    }

    /**
     * POST /api/paquets/:id/questions (QST-1.1).
     *
     * Cree une nouvelle question dans un paquet existant.
     *
     *  1. Verifie le token CSRF.
     *  2. Verifie l'authentification (sinon 401).
     *  3. Lit l'id du paquet depuis le chemin.
     *  4. Charge le paquet, verifie qu'il existe (404).
     *  5. Verifie que l'utilisateur courant est proprietaire (403).
     *  6. Lit + valide le corps JSON (contenu_question, contenu_reponse,
     *     id_difficulte) via la validation centralisee QST-1.5.
     *  7. Cree la question via la Factory `Question::creer` et persiste
     *     via `QuestionRepository::creer`.
     *  8. Repond 201 Created avec la question.
     *
     * @param array $params Parametres extraits du chemin (`id`).
     */
    public function creer($params)
    {
        Csrf::verifier_requete();
        $id_user = $this->verifier_authentifie();

        $id_paquet = $this->lire_id_route($params, 'id');
        if ($id_paquet === null) {
            $this->repondre(array('erreur' => 'Identifiant de paquet invalide.'), 400);
            return;
        }

        $paquet = $this->paquets->trouver_par_id($id_paquet);
        if ($paquet === null) {
            $this->repondre(array('erreur' => 'Paquet introuvable.'), 404);
            return;
        }
        if ($paquet->getIdProprietaire() !== $id_user) {
            $this->repondre(array('erreur' => 'Acces refuse.'), 403);
            return;
        }

        $donnees = $this->lire_corps_json();
        $contenu_question = $this->lire_chaine_corps($donnees, 'contenu_question');
        $contenu_reponse  = $this->lire_chaine_corps($donnees, 'contenu_reponse');
        $id_difficulte    = $this->lire_id_corps($donnees, 'id_difficulte');

        $erreurs = $this->valider_donnees_question($contenu_question, $contenu_reponse, $id_difficulte);
        if (count($erreurs) > 0) {
            $this->repondre(array('erreurs' => $erreurs), 400);
            return;
        }

        // Instanciation via la Factory (patron Factory).
        $question = Question::creer($contenu_question, $contenu_reponse, $id_paquet, $id_difficulte);

        $question = $this->questions->creer($question);

        $this->repondre(
            array(
                'message'  => 'Question creee.',
                'question' => $question->toArray()
            ),
            201
        );
    }

    // ── Validation serveur centralisee (QST-1.5) ─────────────────────

    /**
     * Valide les champs d'une question (creation et edition).
     *
     * Regles (CLAUDE.md sec. 4 et sec. 6) :
     *  - contenu_question : obligatoire, non vide apres trim ;
     *  - contenu_reponse  : obligatoire, non vide apres trim ;
     *  - id_difficulte    : entier > 0 ET reference existante dans la
     *                       table referentiel `difficultes`.
     *
     * Le controle d'existence de la difficulte fait une requete BD
     * via DifficulteRepository (patron Repository). C'est un peu plus
     * couteux qu'une simple comparaison de plage [1,3], mais c'est
     * robuste si on ajoute d'autres niveaux plus tard, et ca evite
     * les inserts orphelins (FK respectee).
     *
     * @return array<string,string>
     */
    private function valider_donnees_question($contenu_question, $contenu_reponse, $id_difficulte)
    {
        $erreurs = array();

        if ($contenu_question === '') {
            $erreurs['contenu_question'] = 'La question est obligatoire.';
        } else if (strlen($contenu_question) > 1000) {
            // Borne haute defensive (la colonne TEXT n'a pas de limite
            // technique en SQLite mais on evite les saisies abusives).
            $erreurs['contenu_question'] = 'La question est trop longue (1000 caracteres maximum).';
        }

        if ($contenu_reponse === '') {
            $erreurs['contenu_reponse'] = 'La reponse est obligatoire.';
        } else if (strlen($contenu_reponse) > 1000) {
            $erreurs['contenu_reponse'] = 'La reponse est trop longue (1000 caracteres maximum).';
        }

        if ($id_difficulte === null) {
            $erreurs['id_difficulte'] = 'Le niveau de difficulte est obligatoire.';
        } else {
            $difficulte = $this->difficultes->trouver_par_id($id_difficulte);
            if ($difficulte === null) {
                $erreurs['id_difficulte'] = 'Niveau de difficulte inconnu.';
            }
        }

        return $erreurs;
    }

    // ── Helpers de lecture du corps / route ──────────────────────────

    /**
     * Lit une chaine du corps JSON avec defense contre les types non-string
     * (array, objet, nombre). Renvoie la chaine trimee ou chaine vide.
     * Meme contrat que `PaquetController::lire_chaine_corps`.
     */
    private function lire_chaine_corps($donnees, $cle)
    {
        if (!isset($donnees[$cle])) {
            return '';
        }
        $valeur = $donnees[$cle];
        if (!is_string($valeur)) {
            return '';
        }
        return trim($valeur);
    }

    /**
     * Lit un identifiant numerique du corps JSON. Accepte int ou string
     * de chiffres. Renvoie null si absent ou format incorrect.
     */
    private function lire_id_corps($donnees, $cle)
    {
        if (!isset($donnees[$cle])) {
            return null;
        }
        $valeur = $donnees[$cle];
        if (is_int($valeur)) {
            return ($valeur > 0) ? $valeur : null;
        }
        if (is_string($valeur) && preg_match('/^[0-9]+$/', $valeur)) {
            $id = (int) $valeur;
            return ($id > 0) ? $id : null;
        }
        return null;
    }

    /**
     * Lit un identifiant entier strictement positif depuis les parametres
     * de route, sous une cle donnee.
     */
    private function lire_id_route($params, $cle)
    {
        if (!isset($params[$cle])) {
            return null;
        }
        $valeur = $params[$cle];
        if (!preg_match('/^[0-9]+$/', $valeur)) {
            return null;
        }
        $id = (int) $valeur;
        if ($id <= 0) {
            return null;
        }
        return $id;
    }
}
