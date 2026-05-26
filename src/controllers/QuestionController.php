<?php
// src/controllers/QuestionController.php

require_once __DIR__ . '/../core/BaseController.php';
require_once __DIR__ . '/../core/Csrf.php';
require_once __DIR__ . '/../repositories/PaquetRepository.php';
require_once __DIR__ . '/../repositories/QuestionRepository.php';
require_once __DIR__ . '/../repositories/PartageRepository.php';
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

    /** @var PartageRepository */
    private $partages;

    public function __construct()
    {
        $this->paquets     = new PaquetRepository();
        $this->questions   = new QuestionRepository();
        $this->difficultes = new DifficulteRepository();
        $this->partages    = new PartageRepository();
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

    /**
     * PUT /api/questions/:id (QST-1.2).
     *
     * Edite une question existante (contenu_question, contenu_reponse,
     * id_difficulte). Le controle d'acces se fait via le paquet parent :
     * la question appartient a un paquet, dont on verifie le
     * proprietaire.
     *
     *  1. CSRF + auth.
     *  2. id_question valide (route).
     *  3. Charge la question. 404 si introuvable.
     *  4. Charge le paquet parent. Verifie proprietaire (sinon 403).
     *  5. Lit + valide le corps JSON (validation centralisee QST-1.5).
     *  6. Met a jour les champs et persiste.
     *  7. Repond 200 avec la question modifiee.
     *
     * @param array $params Parametres extraits du chemin (`id`).
     */
    public function mettre_a_jour($params)
    {
        Csrf::verifier_requete();
        $id_user = $this->verifier_authentifie();

        $id_question = $this->lire_id_route($params, 'id');
        if ($id_question === null) {
            $this->repondre(array('erreur' => 'Identifiant de question invalide.'), 400);
            return;
        }

        $question = $this->questions->trouver_par_id($id_question);
        if ($question === null) {
            $this->repondre(array('erreur' => 'Question introuvable.'), 404);
            return;
        }

        // Controle proprietaire via le paquet parent.
        $paquet = $this->paquets->trouver_par_id($question->getIdPaquet());
        if ($paquet === null) {
            // Cas defensif : question orpheline d'un paquet. Ne devrait
            // pas arriver grace au cascade DELETE (PAQ-1.4) mais on
            // protege quand meme.
            $this->repondre(array('erreur' => 'Paquet parent introuvable.'), 404);
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

        $question->setContenuQuestion($contenu_question);
        $question->setContenuReponse($contenu_reponse);
        $question->setIdDifficulte($id_difficulte);

        $this->questions->mettre_a_jour($question);

        $this->repondre(
            array(
                'message'  => 'Question mise a jour.',
                'question' => $question->toArray()
            ),
            200
        );
    }

    /**
     * DELETE /api/questions/:id (QST-1.3).
     *
     * Supprime une question. Comme pour PUT, le controle d'acces se fait
     * via le paquet parent.
     *
     *  1. CSRF + auth.
     *  2. id_question valide.
     *  3. Charge la question. 404 si introuvable.
     *  4. Charge le paquet parent. Verifie proprietaire (sinon 403).
     *  5. Supprime via le Repository.
     *  6. Repond 200.
     *
     * @param array $params Parametres extraits du chemin (`id`).
     */
    public function supprimer($params)
    {
        Csrf::verifier_requete();
        $id_user = $this->verifier_authentifie();

        $id_question = $this->lire_id_route($params, 'id');
        if ($id_question === null) {
            $this->repondre(array('erreur' => 'Identifiant de question invalide.'), 400);
            return;
        }

        $question = $this->questions->trouver_par_id($id_question);
        if ($question === null) {
            $this->repondre(array('erreur' => 'Question introuvable.'), 404);
            return;
        }

        $paquet = $this->paquets->trouver_par_id($question->getIdPaquet());
        if ($paquet === null) {
            $this->repondre(array('erreur' => 'Paquet parent introuvable.'), 404);
            return;
        }
        if ($paquet->getIdProprietaire() !== $id_user) {
            $this->repondre(array('erreur' => 'Acces refuse.'), 403);
            return;
        }

        $this->questions->supprimer($id_question);

        $this->repondre(array('message' => 'Question supprimee.'), 200);
    }

    /**
     * GET /api/paquets/:id/questions (QST-1.4).
     *
     * Liste les questions d'un paquet. Accessible au proprietaire OU a
     * un destinataire de partage (meme regle d'acces que VIEW-1.2 :
     * un destinataire peut consulter le contenu du paquet, sinon il ne
     * pourrait pas reviser).
     *
     *  1. Auth (sinon 401). GET donc pas de CSRF.
     *  2. id_paquet valide (route).
     *  3. Paquet existe (404).
     *  4. Acces : proprietaire OU destinataire (sinon 403).
     *  5. Liste les questions via Repository (deja triees par
     *     id_question ASC dans QuestionRepository::trouver_par_paquet).
     *  6. Repond 200 avec un tableau `questions`.
     *
     * @param array $params Parametres extraits du chemin (`id`).
     */
    public function lister_par_paquet($params)
    {
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

        // Acces autorise : proprietaire ou destinataire de partage.
        $est_proprietaire = ($paquet->getIdProprietaire() === $id_user);
        if (!$est_proprietaire) {
            $est_destinataire = $this->partages->existe($id_paquet, $id_user);
            if (!$est_destinataire) {
                $this->repondre(array('erreur' => 'Acces refuse.'), 403);
                return;
            }
        }

        $questions = $this->questions->trouver_par_paquet($id_paquet);

        $questions_array = array();
        foreach ($questions as $q) {
            $questions_array[] = $q->toArray();
        }

        $this->repondre(array('questions' => $questions_array), 200);
    }

    // ── Validation serveur centralisee (QST-1.5) ─────────────────────

    /**
     * Valide les champs d'une question (point d'entree unique utilise
     * par `creer` et `mettre_a_jour`). Helper centralise pour garantir
     * la parite des regles entre creation et edition : si on ajoute
     * demain une regle (caracteres interdits, longueur min, etc.) elle
     * s'applique automatiquement aux deux endpoints (et a une future
     * import en masse si besoin).
     *
     * **Parite client-serveur (CLAUDE.md sec. 6) :** ces regles doivent
     * etre miroirees cote front (FRONT-2.5 puis QST-1.6). Le client
     * filtre les saisies evidentes pour l'UX, le serveur protege la BD
     * contre tout client malveillant.
     *
     * Regles (CLAUDE.md sec. 4 et sec. 6) :
     *  - contenu_question : obligatoire, non vide apres trim, <= 1000 chars ;
     *  - contenu_reponse  : obligatoire, non vide apres trim, <= 1000 chars ;
     *  - id_difficulte    : entier > 0 ET reference existante dans la
     *                       table referentiel `difficultes`.
     *
     * Le controle d'existence de la difficulte fait une requete BD via
     * DifficulteRepository (patron Repository). C'est un peu plus couteux
     * qu'une simple comparaison de plage [1,3], mais c'est robuste si on
     * ajoute d'autres niveaux plus tard, et ca evite les inserts
     * orphelins (FK respectee). Si la table referentiel grossit, on
     * pourra mettre un cache statique ; en l'etat, 3 lignes, c'est
     * negligeable.
     *
     * Les bornes hautes (1000 chars) sont defensives : SQLite n'a pas de
     * limite technique sur les colonnes TEXT, mais on prefere refuser
     * proprement plutot que d'accepter un input deraisonnable.
     *
     * @param string   $contenu_question Deja trim/type-checke par lire_chaine_corps.
     * @param string   $contenu_reponse  Idem.
     * @param int|null $id_difficulte    Deja type-checke par lire_id_corps.
     * @return array<string,string> "champ" => "message", vide si OK.
     */
    private function valider_donnees_question($contenu_question, $contenu_reponse, $id_difficulte)
    {
        $erreurs = array();

        if ($contenu_question === '') {
            $erreurs['contenu_question'] = 'La question est obligatoire.';
        } else if (strlen($contenu_question) > 1000) {
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
