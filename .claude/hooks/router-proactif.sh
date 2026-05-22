#!/usr/bin/env bash
# UserPromptSubmit hook : detecte l'intent du prompt et conseille Claude d'invoquer
# proactivement les bons agents / slash commands SANS attendre instruction explicite.
# Mode : informatif via additionalContext.

set -euo pipefail

payload=$(cat)
prompt=$(printf '%s' "$payload" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("prompt", "").lower())
except Exception:
    print("")
' 2>/dev/null || echo "")

[ -z "$prompt" ] && exit 0

suggestions=""

# ============ Detections d'intent ============

# Detection ID de tache (macro ou micro) - declenche /tache
# Macro : BACK-1, AUTH-2, UI-1, FRONT-2, FULL-2, DOC-ARCH, DOC-BD, QA
# Micro : BACK-1.1, AUTH-2.10, etc.
task_id_match=$(echo "$prompt" | grep -oE '\b(design|bd|back|auth|ui|dash|front|full|doc-[a-z]+|qa)-[0-9]+(\.[0-9]+)?\b' | head -1)
if [ -n "$task_id_match" ]; then
    macro_id=$(echo "$task_id_match" | tr 'a-z' 'A-Z' | sed -E 's/\.[0-9]+$//')
    if echo "$task_id_match" | grep -q '\.'; then
        suggestions="${suggestions}\n  - Mode auto : ID de micro-tache detecte ($task_id_match). Consulte 'project-files/repartition_taches_detaillee.csv' pour lire l'intitule. Pour executer toute la macro $macro_id, lance '/tache $macro_id'. Pour cibler uniquement cette micro-tache, code-la directement en respectant son intitule."
    else
        suggestions="${suggestions}\n  - Mode auto : macro-tache $macro_id detectee dans le prompt. Lance '/tache $macro_id' qui va lire le CSV 'project-files/repartition_taches_detaillee.csv', enchainer toutes les micro-taches en mode auto avec commits individuels, et te demander confirmation pour push + PR a la fin."
    fi
fi

# Securite / mot de passe / auth
if echo "$prompt" | grep -qE '\b(secu|securit|mot\s*de\s*passe|password|mdp|bcrypt|csrf|xss|session|inject|injection|hash|hachage)\b'; then
    suggestions="${suggestions}\n  - Mode auto : tu vas probablement avoir besoin de l'agent 'php-securite-auditor' et de la commande '/audit-securite' apres ta modification. Invoque-les sans attendre."
fi

# Endpoint / controleur / API
if echo "$prompt" | grep -qE '\b(endpoint|controller|controleur|api\s+(rest|json)|route|routeur|ajax)\b'; then
    suggestions="${suggestions}\n  - Mode auto : pour un endpoint, suis le protocole de la commande '/nouveau-endpoint' (validation client+serveur + CSRF). Apres modification, lance 'repository-enforcer' + 'validation-checker'."
fi

# Entite / table / modele
if echo "$prompt" | grep -qE '\b(entite|table|modele|schema|sqlite|repository|repositories)\b'; then
    suggestions="${suggestions}\n  - Mode auto : pour une entite/table, suis '/nouvelle-entite'. Verifie le modele de donnees fige (CLAUDE.md section 4 + project-files/DB_relational_model.jpeg) avant tout."
fi

# Formulaire / validation
if echo "$prompt" | grep -qE '\b(formulaire|form|valider|validation|inscription|signup|login|connexion)\b'; then
    suggestions="${suggestions}\n  - Mode auto : pour un formulaire, ecris la validation client (jQuery, keyup/blur, .champ-invalide, message rouge sous champ, recap en bas) ET la validation serveur en PHP. Apres modification, lance l'agent 'validation-checker'."
fi

# HTML / CSS / interface
if echo "$prompt" | grep -qE '\b(html|css|view|template|ui|ux|design|interface|mockup|maquette|figma|style|couleur|palette|theme|dark|light)\b'; then
    suggestions="${suggestions}\n  - Mode auto : avant de coder du HTML/CSS, consulte 'project-files/interface/' (mockup pertinent + figma-prototype.html). Apres modification, lance 'interface-compliance-checker' + 'w3c-validator'."
fi

# Dashboard
if echo "$prompt" | grep -qE '\b(dashboard|tableau\s*de\s*bord|accueil)\b'; then
    suggestions="${suggestions}\n  - Mode auto : pour le dashboard, rappel binome - 'Mes paquets' et 'Partages avec moi' doivent etre en DEUX COLONNES cote a cote (pas en onglets). Cf. CLAUDE.md section 5."
fi

# Revision / Anki / flip / score
if echo "$prompt" | grep -qE '\b(revision|reviser|anki|flip|carte|card|score|check|bad)\b'; then
    suggestions="${suggestions}\n  - Mode auto : pour le mode revision, consulte project-files/interface/{question_give_response,current_revision,end_of_session}.png. last_score et best_score sont strictement personnels au proprietaire."
fi

# Partage
if echo "$prompt" | grep -qE '\b(partage|partager|sharing|destinataire|auto.?complet)\b'; then
    suggestions="${suggestions}\n  - Mode auto : pour le partage, consulte project-files/interface/share_bag.png. Auto-completion obligatoire. L'ecran de visualisation d'un paquet doit afficher les destinataires."
fi

# Indentation / format
if echo "$prompt" | grep -qE '\b(indent|indentation|4\s*espaces|4-espaces|format)\b'; then
    suggestions="${suggestions}\n  - Mode auto : invoque l'agent 'indentation-fixer'. Le sujet retire -2 pts si indentation non conforme."
fi

# Stack / techno
if echo "$prompt" | grep -qE '\b(stack|techno|technologie|framework|librairie|library|dependance|dependency)\b'; then
    suggestions="${suggestions}\n  - Mode auto : invoque '/verifier-stack' pour confirmer qu'aucune techno hors stack n'est introduite. Stack imposee : HTML + CSS2 + jQuery + PHP + SQLite."
fi

# W3C / validation HTML CSS
if echo "$prompt" | grep -qE '\b(w3c|valid\s+(html|css)|validator|valide)\b'; then
    suggestions="${suggestions}\n  - Mode auto : invoque '/valider-w3c' (HTML + CSS sans erreur)."
fi

# Rapport
if echo "$prompt" | grep -qE '\b(rapport|report|redaction|justifier|justification|expliquer\s+(le|la|les)\s+(choix|decision))\b'; then
    suggestions="${suggestions}\n  - Mode auto : pour le rapport, invoque '/rapport-section <section>' ou l'agent 'rapport-writer'. Pour justifier un choix, '/justifier-choix <decision>'."
fi

# Rendu / livraison
if echo "$prompt" | grep -qE '\b(rendu|rendre|livraison|livrer|deliver|deadline|deposer|deposer|archive|zip|finaliser)\b'; then
    suggestions="${suggestions}\n  - Mode auto : invoque '/preparer-livraison' pour la checklist complete (audits + livrables + archive)."
fi

# Review / revue / qualite
if echo "$prompt" | grep -qE '\b(review|revue|qualite|verifier\s+tout|tout\s+verifier|audit\s+global)\b'; then
    suggestions="${suggestions}\n  - Mode auto : invoque l'agent 'code-reviewer-ter' pour une revue orientee grille de notation."
fi

# Mention d'API moderne hors-cours
if echo "$prompt" | grep -qiE '\b(fetch|async|await|promise|arrow function|=>|destructur|template literal|let \w+|const \w+|class extends)\b'; then
    suggestions="${suggestions}\n  - Mode auto : le prompt mentionne une API JS moderne. **Verifie d'abord dans project-files/JavaScript.pdf** que c'est enseigne. Sinon, propose une alternative jQuery / function classique. Invoque l'agent 'cours-api-checker' au besoin."
fi

# Si on parle de cours, PDFs
if echo "$prompt" | grep -qE '\b(cours|pdf|enseigne|appris|enseignement)\b'; then
    suggestions="${suggestions}\n  - Mode auto : consulte les PDFs de cours via Read avant d'avancer (project-files/JavaScript.pdf, project-files/php (1).pdf, project-files/initiation-HTML-CSS.pdf)."
fi

# ============ GIT - sous-tache terminee -> commit ============
if echo "$prompt" | grep -qE '\b(j.?ai fini|j.?ai termine|c.?est fini|c.?est ok|c.?est bon|fini la sous.?tache|sous.?tache (terminee|finie|done)|tout est ok|tout est bon|tout marche|tout est pret)\b'; then
    suggestions="${suggestions}\n  - Mode auto Git : il semble qu'une sous-tache soit terminee. Invoque '/commit' pour proposer un commit (demande confirmation explicite avant git commit, lance les audits pertinents avant)."
fi

if echo "$prompt" | grep -qE '\b(commit|committe?|comitt|commiter|comitter)\b'; then
    suggestions="${suggestions}\n  - Mode auto Git : invoque '/commit'. Toujours montrer 'git status' + 'git diff --stat' et demander confirmation explicite avant d'executer git commit. Branche principale = develop. Format Conventional Commits francais : type(scope): description."
fi

# ============ GIT - nouvelle tache principale -> branche ============
if echo "$prompt" | grep -qE '\b(nouvelle (feature|tache|fonctionnalite)|tache principale|nouvelle branche|cree une branche|cree branche|on commence|on attaque)\b'; then
    suggestions="${suggestions}\n  - Mode auto Git : il semble qu'une nouvelle tache principale commence. Invoque '/branche <nom>' pour proposer une branche feature/<nom> depuis develop. Verifie d'abord que la branche actuelle est propre/commit (sinon propose '/commit' avant)."
fi

if echo "$prompt" | grep -qE '\b(branche|branch|switcher|switch|checkout)\b'; then
    suggestions="${suggestions}\n  - Mode auto Git : pour toute operation de branche, branche principale = develop. Format des branches feature : feature/<nom-court-snake-case>. Demande TOUJOURS confirmation avant git checkout / git checkout -b / git switch."
fi

# ============ GIT - merge ============
if echo "$prompt" | grep -qE '\b(merge|merger|fusionne|fusionner|integrer|pull request|pr)\b'; then
    suggestions="${suggestions}\n  - Mode auto Git : pour un merge sur develop, utilise 'git merge --no-ff feature/<X>'. Demande confirmation explicite. Verifie que la feature est propre (commits coherents, audits verts) avant."
fi

# ============ GIT - push ============
if echo "$prompt" | grep -qE '\b(push|pousser|envoyer\s+(sur|au)\s+(remote|origin|github|gitlab))\b'; then
    suggestions="${suggestions}\n  - Mode auto Git : git push doit etre confirme explicitement. Ne push JAMAIS sans accord. Refuse tout git push --force sauf justification ecrite."
fi

# ============ Sortie ============

if [ -n "$suggestions" ]; then
    msg="[Mode automatique - suggestions d'invocation]$(printf '%b' "$suggestions")\n\nN'attends pas d'instruction explicite : invoque les agents et commandes pertinents proactivement dans ton plan et apres execution."
    python3 -c "
import json
print(json.dumps({'hookSpecificOutput': {'hookEventName': 'UserPromptSubmit', 'additionalContext': '''$msg'''}}))
" 2>/dev/null || printf '%b\n' "$msg" >&2
fi

exit 0
