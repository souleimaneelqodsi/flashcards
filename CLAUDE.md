# CLAUDE.md — Projet TER MIAGE Flashcards

Ce fichier est lu automatiquement par Claude Code a chaque ouverture du projet. Il definit le contexte, les contraintes et les comportements attendus. **Lis-le integralement avant toute action non triviale.**

> **Source d'autorite** : `project-files/ter_m1_miage.pdf` prime sur tout, puis `project-files/Dossier de Conception - Projet Flashcards MIAGE.pdf`, puis les diagrammes, puis l'interface (`project-files/interface/`). Si une demande contredit ces documents, aligne-toi sur les documents et signale-le.

---

## 1. Contexte

Application web SPA multi-utilisateurs de gestion de flashcards (option 2 du sujet : fiches de revision), inspiree d'Anki. TER M1 MIAGE, **note sur 20**, realise en **binome** d'apres le sujet (note : `repartition_taches.csv` mentionne 5 personnes — a clarifier avec l'enseignant avant le rendu).

Le projet est **academique** : conformite au sujet et qualite de conception priment sur la scalabilite.

## 2. Stack technique imposee — non negociable

| Couche | Techno | Precisions |
|---|---|---|
| Presentation | HTML5 | Doit passer le validateur W3C **sans erreur** |
| Style | CSS2 (max) / CSS3 (si besoin) | Doit passer le validateur W3C **sans erreur** |
| Client | JavaScript + jQuery | jQuery impose pour DOM/AJAX. **Pas** de React/Vue/Angular |
| Serveur | PHP | **Justifier** dans le rapport si on utilise fonctions ou oriente objet |
| BDD | SQLite | Fichier local, acces **PDO uniquement** |
| Communication | AJAX / JSON | Backend = API JSON, front = SPA jQuery |

**Interdits absolus** : Node.js, Express, React/Vue/Angular, MySQL/PostgreSQL, ORM (Doctrine/Eloquent), framework PHP (Laravel/Symfony), TypeScript, build tools (Webpack/Vite/Rollup), CSS framework (Bootstrap/Tailwind) sauf justification ecrite.

Si une suggestion sort de cette stack, on perd des points. Refuse toute derive et propose une alternative dans la stack.

## 2 bis. Perimetre des APIs autorisees — strictement limite aux cours

Le sujet penalise tout code qui semble copier-colle ou genere sans comprehension. Pour eviter ca, **toute API JavaScript / jQuery / PHP utilisee doit etre presente dans les PDFs de cours** :

- `project-files/JavaScript.pdf` (JS de base)
- `project-files/php (1).pdf` (PHP serveur)
- `project-files/initiation-HTML-CSS.pdf` (HTML/CSS)

**Avant d'utiliser une API ou une syntaxe que tu n'as jamais vue dans ces PDFs, tu dois soit la rechercher dans les PDFs (Read + Grep), soit la signaler comme "hors cours" et demander confirmation au binome.**

### APIs/syntaxes susceptibles d'etre hors-cours pour un cours M1 MIAGE (a verifier avant usage)

**JavaScript moderne (ES6+) — a eviter par defaut** :
- `fetch()`, `async / await`, `Promise.then` (utiliser `$.ajax` jQuery a la place)
- Arrow functions `=>` (preferer `function(){}` sauf si demontre dans les cours)
- Classes ES6 (`class X {}`), `extends`, `super`
- Destructuration `const { a, b } = obj`, spread `...args`
- `let` / `const` si le cours utilise majoritairement `var`
- Modules ES6 (`import` / `export`)
- Template literals avec interpolation : tolere mais a verifier
- `Map`, `Set`, `Symbol`, `Proxy`, `Reflect`

**jQuery — perimetre courant en cours M1 MIAGE** :
- `$()` selecteurs (`$('#id')`, `$('.class')`, `$('input[name=x]')`)
- `.val()`, `.text()`, `.html()`, `.attr()`, `.prop()`
- `.addClass()`, `.removeClass()`, `.toggleClass()`, `.hasClass()`
- `.show()`, `.hide()`, `.toggle()`, `.fadeIn/Out`, `.slideUp/Down`
- `.on(event, handler)`, `.click()`, `.submit()`, `.change()`, `.keyup()`, `.blur()`
- `.each(function(i, el){})`, `.find()`, `.parent()`, `.children()`, `.siblings()`
- `.append()`, `.prepend()`, `.remove()`, `.empty()`
- `$.ajax({ url, type, data, success, error })`, `$.get`, `$.post`
- `.preventDefault()`, `.stopPropagation()`

Si tu utilises autre chose, **verifie d'abord dans `project-files/JavaScript.pdf`** ou propose une alternative dans le perimetre ci-dessus.

**PHP — perimetre courant** :
- Superglobales : `$_GET`, `$_POST`, `$_SESSION`, `$_COOKIE`, `$_SERVER`, `$_FILES`
- Strings : `strlen`, `strpos`, `substr`, `trim`, `str_replace`, `explode`, `implode`, `htmlspecialchars`, `preg_match`, `preg_replace`
- Arrays : `count`, `array_keys`, `array_values`, `in_array`, `foreach`, `array_map`, `array_filter`
- Sessions : `session_start`, `session_destroy`, `session_regenerate_id`
- Hash : `password_hash`, `password_verify`
- PDO : `new PDO`, `prepare`, `execute`, `bindParam`, `bindValue`, `fetch`, `fetchAll`, `lastInsertId`
- JSON : `json_encode`, `json_decode`
- Header : `header`, `http_response_code`
- File : `file_get_contents`, `file_put_contents` si besoin
- Classes : declaration de classe, constructeur, visibilite (public/private/protected), statique, heritage simple

A eviter sauf si verifie dans `project-files/php (1).pdf` :
- Traits, namespaces complexes
- Closures avec `use`
- `yield` / generateurs
- Reflection
- Composer / autoloading PSR-4 (utiliser `require_once` simple)

**HTML/CSS** :
- HTML5 standard
- CSS2 majoritaire, CSS3 seulement pour : flexbox (justifie pour layouts modernes), border-radius, transition simple, box-shadow legere
- Pas de grid CSS si pas dans le cours
- Pas de variables CSS custom (`--var`) si pas dans le cours — verifier `project-files/initiation-HTML-CSS.pdf`

### Regle d'or

**Si tu hesites sur une API, dis-le et demande confirmation avant d'ecrire.** Mieux vaut une question qu'un code rejete pour "non enseigne / probablement copie".

## 3. Architecture

**MVC en mode SPA** :
- **Vue** (front) : HTML/CSS + jQuery, routage client sans rechargement (cache d'ecrans en memoire ou affichage/masquage de sections)
- **Controleur** (back) : endpoints PHP qui recoivent l'AJAX, valident, appellent la persistance, renvoient du JSON
- **Modele** : entites metier + repositories qui parlent a SQLite via PDO

**Patrons obligatoires (le sujet exige >= 3 parmi 5)** :
1. **Singleton** — `DB::getInstance()` pour la connexion PDO unique
2. **Repository (DAO)** — un par entite (`UtilisateurRepository`, `PaquetRepository`, `QuestionRepository`, `PartageRepository`) ; **les controleurs ne touchent jamais a PDO directement**
3. **Factory** — instanciation des entites depuis les rows SQL (`Paquet::fromRow($row)`)

Tout patron utilise doit etre justifiable en 1-3 phrases pour le rapport.

## 4. Modele de donnees (fige)

Cinq tables, conformes a `project-files/DB_relational_model.jpeg`. **Respect strict des noms** (francais, pluriel pour tables, prefixe `id_` pour PK) :

- `utilisateurs` : `id_user` PK, `email` UNIQUE, `mot_de_passe` (BCRYPT), `nom`, `prenom`, `date_naissance`, `avatar`
- `paquets` : `id_paquet` PK, `titre` VARCHAR(150), `theme`, `date_creation`, `last_score`, `best_score`, `id_proprietaire` FK
- `questions` : `id_question` PK, `contenu_question` TEXT, `contenu_reponse` TEXT, `id_paquet` FK, `id_difficulte` FK
- `difficultes` : `id_difficulte` PK, `nom_difficulte` (referentiel : Facile, Moyen, Difficile — seede dans `install.php`)
- `partages` : `id_paquet` FK, `id_destinataire` FK, `date_partage`

**Regles metier critiques** :
- Le partage transfere **l'acces au contenu, pas la progression**. `last_score`/`best_score` sont **strictement personnels au proprietaire**. Si on veut une progression par destinataire, prevoir une table dediee — a valider avant.
- 100 % requetes preparees PDO. **Aucune** concatenation SQL.
- `install.php` cree le schema et seede `difficultes`. Documente dans `installation.txt`, supprimable apres usage.

## 5. Interface — `project-files/interface/` est la specification visuelle

L'equipe a fourni un **design system complet** dans `project-files/interface/` :

### Ecrans
- `login.png` — connexion (layout 2 colonnes : panneau violet a gauche avec features, formulaire a droite)
- `signup.png` — inscription
- `dashboard.png` — tableau de bord (sidebar gauche + main : stats cards + paquets)
- `my_profile.png` — profil utilisateur avec avatar
- `new_bag.png` — creation/edition de paquet
- `share_bag.png` — modale de partage avec auto-completion
- `question_give_response.png` — revision style Anki (recto question)
- `current_revision.png` — revision (verso reponse + boutons Check/Bad)
- `end_of_session.png` — fin de session de revision avec scores

### Design tokens
- `color_palette.png` — palette officielle (violet primaire #7C4DFF, accent rose #FF6584, etc.)
- `typography.png` — typographie (Inter, hierarchie de tailles et de poids)
- `border_curveness_buttons.png` — radius et boutons

### Prototype HTML
- `figma-prototype.html` — prototype HTML interactif a consulter pour saisir les comportements

### Regles strictes de conformite

**L'implementation doit reproduire fidelement les mockups, a une exception pres demandee explicitement par le binome** :

- **Dashboard** : actuellement les mockups montrent "Mes paquets" et "Partages avec moi" en **onglets** (tabs). **Implementer en deux colonnes cote-a-cote** (colonne gauche = Mes paquets, colonne droite = Partages avec moi), tries par date desc. C'est conforme au sujet ("l'ecran est separe en deux zones").

Toutes les autres divergences avec les mockups doivent etre signalees au binome avant implementation.

### Comportements UI obligatoires (extraits du sujet + dossier)

- **Paquets cliquables partout** : sur chaque ecran ou un paquet apparait (dashboard, partages, etc.), un clic sur la card / le titre amene a l'ecran de visualisation du paquet.
- **Ecran de visualisation d'un paquet** : doit afficher le titre, la date d'ajout, le proprietaire, et **la liste des utilisateurs avec lesquels le paquet est partage** (cf. sujet). Si l'utilisateur courant est proprietaire, afficher les liens "Editer" et "Supprimer".
- **Auto-completion sur le partage** : la modale de partage propose les utilisateurs au fur et a mesure de la saisie (style mockup `share_bag.png`).
- **Mode revision Anki** : carte recto question, retournement (flip) au clic, verso avec reponse + boutons Check (correct) / Bad (incorrect). Comptabilise le score sur la session, met a jour `last_score` et `best_score` du paquet (uniquement si proprietaire) a la fin.
- **Dark / Light mode** : un toggle visible dans la sidebar ou le header. La preference est conservee (cookie ou localStorage simple).
- **Profil avec avatar** : affichage initiales (style `JD` en haut a droite dans le dashboard) ou avatar uploade.

## 6. Validation des donnees — client ET serveur, jamais l'un sans l'autre

Le sujet impose **les deux**. Si tu ecris un formulaire, tu ecris les deux validations simultanement.

### Regles precises (regex en JS et PHP)
- **Email** : `login@domaine.extension`, **unique en base**, erreur claire si deja pris
- **Mot de passe** : >= 6 caracteres ; a l'inscription, saisi 2x et les deux doivent matcher avant envoi
- **Date de naissance** : format **AAAAMMJJ** strict cote client, stockee en `DATE` SQLite
- **Titre de paquet** : <= 150 caracteres, non vide
- **Contenu question/reponse** : non vide
- **Tous les champs obligatoires** doivent etre renseignes

### Affichage des erreurs (pattern impose)

- **Validation dynamique** : le champ doit virer au **rouge des qu'une mauvaise entree est detectee** — pas seulement au submit. Pattern jQuery typique : `.on('blur keyup', function(){ ... })` qui ajoute/retire une classe `.invalide`.
- **Champ invalide** : background rouge (ou bordure rouge) + texte rouge (classe CSS `.invalide`).
- **Message d'erreur explicatif** : affiche **sous le champ** (en rouge) et **un recap en bas du formulaire** (en rouge) listant toutes les erreurs avant submit.
- Le formulaire ne s'envoie pas tant qu'il y a une erreur visible.

Exemple de classes CSS attendues (a definir dans la feuille de styles) :
```css
.champ-invalide { background-color: #FEE2E2; border: 1px solid #EF4444; color: #EF4444; }
.message-erreur { color: #EF4444; font-size: 13px; margin-top: 4px; }
.recap-erreurs { color: #EF4444; padding: 12px; background: #FEE2E2; border-radius: 8px; }
```

## 7. Securite — non negociable

- **Mots de passe** : `password_hash($mdp, PASSWORD_BCRYPT)` a l'inscription, `password_verify` au login. **Jamais en clair**, jamais MD5/SHA1.
- **Sessions PHP** : `session_start()` en debut d'endpoint protege, verifier `$_SESSION['id_user']` avant toute action metier, `session_regenerate_id(true)` a la connexion.
- **SQL** : 100 % requetes preparees PDO. **Zero** concatenation.
- **XSS** : `htmlspecialchars()` cote PHP, `.text()` plutot que `.html()` cote jQuery.
- **CSRF** : token CSRF en session, envoye via AJAX sur les endpoints qui modifient l'etat (creation, edition, suppression, partage).
- **Erreurs PHP** : `display_errors = Off` en prod, log serveur. Jamais de stack trace dans la reponse JSON.

## 8. Conventions de code

- **Indentation : 4 espaces** dans tous les fichiers PHP/JS/CSS/HTML. **-2 pts** si non respecte. Verifier avant chaque commit.
- **Nommage** :
  - Variables/fonctions PHP & JS : `snake_case` francais aligne sur le modele (`creer_paquet`, `id_paquet`, `valider_reponse`)
  - Classes PHP : `PascalCase` francais (`Utilisateur`, `PaquetRepository`)
  - Fichiers : `kebab-case` ou `snake_case`, coherent par couche
- **Commentaires** : docblock court par classe / repository / endpoint. Le rapport exige une description par fichier — autant les ecrire alignes.
- **Aucun emoji** dans le code, les commentaires, le rapport, l'UI. Le projet est academique et note.

## 9. Organisation de fichiers (a confirmer si refactor)

```
src/
├── public/              # index.php (point d'entree), assets, JS, CSS
├── controllers/         # endpoints API PHP (un fichier par ressource)
├── models/              # entites (Utilisateur, Paquet, Question, ...)
├── repositories/        # acces donnees (Repository pattern)
├── core/                # DB singleton, session, helpers
├── views/               # templates HTML (ou templates JS front)
├── sql/                 # install.php + migrations eventuelles
└── data/                # fichier SQLite (gitignore)
```

## 10. Penalites a eviter

| Erreur | Cout |
|---|---|
| Indentation incorrecte | **-2 pts** |
| HTML invalide W3C | penalite UX/UI |
| CSS invalide W3C | penalite UX/UI |
| Code detecte comme copier-coller | etude approfondie de l'enseignant |
| Usage d'API hors cours (signature suspect d'IA / copie) | risque d'enquete |
| Mot de passe en clair en base | **faute majeure** |
| Divergence UI avec les mockups | penalite UX/UI |
| Livrables manquants (`src/`, `rapport.pdf`, `installation.txt`, archive `projet-progweb-gN.zip`) | inacceptable |

## 11. Grille de notation (boussole de priorisation)

| Bloc | Points | Implication |
|---|---|---|
| Conception | 5 | Archi justifiee + patrons + diagrammes |
| Fonctionnel | 7 | Code PHP/SQL/JS de qualite, structure BD propre |
| UX / UI | 2 | XHTML/CSS valides, apparence soignee, **respect mockups** |
| Rapport | 3 | Clarte, completude, justifications |
| Soutenance | 3 | Defense orale |
| **Total** | **20** | |

Conception + fonctionnel = 12/20. Toute feature qui degrade l'archi est un mauvais investissement.

## 12. Workflow attendu — strict

1. **Explore d'abord** : pour toute tache non triviale, lis les fichiers concernes (sans rien modifier) et resume ta comprehension.
2. **Plan ensuite** : propose un plan detaille (fichiers touches, ordre, tests) avant la moindre ligne.
3. **Implemente apres validation** : aucune modif avant « go » explicite.
4. **Verifie a la fin** : rappelle ce qui a ete modifie, ce qui reste a faire, ce qui est a tester manuellement.

**Si une demande touche > 3 fichiers ou modifie une decision archi : refuse de coder directement et redemande un plan.**

## 13. Mode automatique — invocations proactives

L'equipe veut **un mode ou taper la tache suffit** : Claude doit choisir et invoquer les bons outils sans qu'on le lui demande.

### Regles d'invocation automatique

Quand l'utilisateur formule une tache, Claude DOIT, sans attendre qu'on le lui demande :

| Type de tache detecte | Actions automatiques de Claude |
|---|---|
| Creation d'une entite / table | Lance la commande `/nouvelle-entite <nom>` ou suit son protocole : verif modele de donnees + scaffold + audit immediat |
| Creation d'un endpoint API | Lance `/nouveau-endpoint` ou suit son protocole + invoque `validation-checker` apres |
| Modification d'un formulaire | Apres edition, invoque `validation-checker` (parite client/serveur + rouge dynamique) |
| Modification d'un controleur PHP | Apres edition, invoque `repository-enforcer` et `php-securite-auditor` |
| Modification HTML/CSS | Apres edition, invoque `w3c-validator` et `interface-compliance-checker` |
| Toute modification PHP/JS/CSS/HTML | Avant fin de tour, verifie indentation 4 espaces (lance `indentation-fixer` si doute) |
| Question sur une API JS/PHP | Lance d'abord une recherche dans les PDFs de cours (Grep sur le PDF en mode texte si possible, sinon Read) avant d'utiliser l'API |
| Question sur l'interface | Consulte d'abord `project-files/interface/` (image pertinente + figma-prototype.html) |
| Doute sur le sujet | Consulte `project-files/ter_m1_miage.pdf` |
| Avant un commit important / fin de session | Suggere `/preparer-livraison` |
| Mention de "rendu", "livraison", "ready", "rendre" | Lance `/preparer-livraison` |
| Mention de "stack", "techno", "framework" | Lance `/verifier-stack` |
| Mention de "securite", "auth", "mot de passe" | Lance `/audit-securite` |
| Mention de "indent", "4 espaces", "format" | Lance l'agent `indentation-fixer` |
| Mention de "rapport", "ecrire la section" | Lance `/rapport-section <section>` |
| Mention de "justifier", "pourquoi ce choix" | Lance `/justifier-choix <decision>` |

### Comment Claude doit annoncer les invocations

Bref, sans ceremonie. Exemple :

> « J'ai modifie src/controllers/paquets.php. Je lance repository-enforcer + php-securite-auditor pour verifier qu'aucune violation n'a ete introduite. »

Puis affiche les verdicts.

### Quand NE PAS invoquer automatiquement

- Si la tache est manifestement triviale (typo, renommage local).
- Si le binome a explicitement demande de ne pas le faire ("juste fais X, pas de check").
- Si l'invocation aurait deja ete faite il y a moins d'1-2 messages sans changement entre temps.

## 14. Comportement attendu

- **Langue** : francais. Identifiants metier en francais coherent avec le modele. Termes techniques (JSON, AJAX, Repository) en anglais standard.
- **Profondeur** : pose des questions de clarification si la demande est floue ; ne devine pas. Tire vers la precision.
- **Reference aux docs** : avant une decision d'archi/schema/flux, consulte les documents joints et cite-les (« d'apres le diagramme de sequence section creation de paquet… »).
- **Granularite** : sors le code en blocs lisibles, fichier par fichier, avec le chemin en commentaire. Pas de gros fichiers monolithiques.
- **Honnetete** : si tu hesites sur une fonction PHP ou jQuery, dis-le ; **ne fabrique pas d'API qui n'existe pas ou qui n'est pas dans les cours**.
- **Justification** : chaque decision archi doit etre justifiable en 1-3 phrases pour le rapport. Si tu ne sais pas justifier, c'est probablement le mauvais choix.
- **Pas de scope creep** : reste sur le perimetre fonctionnel du dossier de conception (auth, profil, dashboard 2 colonnes, CRUD paquets, revision style Anki avec flip, partage, dark/light mode). N'invente rien sans demande explicite.
- **Format** : prose claire, code en blocs balises, listes seulement si la structure le justifie. Pas de remplissage ceremonial.
- **Pas d'emoji**.

## 15. Outils projet a ta disposition

Sous-agents (`.claude/agents/`) — invocables via « lance l'agent X » ou via la Task tool, OU **automatiquement** selon la matrice section 13 :
- `php-securite-auditor` : audite PHP (BCRYPT, PDO prepare, session, CSRF, XSS)
- `repository-enforcer` : verifie qu'aucun controleur ne touche PDO directement
- `validation-checker` : verifie la parite validation client/serveur + rouge dynamique + message en bas
- `w3c-validator` : valide HTML/CSS
- `conception-alignment-checker` : verifie l'alignement avec les diagrammes et le sujet
- `interface-compliance-checker` : verifie la conformite avec les mockups `project-files/interface/`
- `cours-api-checker` : verifie qu'aucune API JS/PHP n'est utilisee hors des PDFs de cours
- `rapport-writer` : aide a rediger les sections du rapport
- `indentation-fixer` : normalise l'indentation a 4 espaces
- `code-reviewer-ter` : review globale orientee grille de notation

Slash commands (`.claude/commands/`) :
- `/nouvelle-entite [nom]` : scaffold entite + repository + endpoints
- `/nouveau-endpoint [ressource] [action]` : scaffold endpoint controleur + validation
- `/audit-securite` : passe l'auditeur securite sur tout `src/`
- `/valider-w3c` : valide HTML/CSS via le validateur W3C
- `/preparer-livraison` : checklist pre-rendu complete
- `/verifier-stack` : detecte toute techno interdite dans le repo
- `/justifier-choix [decision]` : aide a formuler une justification pour le rapport
- `/rapport-section [section]` : genere/met a jour une section du rapport

Hooks actifs (mode **avertissement non bloquant**) :
- Avant Write/Edit : avertit si pattern dangereux (MDP en clair, MD5/SHA1, concatenation SQL, `.html()` avec contenu utilisateur, API moderne hors-cours probable)
- Apres Write/Edit : verifie indentation 4 espaces, syntaxe PHP (`php -l`)
- A la soumission d'un prompt : detecte les technologies interdites ET suggere a Claude les agents/commands pertinents (mode auto)
- A l'ouverture de session : rappel du contexte projet et des penalites

---

**TL;DR** — Stack imposee (HTML/CSS2/jQuery/PHP/SQLite), **APIs limitees strictement aux PDFs de cours**, MVC + SPA, patrons (Singleton + Repository + Factory min), validation client+serveur partout avec **rouge dynamique** + **message en bas**, BCRYPT, PDO prepare, W3C valide, indentation 4 espaces, francais coherent, **interface project-files/interface/ a respecter** (dashboard en 2 colonnes cote-a-cote, paquets cliquables partout, ecran de visualisation avec destinataires de partage), **mode automatique** (Claude invoque agents/commands proactivement selon matrice section 13), justification ecrite de chaque choix d'archi, ne jamais sortir de la stack ou du perimetre, toujours consulter les docs avant une decision technique, plan avant code.
