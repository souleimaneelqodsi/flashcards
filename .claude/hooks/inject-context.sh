#!/usr/bin/env bash
# SessionStart hook : injecte un rappel du contexte projet a chaque ouverture de session.

set -euo pipefail

cat > /dev/null

context=$(cat <<'CTX'
[Contexte TER MIAGE Flashcards charge automatiquement]

Stack imposee : HTML + CSS2 + jQuery + PHP + SQLite. Tout autre choix = perte de points.
APIs strictement limitees aux PDFs de cours (project-files/JavaScript.pdf, php (1).pdf, initiation-HTML-CSS.pdf).

Architecture : MVC en mode SPA.
Patrons obligatoires choisis par le binome - 3 patrons parmi les 5 du sujet :
  1. SINGLETON   : DB::getInstance() pour la connexion PDO unique (src/core/DB.php)
  2. REPOSITORY  : un repository par entite (UtilisateurRepository, PaquetRepository,
                   QuestionRepository, PartageRepository, DifficulteRepository). Aucun
                   controleur ne touche jamais PDO directement.
  3. FACTORY     : Entite::fromRow(array $row): self sur chaque modele, pour reconstruire
                   les objets metier depuis les rows SQL.

Chacun des 3 patrons doit etre justifiable en 1-3 phrases dans le rapport. Cf. /justifier-choix.

Indentation : 4 espaces partout (PHP/JS/CSS/HTML). -2 pts sinon.
Securite : BCRYPT pour mots de passe, PDO prepare obligatoire, sessions PHP, CSRF tokens, htmlspecialchars.
Validation : client (JS) ET serveur (PHP), toujours les deux. Champ rouge dynamique au keyup/blur + message rouge sous champ + recap rouge en bas. Pattern fige par le binome.
Interface : project-files/interface/ a respecter strictement, exception dashboard en 2 colonnes cote a cote (pas en onglets).
Paquets cliquables partout. Ecran de visualisation d'un paquet affiche les destinataires de partage.

Source d'autorite : project-files/ter_m1_miage.pdf > Dossier de Conception > diagrammes > interface.

Workflow Git (strict) :
  - Branche principale : develop (jamais main).
  - Une branche feature/<nom-court-snake-case> par tache principale, partant de develop.
  - Un commit par sous-tache, format Conventional Commits francais :
      type(scope): description a l'imperatif
      ex : feat(inscription): ajoute validation cote serveur PHP
  - Avant toute action git (commit, branche, merge, push) : DEMANDER CONFIRMATION EXPLICITE au binome.
  - Slash commands dedies : /commit (sous-tache terminee) et /branche <nom> (tache principale).
  - Permissions en mode 'ask' sur git add/commit/checkout/merge/push - Claude doit donc proposer
    le message/la branche, puis attendre validation.

Avant toute decision archi : consulter les diagrammes (class_diagram, DB_relational_model, component_diagram, sequence_diagram).
Avant tout changement > 3 fichiers : proposer un plan AVANT de coder.
Avant d'utiliser une API JS/jQuery/PHP : verifier qu'elle apparait dans les PDFs de cours.

Sous-agents disponibles (.claude/agents/) :
  - php-securite-auditor          : BCRYPT, PDO prepare, sessions, CSRF, XSS
  - repository-enforcer           : aucun controleur ne touche PDO (verifie aussi Singleton DB + Factory fromRow)
  - validation-checker            : parite validation client/serveur + rouge dynamique + recap
  - w3c-validator                 : HTML/CSS valide W3C
  - conception-alignment-checker  : alignement avec diagrammes + dossier de conception
  - interface-compliance-checker  : conformite mockups project-files/interface/
  - cours-api-checker             : aucune API hors PDFs de cours
  - rapport-writer                : redaction sections du rapport
  - indentation-fixer             : normalisation 4 espaces
  - code-reviewer-ter             : revue globale orientee grille de notation

Slash commands (.claude/commands/) :
  /nouvelle-entite, /nouveau-endpoint, /audit-securite, /valider-w3c,
  /preparer-livraison, /verifier-stack, /justifier-choix, /rapport-section,
  /commit (sous-tache), /branche <nom> (tache principale, depuis develop)

Mode automatique : tu invoques les agents/commands proactivement selon la matrice CLAUDE.md section 13, sans attendre instruction explicite. En particulier :
  - Sous-tache terminee : propose /commit (demande confirmation).
  - Nouvelle tache principale : propose /branche (demande confirmation).
CTX
)

printf '%s' "$context" | python3 -c '
import json, sys
ctx = sys.stdin.read()
print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": ctx}}))
' 2>/dev/null || {
    echo "$context" >&2
}

exit 0
