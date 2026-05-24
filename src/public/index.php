<?php
// src/public/index.php
// Front-controller unique de l'application FlashCards MIAGE.
//
// Toute requete passe par ce fichier :
//   - si l'URL commence par /api/ : on dispatch vers le routeur (reponse JSON) ;
//   - sinon : on sert la coquille HTML de la SPA (couche Vue), qui prend ensuite
//     le relais cote client en jQuery (navigation sans rechargement).

require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Router.php';

// Methode HTTP de la requete (GET, POST, ...).
$methode = $_SERVER['REQUEST_METHOD'];

// Chemin demande, sans la chaine de requete (?cle=valeur).
$chemin = $_SERVER['REQUEST_URI'];
$position_query = strpos($chemin, '?');
if ($position_query !== false) {
    $chemin = substr($chemin, 0, $position_query);
}

// Prefixe qui distingue les appels a l'API du reste de la navigation.
$prefixe_api = '/api/';
$est_appel_api = (substr($chemin, 0, strlen($prefixe_api)) === $prefixe_api);

if ($est_appel_api) {
    // Construction du routeur et enregistrement des routes (stubs pour l'instant :
    // ils renvoient un JSON fictif, en attendant les vrais controleurs en BACK-2).
    $routeur = new Router();

    $routeur->ajouter('POST', '/api/auth/inscription', function () {
        Response::json(array('message' => 'stub inscription'), 200);
    });
    $routeur->ajouter('POST', '/api/auth/connexion', function () {
        Response::json(array('message' => 'stub connexion'), 200);
    });
    $routeur->ajouter('POST', '/api/auth/deconnexion', function () {
        Response::json(array('message' => 'stub deconnexion'), 200);
    });
    $routeur->ajouter('GET', '/api/paquets', function () {
        Response::json(array('message' => 'stub liste des paquets', 'paquets' => array()), 200);
    });
    $routeur->ajouter('GET', '/api/profil', function () {
        Response::json(array('message' => 'stub profil'), 200);
    });

    $routeur->dispatcher($methode, $chemin);
    exit;
}

// Requete classique : on sert la coquille HTML de la SPA.
require __DIR__ . '/../views/app.php';
