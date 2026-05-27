#!/usr/bin/env bash
# build-rapport.sh
# Concatene les sections docs/*.md dans l'ordre numerique pour produire
# rapport.md a la racine du projet. Le rapport.pdf est ensuite obtenu
# par conversion via pandoc (cf. ligne ci-dessous).
#
# Usage :
#     ./build-rapport.sh
#
# Apres execution :
#     - rapport.md  : concatenation Markdown de toutes les sections
#     - pour generer le PDF (necessite pandoc + xelatex ou wkhtmltopdf) :
#         pandoc rapport.md -o rapport.pdf --metadata title="FlashCards MIAGE - TER M1"
#
# Convention docs/README.md :
#     00-09 : page de garde / intro / conclusion
#     10-19 : architecture et patrons (DOC-ARCH)
#     20-29 : base de donnees (DOC-BD)
#     30-39 : securite et validation (DOC-AUTH)
#     40-49 : fonctionnel (DOC-FONC)
#     50-59 : UX / UI (DOC-UI)
#     60-69 : QA (plan tests, validations, audits)
#
# Chaque fichier docs/NN-*.md est inclus dans l'ordre de son prefixe.
# Le fichier docs/README.md est exclu (il sert de guide aux contributeurs,
# pas de section du rapport).

set -e

RACINE_PROJET="$(cd "$(dirname "$0")" && pwd)"
DOSSIER_DOCS="$RACINE_PROJET/docs"
FICHIER_RAPPORT="$RACINE_PROJET/rapport.md"

if [ ! -d "$DOSSIER_DOCS" ]; then
    echo "Erreur : dossier $DOSSIER_DOCS introuvable." >&2
    exit 1
fi

# En-tete du rapport.
{
    echo "% FlashCards MIAGE - Rapport TER M1"
    echo "% Augustin Lecomte, Souleimane El Qodsi"
    echo "% $(date '+%Y-%m-%d')"
    echo ""
} > "$FICHIER_RAPPORT"

# Liste des sections triees par prefixe numerique (00, 10, 20, ..., 60, ...).
# Le README est exclu.
nb_sections=0
for fichier in "$DOSSIER_DOCS"/*.md; do
    nom=$(basename "$fichier")
    if [ "$nom" = "README.md" ]; then
        continue
    fi
    echo "Inclusion : $nom"
    echo "" >> "$FICHIER_RAPPORT"
    cat "$fichier" >> "$FICHIER_RAPPORT"
    echo "" >> "$FICHIER_RAPPORT"
    nb_sections=$((nb_sections + 1))
done

if [ "$nb_sections" -eq 0 ]; then
    echo "Attention : aucun fichier de section trouve dans $DOSSIER_DOCS." >&2
fi

nb_lignes=$(wc -l < "$FICHIER_RAPPORT")
echo ""
echo "OK rapport.md genere ($nb_sections sections, $nb_lignes lignes)."
echo "Pour generer le PDF :"
echo "    pandoc rapport.md -o rapport.pdf --metadata title='FlashCards MIAGE - TER M1'"
