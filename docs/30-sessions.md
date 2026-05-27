# 30. Sessions PHP : cycle de vie, cookie, régénération d'identifiant

Cette section documente la gestion des sessions PHP dans FlashCards MIAGE :
comment une session est démarrée, durcie, utilisee pour identifier
l'utilisateur connecte, régénérée a la connexion et détruite a la
déconnexion. Le mecanisme de session est la brique sur laquelle reposent
l'authentification (qui est connecte ?), la protection CSRF (cf.
[33-accès-csrf.md](33-accès-csrf.md)) et le contrôle d'accès aux paquets.

## 30.1 Qu'est-ce qu'une session PHP ?

HTTP est un protocole sans état : deux requêtes successives d'un même
navigateur sont, par defaut, independantes. Pour qu'un utilisateur reste
"connecte" d'une page a l'autre, PHP fournit le mecanisme de **session** :

1. Au premier `session_start()`, PHP généré un identifiant aleatoire
   (le **session id**) et l'envoie au navigateur dans un cookie nomme
   `PHPSESSID`.
2. Les donnees associees a cette session sont stockees **côté serveur**
   (par defaut dans un fichier temporaire), jamais dans le cookie. Le
   cookie ne contient que l'identifiant.
3. A chaque requête suivante, le navigateur renvoie automatiquement le
   cookie ; PHP retrouve le bon fichier de session et repeuple la
   superglobale `$_SESSION`.

Dans notre projet, `$_SESSION` contient trois cles (renseignees a la
connexion, cf. `AuthController::connexion`) :

| Cle                    | Contenu                                  | Pose par |
|------------------------|------------------------------------------|----------|
| `$_SESSION['id_user']` | Identifiant de l'utilisateur connecte    | `AuthController::connexion` |
| `$_SESSION['email']`   | Email de l'utilisateur (confort/affichage) | `AuthController::connexion`, resynchronise par `UtilisateurController::mettre_a_jour_profil` |
| `$_SESSION['csrf_token']` | Jeton anti-CSRF (cf. 33-accès-csrf.md) | `Csrf::generer_si_absent` |

## 30.2 démarrage et durcissement du cookie de session

Tout passe par le front-controller unique
[src/public/index.php](../src/public/index.php). La session est démarrée
**pour toute requête** (page HTML comme appel API), car le token CSRF doit
exister des le premier rendu et l'identite de l'utilisateur doit etre
disponible sur chaque endpoint protégé.

Avant `session_start()`, on configure les parametres du cookie de session
avec `session_set_cookie_params()` :

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

Chaque option a une raison de sécurité precise :

- **`httponly => true`** : le cookie de session n'est pas lisible en
  JavaScript (`document.cookie`). Si une faille XSS injectait du script
  dans la page, ce script ne pourrait pas voler le `PHPSESSID` et donc
  pas usurper la session. C'est la principale defense contre le vol de
  session par XSS.
- **`samesite => 'Lax'`** : le navigateur n'envoie pas le cookie sur la
  plupart des requêtes cross-site (declenchees depuis un autre domaine).
  C'est une defense supplementaire contre le CSRF, en complement du jeton
  applicatif documente en [33-accès-csrf.md](33-accès-csrf.md).
- **`secure => $connexion_https`** : en HTTPS, le cookie n'est jamais
  envoye en clair sur une connexion non chiffree. La condition vaut
  `false` en developpement local (HTTP via `php -S`), pour que
  l'application reste utilisable, et `true` en production HTTPS.
- **`lifetime => 0`** : cookie de session pure, supprime a la fermeture du
  navigateur (pas de persistance "remember me", hors périmètre du sujet).
- **`path => '/'`** : le cookie est valable sur toute l'application.

Le test `if (!isset($_SESSION))` evite de reconfigurer / redemarrer une
session déjà active (PHP emettrait sinon un warning).

## 30.3 Cycle de vie d'une session

```
                    Navigateur                         Serveur PHP
                        |                                  |
  1. 1ere visite        |  GET /                           |
                        | -------------------------------> | session_start() : cree le session id
                        |                                  | Csrf::generer_si_absent() : pose csrf_token
                        | <------ Set-Cookie: PHPSESSID --- | rend app.php (<meta csrf-token>)
                        |                                  |
  2. Connexion          |  POST /api/auth/connexion        |
                        | -------------------------------> | password_verify OK
                        |                                  | session_regenerate_id(true)  <-- NOUVEL id
                        |                                  | $_SESSION['id_user'] = ...
                        |                                  | Csrf::regenerer() : nouveau csrf_token
                        | <-- Set-Cookie: PHPSESSID(neuf) - | 200 { utilisateur, csrf_token }
                        |                                  |
  3. Navigation         |  GET /api/auth/moi               |
                        | --- Cookie: PHPSESSID ---------> | verifier_authentifie() lit $_SESSION['id_user']
                        | <------------- 200 { utilisateur} |
                        |                                  |
  4. Deconnexion        |  POST /api/auth/deconnexion      |
                        | -------------------------------> | $_SESSION = array()
                        |                                  | setcookie(PHPSESSID, expire dans le passe)
                        |                                  | session_destroy()
                        | <----------------- 200 --------- |
```

## 30.4 La connexion : `session_regenerate_id(true)`

A la connexion reussie (`AuthController::connexion`), après avoir vérifié
le mot de passe avec `password_verify` (cf. [31-bcrypt.md](31-bcrypt.md)),
on exécuté :

```php
session_regenerate_id(true);
$_SESSION['id_user'] = $utilisateur->getIdUser();
$_SESSION['email']   = $utilisateur->getEmail();
```

**Pourquoi régénérer l'identifiant ?** Pour se protéger de la **fixation
de session** (*session fixation*). Dans cette attaque, l'agresseur force
la victime a utiliser un session id qu'il connait déjà (par exemple via un
lien piege), puis attend que la victime se connecte avec cet id : il
hérite alors d'une session authentifiee.

`session_regenerate_id(true)` attribue un **nouvel** identifiant au moment
precis ou la session change de niveau de privilege (anonyme -> connecte).
L'ancien id que l'attaquant aurait pu fixer devient inutile. L'argument
`true` demande la **suppression** de l'ancien fichier de session, pour ne
pas laisser trainer une session orpheline côté serveur.

Juste après, `Csrf::regenerer()` produit aussi un nouveau jeton CSRF (cf.
[33-accès-csrf.md](33-accès-csrf.md)) : un jeton capture sur la page de
login avant connexion ne doit pas rester valable une fois connecte.

## 30.5 Le garde d'authentification : `verifier_authentifie()`

L'identite portee par la session est lue par le middleware
`verifier_authentifie()` de
[src/core/BaseController.php](../src/core/BaseController.php), dont
heritent tous les controleurs :

```php
protected function verifier_authentifie()
{
    if (!isset($_SESSION['id_user'])) {
        $this->repondre(array('erreur' => 'Non authentifié'), 401);
    }
    return (int) $_SESSION['id_user'];
}
```

Chaque action protégée l'appelle en premiere ligne. Si la session ne
contient pas d'`id_user` (jamais connecte, session expiree ou détruite),
le serveur répond **401 Unauthorized** et l'action ne s'exécuté pas. En
cas de succès, la méthode renvoie l'`id_user` pour la suite du traitement.
côté front, l'intercepteur 401 de
[src/public/js/ajax.js](../src/public/js/ajax.js) redirige alors vers
l'écran de connexion.

## 30.6 La déconnexion : vider, expirer le cookie, détruire

La déconnexion (`AuthController::deconnexion`) fait trois choses, dans cet
ordre, pour une déconnexion **complète** :

```php
// 1. Vide le contenu de la session en memoire.
$_SESSION = array();

// 2. Demande au navigateur de supprimer le cookie de session.
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(), '', time() - 42000,
        $params['path'], $params['domain'],
        $params['secure'], $params['httponly']
    );
}

// 3. Detruit le fichier de session cote serveur.
session_destroy();
```

- **Vider `$_SESSION`** retire `id_user`, `email` et `csrf_token` de la
  requête courante.
- **Expirer le cookie** : on repose le cookie `PHPSESSID` avec une date
  d'expiration dans le passe (`time() - 42000`), ce qui ordonne au
  navigateur de le supprimer. Sans cette étape, le navigateur garderait le
  cookie jusqu'a sa péremption naturelle ; ce n'est pas conforme a une
  vraie déconnexion. On réutilisé les mêmes parametres (`path`, `domain`,
  `secure`, `httponly`) que ceux du cookie d'origine pour cibler le bon
  cookie.
- **`session_destroy()`** supprime les donnees de session côté serveur.

## 30.7 Conformite au sujet

| Exigence (CLAUDE.md sec. 7 / sujet TER) | implémentation |
|------------------------------------------|----------------|
| `session_start()` en debut de requête protégée | démarrée pour toute requête dans `index.php` |
| vérifier `$_SESSION['id_user']` avant toute action metier | `BaseController::verifier_authentifie()`, appele en premiere ligne |
| `session_regenerate_id(true)` a la connexion | `AuthController::connexion` |
| déconnexion effective | `AuthController::deconnexion` (vide + expire cookie + détruit) |

## 30.8 périmètre des fonctions utilisees

Toutes les fonctions de session employees sont des fonctions PHP standard
citees dans le périmètre du sujet : `session_start`, `session_destroy`,
`session_regenerate_id`, `session_set_cookie_params`,
`session_get_cookie_params`, `session_name`, `setcookie`, `ini_get`, plus
la superglobale `$_SESSION`. Aucune bibliotheque externe de gestion de
session n'est utilisee.
