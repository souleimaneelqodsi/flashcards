<?php
// src/public/index.php
// Front-controller unique de l'application FlashCards MIAGE.
//
// Toute requete passe par ce fichier :
//   - fichiers statiques (css, js, images) : servis directement en dev ;
//   - URL commencant par /api/ : dispatch vers le routeur (reponse JSON) ;
//   - reste : coquille HTML de la SPA (couche Vue), qui prend ensuite le relais
//     cote client en jQuery (navigation sans rechargement).

// Gestionnaire global d'erreurs / exceptions (BACK-2.7). Installe avant
// toute autre operation pour rattraper aussi les erreurs des `require`.
require_once __DIR__ . '/../core/ErrorHandler.php';
ErrorHandler::enregistrer();

// Chemin demande, sans la chaine de requete (?cle=valeur).
$chemin = $_SERVER['REQUEST_URI'];
$position_query = strpos($chemin, '?');
if ($position_query !== false) {
    $chemin = substr($chemin, 0, $position_query);
}

// Serveur de developpement PHP (commande "php -S") : on laisse le serveur servir
// directement les fichiers statiques existants (css, js, images) sans passer par
// le front-controller. En production (Apache / XAMPP), c'est le serveur web qui
// s'en charge, donc ce bloc ne s'execute pas.
if (php_sapi_name() === 'cli-server') {
    $fichier_demande = __DIR__ . $chemin;
    if (is_file($fichier_demande)) {
        return false;
    }
}

// Prefixe qui distingue les appels a l'API du reste de la navigation.
$prefixe_api = '/api/';
$est_appel_api = (substr($chemin, 0, strlen($prefixe_api)) === $prefixe_api);

if ($est_appel_api) {
    require_once __DIR__ . '/../core/Response.php';
    require_once __DIR__ . '/../core/Router.php';
    require_once __DIR__ . '/../controllers/AuthController.php';

    // Methode HTTP de la requete (GET, POST, ...).
    $methode = $_SERVER['REQUEST_METHOD'];

    // Construction du routeur et enregistrement des routes. Les routes d'auth
    // (AUTH-1) delegüent a AuthController : ce sont encore des mocks (pas de
    // BD ni de BCRYPT), ils respectent juste le contrat d'API attendu par le
    // front. Les autres routes restent des stubs inline pour l'instant.
    $routeur = new Router();
    $auth_controleur = new AuthController();

    $routeur->ajouter('POST', '/api/auth/inscription', array($auth_controleur, 'inscription'));
    $routeur->ajouter('POST', '/api/auth/connexion', array($auth_controleur, 'connexion'));
    $routeur->ajouter('POST', '/api/auth/deconnexion', array($auth_controleur, 'deconnexion'));
    $routeur->ajouter('GET', '/api/auth/moi', array($auth_controleur, 'moi'));
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
