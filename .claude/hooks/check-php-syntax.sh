#!/usr/bin/env bash
# PostToolUse hook : verifie la syntaxe PHP via php -l apres une ecriture.
# Mode : avertissement (non bloquant) mais important - un fichier en erreur de syntaxe ne marche pas.

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

case "$file_path" in
    *.php) ;;
    *) exit 0 ;;
esac

# php -l (lint)
if ! command -v php >/dev/null 2>&1; then
    # PHP pas installe localement, on signale juste une fois
    exit 0
fi

output=$(php -l "$file_path" 2>&1) || rc=$?
rc=${rc:-0}

if [ "$rc" -ne 0 ]; then
    err=$(printf '%s' "$output" | grep -E 'Parse error|Fatal error' | head -3 || true)
    msg="[Erreur syntaxe PHP] $file_path :\n${err}\n\nVerifie la syntaxe (php -l) avant de continuer."
    python3 -c "
import json
print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PostToolUse', 'additionalContext': '''$msg'''}}))
" 2>/dev/null || printf '%b' "$msg" >&2
fi

exit 0
