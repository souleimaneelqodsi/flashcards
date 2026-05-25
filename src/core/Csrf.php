<?php
// src/core/Csrf.php

require_once __DIR__ . '/Response.php';

/**
 * Protection contre les attaques CSRF (AUTH-2.12).
 *
 * Genere et conserve un token aleatoire en session. Les endpoints qui
 * modifient l'etat (POST, PUT, DELETE) verifient que le client renvoie
 * le bon token via l'en-tete `X-CSRF-Token` (le wrapper AjaxService cote
 * front le pose automatiquement depuis la balise <meta name="csrf-token">).
 *
 * Choix d'implementation :
 *  - methodes statiques (pas d'instance) : Csrf est un namespace de
 *    helpers, pas une 4e instance de classe Singleton (CLAUDE.md limite
 *    les patrons a 3 : Singleton/Repository/Factory) ;
 *  - token genere une fois par session (regenere a la connexion via
 *    `regenerer()` apres session_regenerate_id, pour reduire la fenetre
 *    de validite d'un token captif d'avant-connexion) ;
 *  - longueur 32 octets (256 bits) encodes en hexa : pratique pour
 *    transit en en-tete HTTP, suffisamment imprevisible.
 *
 * Le perimetre des fonctions PHP utilisees (random_bytes, bin2hex,
 * hash_equals) est hors cours stricto sensu mais cite par le sujet TER
 * dans le cadre des bonnes pratiques de securite (auto-formation).
 */
class Csrf
{
    /**
     * S'assure qu'un token CSRF existe dans la session. Le cree si
     * absent (premier passage de l'utilisateur). A appeler en debut de
     * chaque requete, apres `session_start()`.
     */
    public static function generer_si_absent()
    {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = self::nouveau_token();
        }
    }

    /**
     * Regenere un nouveau token CSRF (a appeler apres une connexion
     * reussie en complement de session_regenerate_id, pour eviter qu'un
     * token capture avant-connexion soit toujours valide).
     */
    public static function regenerer()
    {
        $_SESSION['csrf_token'] = self::nouveau_token();
    }

    /**
     * Renvoie le token CSRF de la session courante (ou chaine vide si
     * absent - ne devrait pas arriver si `generer_si_absent` a ete
     * appele en debut de requete).
     *
     * @return string
     */
    public static function obtenir()
    {
        if (!isset($_SESSION['csrf_token'])) {
            return '';
        }
        return $_SESSION['csrf_token'];
    }

    /**
     * Verifie un token recu dans l'en-tete X-CSRF-Token. Si invalide ou
     * absent, envoie une reponse JSON 403 et stoppe le script (les
     * controleurs n'ont qu'a appeler `Csrf::verifier_requete()` au
     * debut de leurs actions sensibles).
     */
    public static function verifier_requete()
    {
        $token_recu = self::lire_token_entete();
        $token_session = self::obtenir();
        if ($token_session === '' || $token_recu === '') {
            Response::json(array('erreur' => 'Token CSRF manquant.'), 403);
        }
        // hash_equals compare en temps constant pour eviter les attaques
        // par mesure de temps. Equivalent securise du `===`.
        if (!hash_equals($token_session, $token_recu)) {
            Response::json(array('erreur' => 'Token CSRF invalide.'), 403);
        }
    }

    /**
     * Lit le token CSRF dans l'en-tete HTTP X-CSRF-Token.
     *
     * @return string Chaine vide si l'en-tete est absent.
     */
    private static function lire_token_entete()
    {
        // PHP stocke les en-tetes dans $_SERVER avec le prefixe HTTP_ et
        // les tirets remplaces par des soulignes.
        if (isset($_SERVER['HTTP_X_CSRF_TOKEN'])) {
            return $_SERVER['HTTP_X_CSRF_TOKEN'];
        }
        return '';
    }

    /**
     * Genere un nouveau token aleatoire de 32 octets (256 bits) encode
     * en chaine hexadecimale.
     *
     * @return string Token de 64 caracteres hexadecimaux.
     */
    private static function nouveau_token()
    {
        // random_bytes(32) : 32 octets cryptographiquement surs.
        // bin2hex : encodage hexa pour faciliter le transit en HTTP.
        return bin2hex(random_bytes(32));
    }
}
