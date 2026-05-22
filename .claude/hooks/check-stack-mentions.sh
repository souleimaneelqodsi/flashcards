#!/usr/bin/env bash
# UserPromptSubmit hook : detecte les technologies interdites dans le prompt utilisateur
# et injecte un rappel ferme dans le contexte de Claude.
# Mode : informatif (non bloquant).

set -euo pipefail

payload=$(cat)
prompt=$(printf '%s' "$payload" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("prompt",""))' 2>/dev/null || echo "")

if [ -z "$prompt" ]; then
    exit 0
fi

# Liste des technos interdites avec leur regex
forbidden_regex='\b(React|Vue\.js|Vue js|Angular|Next\.js|Nuxt|Svelte|TypeScript|Node\.js|Express|Laravel|Symfony|Doctrine|Eloquent|MySQL|PostgreSQL|MongoDB|MariaDB|Tailwind|Bootstrap|Webpack|Vite|Rollup|npm install|yarn add|composer require)\b'

if printf '%s' "$prompt" | grep -qiE "$forbidden_regex"; then
    matched=$(printf '%s' "$prompt" | grep -oiE "$forbidden_regex" | sort -u | tr '\n' ' ')
    msg="[Rappel stack TER] Le prompt mentionne : $matched. Ces technologies sont INTERDITES dans le projet (sujet TER M1 MIAGE). Stack autorisee : HTML + CSS2 + jQuery + PHP + SQLite uniquement. Si l'utilisateur insiste, refuse poliment et propose une alternative dans la stack imposee."

    python3 -c "
import json
print(json.dumps({'hookSpecificOutput': {'hookEventName': 'UserPromptSubmit', 'additionalContext': '''$msg'''}}))
" 2>/dev/null || echo "$msg" >&2
fi

exit 0
