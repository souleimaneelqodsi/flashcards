---
description: Audit securite complet du projet TER (BCRYPT, PDO prepare, sessions, CSRF, XSS)
allowed-tools: Task, Read, Grep, Glob, Bash
---

Lance l'agent `php-securite-auditor` sur l'ensemble du projet pour produire un rapport complet d'audit securite.

Etapes :

1. Utilise le tool `Task` pour invoquer l'agent `php-securite-auditor` avec instruction : "Audite TOUT le code PHP du projet (src/) selon les regles du sujet TER. Liste toutes les violations en hierarchisant majeur/grave/moyen."
2. Une fois le rapport recu, affiche-le tel quel.
3. Si des violations majeures ou graves sont detectees, propose un plan de correction priorise (ne corrige pas automatiquement).
4. A la fin, lance un Grep rapide complementaire :
   - `grep -rn "md5\|sha1" src/`
   - `grep -rn "mot_de_passe" src/ | grep -v "password_hash\|password_verify"`
   - `grep -rnE '(query|exec)\s*\(\s*"[^"]*\$' src/`

5. Donne un verdict final clair :
   - "Pret pour rendu cote securite" si aucune violation majeure/grave.
   - "X violations bloquantes a corriger avant rendu" sinon.

Rappelle qu'un mot de passe stocke en clair est une **faute majeure** pour le sujet.
