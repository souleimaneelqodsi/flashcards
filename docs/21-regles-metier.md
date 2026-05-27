# Règles métier de la base de données (DOC-BD.2)

Fiche technique : contraintes d'intégrité de la base de données, règles
métier critiques et leur implémentation dans le code.

> Référence d'implémentation : `src/sql/install.php` (contraintes DDL),
> `src/core/DB.php` (connexion, `PRAGMA foreign_keys`),
> `src/models/Paquet.php` et `src/models/Question.php` (Factory Methods),
> `src/repositories/PaquetRepository.php` (cascade transactionnelle),
> `src/controllers/PaquetController.php` (contrôle d'accès au score).
> Synthèse côté rapport : `rapport.md` section 4.

---

## 1. Contraintes d'intégrité définies en base

Les contraintes suivantes sont déclarées dans le DDL de `src/sql/install.php`
et sont appliquées par SQLite dès que `PRAGMA foreign_keys = ON` est actif
(activé par `DB::pdo()` à chaque connexion).

### 1.1 Unicité de l'adresse e-mail

La colonne `email` de la table `utilisateurs` porte une contrainte `UNIQUE`.
Un seul compte peut exister pour une adresse e-mail donnée. En cas de
tentative d'insertion d'un e-mail déjà présent, SQLite lève une erreur que
`DB::executer()` remonte en `RuntimeException`. En amont, la validation
applicative côté serveur vérifie l'unicité avant l'insertion via
`UtilisateurRepository::trouver_par_email()` : `AuthController` renvoie alors un
HTTP 409 Conflict avec le message « Email déjà utilisé. » plutôt que de laisser
remonter une erreur SQLite brute.

### 1.2 Unicité du nom de difficulté

La colonne `nom_difficulte` de la table `difficultes` porte une contrainte
`UNIQUE`. Le référentiel des niveaux (Facile, Moyen, Difficile) est seedé
dans `install.php` avec `INSERT OR IGNORE`, ce qui garantit qu'une réexécution
du script n'insère pas de doublons.

### 1.3 Clé primaire composite sur les partages

La table `partages` a pour clé primaire le couple `(id_paquet, id_destinataire)`.
Cette contrainte interdit au moteur d'enregistrer deux fois le même partage entre
un paquet et un destinataire. Au niveau applicatif, `PaquetController::partager()`
vérifie au préalable l'existence du partage via `PartageRepository::existe()` et
renvoie un HTTP 409 Conflict avant même de tenter l'insertion, ce qui produit un
message d'erreur lisible plutôt qu'une erreur SQLite brute.

### 1.4 Contraintes NOT NULL et clés étrangères

Tous les champs métier obligatoires portent `NOT NULL` (cf. DDL en section 3 de
`20-modele-donnees.md`). Les clés étrangères garantissent l'intégrité
référentielle :

- une question appartient toujours à un paquet existant (`id_paquet FK`) et à
  une difficulté existante (`id_difficulte FK`) ;
- un paquet a toujours un propriétaire existant (`id_proprietaire FK`) ;
- un partage référence toujours un paquet existant et un destinataire existant.

---

## 2. Règle de progression personnelle (scores)

### Principe

Le partage transfère l'accès au contenu d'un paquet, pas la progression. Les
colonnes `last_score` et `best_score` de la table `paquets` sont strictement
personnelles au propriétaire. Un utilisateur destinataire peut réviser un paquet
partagé, mais ses résultats ne sont pas enregistrés sur le paquet.

### Implémentation

La méthode `PaquetController::enregistrer_score()` (dans
`src/controllers/PaquetController.php`) applique ce principe :

```php
if ($paquet->getIdProprietaire() !== $id_user) {
    $this->repondre(
        array('erreur' => 'Accès refusé : seul le propriétaire peut enregistrer un score.'),
        403
    );
    return;
}
```

Le côté client (`study.js`) ne déclenche pas l'appel à
`POST /api/paquets/:id/score` si le flag `est_proprietaire` renvoyé par
`GET /api/paquets/:id/study` vaut `false`. Le serveur refuse de toute façon
(défense en profondeur : le contrôle n'est jamais confié au seul client).

### Mise à jour des scores

Lorsque le propriétaire termine une session, le contrôleur applique la logique
suivante :

- `last_score` est mis à jour systématiquement avec la valeur de la session
  courante ;
- `best_score` est mis à jour uniquement si le score courant dépasse le
  meilleur score enregistré (ou si `best_score` est encore `null`).

```php
$paquet->setLastScore($score);
$best_precedent = $paquet->getBestScore();
if ($best_precedent === null || $score > $best_precedent) {
    $paquet->setBestScore($score);
}
```

Le score est validé comme un entier compris entre 0 et 100 par la méthode
privée `lire_score_corps()` avant toute mise à jour.

---

## 3. Suppression en cascade applicative

### Principe

SQLite ne supporte pas `ON DELETE CASCADE` dans toutes les configurations. Le
projet a choisi une cascade applicative, ce qui présente l'avantage de conserver
la logique de suppression explicite dans le code plutôt que de la déléguer
implicitement au moteur.

### Implémentation

La méthode `PaquetRepository::supprimer_avec_cascade()` (dans
`src/repositories/PaquetRepository.php`) exécute trois suppressions dans une
transaction SQLite :

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

L'ordre est imposé par les contraintes de clé étrangère :

1. suppression des questions du paquet (`QuestionRepository::supprimer_par_paquet`) ;
2. suppression des partages du paquet (`PartageRepository::revoquer_toutes_par_paquet`) ;
3. suppression du paquet lui-même (`PaquetRepository::supprimer`).

Si une étape échoue (erreur SQL, exception réseau), le `rollBack()` annule les
suppressions déjà effectuées et laisse la base dans l'état cohérent initial. Le
contrôleur (`PaquetController::supprimer()`) ne pilote aucune transaction : toute
la logique de persistance est encapsulée dans le repository, conformément au
patron Repository retenu.

---

## 4. Factory Methods sur les modèles

### Principe

Les entités `Paquet` et `Question` n'exposent pas de constructeur public. Leur
instanciation passe par des méthodes statiques (patron Factory Method) qui
garantissent l'initialisation cohérente de chaque objet, que ce soit à la
création depuis un formulaire ou à la reconstruction depuis une ligne SQL.

### `Paquet::creer()` et `Paquet::fromRow()`

Déclarées dans `src/models/Paquet.php` :

- `Paquet::creer($titre, $theme, $id_proprietaire)` : crée un nouveau paquet
  avec `date_creation = date('Y-m-d')` (date courante côté serveur, non fournie
  par le client) et `last_score = null` / `best_score = null` (aucune session
  jouée).
- `Paquet::fromRow(array $ligne)` : reconstruit un paquet à partir d'une ligne
  associative issue d'un `fetch()` PDO. Gère le champ dérivé `nombre_cartes`
  (présent dans les requêtes jointes du dashboard, absent dans les requêtes
  simples).

### `Question::creer()` et `Question::fromRow()`

Déclarées dans `src/models/Question.php`, selon le même principe : `creer()`
pour une nouvelle carte issue du formulaire, `fromRow()` pour la reconstruction
depuis SQL.

La séparation entre les deux factories est importante : `creer()` est appelée par
les contrôleurs après validation des saisies utilisateur ; `fromRow()` est
appelée exclusivement par les repositories après une requête SQL. Cela empêche
qu'une donnée brute non validée soit directement injectée dans un objet métier.

---

## 5. Validation applicative complémentaire

Les contraintes de la base constituent un dernier filet de sécurité. La
validation principale a lieu à deux niveaux :

- **côté client** (JavaScript/jQuery) : vérification dynamique des champs en
  temps réel (regex, longueur, champs obligatoires) avant l'envoi de la requête
  AJAX ;
- **côté serveur** (PHP) : vérification dans les contrôleurs avant toute
  opération de persistance (`valider_donnees_paquet()` dans
  `PaquetController`, `valider_donnees()` dans `AuthController`).

Les règles précises (longueur max, format, caractères autorisés) sont détaillées
dans la fiche `32-validation.md`.

---

## 6. Périmètre des fonctions/APIs utilisées

PDO : `beginTransaction`, `commit`, `rollBack`, `prepare`, `execute`, `fetch`.
PHP : `is_int`, `is_string`, `preg_match`, `trim`, `strlen`, `count`,
`isset`, `date`. Superglobale `$_SESSION` (lecture de `id_user` pour le contrôle
propriétaire). Ces fonctions et méthodes figurent dans le périmètre PHP du cours
(CLAUDE.md section 2 bis).
