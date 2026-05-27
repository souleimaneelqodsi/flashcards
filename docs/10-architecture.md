# Architecture logicielle (DOC-ARCH.1)

Justification du choix d'architecture : un MVC côté serveur exposant une API
JSON, consomme par une SPA (Single Page Application) jQuery côté client.

> référence d'implémentation : `src/public/index.php` (front-controller),
> `src/core/Router.php`, `src/controllers/`, `src/models/`,
> `src/repositories/`. Diagramme : `project-files/component_diagram.jpeg`.
> Patrons detailles dans [11-patrons.md](11-patrons.md), flux dynamiques dans
> [12-diagrammes-sequence.md](12-diagrammes-sequence.md).

---

## 1. Le patron MVC

Le **modèle-Vue-Controleur** sépare une application en trois responsabilités
distinctes, ce qui evite de melanger l'affichage, la logique de traitement et
l'accès aux donnees dans les mêmes fichiers :

- **modèle** : les donnees metier et les règles qui les gouvernent. Dans le
  projet, ce sont les entités (`src/models/`) et les repositories qui les
  persistent (`src/repositories/`).
- **Vue** : ce que voit l'utilisateur. Ici, la coquille HTML
  (`src/views/app.php`) et tout le rendu dynamique jQuery (`src/public/js/`,
  `src/public/css/`).
- **Controleur** : le chef d'orchestre. Il reçoit la requête, valide les
  donnees, appelle le modèle et choisit la réponse. Ce sont les classes de
  `src/controllers/` (`AuthController`, `PaquetController`, etc.).

Le sujet TER impose explicitement une architecture MVC ; le choix n'est donc
pas discute, mais sa **mise en oeuvre** doit etre justifiee, surtout dans un
contexte SPA ou la frontiere Vue / Controleur se decale.

## 2. Repartition des trois couches dans le code

| Couche | rôle | Fichiers du projet |
|---|---|---|
| **Vue** | Affichage, navigation client, validation client | `src/views/app.php`, `src/public/js/*.js`, `src/public/css/*.css` |
| **Controleur** | Reception AJAX, validation serveur, orchestration, réponse JSON | `src/controllers/*.php`, routage par `src/core/Router.php` |
| **modèle** | entités metier + accès aux donnees | `src/models/*.php`, `src/repositories/*.php`, connexion `src/core/DB.php` |

Le découpage est strict : un controleur ne généré jamais de HTML et ne touche
jamais a PDO ; une vue ne contient aucune requête SQL ; un repository ne sait
rien du protocole HTTP. Cette séparation est ce qui rend chaque couche
testable et remplacable indépendamment.

## 3. MVC en mode SPA : ou se trouve la frontiere Vue / Controleur

Dans un MVC classique (PHP qui généré des pages complètes a chaque clic), la
Vue est produite par le serveur. Le projet est une **SPA** : la page n'est
chargee qu'une fois, puis jQuery met a jour le DOM sans rechargement. La Vue
est donc **entierement côté client** ; le serveur ne renvoie plus du HTML mais
du **JSON**.

Concretement, le front-controller `src/public/index.php` distingue deux types
de requêtes :

```php
$prefixe_api = '/api/';
$est_appel_api = (substr($chemin, 0, strlen($prefixe_api)) === $prefixe_api);

if ($est_appel_api) {
    // ... dispatch vers un controleur, reponse JSON ...
    $routeur->dispatcher($methode, $chemin);
    exit;
}

// Requete classique : on sert la coquille HTML de la SPA.
require __DIR__ . '/../views/app.php';
```

- une URL `/api/...` est routee vers un **controleur** qui répond en JSON ;
- toute autre URL renvoie une seule fois la **coquille HTML** (`app.php`), qui
  charge ensuite jQuery et prend la main côté client.

La navigation entre écrans est geree côté client par `src/public/js/router.js`
(ecoute de `window.location.hash`, sans rechargement de page). Le serveur
reste un fournisseur de donnees : la couche Controleur du MVC devient une
**API JSON**, et la couche Vue migre dans le navigateur.

## 4. Comparaison MVC / MVP / MVVM

Le cours (chapitre 8) demande de situer MVC parmi ses variantes. Les trois
patrons partagent le même objectif (séparer affichage et logique) mais
different par la façon dont la Vue et le reste communiquent.

| Patron | Intermediaire | Liaison Vue <-> donnees | Adapte a... |
|---|---|---|---|
| **MVC** | Controleur | La Vue lit le modèle, le Controleur agit dessus | Applications web requête/réponse |
| **MVP** | présenter | La Vue est passive, le présenter la pilote entierement | Interfaces a logique de présentation lourde (desktop, Android historique) |
| **MVVM** | ViewModel | Liaison de donnees **bidirectionnelle** automatique (data binding) | Frameworks a binding intègre (WPF, Angular, Vue.js) |

**Pourquoi pas MVVM ?** Le MVVM repose sur un mecanisme de *data binding*
bidirectionnel fourni par un framework (Angular, Vue.js). Or la stack imposee
(CLAUDE.md section 2) exclut tout framework de ce type : avec jQuery seul, il
faudrait reimplementer un moteur de binding a la main, ce qui serait du code
complexe et hors périmètre du cours.

**Pourquoi pas MVP ?** Le MVP vise des interfaces a état riche ou la Vue est
totalement passive et pilotee par un présenter. Le supplement de structure
(un présenter par vue, contrats d'interface) n'apporte rien sur une
application web a echanges requête/réponse comme celle-ci, et alourdirait le
code sans benefice.

**Pourquoi MVC ?** Le modèle requête/réponse du Web s'aligne naturellement sur
MVC : une requête HTTP arrive, un controleur la traite, une réponse repart.
Le découpage est simple a expliquer, correspond a la structure de fichiers du
projet, et reste lisible par un étudiant de M1 (CLAUDE.md section 7 bis). C'est
aussi l'architecture explicitement attendue par le sujet.

## 5. Benefices concrets de ce découpage dans le projet

- **sécurité centralisee** : la vérification d'authentification
  (`BaseController::verifier_authentifie`) et le contrôle CSRF
  (`Csrf::verifier_requete`) vivent dans la couche Controleur, en premiere
  ligne de chaque action. Aucune vue ne peut les contourner puisque la Vue
  n'a pas d'accès direct aux donnees.
- **accès aux donnees isole** : tout le SQL est confine dans les repositories
  (patron Repository, [11-patrons.md](11-patrons.md)). Changer de SGBD ou
  corriger une requête ne touche qu'une couche.
- **Front indépendant** : la Vue ne dialogue avec le serveur que via des URL
  `/api/...` renvoyant du JSON. Le front pourrait etre remplace (autre client)
  sans modifier le serveur, et inversement.
- **Travail en binome facilite** : un developpeur peut travailler sur un
  controleur pendant qu'un autre travaille sur une vue, car le contrat entre
  les deux est l'API JSON, stable et documentee.

---

## 6. Diagramme de composants (DOC-ARCH.2)

Le diagramme de composants (`project-files/component_diagram.jpeg`) traduit
en UML 2 la repartition des responsabilités decrite ci-dessus. Il montre
quatre blocs distincts relies par des interfaces fournies / requises.

### 6.1 Description des composants

**Frontend — SPA Client Riche**

Le composant `Vues Dynamiques` produit l'interface HTML/CSS visible par
l'utilisateur. Il contient les templates des écrans (tableau de bord, création
de paquet, mode révision, etc.) et le rendu dynamique assure par jQuery.

Le composant `Routeur jQuery` gere la navigation côté client : il ecoute les
changements de `window.location.hash` et affiche ou masque les sections
correspondantes sans recharger la page (`src/public/js/router.js`). Il est
aussi responsable d'initier les appels AJAX vers l'API.

Le composant `Session Client` maintient l'état local de la session (identite
de l'utilisateur connecte, jeton CSRF actif) pour eviter de redemander ces
informations a chaque action.

Ces trois composants forment la **couche Vue** du MVC.

**Backend — Serveur PHP**

Le composant `Controleurs API` regroupe les quatre controleurs PHP
(`AuthController`, `PaquetController`, `UtilisateurController`,
`QuestionController`) et le routeur serveur (`Router.php`). Il reçoit les
requêtes AJAX du front, vérifié l'authentification et le jeton CSRF, valide
les donnees, puis delegue la persistance a la couche en dessous.

Le composant `Couche Persistance` est constitue des cinq repositories
(`UtilisateurRepository`, `PaquetRepository`, `QuestionRepository`,
`PartageRepository`, `DifficulteRepository`) et des cinq entités metier
(`Utilisateur`, `Paquet`, `Question`, `Difficulte`, `Partage`). Les
repositories sont les seuls composants autorises a écrire du SQL.

Ces deux composants forment la **couche Controleur et la couche modèle** du
MVC côté serveur.

**DB Singleton (PDO)**

Le composant `DB Singleton` (`src/core/DB.php`) isole la connexion SQLite dans
une instance unique. Tous les repositories obtiennent la même connexion PDO
via `DB::getInstance()` au lieu d'en créer chacun une nouvelle. C'est
l'implémentation du patron Singleton (cf. [11-patrons.md](11-patrons.md)).

**Base SQLite**

La base de donnees est un fichier local (`src/data/flashcards.sqlite`). SQLite
est appropriate pour un projet universitaire mono-utilisateur en developpement
local : aucun serveur de base de donnees a installer, portabilite maximale.

### 6.2 Interfaces entre composants

| Interface | Nature | Direction |
|---|---|---|
| Frontend <-> Controleurs API | AJAX / JSON via HTTP | Bidirectionnelle requête/réponse |
| Controleurs API <-> Couche Persistance | Appels de méthodes PHP (objets) | Controleur appelle Repository |
| Couche Persistance <-> DB Singleton | Appels `DB::getInstance()->executer(...)` | Repository appelle Singleton |
| DB Singleton <-> Base SQLite | PDO (requêtes SQL preparees) | Singleton lit/écrit SQLite |

La communication entre Frontend et Backend est **exclusivement AJAX/JSON** :
le front ne connait pas le schéma SQL, le back ne connait pas le DOM. Ce
contrat est ce qui rend les deux cotes indépendants l'un de l'autre.

### 6.3 Ce que le diagramme n'exprime pas

Le diagramme de composants montre la **structure statique** (quelles briques
existent et comment elles s'assemblent). Il ne montre pas les flux dynamiques
(qui appelle qui dans quel ordre pour une opération donnee). Ces flux sont
documentes dans les diagrammes de sequence :
voir [12-diagrammes-sequence.md](12-diagrammes-sequence.md).
