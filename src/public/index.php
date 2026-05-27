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

// Session PHP demarree pour toute requete (API et page HTML). Necessaire
// pour AUTH-2 : authentification, CSRF token, identite de l'utilisateur.
// Cookie de session durci avant le demarrage : HttpOnly (le cookie n'est pas
// lisible en JavaScript -> protege le vol de session par XSS) et SameSite Lax
// (limite l'envoi du cookie sur les requetes cross-site -> defense CSRF).
if (!isset($_SESSION)) {
    session_set_cookie_params(array(
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ));
    session_start();
}

// Token CSRF disponible des le premier rendu HTML (AUTH-2.12). Le token
// est expose au front via la balise <meta name="csrf-token"> dans app.php,
// et verifie par AuthController sur chaque action sensible.
require_once __DIR__ . '/../core/Csrf.php';
Csrf::generer_si_absent();

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
    require_once __DIR__ . '/../controllers/PaquetController.php';
    require_once __DIR__ . '/../controllers/UtilisateurController.php';
    require_once __DIR__ . '/../controllers/QuestionController.php';

    // Methode HTTP de la requete (GET, POST, ...).
    $methode = $_SERVER['REQUEST_METHOD'];

    // Construction du routeur et enregistrement des routes.
    //  - routes d'auth (AUTH-2) : delegue a AuthController.
    //  - routes paquets (PAQ-1) : CRUD delegue a PaquetController.
    //  - route profil : stub en attendant la macro suivante.
    $routeur = new Router();
    $auth_controleur = new AuthController();
    $paquet_controleur = new PaquetController();
    $utilisateur_controleur = new UtilisateurController();
    $question_controleur = new QuestionController();

    $routeur->ajouter('POST', '/api/auth/inscription', array($auth_controleur, 'inscription'));
    $routeur->ajouter('POST', '/api/auth/connexion', array($auth_controleur, 'connexion'));
    $routeur->ajouter('POST', '/api/auth/deconnexion', array($auth_controleur, 'deconnexion'));
    $routeur->ajouter('GET', '/api/auth/moi', array($auth_controleur, 'moi'));

    // PAQ-1.1 : liste des paquets de l'utilisateur courant.
    $routeur->ajouter('GET', '/api/paquets', array($paquet_controleur, 'lister_mes_paquets'));

    // DASH-2.1 : liste des paquets partages avec l'utilisateur courant.
    // Doit etre enregistre AVANT toute route a placeholders sur /api/paquets/:id :
    // la table des routes exactes est verifiee en premier par le routeur,
    // donc "/api/paquets/shared" tombera bien ici et pas dans le PUT/DELETE :id.
    $routeur->ajouter('GET', '/api/paquets/shared', array($paquet_controleur, 'lister_partages_avec_moi'));

    // PAQ-1.2 : creation d'un nouveau paquet.
    $routeur->ajouter('POST', '/api/paquets', array($paquet_controleur, 'creer'));

    // VIEW-1.2 : ecran de visualisation d'un paquet (titre + proprietaire + destinataires).
    $routeur->ajouter('GET', '/api/paquets/:id', array($paquet_controleur, 'afficher'));

    // PAQ-1.3 : edition d'un paquet (controle proprietaire dans l'action).
    $routeur->ajouter('PUT', '/api/paquets/:id', array($paquet_controleur, 'mettre_a_jour'));

    // PAQ-1.4 : suppression en cascade (questions + partages + paquet).
    $routeur->ajouter('DELETE', '/api/paquets/:id', array($paquet_controleur, 'supprimer'));

    // SHARE-1.1 : auto-completion d'email pour le partage de paquet.
    $routeur->ajouter('GET', '/api/users/search', array($utilisateur_controleur, 'search'));

    // SHARE-1.2 : ajout d'un destinataire au partage d'un paquet.
    $routeur->ajouter('POST', '/api/paquets/:id/share', array($paquet_controleur, 'partager'));

    // SHARE-1.3 : retire un destinataire du partage (controle proprietaire).
    $routeur->ajouter('DELETE', '/api/paquets/:id/share/:userId', array($paquet_controleur, 'retirer_partage'));

    // QST-1.1 : creation d'une question dans un paquet.
    $routeur->ajouter('POST', '/api/paquets/:id/questions', array($question_controleur, 'creer'));

    // QST-1.2 : edition d'une question (controle proprietaire via paquet parent).
    $routeur->ajouter('PUT', '/api/questions/:id', array($question_controleur, 'mettre_a_jour'));

    // QST-1.3 : suppression d'une question (controle proprietaire via paquet parent).
    $routeur->ajouter('DELETE', '/api/questions/:id', array($question_controleur, 'supprimer'));

    // QST-1.4 : liste des questions d'un paquet (acces proprietaire-ou-destinataire).
    $routeur->ajouter('GET', '/api/paquets/:id/questions', array($question_controleur, 'lister_par_paquet'));

    // STUDY-1.1 : charge un paquet pour une session de revision (paquet + questions + flag proprietaire).
    $routeur->ajouter('GET', '/api/paquets/:id/study', array($paquet_controleur, 'charger_pour_study'));

    $routeur->ajouter('GET', '/api/profil', function () {
        Response::json(array('message' => 'stub profil'), 200);
    });

    $routeur->dispatcher($methode, $chemin);
    exit;
}

// Requete classique : on sert la coquille HTML de la SPA.
require __DIR__ . '/../views/app.php';
