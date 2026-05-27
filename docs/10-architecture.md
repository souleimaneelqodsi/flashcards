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
