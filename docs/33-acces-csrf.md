# 33. règles d'accès, middleware et protection CSRF

Cette section documente la couche de contrôle d'accès de FlashCards
MIAGE : le middleware d'authentification, les règles d'autorisation par
ressource (propriétaire vs destinataire), la protection CSRF de bout en
bout, et les defenses transverses (injection SQL, XSS, fuite d'erreurs).
Elle s'appuie sur les sessions documentees en
[30-sessions.md](30-sessions.md).

## 33.1 Authentification vs autorisation

Deux questions distinctes, traitees a deux niveaux :

- **Authentification** ("qui es-tu ?") : vérifiée par le middleware
  `verifier_authentifie()`, qui contrôle la presence de
  `$_SESSION['id_user']`. réponse **401** si absent.
- **Autorisation** ("as-tu le droit sur CETTE ressource ?") : vérifiée
  dans chaque action, en comparant l'utilisateur connecte au propriétaire
  du paquet ou a la liste des destinataires. réponse **403** si interdit.

## 33.2 Le middleware d'authentification (`checkAuth`)

défini dans [src/core/BaseController.php](../src/core/BaseController.php) et
hérite par tous les controleurs :

```php
protected function verifier_authentifie()
{
    if (!isset($_SESSION['id_user'])) {
        $this->repondre(array('erreur' => 'Non authentifié'), 401);
    }
    return (int) $_SESSION['id_user'];
}
```

Chaque endpoint protégé l'appelle **en premiere ligne**. Exemple type :

```php
public function lister_mes_paquets()
{
    $id_user = $this->verifier_authentifie();    // 401 si non connecte
    $paquets = $this->paquets->trouver_par_proprietaire($id_user);
    // ...
}
```

côté front, l'intercepteur 401 de
[src/public/js/ajax.js](../src/public/js/ajax.js) redirige automatiquement
vers `#login` quand un endpoint protégé renvoie 401 (session expiree), sauf
quand l'appelant gere lui-même le 401 (cas du login, ou un 401 signifie
"identifiants invalides", pas "session expiree").

## 33.3 Les règles d'autorisation par ressource

Le sujet (CLAUDE.md sec. 4) pose une règle metier centrale : **le partage
transfere l'accès au contenu, pas la progression**. Les scores (`last_score`,
`best_score`) sont strictement personnels au propriétaire. On en deduit
deux niveaux de droits, appliques dans
[src/controllers/PaquetController.php](../src/controllers/PaquetController.php) :

| Action                              | propriétaire | Destinataire | Autre |
|-------------------------------------|--------------|--------------|-------|
| Voir un paquet (`afficher`)         | oui          | oui          | 403   |
| Lister les questions / réviser      | oui          | oui          | 403   |
| éditer / supprimer le paquet        | oui          | 403          | 403   |
| Ajouter / éditer / supprimer une question | oui    | 403          | 403   |
| Enregistrer un score                | oui          | 403          | 403   |
| Partager / retirer un partage       | oui          | 403          | 403   |

Le motif de contrôle est systematique : charger le paquet, 404 s'il
n'existe pas, puis comparer le propriétaire a l'utilisateur courant.

### Lecture : propriétaire OU destinataire

```php
// PaquetController::afficher (extrait)
$est_proprietaire = ($paquet->getIdProprietaire() === $id_user);
if (!$est_proprietaire) {
    $est_destinataire = $this->partages->existe($id_paquet, $id_user);
    if (!$est_destinataire) {
        $this->repondre(array('erreur' => 'Accès refusé.'), 403);
        return;
    }
}
```

Optimisation lisible : on ne fait la requête `partages->existe(...)` que si
l'utilisateur n'est **pas** déjà propriétaire (inutile de vérifier le
partage dans ce cas).

### Ecriture : propriétaire uniquement

```php
// PaquetController::mettre_a_jour / supprimer / enregistrer_score / partager
if ($paquet->getIdProprietaire() !== $id_user) {
    $this->repondre(array('erreur' => 'Accès refusé.'), 403);
    return;
}
```

Pour l'enregistrement du score, le contrôle propriétaire applique
directement la règle metier : un destinataire peut **réviser** un paquet
partage, mais sa session ne doit jamais écrire `last_score`/`best_score`,
qui appartiennent au propriétaire. Le front masque le bouton concerne via
le flag `est_proprietaire`, mais **le serveur refuse de toute façon** (403)
si la requête arrive malgre tout : la sécurité ne repose jamais sur l'UI.

### Semantique des codes

- **401** : pas connecte (aucune session). Geree par le middleware.
- **403** : connecte, mais pas le droit sur cette ressource.
- **404** : ressource inexistante.

Pour les actions reservees au propriétaire, on choisit de répondre 403
(et non 404) quand l'utilisateur n'est pas propriétaire d'un paquet
existant : le comportement est documente dans le code action par action.

## 33.4 La protection CSRF

### Qu'est-ce qu'une attaque CSRF

Le **Cross-Site Request Forgery** exploite le fait que le navigateur
envoie automatiquement le cookie de session sur toute requête vers notre
domaine. Un site malveillant peut donc déclencher, a l'insu de la victime
connectee, une requête mutante (ex : suppression d'un paquet) qui partira
avec le cookie valide. Le cookie seul ne prouve donc pas l'intention de
l'utilisateur.

La parade : exiger, sur chaque requête mutante, un **jeton secret** que
seul notre propre front connait (un site tiers ne peut pas le lire, grace a
la *same-origin policy*).

### Cycle du jeton de bout en bout

```
  index.php : Csrf::generer_si_absent()  ->  $_SESSION['csrf_token']
       |
       v
  app.php : <meta name="csrf-token" content="<?php echo htmlspecialchars($csrf_token...) ?>">
       |
       v
  ajax.js : lit la <meta>, pose l'en-tete  X-CSRF-Token: <jeton>  sur chaque requete
       |
       v
  Csrf::verifier_requete() : compare l'en-tete recu au jeton en session (hash_equals)
```

### 1. génération et exposition

[src/public/index.php](../src/public/index.php) appelle
`Csrf::generer_si_absent()` des le démarrage de session :

```php
public static function generer_si_absent()
{
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = self::nouveau_token();
    }
}
// nouveau_token() : bin2hex(random_bytes(32))  -> 64 caracteres hexa, 256 bits
```

Le jeton est expose au front dans [src/views/app.php](../src/views/app.php),
**échappé** pour eviter toute injection dans l'attribut HTML :

```php
<meta name="csrf-token" content="<?php echo htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8'); ?>">
```

### 2. Envoi automatique par le front

Le wrapper AJAX unique
([src/public/js/ajax.js](../src/public/js/ajax.js)) lit la balise et pose
l'en-tête sur **toutes** les requêtes, de façon transparente :

```js
function construire_entetes() {
    var entetes = { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" };
    var token = lire_token_csrf();           // lit <meta name="csrf-token">
    if (token !== "") {
        entetes["X-CSRF-Token"] = token;
    }
    return entetes;
}
```

Aucun code metier n'a a se soucier du CSRF : il suffit de passer par
`AjaxService`.

### 3. vérification côté serveur

`Csrf::verifier_requete()` ([src/core/Csrf.php](../src/core/Csrf.php)) est
appele en tête de chaque action **mutante** (POST/PUT/DELETE) :
inscription, connexion, déconnexion, création/édition/suppression de
paquet, partage, questions, profil, mot de passe, avatar.

```php
public static function verifier_requete()
{
    $token_recu = self::lire_token_entete();   // HTTP_X_CSRF_TOKEN
    $token_session = self::obtenir();
    if ($token_session === '' || $token_recu === '') {
        Response::json(array('erreur' => 'Token CSRF manquant.'), 403);
    }
    if (!hash_equals($token_session, $token_recu)) {
        Response::json(array('erreur' => 'Token CSRF invalide.'), 403);
    }
}
```

`hash_equals` compare en **temps constant**, ce qui evite les attaques par
mesure de temps (*timing attack*) qui pourraient, avec un `===` classique,
laisser deviner le jeton caractere par caractere.

Les endpoints en **lecture seule** (GET : `moi`, `users/search`, liste des
paquets...) ne verifient pas le CSRF : une requête GET ne doit, par
convention, jamais modifier l'état, donc le risque CSRF ne s'y applique
pas. Ils restent neanmoins proteges par l'authentification.

### 4. régénération a la connexion

`AuthController::connexion` appelle `Csrf::regenerer()` après
`session_regenerate_id(true)`, et renvoie le nouveau jeton dans la réponse
(`csrf_token`). Comme la SPA ne recharge pas la page, le front met a jour
la balise `<meta>` lui-même (`soumettre_login` dans `auth.js`) :

```js
if (reponse && typeof reponse.csrf_token === "string") {
    $("meta[name='csrf-token']").attr("content", reponse.csrf_token);
}
```

Sans cela, un jeton capture sur la page de login resterait valide
après connexion, et les requêtes mutantes suivantes enverraient l'ancien
jeton (rejet en 403).

## 33.5 Ordre des contrôles dans une action mutante

Une action qui modifie l'état enchaine, en tête de méthode :

1. `Csrf::verifier_requete()` — origine legitime de la requête (403 sinon) ;
2. `verifier_authentifie()` — utilisateur connecte (401 sinon) ;
3. contrôle d'autorisation sur la ressource (propriétaire/destinataire, 403/404) ;
4. validation des donnees (cf. [32-validation.md](32-validation.md)) ;
5. accès a la base via le Repository.

## 33.6 Defenses transverses

La couche d'accès s'appuie aussi sur trois protections documentees
ailleurs mais rappelees ici car indissociables de la sécurité :

- **Injection SQL** : 100 % de requêtes preparees PDO. Tous les
  Repositories passent par `DB::executer($sql, $params)`
  ([src/core/DB.php](../src/core/DB.php)), qui prepare puis lie les
  parametres. Aucune concatenation de valeur utilisateur dans une chaine
  SQL. même la recherche `LIKE` du partage échappé `%`, `_` et `\` avant de
  parametrer le motif (`UtilisateurRepository::rechercher_par_email_partiel`).
- **XSS** : echappement `htmlspecialchars(..., ENT_QUOTES, 'UTF-8')` côté
  PHP pour toute valeur injectee dans le HTML servi (ex : le jeton CSRF
  dans `app.php`) ; côté front, le contenu utilisateur est insere avec
  `.text()` plutot que `.html()`, ce qui empeche l'interpretation de
  balises.
- **Pas de fuite d'erreur** : `ErrorHandler`
  ([src/core/ErrorHandler.php](../src/core/ErrorHandler.php)) coupe
  `display_errors`, journalise côté serveur (via `Logger`) et renvoie un
  JSON neutre `{ "erreur": "Une erreur interne est survenue." }` en 500.
  Aucune stack trace, aucun chemin de fichier n'est expose au client. De
  même, `DB::executer` capture les `PDOException`, log le detail et leve une
  `RuntimeException` au message generique.

## 33.7 Choix d'implémentation : pourquoi `Csrf` en méthodes statiques

`Csrf` n'est pas une instance de classe : ce sont des helpers statiques
operant sur `$_SESSION`. C'est volontaire — le projet limite les patrons a
trois (Singleton, Repository, Factory, cf. dossier de conception) ; faire
de `Csrf` un quatrieme objet a état n'apporterait rien. Un namespace de
fonctions statiques autour d'une valeur de session est la solution la plus
simple et la plus lisible.

## 33.8 Conformite au sujet

| Exigence (CLAUDE.md sec. 7) | implémentation |
|------------------------------|----------------|
| vérifier `$_SESSION['id_user']` avant toute action metier | `verifier_authentifie()` en premiere ligne |
| Token CSRF en session, envoye via AJAX sur les endpoints mutants | `Csrf` + en-tête `X-CSRF-Token` pose par `ajax.js` |
| SQL : 100 % requêtes preparees, zero concatenation | `DB::executer` + Repositories |
| XSS : `htmlspecialchars` côté PHP, `.text()` côté jQuery | `app.php`, helpers d'affichage |
| Erreurs PHP : pas de stack trace dans la réponse | `ErrorHandler` + `DB::executer` |

## 33.9 périmètre des APIs utilisees

`random_bytes`, `bin2hex` et `hash_equals` sont des fonctions PHP standard
liees a la sécurité. Bien que peu detaillees dans les PDFs de cours, elles
sont citees par le sujet TER au titre des bonnes pratiques de sécurité
(auto-formation assumee), et leur usage est commente dans
[src/core/Csrf.php](../src/core/Csrf.php). Le reste (superglobales,
`isset`, `header` via `Response`) est dans le périmètre du cours.
