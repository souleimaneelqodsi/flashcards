#!/usr/bin/env bash
# Stop hook : rappelle a Claude en fin de tour les points de vigilance avant fin de tache.
# Mode : informatif. S'execute quand Claude termine sa reponse.

set -euo pipefail

# Ignore le payload
cat > /dev/null

# Verifier rapidement si du code a ete touche pendant la session via git diff
if ! command -v git >/dev/null 2>&1; then
    exit 0
fi

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

# A-t-on des changements non commit dans src/ ?
if ! git diff --quiet -- src/ 2>/dev/null; then
    changed_files=$(git diff --name-only -- src/ 2>/dev/null | head -10)
    if [ -n "$changed_files" ]; then
        msg="[Checklist fin de tour - fichiers modifies dans src/]\n$(printf '%s\n' "$changed_files" | sed 's/^/  - /')\n\nAvant de cloturer, verifie :\n  1. Indentation 4 espaces (lance /preparer-livraison ou l'agent indentation-fixer si doute)\n  2. Validation client ET serveur si un formulaire est touche (agent validation-checker)\n  3. Requetes preparees PDO (agent php-securite-auditor)\n  4. Aucune techno hors stack ajoutee (commande /verifier-stack)\n  5. Si HTML/CSS modifie : penser au validateur W3C (commande /valider-w3c)"
        python3 -c "
import json
print(json.dumps({'hookSpecificOutput': {'hookEventName': 'Stop', 'additionalContext': '''$msg'''}}))
" 2>/dev/null || printf '%b' "$msg" >&2
    fi
fi

exit 0
