# Rapport TER MIAGE — FlashCards

> Document de travail. Sera converti en `rapport.pdf` en fin de projet (pandoc ou export Markdown vers PDF).

---

## Sommaire

1. Introduction *(à compléter)*
2. Architecture *(à compléter par DOC-ARCH)*
3. Patrons de conception *(à compléter par DOC-PATRONS)*
4. Modèle de données *(à compléter par DOC-BD)*
5. Organisation des fichiers *(à compléter par DOC-FICHIERS)*
6. **Authentification — sessions, hachage, validation, accès *(DOC-AUTH, ci-dessous)***
7. Installation *(à compléter par DOC-INSTALL)*
8. Conclusion *(à compléter)*

---

## 6. Authentification

L'authentification couvre cinq dimensions techniques qui se complètent : le maintien d'une identité côté serveur via les sessions PHP, le stockage non réversible des mots de passe via BCRYPT, la validation symétrique des saisies côté client et côté serveur, le contrôle d'accès aux endpoints par middleware et par jeton anti-CSRF, et enfin la persistance de cette identité côté SPA via une garde de navigation au démarrage de l'application.

### 6.1 Sessions PHP

#### Cycle de vie

La session est ouverte une unique fois par requête HTTP, au tout début du front-controller `src/public/index.php`, juste après l'enregistrement du gestionnaire global d'erreurs et avant l'initialisation du jeton CSRF. Toute la suite de l'exécution (rendu HTML de la coquille SPA pour les requêtes navigationnelles, dispatch API pour les requêtes en `/api/`) hérite ainsi du même contexte de session sans avoir à se soucier de son initialisation. C'est un point structurant : le rendu de `src/views/app.php` lit `$_SESSION['csrf_token']` pour le poser dans la balise `<meta>` (cf. 6.4) ; sans cette initialisation au front-controller, le jeton ne serait jamais accessible au front avant la première requête API.

Côté serveur, la session est matérialisée par un fichier que PHP stocke dans le dossier de sessions configuré (`session.save_path`). Côté client, le navigateur ne reçoit qu'un cookie `PHPSESSID` contenant l'identifiant de session. Aucune donnée applicative (identifiant utilisateur, e-mail, jeton CSRF) ne quitte le serveur : seules les clés `$_SESSION['id_user']`, `$_SESSION['email']` et `$_SESSION['csrf_token']` y sont posées, par `AuthController::connexion()` pour les deux premières et par `Csrf::generer_si_absent()` pour la troisième.

#### Régénération de l'identifiant à la connexion

Après une connexion validée, `AuthController::connexion()` appelle `session_regenerate_id(true)` avant de poser `$_SESSION['id_user']`. L'argument `true` détruit l'ancien fichier de session côté serveur et impose au navigateur un nouveau cookie. Cette précaution neutralise la fixation de session : si un attaquant parvient à imposer un identifiant à la victime avant qu'elle se connecte (par exemple via un lien piégé contenant un `PHPSESSID` connu de l'attaquant), cet identifiant cesse d'être valide une fois la victime authentifiée. Le jeton CSRF est régénéré dans la foulée par `Csrf::regenerer()` pour la même raison, et son nouveau contenu est renvoyé dans le corps de la réponse de connexion afin que la SPA puisse l'utiliser pour les requêtes suivantes (cf. 6.4).

#### Cookie et déconnexion

`AuthController::deconnexion()` enchaîne trois opérations dans l'ordre attendu par la documentation PHP : vidage explicite de `$_SESSION = array()`, suppression du cookie côté client via `setcookie()` daté dans le passé avec les paramètres retournés par `session_get_cookie_params()`, puis appel à `session_destroy()` pour effacer le fichier serveur. Sans la deuxième étape, le navigateur conserverait le cookie `PHPSESSID` jusqu'à sa péremption naturelle et un rechargement de page pourrait ouvrir une nouvelle session vide attribuée au même identifiant côté serveur si le fichier n'avait pas été supprimé.

Côté SPA, `Session.deconnexion()` (dans `src/public/js/session.js`) déclenche `POST /api/auth/deconnexion` puis recharge la page. Le rechargement repart d'une session PHP vierge avec un nouveau jeton CSRF, et la garde de démarrage (cf. 6.5) verra qu'aucun utilisateur n'est connecté et présentera la page de connexion.

### 6.2 Hachage BCRYPT

#### Principe

Aucun mot de passe n'est jamais stocké en clair. À l'inscription, `AuthController::inscription()` calcule `password_hash($mot_de_passe, PASSWORD_BCRYPT)` et c'est uniquement ce hachage que `UtilisateurRepository::creer()` envoie à la table `utilisateurs`. À la connexion, `password_verify($mot_de_passe, $utilisateur->getMotDePasse())` compare le mot de passe saisi au hachage stocké sans avoir besoin de le déchiffrer (puisque BCRYPT, par construction, n'est pas réversible).

#### Algorithme, coût et salage

BCRYPT est dérivé de l'algorithme Blowfish et a été conçu pour être volontairement lent. Chaque vérification consomme un budget calculatoire fixé par un paramètre de coût (par défaut 10 dans PHP, ce qui correspond à 2^10 = 1024 itérations internes). Ce coût rend les attaques par force brute hors-ligne extrêmement coûteuses : si un attaquant met la main sur le contenu de la table `utilisateurs`, il devra dépenser des centaines de millisecondes par essai et par mot de passe, contre quelques microsecondes pour MD5 ou SHA-1.

Le sel est généré automatiquement par `password_hash()` à chaque appel : il n'est pas fixe au sein du projet, il est unique par utilisateur. Le hachage produit (60 caractères pour BCRYPT) contient à la fois l'identifiant d'algorithme, le coût, le sel et le hachage final, ce qui permet à `password_verify()` de tout retrouver sans configuration supplémentaire. La colonne `mot_de_passe` est définie `VARCHAR(255)` dans `src/sql/install.php` pour absorber sans contrainte la longueur réelle et d'éventuelles évolutions futures du format (PHP autorise en théorie de migrer vers `PASSWORD_DEFAULT` plus tard sans changer le schéma).

#### Choix par rapport à MD5 / SHA-1

MD5 et SHA-1 sont des fonctions de hachage non salées et conçues pour être rapides. Elles sont aujourd'hui considérées comme inadaptées au stockage de mots de passe : les rainbow tables et le calcul GPU permettent d'inverser des hachages courts en quelques minutes. BCRYPT, salé et coûteux, est l'état de l'art recommandé par les corpus de bonnes pratiques de l'OWASP, ce qui justifie son adoption malgré le fait qu'il ne soit pas explicitement enseigné dans le cours (auto-formation explicitement permise par le sujet TER, qui cite nommément `password_hash` comme attendu).

### 6.3 Validation client et serveur

#### Principe de la double validation

Toute donnée saisie par l'utilisateur est validée deux fois : une première fois côté client par `src/public/js/auth.js` pour le confort utilisateur (retour visuel immédiat), une seconde fois côté serveur par `AuthController::valider_inscription()` pour la sécurité. La validation client est conviviale mais ne fait jamais autorité : un client malveillant peut désactiver le JavaScript ou forger une requête `cURL`. Seule la validation serveur protège la base.

#### Matrice des règles

| Champ | Règle | Côté client (`auth.js`) | Côté serveur (`AuthController`) |
|---|---|---|---|
| Email | Format `login@domaine.extension`, ≤ 150 caractères | `REGEX_EMAIL.test(valeur)` et `valeur.length > 150` | `preg_match('/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/', $email)` et `strlen($email) > 150` |
| Email | Unicité en base | (non testable côté client) | `chercher_par_email($email)` + contrainte SQL `UNIQUE` → 409 Conflict |
| Mot de passe | ≥ 6 caractères | `valeur.length < 6` | `strlen($mot_de_passe) < 6` |
| Mot de passe | Double saisie identique | `valeur !== valeur_mdp` | (confirmation seulement côté client, non transmise au serveur) |
| Date de naissance | Format `AAAAMMJJ` strict | `REGEX_DATE_AAAAMMJJ.test(valeur)` | `preg_match('/^[0-9]{8}$/', $date)` + `checkdate($mois, $jour, $annee)` |
| Nom / prénom | Non vide, ≤ 100 caractères | `valeur.length > 100` | `strlen($nom) > 100` |

Les expressions régulières d'email et de date sont identiques au caractère près des deux côtés : c'est volontaire, pour qu'un message d'erreur cohérent puisse s'afficher quelle que soit la source. La validation serveur va légèrement au-delà du client pour la date (`checkdate` filtre les dates impossibles comme `19999999` ou `20210230`) et pour l'unicité de l'email (impossible à tester sans interroger la base).

#### Pattern d'affichage des erreurs (rouge dynamique)

L'expérience utilisateur attendue est imposée par le sujet et reprise dans `CLAUDE.md` section 6. Le code distingue deux événements pour offrir un retour pertinent sans rougir un champ qu'on est en train de remplir :

- au **blur** d'un champ (sortie de la zone de saisie), les fonctions `valider_et_afficher_champ_login()` et `valider_et_afficher_champ_register()` recalculent la règle de ce champ ; si le contenu est invalide, le champ reçoit la classe `.champ-invalide` (fond rouge clair, bordure rouge, texte rouge — règles posées dans `src/public/css/components.css`) et un message d'erreur explicatif est affiché juste sous le champ via la balise `.message-erreur` ;
- au **keyup** (pendant la frappe), les fonctions `nettoyer_champ_login()` et `nettoyer_champ_register()` ne font que **lever** l'erreur si le champ devient valide ; elles n'en ajoutent jamais. Ce choix évite qu'un email rougisse pendant la saisie, ce qui serait visuellement agressif et imprécis (une chaîne intermédiaire comme `jean@` n'est pas encore un email valide mais elle est en cours de saisie) ;
- avant l'envoi, `valider_login_complet()` ou `valider_register_complet()` revalide tous les champs et alimente une balise `.recap-erreurs` en bas du formulaire qui liste toutes les erreurs en cours via une `<ul>` ;
- tant qu'une erreur est visible, `soumettre_login()` ou `soumettre_register()` interrompt l'envoi via `evenement.preventDefault()` ; le bouton n'est pas désactivé visuellement, mais aucune requête AJAX ne part.

Si la validation détecte des erreurs côté serveur malgré la validation client (cas d'un client forgé ou d'une règle uniquement testable en base, comme l'unicité de l'email), `AuthController::inscription()` répond `400 Bad Request` avec une carte `erreurs` champ-par-champ que `auth.js` réinjecte directement dans le même mécanisme d'affichage via `rafraichir_affichage_erreurs_register(xhr.responseJSON.erreurs)`. Le pattern visuel est donc identique que l'erreur vienne du navigateur ou du serveur — c'est ce qui rend la double validation transparente pour l'utilisateur final.

### 6.4 Contrôle d'accès, middleware et CSRF

#### Middleware d'authentification côté serveur

Le contrôle d'accès aux endpoints protégés est centralisé dans `BaseController::verifier_authentifie()`. Cette méthode lit `$_SESSION['id_user']` et, si la clé est absente, court-circuite l'action en répondant immédiatement `401 Unauthorized` via `Response::json()`. Le contrôleur appelant n'a qu'à invoquer cette méthode en première ligne de son action ; le reste du code ne s'exécute que si l'utilisateur est bien connecté, et la méthode renvoie l'`id_user` pour les opérations subséquentes (typiquement pour vérifier que l'utilisateur est propriétaire d'une ressource demandée). C'est utilisé dans `AuthController::moi()` pour la sonde de session ; les contrôleurs des autres ressources (paquets, questions, partages) feront de même.

Côté front, `AjaxService::intercepter_401()` (cf. `src/public/js/ajax.js`, BACK-2.5) détecte tout retour `401` provenant de l'API et bascule la SPA sur la route `#login` sans laisser l'écran de l'utilisateur dans un état incohérent. La déconnexion d'une session expirée se fait donc sans rechargement de page et sans intervention explicite des contrôleurs front.

#### Jeton anti-CSRF

Les sessions PHP, étant adossées à un cookie envoyé automatiquement par le navigateur sur chaque requête, sont vulnérables aux requêtes inter-sites (Cross-Site Request Forgery). Un site tiers visité par un utilisateur connecté peut déclencher une requête `POST /api/auth/deconnexion` à son insu : le cookie de session partira avec, et la requête serait traitée comme légitime sans protection complémentaire.

La classe `src/core/Csrf.php` est composée de méthodes statiques (pas un Singleton, pour ne pas dépasser les trois patrons retenus par le projet). Elle expose :

- `generer_si_absent()` : appelée par le front-controller juste après `session_start()`, elle pose un jeton aléatoire de 256 bits dans `$_SESSION['csrf_token']` lors de la première requête de l'utilisateur. Le jeton est produit par `random_bytes(32)` (cryptographiquement sûr) puis encodé en hexadécimal via `bin2hex` (64 caractères, transportables en en-tête HTTP) ;
- `regenerer()` : appelée par `AuthController::connexion()` après le `session_regenerate_id`. Sans cela, un jeton capturé sur la page de connexion resterait valide une fois l'utilisateur authentifié, ce qui annulerait la précaution prise contre la fixation de session ;
- `obtenir()` : utilisée par la coquille `app.php` pour exposer le jeton via la balise `<meta name="csrf-token">` ;
- `verifier_requete()` : appelée en tête de chaque action sensible de `AuthController` (`inscription`, `connexion`, `deconnexion`). Elle lit l'en-tête `X-CSRF-Token`, le compare au jeton stocké en session via `hash_equals()` (comparaison à temps constant pour éviter les attaques par mesure de temps), et répond `403 Forbidden` en cas d'absence ou de désaccord.

Le wrapper `AjaxService.envoyer()` lit la balise `<meta name="csrf-token">` à chaque requête et pose systématiquement l'en-tête `X-CSRF-Token`. Toute requête forgée par un site tiers échouera puisque la politique d'origine du navigateur l'empêchera de lire la balise du domaine FlashCards.

#### Synchronisation du jeton après connexion

Comme la SPA ne recharge pas la page après une connexion réussie, la balise `<meta>` contient encore l'ancien jeton, devenu invalide depuis la régénération côté serveur. Pour éviter que la première requête mutante post-connexion ne soit rejetée en 403, `AuthController::connexion()` renvoie le nouveau jeton dans le champ `csrf_token` de sa réponse, et `auth.js` met à jour la balise via :

```js
if (reponse && typeof reponse.csrf_token === "string") {
    $("meta[name='csrf-token']").attr("content", reponse.csrf_token);
}
```

Cette étape est invisible pour l'utilisateur mais nécessaire pour la cohérence des requêtes suivantes.

#### Combinaison avec la déconnexion

À la déconnexion, `Csrf::verifier_requete()` est tout de même exigé : un attaquant ne doit pas pouvoir déconnecter l'utilisateur via CSRF, même si l'opération est apparemment bénigne (la nuisance d'utilisabilité serait réelle). La séquence côté serveur est donc : vérifier CSRF → vider `$_SESSION` → supprimer le cookie → détruire la session → répondre 200. La séquence côté SPA est : envoyer la requête via `AjaxService` (qui pose le jeton CSRF automatiquement) → recevoir le 200 → recharger la page pour repartir sur une session PHP vierge.

### 6.5 Garde de navigation et hydratation du chrome côté SPA

Le contrôle d'accès n'est complet que si le client lui-même refuse d'afficher les écrans protégés à un visiteur non authentifié. Le module `src/public/js/session.js` joue ce rôle pour la SPA.

#### Sonde de démarrage

Au chargement de la page (DOM ready, dans `app.js`), avant que le router ne démarre, `Session.demarrer(callback)` interroge `GET /api/auth/moi` pour déterminer si la session serveur correspond à un utilisateur connecté. Cette sonde utilise volontairement `$.ajax` brut et non `AjaxService` : ici, un retour `401` n'est pas une anomalie mais le cas nominal d'un visiteur non connecté. Si l'on passait par `AjaxService`, la redirection automatique sur 401 (cf. 6.4) entrerait en conflit avec la logique de garde, et l'on perdrait le contrôle du parcours.

Le callback reçoit `(est_connecte, utilisateur)` et `app.js` prend alors quatre décisions selon le couple (état authentifié, route demandée) :

| Authentifié ? | Route demandée | Action |
|---|---|---|
| oui | `#login` ou `#register` | redirection vers `#dashboard` |
| oui | autre | hydratation du chrome (cf. ci-dessous) puis affichage |
| non | `#login` ou `#register` | affichage normal |
| non | autre | redirection vers `#login` |

Cette logique est dupliquée sur l'événement `hashchange` (via `Session.utilisateur()`) pour qu'un utilisateur déjà non connecté qui taperait `#dashboard` dans la barre d'adresse en cours de session soit redirigé vers `#login` immédiatement, sans attendre qu'une requête API échoue.

#### Hydratation du bandeau utilisateur

Une fois l'utilisateur identifié, `Session.afficher_utilisateur(u)` remplace les libellés stub du bandeau de la sidebar (`#chip-nom`, `#chip-initiales`) et celui du topbar (`#topbar-initiales`) par les vraies valeurs issues de la BD. Les initiales sont calculées par `calculer_initiales(prenom, nom)` qui prend la première lettre de chacun. Les libellés sont injectés via `.text()` et non `.html()`, ce qui neutralise tout risque d'injection XSS au cas où un nom ou un prénom contiendrait des caractères HTML.

Après une connexion réussie depuis `#login`, la SPA n'étant pas rechargée, le garde de démarrage n'est pas rejoué : `auth.js` mémorise donc explicitement l'utilisateur via `Session.connecter(reponse.utilisateur)`, qui à son tour appelle `afficher_utilisateur()`. C'est cohérent avec la synchronisation du jeton CSRF (cf. 6.4) qui se passe à la même étape : tout ce que la SPA devrait apprendre via un rechargement est transmis par la réponse de connexion et appliqué manuellement.

#### Présentation des pages d'authentification

Les pages `#login` et `#register` sont les seules accessibles sans authentification. Pour les présenter en plein cadre (sans la sidebar et le topbar qui n'auraient aucun sens), `appliquer_mode_auth(hash)` ajoute la classe `.app-mode-auth` sur la racine `#app` lorsque le hash correspond à une route d'authentification (détectée par `route_authentification(hash)`). Les règles CSS associées (dans `src/public/css/layout.css`) masquent la sidebar et le topbar dans ce mode. Le passage entre `#login` et `#register` ne provoque pas de saute visuelle puisque le mode reste actif.

---

*Ce qui n'est volontairement pas dans le périmètre de cette section :*

- *Le contrôle d'accès aux ressources métier (paquets, questions, partages) qui suit la même logique de middleware mais ajoute une vérification de propriété (`id_proprietaire === $_SESSION['id_user']`). Cette logique sera documentée dans la section dédiée aux contrôleurs métier lorsque ceux-ci seront implémentés.*
