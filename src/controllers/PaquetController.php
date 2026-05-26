<?php
// src/controllers/PaquetController.php

require_once __DIR__ . '/../core/BaseController.php';
require_once __DIR__ . '/../core/Csrf.php';
require_once __DIR__ . '/../repositories/PaquetRepository.php';
require_once __DIR__ . '/../repositories/UtilisateurRepository.php';
require_once __DIR__ . '/../repositories/PartageRepository.php';
require_once __DIR__ . '/../models/Paquet.php';
require_once __DIR__ . '/../models/Partage.php';

/**
 * Controleur du CRUD des paquets (PAQ-1).
 *
 * Centralise les endpoints qui agissent sur la ressource "paquet" :
 * lister les paquets de l'utilisateur courant, en creer un nouveau,
 * editer un paquet existant (controle proprietaire), supprimer un
 * paquet en cascade. Toutes les operations sensibles passent par les
 * regles communes du projet :
 *  - authentification : `verifier_authentifie()` herite de BaseController
 *    (renvoie 401 si la session n'a pas d'id_user) ;
 *  - CSRF : `Csrf::verifier_requete()` au debut de chaque action mutante
 *    (POST / PUT / DELETE) ;
 *  - persistence : appels via PaquetRepository (patron Repository) ;
 *    le controleur ne touche jamais a PDO directement.
 *
 * Regle metier critique (CLAUDE.md sec. 4) : `last_score` et `best_score`
 * sont strictement personnels au proprietaire. L'edition ne touche donc
 * que titre et theme. La progression est mise a jour ailleurs (mode
 * revision), pas par cet endpoint.
 */
class PaquetController extends BaseController
{
    /** @var PaquetRepository */
    private $paquets;

    /** @var UtilisateurRepository */
    private $utilisateurs;

    /** @var PartageRepository */
    private $partages;

    public function __construct()
    {
        $this->paquets      = new PaquetRepository();
        $this->utilisateurs = new UtilisateurRepository();
        $this->partages     = new PartageRepository();
    }

    /**
     * GET /api/paquets (PAQ-1.1).
     *
     * Liste les paquets dont l'utilisateur courant est proprietaire,
     * tries par date de creation decroissante (les plus recents en haut).
     *
     * **Tri garanti cote serveur (PAQ-1.6)** : la clause `ORDER BY
     * date_creation DESC` est posee dans `PaquetRepository::
     * trouver_par_proprietaire`. Le controleur n'applique aucun tri en
     * PHP : on serialise les `Paquet` dans l'ordre recu de SQLite. Le
     * front (`dashboard.js`) peut donc afficher la liste telle quelle.
     *
     *  1. Verifie que l'utilisateur est authentifie (sinon 401).
     *  2. Charge ses paquets via le Repository (tri SQL applique).
     *  3. Repond 200 avec un tableau `paquets` (array de toArray()).
     */
    public function lister_mes_paquets()
    {
        $id_user = $this->verifier_authentifie();

        // Le Repository renvoie deja la liste triee par date_creation DESC
        // (PAQ-1.6). Pas de tri PHP ici : la regle metier vit dans le SQL.
        $paquets = $this->paquets->trouver_par_proprietaire($id_user);

        $paquets_array = array();
        foreach ($paquets as $paquet) {
            $paquets_array[] = $paquet->toArray();
        }

        $this->repondre(array('paquets' => $paquets_array), 200);
    }

    /**
     * GET /api/paquets/shared (DASH-2.1).
     *
     * Liste les paquets partages AVEC l'utilisateur courant (i.e. les
     * paquets dont il est destinataire d'un partage, sans en etre
     * proprietaire).
     *
     * **Tri garanti cote serveur** : la clause `ORDER BY pa.date_partage
     * DESC` est posee dans `PaquetRepository::trouver_partages_avec` ; le
     * controleur n'applique aucun tri en PHP. Le front (`dashboard.js`)
     * peut afficher la liste telle quelle.
     *
     * Rappel metier (CLAUDE.md sec. 4) : le partage transfere l'acces au
     * **contenu**, pas la progression. Les champs `last_score` et
     * `best_score` renvoyes sont ceux du **proprietaire** ; si le sujet
     * exige une progression personnelle au destinataire, ce sera traite
     * dans une table dediee a part (non couvert par DASH-2).
     *
     *  1. Verifie que l'utilisateur est authentifie (sinon 401).
     *  2. Charge les paquets partages avec lui via le Repository.
     *  3. Repond 200 avec un tableau `paquets`.
     */
    public function lister_partages_avec_moi()
    {
        $id_user = $this->verifier_authentifie();

        $paquets = $this->paquets->trouver_partages_avec($id_user);

        $paquets_array = array();
        foreach ($paquets as $paquet) {
            $paquets_array[] = $paquet->toArray();
        }

        $this->repondre(array('paquets' => $paquets_array), 200);
    }

    /**
     * POST /api/paquets (PAQ-1.2).
     *
     * Cree un nouveau paquet pour l'utilisateur courant.
     *
     *  1. Verifie le token CSRF (action mutante).
     *  2. Verifie l'authentification (sinon 401).
     *  3. Lit le corps JSON (titre, theme).
     *  4. Valide cote serveur (regles partagees, cf. valider_donnees_paquet).
     *  5. Instancie le paquet via la Factory `Paquet::creer` (date de
     *     creation positionnee au jour courant, scores a null).
     *  6. Persiste via le Repository (patron Repository).
     *  7. Repond 201 Created avec le paquet (toArray).
     */
    public function creer()
    {
        Csrf::verifier_requete();
        $id_user = $this->verifier_authentifie();

        $donnees = $this->lire_corps_json();
        $titre = $this->lire_chaine_corps($donnees, 'titre');
        $theme = $this->lire_chaine_corps($donnees, 'theme');

        $erreurs = $this->valider_donnees_paquet($titre, $theme);
        if (count($erreurs) > 0) {
            $this->repondre(array('erreurs' => $erreurs), 400);
            return;
        }

        // Instanciation via la Factory (patron Factory). La date de
        // creation et l'id du proprietaire sont fixes ici : on ne fait pas
        // confiance au client pour ces deux champs.
        $paquet = Paquet::creer($titre, $theme, $id_user);

        $paquet = $this->paquets->creer($paquet);

        $this->repondre(
            array(
                'message' => 'Paquet cree.',
                'paquet'  => $paquet->toArray()
            ),
            201
        );
    }

    /**
     * PUT /api/paquets/:id (PAQ-1.3).
     *
     * Edite un paquet existant (titre + theme uniquement). Les scores
     * (`last_score`, `best_score`) NE sont PAS editables par cet endpoint
     * (CLAUDE.md sec. 4 : la progression est personnelle au proprietaire
     * et n'est modifiee qu'en fin de session de revision).
     *
     *  1. Verifie le token CSRF (action mutante).
     *  2. Verifie l'authentification (sinon 401).
     *  3. Charge le paquet par son id. 404 si introuvable.
     *  4. Verifie que l'utilisateur courant est bien proprietaire (sinon
     *     403 - on cache l'information d'existence en cas de proprietaire
     *     different, par principe de moindre indiscretion).
     *  5. Lit le corps JSON et valide titre + theme (PAQ-1.5).
     *  6. Met a jour les champs et persiste via le Repository.
     *  7. Repond 200 avec le paquet modifie.
     *
     * @param array $params Parametres extraits du chemin (`id`).
     */
    public function mettre_a_jour($params)
    {
        Csrf::verifier_requete();
        $id_user = $this->verifier_authentifie();

        $id_paquet = $this->lire_id_paquet($params);
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
        $titre = $this->lire_chaine_corps($donnees, 'titre');
        $theme = $this->lire_chaine_corps($donnees, 'theme');

        $erreurs = $this->valider_donnees_paquet($titre, $theme);
        if (count($erreurs) > 0) {
            $this->repondre(array('erreurs' => $erreurs), 400);
            return;
        }

        $paquet->setTitre($titre);
        $paquet->setTheme($theme);

        $this->paquets->mettre_a_jour($paquet);

        $this->repondre(
            array(
                'message' => 'Paquet mis a jour.',
                'paquet'  => $paquet->toArray()
            ),
            200
        );
    }

    /**
     * DELETE /api/paquets/:id (PAQ-1.4).
     *
     * Supprime un paquet en cascade : questions du paquet, partages du
     * paquet, puis le paquet lui-meme. La cascade est realisee par le
     * Repository (`supprimer_avec_cascade`) au sein d'une transaction
     * SQLite, pour garantir l'atomicite.
     *
     *  1. Verifie le token CSRF (action mutante).
     *  2. Verifie l'authentification (sinon 401).
     *  3. Lit l'id de paquet depuis le chemin (et valide qu'il est numerique).
     *  4. Charge le paquet. 404 si introuvable.
     *  5. Verifie que l'utilisateur courant est proprietaire (sinon 403).
     *  6. Lance la suppression en cascade via le Repository.
     *  7. Repond 200 avec un message de confirmation.
     *
     * @param array $params Parametres extraits du chemin (`id`).
     */
    public function supprimer($params)
    {
        Csrf::verifier_requete();
        $id_user = $this->verifier_authentifie();

        $id_paquet = $this->lire_id_paquet($params);
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

        $this->paquets->supprimer_avec_cascade($id_paquet);

        $this->repondre(array('message' => 'Paquet supprime.'), 200);
    }

    /**
     * POST /api/paquets/:id/share (SHARE-1.2).
     *
     * Ajoute un destinataire au partage d'un paquet. Verifications
     * exigees par le sujet TER et la conception :
     *  1. Token CSRF ;
     *  2. Authentification ;
     *  3. id_paquet numerique valide ;
     *  4. id_destinataire numerique valide (corps JSON) ;
     *  5. Paquet existe (sinon 404) ;
     *  6. L'utilisateur courant est proprietaire du paquet (sinon 403 :
     *     seul le proprietaire decide qui peut acceder a son paquet) ;
     *  7. Le destinataire existe en BD (sinon 400) ;
     *  8. Le destinataire n'est pas le proprietaire (sinon 400 :
     *     partager un paquet a soi-meme n'a aucun sens metier) ;
     *  9. Le partage n'existe pas deja (sinon 409 Conflict).
     *
     * Renvoie 201 Created avec le partage cree. La date de partage est
     * positionnee au jour courant par la Factory `Partage::creer`.
     *
     * @param array $params Parametres extraits du chemin (`id`).
     */
    public function partager($params)
    {
        Csrf::verifier_requete();
        $id_user = $this->verifier_authentifie();

        $id_paquet = $this->lire_id_paquet($params);
        if ($id_paquet === null) {
            $this->repondre(array('erreur' => 'Identifiant de paquet invalide.'), 400);
            return;
        }

        // Lecture et validation du destinataire dans le corps JSON.
        $donnees = $this->lire_corps_json();
        $id_destinataire = $this->lire_id_destinataire($donnees);
        if ($id_destinataire === null) {
            $this->repondre(
                array('erreur' => 'Identifiant de destinataire invalide.'),
                400
            );
            return;
        }

        // Charge le paquet et controle l'existence + proprietaire.
        $paquet = $this->paquets->trouver_par_id($id_paquet);
        if ($paquet === null) {
            $this->repondre(array('erreur' => 'Paquet introuvable.'), 404);
            return;
        }
        if ($paquet->getIdProprietaire() !== $id_user) {
            $this->repondre(array('erreur' => 'Acces refuse.'), 403);
            return;
        }

        // Empeche le partage a soi-meme. Verifie avant la base utilisateurs
        // pour eviter une requete inutile.
        if ($id_destinataire === $paquet->getIdProprietaire()) {
            $this->repondre(
                array('erreur' => 'Vous ne pouvez pas partager un paquet avec vous-meme.'),
                400
            );
            return;
        }

        // Verifie que le destinataire existe (un client malveillant pourrait
        // envoyer un id_user inexistant pour fausser l'etat de la base).
        $destinataire = $this->utilisateurs->trouver_par_id($id_destinataire);
        if ($destinataire === null) {
            $this->repondre(array('erreur' => 'Destinataire introuvable.'), 400);
            return;
        }

        // Empeche les doublons : un meme paquet ne peut etre partage qu'une
        // fois a un destinataire donne (la cle primaire composite l'interdit
        // au niveau BD, mais on prefere une 409 explicite).
        if ($this->partages->existe($id_paquet, $id_destinataire)) {
            $this->repondre(
                array('erreur' => 'Ce paquet est deja partage avec cet utilisateur.'),
                409
            );
            return;
        }

        // Cree le partage via la Factory + le Repository.
        $partage = Partage::creer($id_paquet, $id_destinataire);
        $this->partages->creer($partage);

        $this->repondre(
            array(
                'message' => 'Partage cree.',
                'partage' => $partage->toArray(),
                'destinataire' => $destinataire->toArray()
            ),
            201
        );
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Lit un champ texte du corps JSON et le normalise pour la validation.
     *
     * Defense en profondeur : si un client envoie un type non-string
     * (array, objet, nombre), on renvoie une chaine vide. La validation
     * en aval ("champ obligatoire") signalera alors l'erreur normalement,
     * sans laisser `trim()` declencher un warning ou pire.
     *
     * Le trim est applique pour qu'un champ ne contenant que des espaces
     * compte comme vide (sinon "   " satisferait la regle "titre non
     * vide" sans avoir de sens metier).
     *
     * @param array  $donnees Corps JSON deja decode.
     * @param string $cle     Cle du champ a lire (ex: 'titre', 'theme').
     * @return string Chaine trimee, ou chaine vide si absente / mauvais type.
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
     * Lit l'identifiant de paquet depuis les parametres de route et le
     * convertit en entier strictement positif. Renvoie null si la valeur
     * est absente ou ne represente pas un entier positif (le controleur
     * repond alors 400).
     *
     * @param array $params Parametres extraits du chemin par le routeur.
     * @return int|null
     */
    private function lire_id_paquet($params)
    {
        if (!isset($params['id'])) {
            return null;
        }
        $valeur = $params['id'];
        if (!preg_match('/^[0-9]+$/', $valeur)) {
            return null;
        }
        $id = (int) $valeur;
        if ($id <= 0) {
            return null;
        }
        return $id;
    }

    /**
     * Lit l'identifiant de destinataire depuis le corps JSON (cle
     * `id_destinataire`). Defense en profondeur : accepte uniquement un
     * entier (int) ou une chaine de chiffres. Renvoie null si la valeur
     * est absente, non numerique ou <= 0.
     *
     * @param array $donnees Corps JSON deja decode.
     * @return int|null
     */
    private function lire_id_destinataire($donnees)
    {
        if (!isset($donnees['id_destinataire'])) {
            return null;
        }
        $valeur = $donnees['id_destinataire'];
        if (is_int($valeur)) {
            if ($valeur <= 0) {
                return null;
            }
            return $valeur;
        }
        if (is_string($valeur) && preg_match('/^[0-9]+$/', $valeur)) {
            $id = (int) $valeur;
            if ($id <= 0) {
                return null;
            }
            return $id;
        }
        return null;
    }

    // ── Validation serveur centralisee (PAQ-1.5) ─────────────────────

    /**
     * Valide les champs d'un paquet (utilise par `creer` et
     * `mettre_a_jour`). Helper unique pour garantir la coherence des
     * regles entre creation et edition : si on ajoute demain une regle
     * (ex: caracteres interdits), elle s'applique automatiquement aux
     * deux endpoints.
     *
     * Regles (CLAUDE.md sec. 4 et sec. 6) :
     *  - titre : obligatoire, <= 150 caracteres ;
     *  - theme : facultatif, mais si fourni <= 100 caracteres.
     *
     * Renvoie un tableau "champ" => "message" pour que le client
     * puisse afficher chaque erreur sous le bon champ (pattern impose
     * par CLAUDE.md sec. 6 : message sous le champ + recap en bas).
     *
     * @param string $titre Titre saisi (deja trim et type-checke par
     *                      `lire_chaine_corps`).
     * @param string $theme Theme saisi (idem ; peut etre vide).
     * @return array<string,string>
     */
    private function valider_donnees_paquet($titre, $theme)
    {
        $erreurs = array();

        if ($titre === '') {
            $erreurs['titre'] = 'Le titre est obligatoire.';
        } else if (strlen($titre) > 150) {
            $erreurs['titre'] = 'Le titre est trop long (150 caracteres maximum).';
        }

        if ($theme !== '' && strlen($theme) > 100) {
            $erreurs['theme'] = 'Le theme est trop long (100 caracteres maximum).';
        }

        return $erreurs;
    }
}
