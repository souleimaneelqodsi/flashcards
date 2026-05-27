# Sessions PHP (DOC-AUTH.1)

Fiche technique : cycle de vie d'une session, cookie de session et régénération
de l'identifiant. Sujet hors cours (auto-formation), exigé par le sujet TER pour
l'authentification.

> Référence d'implémentation : `src/public/index.php`, `src/controllers/AuthController.php`,
> `src/public/js/session.js`. Synthèse côté rapport : `rapport.md` section 6.1.

---

## 1. À quoi sert une session

HTTP est sans état : chaque requête est indépendante, le serveur ne « se souvient »
de rien d'une requête à l'autre. Une session PHP permet de conserver une identité
entre les requêtes d'un même utilisateur. Concrètement :

- côté serveur, PHP écrit les données de session dans un fichier rangé dans le
  dossier configuré par `session.save_path` ;
- côté client, le navigateur ne reçoit qu'un cookie `PHPSESSID` contenant
  l'identifiant de session (et rien d'autre).

Aucune donnée applicative ne quitte le serveur. Dans le projet, seules trois clés
sont posées dans `$_SESSION` :

| Clé | Posée par | Rôle |
|---|---|---|
| `$_SESSION['id_user']` | `AuthController::connexion()` | identité de l'utilisateur connecté |
| `$_SESSION['email']` | `AuthController::connexion()` | confort (affichage) |
| `$_SESSION['csrf_token']` | `Csrf::generer_si_absent()` | jeton anti-CSRF (voir [33-acces-csrf.md](33-acces-csrf.md)) |

## 2. Ouverture de la session (une seule fois par requête)

La session est ouverte au tout début du front-controller `src/public/index.php`,
juste après l'enregistrement du gestionnaire global d'erreurs et avant
l'initialisation du jeton CSRF :

```php
if (!isset($_SESSION)) {
    $connexion_https = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
    session_set_cookie_params(array(
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $connexion_https,
        'httponly' => true,
        'samesite' => 'Lax'
    ));
    session_start();
}
```

Toute la suite de l'exécution (rendu de la coquille HTML pour les requêtes
navigationnelles, dispatch API pour les requêtes `/api/`) hérite du même contexte
de session sans avoir à le réinitialiser. C'est structurant : le rendu de
`src/views/app.php` lit `$_SESSION['csrf_token']` pour le poser dans une balise
`<meta>` ; sans cette ouverture en amont, le jeton ne serait jamais disponible
côté front.

## 3. Durcissement du cookie de session

Les paramètres passés à `session_set_cookie_params()` avant `session_start()`
durcissent le cookie `PHPSESSID` :

- **`httponly => true`** : le cookie n'est pas lisible en JavaScript
  (`document.cookie`). Cela limite le vol de session par injection XSS.
- **`samesite => 'Lax'`** : le navigateur n'envoie pas le cookie sur la plupart
  des requêtes inter-sites. C'est une première barrière contre le CSRF, complétée
  par le jeton anti-CSRF (voir [33-acces-csrf.md](33-acces-csrf.md)).
- **`secure => $connexion_https`** : en HTTPS, le cookie n'est jamais transmis en
  clair ; en développement local (HTTP), la condition vaut `false` pour rester
  fonctionnel.
- **`lifetime => 0`** : cookie de session (supprimé à la fermeture du navigateur).

## 4. Régénération de l'identifiant à la connexion

Après une connexion validée, `AuthController::connexion()` appelle
`session_regenerate_id(true)` **avant** de poser `$_SESSION['id_user']` :

```php
session_regenerate_id(true);
$_SESSION['id_user'] = $utilisateur->getIdUser();
$_SESSION['email']   = $utilisateur->getEmail();
Csrf::regenerer();
```

L'argument `true` détruit l'ancien fichier de session côté serveur et impose au
navigateur un nouvel identifiant. Cela neutralise la **fixation de session** : si
un attaquant parvient à imposer un `PHPSESSID` connu de lui à la victime avant
qu'elle se connecte (lien piégé), cet identifiant cesse d'être valide une fois la
victime authentifiée. Le jeton CSRF est régénéré dans la foulée par
`Csrf::regenerer()` pour la même raison.

## 5. Déconnexion

`AuthController::deconnexion()` enchaîne trois opérations, dans l'ordre
recommandé par la documentation PHP :

1. **vidage** du tableau de session : `$_SESSION = array();`
2. **suppression du cookie côté client** via `setcookie()` daté dans le passé,
   avec les paramètres récupérés par `session_get_cookie_params()` :

   ```php
   if (ini_get('session.use_cookies')) {
       $params = session_get_cookie_params();
       setcookie(session_name(), '', time() - 42000,
           $params['path'], $params['domain'],
           $params['secure'], $params['httponly']);
   }
   ```

3. **destruction** du fichier serveur : `session_destroy();`

Sans l'étape 2, le navigateur garderait le cookie `PHPSESSID` jusqu'à sa
péremption naturelle, ce qui ne correspondrait pas à une vraie déconnexion.

Côté SPA, `Session.deconnexion()` (dans `src/public/js/session.js`) envoie
`POST /api/auth/deconnexion` via `AjaxService` (qui pose le jeton CSRF), puis
recharge la page. Le rechargement repart d'une session vierge avec un nouveau
jeton CSRF, et la garde de démarrage (voir [32-validation.md](32-validation.md)
et `rapport.md` 6.5) constate qu'aucun utilisateur n'est connecté.

## 6. Périmètre des fonctions utilisées

`session_start`, `session_regenerate_id`, `session_destroy`,
`session_set_cookie_params`, `session_get_cookie_params`, `session_name`,
`setcookie`, superglobale `$_SESSION`. Ces fonctions de session figurent dans le
périmètre PHP du projet (CLAUDE.md section 2 bis).
