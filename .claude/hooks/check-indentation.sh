#!/usr/bin/env bash
# PostToolUse hook : verifie que le fichier ecrit est bien indente a 4 espaces.
# Mode : avertissement (non bloquant). Le sujet : -2 pts si non respecte.

set -euo pipefail

payload=$(cat)
file_path=$(printf '%s' "$payload" | python3 -c '
import json, sys
d = json.load(sys.stdin)
ti = d.get("tool_input", {})
print(ti.get("file_path", ""))
' 2>/dev/null || echo "")

[ -z "$file_path" ] && exit 0
[ ! -f "$file_path" ] && exit 0

# Cibler seulement les fichiers de code du projet
case "$file_path" in
    *.php|*.js|*.css|*.html) ;;
    *) exit 0 ;;
esac

# Ne verifier que les fichiers dans src/ (pas la config interne)
case "$file_path" in
    */src/*) ;;
    *) exit 0 ;;
esac

issues=""

# 1. Lignes avec tabulation en debut
tab_lines=$(grep -nP '^\t' "$file_path" | head -3 || true)
if [ -n "$tab_lines" ]; then
    issues="${issues}\n  - Tabulations en debut de ligne detectees (premieres occurrences) :\n$(printf '%s\n' "$tab_lines" | sed 's/^/      /')"
fi

# 2. Indentation par paire d'espaces (2-espaces au lieu de 4)
# Heuristique : si on trouve une ligne qui commence par exactement 2 espaces ET pas 4
two_space_lines=$(grep -nP '^  [^ ]' "$file_path" | head -3 || true)
if [ -n "$two_space_lines" ]; then
    issues="${issues}\n  - Possible indentation a 2 espaces au lieu de 4 (premieres occurrences) :\n$(printf '%s\n' "$two_space_lines" | sed 's/^/      /')"
fi

if [ -n "$issues" ]; then
    msg="[Indentation - rappel sujet] Le fichier $file_path semble ne pas respecter l'indentation 4 espaces (-2 pts si confirme au rendu) :$(printf '%b' "$issues")\n\nCorrige avant commit. Tu peux lancer l'agent indentation-fixer pour normaliser."
    python3 -c "
import json
print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PostToolUse', 'additionalContext': '''$msg'''}}))
" 2>/dev/null || printf '%b' "$msg" >&2
fi

exit 0
