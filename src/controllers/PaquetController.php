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
}
