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
tous **implementes et branches sur l'API** apres les sprints `FULL-2`
(decoupage `PAQ-1` / `PAQ-2` / `DASH-2` / `SHARE-1` / `VIEW-1`) et
`FULL-3` (decoupage `QST-1` / `STUDY-1` / `WIRE-1` / `OPT-1`).

```
[ Auth ]                  [ Tableau de bord ]
  Login ──connexion──►        ┌──► Edition d'un paquet ───► Modale ajout question
  Signup ──inscription──►     │    (creation ou edition)    Modale suppression
                              │
                              ├──► Visualisation d'un paquet
                              │    (titre + date + proprietaire + chips destinataires)
                              │      │
                              │      ├─► Modale partage (auto-completion email)
                              │      ├─► Reviser
                              │      ├─► Editer
                              │      └─► Supprimer
                              │
                              ├──► Mode revision (Anki)
                              │    Q affichee ←flip→ R revelee
                              │                       │ savais/revoir
                              │                       v
                              │    Recapitulatif de fin de session
                              │
                              └──► Profil utilisateur
                                   (identite + stats + edition + couleur avatar)
```

Tous ces ecrans sont rendus par la meme page HTML (`src/views/app.php`)
sous forme de **sections** masquees ou visibles. La navigation s'opere
sans rechargement, par modification de `window.location.hash` (cf.
parcours technique en section 11). Le routage SPA generalise est livre
par `BACK-2.1` ; le dispatcher reconnait toutes les routes du tableau
de la section 11.

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
- Echec d'authentification (`52d3307`) → les champs **email** et **mot de passe** sont marques en rouge (classe `.champ-invalide`), un recap rouge en pied de formulaire affiche "Identifiants invalides". Pattern coherent avec la validation §6, pas un simple toast. L'utilisateur reste sur la vue de connexion.

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
- Date de naissance : saisie via un **selecteur natif HTML5**
  `<input type="date">` (`5f18447`). Bornes appliquees : age
  minimum 7 ans, age maximum 100 ans (l'attribut `min` / `max`
  encadre les choix possibles). Placeholders explicites pour
  guider la saisie. La format `AAAA-MM-JJ` est garanti par le
  controle natif du navigateur — plus besoin de regex client.

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
  Partages avec moi, Profil) + bandeau utilisateur (avatar avec
  initiales + nom). Le bouton menu du topbar (`WIRE-1.3`) permet
  d'ouvrir / fermer la sidebar pour gagner de la place.
- Topbar : titre + avatar cliquable. La barre de recherche
  (`OPT-1.1`), les notifications (`OPT-1.6`) et le lien Parametres
  (`OPT-1.2`) ont ete retires car non implementes et hors-sujet TER —
  l'interface ne promet rien qu'elle ne livre pas.
- Bandeau "Bonjour, <prenom>" + bouton primaire "Nouveau paquet" en
  haut a droite.
- **Cartes KPI** au-dessus des colonnes (rangee de 4 indicateurs) :
  nombre total de paquets, meilleur score global, nombre de paquets
  partages, nombre total de cartes. Chiffres calcules cote client a
  partir de `GET /api/paquets` (`WIRE-1.4`).
- Deux colonnes flexbox alimentees par l'API :
  - **Mes paquets** (gauche) : `GET /api/paquets` (`DASH-2.2`). Liste
    triee par `date_maj` decroissante. Chaque carte affiche titre,
    theme, badge "X cartes", barre de progression (best_score), ligne
    "Record : N% / Dernier : N% / Mise a jour : Il y a N j", et
    boutons "Reviser" / "Editer".
  - **Partages avec moi** (droite) : `GET /api/paquets/shared`
    (`DASH-2.3`). Meme composant, mais l'utilisateur n'est pas
    proprietaire (pas de bouton "Editer", scores du proprietaire).

**Etat vide** : un paquet sans `last_score`/`best_score` affiche
"Jamais revise" au lieu de la triplette de scores. Une colonne sans
paquet affiche un message d'invitation.

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
  rouge dynamique sur Q et R, **bornes 1 a 1000 caracteres** sur chaque
  champ (validation centralisee serveur en miroir, parite client /
  serveur, cf. `QST-1.5`). Submit → la question est ajoutee en fin de
  liste via `POST /api/paquets/:id/questions`, le compteur est mis a
  jour, la modale se ferme.
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
"Enregistrer le paquet" est branche sur l'API en mode auto-detecte
(`PAQ-2.2`) :

- En creation : `POST /api/paquets` puis redirection vers l'edition
  du paquet nouvellement cree (`#edit-paquet-<id>`). En creation, le
  bouton "Ajouter une question" est desactive tant que le paquet
  n'a pas ete enregistre une premiere fois ; ensuite, l'ajout de
  questions devient possible sans quitter la vue (`2cbb3a3`).
- En edition : `PUT /api/paquets/:id` puis redirection vers la vue
  de visualisation (`#paquet-<id>`). Les erreurs de validation
  serveur sont affichees sous le champ concerne en plus du recap
  rouge en bas (parite client / serveur).

---

## 6. Visualisation d'un paquet — `project-files/interface/` (ecran implemente)

**Quand** : clic sur une carte-paquet depuis le dashboard, ou apres
sauvegarde reussie en edition. Route `#paquet-<id>`.

**Objectif** : afficher le **detail** d'un paquet et la liste des
utilisateurs qui peuvent le voir (exigence sujet TER).

**Structure** (livree par `VIEW-1.1` et `VIEW-1.3`) :

- Titre du paquet, date d'ajout, **proprietaire** (nom + email).
- Liste des **destinataires** du partage sous forme de **chips**
  colorees (avatar + nom). Si l'utilisateur courant est proprietaire,
  un bouton croix (`x`) permet de **retirer** un destinataire
  (`DELETE /api/paquets/:id/share/:userId`, confirme par une modale,
  `VIEW-1.1`). Seul le proprietaire voit ce bouton de retrait.
- Liste des questions du paquet en lecture seule.
- Barre d'actions, visible uniquement si **proprietaire** :
  - "Reviser" (`#study-<id>`) — disponible aussi pour les
    destinataires.
  - "Editer" (`#edit-paquet-<id>`).
  - "Partager" (ouvre la modale de partage, cf. section 10).
  - "Supprimer" (`DELETE /api/paquets/:id`, cascade transactionnelle
    sur questions + partages).

**Donnees source** : `GET /api/paquets/:id` (`VIEW-1.2`). L'acces est
restreint aux **proprietaire ou destinataire** ; tout autre utilisateur
recoit un 403.

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

**Donnees source** : `GET /api/paquets/:id/study` (`STUDY-1.1` /
`STUDY-1.3`) — renvoie le paquet, ses questions reelles et un flag
`est_proprietaire`. L'acces est restreint aux proprietaire ou
destinataire du paquet.

**Machine d'etats** (cf. diagramme DESIGN-0.4) :

```
Q_affichee ──flip──► R_revelee ──savais/revoir──► (suivante) ou Session_finie
     ▲                  │
     └──────flip────────┘
```

**Transitions** :

- `Q_affichee` <-> `R_revelee` : flip au clic ou a la touche `Espace`.
  Une animation de retournement et de glissement vers la question
  suivante est appliquee (`a71dc50`) pour rendre la transition
  perceptible sans recourir a une rotation 3D.
- `R_revelee` → question suivante : clic sur "Je savais !" /
  "A revoir" ou touches `1` / `2`. La question evaluee est marquee
  dans la liste laterale, les pastilles et le pourcentage sont mis a
  jour en temps reel.
- Apres la **derniere** question : appel AJAX
  `POST /api/paquets/:id/score` (`STUDY-1.2` / `STUDY-1.4`) qui met
  a jour `last_score` (toujours) et `best_score` (uniquement si le
  nouveau score est meilleur). L'endpoint refuse silencieusement les
  scores envoyes par un destinataire non proprietaire — la regle
  metier `last_score`/`best_score` strictement personnels au
  proprietaire (cf. CLAUDE.md §4) est appliquee cote serveur. La
  reponse contient le best_score officiel et alimente l'ecran de fin.
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

**Objectif** : afficher l'identite de l'utilisateur connecte, lui
permettre de modifier ses informations et de se deconnecter.

**Structure** (livree par `AUTH-GATE.4`, `WIRE-1.4` et `5c607da`) :

- **Card identite** : avatar (initiales sur un fond degrade dont la
  couleur est **personnalisable** depuis l'ecran d'edition), nom +
  prenom, email.
- **Statistiques personnelles** (chiffres reels, branches sur
  `GET /api/paquets`) : nombre de paquets crees, meilleur score
  historique, nombre de sessions de revision (approximation =
  paquets revises au moins une fois). Le lien "Partages" present
  dans le mockup a ete retire car redondant avec la colonne
  "Partages avec moi" du dashboard.
- **Edition du profil** : formulaire qui permet de modifier nom,
  prenom, email, mot de passe et couleur d'avatar (`5c607da`). La
  validation respecte le pattern §6 (rouge dynamique + recap).
- **Reglages** : toggle dark/light, bouton "Se deconnecter" rouge.

**Transition** :

- "Se deconnecter" → appel `POST /api/auth/deconnexion` puis retour
  au Login (la session PHP est detruite cote serveur, le cookie
  PHPSESSID est supprime).

---

## 10. Partage d'un paquet — `project-files/interface/share_bag.png` (modale implementee)

**Quand** : depuis la vue de visualisation d'un paquet (section 6),
bouton "Partager" si l'utilisateur est proprietaire.

**Objectif** : ajouter un destinataire au paquet en saisissant son
email avec auto-completion.

**Structure** (livree par `SHARE-1.1` a `SHARE-1.4`) :

- **Modale centree** avec un champ de recherche.
- **Auto-completion** au fur et a mesure de la saisie : a chaque
  `keyup`, apres un **debounce de 250 ms**, une requete
  `GET /api/users/search?q=<terme>` est envoyee. Le serveur renvoie
  une liste d'emails matchant (LIKE prepare echappe, exclut
  l'utilisateur courant et les destinataires deja partages).
- Liste deroulante des resultats : chaque element affiche l'avatar
  (avec sa **couleur reelle** depuis le profil du destinataire,
  `a762731`) + le nom + l'email.
- Clic sur un email → `POST /api/paquets/:id/share` (`SHARE-1.2`),
  qui execute **9 verifications** cote serveur (CSRF, auth,
  proprietaire, existence du destinataire, pas-soi-meme, pas-deja-
  partage, etc.) avant d'inserer le partage. Le destinataire
  apparait immediatement comme chip dans la liste des destinataires
  de la vue de visualisation (section 6).
- Un bandeau contextuel informe l'utilisateur du contexte (paquet en
  cours de partage, eventuels erreurs / succes via toast).

**Choix technique** : auto-completion en **jQuery vanilla**
(`.on("keyup")` + `setTimeout` pour le debounce + `$.ajax` + render
manuel de la liste), pas de jQuery UI ni autre bibliotheque externe —
hors stack TER.

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
#login / #inscription        Ecrans d'authentification (garde SPA)
#nouveau-paquet              Edition (mode creation)
#edit-paquet-<id>            Edition (mode modification, proprietaire only)
#paquet-<id>                 Visualisation (titre + chips + actions)
#study-<id>                  Mode revision (Anki)
#fin-session-<id>            Recapitulatif de fin
#profil                      Profil utilisateur (lecture + edition)
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
