# Parcours utilisateur — wireframes commentes

> Section de rapport — couvre la micro-tache **DOC-UI.2** (2 pts).
> Reference : les mockups de `project-files/interface/`. Lien avec le
> diagramme de cas d'utilisation (chapitre 3-4 du cours).
>
> Chaque ecran est decrit dans son contexte d'usage : *quand* il
> apparait, *quel* objectif il sert, *comment* l'utilisateur navigue
> vers l'ecran suivant.

---

## 1. Cartographie generale des ecrans

Le parcours type d'un utilisateur s'organise autour de neuf ecrans,
regroupes en quatre flux fonctionnels.

```
[ Auth ]                  [ Tableau de bord ]
  Login ──connexion──►        ┌──► Edition d'un paquet ───► Modale ajout question
  Signup ──inscription──►     │                              Modale suppression
                              │
                              ├──► Mode revision (Anki)
                              │    Q affichee ←flip→ R revelee
                              │                       │ savais/revoir
                              │                       v
                              │    Recapitulatif de fin de session
                              │
                              ├──► Visualisation d'un paquet
                              │    (titre + date + proprietaire + destinataires)
                              │      │
                              │      └─► Modale partage
                              │
                              └──► Profil utilisateur
```

Tous ces ecrans sont rendus par la meme page HTML (`src/views/app.php`)
sous forme de **sections** masquees ou visibles. La navigation s'opere
sans rechargement, par modification de `window.location.hash` (cf.
parcours technique en section 11).

---

## 2. Login — `project-files/interface/login.png`

**Quand** : premier ecran rencontre par un utilisateur deja inscrit, ou
apres expiration de sa session.

**Objectif** : authentifier l'utilisateur a partir de son email et de
son mot de passe.

**Structure** :

- Panneau gauche violet avec arguments produit (revisions, partage,
  scoring).
- Panneau droit avec le formulaire (email, mot de passe, bouton
  "Se connecter", lien "Pas encore inscrit ?").

**Validation client** : email au format `login@domaine.extension`, mot
de passe non vide. Champ rouge des le `blur` (cf. CLAUDE.md §6).

**Transition** :

- Succes → bascule sur le **Tableau de bord** via `window.location.hash = "#dashboard"`.
- Echec → message d'erreur global affiche sous le formulaire ; pas de
  navigation.

---

## 3. Inscription — `project-files/interface/signup.png`

**Quand** : utilisateur nouvel arrivant qui clique sur le lien
"Inscription" depuis le Login.

**Objectif** : creer un compte avec un email unique en base.

**Structure** : meme layout 2 colonnes que le Login, mais le formulaire
demande nom, prenom, date de naissance (format `AAAAMMJJ` strict),
email, mot de passe **et** sa confirmation.

**Validation client** :
- Email : format + unicite (verifiee cote serveur, retour 409 si
  l'email est deja pris).
- Mot de passe : longueur >= 6 caracteres.
- Confirmation : doit etre identique au mot de passe avant submit.
- Date de naissance : `AAAAMMJJ` strict.

Chaque champ vire au rouge a la moindre erreur (`keyup`/`blur`), et un
recapitulatif rouge s'affiche en pied de formulaire avant submit.

**Transition** :

- Succes → ouverture automatique d'une session, bascule sur le
  Tableau de bord.
- Echec (email deja pris, MDP non identiques) → message sous le
  champ concerne + recap en bas.

---

## 4. Tableau de bord — `project-files/interface/dashboard.png`

**Quand** : ecran d'accueil apres connexion. Point central de la
navigation.

**Objectif** : montrer en un coup d'oeil les paquets que l'utilisateur
possede et ceux qu'on lui a partages.

**Decision d'equipe** : le mockup montre des **onglets** ("Mes paquets" /
"Partages avec moi"). Nous avons implemente **deux colonnes cote a
cote**, conforme a la formulation du sujet ("l'ecran est separe en
deux zones"). Cette exception est documentee dans la section "Choix UX"
(DOC-UI.3).

**Structure** :

- Sidebar gauche : navigation (Tableau de bord, Nouveau paquet,
  Partages avec moi, Profil) + bandeau utilisateur (avatar JD + nom).
- Topbar : titre + barre de recherche + notifications + avatar.
- Bandeau "Bonjour, Jean" + bouton primaire "Nouveau paquet" en haut a
  droite.
- Deux colonnes flexbox :
  - **Mes paquets** (gauche) : liste de cartes-paquet triees par
    `date_maj` decroissante. Chaque carte affiche titre, theme, badge
    "X cartes", barre de progression (best_score), ligne "Record :
    N% / Dernier : N% / Mise a jour : Il y a N j", et boutons
    "Reviser" / "Editer".
  - **Partages avec moi** (droite) : meme composant, mais l'utilisateur
    n'est pas proprietaire (donc pas de bouton "Editer", et les scores
    affiches sont ceux du proprietaire).

**Etat vide** : un paquet sans `last_score`/`best_score` affiche
"Jamais revise" au lieu de la triplette de scores.

**Transitions** :

- Clic sur une carte (n'importe ou sauf les boutons internes) →
  ouverture de l'**Ecran de visualisation** d'un paquet, route
  `#paquet-<id>`. Le bubbling est intercepte sur les boutons internes
  par `stopPropagation()`.
- Clic sur "Reviser" → lancement de la **Session d'etude**
  (`#study-<id>`).
- Clic sur "Editer" → ouverture de la **Vue d'edition**
  (`#paquet-<id>/edition`).
- Clic sur "Nouveau paquet" → ouverture de la **Vue d'edition** en
  mode creation (`#nouveau-paquet`).
- Clic sur l'avatar / le bandeau sidebar → ouverture du **Profil**
  (`#profil`).

---

## 5. Edition d'un paquet — `project-files/interface/new_bag.png`

**Quand** : a la creation d'un paquet ("Nouveau paquet") ou a son
edition ("Editer" sur une carte).

**Objectif** : saisir / modifier le titre, le theme et les questions
qui composent le paquet.

**Structure** :

- En-tete : fleche retour vers le dashboard + titre dynamique
  ("Nouveau paquet" ou nom du paquet) + boutons "Annuler" / "Enregistrer
  le paquet" a droite.
- Layout deux colonnes :
  - **Informations du paquet** (gauche, 360 px) : titre (compteur
    "X / 150 caracteres" sous le champ), theme, **carte d'apercu**
    (gradient violet/rose qui reflete en live le titre + theme + nombre
    de cartes).
  - **Questions** (droite, flex 1) : liste des questions du paquet, un
    bouton "+ Ajouter une question" en pied. Chaque question affiche
    son numero, son enonce, un apercu de la reponse, le selecteur de
    difficulte (Facile / Moyen / Difficile), et une croix de
    suppression.

**Interactions cles** :

- **Ajout** d'une question : clic sur "+ Ajouter une question" →
  ouverture d'une **modale** (titre Q, contenu R, difficulte). Validation
  rouge dynamique sur Q et R. Submit → la question est ajoutee en fin
  de liste, le compteur est mis a jour, la modale se ferme.
- **Edition** d'une question : clic n'importe ou sur la question →
  ouverture de la meme modale en mode "Modifier la question",
  pre-remplie avec les valeurs actuelles.
- **Suppression** : clic sur la croix → **modale de confirmation** avec
  bouton destructif rouge. Apres confirmation, la question est retiree
  du DOM et les questions restantes sont renumerotees.
- **Changement de difficulte inline** : clic sur un badge de difficulte
  dans la liste → toggle direct (sans modale), avec `stopPropagation()`
  pour ne pas declencher l'edition complete.

**Transition** : "Annuler" et la fleche retour ramenent au dashboard.
"Enregistrer le paquet" valide d'abord le titre (non vide, <= 150
caracteres) avant d'envoyer (la persistance reelle est prevue en
FULL-2.5/2.6).

---

## 6. Visualisation d'un paquet (vue cible — implementation FULL-2)

**Quand** : clic sur une carte-paquet depuis le dashboard. Route
`#paquet-<id>`.

**Objectif** : afficher le **detail** d'un paquet et la liste des
utilisateurs qui peuvent le voir (exigence sujet TER).

**Structure prevue** :

- Titre du paquet, date d'ajout, proprietaire.
- Liste des questions (lecture seule).
- Liste des **destinataires** du partage (chips avec nom + bouton
  retirer si l'utilisateur courant est proprietaire).
- Si proprietaire : liens "Editer" et "Supprimer".

**Etat actuel** : l'ecran sera implemente en FULL-2.16 / FULL-2.17. La
route `#paquet-<id>` est deja reconnue par le dispatcher SPA, qui
retombera sur le dashboard tant que la vue n'existe pas.

---

## 7. Mode revision — `project-files/interface/question_give_response.png` + `current_revision.png`

**Quand** : clic sur "Reviser" depuis une carte-paquet du dashboard, ou
clic sur "Recommencer" depuis l'ecran de fin de session.

**Objectif** : permettre a l'utilisateur de tester sa memoire sur
l'ensemble des cartes du paquet, en mode Anki.

**Structure** :

- En-tete de session : titre du paquet, sous-titre (theme + nombre de
  cartes), **barre de progression** + compteur "X / N" en haut a droite.
- Layout deux colonnes :
  - **Carte courante** (centre) :
    - Badge de difficulte au-dessus.
    - **Face recto** (violet) avec le label "QUESTION" + le contenu +
      l'indication "Cliquer pour reveler la reponse".
    - **Face verso** (vert) avec le label "REPONSE" + le contenu +
      l'indication "Cliquer pour revoir la question". Masquee tant que
      le flip n'a pas eu lieu.
    - **Boutons d'evaluation** : "Je savais !" (vert) et "A revoir"
      (rouge), visibles uniquement quand la face verso est affichee.
    - Indicateurs clavier en pied : `Espace` retourner la carte,
      `1` je savais, `2` a revoir, `←` `→` naviguer.
  - **Panneau de session** (droite, 300 px) :
    - "Session en cours" + score actuel en grand (`75%`).
    - Trois pastilles : nombre de bonnes (vert), nombre de mauvaises
      (rouge), meilleur score historique (or).
    - **Liste des questions** de la session, avec etat visuel : grise
      (non vue), violet (en cours), verte (savais), rouge (a revoir).

**Machine d'etats** (cf. diagramme DESIGN-0.4) :

```
Q_affichee ──flip──► R_revelee ──savais/revoir──► (suivante) ou Session_finie
     ▲                  │
     └──────flip────────┘
```

**Transitions** :

- `Q_affichee` <-> `R_revelee` : flip au clic ou a la touche `Espace`.
- `R_revelee` → question suivante : clic sur "Je savais !" / "A revoir"
  ou touches `1` / `2`. La question evaluee est marquee dans la liste
  laterale, les pastilles et le pourcentage sont mis a jour en temps
  reel.
- Apres la **derniere** question : appel AJAX `POST /api/paquets/:id/session`
  pour transmettre le score au serveur (uniquement applique si
  l'utilisateur est proprietaire — cf. CLAUDE.md §4) puis bascule sur
  l'ecran de fin de session.
- `← Tableau de bord` (lien dans la sidebar) : abandon de la session,
  retour au dashboard sans envoi de score.

---

## 8. Fin de session — `project-files/interface/end_of_session.png`

**Quand** : juste apres la derniere evaluation d'une session de
revision. Route `#fin-session-<id>`.

**Objectif** : feliciter l'utilisateur et lui montrer un recapitulatif
chiffre de sa session.

**Structure** :

- Carte centrale sur fond degrade violet/rose.
- Icone "etoile" (au lieu de l'emoji confetti du mockup — emojis
  interdits par CLAUDE.md §8).
- "Session terminee !" + sous-titre (titre du paquet + nombre de cartes).
- Score en grand (`75%`) + ligne "18 sur 24 cartes reussies".
- Trois statistiques cote a cote :
  - **Correctes** (vert) : nombre de "Je savais !".
  - **A revoir** (rouge) : nombre de "A revoir".
  - **Meilleur score** (or) : pourcentage historique le plus eleve.
- Deux boutons : "Recommencer" (primaire, repart en `#study-<id>`) et
  "Tableau de bord" (secondaire, retour `#dashboard`).

**Transition** :

- "Recommencer" → nouvelle session d'etude sur le meme paquet.
- "Tableau de bord" → retour a l'accueil ; les nouveaux scores sont
  desormais affiches sur la carte du paquet.

---

## 9. Profil utilisateur — `project-files/interface/my_profile.png`

**Quand** : clic sur l'avatar (topbar) ou le bandeau utilisateur
(sidebar). Route `#profil`.

**Objectif** : afficher l'identite de l'utilisateur connecte et lui
permettre de se deconnecter.

**Structure** : (cf. implementation AUTH-GATE.4)

- Card identite : avatar avec initiales, nom + prenom, email.
- Statistiques personnelles (nombre de paquets crees, nombre de paquets
  partages, meilleur score global).
- Reglages : toggle dark/light, bouton "Se deconnecter" rouge.

**Transition** :

- "Se deconnecter" → appel `POST /api/auth/logout` puis retour au Login
  (la session PHP est detruite cote serveur, le cookie PHPSESSID est
  supprime).

---

## 10. Partage d'un paquet — `project-files/interface/share_bag.png` (vue cible — FULL-2.14)

**Quand** : depuis la vue de visualisation d'un paquet (section 6), bouton
"Partager" si l'utilisateur est proprietaire.

**Objectif** : ajouter un destinataire au paquet.

**Structure prevue** :

- Modale centree avec champ de recherche **avec auto-completion** sur
  l'email des utilisateurs (endpoint `GET /api/users/search?q=...`).
- Au fur et a mesure de la saisie, une liste deroulante propose les
  emails correspondants. Clic sur un email → ajout immediat a la liste
  des destinataires (chip).
- La liste des destinataires actuels est visible dans la modale, avec
  une croix pour retirer un partage.

**Etat actuel** : non implemente. La vue sera ajoutee en FULL-2.14 et
2.15. Le mockup est utilise comme reference pour la future
implementation.

---

## 11. Aspect technique du parcours — routage SPA

Le projet est une **Single Page Application** : une seule page HTML est
servie par `index.php` (front-controller) quand l'URL n'est pas `/api/*`.
Toutes les vues principales coexistent dans le DOM, masquees ou
affichees a la volee par un dispatcher JavaScript.

```
window.location.hash         Vue affichee
─────────────────────────────────────────────
(vide) ou #dashboard         Dashboard
#nouveau-paquet              Edition (mode creation)
#paquet-<id>/edition         Edition (mode modification)
#paquet-<id>                 Visualisation (vue cible — FULL-2)
#study-<id>                  Mode revision (Anki)
#fin-session-<id>            Recapitulatif de fin
#profil                      Profil utilisateur
#partages                    Liste des paquets partages (mockup en attente)
```

Le mecanisme : un clic sur `<a href="#study-3">` declenche l'evenement
DOM standard `hashchange`. Le dispatcher (cf. `src/public/js/app.js`)
ecoute cet evenement et bascule l'affichage en cachant les sections non
ciblees et en revelant la section cible. Le browser conserve le hash
dans l'URL meme en cas de rafraichissement, donc l'utilisateur peut
copier-coller une URL pour acceder directement a une vue.

Cette approche evite la dependance a la History API HTML5 (`pushState`),
dont la garantie de couverture dans les PDFs de cours n'est pas etablie.

---

## 12. Lien avec le diagramme de cas d'utilisation

Chaque ecran couvre un ou plusieurs cas d'utilisation du diagramme (cf.
chapitre 3-4 du cours) :

| Ecran | Cas d'utilisation couvert |
|---|---|
| Login | "S'identifier" |
| Inscription | "Creer un compte" |
| Dashboard | "Consulter mes paquets", "Consulter les paquets partages" |
| Edition paquet | "Creer un paquet", "Editer un paquet", "Gerer les questions" |
| Visualisation paquet | "Consulter un paquet", "Voir les destinataires" |
| Mode revision | "Etudier un paquet", "Evaluer ma reponse" |
| Fin de session | (epilogue du cas "Etudier un paquet") |
| Profil | "Consulter mon profil", "Se deconnecter" |
| Partage | "Partager un paquet" |

Les relations d'inclusion et d'extension entre ces cas sont detaillees
dans le diagramme UML fourni en DESIGN-0.1.

---

## Synthese

Le parcours utilisateur s'organise autour de neuf ecrans, traverses
selon des flux courts et explicites. Chaque ecran a un objectif unique
et clair, et les transitions entre ecrans sont declenchees soit par
un clic, soit par la touche `Espace`/`Entree`, soit par l'achevement
d'une tache (fin de session). Le mecanisme de routage par hash garantit
une navigation fluide sans rechargement et conserve l'URL accessible
en lecture comme en partage.
