---
description: Propose un commit pour la sous-tache en cours - demande TOUJOURS confirmation avant d'executer git commit
argument-hint: <optionnel: scope ou message hint>
allowed-tools: Bash, Task, Read, Grep, Glob
---

Tu vas proposer un commit pour la sous-tache terminee. **Tu ne lances JAMAIS `git commit` sans confirmation explicite du developpeur.**

## Protocole strict

### Etape 1 : verifier l'etat

Execute ces commandes et affiche les sorties :

```bash
git status
git diff --stat
```

Si rien n'est modifie : signale-le et propose de ne rien faire.

### Etape 2 : demander confirmation que la sous-tache est terminee

Pose la question explicitement au developpeur :

> « Tu as fini cette sous-tache ? Voici ce qui sera committed :
> <liste des fichiers modifies / ajoutes / supprimes>
>
> Tu es sur que tout est OK pour commit ? Reponds OUI pour continuer, NON pour annuler. »

**Attends une reponse explicite avant de continuer.** Si la reponse est ambigue ("ouais", "ok", "vas-y" → OK ; "attends", "non", "pas encore" → STOP).

### Etape 3 : audits pre-commit selon le scope

Avant de proposer le message, lance les agents pertinents selon les fichiers touches :

- Si modifications PHP -> lance `php-securite-auditor` et `repository-enforcer`
- Si modifications JS / formulaire -> lance `validation-checker`
- Si modifications HTML / CSS -> lance `w3c-validator` + `interface-compliance-checker`
- Si modifications JS avec APIs douteuses -> lance `cours-api-checker`
- Dans tous les cas si fichier de code touche -> verifier indentation (lance `indentation-fixer` si doute)

Si un audit retourne des problemes graves (faute majeure, regression de patron), **STOP** : signale et propose de corriger avant le commit. Le developpeur peut choisir d'ignorer et de commit quand meme, mais explicitement.

### Etape 4 : proposer le message de commit

Format **Conventional Commits francais** :

```
<type>(<scope>): <description courte a l'imperatif, 50 chars max>

<corps optionnel : pourquoi, contexte>
```

Types : `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `rapport`.

Le scope reflete la zone touchee : `auth`, `inscription`, `paquets`, `questions`, `partage`, `revision`, `profil`, `dashboard`, `css`, `db`, `repositories`, `rapport`.

Exemples :
- `feat(inscription): ajoute formulaire client + validation dynamique`
- `feat(auth): hash BCRYPT a l'inscription + verify au login`
- `fix(paquets): refactorise concat SQL en requete preparee`
- `style(css): normalise indentation 4 espaces sur dashboard.css`
- `refactor(repositories): factorise fromRow dans BaseRepository`

Propose le message :

> « Voici le message de commit que je propose :
>
> ```
> <type>(<scope>): <description>
>
> <corps si pertinent>
> ```
>
> Tu valides ce message ? OUI pour committer, NON ou un message different pour ajuster. »

**Attends a nouveau une reponse explicite.**

### Etape 5 : execution

Apres validation explicite du message :

```bash
git add <fichiers concernes uniquement, jamais git add . sauf si l'utilisateur l'a explicitement valide>
git commit -m "<message>"
```

Affiche le hash du commit (`git log -1 --oneline`) et confirme.

### Etape 6 : suite logique

Apres un commit reussi :

- Si la tache principale est terminee aussi : propose de merger `feature/<X>` -> `develop` (toujours en demandant confirmation, via `/branche` ou directement avec un protocole similaire).
- Sinon : annonce ce qui peut etre la prochaine sous-tache.

## Refus

- **Jamais** de `git commit` sans confirmation explicite.
- **Jamais** de `git push` declenche depuis cette commande - c'est une etape separee qui demande sa propre confirmation.
- **Jamais** de `git add .` ou `git add -A` sauf si le developpeur l'a valide explicitement.
- **Jamais** de commit sur la branche `main`. Si on est dessus par erreur, signale-le et propose de creer une branche feature d'abord.

## Cas particuliers

- Si on est sur la branche `develop` directement : signale-le et propose de creer une branche `feature/<X>` avant de committer (sauf si c'est un commit de merge ou de doc explicitement sur `develop`).
- Si le diff est enorme (> 200 lignes ou > 5 fichiers) : suggere de splitter en plusieurs commits par sous-tache logique. Demande au developpeur s'il veut split.
- Si les agents detectent une regression grave : STOP avant le commit, signale, propose de corriger.
