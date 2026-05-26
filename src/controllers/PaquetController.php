<?php
// src/controllers/PaquetController.php

require_once __DIR__ . '/../core/BaseController.php';
require_once __DIR__ . '/../core/Csrf.php';
require_once __DIR__ . '/../repositories/PaquetRepository.php';
require_once __DIR__ . '/../models/Paquet.php';

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

    public function __construct()
    {
        $this->paquets = new PaquetRepository();
    }

    /**
     * GET /api/paquets (PAQ-1.1).
     *
     * Liste les paquets dont l'utilisateur courant est proprietaire,
     * tries par date de creation decroissante (les plus recents en haut).
     * Le tri est garanti cote serveur par le SQL `ORDER BY date_creation
     * DESC` dans PaquetRepository::trouver_par_proprietaire (PAQ-1.6).
     *
     *  1. Verifie que l'utilisateur est authentifie (sinon 401).
     *  2. Charge ses paquets via le Repository.
     *  3. Repond 200 avec un tableau `paquets` (array de toArray()).
     */
    public function lister_mes_paquets()
    {
        $id_user = $this->verifier_authentifie();

        $paquets = $this->paquets->trouver_par_proprietaire($id_user);

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
        $titre = isset($donnees['titre']) ? trim($donnees['titre']) : '';
        $theme = isset($donnees['theme']) ? trim($donnees['theme']) : '';

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

    // ── Validation serveur partagee (PAQ-1.5) ────────────────────────

    /**
     * Valide les champs d'un paquet (creation et edition).
     *
     * Regles (CLAUDE.md sec. 4 et sec. 6) :
     *  - titre : obligatoire, <= 150 caracteres ;
     *  - theme : facultatif, mais si fourni <= 100 caracteres.
     *
     * Renvoie un tableau "champ" => "message" pour que le client
     * puisse afficher chaque erreur sous le bon champ (pattern impose).
     *
     * @param string $titre Titre saisi (deja trim).
     * @param string $theme Theme saisi (deja trim, peut etre vide).
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
