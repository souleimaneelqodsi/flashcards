---
description: Genere ou met a jour une section du rapport.pdf via l'agent rapport-writer
argument-hint: <section>  (ex: "architecture", "patrons", "organisation-fichiers", "installation")
allowed-tools: Task, Read, Glob, Grep, Write, Edit
---

Genere ou met a jour une section specifique du rapport pour le TER Flashcards.

## Sections valides

| Argument | Section du rapport |
|---|---|
| `introduction` | Introduction, choix du sujet, presentation du binome |
| `architecture` | Architecture MVC + SPA, justification |
| `patrons` | Description et justification de chaque patron utilise (Singleton, Repository, Factory) |
| `modele-donnees` | Description des 5 tables et leurs relations |
| `organisation-fichiers` | Liste fichier par fichier avec description courte |
| `validation-securite` | Section sur la validation client/serveur, BCRYPT, sessions, CSRF, XSS |
| `installation` | Procedure d'installation (renvoi a installation.txt) |
| `conclusion` | Bilan, limites, perspectives |

## Methode

1. Verifie que `$ARGUMENTS` est une section valide. Sinon, liste les sections valides et demande clarification.

2. Cherche si le fichier source du rapport existe :
   - `rapport.md` a la racine (recommande - sera converti en PDF en fin de projet)
   - Sinon, `rapport-sections/<section>.md`
   - Sinon, propose de creer `rapport.md`.

3. Lis la section existante si presente (pour eviter d'ecraser).

4. Invoque l'agent `rapport-writer` via Task avec instruction precise :
   - "Genere/met a jour la section <section> du rapport pour le TER Flashcards. Le contenu doit refleter le code reel (lis src/ avant). Style sobre, francais soutenu, justifications concretes. Pas de copier-coller du sujet."

5. Recupere le texte produit par l'agent et propose-le a l'utilisateur. **N'ecris pas dans rapport.md sans validation**.

6. Apres validation, ecris ou met a jour la section.

7. Rappelle a l'utilisateur :
   - Convertir rapport.md en rapport.pdf avant rendu (pandoc, ou export depuis VS Code/Typora)
   - Le rapport vaut 3/20 - clarte + completude + justifications
