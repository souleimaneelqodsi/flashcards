#!/usr/bin/env bash
# UserPromptSubmit hook : detecte les technologies interdites dans le prompt utilisateur
# et injecte un rappel ferme dans le contexte de Claude.
# Mode : informatif (non bloquant). Exit 0 toujours.

set -u
trap 'exit 0' ERR

payload=$(cat || true)
prompt=$(printf '%s' "$payload" | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin)
    print(d.get("prompt", ""))
except Exception:
    print("")
' 2>/dev/null) || prompt=""

if [ -z "$prompt" ]; then
    exit 0
fi

# Liste des technos interdites
forbidden_regex='\b(React|Vue\.js|Vue js|Angular|Next\.js|Nuxt|Svelte|TypeScript|Node\.js|Express|Laravel|Symfony|Doctrine|Eloquent|MySQL|PostgreSQL|MongoDB|MariaDB|Tailwind|Bootstrap|Webpack|Vite|Rollup|npm install|yarn add|composer require)\b'

matched=$(printf '%s' "$prompt" | grep -oiE "$forbidden_regex" 2>/dev/null | sort -u | tr '\n' ' ' || true)

if [ -n "$matched" ]; then
    # Passer le message via env pour eviter tout probleme d'echappement
    export TER_MSG="[Rappel stack TER] Le prompt mentionne : ${matched}. Ces technologies sont INTERDITES dans le projet (sujet TER M1 MIAGE). Stack autorisee : HTML + CSS2 + jQuery + PHP + SQLite uniquement. Si l'utilisateur insiste, refuse poliment et propose une alternative dans la stack imposee."
    python3 -c 'import json, os
msg = os.environ.get("TER_MSG", "")
print(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": msg}}))
' 2>/dev/null || true
fi

exit 0
