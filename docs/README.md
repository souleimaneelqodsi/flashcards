# Documentation du rapport - FlashCards MIAGE

Ce dossier contient la **source du `rapport.pdf` final**. Pour permettre a
plusieurs personnes de rediger en parallele **sans conflit git**, chaque
section du rapport a son propre fichier.

## Convention

- Un fichier markdown **par section**, dans ce dossier `docs/`.
- Nom prefixe d'un **numero a deux chiffres** = ordre dans le rapport final.
- **Plages reservees par personne** : chacun n'edite QUE les fichiers de sa
  plage, donc deux personnes ne touchent jamais le meme fichier.

| Plage   | Theme                                    | Responsable | Taches CSV |
|---------|------------------------------------------|-------------|------------|
| 00 - 09 | Page de garde, introduction, conclusion  | Tous        | (assemblage) |
| 10 - 19 | Architecture et patrons de conception    | P2          | DOC-ARCH   |
| 20 - 29 | Base de donnees                          | P1          | DOC-BD     |
| 30 - 39 | Securite et validation                   | P3          | DOC-AUTH   |
| 40 - 49 | Fonctionnel                              | P5          | DOC-FONC   |
| 50 - 59 | UX / UI                                  | P4          | DOC-UI     |

### Fichiers attendus

- `00-page-de-garde.md`, `01-introduction.md`, `09-conclusion.md`
- `10-architecture.md`, `11-patrons.md`, `12-diagrammes-sequence.md`
- `20-modele-donnees.md`, `21-regles-metier.md`, `22-scripts-bd.md`
- `30-sessions.md`, `31-bcrypt.md`, `32-validation.md`, `33-acces-csrf.md`
- `40-crud.md`, `41-partage.md`, `42-revision-scoring.md`
- `50-charte-graphique.md`, `51-parcours-utilisateur.md`, `52-justifications-ux.md`

## Regles de redaction

- **N'edite que les fichiers de ta plage** : c'est ce qui garantit l'absence
  de conflit.
- Francais, **aucun emoji** (projet academique note, cf. CLAUDE.md section 8).
- Justifie chaque choix d'architecture en 1 a 3 phrases.
- Reference les diagrammes et les maquettes de `project-files/interface/`.
- Ne committe **pas** `rapport.pdf` a chaque modification : un binaire ne se
  fusionne pas (memes conflits que la base de donnees). Il est genere une
  seule fois a la fin.

## Assemblage du rapport (tache QA-11)

Concatener les fichiers de section dans l'ordre numerique (le glob
`[0-9][0-9]-*` exclut volontairement ce `README.md`) :

    cat docs/[0-9][0-9]-*.md > rapport-complet.md

puis convertir `rapport-complet.md` en `rapport.pdf` (par exemple avec
pandoc, ou via l'impression PDF d'un editeur markdown).
