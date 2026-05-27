# Conclusion

## Bilan fonctionnel

L'ensemble du perimetre defini dans le sujet TER a ete implementé :
inscription et connexion securisees, tableau de bord en deux colonnes,
CRUD complet sur paquets et questions, mode revision style Anki avec flip
et scoring, partage de paquets avec auto-completion, profil utilisateur avec
avatar et changement de mot de passe, dark / light mode.

Le mode revision merite une mention particuliere : la gestion du flip de
carte (animation CSS opacity + scaleX declenchee via `setTimeout` pour
respecter le perimetre des cours, sans `requestAnimationFrame` ni
`offsetWidth`) et la synchronisation du score en fin de session
(`last_score`, `best_score`) illustrent la contrainte de rester dans
la stack imposee tout en produisant une experience fluide.

## Bilan technique

### Ce qui a bien fonctionne

- **Architecture MVC + SPA** : la separation front (jQuery, routage par
  hash, cache d'ecrans) / back (endpoints PHP JSON) s'est revelee solide.
  Chaque couche a pu evoluer independamment : un endpoint peut changer sa
  validation sans toucher le HTML.
- **Patron Repository** : toute interaction avec SQLite passe par un
  repository dedie. Les controleurs n'ont jamais manipule PDO directement,
  ce qui a facilite les corrections de schema sans cascade de modifications.
- **Workflow Git** : la convention `feature/<nom>` → PR → merge `develop`
  avec une branche par contributeur a evite la majorite des conflits. Le seul
  probleme recurrent a ete la suppression accidentelle de fichiers docs lors
  de merges de branches parties d'un point anterieur — resolu par un commit
  de restauration systematique.

### Points d'amelioration identifies

- **Tests automatises** : l'absence de tests unitaires (PHPUnit, Jest) a
  rendu la regression difficile a detecter apres chaque merge. Des tests
  sur les repositories et les validations auraient accelere le QA.
- **Pagination** : les listes de paquets et de resultats de recherche ne
  sont pas paginées. Sur un compte avec beaucoup de paquets, le dashboard
  chargerait tout en une requete.
- **Gestion des conflits de partage** : si le proprietaire supprime un
  paquet partage, les destinataires ne recoivent aucune notification.
  Une table de notifications ou un message d'etat cote front serait
  pertinent.

## Perspectives

Les extensions naturelles du projet, hors perimetre du TER, seraient :

1. **Algorithme de repetition espacee** (style SM-2 d'Anki) : plutot que
   de presenter les cartes dans l'ordre, scheduler les cartes selon leur
   difficulte et la date du dernier passage.
2. **Import / export** de paquets au format CSV ou Anki `.apkg`.
3. **Statistiques personnelles** : graphes de progression par paquet,
   taux de reussite par theme, suivi sur la duree.
4. **Application mobile** : l'API JSON existante est deja consommable par
   une application mobile native ou React Native sans modification cote
   serveur.

## Remerciements

Nous remercions l'enseignante responsable du TER pour la clarté du sujet
et la disponibilite pendant les seances de suivi, ainsi que l'ensemble
des contributeurs du groupe pour leur travail documentaire.
