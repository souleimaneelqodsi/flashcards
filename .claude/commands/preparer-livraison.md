---
description: Checklist pre-rendu complete (audit securite, W3C, indentation, livrables, archive)
allowed-tools: Task, Read, Glob, Grep, Bash, Edit
---

Tu vas executer la checklist complete avant rendu du TER Flashcards. Marche systematiquement, sans sauter d'etape.

## Etape 1 : Audits paralleles (delegations)

Lance ces agents (peut etre fait en parallele via plusieurs invocations Task) :

- `php-securite-auditor` : audit securite complet sur src/
- `repository-enforcer` : aucun controller ne touche PDO
- `validation-checker` : parite client/serveur sur tous les formulaires
- `w3c-validator` : HTML/CSS valides
- `conception-alignment-checker` : alignement avec les diagrammes et le dossier
- `indentation-fixer` : indentation 4 espaces partout
- `code-reviewer-ter` : revue globale orientee notation

Collecte les verdicts.

## Etape 2 : Verifications structurelles

```bash
# Le dossier src/ existe
[ -d src ] && echo "OK src/" || echo "MANQUANT src/"

# rapport.pdf existe a la racine
[ -f rapport.pdf ] && echo "OK rapport.pdf" || echo "MANQUANT rapport.pdf"

# installation.txt existe
[ -f installation.txt ] && echo "OK installation.txt" || echo "MANQUANT installation.txt"

# install.php documente
grep -q install.php installation.txt 2>/dev/null && echo "OK install.php documente" || echo "A documenter dans installation.txt"

# Pas de fichier inutile dans le rendu
find . -maxdepth 2 -name 'node_modules' -o -name '.DS_Store' -o -name '__pycache__' -o -name '*.log' | grep -v project-files && echo "Nettoyer les fichiers inutiles" || echo "OK pas de bruit"

# La BD ne doit pas contenir de donnees de test au rendu
[ -f db.db ] && sqlite3 db.db "SELECT count(*) FROM utilisateurs" 2>/dev/null
```

## Etape 3 : Verification stack

Lance la commande `/verifier-stack` ou execute :

```bash
# Aucune dependance npm/composer
[ -f package.json ] && echo "ATTENTION : package.json present (non autorise)" || echo "OK pas de package.json"
[ -f composer.json ] && echo "ATTENTION : composer.json present (non autorise sauf justifie)" || echo "OK pas de composer.json"

# Aucun framework JS importe
grep -rE 'import.*from.*["'"'"'](react|vue|angular)' src/ && echo "ATTENTION : framework JS detecte" || echo "OK pas de framework JS"
```

## Etape 4 : Rapport et installation

- Verifie que `rapport.pdf` couvre : architecture, patrons (un paragraphe chacun), organisation des fichiers (description par fichier), instructions d'installation.
- Verifie que `installation.txt` explique : prerequis, install.php, lancement local.
- Lance l'agent `rapport-writer` si des sections semblent incompletes.

## Etape 5 : Numero de groupe et archive

Demande a l'utilisateur le numero de groupe (N).

Genere la commande d'archive (a executer manuellement, pas par toi) :

```bash
# A executer apres tous les fix
N=<numero_groupe>
zip -r "projet-progweb-g${N}.zip" src/ rapport.pdf installation.txt -x '*/.git/*' '*/node_modules/*' '*/.DS_Store' '*/data/*.db'
unzip -l "projet-progweb-g${N}.zip"  # verifier le contenu
```

## Etape 6 : Verdict final

Tableau recapitulatif :

```
| Bloc                  | Statut        | Note estimee | Notes |
|-----------------------|---------------|--------------|-------|
| Conception            | OK / KO       | X / 5        | ...   |
| Fonctionnel           | OK / KO       | X / 7        | ...   |
| UX / UI               | OK / KO       | X / 2        | ...   |
| Rapport               | OK / KO       | X / 3        | ...   |
| Indentation 4 espaces | OK / KO       | (-2 si KO)   | ...   |
| Stack respectee       | OK / KO       | -            | ...   |
| Securite mots de passe| OK / KO       | (faute)      | ...   |
```

Verdict final :
- "Pret a rendre" si tout est OK.
- "Pas pret : X blocages a corriger" sinon, avec liste priorisee.

**Ne ferme jamais sur "pret a rendre" si une faute majeure n'est pas resolue.**
