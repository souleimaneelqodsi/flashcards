# Architecture logicielle (DOC-ARCH.1)

Justification du choix d'architecture : un MVC cote serveur exposant une API
JSON, consomme par une SPA (Single Page Application) jQuery cote client.

> Reference d'implementation : `src/public/index.php` (front-controller),
> `src/core/Router.php`, `src/controllers/`, `src/models/`,
> `src/repositories/`. Diagramme : `project-files/component_diagram.jpeg`.
> Patrons detailles dans [11-patrons.md](11-patrons.md), flux dynamiques dans
> [12-diagrammes-sequence.md](12-diagrammes-sequence.md).

---

## 1. Le patron MVC

Le **Modele-Vue-Controleur** separe une application en trois responsabilites
distinctes, ce qui evite de melanger l'affichage, la logique de traitement et
l'acces aux donnees dans les memes fichiers :

- **Modele** : les donnees metier et les regles qui les gouvernent. Dans le
  projet, ce sont les entites (`src/models/`) et les repositories qui les
  persistent (`src/repositories/`).
- **Vue** : ce que voit l'utilisateur. Ici, la coquille HTML
  (`src/views/app.php`) et tout le rendu dynamique jQuery (`src/public/js/`,
  `src/public/css/`).
- **Controleur** : le chef d'orchestre. Il recoit la requete, valide les
  donnees, appelle le modele et choisit la reponse. Ce sont les classes de
  `src/controllers/` (`AuthController`, `PaquetController`, etc.).

Le sujet TER impose explicitement une architecture MVC ; le choix n'est donc
pas discute, mais sa **mise en oeuvre** doit etre justifiee, surtout dans un
contexte SPA ou la frontiere Vue / Controleur se decale.

## 2. Repartition des trois couches dans le code

| Couche | Role | Fichiers du projet |
|---|---|---|
| **Vue** | Affichage, navigation client, validation client | `src/views/app.php`, `src/public/js/*.js`, `src/public/css/*.css` |
| **Controleur** | Reception AJAX, validation serveur, orchestration, reponse JSON | `src/controllers/*.php`, routage par `src/core/Router.php` |
| **Modele** | Entites metier + acces aux donnees | `src/models/*.php`, `src/repositories/*.php`, connexion `src/core/DB.php` |

Le decoupage est strict : un controleur ne genere jamais de HTML et ne touche
jamais a PDO ; une vue ne contient aucune requete SQL ; un repository ne sait
rien du protocole HTTP. Cette separation est ce qui rend chaque couche
testable et remplacable independamment.

## 3. MVC en mode SPA : ou se trouve la frontiere Vue / Controleur

Dans un MVC classique (PHP qui genere des pages completes a chaque clic), la
Vue est produite par le serveur. Le projet est une **SPA** : la page n'est
chargee qu'une fois, puis jQuery met a jour le DOM sans rechargement. La Vue
est donc **entierement cote client** ; le serveur ne renvoie plus du HTML mais
du **JSON**.

Concretement, le front-controller `src/public/index.php` distingue deux types
de requetes :

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

- une URL `/api/...` est routee vers un **controleur** qui repond en JSON ;
- toute autre URL renvoie une seule fois la **coquille HTML** (`app.php`), qui
  charge ensuite jQuery et prend la main cote client.

La navigation entre ecrans est geree cote client par `src/public/js/router.js`
(ecoute de `window.location.hash`, sans rechargement de page). Le serveur
reste un fournisseur de donnees : la couche Controleur du MVC devient une
**API JSON**, et la couche Vue migre dans le navigateur.

## 4. Comparaison MVC / MVP / MVVM

Le cours (chapitre 8) demande de situer MVC parmi ses variantes. Les trois
patrons partagent le meme objectif (separer affichage et logique) mais
different par la facon dont la Vue et le reste communiquent.

| Patron | Intermediaire | Liaison Vue <-> donnees | Adapte a... |
|---|---|---|---|
| **MVC** | Controleur | La Vue lit le Modele, le Controleur agit dessus | Applications web requete/reponse |
| **MVP** | Presenter | La Vue est passive, le Presenter la pilote entierement | Interfaces a logique de presentation lourde (desktop, Android historique) |
| **MVVM** | ViewModel | Liaison de donnees **bidirectionnelle** automatique (data binding) | Frameworks a binding integre (WPF, Angular, Vue.js) |

**Pourquoi pas MVVM ?** Le MVVM repose sur un mecanisme de *data binding*
bidirectionnel fourni par un framework (Angular, Vue.js). Or la stack imposee
(CLAUDE.md section 2) exclut tout framework de ce type : avec jQuery seul, il
faudrait reimplementer un moteur de binding a la main, ce qui serait du code
complexe et hors perimetre du cours.

**Pourquoi pas MVP ?** Le MVP vise des interfaces a etat riche ou la Vue est
totalement passive et pilotee par un Presenter. Le supplement de structure
(un Presenter par vue, contrats d'interface) n'apporte rien sur une
application web a echanges requete/reponse comme celle-ci, et alourdirait le
code sans benefice.

**Pourquoi MVC ?** Le modele requete/reponse du Web s'aligne naturellement sur
MVC : une requete HTTP arrive, un controleur la traite, une reponse repart.
Le decoupage est simple a expliquer, correspond a la structure de fichiers du
projet, et reste lisible par un etudiant de M1 (CLAUDE.md section 7 bis). C'est
aussi l'architecture explicitement attendue par le sujet.

## 5. Benefices concrets de ce decoupage dans le projet

- **Securite centralisee** : la verification d'authentification
  (`BaseController::verifier_authentifie`) et le controle CSRF
  (`Csrf::verifier_requete`) vivent dans la couche Controleur, en premiere
  ligne de chaque action. Aucune vue ne peut les contourner puisque la Vue
  n'a pas d'acces direct aux donnees.
- **Acces aux donnees isole** : tout le SQL est confine dans les repositories
  (patron Repository, [11-patrons.md](11-patrons.md)). Changer de SGBD ou
  corriger une requete ne touche qu'une couche.
- **Front independant** : la Vue ne dialogue avec le serveur que via des URL
  `/api/...` renvoyant du JSON. Le front pourrait etre remplace (autre client)
  sans modifier le serveur, et inversement.
- **Travail en binome facilite** : un developpeur peut travailler sur un
  controleur pendant qu'un autre travaille sur une vue, car le contrat entre
  les deux est l'API JSON, stable et documentee.

---

## 6. Diagramme de composants (DOC-ARCH.2)

Le diagramme de composants (`project-files/component_diagram.jpeg`) traduit
en UML 2 la repartition des responsabilites decrite ci-dessus. Il montre
quatre blocs distincts relies par des interfaces fournies / requises.

### 6.1 Description des composants

**Frontend — SPA Client Riche**

Le composant `Vues Dynamiques` produit l'interface HTML/CSS visible par
l'utilisateur. Il contient les templates des ecrans (tableau de bord, creation
de paquet, mode revision, etc.) et le rendu dynamique assure par jQuery.

Le composant `Routeur jQuery` gere la navigation cote client : il ecoute les
changements de `window.location.hash` et affiche ou masque les sections
correspondantes sans recharger la page (`src/public/js/router.js`). Il est
aussi responsable d'initier les appels AJAX vers l'API.

Le composant `Session Client` maintient l'etat local de la session (identite
de l'utilisateur connecte, jeton CSRF actif) pour eviter de redemander ces
informations a chaque action.

Ces trois composants forment la **couche Vue** du MVC.

**Backend — Serveur PHP**

Le composant `Controleurs API` regroupe les quatre controleurs PHP
(`AuthController`, `PaquetController`, `UtilisateurController`,
`QuestionController`) et le routeur serveur (`Router.php`). Il recoit les
requetes AJAX du front, verifie l'authentification et le jeton CSRF, valide
les donnees, puis delegue la persistance a la couche en dessous.

Le composant `Couche Persistance` est constitue des cinq repositories
(`UtilisateurRepository`, `PaquetRepository`, `QuestionRepository`,
`PartageRepository`, `DifficulteRepository`) et des cinq entites metier
(`Utilisateur`, `Paquet`, `Question`, `Difficulte`, `Partage`). Les
repositories sont les seuls composants autorises a ecrire du SQL.

Ces deux composants forment la **couche Controleur et la couche Modele** du
MVC cote serveur.

**DB Singleton (PDO)**

Le composant `DB Singleton` (`src/core/DB.php`) isole la connexion SQLite dans
une instance unique. Tous les repositories obtiennent la meme connexion PDO
via `DB::getInstance()` au lieu d'en creer chacun une nouvelle. C'est
l'implementation du patron Singleton (cf. [11-patrons.md](11-patrons.md)).

**Base SQLite**

La base de donnees est un fichier local (`src/data/flashcards.sqlite`). SQLite
est appropriate pour un projet universitaire mono-utilisateur en developpement
local : aucun serveur de base de donnees a installer, portabilite maximale.

### 6.2 Interfaces entre composants

| Interface | Nature | Direction |
|---|---|---|
| Frontend <-> Controleurs API | AJAX / JSON via HTTP | Bidirectionnelle requete/reponse |
| Controleurs API <-> Couche Persistance | Appels de methodes PHP (objets) | Controleur appelle Repository |
| Couche Persistance <-> DB Singleton | Appels `DB::getInstance()->executer(...)` | Repository appelle Singleton |
| DB Singleton <-> Base SQLite | PDO (requetes SQL preparees) | Singleton lit/ecrit SQLite |

La communication entre Frontend et Backend est **exclusivement AJAX/JSON** :
le front ne connait pas le schema SQL, le back ne connait pas le DOM. Ce
contrat est ce qui rend les deux cotes independants l'un de l'autre.

### 6.3 Ce que le diagramme n'exprime pas

Le diagramme de composants montre la **structure statique** (quelles briques
existent et comment elles s'assemblent). Il ne montre pas les flux dynamiques
(qui appelle qui dans quel ordre pour une operation donnee). Ces flux sont
documentes dans les diagrammes de sequence :
voir [12-diagrammes-sequence.md](12-diagrammes-sequence.md).
