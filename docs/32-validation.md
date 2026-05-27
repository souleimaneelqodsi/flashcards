# Validation client et serveur (DOC-AUTH.3)

Fiche technique : double validation des formulaires d'authentification, matrice
des règles, et pattern d'affichage des erreurs en rouge dynamique.

> Référence d'implémentation : `src/public/js/auth.js` (client),
> `src/controllers/AuthController.php` et `src/core/BaseController.php` (serveur),
> `src/public/css/components.css` (styles d'erreur).
> Synthèse côté rapport : `rapport.md` section 6.3.

---

## 1. Principe de la double validation

Toute donnée saisie est validée **deux fois** :

- **côté client** (`auth.js`), pour le confort : retour visuel immédiat, on évite
  un aller-retour réseau pour une faute évidente. La validation client ne fait
  **jamais** autorité : un client malveillant peut désactiver JavaScript ou forger
  une requête (cURL, Postman) ;
- **côté serveur** (`AuthController::valider_inscription()`), pour la sécurité.
  C'est la seule validation qui protège réellement la base.

La règle d'or : *le client valide pour l'utilisateur, le serveur valide pour la
base.* Les deux sont obligatoires (exigence du sujet TER).

## 2. Matrice des règles (état réel du code)

| Champ | Règle | Côté client (`auth.js`) | Côté serveur (`AuthController`) |
|---|---|---|---|
| Email | Format `login@domaine.ext`, ≤ 150 car. | `REGEX_EMAIL.test(valeur)` + `valeur.length > 150` | même regex + `strlen($email) > 150` |
| Email | Unicité en base | non testable côté client | `chercher_par_email()` + contrainte SQL `UNIQUE` → 409 |
| Mot de passe | ≥ 6 caractères | `valeur.length < 6` | `strlen($mot_de_passe) < 6` |
| Mot de passe | Double saisie identique | `valeur !== valeur_mdp` (champ `mot_de_passe_confirme`) | non transmise (confirmation purement cliente) |
| Date de naissance | Format ISO `AAAA-MM-JJ` | `REGEX_DATE_ISO.test(valeur)` | `preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/')` + `checkdate()` |
| Date de naissance | Âge entre 7 et 100 ans | `age_a_partir_de(valeur)` borné `[7, 100]` | `calculer_age()` borné `[7, 100]` |
| Nom / prénom | Non vide, ≤ 100 caractères | `valeur.length > 100` | `strlen() > 100` |

La regex email est identique au caractère près des deux côtés
(`/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/`), pour un message cohérent
quelle que soit la source. La validation serveur va plus loin sur deux points
qu'un client ne peut pas couvrir seul : `checkdate()` rejette les dates
impossibles (ex. `2021-02-30`), et l'unicité de l'email ne peut être vérifiée
qu'en interrogeant la base.

> **Écart spec / code à arbitrer.** CLAUDE.md section 6 et la matrice actuelle de
> `rapport.md` (ligne 72) décrivent la date au format compact `AAAAMMJJ`
> (8 chiffres). L'implémentation réelle utilise un `<input type="date">` qui
> produit le format **ISO `AAAA-MM-JJ`**, validé par `REGEX_DATE_ISO`
> (`/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/`) côté client et par le même motif côté serveur.
> Le format ISO est cohérent avec le type `DATE` de SQLite (aucune conversion).
> Deux options : (a) aligner CLAUDE.md / rapport.md sur l'ISO réellement
> implémenté, (b) revenir à `AAAAMMJJ` strict côté code. À trancher avec le binôme
> avant le rendu pour éviter une incohérence spec/livrable.

## 3. Pattern d'affichage des erreurs (rouge dynamique)

Le sujet impose un retour visuel dynamique, pas seulement au submit. Le code
distingue deux événements pour ne pas rougir un champ qu'on est en train de
remplir :

- **`blur`** (sortie du champ) : `valider_et_afficher_champ_login()` /
  `valider_et_afficher_champ_register()` recalculent la règle du champ ; si c'est
  invalide, le champ reçoit la classe `.champ-invalide` (fond rouge clair, bordure
  rouge, texte rouge, définis dans `components.css`) et un message explicatif
  s'affiche **sous** le champ via `.message-erreur` ;
- **`keyup`** (pendant la frappe) : `nettoyer_champ_login()` /
  `nettoyer_champ_register()` ne font que **lever** l'erreur si le champ devient
  valide ; elles n'en ajoutent jamais. Ainsi `jean@` (email en cours de saisie)
  ne rougit pas tant que l'utilisateur n'a pas quitté le champ ;
- **avant l'envoi** : `valider_login_complet()` / `valider_register_complet()`
  revalident tous les champs et alimentent un récapitulatif `.recap-erreurs` en
  bas du formulaire (liste `<ul>` de toutes les erreurs en cours) ;
- **blocage** : tant qu'une erreur est présente, `soumettre_login()` /
  `soumettre_register()` interrompent l'envoi (`evenement.preventDefault()`) ;
  aucune requête AJAX ne part.

### Réinjection des erreurs serveur dans le même affichage

Si le serveur détecte des erreurs malgré la validation client (client forgé, ou
règle uniquement testable en base comme l'unicité de l'email),
`AuthController::inscription()` répond `400` avec une carte `erreurs`
champ-par-champ. `auth.js` la réinjecte dans le **même** mécanisme d'affichage :

```js
if (xhr.status === 400 && xhr.responseJSON && xhr.responseJSON.erreurs) {
    rafraichir_affichage_erreurs_register(xhr.responseJSON.erreurs);
    Toast.erreur("Veuillez corriger les erreurs du formulaire.");
    return;
}
```

L'email déjà pris (`409`) marque le champ email en rouge et l'ajoute au récap. Le
rendu visuel est identique que l'erreur vienne du navigateur ou du serveur : c'est
ce qui rend la double validation transparente pour l'utilisateur.

### Classes CSS attendues

```css
.champ-invalide { background-color: #FEE2E2; border: 1px solid #EF4444; color: #EF4444; }
.message-erreur { color: #EF4444; font-size: 13px; margin-top: 4px; }
.recap-erreurs  { color: #EF4444; padding: 12px; background: #FEE2E2; border-radius: 8px; }
```

## 4. Périmètre des APIs utilisées

- **Client** : `$()` sélecteurs, `.on('blur keyup submit')`, `.val()`, `.text()`,
  `.addClass()`/`.removeClass()`, `.append()`/`.empty()`, `.attr()`,
  `evenement.preventDefault()`, regex native (`.test()`). Tout est dans le PDF de
  cours. Pas de `fetch` / `async` / `await` (on passe par `AjaxService`).
- **Serveur** : `preg_match`, `strlen`, `trim`, `checkdate`, `substr`, `date`.
  Périmètre PHP du projet (CLAUDE.md section 2 bis).
