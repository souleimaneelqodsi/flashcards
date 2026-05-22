---
description: Scaffold complet d'une nouvelle entite (modele + repository + colonne BD + endpoint controleur)
argument-hint: <nom_entite_singulier>
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Tu vas creer le scaffold complet d'une nouvelle entite metier `$ARGUMENTS` pour le projet TER Flashcards, en respectant **strictement** les conventions du projet.

## Etape 1 : Verifie le nom

- L'argument est en francais, singulier (`paquet`, pas `paquets`).
- L'entite n'existe pas deja : `Glob src/models/$ARGUMENTS.php` et `Glob src/repositories/${ARGUMENTS}Repository.php`. Si l'un existe deja, STOP et signale.

Si l'argument est vide ou ambigu : demande le nom exact avant de continuer.

## Etape 2 : Propose un plan AVANT d'ecrire

Aligne-toi sur les conventions de `CLAUDE.md` :

- Table SQLite : `${ARGUMENTS}s` (au pluriel), PK `id_$ARGUMENTS`, colonnes en snake_case francais.
- Classe modele : `Pa{rgs en PascalCase}` dans `src/models/PascalCase($ARGUMENTS).php`.
- Repository : `PascalCase($ARGUMENTS)Repository` dans `src/repositories/PascalCase($ARGUMENTS)Repository.php`.
- Controleur : `src/controllers/$ARGUMENTS.php`, endpoints REST (`POST` = creer, `GET` = lire, `PUT` = mettre a jour, `DELETE` = supprimer).
- Factory : `PascalCase($ARGUMENTS)::fromRow(array $row): self`.

Le plan doit lister :
1. La/les colonne(s) SQL a ajouter dans `src/sql/install.php` (ou la migration).
2. Les attributs du modele.
3. Les methodes du repository (`trouver_par_id`, `creer`, `mettre_a_jour`, `supprimer`, + methodes specifiques).
4. Les endpoints du controleur avec leurs validations.
5. La validation cliente associee (regex, fond rouge, message rouge).

Attends `go` explicite avant d'ecrire les fichiers.

## Etape 3 : Ecris les fichiers

Apres validation, ecris dans cet ordre :

1. **Migration SQL** : ajoute la table au script `src/sql/install.php`.
2. **Modele** : `src/models/<Nom>.php` avec proprietes + `fromRow()` + getters.
3. **Repository** : `src/repositories/<Nom>Repository.php` avec methodes CRUD utilisant DB::getInstance() et requetes preparees PDO.
4. **Controleur** : `src/controllers/$ARGUMENTS.php` avec verification session, validation serveur, appels repository, reponse JSON.
5. **JS client** : si l'utilisateur le souhaite, ajoute le module jQuery + validation cliente.

## Etape 4 : Verifie

A la fin :
- `php -l` sur tous les fichiers PHP crees.
- Lance l'agent `repository-enforcer` pour confirmer qu'aucune violation n'a ete introduite.
- Affiche un resume des fichiers crees et des endpoints exposes.

## Contraintes strictes (rappel)

- **Indentation 4 espaces**.
- **Aucune** concatenation SQL.
- **Aucun** PDO direct dans le controleur.
- Validation **serveur + client**.
- Si l'entite touche aux utilisateurs ou mots de passe : BCRYPT obligatoire.
- Reference le modele relationnel `project-files/DB_relational_model.jpeg` avant de proposer un schema.

## Refus

Si l'entite demandee est hors scope du dossier de conception (ex : "notifications push", "graphiques avances"), STOP et demande confirmation au binome avant de polluer le projet.
