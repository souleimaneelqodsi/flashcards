---
description: Cree une branche feature/<nom> depuis develop pour une nouvelle tache principale - demande TOUJOURS confirmation avant
argument-hint: <nom-court-snake-case de la tache, ex: inscription, mode-revision, partage>
allowed-tools: Bash, Read, Grep
---

Tu vas proposer la creation d'une branche `feature/<nom>` depuis `develop` pour une nouvelle tache principale. **Tu ne lances JAMAIS `git checkout -b` sans confirmation explicite du developpeur.**

## Protocole strict

### Etape 1 : valider le nom

L'argument `$ARGUMENTS` doit etre un nom court en snake-case (ou kebab-case), explicite et lie a une tache du dossier de conception.

Exemples acceptables : `inscription`, `connexion`, `dashboard`, `crud-paquets`, `crud-questions`, `mode-revision`, `partage-paquets`, `profil-utilisateur`, `dark-light-mode`.

Exemples a refuser ou clarifier : `feature1`, `test`, `wip`, `fix`, noms anglais hors-projet, noms vagues.

Si l'argument est vide ou ambigu : demande explicitement au developpeur quel est le nom de la branche, en proposant 2-3 options basees sur le contexte.

### Etape 2 : verifier la branche courante et son etat

Execute :

```bash
git status
git branch --show-current
git log --oneline -5
```

Trois cas possibles :

**Cas A** — sur `develop`, working tree propre :
- OK pour creer directement. Passe a l'etape 3.

**Cas B** — sur une autre branche `feature/<X>`, working tree propre :
- Demande : « Tu es sur la branche `feature/<X>`. Est-ce que la tache precedente est terminee ? Veux-tu la merger sur `develop` avant de partir sur `feature/$ARGUMENTS` ? (oui pour merger, non pour juste switcher sans merger). »
- Attends la reponse.
- Si oui : propose `git checkout develop && git merge --no-ff feature/<X>` (en demandant a nouveau confirmation pour le merge).
- Si non : passe a l'etape 3 (l'ancienne branche reste en l'etat).

**Cas C** — modifications non committed presentes :
- STOP. Demande : « Tu as des modifications non committed sur `<branche-courante>`. Tu veux :
  1. Les committer d'abord (lance `/commit`)
  2. Les stash temporairement (`git stash push -m "wip avant branche $ARGUMENTS"`)
  3. Annuler la creation de branche
  Reponds par 1, 2 ou 3. »
- Attends.

### Etape 3 : confirmation finale

Pose la question explicitement :

> « Tu es bien sur que la tache precedente est terminee et que tu veux passer a `feature/$ARGUMENTS` ?
> Je vais executer :
> ```
> git checkout develop
> git pull --ff-only
> git checkout -b feature/$ARGUMENTS
> ```
> OUI pour continuer, NON pour annuler. »

**Attends GO explicite.**

### Etape 4 : execution

Apres confirmation :

```bash
git checkout develop
git pull --ff-only 2>/dev/null || echo "Note : pas de remote ou pull impossible - on continue"
git checkout -b feature/$ARGUMENTS
git branch --show-current
```

Confirme avec `git status` + `git branch --show-current`.

### Etape 5 : suite logique

Apres la creation reussie :

- Affiche un rappel court : « Tu es maintenant sur `feature/$ARGUMENTS`. Pendant le developpement, je proposerai un commit par sous-tache via `/commit`. Quand la tache principale sera terminee, on mergera sur `develop`. »
- Suggere les premieres sous-taches a faire selon la nature de la tache (ex : pour `inscription` : "1. modele Utilisateur + repository, 2. endpoint POST /api/inscription, 3. formulaire HTML + JS validation, 4. tests").

## Refus

- **Jamais** de creation de branche sans confirmation explicite.
- **Jamais** de branche partant de `main`. Toujours partant de `develop`.
- **Jamais** de force-checkout (`git checkout -B`) sans accord explicite.
- **Jamais** ecraser une branche existante : si `feature/$ARGUMENTS` existe deja, signale-le et demande comment proceder (renommer, supprimer l'ancienne, autre nom).

## Cas particuliers

- Si `develop` n'existe pas localement (`git branch | grep develop` vide) : signale-le, demande au developpeur s'il faut la creer (`git checkout -b develop`) ou la fetcher depuis le remote (`git fetch origin develop:develop`).
- Si la branche `feature/$ARGUMENTS` existe deja : propose 3 options (a. switcher dessus sans recreer, b. renommer en `feature/$ARGUMENTS-2`, c. supprimer l'ancienne et recreer - demande confirmation forte).
- Si `git pull --ff-only` echoue (divergence sur develop) : STOP, signale et demande au developpeur de gerer la situation (merge manuel ou rebase volontaire).
