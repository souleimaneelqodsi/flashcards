# Charte graphique et themes Dark/Light

> Section de rapport — couvre la micro-tache **DOC-UI.1** (2 pts).
> Source de verite : `src/public/css/theme.css` et les mockups de
> `project-files/interface/` (`color_palette.png`, `typography.png`,
> `border_curveness_buttons.png`).

---

## 1. Principes generaux

L'identite visuelle de FlashCards MIAGE repose sur un **design system par
tokens** : toutes les valeurs (couleurs, typographie, rayons, ombres)
sont definies en variables CSS dans `:root` puis consommees par `var()`
dans chaque feuille de style. Cette approche garantit trois proprietes :

1. **Coherence visuelle** : aucune couleur litterale n'est dupliquee
   dans les regles ; la palette est appliquee uniformement.
2. **Maintenabilite** : changer la couleur primaire revient a modifier
   une seule ligne dans `theme.css`.
3. **Theme sombre par surcharge** : le mode dark redefinit uniquement
   les tokens dont la valeur differe (surfaces, textes) ; les couleurs
   d'identite (primaire, accent, etats) restent inchangees.

Le basculement clair/sombre est gere cote client par `js/theme.js`
(tache UI-1.5), qui modifie l'attribut `data-theme` sur `<html>` et
persiste le choix dans `localStorage`.

---

## 2. Palette de couleurs

### 2.1 Couleurs d'identite (invariantes entre les themes)

Ces couleurs definissent la marque et restent identiques en mode clair
ou sombre.

| Token | Valeur | Usage |
|---|---|---|
| `--primaire` | `#7C4DFF` | Boutons principaux, liens, accent de la marque, gradient des cartes |
| `--primaire-hover` | `#6B3FE7` | Etat survol des elements primaires |
| `--primaire-clair` | `#EDE7FF` | Backgrounds tres clairs (badge, etat actif navigation, focus) |
| `--primaire-moyen` | `#B388FF` | Gradient (avec primaire) sur la carte recto du mode revision |
| `--accent` | `#FF6584` | Gradient secondaire (associe au primaire), liseres et notifications |

### 2.2 Couleurs d'etat

Reservees aux retours utilisateur (succes / erreur / attention).
Chaque etat dispose d'une variante "claire" pour les fonds discrets.

| Token | Valeur | Usage |
|---|---|---|
| `--succes` | `#22C55E` | Bordure / texte vert (bonne reponse, paquet revise) |
| `--succes-clair` | `#DCFCE7` | Fond vert clair (badge "Facile", pastille correctes) |
| `--erreur` | `#EF4444` | Bordure / texte rouge (champ invalide, mauvaise reponse, suppression) |
| `--erreur-clair` | `#FEE2E2` | Fond rouge clair (badge "Difficile", pastille mauvaises, recap erreurs) |
| `--attention` | `#F59E0B` | Bordure / texte orange (difficulte moyenne, meilleur score) |
| `--attention-clair` | `#FFF3E0` | Fond orange clair (badge "Moyen", pastille best score) |

### 2.3 Surfaces et textes (variantes claire / sombre)

Ces tokens sont **redefinis** dans `[data-theme="dark"]` pour basculer
le mode sombre.

| Token | Theme clair | Theme sombre | Usage |
|---|---|---|---|
| `--fond` | `#F0F2F8` | `#111827` | Fond general de la page |
| `--surface` | `#FFFFFF` | `#1F2937` | Cartes, modales, panneaux |
| `--surface-2` | `#F3F4F6` | `#374151` | Surface secondaire (boutons secondaires, badges neutres) |
| `--texte-primaire` | `#111827` | `#F9FAFB` | Titres, contenu principal |
| `--texte-secondaire` | `#374151` | `#E5E7EB` | Texte courant, libelles de navigation |
| `--texte-tertiaire` | `#6B7280` | `#9CA3AF` | Texte discret (themes, sous-titres) |
| `--texte-discret` | `#9CA3AF` | `#6B7280` | Texte tres discret (placeholder, indicateurs clavier) |
| `--bordure` | `#E5E7EB` | `#374151` | Bordures de tous les composants |

**Remarque sur le contraste** : les valeurs respectent les ratios
WCAG AA pour le texte sur fond (`--texte-primaire` sur `--fond` :
ratio > 13:1 en clair, > 16:1 en sombre).

---

## 3. Typographie

### 3.1 Police

La police principale est **Inter** (Google Fonts), choisie pour sa
lisibilite ecran et son large eventail de graisses. Fallback systeme :
`-apple-system`, `BlinkMacSystemFont`, sans-serif.

Token : `--police: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;`

### 3.2 Hierarchie des tailles et poids

Conforme a `project-files/interface/typography.png`, le projet utilise
six niveaux de typographie, exposes en classes utilitaires.

| Classe | Taille | Poids | Usage |
|---|---|---|---|
| `.txt-display` | 38 px | 800 | Score final ("75%" sur l'ecran de fin de session) |
| `.txt-h1` | 26 px | 800 | Titres principaux (rarement utilise — la topbar suffit) |
| `.txt-h2` | 20 px | 700 | Titre de section ("Tableau de bord", "Nouveau paquet") |
| `.txt-h3` | 16 px | 700 | Titre de carte ou de modale |
| `.txt-body` | 14 px | 400 | Texte courant (paragraphes, libelles) |
| `.txt-caption` | 11 px | 700 (UPPERCASE, letter-spacing .06em) | Etiquettes ("INFORMATIONS DU PAQUET", "QUESTIONS") |

Le `<body>` herite par defaut de `font-family: var(--police)` et
`font-size: 14px` (taille `.txt-body`).

---

## 4. Rayons de bordure (border-radius)

Six rayons couvrent l'ensemble des composants, du plus petit au plus
prononce. Reference : `project-files/interface/border_curveness_buttons.png`.

| Token | Valeur | Usage |
|---|---|---|
| `--radius-petit` | `4 px` | Touches clavier, badges tres petits |
| `--radius` | `8 px` | Boutons secondaires, navigation items, recap erreurs |
| `--radius-moyen` | `12 px` | Cartes-paquet, dashboard-col, modales, panneau study |
| `--radius-grand` | `18 px` | Modales (boite interieure), gros boutons |
| `--radius-tres-grand` | `24 px` | Ecran de fin de session (carte centrale) |
| `--radius-plein` | `9999 px` | Pastilles, badges arrondis, barre de progression, switch |

---

## 5. Ombres

Cinq niveaux d'elevation expriment la profondeur des composants. La
forme `--ombre-carte` est specifique aux cartes-paquet : elle ajoute
une teinte violette discrete (rgba 124,77,255) qui prolonge l'identite
de la marque.

| Token | Forme | Usage |
|---|---|---|
| `--ombre-petite` | `0 1px 2px rgba(0,0,0,.05)` | Boutons, etats neutres |
| `--ombre` | `0 1px 3px ... + 0 1px 2px ...` | Cards generales |
| `--ombre-moyenne` | `0 4px 6px -1px rgba(0,0,0,.1)` | Hover des cartes-paquet |
| `--ombre-grande` | `0 10px 15px -3px rgba(0,0,0,.1)` | (Reserve pour composants en relief) |
| `--ombre-tres-grande` | `0 20px 25px -5px rgba(0,0,0,.15)` | Modales, ecran de fin de session |
| `--ombre-carte` | violet teinte + neutre | Cartes-paquet du dashboard, en-tete de colonnes |

En theme sombre, `--ombre-carte` perd sa teinte violette pour gagner
en intensite (`rgba(0,0,0,.4)`), de facon a rester visible sur fond
sombre.

---

## 6. Bascule clair / sombre — mecanisme

### 6.1 Activation par attribut data-theme

L'ensemble du projet est encapsule par `<html data-theme="light">`. Le
mode sombre s'active en passant `data-theme="dark"`. Le CSS surcharge
alors uniquement les tokens redefinis dans `[data-theme="dark"] { ... }`.

### 6.2 Persistance cote client

Le toggle visible dans le pied de la sidebar (`.theme-switch`) declenche
le handler defini dans `src/public/js/theme.js` :

```javascript
$("#theme-switch").on("click", function () {
    var theme_actuel = $("html").attr("data-theme");
    var nouveau_theme = (theme_actuel === "dark") ? "light" : "dark";
    appliquer_theme(nouveau_theme);
    localStorage.setItem(CLE_THEME, nouveau_theme);
});
```

`localStorage` n'est pas explicitement couvert par le PDF de cours
JavaScript ; son usage est assume comme **auto-formation** (cf.
CLAUDE.md §2 bis) et justifie par sa simplicite d'utilisation. La
preference est conservee entre les sessions du navigateur.

Au chargement de la page, `theme.js` lit `localStorage` et applique
immediatement le theme enregistre, ce qui evite tout "flash" de theme
clair avant la bascule.

---

## 7. Application concrete aux ecrans

Chaque ecran consomme exclusivement les tokens definis ci-dessus. Cela
garantit qu'un utilisateur qui passe du clair au sombre voit l'ensemble
de l'interface basculer de maniere coherente, sans regle CSS oubliee.

| Ecran | Composants concernes | Tokens dominants |
|---|---|---|
| Login / Signup | Cards, inputs | `--surface`, `--bordure`, `--primaire` |
| Dashboard | Cartes-paquet, colonnes | `--primaire`, `--accent` (gradient lisere), `--ombre-carte` |
| Edition paquet | Modale, badges difficulte | `--succes-clair` (Facile), `--attention-clair` (Moyen), `--erreur-clair` (Difficile) |
| Mode revision | Cartes recto/verso, panneau | Gradient `--primaire` -> `--primaire-moyen` (recto), boutons d'evaluation `--succes-clair`/`--erreur-clair` |
| Fin de session | Carte centrale | `--succes`, `--erreur`, `--attention` (stats), gradient violet en arriere-plan |
| Profil | Card identite, stats | `--surface`, `--primaire-clair` |

---

## 8. Limites assumees

- **Pas de variables CSS pour les espacements** : les paddings et
  margins sont en valeurs litterales (`16px`, `22px`, etc.). Un travail
  ulterieur pourrait introduire `--espacement-xs`, `--espacement-s`,
  etc., mais cela n'est pas demande par le sujet.
- **Theme sombre non implemente sur certaines surfaces** : quelques
  couleurs litterales heritées de heuristiques (`#15803D` texte vert,
  `#10B981` gradient verso) persistent dans `study.css` et
  `components.css`. Elles sont visuellement coherentes en mode clair ;
  un audit ulterieur pourra les tokeniser pour un rendu parfait en
  sombre.
- **Variables CSS custom (`var(--token)`)** : la syntaxe `var()` est
  CSS3 et n'est pas garantie par le PDF `initiation-HTML-CSS.pdf`.
  Decision d'equipe assumee (UI-1.2) au benefice de la maintenabilite ;
  a defaut, on aurait du dupliquer les valeurs litterales dans chaque
  regle.

---

## Synthese

La charte graphique du projet repose sur un design system de 27 tokens
CSS (palette, typographie, rayons, ombres) traduisant fidelement les
mockups fournis par l'equipe. La bascule clair/sombre s'effectue par
surcharge des seuls tokens de surface et de texte, garantissant une
identite visuelle stable independamment du theme choisi par
l'utilisateur. Le code de reference est `src/public/css/theme.css` ;
les classes utilitaires `.txt-*` y appartiennent egalement.
