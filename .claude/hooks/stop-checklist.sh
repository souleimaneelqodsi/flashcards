#!/usr/bin/env bash
# Stop hook : rappelle a Claude en fin de tour les points de vigilance avant fin de tache.
# Mode : informatif. S'execute quand Claude termine sa reponse.

set -euo pipefail

cat > /dev/null

if ! command -v git >/dev/null 2>&1; then
    exit 0
fi

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

# A-t-on des changements non commit dans src/ ?
if ! git diff --quiet -- src/ 2>/dev/null || ! git diff --cached --quiet -- src/ 2>/dev/null; then
    changed_files=$(git diff --name-only -- src/ 2>/dev/null | head -10)
    staged_files=$(git diff --cached --name-only -- src/ 2>/dev/null | head -10)
    branche=$(git symbolic-ref --short HEAD 2>/dev/null || echo "?")

    bloc_changed=""
    if [ -n "$changed_files" ]; then
        bloc_changed="\nFichiers modifies non stages :\n$(printf '%s\n' "$changed_files" | sed 's/^/  - /')"
    fi
    bloc_staged=""
    if [ -n "$staged_files" ]; then
        bloc_staged="\nFichiers stages (pret a commit) :\n$(printf '%s\n' "$staged_files" | sed 's/^/  - /')"
    fi

    # Avertissement si on est sur develop ou main directement
    branche_warn=""
    case "$branche" in
        main|master|develop)
            branche_warn="\n[ATTENTION] Tu es sur la branche '$branche'. Travailler directement dessus est decommande. Propose '/branche <nom>' pour creer feature/<nom> depuis develop avant de continuer / commiter."
            ;;
    esac

    msg="[Checklist fin de tour - branche : $branche]${bloc_changed}${bloc_staged}${branche_warn}\n\nAvant de cloturer le tour, verifie / propose :\n  1. Indentation 4 espaces (lance /preparer-livraison ou l'agent indentation-fixer si doute)\n  2. Si formulaire touche : agent validation-checker (parite client/serveur + rouge dynamique + recap)\n  3. Si controleur PHP touche : agents repository-enforcer + php-securite-auditor\n  4. Si HTML/CSS touche : interface-compliance-checker + w3c-validator\n  5. Aucune techno hors stack ni API hors PDFs de cours (commande /verifier-stack + agent cours-api-checker)\n  6. **Si la sous-tache est terminee : propose /commit (demande confirmation explicite avant git commit)**\n  7. **Si la tache principale entiere est terminee : propose le merge feature -> develop (en demandant confirmation)**"

    python3 -c "
import json
print(json.dumps({'hookSpecificOutput': {'hookEventName': 'Stop', 'additionalContext': '''$msg'''}}))
" 2>/dev/null || printf '%b' "$msg" >&2
fi

exit 0
