#!/usr/bin/env bash
# UserPromptSubmit hook : detecte l'intent du prompt et conseille Claude d'invoquer
# proactivement les bons agents / slash commands SANS attendre instruction explicite.
# Mode : informatif via additionalContext. Exit 0 toujours.

set -u
trap 'exit 0' ERR

payload=$(cat || true)
prompt=$(printf '%s' "$payload" | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin)
    print(d.get("prompt", "").lower())
except Exception:
    print("")
' 2>/dev/null) || prompt=""

if [ -z "$prompt" ]; then
    exit 0
fi

# Fonction utilitaire : grep dans $prompt, retourne 0 (vrai) si match, 1 (faux) sinon
prompt_match() {
    printf '%s' "$prompt" | grep -qE "$1" 2>/dev/null
}

suggestions=""
add() {
    suggestions="${suggestions}
  - $1"
}

# ============ Detections d'intent ============

if prompt_match '\b(secu|securit|mot\s*de\s*passe|password|mdp|bcrypt|csrf|xss|session|inject|injection|hash|hachage)\b'; then
    add "Mode auto : invoque php-securite-auditor + /audit-securite apres ta modification."
fi

if prompt_match '\b(endpoint|controller|controleur|api\s+(rest|json)|route|routeur|ajax)\b'; then
    add "Mode auto : pour un endpoint, suis /nouveau-endpoint (validation client+serveur + CSRF). Apres modif, lance repository-enforcer + validation-checker."
fi

if prompt_match '\b(entite|table|modele|schema|sqlite|repository|repositories)\b'; then
    add "Mode auto : pour une entite/table, suis /nouvelle-entite. Verifie le modele de donnees fige (CLAUDE.md section 4) avant tout."
fi

if prompt_match '\b(formulaire|form|valider|validation|inscription|signup|login|connexion)\b'; then
    add "Mode auto : pour un formulaire, ecris validation client (jQuery keyup/blur .champ-invalide + message rouge sous champ + recap en bas) ET validation serveur PHP. Apres, lance validation-checker."
fi

if prompt_match '\b(html|css|view|template|ui|ux|design|interface|mockup|maquette|figma|style|couleur|palette|theme|dark|light)\b'; then
    add "Mode auto : avant de coder du HTML/CSS, consulte project-files/interface/ (mockup + figma-prototype.html). Apres modif, lance interface-compliance-checker + w3c-validator."
fi

if prompt_match '\b(dashboard|tableau\s*de\s*bord|accueil)\b'; then
    add "Mode auto : dashboard - Mes paquets et Partages avec moi en DEUX COLONNES cote a cote (pas en onglets). Cf. CLAUDE.md section 5."
fi

if prompt_match '\b(revision|reviser|anki|flip|carte|card|score|check|bad)\b'; then
    add "Mode auto : pour la revision, consulte project-files/interface/{question_give_response,current_revision,end_of_session}.png. last_score et best_score strictement personnels au proprietaire."
fi

if prompt_match '\b(partage|partager|sharing|destinataire|auto.?complet)\b'; then
    add "Mode auto : partage - consulte share_bag.png. Auto-completion obligatoire. L'ecran de visualisation d'un paquet doit afficher les destinataires."
fi

if prompt_match '\b(indent|indentation|4\s*espaces|4-espaces|format)\b'; then
    add "Mode auto : invoque indentation-fixer. -2 pts si non conforme."
fi

if prompt_match '\b(stack|techno|technologie|framework|librairie|library|dependance|dependency)\b'; then
    add "Mode auto : invoque /verifier-stack. Stack imposee : HTML + CSS2 + jQuery + PHP + SQLite."
fi

if prompt_match '\b(w3c|valid\s+(html|css)|validator|valide)\b'; then
    add "Mode auto : invoque /valider-w3c (HTML + CSS sans erreur)."
fi

if prompt_match '\b(rapport|report|redaction|justifier|justification)\b'; then
    add "Mode auto : invoque /rapport-section ou rapport-writer. Pour justifier un choix, /justifier-choix."
fi

if prompt_match '\b(rendu|rendre|livraison|livrer|deliver|deadline|deposer|archive|zip|finaliser)\b'; then
    add "Mode auto : invoque /preparer-livraison pour la checklist complete."
fi

if prompt_match '\b(review|revue|qualite|verifier\s+tout|tout\s+verifier|audit\s+global)\b'; then
    add "Mode auto : invoque code-reviewer-ter pour une revue orientee grille de notation + simplicite."
fi

if prompt_match '\b(fetch|async|await|promise|arrow function|=>|destructur|template literal|class extends)\b'; then
    add "Mode auto : API JS moderne mentionnee. Verifie d'abord dans project-files/JavaScript.pdf que c'est enseigne. Sinon, alternative jQuery / function classique. Invoque cours-api-checker."
fi

if prompt_match '\b(cours|pdf|enseigne|appris|enseignement)\b'; then
    add "Mode auto : consulte les PDFs de cours via Read (JavaScript.pdf, php (1).pdf, initiation-HTML-CSS.pdf)."
fi

# GIT - sous-tache terminee -> commit
if prompt_match '\b(j.?ai fini|j.?ai termine|c.?est fini|c.?est ok|c.?est bon|fini la sous.?tache|sous.?tache (terminee|finie|done)|tout est ok|tout est bon|tout marche|tout est pret)\b'; then
    add "Mode auto Git : sous-tache terminee detectee. Invoque /commit (confirmation explicite avant git commit, audits avant)."
fi

if prompt_match '\b(commit|committe?|comitt|commiter|comitter)\b'; then
    add "Mode auto Git : invoque /commit. Montrer git status + diff --stat et demander confirmation explicite. Branche principale = develop. Format Conventional Commits francais."
fi

# GIT - nouvelle tache principale -> branche
if prompt_match '\b(nouvelle (feature|tache|fonctionnalite)|tache principale|nouvelle branche|cree une branche|cree branche|on commence|on attaque)\b'; then
    add "Mode auto Git : nouvelle tache principale. Invoque /branche <nom> pour creer feature/<nom> depuis develop. Verifie branche actuelle propre avant."
fi

if prompt_match '\b(branche|branch|switcher|switch|checkout)\b'; then
    add "Mode auto Git : branche principale = develop. Format feature/<nom-court-snake-case>. Demander TOUJOURS confirmation avant checkout."
fi

if prompt_match '\b(merge|merger|fusionne|fusionner|integrer|pull request|pr)\b'; then
    add "Mode auto Git : pour merge sur develop, utilise git merge --no-ff feature/<X>. Demande confirmation. Audits verts avant."
fi

if prompt_match '\b(push|pousser|envoyer\s+(sur|au)\s+(remote|origin|github|gitlab))\b'; then
    add "Mode auto Git : git push doit etre confirme explicitement. Refuse tout git push --force sauf justification."
fi

# ============ Sortie ============

if [ -n "$suggestions" ]; then
    export TER_MSG="[Mode automatique - suggestions d'invocation]${suggestions}

N'attends pas d'instruction explicite : invoque les agents et commandes pertinents proactivement dans ton plan et apres execution."
    python3 -c 'import json, os
msg = os.environ.get("TER_MSG", "")
print(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": msg}}))
' 2>/dev/null || true
fi

exit 0
