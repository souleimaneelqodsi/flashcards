# Controleurs - Contrat d'API

Ce dossier regroupe les controleurs PHP qui gerent les endpoints de l'API JSON.
Cette documentation decrit le contrat attendu pour la phase 1 (AUTH-1) : les
endpoints d'authentification sont implementes en **mode mock** (aucun acces a
la base de donnees, pas de BCRYPT, pas de regeneration d'identifiant de
session). La vraie implementation arrive en AUTH-2.

Toutes les reponses sont au format JSON (`Content-Type: application/json; charset=utf-8`).
Tous les payloads d'entree sont attendus en `application/x-www-form-urlencoded`
(equivalent `$_POST` cote PHP).

## Sommaire

- [AuthController](#authcontroller)
  - [POST /api/auth/inscription](#post-apiauthinscription)
  - [POST /api/auth/connexion](#post-apiauthconnexion)
  - [POST /api/auth/deconnexion](#post-apiauthdeconnexion)
  - [GET /api/auth/moi](#get-apiauthmoi)

---

## AuthController

Centralise les actions d'authentification : inscription, connexion, deconnexion,
recuperation de l'utilisateur courant.

### POST /api/auth/inscription

Inscription d'un nouvel utilisateur.

**Payload d'entree** (`$_POST`) :

| Champ           | Type   | Obligatoire | Description                              |
|-----------------|--------|-------------|------------------------------------------|
| email           | string | oui         | Adresse email                            |
| mot_de_passe    | string | oui         | Mot de passe en clair (sera hash en AUTH-2) |
| nom             | string | oui         | Nom de famille                           |
| prenom          | string | oui         | Prenom                                   |
| date_naissance  | string | oui         | Format AAAAMMJJ                          |

**Reponses** :

- `201 Created` - inscription reussie (mock) :

```json
{
    "message": "Inscription reussie (mock)",
    "utilisateur": {
        "id_user": 1,
        "email": "alice@exemple.com",
        "nom": "Doe",
        "prenom": "Alice",
        "date_naissance": "20000115",
        "avatar": null
    }
}
```

- `400 Bad Request` - un ou plusieurs champs obligatoires absents ou vides :

```json
{
    "erreurs": {
        "email": "Champ obligatoire",
        "mot_de_passe": "Champ obligatoire"
    }
}
```

### POST /api/auth/connexion

Connexion d'un utilisateur existant. Ouvre une session PHP.

**Payload d'entree** (`$_POST`) :

| Champ        | Type   | Obligatoire | Description       |
|--------------|--------|-------------|-------------------|
| email        | string | oui         | Adresse email     |
| mot_de_passe | string | oui         | Mot de passe      |

**Reponses** :

- `200 OK` - connexion reussie (mock). La session PHP est ouverte avec
  `$_SESSION['id_user']` et `$_SESSION['email']` remplis :

```json
{
    "message": "Connexion reussie (mock)",
    "utilisateur": {
        "id_user": 1,
        "email": "alice@exemple.com",
        "nom": "Doe",
        "prenom": "John",
        "avatar": null
    }
}
```

- `400 Bad Request` - champs manquants (meme format d'erreurs que `inscription`).

### POST /api/auth/deconnexion

Deconnexion de l'utilisateur courant. Vide `$_SESSION` puis detruit la session.

**Payload d'entree** : aucun.

**Reponse** :

- `200 OK` (toujours, meme si aucune session n'etait ouverte) :

```json
{
    "message": "Deconnexion reussie"
}
```

### GET /api/auth/moi

Renvoie l'utilisateur actuellement connecte. Permet au front de savoir si une
session est active et de recuperer le profil pour l'afficher (avatar, nom...).

**Payload d'entree** : aucun. La session PHP est lue cote serveur.

**Reponses** :

- `200 OK` - utilisateur authentifie :

```json
{
    "utilisateur": {
        "id_user": 1,
        "email": "alice@exemple.com",
        "nom": "Doe",
        "prenom": "John",
        "avatar": null
    }
}
```

- `401 Unauthorized` - aucune session active :

```json
{
    "erreur": "Non authentifie"
}
```

---

## Notes pour AUTH-2 (vraie implementation)

- `inscription` : `password_hash($mdp, PASSWORD_BCRYPT)`, verification d'unicite
  de l'email, validation regex serveur (email, mot de passe >= 6 caracteres,
  date_naissance format AAAAMMJJ), insertion en base via `UtilisateurRepository`.
- `connexion` : `password_verify`, `session_regenerate_id(true)` apres
  authentification reussie, reponse `401` si identifiants invalides.
- `deconnexion` : suppression explicite du cookie `PHPSESSID` apres
  `session_destroy()`.
- `moi` : ajout du token CSRF en session, renvoye au front pour les
  endpoints d'ecriture (creation/edition/suppression/partage).
