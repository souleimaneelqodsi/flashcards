---
description: Detecte toute technologie hors stack (React, Vue, Angular, MySQL, frameworks PHP, etc.)
allowed-tools: Read, Grep, Glob, Bash
---

Audite le projet pour detecter toute utilisation de technologies non autorisees par le sujet TER.

## Stack autorisee

| Couche | Autorise | Note |
|---|---|---|
| HTML | HTML5 | Doit etre valide W3C |
| CSS | CSS2 (max) / CSS3 (si justifie) | Doit etre valide W3C |
| JS | JavaScript vanilla + jQuery | jQuery recommande par le sujet |
| PHP | PHP standard | Justifier OO vs procedural dans le rapport |
| BDD | SQLite | Acces via PDO |

## Technologies a detecter (interdites)

| Categorie | Patterns a chercher |
|---|---|
| Framework JS | React, Vue, Angular, Svelte, Next.js, Nuxt, Alpine |
| TypeScript | `.ts` files, `tsconfig.json`, `from "ts"` |
| Build tools | Webpack, Vite, Rollup, Parcel, esbuild |
| Package managers | npm/yarn/pnpm (sauf si seulement dev tooling personnel non commit) |
| Framework PHP | Laravel, Symfony, CodeIgniter, CakePHP, Slim |
| ORM | Doctrine, Eloquent, Propel |
| BDD non SQLite | MySQL, PostgreSQL, MongoDB, MariaDB |
| CSS framework | Bootstrap, Tailwind, Bulma, Materialize, Foundation |
| CDN non jQuery | tout CDN qui n'est pas jquery.js |
| Templating PHP | Twig, Blade, Smarty |
| Runtime | Node.js (sauf scripts dev locaux) |

## Methode

Execute (et affiche les sorties) :

```bash
echo "## Fichiers de config interdits"
for f in package.json package-lock.json yarn.lock pnpm-lock.yaml composer.json composer.lock tsconfig.json webpack.config.js vite.config.js .babelrc; do
    [ -f "$f" ] && echo "TROUVE : $f"
done | grep -v '^$' || echo "OK aucun fichier de config interdit"

echo ""
echo "## Frameworks JS dans le code"
grep -rEn 'import\s+.*\s+from\s+["'"'"']react|from\s+["'"'"']vue|@angular|from\s+["'"'"']svelte' src/ 2>/dev/null || echo "OK pas de framework JS"

echo ""
echo "## CSS frameworks"
grep -rEn 'bootstrap|tailwind|bulma|materialize|foundation' src/ 2>/dev/null | grep -v 'comments' || echo "OK pas de CSS framework"

echo ""
echo "## CDN non-jQuery"
grep -rEn '<script[^>]+src=["'"'"']https?://' src/ 2>/dev/null | grep -v 'jquery' || echo "OK seul jQuery en CDN (ou pas de CDN)"

echo ""
echo "## ORM / Frameworks PHP"
grep -rEn 'use\s+(Doctrine|Eloquent|Illuminate|Symfony|Laravel|Slim|Twig)' src/ 2>/dev/null || echo "OK pas d'ORM / framework PHP"

echo ""
echo "## TypeScript"
find src -name '*.ts' -o -name 'tsconfig*' 2>/dev/null | head -5 || echo "OK pas de TypeScript"

echo ""
echo "## SGBD non-SQLite"
grep -rEn 'mysqli|mysql_|pg_connect|MongoDB|MariaDB' src/ 2>/dev/null || echo "OK SQLite uniquement"
```

## Verdict

A la fin :

- "Stack conforme au sujet" si aucune detection.
- Sinon, liste les violations avec le fichier/ligne et le remplacement recommande dans la stack autorisee.

**Rappel** : sortir de la stack = points perdus, parfois consequents.
