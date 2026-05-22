---
description: Aide a rediger une justification d'un choix d'architecture pour le rapport
argument-hint: <decision> (ex: "Singleton sur DB" ou "Factory via fromRow")
allowed-tools: Read, Glob, Grep
---

Aide a formuler une justification claire et courte pour le rapport.pdf, en 1 a 3 phrases.

## Methode

1. Comprends la decision : `$ARGUMENTS`. Si le contexte est ambigu, demande des precisions (Quel module ? Quelles alternatives etaient envisagees ?).

2. Cherche les usages reels dans le code pour ancrer la justification :
   - Glob les fichiers concernes
   - Grep les usages
   - Identifie le ou les benefices concrets (decouplage, testabilite, performance, conformite au sujet)

3. Formule la justification avec ce template :
   - Phrase 1 : QUOI - ce que le patron / la decision fait.
   - Phrase 2 : POURQUOI - le besoin concret resolu (en lien avec le projet, pas une formule generique).
   - Phrase 3 (optionnelle) : COMPROMIS - ce qu'on perd / les alternatives ecartees et pourquoi.

## Exemples de bons formats

**Singleton sur la connexion PDO** :
> Le patron Singleton garantit qu'une unique instance de connexion PDO est partagee entre tous les repositories au cours d'une requete HTTP. Cela evite l'ouverture/fermeture repetee de la connexion SQLite, simplifie le partage de transaction, et concentre la configuration de PDO en un seul point. Une instance par requete suffit ici : le contexte est mono-utilisateur, sans pool de connexions a gerer.

**Repository pattern** :
> Chaque entite metier (Utilisateur, Paquet, Question, Partage) dispose d'un repository qui encapsule l'acces SQL via PDO. Les controleurs ne manipulent jamais PDO directement, ce qui isole la persistance, rend le code testable independamment de la base, et permet de remplacer SQLite sans toucher a la couche metier. Le compromis - un peu plus de code initial - est negligeable a notre echelle et largement compense par la clarte.

**Factory via fromRow** :
> Chaque modele expose une methode statique fromRow(array $row): self qui reconstruit l'objet metier depuis une ligne de resultat SQL. Cela evite de disperser le mapping colonnes->proprietes dans plusieurs repositories et garantit la coherence si le schema evolue. La methode fait office de Factory legere, suffisante pour notre besoin sans introduire un Builder ou un mapper complet.

## Anti-patterns a eviter

- "C'est plus propre" : non explicatif. Dis pourquoi c'est plus propre.
- "Best practice" : le correcteur veut savoir si tu comprends, pas si tu repetes.
- Justification generique copiee d'internet : detection automatique.
- Plus de 3 phrases : on perd le focus.

## Sortie

Formule la justification finale dans un encadre Markdown. Indique ou la placer dans le rapport (section).
