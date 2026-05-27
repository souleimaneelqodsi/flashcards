# Mode revision Anki et scoring

Le sujet TER (option 2) impose un **mode revision style Anki** : carte
recto avec la question, retournement au clic pour reveler la reponse,
evaluation "je savais / a revoir", puis recap de fin de session avec un
score. Cette section decrit l'implementation cote serveur (endpoints
study + score) et cote client (machine d'etats + bascule de cartes +
remontee du score). Elle precise aussi la regle metier centrale :
`last_score` et `best_score` sont **strictement personnels au
proprietaire** (CLAUDE.md §4).

## 1. Vue d'ensemble du flux

```
Dashboard
   |  clic "Reviser" sur une card paquet (WIRE-1.1)
   v
#study-<id>
   |  GET /api/paquets/:id/study  (STUDY-1.1)
   v
Carte recto (Q_affichee)
   |  clic carte ou touche Espace
   v
Carte verso (R_revelee)
   |  clic "Je savais !" ou "A revoir" (touches 1 / 2)
   v
question suivante ... derniere question
   |  POST /api/paquets/:id/score (STUDY-1.2)  -- proprietaire UNIQUEMENT
   v
#fin-session-<id>  -- Session_finie
   |  clic "Tableau de bord"
   v
Dashboard avec last_score / best_score mis a jour sur la card
```

Le declenchement initial (clic Reviser) est detaille en section 6.

## 2. Modele de donnees

Les deux champs metier de la progression sont sur le paquet :

| Colonne | Type | Semantique |
|---|---|---|
| `last_score` | INTEGER 0..100 / NULL | Score de la **derniere** session jouee par le proprietaire. NULL tant qu'aucune session. |
| `best_score` | INTEGER 0..100 / NULL | Meilleur score jamais atteint par le proprietaire. NULL tant qu'aucune session. |

Pas de table separee pour l'historique des sessions : le sujet
n'impose pas la conservation des sessions individuelles, seulement le
`last_score` et le `best_score`. Si on voulait suivre une vraie courbe
de progression, il faudrait ajouter une table `sessions` (id_session,
id_paquet, id_user, score, date) — hors scope du TER.

## 3. Endpoint backend GET /api/paquets/:id/study

### 3.1 Reponse

```json
{
    "paquet": { "id_paquet": 1, "titre": "...", "theme": "...", "last_score": 75, "best_score": 90, ... },
    "questions": [
        { "id_question": 12, "contenu_question": "...", "contenu_reponse": "...", "id_difficulte": 2 },
        ...
    ],
    "est_proprietaire": true
}
```

Tout ce dont le front a besoin pour rendre la session est dans la
reponse. Une seule requete reseau au demarrage = pas de "flash" entre
chargement du paquet et chargement des questions.

### 3.2 Acces : proprietaire OU destinataire

Le mode revision est ouvert au destinataire d'un partage : sinon le
partage n'aurait pas d'interet (l'objectif est justement de lui
permettre de reviser). La meme regle d'acces que pour
`GET /api/paquets/:id/questions` est appliquee.

Le `est_proprietaire` cote serveur est calcule par comparaison directe
`paquet.id_proprietaire === session.id_user` ; il est utilise par le
front pour decider s'il doit ou non appeler l'endpoint de score a la
fin (cf. 4.3).

### 3.3 Ordre des questions

Le SQL `ORDER BY id_question ASC` dans
`QuestionRepository::trouver_par_paquet` garantit l'ordre d'ajout. Pas
de melange aleatoire pour rester deterministe et facilement testable
(un melange "Anki" type espacee-repetition serait une feature
ulterieure).

## 4. Endpoint backend POST /api/paquets/:id/score

### 4.1 Contrat

Body : `{"score": 75}` (entier 0..100).

Verifications :

1. CSRF + auth.
2. `id_paquet` valide.
3. Paquet existe.
4. **L'utilisateur courant est proprietaire** (sinon 403 avec message
   explicite : "seul le proprietaire peut enregistrer un score").
5. `score` est un entier dans [0, 100] (defense type via
   `lire_score_corps`, qui refuse les strings non numeriques, les
   floats, les valeurs hors borne).

Mise a jour :

- `last_score = score` (systematique).
- `best_score = max(best_precedent, score)` (uniquement si meilleur,
  ou premier score jamais enregistre).

Reponse : `200` + `{"paquet": {..., "last_score": 75, "best_score": 90}}`.

### 4.2 Pourquoi pas "proprietaire ou destinataire" ?

C'est la regle metier la plus stricte du sujet (CLAUDE.md §4) :

> Le partage transfere l'acces au contenu, pas la progression.
> `last_score`/`best_score` sont **strictement personnels au
> proprietaire**.

Si on autorisait un destinataire a ecrire un score, il polluerait les
stats du proprietaire (une mauvaise session du destinataire ferait
chuter le `last_score` affiche au proprietaire sur son dashboard,
voire pire ferait croire que le proprietaire a fait une mauvaise
session). Le serveur refuse donc strictement (403), et le front
n'appelle meme pas l'endpoint dans ce cas (cf. 4.3 : optimisation
client).

### 4.3 Note implementation : le destinataire ne fait pas l'appel

Cote front (`study.js::envoyer_resultat_session`), avant d'appeler
`AjaxService.post`, on lit `utilisateur_est_proprietaire` (renseigne
par la reponse de `/study`) et on saute l'appel API si l'utilisateur
n'est pas proprietaire :

```javascript
if (utilisateur_est_proprietaire !== true) {
    remplir_recap_fin_session(undefined);
    window.location.hash = hash_fin;
    return;
}
```

C'est une **double protection** : le serveur refuserait de toute facon
avec 403, mais on evite une requete reseau inutile et un toast
d'erreur inutile a l'utilisateur destinataire (qui a juste fait sa
session sans intention malicieuse).

## 5. Machine d'etats cote client

Reference : diagramme d'etats-transitions DESIGN-0.4. Trois etats
nommes par des constantes :

```javascript
var ETAT_QUESTION = "Q_affichee";
var ETAT_REPONSE  = "R_revelee";
var ETAT_FINIE    = "Session_finie";
```

**Pas de pattern State** (CLAUDE.md §3 limite les patterns aux 3
retenus : Singleton, Repository, Factory). On implemente l'etat par un
**simple flag** `etat_session` plus des fonctions d'ecriture explicite
(`afficher_face_recto`, `afficher_face_verso`).

### Transitions

| De | Action utilisateur | Vers | Effet visuel |
|---|---|---|---|
| Q_affichee | clic carte / Espace | R_revelee | Verso visible, boutons Check/Bad visibles |
| R_revelee | clic carte / Espace | Q_affichee | Recto visible (re-bascule) |
| R_revelee | clic "Je savais" / 1 | Q_affichee (suivante) OU Session_finie | Incrementation correctes, navigation |
| R_revelee | clic "A revoir" / 2 | Q_affichee (suivante) OU Session_finie | Incrementation mauvaises, navigation |
| Session_finie | (vue de fin affichee) | - | Plus de transitions possibles |

Les gardes sont implementees dans les handlers : les boutons Check/Bad
ne reagissent que si `etat_session === ETAT_REPONSE` (les clics tardifs
sont silencieusement ignores).

## 6. Bascule recto / verso (flip)

Le sujet decrit un "retournement de carte". Plutot qu'une animation 3D
CSS (`transform: rotateY` + `transform-style: preserve-3d`) qui
sortirait du perimetre du cours `initiation-HTML-CSS.pdf`, on utilise
un simple **toggle de visibilite** :

```javascript
function afficher_face_recto() {
    $("#study-carte-recto").show().removeAttr("hidden");
    $("#study-carte-verso").hide().attr("hidden", "hidden");
    $("#study-evaluation").hide().attr("hidden", "hidden");
    etat_session = ETAT_QUESTION;
}
```

Le rendu visuel reste fluide grace a une legere transition CSS sur
l'opacite. La zone d'evaluation (boutons "Je savais / A revoir")
n'apparait qu'apres flip vers le verso (logique de la garde sur
l'etat).

## 7. Navigation et raccourcis clavier

Quatre raccourcis sont actifs dans la vue d'etude :

| Touche | Action |
|---|---|
| Espace | Flip recto/verso |
| 1 | Je savais (uniquement en R_revelee) |
| 2 | A revoir (uniquement en R_revelee) |
| Fleche gauche / droite | Question precedente / suivante |

Les codes touches utilises sont `event.keyCode` (forme historiquement
enseignee) plutot que `event.code` (plus moderne mais hors-cours
strict). Les raccourcis sont **suspendus** lorsqu'un champ de saisie
est focus, pour ne pas interferer avec l'edition.

## 8. Calcul du score

Score session = pourcentage de questions evaluees "je savais" :

```javascript
function calculer_pourcentage_session() {
    var total_evaluees = nb_correctes + nb_mauvaises;
    if (total_evaluees === 0) {
        return 0;
    }
    return Math.round((nb_correctes / total_evaluees) * 100);
}
```

Le score affiche en temps reel dans la pastille `#study-score-pct` du
panneau lateral est rafraichi a chaque clic Check/Bad. La barre de
progression du header se base sur le ratio "questions evaluees /
questions totales".

### Pourquoi pas de pattern Strategy ?

Le CSV `STRAT-1.1` (4eme patron optionnel) propose un Strategy pour
calculer le score selon la difficulte (ex: questions difficiles
valent plus). On n'a pas retenu cette option : le sujet TER exige
**au moins 3 patrons** et nous en avons 3 deja justifies (Singleton,
Repository, Factory). Ajouter un Strategy juste pour le score
serait du sur-engineering pour une regle metier de 3 lignes
(pourcentage simple).

## 9. Recap de fin de session (`#vue-fin-session`)

Reference visuelle : `project-files/interface/end_of_session.png`.

A la fin de la derniere question (clic Check ou Bad sur la derniere
carte), le flux est :

1. `etat_session` passe a `ETAT_FINIE`.
2. `envoyer_resultat_session()` est appele.
3. Selon `est_proprietaire` :
   - **Proprietaire** : POST `/api/paquets/:id/score` avec le
     pourcentage. Sur succes, on recupere le nouveau `best_score`
     depuis la reponse pour l'afficher (potentiellement plus eleve
     que le pourcentage de cette session).
   - **Destinataire** : pas d'appel API. Le `best_score` du proprio
     n'est pas accessible (et serait trompeur), donc le recap affiche
     simplement le pourcentage de la session courante en guise de
     "best".
4. `remplir_recap_fin_session(best_serveur)` injecte dans le DOM :
   - Score % et nombre de questions reussies / total.
   - Compteurs detail correctes / mauvaises.
   - Best score si disponible.
   - Lien "Recommencer" pointant vers `#study-<id>` pour rejouer la
     session avec le meme paquet.
5. Bascule vers `#fin-session-<id>`.

En cas d'erreur reseau sur le POST score, **le recap est quand meme
affiche** (un toast d'erreur signale l'echec) : on n'empeche pas
l'utilisateur de voir son score, meme si la persistance a echoue.

## 10. Mise a jour automatique sur le dashboard

Apres la session, l'utilisateur clique "Tableau de bord" et arrive sur
`#dashboard`. Le router rappelle `afficher_dashboard()`, qui rappelle
`charger_mes_paquets()` (DASH-2.2), qui rappelle GET `/api/paquets`.
La reponse contient les nouvelles valeurs de `last_score` et
`best_score`, qui sont rendues directement par le renderer
`rendre_carte_paquet()` :

```javascript
scores.append($("<span></span>").text("Record : ")
    .append($("<strong></strong>").text(score_record)));
scores.append($("<span></span>").text("Dernier : ")
    .append($("<strong></strong>").text(score_dernier)));
```

Aucun code specifique n'est necessaire pour "rafraichir" le dashboard :
chaque entree sur la route le rappelle a l'API. Tres simple, et evite
toute desynchronisation memoire/serveur.

## 11. Compteur "Sessions" du profil

La carte profil affiche un compteur **"Sessions"** (cf. mockup
`my_profile.png`). Le modele actuel ne stockant pas le nombre de
sessions jouees, on utilise une **approximation** :

> nombre de paquets dont `last_score` est non-NULL = nombre de paquets
> revises au moins une fois.

C'est documente explicitement dans `profil.js::charger_stats_profil`.
Une vraie comptabilisation necessiterait soit une colonne
`nb_sessions` sur `paquets`, soit une table `sessions` dediee — a
arbitrer si on souhaite affiner.

## 12. Tests fonctionnels recommandes

| Cas | Resultat attendu |
|---|---|
| Lancer une session sur un paquet sans question | Message "Ce paquet ne contient aucune question pour le moment" |
| Repondre Bon / Bon / Bon (3 q) | Score 100%, last et best = 100 cote BD |
| Repondre Bon / Bon / Bad | Score 67%, last = 67 cote BD |
| Rejouer apres avoir fait 100% | last = 67, best reste 100 |
| Bob (destinataire) revise | Recap affiche, mais BD : last_score d'Alice reste inchange |
| Charlie (ni proprio ni destinataire) tente GET /api/paquets/:id/study | 403 |
| Touche "1" en etat Q_affichee | Aucun effet (garde sur etat) |

## 13. Conformite aux maquettes

| Mockup | Element couvert |
|---|---|
| `question_give_response.png` | Header session + carte recto + indicateurs clavier + panneau lateral score + liste questions |
| `current_revision.png` | Idem cote verso + boutons "Je savais" / "A revoir" |
| `end_of_session.png` | Recap : score % + correctes / mauvaises + best + actions Recommencer / Tableau de bord |

Les libelles de difficulte (Facile / Moyen / Difficile) sont affiches
via les classes CSS `badge-ok` / `badge-warn` / `badge-err` definies
dans `components.css`, ce qui colorise le badge de difficulte selon
la palette de la charte (vert, orange, rouge).
