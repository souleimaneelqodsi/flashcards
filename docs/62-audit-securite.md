# Audit sécurité final

Cette section consigne le résultat de l'audit sécurité complet du
projet, exigence du sujet TER (CLAUDE.md §7 + §10 : "Mot de passe en
clair = faute majeure"). L'audit a ete réalisé via l'agent
`php-securite-auditor` sur tous les fichiers PHP de `src/`.

## 1. Verdict global

**Pret pour rendu. 0 faute majeure, 0 grave, 0 moyenne bloquante.**

Deux remarques preventives (non bloquantes) sont notees en section 4.

## 2. contrôles passes

### Mots de passe

- [x] Inscription : `password_hash($mdp, PASSWORD_BCRYPT)` dans
      `AuthController::inscription` (ligne 83).
- [x] Connexion : `password_verify` dans `AuthController::connexion`
      (ligne 148).
- [x] Aucune trace de MD5 ou SHA1 dans tout `src/` (recherche
      exhaustive via `grep`).
- [x] `Utilisateur::toArray()` exclut explicitement `mot_de_passe` (la
      colonne n'apparait jamais dans une réponse JSON).

### SQL et injections

- [x] **100% des requêtes SQL passent par `DB::executer($sql, $params)`**
      qui centralise `PDO::prepare()` + `PDOStatement::execute([...])`.
- [x] Zero concatenation SQL dans `src/repositories/`.
- [x] Les controleurs ne touchent jamais a PDO directement (vérifié
      via `repository-enforcer`).
- [x] LIKE avec saisie utilisateur (`UtilisateurRepository::rechercher_par_email_partiel`)
      utilise `ESCAPE '\'` + echappement manuel des wildcards `%` et
      `_` avant concatenation du `%` final (defense double).
- [x] Cast systematique en `int` pour les id_user / id_paquet après
      validation regex.

### Sessions et CSRF

- [x] `session_set_cookie_params` avec `HttpOnly: true` et
      `SameSite: Lax` avant `session_start()` (index.php lignes 26-33).
- [x] `session_regenerate_id(true)` après connexion reussie
      (AuthController ligne 155) pour eviter la fixation de session.
- [x] `session_destroy()` + suppression explicite du cookie PHPSESSID
      au logout (AuthController lignes 196-213).
- [x] CSRF token généré via `bin2hex(random_bytes(32))` (32 octets
      cryptographiques = 256 bits).
- [x] vérification CSRF par `hash_equals()` en temps constant (protégé
      contre les attaques par mesure de temps).
- [x] Token régénéré après connexion (l'ancien token capture sur
      `/login` n'est plus valide une fois connecte).
- [x] CSRF vérifié sur **tous** les endpoints mutants (POST / PUT /
      DELETE) - inventaire confirme :
      - AuthController : inscription, connexion, déconnexion.
      - PaquetController : créer, mettre_a_jour, supprimer, partager,
        retirer_partage, enregistrer_score.
      - QuestionController : créer, mettre_a_jour, supprimer.

### XSS

- [x] Coté PHP, la seule sortie HTML dans `app.php` (meta CSRF) est
      protégée par `htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8')`.
- [x] Coté JS, **toutes les injections de contenu utilisateur** passent
      par `.text()` (jamais `.html()` avec une valeur dynamique). Cas
      verifies : titres de paquets, contenu questions/réponses,
      emails, noms d'utilisateurs, messages d'erreur.

### Gestion d'erreurs

- [x] `ErrorHandler::enregistrer()` appele en premiere ligne de
      `index.php`, avant tout `require_once`.
- [x] `display_errors=0`, `log_errors=1` (pas de stack trace exposee).
- [x] Handler d'exception centralise : tout `RuntimeException` /
      `PDOException` est attrape, le client reçoit un message
      generique, le detail va dans le log serveur via `error_log()`.

### contrôle d'accès

- [x] `verifier_authentifie()` appele en premiere ligne de chaque
      endpoint protégé. Retourne 401 si `$_SESSION['id_user']` absent.
- [x] contrôle propriétaire (`$paquet->getIdProprietaire() === $id_user`)
      systematique sur les endpoints mutants des paquets.
- [x] contrôle propriétaire via paquet parent pour les endpoints
      mutants des questions (règle metier cohérente).
- [x] accès "propriétaire ou destinataire" pour la lecture
      (visualisation, study, listing questions) - 403 si ni l'un ni
      l'autre.
- [x] Score : 403 strict si non-propriétaire essaie d'enregistrer un
      score (règle metier `last_score/best_score` strictement
      personnels au propriétaire, CLAUDE.md §4).

### Validation serveur

- [x] Email : regex `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`
      + vérification unicite en BD (409 Conflict si déjà pris).
- [x] Mot de passe : >= 6 caracteres minimum.
- [x] Date de naissance : 8 chiffres AAAAMMJJ + `checkdate()` pour
      validite reelle.
- [x] Longueurs bornees : nom/prenom <= 100, email <= 150, titre
      paquet <= 150, theme <= 100, contenu question/réponse <= 1000.
- [x] Defense type : helpers `lire_chaine_corps` / `lire_id_corps` /
      `lire_score_corps` rejetent les types non-string / non-int (un
      client malveillant envoyant `{"titre": ["xss"]}` est traite
      comme titre vide, sans warning PHP).

## 3. Tests de penetration recommandes (a exécuter avant rendu)

| Attaque | résultat attendu |
|---|---|
| SQLi : email = `' OR 1=1 --` au login | 401 (prepared statement empeche l'injection) |
| SQLi LIKE : q = `%` dans recherche users | 0 résultat (échappé litteralement) |
| XSS : titre paquet = `<script>alert(1)</script>` | Affiche en text(), pas exploite |
| XSS : email = `<img src=x onerror=alert(1)>@test.fr` | échappé en text() partout |
| CSRF replay : POST sans header X-CSRF-Token | 403 Token CSRF manquant |
| CSRF replay : POST avec ancien token (avant login) | 403 Token CSRF invalide |
| Session fixation : tenter de réutiliser un PHPSESSID pre-login | Bloque par session_regenerate_id après login |
| Hijack id_proprietaire : POST /api/paquets avec id_proprietaire=99 | Ignore, session prime |
| accès direct : Charlie tente GET /api/paquets/1 (paquet d'Alice) | 403 |
| accès direct : Bob tente PUT /api/paquets/1 (paquet d'Alice) | 403 |
| Score : Bob (destinataire) tente POST /api/paquets/1/score | 403 strict |

## 4. Remarques preventives (non bloquantes)

### 4.1 Usage de `.html()` avec SVG constants

Trois fichiers utilisent `.html(SVG_CONSTANT)` pour injecter des icones
inline (cf. `dashboard.js`, `visualisation-paquet.js`,
`share-modal.js`) :

```javascript
var SVG_CHECK = '<svg width="16" ... <polyline ... /></svg>';
bouton.html(SVG_CHECK);
```

**Risque actuel : zero.** Les chaines sont des **constantes statiques
hard-codees** dans le code source. Aucune interpolation de contenu
utilisateur. La chaine entiere ne quitte jamais le répertoire de code
versionne.

**Pourquoi pas la création DOM via `$()` ?** jQuery créé des éléments
HTML par defaut, pas des éléments SVG (problème de namespace). Une
solution propre necessiterait `document.createElementNS('http://www.w3.org/2000/svg', 'svg')`
qui sort du périmètre du cours.

**Garde-fou maintenance** : tout futur modification de ces chaines
doit s'assurer qu'aucune variable utilisateur n'y est jamais
concatenee. Un commentaire de sentinelle a ete laisse dans chaque
emplacement.

### 4.2 Cookie `secure` flag

Le cookie de session est pose avec `httponly: true` et
`samesite: Lax`, mais pas `secure: true`. Cela permet le developpement
local en HTTP. **Pour un deploiement production HTTPS**, ajouter
`'secure' => true` dans `session_set_cookie_params`.

Le contexte TER est strictement academique en local, donc cet ajout
n'est pas demande pour le rendu.

## 5. Comparaison avec les exigences CLAUDE.md §7

| Exigence | Statut |
|---|---|
| `password_hash($mdp, PASSWORD_BCRYPT)` | OK |
| `password_verify` au login | OK |
| Jamais MD5/SHA1 | OK |
| `session_start()`, `session_regenerate_id(true)` après connexion | OK |
| 100 % requêtes preparees PDO, zero concatenation | OK |
| `htmlspecialchars()` côté PHP, `.text()` côté jQuery | OK |
| Token CSRF en session, vérifié sur POST/PUT/DELETE | OK |
| `display_errors = Off` en prod, log serveur | OK (ErrorHandler) |

**Toutes les exigences §7 sont respectees.**
