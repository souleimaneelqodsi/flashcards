# Verification indentation 4 espaces

Exigence sujet TER (CLAUDE.md §8 + §10) : **indentation 4 espaces dans
tous les fichiers PHP/JS/CSS/HTML**. Penalite : -2 pts si non
respecte.

## Verdict

**Tout est conforme. -2 pts non applicable.**

Verification realisee via l'agent `indentation-fixer` qui a scanne :

- 47 fichiers au total dans :
  - `src/controllers/` (PHP)
  - `src/repositories/` (PHP)
  - `src/core/` (PHP)
  - `src/models/` (PHP)
  - `src/sql/` (PHP)
  - `src/views/` (PHP + HTML)
  - `src/public/css/` (CSS)
  - `src/public/js/` (JS, hors `lib/jquery-3.7.1.min.js`)
  - `src/public/index.php` (PHP)

Resultats :
- [x] Aucune tabulation (`\t`) residuelle.
- [x] Aucune indentation de code non multiple de 4.
- [x] Aucune modification apportee.

## Faux positifs ignores

Certains motifs ressemblent visuellement a une indentation hors 4 mais
sont en realite du **contenu** :

1. **Lignes de continuation de commentaires docblock PHP** (` * ...`)
   et CSS (` * ...`) : la convention PSR formate les docblocks avec un
   espace + asterisque, ce qui produit 1 ou 2 espaces de prefixe. Ce
   n'est pas de l'indentation de code, c'est du texte de commentaire.

2. **Chaines SQL multilignes dans les repositories** :

   ```php
   $statement = DB::getInstance()->executer(
       'SELECT id_paquet, titre, theme, date_creation
        FROM paquets
        WHERE id_proprietaire = ?
        ORDER BY date_creation DESC',
       array($id_proprietaire)
   );
   ```

   L'alignement du SQL (espaces avant `FROM`, `WHERE`, etc.) est
   **dans la valeur** de la chaine, pas dans l'indentation du code
   PHP. Modifier ces espaces changerait la chaine envoyee a PDO.

## Pour reproduire

```bash
# Detection d'eventuelles tabulations (devrait ne rien renvoyer)
grep -rPn "^\t" src/ --include="*.php" --include="*.js" --include="*.css" --include="*.html" \
  | grep -v "lib/"

# Detection d'indentations 1/2/3 espaces (faux positifs des docblocks,
# a verifier manuellement)
grep -rPn "^( {1,3}\S| {5,7}\S| {9,11}\S)" src/ \
  --include="*.php" --include="*.js" --include="*.css" \
  | grep -v "lib/" \
  | grep -v " \* " \
  | head -50
```

## Configuration recommandee pour l'IDE

Pour eviter toute regression future, configurer l'editeur :

- **VSCode** : `"editor.tabSize": 4`, `"editor.insertSpaces": true`,
  `"editor.detectIndentation": false`.
- **PhpStorm** : Settings -> Code Style -> PHP/JavaScript/CSS/HTML ->
  Tab and Indents : Use tab character = OFF, Tab size = 4, Indent = 4.

Un fichier `.editorconfig` a la racine du projet pourrait formaliser
ces choix pour tous les contributeurs :

```
root = true

[*]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

(Optionnel — pas requis pour le rendu, mais utile pour la maintenance.)
