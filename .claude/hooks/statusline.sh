#!/usr/bin/env bash
# Status line : affiche en permanence un rappel du contexte TER en bas de l'ecran.

set -euo pipefail

# Lit le payload (model info, cwd, etc.)
payload=$(cat)
model=$(printf '%s' "$payload" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("model", {}).get("display_name", "Claude"))
except Exception:
    print("Claude")
' 2>/dev/null || echo "Claude")

cwd=$(printf '%s' "$payload" | python3 -c '
import json, sys, os
try:
    d = json.load(sys.stdin)
    print(os.path.basename(d.get("workspace", {}).get("current_dir", os.getcwd())))
except Exception:
    print("?")
' 2>/dev/null || echo "?")

# Branche git si dispo
branch=""
if command -v git >/dev/null 2>&1 && [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
    branch=$(cd "$CLAUDE_PROJECT_DIR" && git symbolic-ref --short HEAD 2>/dev/null || echo "")
    [ -n "$branch" ] && branch=" | git:$branch"
fi

printf '[TER MIAGE Flashcards] %s | %s%s | Stack: HTML+CSS2+jQuery+PHP+SQLite | Indent: 4sp' "$model" "$cwd" "$branch"
