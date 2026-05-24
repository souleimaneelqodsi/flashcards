#!/usr/bin/env bash
# SessionStart hook : injecte un rappel du contexte projet a chaque ouverture de session.

set -euo pipefail

cat > /dev/null

context=$(cat <<'CTX'
[Contexte TER MIAGE Flashcards charge automatiquement]

Stack imposee : HTML + CSS2 + jQuery + PHP + SQLite. Tout autre choix = perte de points.
APIs strictement limitees aux PDFs de cours (project-files/JavaScript.pdf, php (1).pdf, initiation-HTML-CSS.pdf).

Architecture : MVC en mode SPA.

PATRONS FIXES - 3 patrons exactement, pas plus :
  1. SINGLETON   : pour les configurations (connexion PDO unique via DB::getInstance() dans src/core/DB.php).
  2. REPOSITORY  : pour les classes interagissant avec la BD - un repository par entite
                   (UtilisateurRepository, PaquetRepository, QuestionRepository,
                   PartageRepository, DifficulteRepository). Aucun controleur ne touche
                   jamais PDO directement.
  3. FACTORY     : pour creer les paquets et questions - methodes statiques sur les modeles
                   (Paquet::creer(), Paquet::fromRow(), Question::creer(), Question::fromRow()).
                   PAS de classe Factory separee.

AUCUN AUTRE PATRON : pas d'Observer, pas de Strategy, pas de State, pas de Decorator.
Chaque patron justifiable en 1-3 phrases dans le rapport.

CODE SIMPLE - regle d'or :
Le code doit etre lisible par un etudiant M1 qui debute en PHP/JS. En cas d'hesitation entre
"elegant et court" vs "long mais limpide", choisir le limpide.
  - Fonctions courtes (max 30 lignes), une responsabilite chacune.
  - Noms explicites en francais (valider_email pas vEm).
  - Pas de chainage > 2 niveaux.
  - Pas de callbacks imbriques en JS (fonctions nommees a la place).
  - Pas de ternaires imbriques (if/else explicite).
  - Pas de meta-programmation, pas de reflection, pas d'eval.
  - Pas de cache custom ni lazy-loading complexe.
  - Variables locales explicites au lieu d'expressions inline.

Si tu n'arrives pas a expliquer une ligne en une phrase a un debutant, reecris plus simple.

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
      type(scope): description a l'imperatif [ID-micro-tache]
      ex : feat(inscription): valide email/mdp/date cote serveur PHP [AUTH-2.5]
  - Avant toute action git (commit, branche, merge, push) : DEMANDER CONFIRMATION EXPLICITE au binome.
  - Slash commands dedies : /commit (sous-tache terminee), /branche <nom> (tache principale),
    /tache <macro-id> (boucle toutes les micro-taches d'une macro avec commits individuels).
  - Permissions en mode 'ask' sur git add/commit/checkout/merge/push.

Avant toute decision archi : consulter les diagrammes (class_diagram, DB_relational_model, component_diagram, sequence_diagram).
Avant tout changement > 3 fichiers : proposer un plan AVANT de coder.
Avant d'utiliser une API JS/jQuery/PHP : verifier qu'elle apparait dans les PDFs de cours.

Sous-agents disponibles (.claude/agents/) :
  - php-securite-auditor          : BCRYPT, PDO prepare, sessions, CSRF, XSS
  - repository-enforcer           : aucun controleur ne touche PDO (verifie aussi Singleton DB + Factory creer/fromRow)
  - validation-checker            : parite validation client/serveur + rouge dynamique + recap
  - w3c-validator                 : HTML/CSS valide W3C
  - conception-alignment-checker  : alignement avec diagrammes + dossier de conception
  - interface-compliance-checker  : conformite mockups project-files/interface/
  - cours-api-checker             : aucune API hors PDFs de cours
  - rapport-writer                : redaction sections du rapport
  - indentation-fixer             : normalisation 4 espaces
  - code-reviewer-ter             : revue globale orientee grille de notation + simplicite

Slash commands (.claude/commands/) :
  /nouvelle-entite, /nouveau-endpoint, /audit-securite, /valider-w3c,
  /preparer-livraison, /verifier-stack, /justifier-choix, /rapport-section,
  /commit, /branche <nom>, /tache <macro-id>

Mode automatique : invoque les agents/commands proactivement selon la matrice CLAUDE.md section 13.
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
