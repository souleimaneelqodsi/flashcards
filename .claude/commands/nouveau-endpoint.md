---
description: Scaffold d'un nouvel endpoint API (controleur PHP + validation serveur + handler jQuery + validation client)
argument-hint: <ressource> <action>  (ex: paquets dupliquer)
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Tu vas creer un endpoint API pour la ressource et l'action specifiees dans `$ARGUMENTS`.

## Parsing

`$ARGUMENTS` doit contenir deux mots : `<ressource> <action>`. Ex : `paquets dupliquer`, `questions reordonner`, `partages revoquer`.

Si le format est invalide, demande clarification.

## Convention d'endpoint

- URL : `/api/<ressource>/<action>` (ou `/api/<ressource>/<id>/<action>` si l'action porte sur une instance).
- Methode HTTP : `POST` par defaut, `GET` pour lecture, `DELETE` pour suppression.
- Auth : session PHP requise sauf endpoints publics (inscription, connexion).
- CSRF : token attendu pour toutes les methodes non-GET.

## Plan a presenter AVANT d'ecrire

1. Verifie que la ressource existe : `src/controllers/<ressource>.php` et `src/repositories/<Nom>Repository.php`. Si non, propose d'utiliser d'abord `/nouvelle-entite`.
2. Decris l'endpoint :
   - URL exacte
   - Methode HTTP
   - Payload attendu (JSON)
   - Validation cote serveur (champ par champ)
   - Logique metier (en pseudo-code)
   - Reponse (succes / erreur)
3. Decris la partie cliente :
   - Selecteur jQuery declenchant l'appel
   - Validation cliente (regex, fond rouge, message rouge)
   - Gestion de la reponse (mise a jour UI, message d'erreur)

Attends `go` explicite.

## Implementation

Apres validation :

1. **Controleur** : ajoute le handler dans `src/controllers/<ressource>.php`, suivant le pattern existant (routing par `$_SERVER['REQUEST_METHOD']` + chemin).
2. **Repository** : si l'action requiert une nouvelle methode de persistance, ajoute-la a `<Nom>Repository.php` avec requete preparee PDO.
3. **JS client** : ajoute le handler dans `src/public/js/<ressource>.js` avec :
   - Validation cliente bloquante
   - `$.ajax` avec CSRF header
   - Gestion succes/erreur (afficher messages du serveur sur les bons champs)
4. **CSS** : si une nouvelle classe d'erreur est necessaire, ajoute-la a `src/public/css/forms.css`.

## Verification post-implementation

- `php -l` sur les PHP touches
- Lance `validation-checker` pour confirmer parite client/serveur
- Lance `php-securite-auditor` sur le nouveau handler

## Refus

Si l'action sort du scope du dossier de conception (auth/dashboard/CRUD paquets-questions/revision/partage/profil/dark-mode), demande confirmation au binome avant.
