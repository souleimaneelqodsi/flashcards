# FlashCards MIAGE (Anki-style)

> Application Web SPA (Single Page Application) de révision collaborative inspirée de la méthode Anki, réalisée dans le cadre du TER M1 MIAGE.

## Présentation du projet

Ce projet permet aux utilisateurs de créer des paquets de questions (flashcards), de s'auto-évaluer en mode révision et de partager leurs ressources avec d'autres étudiants.

Les maquettes de référence de l'interface se trouvent dans `project-files/interface/`.

## Fonctionnalités clés

- **Révision style Anki :** mode étude avec retournement de carte (flip) et évaluation (Je savais / À revoir), score de session.
- **Tableau de bord en deux colonnes :** « Mes paquets » et « Partagés avec moi » côte à côte, avec des indicateurs (KPI) en tête.
- **Statistiques :** dernier score et record (best score) par paquet, mis à jour à la fin de chaque session par le propriétaire.
- **Partage collaboratif :** partage de paquets entre utilisateurs avec auto-complétion par email ; l'écran de visualisation affiche les destinataires.
- **Expérience utilisateur :** mode sombre / clair, profil utilisateur (avatar à initiales colorées), interface SPA fluide en jQuery.

## Stack technique

- **Frontend :** HTML5, CSS, jQuery
- **Backend :** PHP (architecture MVC, API JSON)
- **Base de données :** SQLite (fichier local, accès via PDO)

Stack imposée par le sujet : pas de framework JavaScript (React / Vue / Angular) ni de framework PHP, pas de Node.js.

## Installation

Voir le fichier `installation.txt` pour la mise en place du serveur local et l'initialisation de la base de données SQLite via `install.php`.

## Documentation et rapport

La documentation est organisée dans le dossier `docs/` (un fichier markdown par section, voir `docs/README.md`). Le `rapport.pdf` final est assemblé à partir de ces fichiers (tâche QA-11).

## Licence

Projet académique (TER M1 MIAGE) — usage pédagogique.
