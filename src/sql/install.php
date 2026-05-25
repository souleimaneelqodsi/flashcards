<?php
// src/sql/install.php
//
// Script d'installation de la base SQLite (BD-2.1).
//
// Cree les cinq tables decrites dans CLAUDE.md section 4 et dans
// project-files/DB_relational_model.jpeg, puis seed la table de
// referentiel `difficultes` avec les trois valeurs Facile / Moyen /
// Difficile. Le script est idempotent : il peut etre relance sans
// risque (CREATE TABLE IF NOT EXISTS, INSERT OR IGNORE).
//
// Les index seront ajoutes par BD-2.2, la robustesse de la connexion
// (mode exception + foreign_keys ON) sera apportee par BD-2.3 / BD-2.4.
//
// Usage : depuis la ligne de commande, a la racine du projet :
//     php src/sql/install.php
// Ou depuis un navigateur en pointant sur le fichier (en dev seulement).

require_once __DIR__ . '/../core/DB.php';

$pdo = DB::getInstance()->pdo();

// Active la verification des cles etrangeres pour la duree de la connexion.
// SQLite la desactive par defaut.
$pdo->exec('PRAGMA foreign_keys = ON');

// 1) Table des utilisateurs.
$pdo->exec(
    'CREATE TABLE IF NOT EXISTS utilisateurs (
        id_user         INTEGER PRIMARY KEY AUTOINCREMENT,
        email           VARCHAR(150) NOT NULL UNIQUE,
        mot_de_passe    VARCHAR(255) NOT NULL,
        nom             VARCHAR(100) NOT NULL,
        prenom          VARCHAR(100) NOT NULL,
        date_naissance  DATE NOT NULL,
        avatar          VARCHAR(255)
    )'
);

// 2) Table des paquets (proprietaire = utilisateur).
$pdo->exec(
    'CREATE TABLE IF NOT EXISTS paquets (
        id_paquet        INTEGER PRIMARY KEY AUTOINCREMENT,
        titre            VARCHAR(150) NOT NULL,
        theme            VARCHAR(100),
        date_creation    DATE NOT NULL,
        last_score       INTEGER,
        best_score       INTEGER,
        id_proprietaire  INTEGER NOT NULL,
        FOREIGN KEY (id_proprietaire) REFERENCES utilisateurs(id_user)
    )'
);

// 3) Table referentiel des difficultes (3 lignes seedees plus bas).
$pdo->exec(
    'CREATE TABLE IF NOT EXISTS difficultes (
        id_difficulte    INTEGER PRIMARY KEY AUTOINCREMENT,
        nom_difficulte   VARCHAR(50) NOT NULL UNIQUE
    )'
);

// 4) Table des questions (appartiennent a un paquet et ont une difficulte).
$pdo->exec(
    'CREATE TABLE IF NOT EXISTS questions (
        id_question      INTEGER PRIMARY KEY AUTOINCREMENT,
        contenu_question TEXT NOT NULL,
        contenu_reponse  TEXT NOT NULL,
        id_paquet        INTEGER NOT NULL,
        id_difficulte    INTEGER NOT NULL,
        FOREIGN KEY (id_paquet) REFERENCES paquets(id_paquet),
        FOREIGN KEY (id_difficulte) REFERENCES difficultes(id_difficulte)
    )'
);

// 5) Table des partages (un paquet partage avec un destinataire).
// Cle primaire composite (id_paquet, id_destinataire) pour eviter les doublons.
$pdo->exec(
    'CREATE TABLE IF NOT EXISTS partages (
        id_paquet        INTEGER NOT NULL,
        id_destinataire  INTEGER NOT NULL,
        date_partage     DATE NOT NULL,
        PRIMARY KEY (id_paquet, id_destinataire),
        FOREIGN KEY (id_paquet) REFERENCES paquets(id_paquet),
        FOREIGN KEY (id_destinataire) REFERENCES utilisateurs(id_user)
    )'
);

// Index sur les colonnes les plus filtrees / jointes (BD-2.2).
// `email` est deja UNIQUE donc indexe automatiquement par SQLite ; on
// ajoute explicitement les index sur les colonnes FK pour accelerer les
// recherches de paquets par proprietaire, de questions par paquet, et
// de partages par destinataire (cas frequents : dashboard, mode revision).
$pdo->exec('CREATE INDEX IF NOT EXISTS idx_paquets_proprietaire ON paquets(id_proprietaire)');
$pdo->exec('CREATE INDEX IF NOT EXISTS idx_questions_paquet ON questions(id_paquet)');
$pdo->exec('CREATE INDEX IF NOT EXISTS idx_questions_difficulte ON questions(id_difficulte)');
$pdo->exec('CREATE INDEX IF NOT EXISTS idx_partages_destinataire ON partages(id_destinataire)');

// Seed des trois difficultes (idempotent grace a INSERT OR IGNORE + UNIQUE
// sur nom_difficulte). Requete preparee + boucle pour rester sur la regle
// "100 % requetes preparees" du sujet, meme si les valeurs sont fixes.
$inserer_difficulte = $pdo->prepare('INSERT OR IGNORE INTO difficultes (nom_difficulte) VALUES (?)');
$niveaux = array('Facile', 'Moyen', 'Difficile');
foreach ($niveaux as $niveau) {
    $inserer_difficulte->execute(array($niveau));
}

echo "Installation terminee : 5 tables creees, difficultes seedees.\n";
