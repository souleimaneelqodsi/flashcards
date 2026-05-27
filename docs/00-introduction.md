# Introduction

## Contexte du projet

Ce rapport documente le projet TER (Travail d'étude et de Recherche) de M1
MIAGE réalisé dans le cadre de l'UE Programmation Web. L'objectif était de
concevoir et implémenter une application web multi-utilisateurs de gestion de
**flashcards**, inspiree du logiciel Anki, permettant a des étudiants de
créer des fiches de révision, de les organiser en paquets et de les partager
entre utilisateurs.

Le projet a ete réalisé en equipe par **Augustin Lecomte** et
**Souleimane El Qodsi**, avec l'appui de contributions documentaires de
l'ensemble du groupe (Luca, Kenza, etc. selon la repartition des taches).

## périmètre fonctionnel

L'application couvre les fonctionnalités suivantes, telles que définies
dans le sujet TER :

- **Inscription et connexion** : création de compte avec email, mot de passe
  (hache en BCRYPT), date de naissance et avatar ; sessions PHP sécurisées.
- **Tableau de bord** : vue en deux colonnes separant « Mes paquets »
  (créés par l'utilisateur) et « Partages avec moi » (reçus d'autres
  utilisateurs), triees par date decroissante.
- **Gestion de paquets et de questions** : création, édition et suppression
  d'un paquet (titre, theme) et de ses cartes (question, réponse, difficulté).
- **Mode révision** : session de type Anki — carte recto (question), flip au
  clic pour reveler le verso (réponse), boutons Correct / Incorrect,
  calcul et sauvegarde du score en fin de session.
- **Partage** : le propriétaire d'un paquet peut le partager avec un autre
  utilisateur via une modale avec auto-completion par email ; le destinataire
  obtient un accès en lecture seule.
- **Profil utilisateur** : modification du nom, prenom, date de naissance,
  mot de passe et couleur d'avatar.
- **Dark / light mode** : bascule de theme conservee en cookie.

## Stack technique

La stack est imposee par le sujet TER et non negociable :

| Couche | Technologie |
|---|---|
| présentation | HTML5, CSS2/3 |
| Client | JavaScript + jQuery |
| Serveur | PHP (oriente objet) |
| Base de donnees | SQLite (accès PDO uniquement) |
| Communication | AJAX / JSON |

Aucun framework (React, Laravel, Bootstrap…), aucun ORM, aucun outil de
build (Webpack, Vite…) n'a ete utilise. Toutes les APIs JavaScript et PHP
employees sont issues des cours de Programmation Web M1 MIAGE.

## Organisation du rapport

Ce rapport suit la structure thematique des sections :

| Sections | Theme |
|---|---|
| 10–12 | Architecture logicielle, patrons de conception, diagrammes de sequence |
| 20–22 | modèle de donnees, règles metier, scripts SQL |
| 30–33 | sécurité : sessions, BCRYPT, validation, contrôle d'accès et CSRF |
| 40–42 | Fonctionnel : CRUD paquets/questions, partage, mode révision |
| 50–52 | UX / UI : charte graphique, parcours utilisateur, justifications |
| 60–63 | QA : plan de tests, validation W3C, audit sécurité, indentation |

Chaque section est redigee par la personne responsable de la plage numerique
correspondante, conformement a la convention de contribution documentee dans
`docs/README.md`.
