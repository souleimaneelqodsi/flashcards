# Introduction

## Contexte du projet

Ce rapport documente le projet TER (Travail d'Etude et de Recherche) de M1
MIAGE realise dans le cadre de l'UE Programmation Web. L'objectif etait de
concevoir et implémenter une application web multi-utilisateurs de gestion de
**flashcards**, inspiree du logiciel Anki, permettant a des etudiants de
creer des fiches de revision, de les organiser en paquets et de les partager
entre utilisateurs.

Le projet a ete realise en equipe par **Augustin Lecomte** et
**Souleimane El Qodsi**, avec l'appui de contributions documentaires de
l'ensemble du groupe (Luca, Kenza, etc. selon la repartition des taches).

## Perimetre fonctionnel

L'application couvre les fonctionnalites suivantes, telles que definies
dans le sujet TER :

- **Inscription et connexion** : creation de compte avec email, mot de passe
  (hache en BCRYPT), date de naissance et avatar ; sessions PHP securisees.
- **Tableau de bord** : vue en deux colonnes separant « Mes paquets »
  (crees par l'utilisateur) et « Partages avec moi » (recus d'autres
  utilisateurs), triees par date decroissante.
- **Gestion de paquets et de questions** : creation, edition et suppression
  d'un paquet (titre, theme) et de ses cartes (question, reponse, difficulte).
- **Mode revision** : session de type Anki — carte recto (question), flip au
  clic pour reveler le verso (reponse), boutons Correct / Incorrect,
  calcul et sauvegarde du score en fin de session.
- **Partage** : le proprietaire d'un paquet peut le partager avec un autre
  utilisateur via une modale avec auto-completion par email ; le destinataire
  obtient un acces en lecture seule.
- **Profil utilisateur** : modification du nom, prenom, date de naissance,
  mot de passe et couleur d'avatar.
- **Dark / light mode** : bascule de theme conservee en cookie.

## Stack technique

La stack est imposee par le sujet TER et non negociable :

| Couche | Technologie |
|---|---|
| Presentation | HTML5, CSS2/3 |
| Client | JavaScript + jQuery |
| Serveur | PHP (oriente objet) |
| Base de donnees | SQLite (acces PDO uniquement) |
| Communication | AJAX / JSON |

Aucun framework (React, Laravel, Bootstrap…), aucun ORM, aucun outil de
build (Webpack, Vite…) n'a ete utilise. Toutes les APIs JavaScript et PHP
employees sont issues des cours de Programmation Web M1 MIAGE.

## Organisation du rapport

Ce rapport suit la structure thematique des sections :

| Sections | Theme |
|---|---|
| 10–12 | Architecture logicielle, patrons de conception, diagrammes de sequence |
| 20–22 | Modele de donnees, regles metier, scripts SQL |
| 30–33 | Securite : sessions, BCRYPT, validation, controle d'acces et CSRF |
| 40–42 | Fonctionnel : CRUD paquets/questions, partage, mode revision |
| 50–52 | UX / UI : charte graphique, parcours utilisateur, justifications |
| 60–63 | QA : plan de tests, validation W3C, audit securite, indentation |

Chaque section est redigee par la personne responsable de la plage numerique
correspondante, conformement a la convention de contribution documentee dans
`docs/README.md`.
