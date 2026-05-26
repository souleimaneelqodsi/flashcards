# Justifications des choix UX

> Section de rapport — couvre la micro-tache **DOC-UI.3** (1 pt).
> Cette section explique le **pourquoi** des decisions UX prises par
> l'equipe, notamment celles qui s'ecartent volontairement du mockup
> fourni ou qui ont demande un arbitrage technique.

---

## 1. Dashboard en deux colonnes plutot que des onglets

### Le constat

Le mockup `dashboard.png` montre les deux listes "Mes paquets" et
"Partages avec moi" sous forme d'**onglets** : un seul est visible a
la fois, l'utilisateur doit cliquer pour basculer.

### La decision

Nous avons implemente une presentation en **deux colonnes cote a cote**
(flexbox), conforme a la formulation litterale du sujet TER :

> "L'ecran est separe en deux zones."

### Pourquoi cette interpretation

Quatre arguments soutiennent ce choix.

1. **Conformite au sujet officiel** : le texte du sujet prime sur le
   mockup quand les deux divergent (CLAUDE.md, source d'autorite).
   "Deux zones" admet plusieurs interpretations visuelles, dont les
   deux colonnes.
2. **Gain pour l'utilisateur** : la vision simultanee evite un clic
   supplementaire pour basculer entre les deux listes. L'utilisateur
   voit en un coup d'oeil son patrimoine personnel et les contenus
   recus.
3. **Coherence des comportements** : un tri par date decroissante n'a
   de sens que si les paquets recents sont visibles. En onglets, le
   tri du second onglet n'est pas observable. En colonnes, les deux
   listes sont triees independamment et toujours visibles.
4. **Responsive** : en dessous de 900 px de large, les colonnes
   s'empilent verticalement (`flex-direction: column` via media query).
   Le comportement est explicite, plus simple que de reflechir a un
   comportement different d'onglets en mobile.

### Tracabilite

- La decision est consignee dans `CLAUDE.md §5` (source d'autorite du
  projet).
- Un commentaire en en-tete de `src/public/css/dashboard.css` rappelle
  la decision aux developpeurs futurs.
- Le HTML utilise un libelle explicite (`section[aria-labelledby]`)
  pour chaque colonne.

---

## 2. Flip de carte en `.toggle()` jQuery plutot que `transform: rotateY` 3D

### Le constat

Pour le mode revision Anki, le mockup montre une carte qui semble
"retournee" entre face question et face reponse. L'implementation
visuellement la plus impressionnante serait une **transformation 3D
CSS** :

```css
.carte { transform-style: preserve-3d; transition: transform .6s; }
.carte.flipped { transform: rotateY(180deg); }
.carte-recto, .carte-verso { backface-visibility: hidden; position: absolute; }
.carte-verso { transform: rotateY(180deg); }
```

### La decision

Nous avons opte pour une **bascule simple** via `.hide()` / `.show()`
jQuery :

```javascript
function basculer_face_carte() {
    if ($("#study-carte-recto").is(":visible")) {
        afficher_face_verso();
    } else {
        afficher_face_recto();
    }
}
```

### Pourquoi ce choix

Trois raisons.

1. **Perimetre cours** : `transform-style: preserve-3d`,
   `backface-visibility`, `perspective` et la composition de
   transformations 3D ne sont **pas explicitement enseignes** dans
   `project-files/initiation-HTML-CSS.pdf`. Le sujet TER penalise tout
   code suspect d'avoir ete copie-colle ou genere sans comprehension.
   En cas de doute sur une API, la consigne est : alternative dans le
   perimetre.
2. **Code lisible et explicable** : la fonction `basculer_face_carte()`
   tient en 6 lignes et est explicable a l'oral en une phrase. Une
   solution 3D necessiterait de comprendre la composition de
   transformations 3D et le rendu backface, ce qui depasse l'objectif
   pedagogique de cette tache.
3. **Robustesse navigateur** : la 3D CSS impose des prefixes vendeurs
   et peut se comporter differemment selon le navigateur. La
   manipulation d'affichage par show/hide est universelle.

### Compromis assume

Le rendu visuel est moins spectaculaire qu'une vraie animation 3D. C'est
un choix explicite : la fonctionnalite (reveler la reponse) prime sur
l'effet visuel. La transition reste agreable grace a une legere
elevation au survol (`transform: translateY(-2px)`).

---

## 3. Navigation par clavier en plus de la souris

### Le constat

Le mockup `current_revision.png` montre des indicateurs textuels en pied
de carte : `Espace retourner la carte`, `1 je savais`, `2 a revoir`,
`← → naviguer`. Cela suggere que le clavier doit etre une voie de
navigation a part entiere, pas un complement.

### La decision

Nous avons implemente une **navigation clavier complete** dans le mode
revision, en plus de la navigation a la souris :

| Touche | Action |
|---|---|
| `Espace` | Flip de la carte (recto <-> verso) |
| `1` | "Je savais" (uniquement quand la reponse est revelee) |
| `2` | "A revoir" (uniquement quand la reponse est revelee) |
| `←` | Question precedente |
| `→` | Question suivante |
| `Entree` | (sur une carte ou un element focusable) Activer l'action |

### Pourquoi ce choix

1. **Conformite mockup** : les indicateurs visibles dans `current_revision.png`
   sont une promesse implicite faite a l'utilisateur ; les implementer
   est attendu.
2. **Accessibilite** : la navigation clavier est essentielle pour les
   utilisateurs sans souris (handicap, preference, productivite). La
   norme WCAG la requiert.
3. **Productivite** : la revision en mode Anki est repetitive. Pouvoir
   evaluer rapidement avec `1`/`2` au lieu de cliquer accelere
   significativement les sessions.
4. **Coherence des cartes-paquet du dashboard** : les cartes-paquet
   sont egalement focusables (`tabindex="0"`) et activables a la
   touche `Entree` (cf. DASH-1.6). Le pattern est uniforme dans
   l'application.

### Garde-fou implemente

Les raccourcis `1` et `2` ne s'activent que lorsque l'etat de la
session est `R_revelee`. Sans cette garde, l'utilisateur pourrait
evaluer une question dont il n'a pas encore vu la reponse, ce qui
n'aurait pas de sens. Implementation en flags JavaScript simples (cf.
section "Machine d'etats" du rapport, DOC-FONC).

---

## 4. Validation rouge dynamique (keyup/blur) avec recap en pied de formulaire

### Le constat

Le sujet TER impose une validation des formulaires en deux temps :
client (JS) **et** serveur (PHP). Cote client, le pattern usuel est de
valider au submit. Mais ce pattern reactif est tardif : l'utilisateur
ne voit son erreur qu'au moment de cliquer "Envoyer".

### La decision

Pattern de validation **proactif** :

1. **Au `blur`** d'un champ : verification immediate. Si invalide →
   ajout de la classe `.champ-invalide` (fond rouge clair, bordure
   rouge, texte rouge) + affichage du message d'erreur juste sous le
   champ.
2. **Au `keyup`** d'un champ deja signale invalide : on retire le
   feedback rouge des que la saisie devient valide (pour ne pas garder
   un rouge alors que l'utilisateur corrige).
3. **Au submit** : revalidation complete + affichage d'un **recap rouge
   en pied de formulaire** listant toutes les erreurs restantes.
4. **Submit bloque** tant qu'au moins une erreur subsiste.

### Pourquoi ce choix

1. **Pattern impose par CLAUDE.md §6** : ce comportement est ecrit
   noir sur blanc dans le brief du projet, derive de l'exigence du
   sujet ("le champ doit virer au rouge des qu'une mauvaise entree
   est detectee").
2. **Confort utilisateur** : le feedback temps reel evite les
   resaisies. L'utilisateur sait immediatement quel champ pose
   probleme et peut corriger sans attendre le submit.
3. **Pedagogie de l'erreur** : le message sous le champ est explicite
   ("La question est obligatoire", "Le titre est obligatoire (150
   caracteres maximum)"), pas un generique "Erreur". Cela aide a la
   correction.
4. **Defense en profondeur** : le recap en pied de formulaire
   accommode les utilisateurs qui scroll au bas d'un formulaire long
   et veulent une vue d'ensemble. C'est aussi un point d'accroche
   accessible aux lecteurs d'ecran (annonce d'erreurs groupee).

### Ajustement applique (commit `015411d`)

Initialement, le rouge etait declenche **au keyup** des la premiere
frappe. Cela donnait l'impression que le champ etait invalide alors
que l'utilisateur etait en train de saisir. Apres retour utilisateur,
nous avons ajuste : le rouge ne s'affiche qu'**au blur** (sortie de
champ) ; le keyup ne fait que **lever** une erreur deja signalee. Plus
agreable.

---

## 5. Paquets cliquables partout (carte + titre) avec gardes sur les boutons internes

### Le constat

Le sujet TER specifie litteralement :

> "Un clic sur la card / le titre amene a l'ecran de visualisation du paquet."

Sur une carte-paquet, il y a aussi des boutons internes ("Reviser",
"Editer") qui ont leurs propres actions. Ces deux comportements
peuvent entrer en conflit a cause du **bubbling** d'evenements.

### La decision

Nous avons rendu toute la carte cliquable, **y compris les zones vides**
entre les elements, avec un seul handler pose sur l'element racine de
la carte :

```javascript
carte.on("click", function () {
    naviguer_vers_paquet(paquet.id_paquet);
});
```

Les boutons internes appellent `evenement.stopPropagation()` pour
empecher le bubbling :

```javascript
bouton_reviser.on("click", function (evenement) {
    evenement.stopPropagation();
    // ... action propre au bouton ...
});
```

### Pourquoi ce choix

1. **Conformite au sujet** : "n'importe ou sur la card" inclut les
   zones vides (titre, theme, barre de progression). Un handler
   unique sur l'`<article>` racine est plus simple que d'ajouter un
   handler sur chaque sous-element.
2. **Maintenance** : un seul point d'attache pour la navigation. Si
   on modifie la structure interne de la carte, le clic continue de
   fonctionner sans toucher au JS.
3. **Accessibilite clavier** : la carte est focusable (`tabindex="0"`,
   `role="link"`, `aria-label="Ouvrir le paquet : <titre>"`) et la
   touche `Entree` declenche la meme action que le clic.

### Pattern reutilise

Le meme principe (handler racine + `stopPropagation` interne) est
applique sur les items de la liste des questions en mode edition :
un clic sur la question ouvre la modale d'edition, mais un clic sur
la croix de suppression ou sur un badge de difficulte ne declenche
pas la modale.

---

## 6. Modales reutilisees plutot que dupliquees (ajout / edition de question)

### Le constat

L'ajout d'une nouvelle question et l'edition d'une question existante
sont deux actions tres similaires : meme formulaire (Q, R, difficulte),
memes validations, meme mise en forme.

### La decision

Une **seule modale** dans le DOM (`#modale-ajout-question`), avec un
**mode interne** (`modale_mode`) pour distinguer l'ajout de l'edition :

- Mode `"ajout"` : titre "Ajouter une question", bouton "Ajouter la
  question", champs vides.
- Mode `"edition"` : titre "Modifier la question", bouton "Mettre a
  jour", champs pre-remplis avec les valeurs de la question ciblee.

### Pourquoi ce choix

1. **Code plus court** : une seule modale, un seul handler de validation,
   une seule logique de fermeture. Pas de duplication.
2. **Coherence visuelle** : l'utilisateur retrouve un layout identique
   pour les deux operations, ce qui reduit la charge cognitive.
3. **Maintenance** : un correctif applique a la modale (par exemple
   le `fix(edition-paquet)` qui corrige la cascade CSS sur l'attribut
   `[hidden]`) profite immediatement aux deux modes.

### Alternative ecartee

Avoir deux modales distinctes (`#modale-ajout` et `#modale-edition`)
aurait double le HTML, le CSS specifique, et la logique. Le seul gain
aurait ete de pouvoir personnaliser chaque modale a l'extreme, ce qui
n'a pas de cas d'usage concret ici.

---

## 7. Pas d'emoji dans l'interface, malgre les mockups

### Le constat

Plusieurs mockups (`dashboard.png` avec "Bonjour, Jean 👋",
`end_of_session.png` avec un emoji confetti) utilisent des emojis pour
agrementer l'experience.

### La decision

Aucun emoji dans le code livre. Tous les emojis du mockup sont remplaces
par des SVG inline (icones lineaires) ou supprimes purement.

### Pourquoi ce choix

1. **Contrainte CLAUDE.md §8** : "Aucun emoji dans le code, les
   commentaires, le rapport, l'UI. Le projet est academique et note."
2. **Rendu inegal** : les emojis dependent de la police systeme de
   chaque OS. Sur certains navigateurs/postes, ils s'affichent en noir
   et blanc ou en style different.
3. **Accessibilite** : un emoji est moins explicite pour un lecteur
   d'ecran qu'une icone SVG avec un `aria-label` precis.

### Alternative utilisee

Tous les SVG inline du projet ont :
- `aria-hidden="true"` quand ils sont decoratifs (a cote d'un texte
  explicite).
- Un `aria-label` sur l'element parent quand ils sont seuls (boutons
  icone, croix de suppression).

---

## 8. Donnees stub en Phase 2 frontend, branchement reporte a FULL-2

### Le constat

Le mode revision et le dashboard affichent des paquets et des questions
concrets, alors qu'au moment de FRONT-2, le backend Phase 2
(`AUTH-2`, `BACK-2`) n'avait pas encore expose les endpoints
`GET /api/paquets`, `GET /api/questions`, `POST /api/paquets/:id/session`.

### La decision

Coder l'interface **avec des stubs JavaScript** (tableaux en dur dans
`dashboard.js` / `study.js`) plutot que d'attendre les endpoints.

### Pourquoi ce choix

1. **Decouplage des taches** : les phases sont decoupees pour permettre
   un travail parallele. Frontend et backend avancent independamment.
2. **Validation visuelle precoce** : l'equipe peut valider l'interface
   sur des donnees representatives sans dependre de la base.
3. **Branchement futur trivial** : la structure des stubs reflete
   exactement les champs du modele (`id_paquet`, `titre`, `theme`,
   `last_score`, `best_score`, `date_maj`). Quand l'endpoint sera pret
   (FULL-2.8), il suffira de remplacer la ligne `var paquets_stub =
   [...]` par un `$.ajax({...})` qui appelle la meme fonction
   d'affichage.

### Tracabilite

Le commit `ed3b181` ("chore(dashboard): retire les paquets placeholder
(etat vide en attendant l'API FULL-2) [AUTH-GATE.5]") montre la
suppression des stubs apres branchement d'une partie du backend. Le
pattern s'est revele efficace : on retire un tableau, on ajoute un
appel AJAX, le reste de la logique reste identique.

---

## Synthese

Les choix UX du projet repondent a trois exigences combinees :

1. **Le sujet officiel** (qui prime sur les mockups en cas de
   divergence).
2. **Le perimetre des cours** (pas d'API hors PDFs, pas d'effet
   visuel qui demande des connaissances avancees).
3. **L'accessibilite et le confort utilisateur** (navigation clavier,
   validation proactive, paquets cliquables partout).

Chaque ecart par rapport au mockup est documente en commentaire dans le
code (`CLAUDE.md`, `dashboard.css`, etc.) et justifie par un argument
concret. Aucune decision n'est gratuite : toutes peuvent etre defendues
en soutenance par un argument de conformite, de simplicite ou
d'accessibilite.
