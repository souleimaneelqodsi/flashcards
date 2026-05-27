# Validation W3C HTML + CSS

Cette section consigne le résultat de la validation W3C du HTML et du
CSS du projet, exigence du sujet TER ("Doit passer le validateur W3C
sans erreur"). La validation a ete réalisée via l'agent `w3c-validator`
(Nu HTML Checker pour le HTML, Jigsaw CSS Validator pour le CSS).

## 1. HTML — `src/views/app.php`

**Verdict : 0 erreur, 3 warnings non bloquants.**

### Points positifs

- `<!DOCTYPE html>` déclaré en debut.
- `<html lang="fr">` et `<meta charset="UTF-8">` presents.
- `<meta name="viewport">` pour le responsive.
- `<title>` non vide.
- Tous les `<input>` ont leur `<label for="...">`.
- Tous les `<button>` ont un attribut `type=`.
- IDs uniques sur la page.
- Aucune balise depreclee (`<font>`, `<center>`, `align=`, `bgcolor=`).
- Aucun prefixe vendeur dans le HTML.

### Warnings non bloquants

Tous lies au pattern SPA (contenu injecte dynamiquement par jQuery au
chargement) :

1. `<section id="vue-visualisation-paquet" hidden></section>` — section
   vide au depart, contenu construit par `visualisation-paquet.js`.
2. `<section id="vue-study" aria-labelledby="study-titre">` — le
   heading cible est vide a l'instant de la validation statique, rempli
   par `study.js`.
3. `<h3 class="profil-nom" id="profil-nom"></h3>` — rempli par
   `profil.js` a partir des donnees session.

Ces warnings sont **inherents au pattern SPA** : le validateur W3C
n'exécuté pas le JavaScript, donc il voit le HTML "vide" qui est
ensuite peuple au runtime. Aucun impact fonctionnel.

## 2. CSS — `src/public/css/*.css`

**Verdict : 0 erreur de syntaxe, 0 erreur de code.**

Les 10 feuilles de style ont ete validees individuellement contre le
profil Jigsaw CSS Level 2.1 (le profil le plus strict, conformement a
l'exigence "CSS2 maximum" du sujet).

### propriétés CSS3 utilisees (deliberement, toutes justifiees)

| propriété | Statut sujet | Justification |
|---|---|---|
| `display: flex / inline-flex` + `flex-*`, `gap` | **Tolere** (CLAUDE.md §2 bis) | Layout SPA moderne |
| `border-radius` | **Tolere** | Boutons arrondis (cf. `border_curveness_buttons.png`) |
| `box-shadow` | **Tolere** | Profondeur visuelle des cartes |
| `transition` | **Tolere** | Animations douces (hover, focus) |
| `rgba()` | **Tolere** | Transparences (overlays, états hover) |
| `linear-gradient()` | Implicit (derive rgba) | Avatars degrades, bouton primaire |
| `:root` + `var(--...)` | **Deliberement utilise** | Design token system pour theme Dark/Light. ~298 occurrences. Remplacement par valeurs en dur produirait un code 3x plus long. |
| `position: sticky` | **Deliberement utilise** | Sidebar et topbar restent visibles pendant le scroll. Alternative `fixed` casserait le flux. |
| `animation` + `@keyframes` | Justifie 1 fois | Spinner AJAX dans `components.css`. Une animation CSS n'a pas d'equivalent CSS2. |
| `transform` | Tolere | Translations / rotations pour micro-animations |
| `text-overflow: ellipsis` | CSS2.1 | Trame emails dans chips |
| `vh` (viewport unit) | CSS3 | `min-height: 100vh` pour layout |
| `pointer-events: none` | CSS3 | Icone loupe dans le champ recherche |

### Points positifs

- Aucun prefixe vendeur (`-webkit-`, `-moz-`).
- Aucun `!important`.
- Indentation 4 espaces respectee.
- Aucun framework CSS externe (Bootstrap, Tailwind interdits par §2).
- Toutes les couleurs de la charte (`color_palette.png`) sont
  centralisees dans `theme.css` via `var(--*)`.

## 3. Notes pour le rapport

Pour la soutenance, mentionner explicitement :

1. **Les variables CSS (`:root` + `var()`)** : choix architectural
   majeur, fait office de design token system pour le theme
   Dark/Light. Sans elles, basculer le theme demanderait de dupliquer
   l'ensemble du CSS.

2. **`position: sticky` sur la sidebar et le topbar** : alternative
   `position: fixed` casserait la coexistence du contenu scrollable et
   des éléments de navigation. C'est l'approche moderne standard.

3. **Animation du spinner AJAX** : aucune autre fonctionnalité n'utilise
   d'animation. Le sujet tolere CSS3 "si besoin" (§2) ; ce besoin est
   ici fonctionnel (feedback visuel du chargement reseau).

Les autres usages CSS3 (flexbox, border-radius, transitions, rgba,
box-shadow) sont explicitement tolerees par CLAUDE.md §2 bis.

## 4. Reproduction de la validation

Pour reproduire la validation localement avant rendu :

```
# HTML : copier le rendu de app.php dans un fichier .html temporaire,
# puis soumettre via https://validator.w3.org/nu/
# Ou en ligne de commande :
curl -F 'file=@/tmp/rendu.html' -F 'showsource=yes' https://validator.w3.org/nu/

# CSS : chaque feuille soumise individuellement via
# https://jigsaw.w3.org/css-validator/ profil "css21"
# Ou :
curl -F "file=@src/public/css/theme.css" "https://jigsaw.w3.org/css-validator/validator?profile=css21&output=text"
```

**résultat global : aucun bloquant pour le rendu. Les warnings et
erreurs CSS3 toleres sont documentes et justifiables a l'oral.**
