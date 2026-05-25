<?php
// src/sql/reset.php
//
// Script de remise a zero de la base SQLite (BD-2.9).
//
// Supprime les cinq tables puis relance install.php pour les recreer et
// reseeder les difficultes. Utile en dev pour repartir d'une base propre
// apres des tests, sans avoir a supprimer manuellement le fichier .sqlite.
//
// DESTRUCTIF : toutes les donnees sont perdues. A reserver au developpement
// (le fichier est supprimable avant rendu si necessaire).
//
// Usage : depuis la ligne de commande, a la racine du projet :
//     php src/sql/reset.php

require_once __DIR__ . '/../core/DB.php';

$pdo = DB::getInstance()->pdo();

// Ordre de suppression : les tables enfants AVANT leurs parents pour
// respecter les contraintes de cle etrangere (FK activees par DB.php).
// partages -> questions -> paquets -> utilisateurs -> difficultes.
$pdo->exec('DROP TABLE IF EXISTS partages');
$pdo->exec('DROP TABLE IF EXISTS questions');
$pdo->exec('DROP TABLE IF EXISTS paquets');
$pdo->exec('DROP TABLE IF EXISTS utilisateurs');
$pdo->exec('DROP TABLE IF EXISTS difficultes');

echo "Tables supprimees. Recreation en cours...\n";

// Recreation du schema + seed via install.php (ne duplique pas le code SQL).
require __DIR__ . '/install.php';
