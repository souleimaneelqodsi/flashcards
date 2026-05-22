---
description: Validation W3C du HTML et du CSS du projet (verifications statiques + soumission au validateur)
allowed-tools: Task, Read, Glob, Grep, Bash
---

Lance l'agent `w3c-validator` sur l'ensemble du projet pour produire un rapport de validation W3C.

Etapes :

1. Invoque l'agent `w3c-validator` via `Task` : "Valide tous les fichiers HTML (src/views/, src/public/) et CSS (src/public/css/) selon les regles W3C et les contraintes du sujet (CSS2 max, HTML sans erreur, pas de framework, pas de balises depreciees)."
2. Affiche le rapport recu.
3. Pour chaque fichier en erreur, propose un correctif precis (ligne par ligne).
4. Si l'utilisateur le demande, applique les corrections via Edit.

## Verification supplementaire

Apres validation, verifie qu'aucun framework CSS externe n'est inclus :

```bash
grep -rn 'bootstrap\|tailwind\|bulma\|materialize' src/public/ || echo "Aucun framework CSS externe."
grep -rn 'cdn.jsdelivr\|cdnjs.cloudflare\|unpkg' src/public/ | grep -v 'jquery' || echo "Seul jQuery est en CDN, conforme."
```

## Verdict final

- "HTML/CSS conformes W3C, pret pour rendu UX/UI"
- ou "X erreurs W3C a corriger avant rendu - impact note UX/UI"
