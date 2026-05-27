# Diagrammes de sequence (DOC-ARCH.4)

Cette section decrit les flux dynamiques principaux de l'application sous
forme de diagrammes de sequence UML 2. Trois scenarios sont documentes :
la **connexion** d'un utilisateur, le **partage** d'un paquet, et une
**session de revision** Anki. Le diagramme de reference se trouve dans
`project-files/sequence_diagram.jpeg`.

> References d'implementation : `src/controllers/AuthController.php`,
> `src/controllers/PaquetController.php`, `src/public/js/auth.js`,
> `src/public/js/study.js`, `src/public/js/share-modal.js`.

---

## 1. Sequence : connexion d'un utilisateur

Ce scenario couvre le flux `POST /api/auth/connexion` depuis la saisie du
formulaire jusqu'a l'affichage du tableau de bord.

**Acteurs** : Utilisateur, Interface JS/jQuery, Controleur PHP
(`AuthController`), Base SQLite.

```
Utilisateur          Interface JS         AuthController         SQLite
    |                     |                     |                    |
    |-- saisit email+mdp ->|                     |                    |
    |                     |-- valide les champs  |                    |
    |                     |   (regex email,      |                    |
    |                     |    mdp non vide)     |                    |
    |                     |                     |                    |
    |                     |-- POST /api/auth/connexion (AJAX) ------->|
    |                     |   { email, mot_de_passe,                  |
    |                     |     X-CSRF-Token: <token> }               |
    |                     |                     |                    |
    |                     |          Csrf::verifier_requete()         |
    |                     |          (compare header vs session)      |
    |                     |                     |                    |
    |                     |          chercher_par_email($email) ----->|
    |                     |                     |<-- ligne SQL ou null|
    |                     |                     |                    |
    |                     |          password_verify($mdp, $hash)    |
    |                     |          [si KO -> 401 "Identifiants     |
    |                     |                    invalides"]            |
    |                     |                     |                    |
    |                     |          session_regenerate_id(true)      |
    |                     |          $_SESSION['id_user'] = $id      |
    |                     |          Csrf::regenerer()               |
    |                     |                     |                    |
    |<-- JSON 200 { utilisateur, csrf_token } --|                    |
    |                     |                     |                    |
    |                     |-- met a jour le jeton CSRF (<meta>)      |
    |                     |-- Router.naviguer("#dashboard")          |
    |<-- affiche dashboard|                     |                    |
```

**Points cles de securite** :

- Le jeton CSRF est verifie **avant** tout acces a la base de donnees. Un
  appel sans jeton valide recoit 403 et ne va pas plus loin.
- En cas d'echec (email inconnu ou mot de passe incorrect), la reponse 401
  utilise toujours le meme message generique "Identifiants invalides" pour ne
  pas indiquer quel champ est faux.
- `session_regenerate_id(true)` est appele **apres** la verification du mot de
  passe et **avant** de poser `$_SESSION['id_user']`. Cela empeche les
  attaques de fixation de session.
- Le nouveau jeton CSRF est renvoye dans la reponse JSON parce que la SPA ne
  recharge pas la page : sans ce renvoi, les requetes suivantes utiliseraient
  l'ancien jeton, desormais invalide, et seraient rejetees en 403.

---

## 2. Sequence : partage d'un paquet

Ce scenario couvre le flux depuis l'ouverture de la modale de partage jusqu'a
la confirmation de partage. Il correspond a la Phase 2 du diagramme de
sequence fourni dans `project-files/sequence_diagram.jpeg`.

**Acteurs** : Utilisateur, Interface JS/jQuery, Controleur PHP
(`PaquetController`), Base SQLite.

```
Utilisateur          Interface JS         PaquetController       SQLite
    |                     |                     |                    |
    |-- clique "Partager" |                     |                    |
    |   sur un paquet     |                     |                    |
    |                     |-- GET /api/users/search?q=<saisie> ----->|
    |                     |   (auto-completion)  |                    |
    |                     |<-- JSON [{ email, nom, prenom }]         |
    |                     |   (liste utilisateurs correspondants)    |
    |                     |                     |                    |
    |-- selectionne un    |                     |                    |
    |   destinataire      |                     |                    |
    |                     |                     |                    |
    |-- clique "Partager" |                     |                    |
    |                     |-- POST /api/paquets/:id/share (AJAX) --->|
    |                     |   { id_destinataire,                     |
    |                     |     X-CSRF-Token: <token> }              |
    |                     |                     |                    |
    |                     |          Csrf::verifier_requete()        |
    |                     |          verifier_authentifie()          |
    |                     |                     |                    |
    |                     |          trouver_par_id($id_paquet) ---->|
    |                     |          [si absent -> 404]              |
    |                     |                     |                    |
    |                     |          [proprietaire ? sinon -> 403]   |
    |                     |                     |                    |
    |                     |          trouver_par_id($id_dest) ------>|
    |                     |          [si absent -> 404]              |
    |                     |                     |                    |
    |                     |          [dest == proprietaire -> 400]   |
    |                     |                     |                    |
    |                     |          existe($id_paquet, $id_dest) -->|
    |                     |          [si deja partage -> 409]        |
    |                     |                     |                    |
    |                     |          ajouter($id_paquet, $id_dest) ->|
    |                     |          INSERT INTO partages ...        |
    |                     |<-- JSON 201 { message, destinataire }    |
    |                     |                     |                    |
    |<-- notification     |                     |                    |
    |   "Partage reussi"  |                     |                    |
```

**Points cles** :

- L'auto-completion (`GET /api/users/search`) est une requete GET sans
  modification de donnees : elle ne necessite pas de jeton CSRF.
- Le controleur verifie dans l'ordre : CSRF, authentification, existence du
  paquet, appartenance au proprietaire, existence du destinataire, non
  auto-partage, absence de doublon. Chaque verification echoue avec un code
  HTTP distinct (400, 403, 404, 409), ce qui permet au front d'afficher un
  message cible.
- `last_score` et `best_score` du paquet ne sont pas transmis au destinataire :
  le partage donne acces au **contenu** (questions/reponses), pas a la
  progression personnelle du proprietaire.

---

## 3. Sequence : session de revision (mode Anki)

Ce scenario couvre le flux depuis le demarrage d'une session de revision
jusqu'a l'enregistrement du score final.

**Acteurs** : Utilisateur, Interface JS/jQuery (`study.js`), Controleur PHP
(`PaquetController`), Base SQLite.

```
Utilisateur          Interface JS         PaquetController       SQLite
    |                     |                     |                    |
    |-- clique "Reviser"  |                     |                    |
    |   sur un paquet     |                     |                    |
    |                     |-- GET /api/paquets/:id/study (AJAX) ---->|
    |                     |                     |                    |
    |                     |          verifier_authentifie()          |
    |                     |          trouver_par_id($id_paquet) ---->|
    |                     |          [si absent -> 404]              |
    |                     |                     |                    |
    |                     |          [proprietaire OU destinataire ? |
    |                     |           sinon -> 403]                  |
    |                     |                     |                    |
    |                     |          trouver_par_paquet($id) ------->|
    |                     |          (toutes les questions)          |
    |                     |<-- JSON 200 { paquet, questions[],       |
    |                     |              est_proprietaire }          |
    |                     |                     |                    |
    |<-- affiche carte 1  |                     |                    |
    |   (recto : question)|                     |                    |
    |                     |                     |                    |
    | [boucle pour chaque carte]                |                    |
    |-- clique "Retourner"|                     |                    |
    |<-- affiche recto +  |                     |                    |
    |   verso (reponse)   |                     |                    |
    |   + boutons         |                     |                    |
    |   Check / Bad       |                     |                    |
    |                     |                     |                    |
    |-- clique Check ou   |                     |                    |
    |   Bad               |                     |                    |
    |                     |-- incremente score  |                    |
    |                     |   local (JS)        |                    |
    |                     |-- affiche carte     |                    |
    |                     |   suivante          |                    |
    | [fin de boucle]                           |                    |
    |                     |                     |                    |
    |<-- affiche ecran    |                     |                    |
    |   fin de session    |                     |                    |
    |   (score calcule)   |                     |                    |
    |                     |                     |                    |
    | [si est_proprietaire == true seulement]   |                    |
    |                     |-- POST /api/paquets/:id/score (AJAX) --->|
    |                     |   { score: N,                            |
    |                     |     X-CSRF-Token: <token> }              |
    |                     |                     |                    |
    |                     |          Csrf::verifier_requete()        |
    |                     |          verifier_authentifie()          |
    |                     |          [proprietaire ? sinon -> 403]   |
    |                     |                     |                    |
    |                     |          last_score = score              |
    |                     |          best_score = max(best, score)-->|
    |                     |          UPDATE paquets SET ...          |
    |                     |<-- JSON 200 { paquet mis a jour }        |
    |                     |                     |                    |
    |<-- affiche scores   |                     |                    |
    |   last/best mis     |                     |                    |
    |   a jour            |                     |                    |
```

**Points cles** :

- Le chargement (`GET /api/paquets/:id/study`) ne necessite pas de jeton CSRF
  car c'est une lecture (methode GET).
- Le flag `est_proprietaire` est renvoye dans la reponse de chargement. Le
  front (`study.js`) n'appelle `POST /api/paquets/:id/score` que si ce flag
  est `true`. Le serveur verifie **independamment** que l'appelant est bien le
  proprietaire (double protection : front et back).
- Le score est calcule **entierement cote client** pendant la session (comptage
  des "Check" / total). Seul le resultat final est envoye au serveur une seule
  fois, en fin de session, pour minimiser les allers-retours reseau.
- `best_score` ne diminue jamais : `UPDATE ... SET best_score = max(best_score,
  ?)` garantit que seul un meilleur score ecrase l'ancien.
- Un destinataire qui revise un paquet partage ne peut pas modifier
  `last_score` ni `best_score` (refus 403 cote serveur). La progression reste
  strictement personnelle au proprietaire.

---

## 4. Recapitulatif des sequences

| Scenario | Endpoint principal | Auth requise | CSRF requis | Acteur principal |
|---|---|---|---|---|
| Connexion | `POST /api/auth/connexion` | Non (pas encore connecte) | Oui | `AuthController` |
| Partage | `POST /api/paquets/:id/share` | Oui | Oui | `PaquetController` |
| Revision - chargement | `GET /api/paquets/:id/study` | Oui | Non (GET) | `PaquetController` |
| Revision - score | `POST /api/paquets/:id/score` | Oui (proprietaire) | Oui | `PaquetController` |

Les trois scenarios illustrent comment les couches MVC cooperent a chaque
requete : la **Vue** (jQuery) initie un appel AJAX, le **Controleur** (PHP)
orchestre la validation et la logique metier, le **Modele** (Repository +
entite) persiste ou recupere les donnees via le Singleton PDO.
