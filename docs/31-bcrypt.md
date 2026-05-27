# 31. Hachage des mots de passe avec BCRYPT

Cette section explique comment FlashCards MIAGE protégé les mots de passe :
l'algorithme BCRYPT, les notions de cout et de sel, et la façon dont les
fonctions PHP `password_hash` / `password_verify` sont utilisees dans le
code. Le sujet TER l'exige explicitement : **un mot de passe ne doit jamais
etre stocke en clair, ni avec MD5/SHA1** (CLAUDE.md sec. 7, faute majeure).

## 31.1 Pourquoi ne pas stocker le mot de passe en clair

Si la base était compromise (vol du fichier SQLite, fuite de sauvegarde),
des mots de passe en clair donneraient un accès immediat a tous les
comptes. Pire : beaucoup d'utilisateurs reutilisent le même mot de passe
ailleurs, donc la fuite depasserait notre application.

La parade est de ne **jamais** stocker le mot de passe, mais une
**empreinte** (un *hash*) produite par une fonction a sens unique :

- facile a calculer dans le sens mot de passe -> empreinte ;
- impossible en pratique a inverser empreinte -> mot de passe.

A la connexion, on recalcule l'empreinte du mot de passe saisi et on la
compare a celle stockee. On n'a jamais besoin du mot de passe en clair.

## 31.2 Pourquoi BCRYPT (et pas MD5/SHA1)

MD5 et SHA1 sont des fonctions de hachage **générales**, concues pour etre
**rapides**. C'est exactement le defaut recherche pour un mot de passe : un
attaquant peut tester des milliards de candidats par seconde (attaque par
force brute / dictionnaire). De plus, sans sel, deux utilisateurs ayant le
même mot de passe obtiennent la même empreinte, ce qui rend les *rainbow
tables* (tables d'empreintes precalculees) efficaces.

**BCRYPT** est concu specifiquement pour les mots de passe. Il apporte
trois propriétés :

1. **Lenteur calibree** : BCRYPT est volontairement lent, ce qui
   ralentit la force brute sans gener un login legitime (un seul calcul a
   la connexion).
2. **Cout ajustable** (*work factor*) : un parametre fait doubler le temps
   de calcul a chaque incrementation. On peut donc augmenter le cout au
   fil des annees, a mesure que le materiel devient plus rapide.
3. **Sel intègre** : BCRYPT généré automatiquement un **sel** aleatoire et
   l'incorpore dans l'empreinte produite.

### Le sel (*salt*)

Le sel est une valeur aleatoire ajoutee au mot de passe avant hachage.
Consequences :

- deux comptes avec le même mot de passe obtiennent des empreintes
  **differentes** (sels differents) ;
- les rainbow tables deviennent inutilisables (il faudrait une table par
  sel possible).

Avec `password_hash`, le sel est généré et stocke **automatiquement a
l'interieur** de la chaine résultat : on n'a aucune colonne de sel séparée
a gerer. C'est l'une des raisons pour lesquelles le sujet recommande
`password_hash` plutot qu'une gestion manuelle du sel.

### Anatomie d'une empreinte BCRYPT

`password_hash($mdp, PASSWORD_BCRYPT)` produit une chaine de 60 caracteres
de la forme :

```
$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
└┬┘ └┬┘ └──────────────────┬─────────────────────────────────┘
 │   │                      └── sel (22 car.) + empreinte (31 car.)
 │   └── cout (work factor) = 10 (valeur par defaut de PHP)
 └── identifiant d'algorithme BCRYPT
```

Tout est dans la chaine : l'algorithme, le cout et le sel. C'est pourquoi
`password_verify` n'a besoin que de cette chaine et du mot de passe saisi :
il y relit le sel et le cout pour recalculer l'empreinte. La colonne
`mot_de_passe` est donc dimensionnee `VARCHAR(255)` dans
[src/sql/install.php](../src/sql/install.php) (60 suffisent pour BCRYPT,
255 laisse une marge si l'algorithme par defaut evolue).

## 31.3 Hachage a l'inscription

Dans `AuthController::inscription`
([src/controllers/AuthController.php](../src/controllers/AuthController.php)),
le mot de passe est hache **après** validation et vérification d'unicite de
l'email, juste avant l'insertion :

```php
// Hashage du mot de passe (AUTH-2.1).
$hash = password_hash($mot_de_passe, PASSWORD_BCRYPT);
// ...
$utilisateur = Utilisateur::creer($email, $hash, $nom, $prenom, $date_sqlite, null);
$utilisateur = $this->utilisateurs->creer($utilisateur);
```

La Factory `Utilisateur::creer` reçoit donc **toujours un mot de passe déjà
hache** ; sa documentation le precise explicitement
([src/models/Utilisateur.php](../src/models/Utilisateur.php)). Le mot de
passe en clair n'existe que le temps de la requête, dans une variable
locale, et n'est jamais écrit en base ni journalise.

`PASSWORD_BCRYPT` est une constante PHP qui selectionne l'algorithme. Le
cout par defaut applique par PHP est 10, ce qui est un bon compromis
sécurité / performance pour une application academique.

## 31.4 vérification au login

Dans `AuthController::connexion`, on récupéré l'utilisateur par email puis
on compare le mot de passe saisi a l'empreinte stockee :

```php
$utilisateur = $this->utilisateurs->chercher_par_email($email);
if ($utilisateur === null) {
    $this->repondre(array('erreur' => 'Identifiants invalides.'), 401);
    return;
}

$mdp_correct = password_verify($mot_de_passe, $utilisateur->getMotDePasse());
if (!$mdp_correct) {
    $this->repondre(array('erreur' => 'Identifiants invalides.'), 401);
    return;
}
```

`password_verify` recalcule l'empreinte du mot de passe saisi en
reutilisant le sel et le cout lus dans l'empreinte stockee, puis compare
les deux en temps constant. Il renvoie un booleen ; on ne manipule jamais
le mot de passe en clair au-dela de ce point.

**Message d'erreur generique.** Que l'email soit inconnu ou que le mot de
passe soit faux, on répond le même `401 Identifiants invalides.`. On
evite ainsi de reveler si un email existe en base (ce qui aiderait
l'enumeration de comptes).

## 31.5 Changement de mot de passe

`UtilisateurController::changer_mot_de_passe`
([src/controllers/UtilisateurController.php](../src/controllers/UtilisateurController.php))
combine les deux fonctions :

1. **vérifier l'ancien** avec `password_verify` : on ne change pas un mot
   de passe sans prouver qu'on connait l'actuel (defense si la session
   d'un utilisateur reste ouverte sur un poste partage).
2. **Hacher le nouveau** avec `password_hash($nouveau, PASSWORD_BCRYPT)`,
   après validation (>= 6 caracteres, confirmation identique).

```php
if ($actuel === '' || !password_verify($actuel, $utilisateur->getMotDePasse())) {
    $erreurs['mot_de_passe_actuel'] = 'Mot de passe actuel incorrect.';
}
// ... validation du nouveau ...
$utilisateur->setMotDePasse(password_hash($nouveau, PASSWORD_BCRYPT));
$this->utilisateurs->mettre_a_jour($utilisateur);
```

Le setter `Utilisateur::setMotDePasse` est documente comme recevant
**toujours une valeur déjà hachee**, ce qui rend la règle "jamais de clair
en base" lisible au niveau du modèle.

## 31.6 Le mot de passe ne fuit jamais en sortie

`Utilisateur::toArray()` (la représentation renvoyee dans les réponses
JSON) **n'inclut pas** le champ `mot_de_passe` :

```php
public function toArray()
{
    return array(
        'id_user'        => $this->id_user,
        'email'          => $this->email,
        'nom'            => $this->nom,
        'prenom'         => $this->prenom,
        'date_naissance' => $this->date_naissance,
        'avatar'         => $this->avatar
    );
}
```

même l'empreinte BCRYPT n'est donc jamais exposee au client. Tous les
endpoints qui renvoient un utilisateur (inscription, connexion, profil,
recherche pour le partage) passent par `toArray()`.

## 31.7 Conformite au sujet

| Exigence (CLAUDE.md sec. 7) | implémentation |
|------------------------------|----------------|
| `password_hash($mdp, PASSWORD_BCRYPT)` a l'inscription | `AuthController::inscription` |
| `password_verify` au login | `AuthController::connexion` |
| Jamais de mot de passe en clair, jamais MD5/SHA1 | Hash en BCRYPT uniquement ; `toArray()` exclut le champ |
| vérification de l'ancien mot de passe avant changement | `UtilisateurController::changer_mot_de_passe` |

`password_hash`, `password_verify` et la constante `PASSWORD_BCRYPT` font
partie du périmètre PHP cite par le sujet pour la sécurité des mots de
passe.
