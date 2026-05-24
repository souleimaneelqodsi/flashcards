Le workflow complet maintenant

3 niveaux hiérarchiques

Branche develop
│
└── feature/<X> ← TACHE PRINCIPALE (via /branche)
│
├── Commit 1 ← MICRO-tache (BACK-1.1)
├── Commit 2 ← MICRO-tache (BACK-1.2)
├── Commit 3 ← MICRO-tache (BACK-1.3)
└── ... ← Tout regroupe par MACRO-tache (via /tache)
│
└── Push + PR vers develop

Le flux ideal — toi tu tapes ca :

/tache BACK-1

Et Claude fait tout le reste :

Etape 1 — Lit le CSV project-files/repartition_taches_detaillee.csv, extrait les 6 micro-taches BACK-1.1 a BACK-1.6, te montre la liste,
demande GO.

Etape 2 — Verifie que tu es sur une branche feature/<X>. Si non (ex: tu es sur develop), propose /branche back-1-squelette d'abord.

Etape 3 — Boucle, pour chaque micro-tache dans l'ordre :

- Code (avec plan si > 3 fichiers)
- Invoque les agents pertinents selon le Groupe du CSV :
    - Backend → repository-enforcer + php-securite-auditor
    - Frontend → interface-compliance-checker + w3c-validator
    - Formulaire → validation-checker
    - JS douteux → cours-api-checker
- Commit auto (sans demander) avec ID en suffixe :
  feat(backend): scaffold src/ + .gitkeep [BACK-1.1]
- Mini-rapport "OK / KO / warnings"

Etape 4 — Pour les micro-taches non-codables (UML / Doc / QA), saute et te dit "a faire manuellement".

Etape 5 — Recap global a la fin :

▎ « Macro-tache BACK-1 terminee. 5 commits, 1 delegue (UML). OK pour push + PR vers develop ? »

Etape 6 — Si OUI : git push + gh pr create + lien PR.

---

Auto-trigger sans taper /tache

Si tu ecris juste "je travaille sur BACK-1" ou meme "BACK-1" dans le prompt, le hook router-proactif.sh detecte l'ID et me suggere de lancer
/tache BACK-1 proactivement.

Confirmations

┌────────────────────────────┬───────────────────────────────────────┐
│ Action │ Confirmation requise ? │
├────────────────────────────┼───────────────────────────────────────┤
│ Lancer /tache │ OUI (etape 1, demande GO) │
├────────────────────────────┼───────────────────────────────────────┤
│ Creer branche feature │ OUI (si pas deja sur une) │
├────────────────────────────┼───────────────────────────────────────┤
│ Code de chaque micro-tache │ NON (auto) │
├────────────────────────────┼───────────────────────────────────────┤
│ Plan si > 3 fichiers │ OUI (CLAUDE.md §12) │
├────────────────────────────┼───────────────────────────────────────┤
│ Commit individuel │ NON (autorisation globale via /tache) │
├────────────────────────────┼───────────────────────────────────────┤
│ Push origin │ OUI (etape 5) │
├────────────────────────────┼───────────────────────────────────────┤
│ Ouverture PR vers develop │ OUI (etape 5) │
├────────────────────────────┼───────────────────────────────────────┤
│ Merge sur develop │ OUI (manuel apres revue PR) │
└────────────────────────────┴───────────────────────────────────────┘

Les autres slash commands restent dispo

- /commit : commit manuel (confirmation par commit, hors /tache)
- /branche <nom> : creation manuelle de branche
- /nouvelle-entite, /nouveau-endpoint, /audit-securite, /valider-w3c, /preparer-livraison, /verifier-stack, /justifier-choix,
  /rapport-section : inchanges

---

Concretement, pour finir la macro BACK-1 maintenant
