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

**Patrons fixes pour le projet — 3 patrons exactement, pas plus** (le sujet TER exige >= 3 parmi 5) :

1. **Singleton — pour les configurations** : connexion PDO unique via `DB::getInstance()` (src/core/DB.php). Sert aussi pour toute autre config centralisee si necessaire (chemins, cles, etc.). Une seule instance partagee par requete HTTP.

2. **Repository — pour les classes interagissant avec la BD** : un repository par entite (`UtilisateurRepository`, `PaquetRepository`, `QuestionRepository`, `PartageRepository`, `DifficulteRepository`) dans `src/repositories/`. Les controleurs ne touchent jamais a PDO directement, ils passent par les repositories.

3. **Factory — pour creer les paquets et les questions** : methodes statiques sur les modeles pour l'instanciation :
   - `Paquet::creer($titre, $theme, $id_proprietaire): Paquet` (creation depuis le formulaire)
   - `Paquet::fromRow(array $row): Paquet` (reconstruction depuis SQL)
   - `Question::creer($contenu_q, $contenu_r, $id_paquet, $id_difficulte): Question`
   - `Question::fromRow(array $row): Question`
   
   Pas de classe `PaquetFactory` separee (trop complexe pour un TER). Les methodes statiques suffisent et sont un Factory Method valide.

**Aucun autre patron** : pas d'Observer, pas de Strategy, pas de State, pas de Decorator. Si un de ces patterns est tentant, prefere une solution simple sans pattern.

Chaque patron doit etre justifiable en 1-3 phrases dans le rapport (cf. /justifier-choix).

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

## 7 bis. Simplicite du code — regle d'or

Le projet est realise par des **etudiants en M1 MIAGE** et corrige par un enseignant. **Le code doit etre simple, lisible et explicable**, pas un exercice de virtuosite. Si tu hesites entre une solution courte et "elegante" vs une solution longue mais limpide, choisis la limpide.

### Regles concretes a respecter

- **Fonctions courtes** : max 30 lignes par fonction. Si plus long, decoupe.
- **Noms explicites** : `valider_email($email)` plutot que `vEm($e)`. `id_proprietaire` plutot que `idP`. Pas d'abreviation cryptique.
- **Pas de chainage > 2 niveaux** : `$paquet_repo->trouver_par_id($id)->getQuestions()->filter()->...` est interdit. Decompose en variables intermediaires.
- **Pas de callbacks imbriques en JS** : si tu as 3 niveaux d'imbrication, refactorise en fonctions nommees.
- **Pas de ternaires imbriques** : `$a ? ($b ? $c : $d) : $e` est illisible. Utilise `if/else`.
- **Une responsabilite par fonction** : une fonction qui valide ET sauvegarde ET notifie, ca n'existe pas. Trois fonctions.
- **Commentaires de docblock** sur chaque classe et chaque methode publique, en francais, qui expliquent le QUOI et le POURQUOI (pas le COMMENT - le code le montre).
- **Pas de magie** : pas de meta-programmation, pas de reflection, pas de `eval`, pas de generation dynamique de noms de methodes. Le code doit etre lisible ligne par ligne.
- **Pas d'optimisation prematuree** : pas de cache custom, pas de lazy-loading complexe. Si c'est lent, on verra apres.
- **Variables locales explicites** : `$nb_paquets = count($paquets);` puis `if ($nb_paquets > 0)` plutot que `if (count($paquets) > 0)` en ligne (lisibilite + un seul appel).
- **Pas de design pattern hors des 3 retenus** (cf. section 3). Pas de Builder, pas de Strategy, pas d'Observer, pas de Decorator. Si un truc te tente, ecris-le en code direct.

### Anti-exemples (a refuser)

```php
// MAUVAIS : chainage, ternaire imbrique, abreviation
$r = ($u = $repo->u($id)) ? ($u->a() ? $u->n() : '?') : null;

// BON : explicite, lisible
$utilisateur = $repo->trouver_par_id($id);
if ($utilisateur === null) {
    $r = null;
} else if ($utilisateur->est_actif()) {
    $r = $utilisateur->getNom();
} else {
    $r = '?';
}
```

```javascript
// MAUVAIS : callbacks imbriques
$.get('/api/a', function(a){ $.get('/api/b/' + a.id, function(b){ $.post('/api/c', b, function(c){ ... }); }); });

// BON : fonctions nommees
function charger_a(callback) { $.get('/api/a', callback); }
function charger_b(id, callback) { $.get('/api/b/' + id, callback); }
function envoyer_c(donnees, callback) { $.post('/api/c', donnees, callback); }
// puis enchainer pas-a-pas dans le handler
```

### Test mental

Si tu n'arrives pas a expliquer ta ligne de code en une phrase a un etudiant qui debute en PHP/JS, **c'est trop complexe**. Reecris plus simple.

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
└── data/                # fichier SQLite (tracke - projet universitaire, pas de donnees sensibles)
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
| Sous-tache terminee / mention de "fini", "fait", "termine", "ok", "commit" | Lance `/commit` (proposer un commit pour la sous-tache, demander confirmation explicite avant `git commit`) |
| Nouvelle tache principale annoncee / mention de "branche", "nouvelle feature", "tache principale" | Lance `/branche` (proposer la creation d'une branche `feature/<nom>` depuis `develop`, demander confirmation) |
| Mention d'un macro-id de tache (regex `\b(DESIGN\|BD\|BACK\|AUTH\|UI\|DASH\|FRONT\|FULL\|DOC-[A-Z]+\|QA)-[0-9]+\b`, ex "BACK-1", "AUTH-2", "je travaille sur UI-1") | Lance `/tache <macro-id>` (enchaine toutes les micro-taches du CSV en mode auto avec commits individuels, demande confirmation pour push+PR a la fin - cf. section 17) |
| Mention d'un micro-id de tache (regex avec `\.` ex "BACK-1.3") | Code uniquement cette micro-tache (pas toute la macro). Consulter le CSV pour l'intitule exact |

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
- `/commit` : propose un commit pour la sous-tache en cours (demande confirmation explicite, lance les audits pertinents avant)
- `/branche [nom]` : propose la creation d'une branche `feature/<nom>` depuis `develop` pour une nouvelle tache principale (demande confirmation explicite)

Hooks actifs (mode **avertissement non bloquant**) :
- Avant Write/Edit : avertit si pattern dangereux (MDP en clair, MD5/SHA1, concatenation SQL, `.html()` avec contenu utilisateur, API moderne hors-cours probable)
- Apres Write/Edit : verifie indentation 4 espaces, syntaxe PHP (`php -l`)
- A la soumission d'un prompt : detecte les technologies interdites ET suggere a Claude les agents/commands pertinents (mode auto)
- A l'ouverture de session : rappel du contexte projet et des penalites
- A la fin d'un tour avec des modifs dans src/ : rappel de proposer un `/commit`

## 16. Workflow Git — branche `develop`, commit par sous-tache

Le binome travaille selon le workflow suivant. Claude doit le respecter strictement.

### Branche principale

La branche principale du projet s'appelle **`develop`**. Aucune commande Claude ne pousse sur `main` ni ne le manipule sans demande explicite. Tout le developpement se fait sur des branches feature mergees ensuite sur `develop`.

### Une branche par tache principale

Pour chaque **tache principale** (ex : « implementer l'inscription », « ajouter le mode revision », « mettre en place le partage »), Claude doit proposer une branche dediee.

- **Nom de branche** : `feature/<nom-court-snake-case>` (ex : `feature/inscription`, `feature/mode-revision`, `feature/partage-paquets`).
- **Branche source** : toujours `develop`.
- **Quand demander** : quand l'utilisateur annonce le debut d'une nouvelle tache principale, ou quand Claude detecte qu'on commence quelque chose de structurel.

**Protocole obligatoire avant de creer une branche** :

1. Verifier `git status` : tout est-il propre ? S'il reste des modifs non committed sur la branche courante, demander a l'utilisateur si on les commit d'abord (proposer `/commit`) ou si on les stash.
2. Demander explicitement : « Tu es bien sur que tu as fini la tache precedente / que tout est commit ? Je vais creer la branche `feature/<X>` depuis `develop`. OK ? »
3. **Attendre un GO explicite**. Ne jamais exécuter `git checkout -b` ou `git switch -c` sans confirmation.
4. Apres confirmation : `git checkout develop && git pull && git checkout -b feature/<X>`.

### Un commit par sous-tache

Pour chaque **sous-tache** (ex : « ajout du formulaire d'inscription cote front », « validation cote serveur de l'inscription », « test du flux complet »), Claude doit proposer un commit.

- **Quand proposer** : quand une sous-tache est terminee de maniere coherente (le code compile, les agents pertinents sont verts, l'utilisateur valide).
- **Quand executer** : **jamais** sans confirmation explicite de l'utilisateur. Toujours demander d'abord.

**Protocole obligatoire avant chaque commit** :

1. Lancer `git status` et `git diff --stat` pour montrer ce qui sera committed.
2. Demander : « Tu as fini cette sous-tache ? Tout est OK pour commit ? »
3. Si OUI, lancer rapidement les audits pertinents (selon la matrice section 13) — par exemple `validation-checker` pour un formulaire, `php-securite-auditor` pour un controleur, `indentation-fixer` pour la forme.
4. Si tout est vert, proposer un message de commit au format Conventional Commits francais (cf. plus bas).
5. **Attendre un GO explicite** pour le message et l'execution.
6. Apres confirmation : `git add <fichiers concernes>` puis `git commit -m "<message>"`.

### Format de commit (Conventional Commits, francais)

```
<type>(<scope>): <description courte a l'imperatif>

<corps optionnel : pourquoi, contexte>
```

Types autorises :
- `feat` : nouvelle fonctionnalite
- `fix` : correction de bug
- `refactor` : refonte sans changement de comportement
- `style` : indentation, formatage, sans changement de logique
- `docs` : documentation, rapport, commentaires
- `chore` : maintenance, gitignore, config
- `rapport` : modifications du rapport.pdf / rapport.md

Exemples :
- `feat(inscription): ajoute formulaire client + validation dynamique`
- `feat(inscription): valide email/mdp/date cote serveur PHP`
- `fix(auth): remplace md5 par password_hash BCRYPT`
- `style(css): indentation 4 espaces sur main.css`
- `refactor(repositories): factorise fromRow dans BaseRepository`
- `docs(rapport): redige section patrons (Singleton + Repository + Factory)`

### Cas particuliers

- **Fin de tache principale** : quand toutes les sous-taches d'une feature sont committed et que le binome valide, Claude propose un merge `feature/<X>` -> `develop` (en demandant confirmation). Format : `git checkout develop && git merge --no-ff feature/<X>`.
- **Push** : Claude ne push **jamais** sans confirmation explicite. `git push origin <branche>` est en mode `ask` dans les permissions.
- **Rebase** : Claude ne rebase pas. Si l'utilisateur le demande explicitement, il execute. Sinon, merge --no-ff.
- **Conflit** : si un merge produit un conflit, Claude s'arrete, montre les fichiers en conflit, demande comment proceder.

### Refus

- Refuser toute manipulation de la branche `main` sauf demande explicite.
- Refuser tout `git push --force` sans demande explicite ET justification.
- Refuser tout `git reset --hard` qui ferait perdre du code non committed sans confirmation tres explicite.

## 17. Convention macro/micro taches et workflow `/tache`

Pour reduire la friction de saisie cote binome, le projet adopte la convention suivante : **le dev tape une macro-tache, Claude execute toutes les micro-taches associees dans l'ordre, en mode automatique, puis demande confirmation pour le push + PR a la fin**.

### Source d'autorite des taches

`project-files/repartition_taches_detaillee.csv`. Format de chaque ligne :

```
Phase,Personne,Groupe,ID,Tache,Points,Reference_cours_ou_commentaire
```

Le CSV est **autoritaire**. Si une tache pertinente n'y figure pas, signale-le avant d'agir.

### Convention de nommage

- **Macro-tache** : prefixe metier + numero de phase, sans decimale. Exemples : `BACK-1`, `AUTH-2`, `UI-1`, `FRONT-2`, `FULL-2`, `DOC-ARCH`, `DOC-BD`, `QA`.
- **Micro-tache** : macro-id + `.` + numero. Exemples : `BACK-1.1`, `BACK-1.6`, `AUTH-2.10`.

### Groupes connus et comportement attendu

| Groupe | Type | Comportement de Claude |
|---|---|---|
| `BD` | Code SQL/PHP | Code et invoque `repository-enforcer` + `php-securite-auditor` apres modification |
| `Backend` (BACK) | Code PHP serveur | Code + `repository-enforcer` + `php-securite-auditor` |
| `Backend` (AUTH cote serveur) | Code PHP auth | Code + `php-securite-auditor` + `validation-checker` (regex serveur) |
| `Frontend` (UI, DASH, FRONT, AUTH cote front) | Code HTML/CSS/JS jQuery | Code + `interface-compliance-checker` + `w3c-validator` + `validation-checker` si formulaire |
| `Fullstack` (FULL) | Code PHP + JS | Code les deux cotes + agents des deux groupes |
| `Conception` (DESIGN) | Diagrammes UML | **Delegue au dev**, ne genere pas le livrable, propose d'aider apres a documenter |
| `Documentation` (DOC-*) | Sections de rapport | **Delegue au dev par defaut**, propose explicitement l'aide via l'agent `rapport-writer` |
| `QA` | Tests manuels | **Delegue au dev**, propose d'aider a rediger le plan de test mais pas l'execution |

### Workflow `/tache <macro-id>`

Le dev tape simplement :

```
/tache BACK-1
```

Claude execute :

1. Lit le CSV et liste les micro-taches `BACK-1.x` triees.
2. Affiche la liste au dev, demande GO.
3. Verifie qu'on est sur une branche `feature/<X>` (sinon STOP et propose `/branche <nom>`).
4. Boucle : pour chaque micro-tache codable,
   - Planifie si > 3 fichiers touches,
   - Code,
   - Invoque les agents pertinents,
   - **Commit individuel sans demander** (justification : `/tache` constitue une autorisation globale donnee par le dev),
   - Mini-rapport,
5. Pour chaque micro-tache non-codable (Conception, Documentation, QA) : delegue au dev et passe.
6. Recap global a la fin.
7. **Demande confirmation explicite** pour `git push` + ouverture de PR vers `develop`.

Reference complete : `.claude/commands/tache.md`.

### Autorisation globale via `/tache`

Le lancement de `/tache <macro-id>` **autorise les commits individuels** de chaque micro-tache executee dans la boucle, **sans demander confirmation a chaque commit** (sinon le workflow perd son interet). En revanche :

- **Le push final reste explicite** (`git push` declenche uniquement sur confirmation du dev).
- **L'ouverture de PR reste explicite**.
- **Une faute majeure detectee** (MDP en clair, concat SQL, techno hors-stack) interrompt la boucle et demande confirmation pour continuer ou corriger.

Cette regle prime sur le protocole standard de `/commit` (CLAUDE.md §16) **uniquement dans le contexte de `/tache`**. Hors de ce contexte, le protocole `/commit` standard avec confirmation explicite par commit reste la regle.

### Format des messages de commit dans `/tache`

```
<type>(<scope-deduit>): <description-micro-tache> [<ID-micro>]
```

L'ID de la micro-tache est suffixe entre crochets pour tracer l'execution dans l'historique git :

- `feat(backend): scaffold src/ + .gitkeep [BACK-1.1]`
- `feat(auth): endpoint mock POST /api/auth/register [AUTH-1.1]`
- `feat(dashboard): layout 2 colonnes Mes Flashcards / Partagees [DASH-1.1]`

### Trigger automatique

Le hook `router-proactif.sh` detecte les mentions d'IDs de tache (regex `\b(DESIGN|BD|BACK|AUTH|UI|DASH|FRONT|FULL|DOC|QA)-[0-9]+(\.[0-9]+)?\b`) et suggere a Claude d'invoquer `/tache` quand un macro-id est mentionne dans le prompt.

Exemples qui declenchent la suggestion :
- "je travaille sur BACK-1"
- "lance BACK-1"
- "BACK-1"
- "on attaque AUTH-2"

Si une **micro**-id est mentionnee (ex : `BACK-1.3`), Claude ne lance pas toute la macro mais cible la micro-tache specifique.

---

**TL;DR** — Stack imposee (HTML/CSS2/jQuery/PHP/SQLite), **APIs limitees strictement aux PDFs de cours**, MVC + SPA, **3 patrons fixes** (Singleton pour configs/PDO, Repository pour BD, Factory pour creer paquets/questions — pas d'autre patron), **code SIMPLE lisible par un etudiant M1** (fonctions courtes, noms explicites, pas de chainage > 2 niveaux, pas de meta-programmation, pas de pattern hors des 3), validation client+serveur partout avec **rouge dynamique** + **message en bas**, BCRYPT, PDO prepare, W3C valide, indentation 4 espaces, francais coherent, **interface project-files/interface/ a respecter** (dashboard en 2 colonnes cote-a-cote, paquets cliquables partout, ecran de visualisation avec destinataires de partage), **mode automatique** (Claude invoque agents/commands proactivement selon matrice section 13), **workflow Git** (branche principale `develop`, branche `feature/<X>` par tache principale, commit par sous-tache avec confirmation explicite avant chaque action git), **workflow macro/micro taches** (le dev tape `/tache <macro-id>` ex `BACK-1`, Claude execute toutes les micro-taches du CSV `project-files/repartition_taches_detaillee.csv` en mode auto avec commits individuels, demande confirmation pour push+PR a la fin - cf. §17), justification ecrite de chaque choix d'archi, ne jamais sortir de la stack ou du perimetre, toujours consulter les docs avant une decision technique, plan avant code.
