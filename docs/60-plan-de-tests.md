# Plan de tests

Ce plan recapitule la **matrice fonctionnalites x comptes test** utilisee
pour valider l'application avant rendu. Chaque cellule a un cas
attendu et un resultat observe (a remplir au moment des tests manuels
par le binome). Les references croisees pointent vers les sections du
rapport ou la fonctionnalite est decrite.

## 1. Comptes de test

Pour simuler les cas multi-utilisateurs (partage, controle d'acces),
trois comptes sont prepares en base via le script de seed
(`src/sql/install.php` + seed manuel) :

| Alias | Email | Mot de passe | Role dans les tests |
|---|---|---|---|
| Alice   | alice@test.fr   | motdepasse | Proprietaire principal (cree les paquets) |
| Bob     | bob@test.fr     | motdepasse | Destinataire des partages d'Alice |
| Charlie | charlie@test.fr | motdepasse | Tier (ni proprietaire ni destinataire), sert aux tests 403 |

> **NB pour le rendu** : ces 3 comptes sont seedes avec
> `password_hash(... PASSWORD_BCRYPT)` (jamais en clair). Les mots de
> passe ci-dessus ne sont valables que pour les tests internes ; ne
> jamais les utiliser pour un deploiement reel.

## 2. Matrice fonctionnalites x comptes

Legende : OK = passe, KO = a corriger, n/a = non applicable, ? = a
verifier manuellement.

### 2.1 Inscription / Connexion / Deconnexion

| Cas | Alice | Bob | Charlie | Reference |
|---|---|---|---|---|
| Inscription email valide | OK | OK | OK | section 30 |
| Inscription email deja pris | n/a | KO attendu (409) | n/a | section 30 |
| Inscription MDP < 6 chars | KO attendu (400) | n/a | n/a | section 32 |
| Inscription date AAAAMMJJ invalide | KO attendu (400) | n/a | n/a | section 32 |
| Inscription : champ rouge dynamique + recap | OK | OK | OK | section 32 |
| Connexion email + MDP valides | OK | OK | OK | section 30 |
| Connexion MDP errone | KO attendu (401) | n/a | n/a | section 30 |
| Deconnexion | OK | OK | OK | section 30 |
| Session expiree -> redirect login | ? | ? | ? | section 30 |
| CSRF token absent | KO attendu (403) | n/a | n/a | section 33 |

### 2.2 CRUD paquets et questions

| Cas | Alice (proprio) | Bob (destinataire) | Charlie (tier) | Reference |
|---|---|---|---|---|
| Lister mes paquets | OK | OK (vide ou autres) | OK (vide) | section 40 |
| Creer un paquet | OK | OK | OK | section 40 |
| Editer son paquet | OK | n/a (pas proprio) | n/a | section 40 |
| Editer paquet d'un autre | n/a | KO attendu (403) | KO attendu (403) | section 40 |
| Supprimer son paquet (cascade) | OK | n/a | n/a | section 40 |
| Supprimer paquet d'un autre | n/a | KO attendu (403) | KO attendu (403) | section 40 |
| Voir le paquet d'un autre (visualisation) | n/a | OK si destinataire | KO attendu (403) | section 41 |
| Ajouter une question (proprio) | OK | n/a | n/a | section 40 |
| Editer une question (proprio) | OK | n/a | n/a | section 40 |
| Supprimer une question (proprio) | OK | n/a | n/a | section 40 |
| Lister questions d'un paquet | OK (proprio) | OK si destinataire | KO attendu (403) | section 40 |
| Validation titre vide / >150 chars | KO attendu (400 + rouge) | n/a | n/a | section 40 |
| Validation question/reponse vide | KO attendu (400 + rouge) | n/a | n/a | section 40 |

### 2.3 Partage

| Cas | Alice (proprio) | Bob (destinataire) | Charlie | Reference |
|---|---|---|---|---|
| Ouvrir modale Partager | OK | n/a | n/a | section 41 |
| Auto-completion sur "bo" | Bob apparait | n/a | n/a | section 41 |
| Selection + Partager avec Bob | OK 201 | n/a | n/a | section 41 |
| Re-partager le meme paquet a Bob | KO attendu (409) | n/a | n/a | section 41 |
| Partager a soi-meme | KO attendu (400) | n/a | n/a | section 41 |
| Partager a id_destinataire inexistant | KO attendu (400) | n/a | n/a | section 41 |
| Recherche q="%" (wildcard) | 0 resultat litteral | n/a | n/a | section 41 |
| Voir chips destinataires | OK avec X | OK sans X | n/a | section 41 |
| Retirer un destinataire via X | OK + chip remove | n/a | n/a | section 41 |
| Retrait par non-proprietaire (via API) | n/a | KO attendu (403) | KO attendu (403) | section 41 |

### 2.4 Mode revision Anki

| Cas | Alice (proprio) | Bob (destinataire) | Charlie | Reference |
|---|---|---|---|---|
| Lancer session sur son paquet | OK | n/a | n/a | section 42 |
| Lancer session sur paquet partage | n/a | OK | KO attendu (403) | section 42 |
| Lancer session sur paquet vide | "Aucune question" | "Aucune question" | n/a | section 42 |
| Bascule recto/verso (clic + Espace) | OK | OK | n/a | section 42 |
| Boutons Check/Bad apres flip | OK | OK | n/a | section 42 |
| Raccourcis 1 / 2 / fleches | OK | OK | n/a | section 42 |
| Garde clavier 1/2 en Q_affichee | Aucun effet | Aucun effet | n/a | section 42 |
| Score temps reel (pastille + barre) | OK | OK | n/a | section 42 |
| Fin de session : recap | OK | OK | n/a | section 42 |
| Persistance last_score / best_score | OK (BD a jour) | n/a (pas persiste) | n/a | section 42 |
| Bob revise paquet d'Alice -> stats d'Alice intactes | OK | n/a | n/a | section 42 |
| Recommencer | OK -> #study-X | OK | n/a | section 42 |

### 2.5 Dashboard, profil, UI

| Cas | Resultat attendu | Reference |
|---|---|---|
| Dashboard : 2 colonnes Mes paquets / Partages avec moi | Conforme `dashboard.png` | section 50 |
| Card "Partages" : pas de bouton Editer/Partager | OK | section 51 |
| Bouton Reviser navigue vers #study-:id | OK | section 51 |
| Bouton Editer navigue vers #edit-paquet-:id | OK | section 51 |
| Bouton menu toggle la sidebar | OK | section 50 |
| Compteurs profil : Paquets / Record / Sessions | Valeurs reelles | section 51 |
| Dark mode toggle dans la sidebar | OK + persistance | section 50 |
| Avatar : initiales prenom+nom + degrade deterministe | OK | section 50 |
| Responsive < 700px | Cards empilees, modale OK | section 52 |

### 2.6 Securite

| Cas | Resultat attendu | Reference |
|---|---|---|
| Injection SQL : email = `' OR 1=1--` au login | KO 401 (prepared statement) | section 33 |
| Injection LIKE : q = `%` dans recherche users | 0 resultat (echappe) | section 41 |
| XSS : titre paquet = `<script>alert(1)</script>` | Affiche litteralement (.text()) | section 40 |
| Hijack id_proprietaire via body POST | Ignore (session prime) | section 40 |
| Token CSRF errone | KO 403 | section 33 |
| Cookie session : HttpOnly + SameSite=Lax | OK (verifie via DevTools) | section 30 |
| Mots de passe : aucun en clair en BD | OK BCRYPT | section 31 |
| Stack trace PHP exposee en cas d'erreur | KO attendu - jamais expose | section 33 |

## 3. Methodologie

Pour chaque ligne :

1. **Setup** : reinitialiser la BD via `php src/sql/install.php` (et
   seed des 3 comptes). Demarrer le serveur via
   `php -S localhost:8000 -t src/public`.
2. **Execution** : suivre le scenario pas a pas (navigateur ou curl
   selon le cas).
3. **Verification** :
   - Cote UI : verifier le rendu visuel.
   - Cote BD : `sqlite3 src/data/flashcards.sqlite "SELECT ..."`.
   - Cote API : `curl` avec cookie jar + CSRF token.
4. **Trace** : remplir la cellule OK/KO du tableau ci-dessus.

## 4. Tests automatises a executer

Au-dela des tests manuels, les agents automatiques suivants doivent
etre executes avant rendu :

- `/valider-w3c` : validation HTML + CSS (cf. section 6 du plan).
- `/audit-securite` : verification BCRYPT, PDO prepare, sessions, CSRF.
- `indentation-fixer` : normalisation 4 espaces.
- `cours-api-checker` : aucune API JS/PHP hors perimetre PDF de cours.
- `repository-enforcer` : aucun controleur ne touche PDO directement.
- `interface-compliance-checker` : conformite vis-a-vis des mockups
  `project-files/interface/`.

Resultats attendus : tous verts. Le statut de chaque agent est trace
dans les commits par leurs messages individuels.

## 5. Suivi

Ce document est une **template**. Le binome doit reporter le resultat
reel observe a chaque ligne lors de la session de tests finale, avant
le rendu. En cas de KO, ouvrir un ticket / faire un commit `fix(...)`
puis re-tester.
