# Scripts base de données (DOC-BD.3)

Fiche technique : scripts d'installation, de seed et de remise à zéro de
la base SQLite, et localisation du fichier de données.

> Référence d'implémentation : `src/sql/install.php` (BD-2.1),
> `src/sql/reset.php` (BD-2.9), `src/core/DB.php` (création automatique
> du dossier `src/data/`). Voir aussi `installation.txt` pour les
> instructions d'utilisation au moment du rendu. Synthèse côté rapport :
> `rapport.md` section 7.

---

## 1. `install.php` — création du schéma et seed initial

### Rôle

`src/sql/install.php` crée les cinq tables de l'application et insère les
trois niveaux de difficulté. C'est le seul script à exécuter pour mettre en
place une base vierge fonctionnelle. Il est conçu pour être **idempotent** :
il peut être relancé sans risque sur une base déjà initialisée.

### Usage

```
php src/sql/install.php
```

Le script peut également être pointé depuis un navigateur en environnement de
développement, puis supprimé avant le rendu final (cf. `installation.txt`).

### Déroulement

1. Obtient la connexion PDO via `DB::getInstance()->pdo()`.
2. Active les clés étrangères : `PRAGMA foreign_keys = ON`.
3. Crée les cinq tables avec `CREATE TABLE IF NOT EXISTS` (idempotence).
4. Crée les quatre index avec `CREATE INDEX IF NOT EXISTS` (idempotence).
5. Insère les trois niveaux de difficulté avec `INSERT OR IGNORE` dans une
   boucle sur requête préparée :

```php
$inserer_difficulte = $pdo->prepare(
    'INSERT OR IGNORE INTO difficultes (nom_difficulte) VALUES (?)'
);
$niveaux = array('Facile', 'Moyen', 'Difficile');
foreach ($niveaux as $niveau) {
    $inserer_difficulte->execute(array($niveau));
}
```

L'utilisation d'une requête préparée même pour des valeurs fixes respecte la
règle du projet « 100 % requêtes préparées, zéro concaténation SQL ». Le
`INSERT OR IGNORE` exploite la contrainte `UNIQUE` sur `nom_difficulte` pour
ignorer silencieusement les insertions en doublon lors d'une réexécution.

### Sortie

```
Installation terminée : 5 tables créées, difficultés seedées.
```

---

## 2. `reset.php` — remise à zéro (développement uniquement)

### Rôle

`src/sql/reset.php` supprime les cinq tables puis délègue à `install.php`
pour les recréer et reseeder les difficultés. Ce script est réservé au
développement : il est destructif (toutes les données sont perdues).

### Usage

```
php src/sql/reset.php
```

Ce script ne doit pas être accessible en production ni exécuté par accident
avant le rendu. Il peut être supprimé avec `install.php` après la livraison
si l'enseignant le demande.

### Déroulement

1. Obtient la connexion PDO via `DB::getInstance()->pdo()`.
2. Supprime les tables dans l'ordre enfants → parents pour respecter les
   contraintes de clé étrangère (FK actives via `DB.php`) :

```php
$pdo->exec('DROP TABLE IF EXISTS partages');
$pdo->exec('DROP TABLE IF EXISTS questions');
$pdo->exec('DROP TABLE IF EXISTS paquets');
$pdo->exec('DROP TABLE IF EXISTS utilisateurs');
$pdo->exec('DROP TABLE IF EXISTS difficultes');
```

L'ordre de suppression est le suivant :

- `partages` et `questions` référencent `paquets` et `utilisateurs` → à
  supprimer en premier ;
- `paquets` référence `utilisateurs` → avant `utilisateurs` ;
- `utilisateurs` et `difficultes` n'ont pas de dépendances entrantes → en
  dernier.

3. Appelle `require __DIR__ . '/install.php'` pour recréer le schéma et reseeder
   les difficultés. Le code SQL n'est pas dupliqué : `reset.php` réutilise
   `install.php` entièrement.

### Sortie

```
Tables supprimées. Recréation en cours...
Installation terminée : 5 tables créées, difficultés seedées.
```

---

## 3. Fichier SQLite — localisation et création automatique

Le fichier de base de données est situé à `src/data/flashcards.sqlite`. Il est
créé automatiquement au premier accès par `DB::pdo()` dans `src/core/DB.php` :

```php
$dossier_data = __DIR__ . '/../data';
if (!is_dir($dossier_data)) {
    mkdir($dossier_data, 0775, true);
}
$chemin = $dossier_data . '/flashcards.sqlite';
$this->pdo = new PDO('sqlite:' . $chemin);
```

Le dossier `src/data/` est créé si absent (`mkdir` récursif avec les permissions
`0775`). Le fichier SQLite est ensuite créé par SQLite lui-même à l'ouverture de
la connexion PDO si ce chemin n'existe pas encore.

Ce comportement signifie que l'exécution d'`install.php` suffit à initialiser
tout le système de persistance : pas besoin de créer manuellement `src/data/`.

### Suivi dans Git

Le projet étant académique, le fichier `src/data/flashcards.sqlite` est suivi
dans Git (aucune ligne `.gitignore` ne l'exclut). Les données de développement
et de test sont ainsi partagées entre les membres de l'équipe sans configuration
supplémentaire. Aucune donnée sensible n'y figure (projet académique).

---

## 4. Connexion PDO — configuration appliquée

La classe `DB` (singleton dans `src/core/DB.php`) configure la connexion avec
deux attributs appliqués immédiatement après l'ouverture :

```php
$this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$this->pdo->exec('PRAGMA foreign_keys = ON');
```

- `PDO::ERRMODE_EXCEPTION` : toute erreur SQL lève une `PDOException`, ce qui
  évite que SQLite reste silencieux sur les anomalies. `DB::executer()` capture
  cette exception et la remplace par une `RuntimeException` générique envoyée
  au client, tandis que le message technique est loggué côté serveur via
  `error_log()`.
- `PDO::FETCH_ASSOC` : les `fetch()` et `fetchAll()` retournent des tableaux
  associatifs (clé = nom de colonne), ce qui simplifie la reconstruction des
  objets métier dans `fromRow()`.
- `PRAGMA foreign_keys = ON` : activation systématique des contraintes de clé
  étrangère (désactivées par défaut dans SQLite à chaque connexion).

---

## 5. Instructions d'installation résumées

Les étapes complètes figurent dans `installation.txt`. En résumé :

1. Placer le projet dans le dossier servi par le serveur web PHP (ou lancer
   `php -S localhost:8000 -t src/public`).
2. Exécuter `php src/sql/install.php` une seule fois.
3. Accéder à l'application via le navigateur.
4. Supprimer `src/sql/install.php` et `src/sql/reset.php` avant le rendu si
   l'accessibilité de ces scripts depuis le navigateur est un risque.

---

## 6. Périmètre des fonctions/APIs utilisées

PDO : `new PDO`, `setAttribute`, `exec`, `prepare`, `execute`. PHP : `is_dir`,
`mkdir`, `require`, `require_once`, `array`, `foreach`, `echo`. Ces fonctions
figurent dans le périmètre PHP du cours (CLAUDE.md section 2 bis). L'usage de
`PRAGMA foreign_keys` est une instruction SQLite documentée ; il n'a pas
d'équivalent dans les PDFs de cours mais son rôle est explicitement justifié
dans la conception (CLAUDE.md section 4).
