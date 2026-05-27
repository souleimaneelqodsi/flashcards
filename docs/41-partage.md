# Partage de paquets et auto-completion

Le sujet TER exige une fonctionnalite de **partage** entre utilisateurs,
avec une **auto-completion** sur le destinataire et un **ecran de
visualisation** qui montre la liste des utilisateurs avec lesquels un
paquet est partage. Cette section decrit l'implementation complete :
endpoints serveur, recherche d'email, modale de partage cote front, et
ecran de visualisation avec chips.

## 1. Vue d'ensemble

Un partage est materialise par une ligne dans la table `partages` :

| Colonne | Role |
|---|---|
| `id_paquet`       | Le paquet partage. |
| `id_destinataire` | L'utilisateur qui recoit l'acces en lecture. |
| `date_partage`    | Date du partage. |

La cle primaire est **composite** (`id_paquet`, `id_destinataire`), ce
qui empeche par construction qu'un meme paquet soit partage deux fois
avec le meme destinataire.

**Regle metier critique** (cf. CLAUDE.md §4) : le partage transfere
l'acces au **contenu** du paquet (titre, theme, questions, possibilite
de reviser), pas la **progression** (`last_score`, `best_score`). Ces
deux champs sont strictement personnels au proprietaire (cf. section
42).

## 2. Auto-completion : GET /api/users/search?q=

### 2.1 Contrat

L'endpoint accepte un parametre de query `q` (debut d'email) et
renvoie jusqu'a 10 utilisateurs dont l'email commence par cette chaine,
**en excluant l'utilisateur courant** (un utilisateur ne se propose pas
a lui-meme).

Verrous :

- **Authentification obligatoire** (un visiteur non connecte ne doit
  pas pouvoir enumerer la base d'utilisateurs).
- **Longueur minimale** : `q` < 2 caracteres -> liste vide sans
  toucher la BD (evite un balayage trop large au premier caractere
  tape).
- **Longueur maximale** : `q` > 150 caracteres -> liste vide (defense
  contre payloads abusifs).
- **Pas de mot de passe** dans la reponse :
  `Utilisateur::toArray()` exclut deja le champ `mot_de_passe`, et le
  SELECT du repository ne le requete meme pas.

### 2.2 Echappement LIKE

Le risque a eviter avec une recherche par prefixe est l'injection des
**wildcards SQL** (`%` et `_`) ou du caractere d'echappement (`\`) par
l'utilisateur. SQLite a une syntaxe particuliere pour activer
l'echappement :

```sql
WHERE email LIKE ? ESCAPE '\'
```

Cote PHP, on echappe la saisie utilisateur avant de concatener le `%`
de fin :

```php
$echappe = str_replace(
    array('\\', '%', '_'),
    array('\\\\', '\\%', '\\_'),
    $prefixe
);
$motif = $echappe . '%';
```

Une recherche pour `"100%"` matchera donc litteralement les emails
commencant par `100%`, et non n'importe quel email contenant `100`. La
verite est garantie par le SQL prepare + la clause `ESCAPE`.

### 2.3 Architecture

- Controleur : `src/controllers/UtilisateurController.php` action
  `search()`.
- Repository : `UtilisateurRepository::rechercher_par_email_partiel`.
- Route : `GET /api/users/search` enregistree dans `index.php`.

## 3. POST /api/paquets/:id/share — ajout d'un destinataire

### 3.1 Les neuf verifications

L'action `PaquetController::partager` enchaine **neuf controles** avant
d'inserer un partage en base. Chaque verification a un cout marginal
faible mais elimine une categorie d'attaque ou de bug :

1. **Token CSRF** valide (`Csrf::verifier_requete`).
2. **Authentification** (`verifier_authentifie`, sinon 401).
3. **id_paquet** valide (regex `^[0-9]+$`, sinon 400).
4. **id_destinataire** valide (helper `lire_id_destinataire`, defense
   contre types non-int, sinon 400).
5. **Paquet existe** (sinon 404).
6. **L'utilisateur courant est proprietaire** du paquet (sinon 403 :
   un destinataire ne peut pas re-partager un paquet recu).
7. **Le destinataire n'est pas le proprietaire lui-meme** (sinon 400 :
   "partage a soi-meme" sans interet metier).
8. **Le destinataire existe** en BD (sinon 400 : un client malveillant
   pourrait envoyer un id arbitraire).
9. **Le partage n'existe pas deja** (sinon 409 Conflict : evite le
   doublon et donne un retour utilisateur lisible plutot que de se
   reposer sur la contrainte PK).

### 3.2 Persistance via Factory + Repository

```php
$partage = Partage::creer($id_paquet, $id_destinataire);  // Factory
$this->partages->creer($partage);                          // Repository
```

La date de partage est positionnee au jour courant par la Factory. Le
controleur ne pilote aucun SQL.

## 4. DELETE /api/paquets/:id/share/:userId — retrait

Endpoint symetrique au precedent. Le proprietaire reste seul habilite
a retirer un destinataire : un destinataire qui voudrait se "desabonner"
lui-meme devrait demander au proprietaire (ou un endpoint dedie pourra
etre ajoute plus tard).

La suppression est **idempotente** : meme si le partage n'existait
pas, on renvoie 200. Cela facilite l'experience utilisateur (cliquer
deux fois sur la croix ne genere pas d'erreur).

## 5. Ecran de visualisation : GET /api/paquets/:id

### 5.1 Contrat

Renvoie tout ce qu'il faut pour rendre l'ecran de visualisation :

```json
{
    "paquet":           { "id_paquet": 1, "titre": "...", ... },
    "proprietaire":     { "id_user": 1, "email": "...", "nom": "...", "prenom": "..." },
    "destinataires":    [ { "id_user": 2, ... }, { ... } ],
    "est_proprietaire": true
}
```

Le booleen `est_proprietaire` est calcule cote serveur a partir de la
session. C'est ce flag que le front utilise pour decider d'afficher ou
non les boutons Editer / Partager / Supprimer (cf. 6.3) et le X de
retrait sur chaque chip (cf. 6.4).

### 5.2 Acces "proprietaire ou destinataire"

Un visiteur quelconque ne doit pas pouvoir consulter la liste des
destinataires d'un paquet. La regle d'acces est :

```php
$est_proprietaire = ($paquet->getIdProprietaire() === $id_user);
if (!$est_proprietaire) {
    $est_destinataire = $this->partages->existe($id_paquet, $id_user);
    if (!$est_destinataire) {
        $this->repondre(array('erreur' => 'Acces refuse.'), 403);
        return;
    }
}
```

Aucune fuite de mot de passe : `Utilisateur::toArray()` les exclut, et
`PartageRepository::lister_destinataires_par_paquet` fait un SELECT
explicite des colonnes a renvoyer (jamais `*`).

## 6. UI du partage cote client

### 6.1 Trigger : bouton "Partager" sur les cards dashboard

Sur chaque card paquet du dashboard (colonne "Mes paquets"
uniquement, jamais "Partages avec moi"), un bouton **Partager** ouvre
la modale via :

```javascript
window.ouvrir_modale_partage(paquet.id_paquet, paquet.titre);
```

Le meme bouton est present sur l'ecran de visualisation (`vue-
visualisation-paquet`) cote actions.

### 6.2 Modale de partage (`#modale-partage`)

Reference visuelle : `project-files/interface/share_bag.png`. La
modale comporte :

- un en-tete avec le titre du paquet partage,
- un champ de recherche avec icone loupe (`#partage-recherche`),
- une zone de resultats (`#partage-resultats`) avec une **liste
  d'items cliquables** (avatar avec initiales et degrade, nom prenom,
  email),
- un bandeau informatif qui se contextualise avec le nom du
  destinataire selectionne ("X recevra un acces en lecture seule..."),
- les boutons "Annuler" et "Partager avec X" (le second n'est actif
  qu'apres selection d'un item).

**Implementation : jQuery vanilla** (`src/public/js/share-modal.js`),
sans jQuery UI (CLAUDE.md §2 : pas de lib externe hors stack). La
recherche utilise un **debounce de 250 ms** via
`setTimeout`/`clearTimeout` :

```javascript
function declencher_recherche() {
    if (timer_recherche !== null) {
        clearTimeout(timer_recherche);
    }
    timer_recherche = setTimeout(function () {
        faire_recherche();
    }, 250);
}
```

Sans ce debounce, chaque touche tapee declencherait une requete
reseau ; avec 250 ms, l'utilisateur peut taper "alice" en une fois et
on n'envoie qu'**une seule** requete `GET /api/users/search?q=alice`.

### 6.3 Selection d'un destinataire

Au clic sur un item, le destinataire selectionne est memorise dans une
variable de module (`destinataire_selectionne`) et :

- l'item recoit la classe `.partage-item-selectionne` (fond violet
  pale + bordure violette + checkmark visible),
- le libelle du bouton devient "Partager avec X",
- le bandeau info se met a jour avec le nom complet.

Si l'utilisateur modifie le champ de recherche apres une selection, la
selection est annulee (le bouton "Partager" repasse en disabled) :
on ne partage jamais a un utilisateur "demode" par rapport au champ
visible.

### 6.4 Ecran de visualisation : chips destinataires (VIEW-1.1)

Sur `#visualisation-paquet-<id>`, la section "Destinataires du
partage" affiche un **chip** par destinataire :

- avatar circulaire avec initiales et degrade (palette deterministe
  selon `id_user % 3`),
- nom prenom,
- email,
- **bouton X de retrait** (visible uniquement pour le proprietaire).

Au clic sur le X, une confirmation `window.confirm` est demandee, puis
`DELETE /api/paquets/:id/share/:userId` est appele. Sur succes :

- le chip est retire du DOM (`element_chip.remove()`),
- le compteur "N personnes" est mis a jour,
- si c'etait le dernier destinataire, l'etat vide
  ("Ce paquet n'est partage avec personne pour l'instant.") est
  affiche a la place de la liste,
- un toast de confirmation est emis.

### 6.5 Visibilite cote destinataire

Lorsqu'un destinataire ouvre la visualisation d'un paquet qui lui est
partage (`est_proprietaire: false` dans la reponse) :

- les boutons Editer, Supprimer, Partager sont **masques** ;
- seul le bouton Reviser est present ;
- les chips de la liste des destinataires sont **affiches mais sans
  bouton X** (un destinataire ne peut pas retirer un autre
  destinataire).

## 7. Connexion au dashboard

### 7.1 Colonne "Partages avec moi" : GET /api/paquets/shared

Cote serveur, `PaquetRepository::trouver_partages_avec` fait un JOIN
entre `paquets` et `partages` avec `WHERE pa.id_destinataire = ?
ORDER BY pa.date_partage DESC`. Le tri est garanti SQL (le front ne
re-trie pas).

Cote front, `dashboard.js::charger_partages_avec_moi` appelle
l'endpoint et rend les cards dans la colonne droite. Les cards
"Partages avec moi" n'exposent ni Editer ni Partager (parametre
`est_proprietaire = false` passe au renderer).

### 7.2 Note technique : ordre de declaration du routeur

`/api/paquets/shared` est une route **exacte**, alors que
`/api/paquets/:id` est une route **a placeholder**. Le routeur
(`src/core/Router.php`) verifie d'abord les routes exactes, donc
l'appel a `/api/paquets/shared` est correctement dispatche meme si
les patterns `:id` sont declares apres. Sans cette priorite,
`/api/paquets/shared` serait avale par le pattern `:id` et `"shared"`
serait interprete comme un id (echec 400).

## 8. Tests fonctionnels recommandes

| Cas | Resultat attendu |
|---|---|
| Alice tape "bo" dans la modale → Bob apparait | Liste auto-complete affichee apres ~250 ms |
| Alice tente de partager a elle-meme | 400 "Vous ne pouvez pas partager a vous-meme" |
| Alice re-partage P1 a Bob (deja partage) | 409 Conflict, recap d'erreur affiche |
| Alice retire Bob via le X | Chip retire du DOM, BD a 0 ligne pour ce couple |
| Bob ouvre `#visualisation-paquet-X` de P1 (partage avec lui) | 200 OK, est_proprietaire=false, pas de bouton Editer/Supprimer |
| Charlie (ni proprio ni destinataire) tente d'ouvrir | 403 Acces refuse |
| Tape `%` dans la recherche | 0 resultats (echappe litteralement) |

## 9. Conformite aux maquettes

| Element du mockup `share_bag.png` | Implementation |
|---|---|
| Titre "Partager ce paquet" + sous-titre = nom du paquet | OK |
| Label "RECHERCHER UN UTILISATEUR" uppercase | OK |
| Champ avec icone loupe a gauche | OK |
| Items avec avatar circulaire + initiales + degrade | 3 degrades deterministes (violet/orange/bleu) |
| Etat selectionne : fond violet pale + checkmark a droite | OK |
| Bandeau info contextualise avec le nom selectionne | OK |
| Bouton "Partager avec X" qui se met a jour | OK |

L'ecran de visualisation (chips + X de retrait) n'est pas explicitement
mockupe : son design suit la palette de la modale de partage (memes
avatars et memes couleurs) pour la coherence visuelle.
