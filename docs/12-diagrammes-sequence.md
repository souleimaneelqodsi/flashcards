# Diagrammes de sequence (DOC-ARCH.4)

Cette section decrit les flux dynamiques principaux de l'application sous
forme de diagrammes de sequence UML 2. Trois scenarios sont documentes :
la **connexion** d'un utilisateur, le **partage** d'un paquet, et une
**session de révision** Anki. Le diagramme de référence se trouve dans
`project-files/sequence_diagram.jpeg`.

> références d'implémentation : `src/controllers/AuthController.php`,
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

**Points cles de sécurité** :

- Le jeton CSRF est vérifié **avant** tout accès a la base de donnees. Un
  appel sans jeton valide reçoit 403 et ne va pas plus loin.
- En cas d'echec (email inconnu ou mot de passe incorrect), la réponse 401
  utilise toujours le même message generique "Identifiants invalides" pour ne
  pas indiquer quel champ est faux.
- `session_regenerate_id(true)` est appele **après** la vérification du mot de
  passe et **avant** de poser `$_SESSION['id_user']`. Cela empeche les
  attaques de fixation de session.
- Le nouveau jeton CSRF est renvoye dans la réponse JSON parce que la SPA ne
  recharge pas la page : sans ce renvoi, les requêtes suivantes utiliseraient
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

- L'auto-completion (`GET /api/users/search`) est une requête GET sans
  modification de donnees : elle ne nécessite pas de jeton CSRF.
- Le controleur vérifié dans l'ordre : CSRF, authentification, existence du
  paquet, appartenance au propriétaire, existence du destinataire, non
  auto-partage, absence de doublon. Chaque vérification échoué avec un code
  HTTP distinct (400, 403, 404, 409), ce qui permet au front d'afficher un
  message cible.
- `last_score` et `best_score` du paquet ne sont pas transmis au destinataire :
  le partage donne accès au **contenu** (questions/réponses), pas a la
  progression personnelle du propriétaire.

---

## 3. Sequence : session de révision (mode Anki)

Ce scenario couvre le flux depuis le démarrage d'une session de révision
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

- Le chargement (`GET /api/paquets/:id/study`) ne nécessite pas de jeton CSRF
  car c'est une lecture (méthode GET).
- Le flag `est_proprietaire` est renvoye dans la réponse de chargement. Le
  front (`study.js`) n'appelle `POST /api/paquets/:id/score` que si ce flag
  est `true`. Le serveur vérifié **indépendamment** que l'appelant est bien le
  propriétaire (double protection : front et back).
- Le score est calcule **entierement côté client** pendant la session (comptage
  des "Check" / total). Seul le résultat final est envoye au serveur une seule
  fois, en fin de session, pour minimiser les allers-retours reseau.
- `best_score` ne diminue jamais : `UPDATE ... SET best_score = max(best_score,
  ?)` garantit que seul un meilleur score ecrase l'ancien.
- Un destinataire qui revise un paquet partage ne peut pas modifier
  `last_score` ni `best_score` (refus 403 côté serveur). La progression reste
  strictement personnelle au propriétaire.

---

## 4. Recapitulatif des sequences

| Scenario | Endpoint principal | Auth requise | CSRF requis | Acteur principal |
|---|---|---|---|---|
| Connexion | `POST /api/auth/connexion` | Non (pas encore connecte) | Oui | `AuthController` |
| Partage | `POST /api/paquets/:id/share` | Oui | Oui | `PaquetController` |
| révision - chargement | `GET /api/paquets/:id/study` | Oui | Non (GET) | `PaquetController` |
| révision - score | `POST /api/paquets/:id/score` | Oui (propriétaire) | Oui | `PaquetController` |

Les trois scenarios illustrent comment les couches MVC cooperent a chaque
requête : la **Vue** (jQuery) initie un appel AJAX, le **Controleur** (PHP)
orchestre la validation et la logique metier, le **modèle** (Repository +
entité) persiste ou récupéré les donnees via le Singleton PDO.
