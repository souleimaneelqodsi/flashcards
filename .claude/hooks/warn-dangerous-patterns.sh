#!/usr/bin/env bash
# PreToolUse hook (Write|Edit|MultiEdit) : avertit Claude AVANT d'ecrire un fichier
# si le contenu contient des patterns dangereux pour le projet TER Flashcards.
# Mode : avertissement (non bloquant). Exit 0 toujours, message via systemMessage.

set -euo pipefail

payload=$(cat)

file_path=$(printf '%s' "$payload" | python3 -c '
import json, sys
d = json.load(sys.stdin)
ti = d.get("tool_input", {})
print(ti.get("file_path", ""))
' 2>/dev/null || echo "")

content=$(printf '%s' "$payload" | python3 -c '
import json, sys
d = json.load(sys.stdin)
ti = d.get("tool_input", {})
parts = []
if "content" in ti: parts.append(ti["content"])
if "new_string" in ti: parts.append(ti["new_string"])
if "edits" in ti and isinstance(ti["edits"], list):
    for e in ti["edits"]:
        if isinstance(e, dict) and "new_string" in e:
            parts.append(e["new_string"])
print("\n".join(parts))
' 2>/dev/null || echo "")

[ -z "$content" ] && exit 0

# Skip docs, config, project-files
case "$file_path" in
    */project-files/*|*.md|*.txt|*.json|*.gitignore|*/CLAUDE.md) exit 0 ;;
esac

warnings=""

# Heuristique : le fichier touche aux mots de passe ?
touches_password=0
if printf '%s' "$content" | grep -qiE '\b(mdp|mot_de_passe|password|passwd|pwd)\b'; then
    touches_password=1
fi

# ============ SECURITE (priorite haute) ============

# 1. MD5/SHA1 dans un fichier qui manipule des mdp
if [ "$touches_password" = "1" ] && printf '%s' "$content" | grep -qiE '\b(md5|sha1)\s*\('; then
    warnings="${warnings}\n  [SECU] md5() ou sha1() detecte avec contexte mdp. INTERDIT : utilise password_hash(\$mdp, PASSWORD_BCRYPT) + password_verify()."
fi

# 2. INSERT/UPDATE utilisateurs sans hash visible
if printf '%s' "$content" | grep -qE '(INSERT[[:space:]]+INTO[[:space:]]+utilisateurs|UPDATE[[:space:]]+utilisateurs)' && [ "$touches_password" = "1" ]; then
    if ! printf '%s' "$content" | grep -qE 'password_hash|PASSWORD_BCRYPT'; then
        warnings="${warnings}\n  [SECU] INSERT/UPDATE sur utilisateurs sans password_hash() visible. Verifie le hachage avant insertion."
    fi
fi

# 3. Concatenation SQL
if printf '%s' "$content" | grep -qE '(query|exec|prepare)\s*\(\s*["'\''][^"'\'']*\$[a-zA-Z_]'; then
    warnings="${warnings}\n  [SECU] Possible concatenation de variable dans une requete SQL. Utilise des requetes preparees PDO avec parametres lies."
fi
if printf '%s' "$content" | grep -qiE '"\s*\.\s*\$[a-zA-Z_]+\s*\.\s*"\s*'; then
    if printf '%s' "$content" | grep -qiE '(SELECT|INSERT|UPDATE|DELETE)'; then
        warnings="${warnings}\n  [SECU] Concatenation PHP autour d'une variable dans une chaine SQL. Refactorise en requete preparee."
    fi
fi

# 4. eval
if printf '%s' "$content" | grep -qE '\beval\s*\('; then
    warnings="${warnings}\n  [SECU] eval() detecte. Rarement justifiable, dangereux."
fi

# 5. .html() avec contenu potentiellement utilisateur
if printf '%s' "$content" | grep -qE '\.html\s*\(\s*(data\.|response\.|result\.|user|input|val\(|\$_)'; then
    warnings="${warnings}\n  [SECU/XSS] \$.html() avec contenu utilisateur. Prefere \$.text() ou echappe avec htmlspecialchars cote PHP avant rendu."
fi

# 6. display_errors On
if printf '%s' "$content" | grep -qE 'display_errors\s*=\s*(On|1|true)'; then
    warnings="${warnings}\n  [SECU] display_errors active. En prod : Off + log dans un fichier."
fi

# 7. password_verify sans session_regenerate_id
if printf '%s' "$content" | grep -qE 'password_verify' && \
   printf '%s' "$content" | grep -qE '\$_SESSION\[.id_user.\]\s*='; then
    if ! printf '%s' "$content" | grep -qE 'session_regenerate_id'; then
        warnings="${warnings}\n  [SECU] Connexion reussie sans session_regenerate_id(true). Ajoute-le pour eviter le session fixation."
    fi
fi

# ============ STACK INTERDITE ============

# 8. Framework JS interdit
if printf '%s' "$content" | grep -qE '(import\s+React|from\s+["'\'']react|import\s+Vue|@angular|require\s*\(\s*["'\'']express)'; then
    warnings="${warnings}\n  [STACK] Import d'un framework interdit (React/Vue/Angular/Express). Stack imposee : jQuery uniquement."
fi

# ============ APIs HORS COURS PROBABLE (JS) ============

# 9. fetch() au lieu de $.ajax
if printf '%s' "$content" | grep -qE '\bfetch\s*\(\s*["'\''`/]'; then
    warnings="${warnings}\n  [COURS] fetch() detecte. Probablement hors cours - utilise \$.ajax({url, type, data, success, error}) ou \$.get/\$.post."
fi

# 10. async / await
if printf '%s' "$content" | grep -qE '\basync\s+function\b|\basync\s*\(' || \
   printf '%s' "$content" | grep -qE '\bawait\s+[a-zA-Z_$]'; then
    warnings="${warnings}\n  [COURS] async/await detecte. Probablement hors cours - utilise callbacks success/error de \$.ajax."
fi

# 11. Promise / .then
if printf '%s' "$content" | grep -qE '\bnew\s+Promise\s*\(|\.then\s*\(' ; then
    warnings="${warnings}\n  [COURS] Promise/.then detecte. Probablement hors cours - utilise callbacks de \$.ajax."
fi

# 12. Arrow functions
case "$file_path" in
    *.js)
        if printf '%s' "$content" | grep -qE '=>\s*\{|=>\s*[a-zA-Z_$(]' ; then
            warnings="${warnings}\n  [COURS] Arrow function (=>) detectee. Probablement hors cours - prefere function(){} (verifier dans JavaScript.pdf)."
        fi
        ;;
esac

# 13. Classes ES6
case "$file_path" in
    *.js)
        if printf '%s' "$content" | grep -qE '^\s*class\s+[A-Z][a-zA-Z_]*\s*\{|^\s*class\s+[A-Z][a-zA-Z_]*\s+extends' ; then
            warnings="${warnings}\n  [COURS] Classe ES6 (class X {}) detectee en JS. Probablement hors cours."
        fi
        ;;
esac

# 14. Modules ES6
case "$file_path" in
    *.js)
        if printf '%s' "$content" | grep -qE '^\s*(import|export)\s+' ; then
            warnings="${warnings}\n  [COURS] import/export ES6 detecte. Hors cours typique - on n'utilise pas de modules en projet TER."
        fi
        ;;
esac

# 15. let/const (avertissement leger - a verifier dans le PDF)
case "$file_path" in
    *.js)
        if printf '%s' "$content" | grep -qE '^\s*(let|const)\s+[a-zA-Z_$]' ; then
            if ! printf '%s' "$content" | grep -qE '^\s*var\s+'; then
                warnings="${warnings}\n  [COURS] Aucun 'var' detecte mais 'let'/'const' present. Verifier dans JavaScript.pdf quelle convention est enseignee."
            fi
        fi
        ;;
esac

# 16. Destructuring / spread
case "$file_path" in
    *.js)
        if printf '%s' "$content" | grep -qE '\.\.\.\s*[a-zA-Z_$]|\{\s*[a-zA-Z_$]+\s*,\s*[a-zA-Z_$]+\s*\}\s*=' ; then
            warnings="${warnings}\n  [COURS] Destructuring ou spread operator detecte. Probablement hors cours."
        fi
        ;;
esac

# 17. Template literals avec interpolation
case "$file_path" in
    *.js)
        if printf '%s' "$content" | grep -qE '`[^`]*\$\{' ; then
            warnings="${warnings}\n  [COURS] Template literal avec interpolation (\`...\${...}\`) detecte. Verifier dans le PDF avant usage."
        fi
        ;;
esac

# ============ APIs HORS COURS PROBABLE (PHP) ============

# 18. PHP namespaces complexes
if printf '%s' "$content" | grep -qE '^\s*namespace\s+[A-Z][a-zA-Z]*\\\\' ; then
    warnings="${warnings}\n  [COURS] Namespace PHP complexe detecte. Pour un TER initiation, prefere des require_once simples."
fi

# 19. Trait
if printf '%s' "$content" | grep -qE '^\s*trait\s+[A-Z]|use\s+[A-Z][a-zA-Z_]*\s*;' ; then
    warnings="${warnings}\n  [COURS] Trait PHP detecte. Probablement hors cours pour un TER M1."
fi

# 20. yield
if printf '%s' "$content" | grep -qE '\byield\s+' ; then
    warnings="${warnings}\n  [COURS] yield (generateurs) detecte. Hors cours typique."
fi

# ============ APIs HORS COURS PROBABLE (CSS) ============

# 21. CSS Grid
case "$file_path" in
    *.css)
        if printf '%s' "$content" | grep -qE 'display\s*:\s*(grid|inline-grid)' ; then
            warnings="${warnings}\n  [COURS] CSS Grid detecte. Probablement hors cours - utilise flexbox ou tableaux HTML."
        fi
        ;;
esac

# 22. CSS Custom properties (--var)
case "$file_path" in
    *.css)
        if printf '%s' "$content" | grep -qE '^\s*--[a-z-]+\s*:|var\(\s*--' ; then
            warnings="${warnings}\n  [COURS] CSS Custom Properties (--var, var()) detectees. Verifier dans initiation-HTML-CSS.pdf avant usage."
        fi
        ;;
esac

# ============ FORMAT / QUALITE ============

# 23. Indentation tab dans fichier code
case "$file_path" in
    *.php|*.js|*.css|*.html)
        if printf '%s' "$content" | grep -qP '^\t' ; then
            warnings="${warnings}\n  [INDENT] Tabulation en debut de ligne detectee. Le sujet exige 4 ESPACES (-2 pts sinon)."
        fi
        ;;
esac

# 24. Emoji
if printf '%s' "$content" | grep -qP '[\x{1F300}-\x{1F9FF}]|[\x{2600}-\x{27BF}]'; then
    warnings="${warnings}\n  [FORMAT] Emoji detecte. Projet academique : pas d'emoji dans code/commentaires/UI."
fi

# ============ INTERFACE / DESIGN ============

# 25. Couleur d'erreur hors palette
case "$file_path" in
    *.css|*.html|*.php)
        # Detecter du rouge non conforme : #ff0000, #f00, red literal
        if printf '%s' "$content" | grep -qiE '#FF0000|#F00\b|color\s*:\s*red\b|background-color\s*:\s*red\b' ; then
            warnings="${warnings}\n  [UI] Couleur rouge generique detectee. Palette de l'equipe : erreur = #EF4444, erreur-light = #FEE2E2 (cf. project-files/interface/color_palette.png)."
        fi
        ;;
esac

# Sortie
if [ -n "$warnings" ]; then
    msg="[Avertissements TER]$(printf '%b' "$warnings")\n\nMode avertissement non bloquant. Corrige avant ecriture ou justifie au binome."
    python3 -c "
import json
print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'additionalContext': '''$msg'''}}))
" 2>/dev/null || printf '%b\n' "$msg" >&2
fi

exit 0
