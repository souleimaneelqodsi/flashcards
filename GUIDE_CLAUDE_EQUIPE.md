# Guide Claude pour l'equipe — Projet TER Flashcards

Ce guide explique comment l'equipe doit utiliser Claude Code sur le projet flashcards pour maximiser la note finale et eviter les pieges classiques. Lecture obligatoire avant la premiere session.

> **Resume en une phrase** : Claude est un binome supplementaire qui connait toutes les contraintes du sujet et de l'interface, et qui invoque automatiquement les bons outils selon la tache. Il faut le briefer correctement, ne pas le laisser sortir du perimetre des cours, et toujours relire son travail.

---

## 1. Mode automatique (le plus important a comprendre)

L'objectif : **taper la tache suffit**. Claude detecte l'intent et invoque les bons agents / commandes sans qu'on le lui demande.

Exemple :

> Toi : « Implemente l'inscription utilisateur. »
>
> Claude (sans que tu demandes) :
> 1. Lit le mockup `project-files/interface/signup.png` pour comprendre l'UI.
> 2. Verifie les APIs autorisees dans `project-files/JavaScript.pdf`.
> 3. Te propose un plan (HTML + JS validation dynamique + endpoint PHP + repository).
> 4. Attend ton GO.
> 5. Implemente.
> 6. Invoque `validation-checker` pour verifier la parite client/serveur.
> 7. Invoque `php-securite-auditor` pour verifier le hash BCRYPT.
> 8. Invoque `interface-compliance-checker` pour verifier l'alignement avec le mockup.
> 9. Resume ce qui a ete fait + ce qu'il reste a verifier humainement.

Tu n'as rien eu a demander de specifique - le hook `router-proactif` a detecte le mot "inscription" et a injecte les bonnes instructions dans le contexte de Claude.

### Que faire si tu veux desactiver le mode auto sur une tache

Dis-le explicitement :
> « Juste corrige cette typo, pas d'audit derriere. »

---

## 2. Comprendre ce qui est deja configure

A l'ouverture du projet dans Claude Code, ces elements sont charges automatiquement :

### CLAUDE.md (a la racine)

Contient le brief permanent du projet : stack imposee, **perimetre APIs limite aux PDFs de cours**, patrons, modele de donnees, validation, securite, **interface a respecter**, penalites, workflow, **matrice d'invocation automatique**. Claude le lit a chaque ouverture. **Ne le modifie pas sans discussion en binome**.

### .claude/agents/ — 10 sous-agents specialises

| Agent | Quand l'utiliser | Auto ? |
|---|---|---|
| `php-securite-auditor` | Apres tout changement sensible (auth, sessions, SQL). Audite BCRYPT, PDO prepare, CSRF, XSS. | Oui (mention de secu/auth/mdp) |
| `repository-enforcer` | Apres modification de controleurs/repositories. Verifie qu'aucun controleur ne touche PDO directement. | Oui (mention de controller/repository) |
| `validation-checker` | Apres modification d'un formulaire. Verifie parite validation client/serveur + rouge dynamique au keyup/blur + message rouge sous champ + recap en bas. | Oui (mention de formulaire/validation) |
| `w3c-validator` | Avant rendu / apres modification HTML/CSS. Valide contre le validateur W3C. | Oui (mention de html/css/w3c) |
| `conception-alignment-checker` | Apres ajout d'entite / endpoint. Verifie l'alignement avec les diagrammes et le dossier de conception. | Sur demande |
| `interface-compliance-checker` | Apres modification HTML/CSS. Verifie la conformite avec les mockups `project-files/interface/`. | Oui (mention de UI/CSS/design) |
| `cours-api-checker` | Apres tout changement non trivial dans src/. Verifie qu'aucune API hors PDFs de cours n'est utilisee. | Sur demande ou en pre-rendu |
| `rapport-writer` | En fin de projet, ou quand une decision archi importante doit etre documentee. | Oui (mention de rapport) |
| `indentation-fixer` | Avant chaque commit important. -2 pts au rendu si non conforme. | Oui (mention d'indent/format) |
| `code-reviewer-ter` | Avant rendu / soutenance. Revue globale orientee grille de notation. | Oui (mention de review/audit global) |

Ils sont invocables manuellement (`lance l'agent X`) ou Claude les invoque automatiquement via le mode auto.

### .claude/commands/ — 8 slash commands

| Commande | Effet | Auto ? |
|---|---|---|
| `/nouvelle-entite <nom>` | Scaffold complet : modele + repository + colonne BD + endpoints | Oui (mention d'entite/table) |
| `/nouveau-endpoint <ressource> <action>` | Scaffold d'un endpoint API | Oui (mention d'endpoint) |
| `/audit-securite` | Lance l'auditeur securite sur tout `src/` | Oui |
| `/valider-w3c` | Valide HTML et CSS du projet | Oui |
| `/preparer-livraison` | Checklist pre-rendu complete (audits + livrables + archive) | Oui (mention de rendu/livraison) |
| `/verifier-stack` | Detecte toute techno hors stack | Oui (mention de stack/techno) |
| `/justifier-choix <decision>` | Aide a formuler une justification pour le rapport | Oui (mention de justifier) |
| `/rapport-section <section>` | Genere/met a jour une section du rapport | Oui (mention de rapport) |

### .claude/hooks/ — verifications automatiques

Tournent en arriere-plan a chaque action de Claude. Mode **avertissement non bloquant** :

- `SessionStart` (inject-context.sh) : rappelle le contexte projet a l'ouverture
- `UserPromptSubmit` :
  - `check-stack-mentions.sh` : detecte les technos interdites dans tes prompts (React, MySQL, Laravel...)
  - `router-proactif.sh` : detecte l'intent et conseille a Claude les bons agents/commandes a invoquer automatiquement (**mode auto**)
- `PreToolUse Write|Edit` (warn-dangerous-patterns.sh) : alerte si pattern dangereux :
  - Mot de passe en clair, MD5/SHA1, concatenation SQL, `.html()` avec input user
  - `fetch()`, `async/await`, `Promise`, arrow functions, classes ES6, modules `import/export`, destructuring (**APIs probablement hors-cours**)
  - Namespace PHP complexe, traits, yield
  - CSS Grid, CSS custom properties (a verifier dans cours)
  - Indentation tab, emoji
  - Couleur rouge generique (#FF0000, red) au lieu de la palette #EF4444
- `PostToolUse Write|Edit` : verifie indent 4 espaces + syntaxe `php -l`
- `Stop` : checklist de fin de tour si `src/` a change
- `statusLine` : affiche en permanence `[TER MIAGE Flashcards] | git:branch | Stack: HTML+CSS2+jQuery+PHP+SQLite | Indent: 4sp`

Si un hook avertit, **relis le message** : il pointe souvent une vraie violation du sujet ou du perimetre.

---

## 3. Perimetre des APIs - strictement limite aux PDFs de cours

Le sujet penalise tout code suspect d'avoir ete copie-colle ou genere sans comprehension. **Toute API JS / jQuery / PHP utilisee doit etre presente dans les PDFs de cours** :

- `project-files/JavaScript.pdf`
- `project-files/php (1).pdf`
- `project-files/initiation-HTML-CSS.pdf`

### APIs typiquement HORS-COURS (a eviter par defaut)

**JavaScript moderne** :
- `fetch()` -> utilise `$.ajax({url, type, data, success, error})`
- `async / await` -> utilise les callbacks success/error de `$.ajax`
- `Promise`, `.then()` -> idem
- Arrow functions `=>` -> utilise `function(){}`
- Classes ES6 (`class X {}`) -> utilise les classes PHP (en JS, organise en objets / IIFE)
- Modules `import`/`export` -> utilise plusieurs fichiers `<script>`
- Destructuring `const {a,b}=obj`, spread `...args` -> assignations classiques
- Template literals avec `${...}` -> concatenation avec `+`

**PHP avance** :
- Namespaces complexes -> `require_once` simple
- Traits -> heritage classique
- Yield / generateurs -> retourner un array
- Composer / autoload PSR-4 -> require_once

**CSS moderne** :
- CSS Grid -> flexbox
- CSS custom properties (`--var`) -> a verifier dans cours
- `:has()`, `:is()`, `:where()`

### Que faire si tu as un doute

1. Lance l'agent `cours-api-checker`.
2. Ou demande a Claude : « Cette syntaxe X est-elle dans `project-files/JavaScript.pdf` ? Verifie avant de l'utiliser. »
3. Si l'API n'est pas confirmee enseignee, demande une alternative dans le perimetre.

---

## 4. Interface - respecter `project-files/interface/`

L'equipe a fourni un design system complet. **L'implementation doit reproduire fidelement les mockups**.

### Ce qui est dans `project-files/interface/`

- `login.png`, `signup.png` (auth)
- `dashboard.png` (tableau de bord)
- `my_profile.png` (profil)
- `new_bag.png` (creation paquet)
- `share_bag.png` (modale partage)
- `question_give_response.png`, `current_revision.png`, `end_of_session.png` (revision Anki)
- `color_palette.png`, `typography.png`, `border_curveness_buttons.png` (design tokens)
- `figma-prototype.html` (prototype HTML interactif - **source CSS la plus precise**)

### Exception au mockup : le dashboard

Dans `dashboard.png`, "Mes paquets" et "Partages avec moi" apparaissent en **onglets**. **L'implementation doit etre en deux colonnes cote a cote** (gauche = Mes paquets, droite = Partages avec moi). C'est conforme au sujet ("l'ecran est separe en deux zones").

### Comportements UI obligatoires

- **Paquets cliquables partout** sur tous les ecrans (dashboard, partages, etc.). Un clic sur le titre / la card amene a l'ecran de visualisation du paquet.
- **Ecran de visualisation d'un paquet** : affiche titre + date + proprietaire + **liste des utilisateurs avec lesquels il est partage**. Si proprietaire, liens Editer/Supprimer.
- **Auto-completion sur le partage** : la modale de partage propose les utilisateurs au fur et a mesure de la saisie (cf. `share_bag.png`).
- **Mode revision** : flip card, scoring Check/Bad, mise a jour `last_score`/`best_score` du paquet en fin de session (uniquement si proprietaire).
- **Dark / Light mode** : toggle visible, preference persistee.
- **Validation dynamique des formulaires** : champ rouge en `keyup`/`blur` + message rouge sous champ + recap rouge en bas. Pas seulement au submit.

---

## 5. Workflow recommande (et pourquoi)

### Pour toute tache non triviale

```
1. EXPLORE  -> Demande a Claude de lire les fichiers ET les mockups concernes SANS rien modifier
2. PLAN     -> Demande un plan d'action avant tout code
3. VALIDE   -> Lis le plan, ajuste, donne un GO explicite
4. IMPLEMENTE -> Claude ecrit le code
5. VERIFIE  -> Claude lance automatiquement les agents pertinents (mode auto)
```

**Pourquoi ce workflow** : Claude peut implementer vite et bien, mais sans plan il invente parfois des fonctionnalites hors scope, casse une convention, ou utilise une API hors-cours. Un plan en mots permet de corriger avant que ce soit dans le code.

### Pour des taches triviales (typo, mini-fix, exploration)

Demande directement, en etant precis sur le scope.

> Bon prompt : « Dans src/public/css/main.css ligne 42, change la couleur de fond de la classe `.dashboard` en `#F0F2F8`. »
> Mauvais prompt : « Ameliore le CSS du dashboard. »

---

## 6. Comment briefer Claude correctement

### Bons prompts

**Demande d'implementation** :
```
Je veux implementer le mode revision. Lis project-files/interface/{question_give_response,current_revision,end_of_session}.png
pour l'UI, project-files/JavaScript.pdf pour confirmer que les APIs que tu vas utiliser sont enseignees.
Propose-moi un plan : HTML, CSS, JS (jQuery), endpoints PHP. N'ecris aucun code avant que je valide.
```

**Demande de correction** :
```
L'agent php-securite-auditor signale src/controllers/paquets.php:78 fait une concatenation SQL avec $_GET['id'].
Corrige en utilisant un parametre lie PDO. Verifie qu'aucune autre concatenation similaire existe.
```

**Demande d'audit** :
```
/preparer-livraison
```

**Demande d'aide rapport** :
```
/justifier-choix Repository pattern pour l'acces aux donnees
```

### Mauvais prompts (a eviter)

> « Fais le mode revision. »  
> Trop vague.

> « Utilise React, c'est plus propre. »  
> Hook bloque, et non, point.

> « Utilise fetch() pour les appels API. »  
> Probablement hors-cours, hook va alerter. Reste sur `$.ajax`.

> « Mets du CSS Grid pour le dashboard. »  
> Probablement hors CSS2. Utilise flexbox.

---

## 7. Anti-patterns dans l'usage de Claude

### Anti-pattern 1 : faire confiance aveugle au code genere

Claude peut ecrire du code qui compile mais qui :
- Utilise une API hors cours (`fetch`, `async`, arrow function)
- Rate une convention (nom de table en anglais, indentation 2 espaces)
- Diverge du mockup (couleurs hors palette, layout pas conforme)
- Oublie le pattern de validation rouge dynamique

**Toujours relire le diff humainement** et lancer les agents.

### Anti-pattern 2 : sauter le plan

« Vas-y, code directement. » -> Claude code, et tu corriges 30 minutes plus tard. Plus rapide de valider un plan en 2 minutes.

### Anti-pattern 3 : commit sans relecture humaine

Si tu ne sais pas expliquer une ligne, c'est rouge. Le sujet detecte la copie / le code non compris.

### Anti-pattern 4 : laisser Claude modifier les documents de reference

`project-files/*` ne doit JAMAIS etre modifie par Claude. Les permissions l'interdisent, mais ne change pas cette regle.

### Anti-pattern 5 : utiliser une API "ca marche" sans verifier le PDF de cours

Si l'API n'est pas dans le PDF, c'est suspect aux yeux du correcteur. Verifie ou alternative.

---

## 8. Discipline d'equipe

### Avant chaque session de codage

1. `git pull` pour recuperer le travail des autres.
2. Lis le dernier commit pour comprendre l'etat.
3. Ouvre Claude Code dans le projet.
4. Brief Claude sur la tache du jour.

### Pendant la session

- Si Claude propose une feature hors scope du dossier de conception : **stop**, refuse, ou discute en binome avant.
- Si Claude propose d'utiliser une API hors-cours : **stop**, demande une alternative.
- Si Claude diverge du mockup : **stop**, demande de respecter `project-files/interface/`.
- Si Claude ne sait pas justifier une decision en 1-3 phrases : la decision est probablement mauvaise.

### Apres chaque session de codage

1. Le mode auto a deja lance les agents pertinents - lis les verdicts.
2. Si quelque chose est rouge, fais corriger AVANT de quitter.
3. Verifie l'indentation 4 espaces (-2 pts !).
4. Relis le diff humain.
5. Commit avec un message clair en francais.
6. Push.

### Une fois par semaine au minimum

- Lance `/preparer-livraison` pour avoir l'etat global.
- Mets a jour le rapport (sections terminees).
- Synchronise avec le binome sur les blocages.

---

## 9. Securite et confidentialite

### Ce que Claude voit

- Tout le contenu du projet (`/Users/.../flashcards`).
- Les documents `project-files/` (sujet, conception, interface).
- Tes prompts.

### Ce qu'il ne faut PAS mettre dans le projet

- Mots de passe en clair (meme dans des fichiers `.env.example`).
- Credentials de comptes personnels.
- Donnees personnelles d'autres personnes (sauf pour tests, avec accord).
- Cles d'API.

### Ce qu'il faut gitignorer

Verifie que `.gitignore` contient :

```
.DS_Store
*.log
src/data/*.db
.claude/settings.local.json
```

Le fichier `.claude/settings.local.json` est pour des overrides personnels - **chaque membre a le sien, jamais commit**.

---

## 10. Patrons de prompts utiles (cheat sheet)

### Demarrer une nouvelle entite

```
/nouvelle-entite categorie
```

### Ajouter un endpoint

```
/nouveau-endpoint paquets dupliquer
```

### Verifier qu'on n'a pas casse la conception

```
Lance l'agent conception-alignment-checker.
```

### Verifier la conformite avec les mockups

```
Lance l'agent interface-compliance-checker sur src/views/dashboard.html et src/public/css/dashboard.css.
```

### Verifier qu'on n'utilise pas d'API hors-cours

```
Lance l'agent cours-api-checker sur tout src/. Verifie surtout src/public/js/.
```

### Avant chaque rendu intermediaire

```
/preparer-livraison
```

### Pour debugger un comportement

```
J'ai ce probleme : <description precise>.
Voici ce qui est attendu : <comportement attendu>.
Voici ce qui se passe : <comportement reel + message d'erreur>.
Lis les fichiers <chemins>, propose-moi 2-3 hypotheses ordonnees, et un plan pour
les tester. N'ecris pas de code avant que je dise laquelle tester.
```

### Pour ajouter une nouvelle convention au projet

```
Je veux qu'on adopte la convention <X> a partir de maintenant. Mets a jour CLAUDE.md
pour la documenter dans la section appropriee, et propose-moi le diff avant d'ecrire.
```

---

## 11. Communication entre binomes via Claude

### Convention de commit

```
<type>(<scope>): <description courte en francais>
```

Types : `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `rapport`.

Exemples :
- `feat(paquets): ajoute endpoint POST /api/paquets/dupliquer`
- `fix(auth): remplace md5 par password_hash BCRYPT`
- `style(css): indentation 4 espaces sur main.css`
- `rapport(patrons): justification du Singleton DB`

### Convention de branche

- `main` : etat stable
- `dev` : integration
- `feature/<nom-court>` : developpement de feature
- `fix/<bug>` : correction de bug

---

## 12. Erreurs courantes deja vues sur ce type de projet

### « Mon mot de passe est en MD5, c'est suffisant ? »

Non. Faute majeure. Utilise `password_hash($mdp, PASSWORD_BCRYPT)`.

### « J'ai utilise fetch() parce que c'est plus moderne. »

Probablement hors-cours. Utilise `$.ajax`. Le correcteur preferera un code qui ressemble au cours.

### « J'ai fait le dashboard en CSS Grid. »

Probablement hors-CSS2 et hors-cours. Utilise flexbox.

### « Mon code marche, donc c'est bon. »

Le sujet note la **qualite logicielle**, pas juste le fonctionnel. Un code qui marche mais qui contourne le pattern Repository, qui n'a pas de validation serveur, ou qui est mal indente, perd des points.

### « J'ai utilise Bootstrap pour aller plus vite. »

Non autorise. Refactor en CSS pur.

### « Mon dashboard utilise des onglets comme dans le mockup. »

Non. Le binome a decide : deux colonnes cote a cote, conforme au sujet ("l'ecran est separe en deux zones").

### « install.php contient des donnees de test avec ma vraie adresse mail »

Sors-les avant rendu. Donnees de test OK mais anonymisees.

### « Le rapport fait 2 pages, c'est court »

Vise 10-20 pages : architecture justifiee, un paragraphe par patron, description fichier par fichier, screenshots. Le rapport vaut 3/20.

---

## 13. Le jour du rendu

1. **Lance `/preparer-livraison`** et corrige les blocages.
2. **Verifie le numero de groupe** avec ton binome.
3. **Genere l'archive** :
   ```bash
   N=<numero>
   zip -r "projet-progweb-g${N}.zip" src/ rapport.pdf installation.txt \
       -x '*/.git/*' '*/.DS_Store' '*/node_modules/*' '*/data/*.db' '*/.claude/*' '*/project-files/*'
   ```
4. **Verifie l'archive** : `unzip -l "projet-progweb-g${N}.zip"`. Doit contenir : `src/`, `rapport.pdf`, `installation.txt`. Rien d'autre.
5. **Test final** : decompresse dans un repertoire temporaire, lance `install.php`, verifie que l'app demarre.
6. **Rend l'archive** sur le portail.

---

## 14. Le jour de la soutenance

- Connais ton code. Tu dois pouvoir expliquer chaque decision archi.
- Connais le sujet. Questions classiques : pourquoi MVC ? Pourquoi ces 3 patrons ? Pourquoi pas du JS framework ? Comment fonctionne BCRYPT ?
- Prepare une demo : creation compte -> creation paquet -> creation questions -> revision -> partage.
- Si une partie est faible, anticipe la question et prepare la reponse honnete.

---

## TL;DR

1. Lis ce guide en entier la premiere fois.
2. Mode auto actif : tape la tache, Claude invoque les bons outils.
3. APIs strictement limitees aux PDFs de cours - si doute, demande.
4. Interface : respecter `project-files/interface/`, exception dashboard 2 colonnes cote a cote.
5. Validation : rouge dynamique au keyup/blur + message sous champ + recap en bas.
6. Paquets cliquables partout, ecran visualisation avec destinataires.
7. Pour toute tache > triviale : Explore -> Plan -> Valide -> Implemente -> Verifie.
8. Lance `/preparer-livraison` souvent.
9. Pas de framework hors stack. Pas de mot de passe en clair. Indentation 4 espaces.
10. Relis tout le code humainement avant commit.
11. Le rapport vaut 3/20 - ne le laisse pas pour la veille.

Bonne route. Le binome qui maitrise Claude correctement gagne facilement 2-3 points sur ce projet.
