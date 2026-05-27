# Modèle de données (DOC-BD.1)

Fiche technique : modèle conceptuel de données (MCD), modèle logique
relationnel (MLD) et définition physique des tables SQLite du projet.

> Référence d'implémentation : `src/sql/install.php` (DDL complet),
> `src/core/DB.php` (connexion et activation des clés étrangères),
> `project-files/DB_relational_model.jpeg` (schéma relationnel source),
> `project-files/Dossier de Conception - Projet Flashcards MIAGE.pdf`
> (MCD original). Synthèse côté rapport : `rapport.md` section 4.

---

## 1. Modèle conceptuel de données (MCD)

Le domaine métier fait apparaître cinq entités et quatre associations.

### Entités

| Entité | Description |
|---|---|
| `Utilisateur` | Compte d'un utilisateur de l'application. |
| `Paquet` | Ensemble de flashcards regroupées par thème. |
| `Question` | Une carte recto/verso appartenant à un paquet. |
| `Difficulté` | Niveau de difficulté (référentiel fixe : Facile, Moyen, Difficile). |
| `Partage` | Association matérialisée entre un paquet et un utilisateur destinataire. |

### Associations et cardinalités

**POSSÈDE** (Utilisateur — Paquet) : un utilisateur possède de 0 à N paquets ;
un paquet appartient à exactement 1 utilisateur (son propriétaire). Cardinalités :
`(0,N)` côté Utilisateur, `(1,1)` côté Paquet. Implémentée par la colonne
`id_proprietaire` dans la table `paquets`.

**CONTIENT** (Paquet — Question) : un paquet contient de 0 à N questions ; une
question appartient à exactement 1 paquet. Cardinalités : `(0,N)` côté Paquet,
`(1,1)` côté Question. Implémentée par la colonne `id_paquet` dans la table
`questions`.

**CLASSE** (Difficulté — Question) : une difficulté classe de 0 à N questions ;
une question est classée selon exactement 1 niveau de difficulté. Cardinalités :
`(0,N)` côté Difficulté, `(1,1)` côté Question. Implémentée par la colonne
`id_difficulte` dans la table `questions`.

**EST PARTAGÉ AVEC** (Paquet — Utilisateur) : un paquet peut être partagé avec
de 0 à N utilisateurs destinataires ; un utilisateur peut recevoir de 0 à N
paquets en partage. Association de type N..N, enrichie par l'attribut
`date_partage`. Elle est matérialisée par la table `partages` dont la clé
primaire composite `(id_paquet, id_destinataire)` interdit les doublons de
partage.

---

## 2. Modèle logique relationnel (MLD)

Le passage MCD → MLD suit les règles classiques du mapping relationnel. Chaque
entité donne une table ; l'association N..N (partages) donne une table de
jonction ; les associations 1..N sont implémentées par une clé étrangère du côté
« 1 ».

```
utilisateurs ( id_user, email, mot_de_passe, nom, prenom, date_naissance, avatar )
    PK : id_user

paquets ( id_paquet, titre, theme, date_creation, last_score, best_score, id_proprietaire )
    PK : id_paquet
    FK : id_proprietaire → utilisateurs(id_user)

difficultes ( id_difficulte, nom_difficulte )
    PK : id_difficulte

questions ( id_question, contenu_question, contenu_reponse, id_paquet, id_difficulte )
    PK : id_question
    FK : id_paquet     → paquets(id_paquet)
    FK : id_difficulte → difficultes(id_difficulte)

partages ( id_paquet, id_destinataire, date_partage )
    PK : (id_paquet, id_destinataire)
    FK : id_paquet       → paquets(id_paquet)
    FK : id_destinataire → utilisateurs(id_user)
```

---

## 3. Définition physique (DDL SQLite réel)

Le DDL ci-dessous est recopié fidèlement depuis `src/sql/install.php`. Toutes
les tables sont créées avec `IF NOT EXISTS` pour rendre le script idempotent.

```sql
CREATE TABLE IF NOT EXISTS utilisateurs (
    id_user         INTEGER PRIMARY KEY AUTOINCREMENT,
    email           VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe    VARCHAR(255) NOT NULL,
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    date_naissance  DATE NOT NULL,
    avatar          VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS paquets (
    id_paquet        INTEGER PRIMARY KEY AUTOINCREMENT,
    titre            VARCHAR(150) NOT NULL,
    theme            VARCHAR(100),
    date_creation    DATE NOT NULL,
    last_score       INTEGER,
    best_score       INTEGER,
    id_proprietaire  INTEGER NOT NULL,
    FOREIGN KEY (id_proprietaire) REFERENCES utilisateurs(id_user)
);

CREATE TABLE IF NOT EXISTS difficultes (
    id_difficulte    INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_difficulte   VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS questions (
    id_question      INTEGER PRIMARY KEY AUTOINCREMENT,
    contenu_question TEXT NOT NULL,
    contenu_reponse  TEXT NOT NULL,
    id_paquet        INTEGER NOT NULL,
    id_difficulte    INTEGER NOT NULL,
    FOREIGN KEY (id_paquet)     REFERENCES paquets(id_paquet),
    FOREIGN KEY (id_difficulte) REFERENCES difficultes(id_difficulte)
);

CREATE TABLE IF NOT EXISTS partages (
    id_paquet        INTEGER NOT NULL,
    id_destinataire  INTEGER NOT NULL,
    date_partage     DATE NOT NULL,
    PRIMARY KEY (id_paquet, id_destinataire),
    FOREIGN KEY (id_paquet)       REFERENCES paquets(id_paquet),
    FOREIGN KEY (id_destinataire) REFERENCES utilisateurs(id_user)
);
```

---

## 4. Index

Quatre index explicites sont créés par `install.php` (instruction `BD-2.2`) pour
accélérer les recherches les plus fréquentes. La colonne `email` est déjà indexée
automatiquement par SQLite du fait de sa contrainte `UNIQUE`.

```sql
CREATE INDEX IF NOT EXISTS idx_paquets_proprietaire   ON paquets(id_proprietaire);
CREATE INDEX IF NOT EXISTS idx_questions_paquet        ON questions(id_paquet);
CREATE INDEX IF NOT EXISTS idx_questions_difficulte    ON questions(id_difficulte);
CREATE INDEX IF NOT EXISTS idx_partages_destinataire   ON partages(id_destinataire);
```

Ces index couvrent les cas d'accès fréquents à l'exécution :
- `idx_paquets_proprietaire` : chargement du tableau de bord (« Mes paquets »,
  colonne gauche) via `PaquetRepository::trouver_par_proprietaire()` ;
- `idx_questions_paquet` : chargement du mode révision et du compte de cartes
  (LEFT JOIN questions dans les SELECT du dashboard) ;
- `idx_questions_difficulte` : filtrage éventuel par niveau de difficulté ;
- `idx_partages_destinataire` : chargement des paquets partagés avec un
  utilisateur (« Partages avec moi », colonne droite du dashboard) via
  `PaquetRepository::trouver_partages_avec()`.

---

## 5. Champ dérivé `nombre_cartes`

La table `paquets` ne comporte pas de colonne `nombre_cartes`. Ce compteur est
calculé à la demande par un `COUNT(q.id_question)` avec `LEFT JOIN questions`
dans les requêtes SELECT de `PaquetRepository`. Le résultat est placé dans
`Paquet::$nombre_cartes` par `Paquet::fromRow()` (valeur 0 si absent). Ce choix
évite une colonne dénormalisée qui devrait être maintenue en cohérence à chaque
ajout ou suppression de question.

---

## 6. Activation des clés étrangères SQLite

SQLite désactive les contraintes de clé étrangère par défaut à chaque connexion.
`DB::pdo()` (dans `src/core/DB.php`) exécute `PRAGMA foreign_keys = ON`
immédiatement après l'ouverture de la connexion PDO, ce qui garantit que toutes
les contraintes FK définies dans les tables ci-dessus sont effectivement vérifiées
par le moteur.

---

## 7. Périmètre des fonctions/APIs utilisées

PDO : `new PDO`, `setAttribute`, `exec`, `prepare`, `execute`, `fetch`,
`fetchAll`, `lastInsertId`. Instructions SQLite : `CREATE TABLE IF NOT EXISTS`,
`FOREIGN KEY … REFERENCES`, `PRIMARY KEY`, `AUTOINCREMENT`, `UNIQUE`,
`NOT NULL`, `CREATE INDEX IF NOT EXISTS`, `PRAGMA foreign_keys = ON`.
Tout ce périmètre relève de l'usage standard de PDO décrit dans le cours PHP
(CLAUDE.md section 2 bis). Le mapping MCD → MLD (entités, associations,
cardinalités) est dérivé du modèle UML du dossier de conception ; le cours le
présente en chapitre modélisation (référence colonne commentaire du CSV :
« Derive Ch3-4 (modelisation) - mapping relationnel hors cours »).
