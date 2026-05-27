// src/public/js/ajax.js
// Service AJAX centralise pour la SPA FlashCards MIAGE (BACK-2.4 a 2.6).
//
// Toutes les requetes vers l'API du back-end passent par ce wrapper, qui :
//   - prefixe automatiquement l'URL par /api ;
//   - pose les en-tetes communs (Accept JSON, X-Requested-With) ;
//   - ajoute le token CSRF lu sur la balise <meta name="csrf-token"> si
//     presente (le token sera produit par le back en AUTH-2) ;
//   - intercepte les reponses 401 pour rediriger vers la page de connexion
//     (BACK-2.5) ;
//   - declenche un loader global pendant les requetes (BACK-2.6).
//
// Perimetre des APIs : `$.ajax`, `$()` selecteurs, `.on/.off`, `.show/.hide`
// — tout est dans le PDF de cours. Pas de Promise / fetch / async / await.

var AjaxService = (function () {

    // Prefixe applique a toutes les URLs (sauf si l'appelant donne une URL
    // qui commence deja par "/" ou "http").
    var prefixe_api = "/api";

    // Compteur de requetes en cours : utilise pour gerer le loader global
    // (BACK-2.6). Le loader s'affiche au depart de la 1ere requete et
    // disparait quand la derniere se termine.
    var requetes_en_cours = 0;

    // URL de redirection en cas de 401 (BACK-2.5). Peut etre modifiee par
    // l'appelant via `definir_url_login`.
    var url_login = "#login";

    // ── Construction de l'URL ───────────────────────────────────
    // Si l'URL fournie commence par "/" ou "http", on la laisse tel
    // quelle ; sinon on la prefixe avec "/api/".
    function construire_url(chemin) {
        if (chemin.indexOf("http") === 0) {
            return chemin;
        }
        if (chemin.indexOf("/") === 0) {
            return chemin;
        }
        return prefixe_api + "/" + chemin;
    }

    // ── Lecture du token CSRF ───────────────────────────────────
    // Lit la balise <meta name="csrf-token" content="..."> si elle est
    // presente dans le DOM. Le back-end produira cette balise depuis
    // AUTH-2. Si elle n'existe pas, on renvoie une chaine vide et le
    // header n'est pas envoye.
    function lire_token_csrf() {
        var meta = $("meta[name='csrf-token']");
        if (meta.length === 0) {
            return "";
        }
        var valeur = meta.attr("content");
        if (typeof valeur !== "string") {
            return "";
        }
        return valeur;
    }

    // ── Construction des en-tetes communs ───────────────────────
    function construire_entetes() {
        var entetes = {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        };
        var token = lire_token_csrf();
        if (token !== "") {
            entetes["X-CSRF-Token"] = token;
        }
        return entetes;
    }

    // ── Gestion du loader global (BACK-2.6) ─────────────────────
    // Affiche le loader des qu'au moins une requete est en cours, le
    // cache des qu'il n'y en a plus aucune. L'element CSS .ajax-loader
    // est defini dans components.css.
    function incrementer_loader() {
        requetes_en_cours = requetes_en_cours + 1;
        if (requetes_en_cours === 1) {
            $("#ajax-loader").addClass("visible");
        }
    }

    function decrementer_loader() {
        requetes_en_cours = requetes_en_cours - 1;
        if (requetes_en_cours <= 0) {
            requetes_en_cours = 0;
            $("#ajax-loader").removeClass("visible");
        }
    }

    // ── Intercepteur 401 (BACK-2.5) ─────────────────────────────
    // Quand l'API renvoie 401 (session expiree, non authentifie), on
    // bascule l'utilisateur vers la page de connexion. L'appelant ne
    // recoit pas son callback `succes` mais peut tout de meme passer
    // un `erreur` pour journaliser le cas (cf. BACK-2.8).
    function intercepter_401(xhr) {
        // 401 : redirection vers la page de connexion. On change le hash,
        // le router prend le relais.
        if (xhr.status === 401) {
            window.location.hash = url_login;
            return true;
        }
        return false;
    }

    // ── Definir l'URL de redirection 401 ────────────────────────
    function definir_url_login(hash) {
        url_login = hash;
    }

    // ── Methode principale : envoyer une requete AJAX ────────────
    // Parametres :
    //   - chemin : URL relative (ex : "auth/connexion") ou absolue
    //   - methode : "GET", "POST", "PUT", "DELETE"
    //   - donnees : objet a envoyer (sera serialise JSON pour POST/PUT)
    //   - callbacks : objet { succes, erreur } — succes(reponse), erreur(xhr, message)
    function envoyer(chemin, methode, donnees, callbacks) {
        // Valeurs par defaut explicites (pas de destructuring : hors cours).
        if (typeof callbacks !== "object" || callbacks === null) {
            callbacks = {};
        }
        var callback_succes = callbacks.succes;
        var callback_erreur = callbacks.erreur;
        // Par defaut, un 401 declenche la redirection automatique vers la
        // page de connexion (session expiree sur un endpoint protege).
        // L'appelant peut desactiver ce comportement avec
        // `rediriger_si_401: false` quand un 401 est un cas NORMAL qu'il
        // veut traiter lui-meme (ex : login -> "Identifiants invalides").
        var rediriger_si_401 = (callbacks.rediriger_si_401 !== false);

        // Pre-traitement des donnees : pour GET/DELETE, jQuery les serialise
        // en query string ; pour POST/PUT on envoie du JSON dans le corps.
        var options = {
            url: construire_url(chemin),
            type: methode,
            headers: construire_entetes(),
            dataType: "json"
        };

        var methode_a_corps = (methode === "POST" || methode === "PUT");
        if (methode_a_corps && typeof donnees !== "undefined") {
            options.contentType = "application/json; charset=utf-8";
            options.data = JSON.stringify(donnees);
        } else if (typeof donnees !== "undefined") {
            options.data = donnees;
        }

        // Loader on
        incrementer_loader();

        options.success = function (reponse) {
            decrementer_loader();
            if (typeof callback_succes === "function") {
                callback_succes(reponse);
            }
        };
        options.error = function (xhr) {
            decrementer_loader();
            // 401 : redirection automatique vers la page de connexion,
            // sauf si l'appelant a demande a gerer le 401 lui-meme.
            if (rediriger_si_401 && intercepter_401(xhr) === true) {
                return;
            }
            if (typeof callback_erreur === "function") {
                var message = "Erreur reseau.";
                if (xhr.responseJSON && typeof xhr.responseJSON.erreur === "string") {
                    message = xhr.responseJSON.erreur;
                }
                callback_erreur(xhr, message);
            }
        };

        $.ajax(options);
    }

    // ── Methodes raccourcies par verbe HTTP ──────────────────────
    function get(chemin, donnees, callbacks) {
        envoyer(chemin, "GET", donnees, callbacks);
    }
    function post(chemin, donnees, callbacks) {
        envoyer(chemin, "POST", donnees, callbacks);
    }
    function put(chemin, donnees, callbacks) {
        envoyer(chemin, "PUT", donnees, callbacks);
    }
    function supprimer(chemin, callbacks) {
        envoyer(chemin, "DELETE", undefined, callbacks);
    }

    return {
        envoyer: envoyer,
        get: get,
        post: post,
        put: put,
        supprimer: supprimer,
        definir_url_login: definir_url_login
    };

}());

window.AjaxService = AjaxService;
