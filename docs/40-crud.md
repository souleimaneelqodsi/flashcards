# CRUD paquets et questions

Cette section decrit l'implémentation des deux ressources metier principales
de l'application : les **paquets** (un dossier de cartes appartenant a un
utilisateur) et les **questions** (les cartes elles-mêmes, contenant un
recto / un verso et un niveau de difficulté). Les deux ressources suivent
la même architecture MVC + SPA decrite plus haut dans le rapport.

## 1. Vue d'ensemble

Un paquet est créé par un utilisateur, qui en est le **propriétaire** au
sens metier (`paquets.id_proprietaire`). Les questions appartiennent a un
paquet (`questions.id_paquet`). Les actions disponibles sur ces deux
ressources sont :

| Ressource | Lister | Voir un | créer | éditer | Supprimer |
|---|---|---|---|---|---|
| Paquet    | GET `/api/paquets`           | GET `/api/paquets/:id`  | POST `/api/paquets`   | PUT `/api/paquets/:id`   | DELETE `/api/paquets/:id`   |
| Question  | GET `/api/paquets/:id/questions` | -                      | POST `/api/paquets/:id/questions` | PUT `/api/questions/:id` | DELETE `/api/questions/:id` |

Toutes ces routes sont enregistrees dans `src/public/index.php` et
delegues a `PaquetController` ou `QuestionController` selon la ressource.
Le routage SPA (`window.location.hash`) côté client est gere par
`src/public/js/router.js` et `app.js`.

## 2. modèle de donnees

Conforme au schéma relationnel (cf. section 20) :

- **paquets** (`id_paquet`, `titre`, `theme`, `date_creation`,
  `last_score`, `best_score`, `id_proprietaire`).
- **questions** (`id_question`, `contenu_question`, `contenu_reponse`,
  `id_paquet`, `id_difficulte`).
- **difficultes** : table referentiel seedee a l'installation
  (`Facile`, `Moyen`, `Difficile`).

Les modèles PHP (`src/models/Paquet.php`, `src/models/Question.php`)
exposent deux **Factory Methods** chacun, conformement au patron Factory
retenu (cf. section 11) :

- `Paquet::creer($titre, $theme, $id_proprietaire)` : nouvelle entité
  depuis le formulaire de création. `date_creation` est positionnee au
  jour courant, `last_score` et `best_score` a `null`.
- `Paquet::fromRow($ligne)` : reconstruction depuis une ligne SQL après
  un `fetch`. Utilise par `PaquetRepository`.
- `Question::creer(...)` et `Question::fromRow(...)` : mêmes principes
  pour les questions.

## 3. Endpoints paquets

### 3.1 GET /api/paquets — liste des paquets de l'utilisateur

Renvoie tous les paquets dont l'utilisateur courant est propriétaire,
**tries par date de création decroissante** (les plus recents en haut)
conformement a la maquette `dashboard.png`. Le tri est garanti par le
SQL `ORDER BY date_creation DESC` dans
`PaquetRepository::trouver_par_proprietaire` ; le controleur ne re-trie
pas (règle metier vivant dans le SQL).

réponse : `200` + `{"paquets": [...]}`. Aucun mot de passe n'est jamais
renvoye (la table jointe n'est pas nécessaire ici).

### 3.2 POST /api/paquets — création

vérifications imposees :

1. **Token CSRF** valide (`Csrf::verifier_requete`).
2. **Authentification** (sinon 401).
3. **Validation serveur** centralisee : titre obligatoire et de longueur
   <= 150 caracteres, theme optionnel et <= 100 caracteres. Defense
   contre les types non-string via `lire_chaine_corps` (un client
   envoyant `{"titre": ["xss"]}` est traite comme titre vide).
4. **id_proprietaire** est pose depuis la session (`$_SESSION['id_user']`),
   jamais lu depuis le body : impossible de créer un paquet "au nom de
   quelqu'un d'autre".

L'entité est instanciee via la Factory `Paquet::creer(...)`, puis
persistee via `PaquetRepository::creer(...)`. réponse : `201 Created` +
`{"paquet": {...}}`.

### 3.3 PUT /api/paquets/:id — édition

Le contrôle d'accès vérifié que `paquet.id_proprietaire === id_user`
**avant** toute modification (sinon `403`). Champs editables : `titre`
et `theme` uniquement. Les colonnes `last_score` et `best_score` ne sont
**pas** modifiables par cet endpoint, même si le body les contient :
elles sont strictement reservees a la session de révision (cf. section
42).

### 3.4 DELETE /api/paquets/:id — suppression en cascade

La suppression d'un paquet implique de supprimer :

1. ses **questions** (table `questions` référence le paquet) ;
2. ses **partages** (table `partages` référence le paquet) ;
3. le paquet lui-même.

Pour garantir l'atomicite (pas d'état intermediaire ou un paquet a ete
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
voient jamais le PDO, ils ne connaissent même pas l'existence de la
notion de transaction.

## 4. Endpoints questions

### 4.1 accès "via le paquet parent"

Les questions n'ont pas de propriétaire direct dans le modèle. Le
propriétaire d'une question est celui du **paquet parent**. C'est ce
contrôle qui est applique systematiquement dans les 3 endpoints
mutants (`POST`, `PUT`, `DELETE`) :

```php
$question = $this->questions->trouver_par_id($id_question);
$paquet   = $this->paquets->trouver_par_id($question->getIdPaquet());
if ($paquet->getIdProprietaire() !== $id_user) {
    $this->repondre(array('erreur' => 'Acces refuse.'), 403);
    return;
}
```

### 4.2 POST /api/paquets/:id/questions — création

vérifications (validation centralisee dans
`QuestionController::valider_donnees_question`) :

- `contenu_question` non vide, <= 1000 caracteres ;
- `contenu_reponse` non vide, <= 1000 caracteres ;
- `id_difficulte` doit etre un entier > 0 et exister dans la table
  `difficultes` (vérification BD via `DifficulteRepository::trouver_par_id`
  pour que la FK soit toujours respectee, même si un client envoie un
  id farfelu).

### 4.3 PUT /api/questions/:id — édition

Modifie `contenu_question`, `contenu_reponse`, `id_difficulte`. Le
champ `id_paquet` n'est jamais editable : il est impossible de
"deplacer" une question d'un paquet a un autre via cet endpoint
(`QuestionRepository::mettre_a_jour` ne le passe pas dans le `UPDATE
SET`).

### 4.4 GET /api/paquets/:id/questions — liste pour édition / partage

Cet endpoint est utilise par l'écran d'édition (pour pre-remplir la
liste de questions) et indirectement par le mode révision. L'accès est
ouvert au **propriétaire ou a un destinataire de partage** : un
destinataire doit pouvoir consulter les questions d'un paquet partage
avec lui (sinon le partage perdrait son sens). Le SQL trie par
`id_question ASC` (ordre d'ajout, conforme a la maquette `new_bag.png`).

### 4.5 DELETE /api/questions/:id — suppression

Suppression simple, sans cascade : une question n'a pas de dependance
en aval dans le modèle actuel. Si une question apparait dans une session
en cours côté front, elle disparait du DOM mais ne fait pas crasher
l'application (la session courante reste valide).

## 5. Front-end : écran d'édition

L'écran d'édition d'un paquet (`#nouveau-paquet` pour une création,
`#edit-paquet-<id>` pour une édition) réutilisé la même vue HTML
(`#vue-edition-paquet` dans `app.php`). Le mode est détecté côté client
par `edition-paquet.js::detecter_mode_edition()` a partir du
`window.location.hash`.

### 5.1 Mode "création"

- Le formulaire est vide au chargement.
- Le bouton "+ Ajouter une question" est **desactive** avec un title
  explicatif : il faut d'abord enregistrer le paquet pour obtenir un
  `id_paquet`, prerequis a `POST /api/paquets/:id/questions`.
- Au clic "Enregistrer le paquet" : `POST /api/paquets`, puis sur
  succès redirection vers `#edit-paquet-<nouvelId>` pour permettre
  immediatement l'ajout de questions. Cette redirection est preferee
  a `#visualisation-paquet-<id>` car elle prolonge naturellement le
  flux de création.

### 5.2 Mode "édition"

- `GET /api/paquets/:id` pre-remplit le formulaire (titre, theme) et
  refuse l'accès si l'utilisateur n'est pas propriétaire.
- `GET /api/paquets/:id/questions` charge les questions existantes et
  les rend dans `#questions-liste`.
- Le bouton "+ Ajouter une question" est actif.
- A chaque action sur une question (ajout, édition, suppression), un
  appel `AjaxService.post/put/supprimer` est emis vers l'endpoint
  approprie. Le DOM n'est mis a jour qu'après **succès serveur** : on
  ne montre jamais une question qui n'existe pas en base.

### 5.3 Mapping difficulté côté front

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

Conformement aux exigences du sujet (CLAUDE.md §6), chaque règle de
validation est appliquee **deux fois** :

| Champ | côté client (JS) | côté serveur (PHP) |
|---|---|---|
| titre paquet | non vide, <= 150, rouge dynamique au keyup/blur | non vide après trim, <= 150 (PaquetController::valider_donnees_paquet) |
| theme paquet | <= 100 (signale visuellement) | <= 100 après trim |
| contenu_question | non vide, <= 1000 | non vide après trim, <= 1000 (QuestionController::valider_donnees_question) |
| contenu_reponse | non vide, <= 1000 | non vide après trim, <= 1000 |
| id_difficulte | l'un des 3 niveaux | entier > 0 ET existe en BD |

Les erreurs serveur (`400 Bad Request` avec `{erreurs: {champ: msg}}`)
sont remappees dans la modale d'édition de question pour mettre les
champs concernes en rouge et lister les messages dans le recap (pattern
impose).

## 7. sécurité (recapitulatif)

- **CSRF** : token généré par `Csrf::generer_si_absent` au démarrage de
  la session, vérifié sur tous les endpoints mutants (POST / PUT /
  DELETE) via `Csrf::verifier_requete` (en-tête `X-CSRF-Token` pose
  automatiquement par `AjaxService`).
- **Authentification** : `verifier_authentifie` contrôle
  `$_SESSION['id_user']` en debut de chaque action.
- **contrôle d'accès** : sur les paquets via comparaison directe
  `paquet.id_proprietaire === session.id_user` ; sur les questions via
  le paquet parent (cf. 4.1).
- **SQL** : 100% des requêtes sont **preparees** via
  `DB::executer()` qui wrap `prepare + execute([...])`. Aucune
  concatenation SQL dans le projet.
- **XSS** : le front utilise systematiquement `.text()` (jamais
  `.html()`) pour injecter du contenu venant de la BD. Les SVG inline
  d'icones sont les seules exceptions et leur source est statique
  (pas de contenu utilisateur).

## 8. Conformite aux maquettes

| Mockup | écran couvert |
|---|---|
| `dashboard.png` | Cartes paquets dans les deux colonnes, boutons réviser / éditer / Partager |
| `new_bag.png` | Vue d'édition (titre, theme, apercu, liste de questions, modale d'ajout) |
| `question_give_response.png` / `current_revision.png` | (cf. section 42 - mode révision) |

L'écran de visualisation d'un paquet (`#visualisation-paquet-<id>`)
n'est pas explicitement mockupe : son design s'inspire de la palette
violette / Inter typo et réutilisé les composants `card`, `chip`,
`btn-*` définis dans la charte graphique.
