---
description: Execute toutes les micro-taches d'une macro-tache du CSV de repartition (ex /tache BACK-1). Auto-mode avec commits individuels, push+PR a la fin.
argument-hint: <macro-id> (ex BACK-1, AUTH-2, UI-1)
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Task
---

Tu vas executer **toutes les micro-taches** de la macro-tache `$ARGUMENTS` dans l'ordre, en mode auto avec commits individuels, et proposer push + PR a la fin.

## Source d'autorite

Le fichier de repartition : `project-files/repartition_taches_detaillee.csv`.

Format de chaque ligne : `Phase,Personne,Groupe,ID,Tache,Points,Reference_cours_ou_commentaire`.

## Convention macro-id / micro-id

- **Macro-tache** : `<PREFIX>-<PHASE>` (ex : `BACK-1`, `AUTH-2`, `UI-1`, `FRONT-2`, `DOC-ARCH`)
- **Micro-tache** : `<PREFIX>-<PHASE>.<NUMERO>` (ex : `BACK-1.1`, `BACK-1.2`)

Les groupes connus : `Conception` (DESIGN), `BD`, `Backend` (BACK), `Backend/Frontend` (AUTH), `Frontend` (UI / DASH / FRONT), `Fullstack` (FULL), `Documentation` (DOC-*), `QA`.

## Protocole strict

### Etape 1 - Charger les micro-taches

Execute :

```bash
grep -E "^Phase [0-9]+,P[0-9]+,[^,]+,$ARGUMENTS\." project-files/repartition_taches_detaillee.csv
```

Si le `grep` renvoie 0 ligne, **STOP** : signale `Macro-tache "$ARGUMENTS" introuvable dans le CSV` et propose une liste des macro-ids valides (extraire avec `awk -F',' 'NR>1 {sub(/\.[0-9]+$/, "", $4); print $4}' project-files/repartition_taches_detaillee.csv | sort -u`).

Sinon, affiche au developpeur :

> « Macro-tache **$ARGUMENTS** - N micro-taches identifiees :
>
> | ID | Groupe | Tache | Points |
> |---|---|---|---|
> | ... | ... | ... | ... |
>
> Total : N points.
> Je vais les enchainer en mode automatique avec un commit individuel par micro-tache cloturee, puis te demander confirmation pour le push + ouverture de PR a la fin. **OK pour demarrer ?** »

Attends un GO explicite.

### Etape 2 - Verifier la branche

Execute `git symbolic-ref --short HEAD` et `git status`.

- Si la branche n'est pas `feature/<quelque-chose>` (ex : on est sur `develop` ou `main`) : STOP et propose de creer la branche d'abord via `/branche <nom-deduit-de-la-macro-tache>`. Exemple : `/branche back-1-squelette` pour `BACK-1`.
- Si le working tree n'est pas propre : STOP, signale les modifications non committed, propose `/commit` d'abord.

### Etape 3 - Boucle d'execution des micro-taches

Pour **chaque** micro-tache de la liste, dans l'ordre du CSV :

#### 3.1 Annonce

Affiche brievement :

> « **[i/N] $ARGUMENTS.X - <Tache>** (Groupe : <Groupe>, <Points> pts) »

#### 3.2 Classifier la micro-tache

Selon le `Groupe` :

- **Code executable** : `Backend`, `Frontend`, `Fullstack`, `BD` (scripts SQL/PHP), `AUTH` (controleur). Tu codes.
- **Non-code (delegue au dev)** : `Conception` (diagrammes UML), `QA` (tests manuels). **Tu sautes** : affiche
  > « Micro-tache `$ARGUMENTS.X` (<Tache>) : type **<Groupe>**, livrable non generable par moi (diagramme/test manuel). Quand tu l'as fait, dis-moi et je documente. Je passe a la suivante. »
  Et tu passes a la micro-tache suivante.
- **Documentation** : `Documentation` (DOC-*). **Tu sautes aussi** en mode `/tache` automatique, sauf si le dev a explicitement demande l'aide a la redaction (alors invoque l'agent `rapport-writer`). Affiche :
  > « Micro-tache `$ARGUMENTS.X` (<Tache>) : type **Documentation**. Je peux assister via l'agent `rapport-writer` mais le contenu definitif te revient. Dis-moi explicitement si tu veux que je redige une ebauche, sinon je passe. »

#### 3.3 Si code executable

- **Plan si > 3 fichiers touches** (CLAUDE.md §12) : enonce le plan, demande GO explicite, attends.
- **Code** : implemente la micro-tache. Respecte la stack imposee (CLAUDE.md §2) et le perimetre des APIs cours (CLAUDE.md §2 bis).
- **Agents pertinents selon le groupe** :
  - `Backend` ou `AUTH` (cote serveur) : invoque `repository-enforcer` et `php-securite-auditor` apres modification.
  - `Frontend` (UI/DASH/FRONT) : invoque `interface-compliance-checker` et `w3c-validator`.
  - Formulaire touche : invoque `validation-checker`.
  - Toute modif code : verifier indentation (lance `indentation-fixer` si doute).
  - Toute modif JS : invoque `cours-api-checker` au moindre doute sur une API.
- **Si un agent signale un probleme grave** (faute majeure, regression de patron) : STOP la boucle, signale, demande au dev s'il veut corriger maintenant ou passer outre.

#### 3.4 Commit individuel (automatique, sans demander)

Apres validation des agents, execute **sans demander** :

```bash
git add <fichiers concernes uniquement>
git commit -m "<message Conventional Commits francais>"
```

Le format du message :

```
feat(<scope-deduit>): <description-micro-tache> [<ID-micro>]
```

Exemples :
- `feat(backend): scaffold src/ + .gitkeep [BACK-1.1]`
- `feat(auth): endpoint mock POST /api/auth/register [AUTH-1.1]`
- `feat(dashboard): layout 2 colonnes Mes Flashcards / Partagees [DASH-1.1]`

Affiche le hash du commit (`git log -1 --oneline`).

**Justification de l'autorisation globale** : le dev a explicitement lance `/tache`, ce qui constitue une autorisation pour les commits individuels des micro-taches associees. La confirmation explicite reste exigee pour le push final.

#### 3.5 Mini-rapport

Affiche brievement :

> « ✓ $ARGUMENTS.X termine. Commit : <hash> <message>. Audits : <verts/warnings>. »

(NB : Pas d'emoji dans le code, mais l'output console peut en contenir si tu y tiens — sinon utilise `OK` / `KO`.)

### Etape 4 - Recap final

Apres la derniere micro-tache, affiche un rapport global :

> « **Macro-tache $ARGUMENTS terminee.**
>
> Micro-taches traitees :
> - X.1 ... OK (commit <hash>)
> - X.2 ... DELEGUE au dev (UML/QA/Doc)
> - X.3 ... OK (commit <hash>)
> - ...
>
> Total commits : N. Points couverts : Y/Ztotal.
>
> Audits globaux : <synthese verts/warnings>.
>
> Reste a faire manuellement (delegue) :
> - X.2 : <description>
> - ...
>
> **OK pour push origin <branche-courante> + ouvrir une PR vers develop ?** (OUI / NON) »

### Etape 5 - Push + PR (si dev confirme)

Si OUI :

```bash
git push -u origin <branche-courante>
```

Puis, si `gh` est installe :

```bash
gh pr create --base develop --head <branche-courante> --title "feat(<scope>): macro-tache $ARGUMENTS" --body "<recap des micro-taches couvertes>"
```

Affiche le lien PR.

Si `gh` n'est pas installe : affiche le lien manuel `https://github.com/<owner>/<repo>/pull/new/<branche-courante>` (extrais owner/repo via `git remote get-url origin`).

Si NON : laisse en l'etat. Indique au dev :

> « Pas de push. Les commits locaux sont la, prets a etre pushes quand tu veux. Tu peux relancer `/tache` pour une autre macro-tache ou continuer manuellement. »

## Refus / garde-fous

- **Jamais** `git push` sans confirmation explicite (etape 5).
- **Jamais** de `git add .` ou `git add -A` : toujours `git add <fichiers concernes>`.
- Si la branche courante est `develop` ou `main` : STOP avant de commencer, propose `/branche`.
- Si une micro-tache touche > 3 fichiers : plan obligatoire avant code (CLAUDE.md §12).
- Si une API JS/PHP utilisee n'est pas dans les PDFs de cours (`project-files/JavaScript.pdf`, `php (1).pdf`, `initiation-HTML-CSS.pdf`) : invoque `cours-api-checker` avant d'ecrire.
- Si un audit retourne une **faute majeure** (MDP en clair, concatenation SQL, technologie hors-stack) : STOP la boucle, signale, demande explicitement comment proceder.

## Cas particuliers

- **CSV introuvable ou format casse** : signale, ne lance rien.
- **Macro-tache deja completement committed** : detecte via `git log --grep="\[$ARGUMENTS\."` ; si toutes les micro-taches ont deja un commit, signale-le et propose juste le push + PR.
- **Macro-tache partiellement faite** : reprend a la premiere micro-tache sans commit associe.
- **Conflit pendant un commit** : STOP, montre l'etat, demande au dev.

## Garanties

- Respect strict de CLAUDE.md (stack, APIs cours, patrons, securite, indentation 4 espaces, perimetre).
- Trace claire dans l'historique git (1 commit par micro-tache avec son ID en suffixe).
- Aucune action git destructive sans confirmation explicite.
