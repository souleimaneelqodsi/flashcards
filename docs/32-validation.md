# 32. Validation des donnees : client ET serveur

Le sujet impose une **double validation** de chaque formulaire : cote
client (jQuery, pour le confort immediat) **et** cote serveur (PHP, pour la
securite). Cette section documente la matrice des regles, leur miroir
client/serveur, et le pattern d'affichage des erreurs (rouge dynamique +
message sous le champ + recapitulatif en bas) impose par CLAUDE.md sec. 6.

## 32.1 Pourquoi valider deux fois

- **Cote client** : retour immediat a l'utilisateur, sans aller-retour
  reseau. Confort uniquement. La validation client est **contournable**
  (un utilisateur peut desactiver JavaScript ou appeler l'API directement).
- **Cote serveur** : c'est la **seule** validation a laquelle on fait
  confiance pour la securite et l'integrite des donnees. Un client
  malveillant ne peut jamais court-circuiter la validation serveur, car
  elle s'execute avant tout acces a la base.

Regle d'or du projet : **toute regle presente cote client doit exister a
l'identique cote serveur**. Les deux ne se remplacent pas, ils se doublent.

## 32.2 Matrice des regles

Regles communes (memes seuils en JS et en PHP) :

| Champ              | Regle                                                  | Validation client | Validation serveur |
|--------------------|--------------------------------------------------------|-------------------|--------------------|
| Email              | format `login@domaine.ext`, longueur <= 150, **unique** | `auth.js` (regex) | `AuthController::valider_inscription` + unicite (409) |
| Mot de passe       | obligatoire, >= 6 caracteres                           | `auth.js`         | `AuthController::valider_inscription` |
| Confirmation MDP   | identique au mot de passe (inscription)                | `auth.js`         | (le serveur ne recoit que le MDP final) |
| Nom / Prenom       | obligatoire, <= 100 caracteres                         | `auth.js`         | `AuthController::valider_inscription` |
| Date de naissance  | format `AAAA-MM-JJ`, date reelle, age entre 7 et 100   | `auth.js`         | `AuthController::valider_inscription` (`checkdate`) |
| Titre de paquet    | obligatoire, <= 150 caracteres                         | `edition-paquet.js` | `PaquetController` |
| Question / Reponse | non vides                                              | `edition-paquet.js` | `QuestionController` |

Les memes regles sont reutilisees pour l'edition du profil
(`UtilisateurController::valider_profil`, identique a l'inscription sans le
mot de passe) et le changement de mot de passe (>= 6 + confirmation).

### La regex email, identique des deux cotes

```js
// src/public/js/auth.js
var REGEX_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
```

```php
// src/controllers/AuthController.php (et UtilisateurController.php)
$regex_email = '/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/';
```

Volontairement identiques : un email accepte par le client est accepte par
le serveur, et inversement. Pas de surprise pour l'utilisateur.

### La date de naissance

Le champ est un `<input type="date">`, dont la valeur est au format ISO
`AAAA-MM-JJ`. Le sujet demande un format `AAAAMMJJ` strict : on le respecte
via le format ISO (memes composantes, separateurs `-` fournis par le
navigateur). La verification se fait en deux niveaux :

1. **Forme** : regex `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` des deux cotes.
2. **Date reelle + age** : cote serveur, `checkdate($mois, $jour, $annee)`
   rejette les dates impossibles (ex : 2023-02-30) ; l'age calcule par
   `BaseController::calculer_age` est borne entre 7 et 100 ans. Cote
   client, `age_a_partir_de` applique la meme borne, et le selecteur de
   date est borne par `min`/`max` (entre il y a 100 ans et il y a 7 ans).

Le serveur **revalide** la date avec `checkdate` meme si le navigateur
garantit deja une date valide : c'est de la **defense en profondeur** (le
serveur ne fait jamais confiance a l'entree client).

## 32.3 Le pattern d'affichage des erreurs (cote client)

CLAUDE.md sec. 6 impose un comportement precis. Il repose sur trois
elements de structure presents dans
[src/views/app.php](../src/views/app.php) pour chaque champ :

```html
<input id="reg-email" class="form-control" ...>
<p class="message-erreur" id="erreur-reg-email" hidden></p>   <!-- message sous le champ -->
...
<div class="recap-erreurs" id="recap-erreurs-register" hidden> <!-- recap en bas -->
    <ul id="liste-erreurs-register"></ul>
</div>
```

Et trois classes CSS dans
[src/public/css/components.css](../src/public/css/components.css), conformes
aux exemples du sujet :

```css
.champ-invalide { background-color: var(--erreur-clair); border: 1px solid var(--erreur); color: var(--erreur); }
.message-erreur { color: var(--erreur); font-size: 13px; margin-top: 4px; }
.recap-erreurs  { color: var(--erreur); padding: 12px; background: var(--erreur-clair); ... }
```

### Rouge dynamique : `blur` pour signaler, `keyup` pour lever

Le sujet exige que le champ devienne rouge **des qu'une mauvaise entree est
detectee**, pas seulement au submit. Notre implementation (dans
[src/public/js/auth.js](../src/public/js/auth.js)) affine ce principe pour
ne pas etre desagreable a la saisie :

- **`blur`** (quand l'utilisateur quitte le champ) : on **signale**
  l'erreur. Si le champ est invalide, on ajoute la classe `.champ-invalide`
  et on affiche le message sous le champ
  (`valider_et_afficher_champ_register`).
- **`keyup`** (pendant la frappe) : on ne fait que **lever** l'erreur
  quand la saisie redevient valide (`nettoyer_champ_register`). On n'ajoute
  jamais d'erreur pendant la frappe, sinon un email a moitie tape rougirait
  des le premier caractere.

```js
// Pose des deux ecouteurs sur chaque champ d'inscription (auth.js)
function brancher_champ_register(nom_champ, id_input, id_message) {
    $("#" + id_input).on("blur", function () {
        valider_et_afficher_champ_register(nom_champ, id_input, id_message);
    });
    $("#" + id_input).on("keyup", function () {
        nettoyer_champ_register(nom_champ, id_input, id_message);
    });
}
```

Les helpers `marquer_champ_invalide` / `marquer_champ_valide` centralisent
l'ajout/retrait de la classe et l'affichage/masquage du message. Le texte
est insere avec `.text()` (et non `.html()`), ce qui evite toute injection
HTML (cf. [33-acces-csrf.md](33-acces-csrf.md)).

### Recapitulatif en bas + submit bloque

Au submit, `valider_login_complet` / `valider_register_complet` repassent
**tous** les champs et construisent un objet d'erreurs. `afficher_recap_erreurs`
liste alors toutes les erreurs dans le bloc `.recap-erreurs` en bas du
formulaire. Tant que cet objet n'est pas vide, la soumission est bloquee :

```js
function soumettre_register(evenement) {
    evenement.preventDefault();
    var erreurs = valider_register_complet();
    rafraichir_affichage_erreurs_register(erreurs);
    // ... compte les erreurs ...
    if (nb_erreurs > 0) {
        return; // submit bloque : aucune requete n'est envoyee
    }
    // sinon : AjaxService.post("auth/inscription", ...)
}
```

## 32.4 Validation serveur et reponse structuree par champ

Cote serveur, chaque validateur renvoie un **tableau associatif
`champ => message`** (et non une simple liste), ce qui permet au client de
repositionner chaque message sous le bon champ :

```php
// AuthController::valider_inscription (extrait)
if ($email === '') {
    $erreurs['email'] = 'L\'email est obligatoire.';
} else if (strlen($email) > 150) {
    $erreurs['email'] = 'L\'email est trop long (150 caractères maximum).';
} else if (!preg_match($regex_email, $email)) {
    $erreurs['email'] = 'Format d\'email invalide.';
}
```

Si des erreurs existent, le controleur repond **400** avec
`{ "erreurs": { "email": "...", "mot_de_passe": "..." } }`. Le front
(`soumettre_register`) detecte ce 400 et rappelle
`rafraichir_affichage_erreurs_register(xhr.responseJSON.erreurs)`, qui
re-affiche exactement comme la validation client : champs en rouge, messages
sous les champs, recap en bas. Le rendu est donc identique, que l'erreur
vienne du client ou du serveur.

### Cas particuliers de codes HTTP

| Situation                          | Code | Traitement front |
|------------------------------------|------|-------------------|
| Champs invalides                   | 400  | erreurs par champ re-affichees |
| Email deja utilise (inscription)   | 409  | champ email en rouge + message |
| Identifiants invalides (login)     | 401  | les deux champs en rouge + recap (message generique) |

## 32.5 Coherence des messages

Les messages d'erreur sont volontairement **identiques** entre le JS et le
PHP (par exemple "Le mot de passe doit faire au moins 6 caractères.").
L'utilisateur voit le meme texte quel que soit le niveau qui a detecte
l'erreur, ce qui rend l'application coherente et previsible.

## 32.6 Conformite au sujet

| Exigence (CLAUDE.md sec. 6) | Implementation |
|------------------------------|----------------|
| Validation client ET serveur, jamais l'un sans l'autre | `auth.js` (client) + `AuthController` / `UtilisateurController` (serveur) |
| Champ rouge des qu'une mauvaise entree est detectee (pas qu'au submit) | `blur` -> `.champ-invalide` |
| Message d'erreur sous le champ | `<p class="message-erreur">` pilote par `marquer_champ_invalide` |
| Recapitulatif en bas du formulaire | `.recap-erreurs` + `afficher_recap_erreurs` |
| Submit bloque tant qu'il reste une erreur | `return` avant l'envoi AJAX si `nb_erreurs > 0` |
| Email unique avec erreur claire | unicite verifiee en base, reponse 409 |

## 32.7 Perimetre des APIs utilisees

Cote JS : selecteurs `$()`, `.on("blur keyup submit")`, `.val()`, `.text()`,
`.addClass`/`.removeClass`, `.attr`/`.removeAttr`, `.empty()`, `.append()`,
`.preventDefault()`, et les regex JavaScript natives (`.test()`) — tout est
dans le perimetre du cours. Cote PHP : `trim`, `strlen`, `preg_match`,
`checkdate`, `substr`, `count` — fonctions standard citees par le sujet.
Aucun plugin de validation externe (pas de jQuery Validate) n'est utilise.
