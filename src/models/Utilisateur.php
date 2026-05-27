<?php
// src/models/Utilisateur.php

require_once __DIR__ . '/../core/BaseModel.php';

/**
 * Entite metier "Utilisateur".
 *
 * Represente un utilisateur de l'application (correspond a la table
 * `utilisateurs` de CLAUDE.md section 4). Fournit deux Factory Methods
 * statiques (patron Factory du sujet TER) :
 *  - creer()    : instancie un nouvel utilisateur a partir des donnees
 *                 du formulaire d'inscription (sans id_user : il sera
 *                 attribue apres l'INSERT en base).
 *  - fromRow()  : reconstruit un utilisateur depuis une ligne SQL
 *                 (utilise par UtilisateurRepository apres un fetch).
 *
 * Le mot de passe stocke ici est **deja hashe** (BCRYPT). Aucune methode
 * ne renvoie le mot de passe en clair ; `toArray()` ne l'inclut pas non
 * plus, pour eviter toute fuite dans une reponse JSON.
 */
class Utilisateur extends BaseModel
{
    private $id_user;
    private $email;
    private $mot_de_passe;
    private $nom;
    private $prenom;
    private $date_naissance;
    private $avatar;

    /**
     * Constructeur prive : l'instanciation passe par les Factory creer()
     * ou fromRow() pour bien distinguer les deux cas d'usage.
     */
    private function __construct()
    {
    }

    /**
     * Factory : cree un nouvel utilisateur a partir des donnees du
     * formulaire d'inscription. L'id_user est null tant que l'utilisateur
     * n'a pas ete insere en base.
     *
     * @param string      $email           Email valide et unique.
     * @param string      $mot_de_passe    Mot de passe DEJA hashe (BCRYPT).
     * @param string      $nom             Nom de famille.
     * @param string      $prenom          Prenom.
     * @param string      $date_naissance  Format AAAA-MM-JJ (DATE SQLite).
     * @param string|null $avatar          Chemin de l'avatar ou null.
     * @return Utilisateur
     */
    public static function creer($email, $mot_de_passe, $nom, $prenom, $date_naissance, $avatar = null)
    {
        $utilisateur = new Utilisateur();
        $utilisateur->id_user        = null;
        $utilisateur->email          = $email;
        $utilisateur->mot_de_passe   = $mot_de_passe;
        $utilisateur->nom            = $nom;
        $utilisateur->prenom         = $prenom;
        $utilisateur->date_naissance = $date_naissance;
        $utilisateur->avatar         = $avatar;
        return $utilisateur;
    }

    /**
     * Factory : reconstruit un utilisateur a partir d'une ligne SQL
     * (tableau associatif issu d'un fetch en PDO::FETCH_ASSOC).
     *
     * @param array $ligne Ligne issue de la table `utilisateurs`.
     * @return Utilisateur
     */
    public static function fromRow($ligne)
    {
        $utilisateur = new Utilisateur();
        $utilisateur->id_user        = isset($ligne['id_user']) ? (int) $ligne['id_user'] : null;
        $utilisateur->email          = isset($ligne['email']) ? $ligne['email'] : null;
        $utilisateur->mot_de_passe   = isset($ligne['mot_de_passe']) ? $ligne['mot_de_passe'] : null;
        $utilisateur->nom            = isset($ligne['nom']) ? $ligne['nom'] : null;
        $utilisateur->prenom         = isset($ligne['prenom']) ? $ligne['prenom'] : null;
        $utilisateur->date_naissance = isset($ligne['date_naissance']) ? $ligne['date_naissance'] : null;
        $utilisateur->avatar         = isset($ligne['avatar']) ? $ligne['avatar'] : null;
        return $utilisateur;
    }

    // Getters

    public function getIdUser()        { return $this->id_user; }
    public function getEmail()         { return $this->email; }
    public function getMotDePasse()    { return $this->mot_de_passe; }
    public function getNom()           { return $this->nom; }
    public function getPrenom()        { return $this->prenom; }
    public function getDateNaissance() { return $this->date_naissance; }
    public function getAvatar()        { return $this->avatar; }

    /**
     * Renseigne l'id genere par SQLite apres un INSERT.
     * Appelee uniquement par UtilisateurRepository::creer().
     *
     * @param int $id_user
     */
    public function setIdUser($id_user)
    {
        $this->id_user = (int) $id_user;
    }

    // Setters utilises pour la mise a jour du profil (edition, changement
    // de mot de passe, couleur d'avatar). On charge l'utilisateur existant
    // via fromRow(), on modifie les champs concernes, puis on persiste via
    // UtilisateurRepository::mettre_a_jour(). Le mot de passe passe ici est
    // deja hashe (BCRYPT) : aucun mot de passe en clair n'est jamais stocke.

    public function setEmail($email)
    {
        $this->email = $email;
    }

    public function setMotDePasse($mot_de_passe_hashe)
    {
        $this->mot_de_passe = $mot_de_passe_hashe;
    }

    public function setNom($nom)
    {
        $this->nom = $nom;
    }

    public function setPrenom($prenom)
    {
        $this->prenom = $prenom;
    }

    public function setDateNaissance($date_naissance)
    {
        $this->date_naissance = $date_naissance;
    }

    public function setAvatar($avatar)
    {
        $this->avatar = $avatar;
    }

    /**
     * Representation publique de l'utilisateur (sans mot de passe).
     * Utilisee pour les reponses JSON de l'API.
     *
     * @return array
     */
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
}
