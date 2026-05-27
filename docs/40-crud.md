# CRUD paquets et questions

Cette section decrit l'implementation des deux ressources metier principales
de l'application : les **paquets** (un dossier de cartes appartenant a un
utilisateur) et les **questions** (les cartes elles-memes, contenant un
recto / un verso et un niveau de difficulte). Les deux ressources suivent
la meme architecture MVC + SPA decrite plus haut dans le rapport.

## 1. Vue d'ensemble

Un paquet est cree par un utilisateur, qui en est le **proprietaire** au
sens metier (`paquets.id_proprietaire`). Les questions appartiennent a un
paquet (`questions.id_paquet`). Les actions disponibles sur ces deux
ressources sont :

| Ressource | Lister | Voir un | Creer | Editer | Supprimer |
|---|---|---|---|---|---|
| Paquet    | GET `/api/paquets`           | GET `/api/paquets/:id`  | POST `/api/paquets`   | PUT `/api/paquets/:id`   | DELETE `/api/paquets/:id`   |
| Question  | GET `/api/paquets/:id/questions` | -                      | POST `/api/paquets/:id/questions` | PUT `/api/questions/:id` | DELETE `/api/questions/:id` |

Toutes ces routes sont enregistrees dans `src/public/index.php` et
delegues a `PaquetController` ou `QuestionController` selon la ressource.
Le routage SPA (`window.location.hash`) cote client est gere par
`src/public/js/router.js` et `app.js`.

## 2. Modele de donnees

Conforme au schema relationnel (cf. section 20) :

- **paquets** (`id_paquet`, `titre`, `theme`, `date_creation`,
  `last_score`, `best_score`, `id_proprietaire`).
- **questions** (`id_question`, `contenu_question`, `contenu_reponse`,
  `id_paquet`, `id_difficulte`).
- **difficultes** : table referentiel seedee a l'installation
  (`Facile`, `Moyen`, `Difficile`).

Les modeles PHP (`src/models/Paquet.php`, `src/models/Question.php`)
exposent deux **Factory Methods** chacun, conformement au patron Factory
retenu (cf. section 11) :

- `Paquet::creer($titre, $theme, $id_proprietaire)` : nouvelle entite
  depuis le formulaire de creation. `date_creation` est positionnee au
  jour courant, `last_score` et `best_score` a `null`.
- `Paquet::fromRow($ligne)` : reconstruction depuis une ligne SQL apres
  un `fetch`. Utilise par `PaquetRepository`.
- `Question::creer(...)` et `Question::fromRow(...)` : memes principes
  pour les questions.

## 3. Endpoints paquets

### 3.1 GET /api/paquets — liste des paquets de l'utilisateur

Renvoie tous les paquets dont l'utilisateur courant est proprietaire,
**tries par date de creation decroissante** (les plus recents en haut)
conformement a la maquette `dashboard.png`. Le tri est garanti par le
SQL `ORDER BY date_creation DESC` dans
`PaquetRepository::trouver_par_proprietaire` ; le controleur ne re-trie
pas (regle metier vivant dans le SQL).

Reponse : `200` + `{"paquets": [...]}`. Aucun mot de passe n'est jamais
renvoye (la table jointe n'est pas necessaire ici).

### 3.2 POST /api/paquets — creation

Verifications imposees :

1. **Token CSRF** valide (`Csrf::verifier_requete`).
2. **Authentification** (sinon 401).
3. **Validation serveur** centralisee : titre obligatoire et de longueur
   <= 150 caracteres, theme optionnel et <= 100 caracteres. Defense
   contre les types non-string via `lire_chaine_corps` (un client
   envoyant `{"titre": ["xss"]}` est traite comme titre vide).
4. **id_proprietaire** est pose depuis la session (`$_SESSION['id_user']`),
   jamais lu depuis le body : impossible de creer un paquet "au nom de
   quelqu'un d'autre".

L'entite est instanciee via la Factory `Paquet::creer(...)`, puis
persistee via `PaquetRepository::creer(...)`. Reponse : `201 Created` +
`{"paquet": {...}}`.

### 3.3 PUT /api/paquets/:id — edition

Le controle d'acces verifie que `paquet.id_proprietaire === id_user`
**avant** toute modification (sinon `403`). Champs editables : `titre`
et `theme` uniquement. Les colonnes `last_score` et `best_score` ne sont
**pas** modifiables par cet endpoint, meme si le body les contient :
elles sont strictement reservees a la session de revision (cf. section
42).

### 3.4 DELETE /api/paquets/:id — suppression en cascade

La suppression d'un paquet implique de supprimer :

1. ses **questions** (table `questions` reference le paquet) ;
2. ses **partages** (table `partages` reference le paquet) ;
3. le paquet lui-meme.

Pour garantir l'atomicite (pas d'etat intermediaire ou un paquet a ete
supprime mais ses questions restent orphelines), la sequence est
**encapsulee dans une transaction SQLite** au niveau de
`PaquetRepository::supprimer_avec_cascade` :

```php
$pdo->beginTransaction();
try {
    $questions->supprimer_par_paquet($id_paquet);
    $partages->revoquer_toutes_par_paquet($id_paquet);
    $this->supprimer($id_paquet);
    $pdo->commit();
} catch (Exception $exception) {
    $pdo->rollBack();
    throw $exception;
}
```

Le choix de pilotage des transactions **dans le Repository** (et non
dans le controleur) respecte le patron Repository : les controleurs ne
voient jamais le PDO, ils ne connaissent meme pas l'existence de la
notion de transaction.

## 4. Endpoints questions

### 4.1 Acces "via le paquet parent"

Les questions n'ont pas de proprietaire direct dans le modele. Le
proprietaire d'une question est celui du **paquet parent**. C'est ce
controle qui est applique systematiquement dans les 3 endpoints
mutants (`POST`, `PUT`, `DELETE`) :

```php
$question = $this->questions->trouver_par_id($id_question);
$paquet   = $this->paquets->trouver_par_id($question->getIdPaquet());
if ($paquet->getIdProprietaire() !== $id_user) {
    $this->repondre(array('erreur' => 'Acces refuse.'), 403);
    return;
}
```

### 4.2 POST /api/paquets/:id/questions — creation

Verifications (validation centralisee dans
`QuestionController::valider_donnees_question`) :

- `contenu_question` non vide, <= 1000 caracteres ;
- `contenu_reponse` non vide, <= 1000 caracteres ;
- `id_difficulte` doit etre un entier > 0 et exister dans la table
  `difficultes` (verification BD via `DifficulteRepository::trouver_par_id`
  pour que la FK soit toujours respectee, meme si un client envoie un
  id farfelu).

### 4.3 PUT /api/questions/:id — edition

Modifie `contenu_question`, `contenu_reponse`, `id_difficulte`. Le
champ `id_paquet` n'est jamais editable : il est impossible de
"deplacer" une question d'un paquet a un autre via cet endpoint
(`QuestionRepository::mettre_a_jour` ne le passe pas dans le `UPDATE
SET`).

### 4.4 GET /api/paquets/:id/questions — liste pour edition / partage

Cet endpoint est utilise par l'ecran d'edition (pour pre-remplir la
liste de questions) et indirectement par le mode revision. L'acces est
ouvert au **proprietaire ou a un destinataire de partage** : un
destinataire doit pouvoir consulter les questions d'un paquet partage
avec lui (sinon le partage perdrait son sens). Le SQL trie par
`id_question ASC` (ordre d'ajout, conforme a la maquette `new_bag.png`).

### 4.5 DELETE /api/questions/:id — suppression

Suppression simple, sans cascade : une question n'a pas de dependance
en aval dans le modele actuel. Si une question apparait dans une session
en cours cote front, elle disparait du DOM mais ne fait pas crasher
l'application (la session courante reste valide).

## 5. Front-end : ecran d'edition

L'ecran d'edition d'un paquet (`#nouveau-paquet` pour une creation,
`#edit-paquet-<id>` pour une edition) reutilise la meme vue HTML
(`#vue-edition-paquet` dans `app.php`). Le mode est detecte cote client
par `edition-paquet.js::detecter_mode_edition()` a partir du
`window.location.hash`.

### 5.1 Mode "creation"

- Le formulaire est vide au chargement.
- Le bouton "+ Ajouter une question" est **desactive** avec un title
  explicatif : il faut d'abord enregistrer le paquet pour obtenir un
  `id_paquet`, prerequis a `POST /api/paquets/:id/questions`.
- Au clic "Enregistrer le paquet" : `POST /api/paquets`, puis sur
  succes redirection vers `#edit-paquet-<nouvelId>` pour permettre
  immediatement l'ajout de questions. Cette redirection est preferee
  a `#visualisation-paquet-<id>` car elle prolonge naturellement le
  flux de creation.

### 5.2 Mode "edition"

- `GET /api/paquets/:id` pre-remplit le formulaire (titre, theme) et
  refuse l'acces si l'utilisateur n'est pas proprietaire.
- `GET /api/paquets/:id/questions` charge les questions existantes et
  les rend dans `#questions-liste`.
- Le bouton "+ Ajouter une question" est actif.
- A chaque action sur une question (ajout, edition, suppression), un
  appel `AjaxService.post/put/supprimer` est emis vers l'endpoint
  approprie. Le DOM n'est mis a jour qu'apres **succes serveur** : on
  ne montre jamais une question qui n'existe pas en base.

### 5.3 Mapping difficulte cote front

Le serveur manipule un entier `id_difficulte` (1, 2, 3), le front
manipule une chaine (`facile`, `moyen`, `difficile`) qui pilote les
classes CSS. Deux helpers font la conversion :

```javascript
function niveau_vers_id_difficulte(niveau) { ... }   // "facile" -> 1
function id_difficulte_vers_niveau(id) { ... }       // 1 -> "facile"
```

L'ordre 1/2/3 = Facile/Moyen/Difficile est garanti par
`src/sql/install.php` qui insere les niveaux dans cet ordre dans la
table referentiel.

## 6. Validation client et serveur en miroir

Conformement aux exigences du sujet (CLAUDE.md §6), chaque regle de
validation est appliquee **deux fois** :

| Champ | Cote client (JS) | Cote serveur (PHP) |
|---|---|---|
| titre paquet | non vide, <= 150, rouge dynamique au keyup/blur | non vide apres trim, <= 150 (PaquetController::valider_donnees_paquet) |
| theme paquet | <= 100 (signale visuellement) | <= 100 apres trim |
| contenu_question | non vide, <= 1000 | non vide apres trim, <= 1000 (QuestionController::valider_donnees_question) |
| contenu_reponse | non vide, <= 1000 | non vide apres trim, <= 1000 |
| id_difficulte | l'un des 3 niveaux | entier > 0 ET existe en BD |

Les erreurs serveur (`400 Bad Request` avec `{erreurs: {champ: msg}}`)
sont remappees dans la modale d'edition de question pour mettre les
champs concernes en rouge et lister les messages dans le recap (pattern
impose).

## 7. Securite (recapitulatif)

- **CSRF** : token genere par `Csrf::generer_si_absent` au demarrage de
  la session, verifie sur tous les endpoints mutants (POST / PUT /
  DELETE) via `Csrf::verifier_requete` (en-tete `X-CSRF-Token` pose
  automatiquement par `AjaxService`).
- **Authentification** : `verifier_authentifie` controle
  `$_SESSION['id_user']` en debut de chaque action.
- **Controle d'acces** : sur les paquets via comparaison directe
  `paquet.id_proprietaire === session.id_user` ; sur les questions via
  le paquet parent (cf. 4.1).
- **SQL** : 100% des requetes sont **preparees** via
  `DB::executer()` qui wrap `prepare + execute([...])`. Aucune
  concatenation SQL dans le projet.
- **XSS** : le front utilise systematiquement `.text()` (jamais
  `.html()`) pour injecter du contenu venant de la BD. Les SVG inline
  d'icones sont les seules exceptions et leur source est statique
  (pas de contenu utilisateur).

## 8. Conformite aux maquettes

| Mockup | Ecran couvert |
|---|---|
| `dashboard.png` | Cartes paquets dans les deux colonnes, boutons Reviser / Editer / Partager |
| `new_bag.png` | Vue d'edition (titre, theme, apercu, liste de questions, modale d'ajout) |
| `question_give_response.png` / `current_revision.png` | (cf. section 42 - mode revision) |

L'ecran de visualisation d'un paquet (`#visualisation-paquet-<id>`)
n'est pas explicitement mockupe : son design s'inspire de la palette
violette / Inter typo et reutilise les composants `card`, `chip`,
`btn-*` definis dans la charte graphique.
