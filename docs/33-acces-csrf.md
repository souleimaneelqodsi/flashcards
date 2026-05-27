# Contrôle d'accès, middleware et CSRF (DOC-AUTH.4)

Fiche technique : protection des endpoints par middleware d'authentification,
garde de navigation côté SPA, et jeton anti-CSRF.

> Référence d'implémentation : `src/core/BaseController.php` (middleware),
> `src/core/Csrf.php` (jeton CSRF), `src/public/index.php` (initialisation),
> `src/public/js/ajax.js` (envoi du jeton, intercepteur 401),
> `src/public/js/session.js` (garde côté client).
> Synthèse côté rapport : `rapport.md` section 6.4.

---

## 1. Middleware d'authentification côté serveur

Le contrôle d'accès aux endpoints protégés est centralisé dans
`BaseController::verifier_authentifie()` :

```php
protected function verifier_authentifie()
{
    if (!isset($_SESSION['id_user'])) {
        $this->repondre(array('erreur' => 'Non authentifié'), 401);
    }
    return (int) $_SESSION['id_user'];
}
```

La méthode lit `$_SESSION['id_user']` et, si la clé est absente, court-circuite
l'action en répondant immédiatement `401 Unauthorized`. Une action protégée n'a
qu'à l'appeler en première ligne ; le reste du code ne s'exécute que si
l'utilisateur est connecté. La valeur de retour (`id_user`) sert aux opérations
suivantes, typiquement pour vérifier qu'un utilisateur est bien propriétaire de la
ressource demandée. Exemple d'usage : `AuthController::moi()` (sonde de session).

## 2. Garde de navigation côté SPA

Le contrôle serveur ne suffit pas : le client doit aussi refuser d'afficher les
écrans protégés à un visiteur non connecté.

**Sonde de démarrage.** Au chargement (`app.js`), `Session.demarrer()` interroge
`GET /api/auth/moi`. Elle utilise volontairement `$.ajax` **brut** et non
`AjaxService` : ici un `401` n'est pas une anomalie mais le cas nominal d'un
visiteur non connecté. Passer par `AjaxService` déclencherait sa redirection
automatique sur 401 et entrerait en conflit avec la logique de garde.

**Intercepteur 401.** Pour les requêtes métier (via `AjaxService`), tout retour
`401` (session expirée) bascule la SPA sur `#login` :

```js
function intercepter_401(xhr) {
    if (xhr.status === 401) {
        window.location.hash = url_login;   // "#login"
        return true;
    }
    return false;
}
```

La déconnexion d'une session expirée se fait donc sans rechargement et sans code
spécifique dans chaque écran.

## 3. Le jeton anti-CSRF

### Pourquoi c'est nécessaire

Une session PHP est adossée à un cookie envoyé **automatiquement** par le
navigateur sur chaque requête vers le domaine. Un site tiers visité par un
utilisateur connecté peut donc déclencher une requête (ex.
`POST /api/auth/deconnexion`) à son insu : le cookie partira avec, et sans
protection complémentaire la requête serait traitée comme légitime. C'est une
attaque Cross-Site Request Forgery (CSRF).

Le cookie `SameSite=Lax` (voir [30-sessions.md](30-sessions.md)) est une première
barrière ; le jeton anti-CSRF en est la barrière principale.

### La classe Csrf

`src/core/Csrf.php` est composée de méthodes **statiques** (pas un Singleton : on
ne dépasse pas les trois patrons retenus par le projet). Elle expose :

- **`generer_si_absent()`** : appelée par le front-controller juste après
  `session_start()`, pose un jeton aléatoire dans `$_SESSION['csrf_token']` au
  premier passage. Le jeton est produit par `bin2hex(random_bytes(32))` : 32 octets
  cryptographiquement sûrs (256 bits), encodés en 64 caractères hexadécimaux
  transportables en en-tête HTTP ;
- **`regenerer()`** : appelée par `AuthController::connexion()` après
  `session_regenerate_id`. Sans cela, un jeton capturé sur la page de connexion
  resterait valide une fois connecté, annulant la précaution contre la fixation de
  session ;
- **`obtenir()`** : utilisée par `src/views/app.php` pour exposer le jeton via la
  balise `<meta name="csrf-token">` ;
- **`verifier_requete()`** : appelée en tête de chaque action sensible
  (`inscription`, `connexion`, `deconnexion`). Elle lit l'en-tête `X-CSRF-Token`,
  le compare au jeton de session, et répond `403 Forbidden` en cas d'absence ou de
  désaccord :

  ```php
  if (!hash_equals($token_session, $token_recu)) {
      Response::json(array('erreur' => 'Token CSRF invalide.'), 403);
  }
  ```

  `hash_equals()` compare en **temps constant** pour éviter les attaques par mesure
  de temps (équivalent sécurisé de `===` sur des secrets).

### Envoi du jeton côté front

Le wrapper `AjaxService` lit la balise `<meta name="csrf-token">` à chaque requête
et pose systématiquement l'en-tête `X-CSRF-Token` :

```js
var token = lire_token_csrf();
if (token !== "") {
    entetes["X-CSRF-Token"] = token;
}
```

Une requête forgée par un site tiers échouera : la politique d'origine du
navigateur l'empêche de lire la balise `<meta>` du domaine FlashCards, donc elle
ne peut pas reproduire le bon jeton.

### Synchronisation du jeton après connexion

La SPA ne recharge pas la page après une connexion : la balise `<meta>` contient
encore l'ancien jeton, devenu invalide depuis la régénération serveur. Pour éviter
qu'une première requête mutante post-connexion soit rejetée en 403,
`AuthController::connexion()` renvoie le nouveau jeton dans le champ `csrf_token`
de sa réponse, et `auth.js` met à jour la balise :

```js
if (reponse && typeof reponse.csrf_token === "string") {
    $("meta[name='csrf-token']").attr("content", reponse.csrf_token);
}
```

### CSRF exigé même à la déconnexion

`Csrf::verifier_requete()` est exigé y compris pour la déconnexion : un attaquant
ne doit pas pouvoir déconnecter l'utilisateur par CSRF, même si la nuisance est
« seulement » d'utilisabilité. Séquence serveur :
vérifier CSRF → vider `$_SESSION` → supprimer le cookie → `session_destroy` → 200.

## 4. Périmètre des fonctions utilisées

- **Serveur** : `$_SESSION`, `$_SERVER` (lecture de `HTTP_X_CSRF_TOKEN`),
  `random_bytes`, `bin2hex`, `hash_equals`. Les trois dernières sont hors cours
  stricto sensu mais relèvent des bonnes pratiques de sécurité citées par le sujet
  TER (auto-formation).
- **Client** : `$()`, `.attr()`, en-têtes `$.ajax`, `window.location.hash`.
  Périmètre du cours (CLAUDE.md section 2 bis).
