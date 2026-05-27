# Patrons de conception utilises (DOC-ARCH.3)

Le sujet TER exige au minimum trois patrons de conception differents. Le projet
en implemente exactement trois, choisis pour repondre a des besoins concrets :
**Singleton** pour la connexion a la base de donnees, **Repository** pour
l'acces aux donnees, et **Factory Method** pour la creation des entites
metier. Aucun autre patron n'a ete retenu (pas d'Observer, pas de Strategy,
pas de Decorator) : ajouter des patrons sans besoin reel alourdit le code et
complique la maintenance (CLAUDE.md section 3).

> References d'implementation : `src/core/DB.php`, `src/repositories/`,
> `src/models/Paquet.php`, `src/models/Question.php`,
> `src/models/Utilisateur.php`.

---

## 1. Patron Singleton — connexion PDO unique

### 1.1 Probleme resolu

SQLite est une base de donnees fichier. Ouvrir plusieurs connexions PDO vers
le meme fichier dans une meme requete HTTP multiplie les lectures/ecritures
inutiles et peut provoquer des conflits de verrou. On veut garantir qu'une
seule connexion PDO est creee par requete HTTP, partagee par tous les
repositories.

### 1.2 Mise en oeuvre

La classe `DB` (`src/core/DB.php`) suit le schema classique du Singleton :

```php
class DB
{
    private static $instance = null;  // l'instance unique
    private $pdo = null;              // la connexion PDO

    private function __construct() {} // interdit "new DB()"
    private function __clone()     {} // interdit le clonage

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new DB();
        }
        return self::$instance;
    }

    public function pdo()
    {
        if ($this->pdo === null) {
            $chemin = __DIR__ . '/../data/flashcards.sqlite';
            $this->pdo = new PDO('sqlite:' . $chemin);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->pdo->exec('PRAGMA foreign_keys = ON');
        }
        return $this->pdo;
    }
}
```

Deux mecanismes garantissent l'unicite :
- Le **constructeur prive** empeche toute creation directe avec `new DB()`.
- La methode **`getInstance()`** cree l'objet uniquement si `$instance` est
  `null`, puis renvoie toujours la meme reference.

La connexion PDO elle-meme est creee de facon paresseuse (au premier appel a
`pdo()`), evitant d'ouvrir le fichier SQLite si la requete HTTP ne necessite
pas d'acces base (cas des requetes sur des routes inexistantes renvoyant 404).

Tous les repositories appellent `DB::getInstance()->executer(...)` sans jamais
instancier `DB` directement.

### 1.3 Justification en trois phrases

Une seule connexion PDO par requete HTTP est suffisante et recommandee pour
SQLite. Le Singleton garantit cette unicite sans que chaque repository ait a
gerer l'ouverture et la fermeture de la connexion. Le constructeur prive et
l'absence de `__clone` rendent l'unicite inviolable par code.

---

## 2. Patron Repository — acces aux donnees isole

### 2.1 Probleme resolu

Sans Repository, les controleurs PHP contiendraient du SQL. Melanger la
logique HTTP (validation, authentification, formatage JSON) et les requetes
SQL dans les memes methodes rend le code difficile a lire, a tester et a faire
evoluer. Le patron Repository separe ces deux responsabilites.

### 2.2 Mise en oeuvre

Il y a un repository par entite metier, dans `src/repositories/` :

| Repository | Entite | Role |
|---|---|---|
| `UtilisateurRepository` | `utilisateurs` | CRUD utilisateurs, recherche par email |
| `PaquetRepository` | `paquets` | CRUD paquets, listes par proprietaire et par destinataire |
| `QuestionRepository` | `questions` | CRUD questions, liste par paquet |
| `PartageRepository` | `partages` | Ajout/suppression/liste des partages |
| `DifficulteRepository` | `difficultes` | Lecture du referentiel Facile/Moyen/Difficile |

Chaque repository expose des methodes metier nommees en francais
(`trouver_par_id`, `trouver_par_proprietaire`, `creer`, `supprimer`) et
renvoie des objets entite, jamais des tableaux bruts ni des `PDOStatement`.

Exemple dans `PaquetRepository` :

```php
public function trouver_par_proprietaire($id_proprietaire)
{
    $statement = DB::getInstance()->executer(
        'SELECT p.id_paquet, p.titre, p.theme, p.date_creation,
                p.last_score, p.best_score, p.id_proprietaire,
                COUNT(q.id_question) AS nombre_cartes
         FROM paquets p
         LEFT JOIN questions q ON q.id_paquet = p.id_paquet
         WHERE p.id_proprietaire = ?
         GROUP BY p.id_paquet
         ORDER BY p.date_creation DESC',
        array($id_proprietaire)
    );
    $lignes = $statement->fetchAll();
    $paquets = array();
    foreach ($lignes as $ligne) {
        $paquets[] = Paquet::fromRow($ligne);  // Factory Method
    }
    return $paquets;
}
```

Le controleur qui appelle cette methode ne connait pas le SQL : il recoit
directement un tableau de `Paquet`.

La regle est appliquee sans exception : **aucun controleur ne contient de
code PDO**. Les controleurs creent leurs repositories dans leur constructeur
et appellent uniquement des methodes metier.

### 2.3 Cas particulier : transaction de suppression en cascade

`PaquetRepository::supprimer_avec_cascade` encapsule une transaction SQLite
(suppression des questions, des partages, puis du paquet). La logique de
transaction appartient au repository car c'est un detail de persistance, pas
de la logique HTTP. Le controleur appelle une seule methode et ignore que
trois tables sont touchees.

### 2.4 Justification en trois phrases

Le Repository isole tout le SQL dans une couche dediee, ce qui empeche les
controleurs de melanger logique HTTP et logique de persistance. Un changement
de schema ou une optimisation de requete n'implique que le repository concerne,
sans toucher aux controleurs ni aux vues. Cela correspond exactement au
principe de separation des responsabilites attendu dans un projet M1 MIAGE.

---

## 3. Patron Factory Method — creation des entites metier

### 3.1 Probleme resolu

Les entites metier (`Paquet`, `Question`, `Utilisateur`) ont un constructeur
prive : on ne peut pas ecrire `new Paquet(...)` depuis l'exterieur. Cela
interdit la creation d'objets incomplets ou dans un etat incohérent.
Deux scenarios de creation coexistent : creer une entite depuis un formulaire
(donnees utilisateur) et reconstituer une entite depuis une ligne SQL (donnees
base de donnees). Les contraintes d'initialisation different selon le scenario.

### 3.2 Mise en oeuvre

Chaque modele expose deux methodes statiques qui jouent le role de
**Factory Methods** (patron Factory Method de GoF) :

| Methode | Scenario | Comportement |
|---|---|---|
| `Entite::creer(...)` | Nouveau depuis formulaire | Initialise l'id a `null`, positionne la date du jour, fixe les valeurs par defaut |
| `Entite::fromRow($ligne)` | Reconstruction depuis SQL | Rehydrate tous les champs depuis le tableau associatif retourne par PDO |

Exemple pour `Paquet` (`src/models/Paquet.php`) :

```php
// Factory 1 : nouveau paquet cree depuis le formulaire
public static function creer($titre, $theme, $id_proprietaire)
{
    $paquet = new Paquet();           // constructeur prive accessible ici
    $paquet->titre           = $titre;
    $paquet->theme           = $theme;
    $paquet->date_creation   = date('Y-m-d');
    $paquet->last_score      = null;
    $paquet->best_score      = null;
    $paquet->id_proprietaire = (int) $id_proprietaire;
    return $paquet;
}

// Factory 2 : reconstruction depuis une ligne SQL
public static function fromRow($ligne)
{
    $paquet = new Paquet();
    $paquet->id_paquet       = isset($ligne['id_paquet'])       ? (int) $ligne['id_paquet']       : null;
    $paquet->titre           = isset($ligne['titre'])           ? $ligne['titre']                 : null;
    $paquet->theme           = isset($ligne['theme'])           ? $ligne['theme']                 : null;
    $paquet->date_creation   = isset($ligne['date_creation'])   ? $ligne['date_creation']         : null;
    $paquet->last_score      = isset($ligne['last_score'])      ? (int) $ligne['last_score']      : null;
    $paquet->best_score      = isset($ligne['best_score'])      ? (int) $ligne['best_score']      : null;
    $paquet->id_proprietaire = isset($ligne['id_proprietaire']) ? (int) $ligne['id_proprietaire'] : null;
    $paquet->nombre_cartes   = isset($ligne['nombre_cartes'])   ? (int) $ligne['nombre_cartes']   : 0;
    return $paquet;
}
```

Le meme schema est applique a `Question` (`Question::creer`, `Question::fromRow`)
et a `Utilisateur` (`Utilisateur::creer`, `Utilisateur::fromRow`).

Il n'existe pas de classe `PaquetFactory` separee : les methodes statiques
sur le modele lui-meme constituent une forme valide du patron Factory Method,
reconnue par GoF. Cela evite de creer des classes supplementaires sans apport
reel pour un projet de cette taille.

### 3.3 Justification en trois phrases

Le constructeur prive des entites interdit toute creation dans un etat
incoherent : il n'est pas possible d'obtenir un `Paquet` sans titre ou sans
proprietaire. Les deux Factory Methods (`creer` et `fromRow`) centralisent
les regles d'initialisation pour chaque scenario, evitant de les repeter dans
les repositories et les controleurs. Cette approche est plus simple qu'une
classe Factory separee tout en remplissant exactement le meme role.

---

## 4. Recapitulatif

| Patron | Classe(s) concernee(s) | Probleme resolu | Fichier |
|---|---|---|---|
| Singleton | `DB` | Une seule connexion PDO par requete HTTP | `src/core/DB.php` |
| Repository | `*Repository` (x5) | Isolation du SQL hors des controleurs | `src/repositories/*.php` |
| Factory Method | `Paquet`, `Question`, `Utilisateur` | Creation coherente des entites (formulaire vs SQL) | `src/models/*.php` |

Les trois patrons se complementent : le **Singleton** fournit la connexion, le
**Repository** l'utilise pour persister les donnees, et la **Factory Method**
produit les objets que le Repository retourne. Ensemble, ils couvrent toute la
chaine d'acces aux donnees sans introduire de code complexe.
