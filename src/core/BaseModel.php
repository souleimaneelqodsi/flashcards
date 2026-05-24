<?php
// src/core/BaseModel.php

/**
 * Classe mere abstraite de toutes les entites du modele.
 *
 * Chaque entite concrete (Utilisateur, Paquet, Question, Difficulte, Partage)
 * en herite et fournit sa propre representation tableau via toArray(), utilisee
 * pour serialiser l'entite en JSON dans les reponses de l'API. On impose ce
 * contrat commun sans imposer la structure interne de chaque entite.
 */
abstract class BaseModel
{
    /**
     * Retourne les donnees publiques de l'entite sous forme de tableau associatif.
     *
     * @return array
     */
    abstract public function toArray();
}
