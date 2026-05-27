# Hachage des mots de passe — BCRYPT (DOC-AUTH.2)

Fiche technique : pourquoi et comment les mots de passe sont hachés avec BCRYPT.
Sujet hors cours (auto-formation), mais `password_hash` / `password_verify` sont
explicitement cités comme attendus par le sujet TER.

> Référence d'implémentation : `src/controllers/AuthController.php`,
> `src/repositories/UtilisateurRepository.php`, `src/sql/install.php`.
> Synthèse côté rapport : `rapport.md` section 6.2.

---

## 1. Principe : aucun mot de passe en clair

Un mot de passe n'est **jamais** stocké en clair ni de façon réversible. À
l'inscription, on calcule un hachage à sens unique ; à la connexion, on compare
le mot de passe saisi au hachage stocké sans jamais le déchiffrer.

À l'inscription (`AuthController::inscription()`) :

```php
$hash = password_hash($mot_de_passe, PASSWORD_BCRYPT);
```

C'est uniquement `$hash` qui est transmis à `UtilisateurRepository::creer()` puis
inséré dans la colonne `mot_de_passe` de la table `utilisateurs`.

À la connexion (`AuthController::connexion()`) :

```php
$mdp_correct = password_verify($mot_de_passe, $utilisateur->getMotDePasse());
if (!$mdp_correct) {
    $this->repondre(array('erreur' => 'Identifiants invalides.'), 401);
    return;
}
```

`password_verify` retrouve dans le hachage stocké tous les paramètres nécessaires
(algorithme, coût, sel) et recalcule pour comparer. Aucune configuration externe
n'est requise.

## 2. Algorithme, coût et salage

**Algorithme.** BCRYPT dérive de l'algorithme de chiffrement Blowfish. Il a été
conçu pour être volontairement **lent**, à l'inverse des fonctions de hachage
classiques optimisées pour la vitesse.

**Coût.** Chaque hachage consomme un budget calculatoire fixé par un *facteur de
coût*. Avec `PASSWORD_BCRYPT`, PHP utilise par défaut un coût de **10**, soit
2^10 = 1024 itérations internes. Plus le coût est élevé, plus une vérification est
lente — donc plus une attaque par force brute hors-ligne est coûteuse. Si un
attaquant met la main sur le contenu de la table `utilisateurs`, il devra dépenser
des dizaines à des centaines de millisecondes par essai et par compte, contre
quelques microsecondes pour MD5 ou SHA-1.

**Salage.** Le **sel** est une valeur aléatoire ajoutée au mot de passe avant
hachage. `password_hash()` en génère un automatiquement et **unique par appel**
(donc unique par utilisateur). Conséquence : deux utilisateurs ayant le même mot
de passe obtiennent deux hachages différents, ce qui rend inopérantes les
*rainbow tables* (tables de hachages pré-calculés). Le sel n'a pas besoin d'être
stocké séparément : il est intégré dans le hachage produit.

**Format du hachage.** BCRYPT produit une chaîne de 60 caractères qui contient,
concaténés : l'identifiant d'algorithme (`$2y$`), le coût, le sel, puis le
hachage final. La colonne `mot_de_passe` est définie `VARCHAR(255)` dans
`src/sql/install.php` pour absorber sans contrainte cette longueur et
d'éventuelles évolutions futures de format.

## 3. Choix par rapport à MD5 / SHA-1

MD5 et SHA-1 sont des fonctions **non salées** et conçues pour être **rapides**.
Elles sont aujourd'hui inadaptées au stockage de mots de passe :

- les rainbow tables permettent d'inverser des hachages courts non salés ;
- le calcul GPU permet des milliards d'essais par seconde.

BCRYPT — salé, coûteux, à coût ajustable dans le temps — est l'état de l'art
recommandé par l'OWASP. C'est ce qui justifie son adoption malgré le fait qu'il
ne soit pas explicitement enseigné dans le cours : l'auto-formation est permise
par le sujet TER, qui cite nommément `password_hash`.

## 4. Périmètre des fonctions utilisées

`password_hash` (avec la constante `PASSWORD_BCRYPT`) et `password_verify`. Ces
deux fonctions figurent dans le périmètre PHP du projet (CLAUDE.md section 2 bis).
