// src/public/js/session.js
// Session cote client de la SPA FlashCards MIAGE (complement AUTH-2).
//
// Role : faire le lien entre la session PHP du serveur et l'interface.
//   - au demarrage, on demande au serveur qui est connecte
//     (GET /api/auth/moi). Si personne, la SPA bascule sur la page de
//     connexion (le garde est pose dans app.js) ;
//   - une fois l'utilisateur connu, on affiche son vrai nom et ses
//     initiales dans le bandeau de la sidebar et dans le topbar (a la
//     place des libelles "Jean Dupont" / "JD" qui n'etaient que des
//     stubs de maquette) ;
//   - on gere la deconnexion (POST /api/auth/deconnexion).
//
// Perimetre des APIs (CLAUDE.md section 2 bis) :
//   - $.ajax, $() selecteurs, .text(), .on() — tout est dans le cours ;
//   - AjaxService (BACK-2.4) pour la deconnexion (il pose le token CSRF) ;
//   - Toast (BACK-2.9) pour le feedback.

var Session = (function () {

    // Utilisateur actuellement connecte (objet renvoye par /api/auth/moi),
    // ou null tant qu'on ne sait pas / qu'il n'y a personne.
    var utilisateur_courant = null;

    // ── Sonde de session au demarrage ───────────────────────────────
    // Demande au serveur l'utilisateur connecte. On utilise $.ajax
    // directement (et non AjaxService) parce qu'ici un 401 est un cas
    // NORMAL attendu (personne n'est connecte) : on veut le traiter
    // nous-memes pour router vers la connexion, et non declencher la
    // redirection automatique de AjaxService.
    //
    // Appelle `quand_termine(est_connecte, utilisateur)` dans tous les cas.
    function demarrer(quand_termine) {
        $.ajax({
            url: "/api/auth/moi",
            type: "GET",
            headers: {
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            dataType: "json",
            success: function (reponse) {
                if (reponse && reponse.utilisateur) {
                    utilisateur_courant = reponse.utilisateur;
                    quand_termine(true, utilisateur_courant);
                } else {
                    utilisateur_courant = null;
                    quand_termine(false, null);
                }
            },
            error: function () {
                // 401 (non connecte) ou autre erreur : on considere
                // l'utilisateur comme non authentifie.
                utilisateur_courant = null;
                quand_termine(false, null);
            }
        });
    }

    // ── Acces a l'utilisateur connecte ──────────────────────────────
    function utilisateur() {
        return utilisateur_courant;
    }

    // ── Enregistre l'utilisateur tout juste connecte ────────────────
    // Appele par auth.js apres une connexion reussie : la SPA ne
    // rechargeant pas la page, le garde de demarrage n'est pas rejoue,
    // il faut donc memoriser l'utilisateur et rafraichir le chrome ici.
    function connecter(u) {
        utilisateur_courant = u;
        afficher_utilisateur(u);
    }

    // ── Calcul des initiales (ex : "Jean Dupont" -> "JD") ───────────
    // Prend la premiere lettre du prenom et la premiere lettre du nom.
    function calculer_initiales(prenom, nom) {
        var initiale_prenom = "";
        var initiale_nom = "";
        if (typeof prenom === "string" && prenom.length > 0) {
            initiale_prenom = prenom.charAt(0);
        }
        if (typeof nom === "string" && nom.length > 0) {
            initiale_nom = nom.charAt(0);
        }
        var initiales = (initiale_prenom + initiale_nom).toUpperCase();
        if (initiales === "") {
            return "?";
        }
        return initiales;
    }

    // ── Affichage de l'utilisateur dans le chrome (sidebar + topbar) ─
    // Remplace les libelles stub par les vraies valeurs. On utilise
    // .text() (et non .html()) pour neutraliser tout risque XSS.
    function afficher_utilisateur(u) {
        if (!u) {
            return;
        }
        var nom_complet = u.prenom + " " + u.nom;
        var initiales = calculer_initiales(u.prenom, u.nom);
        $("#chip-nom").text(nom_complet);
        $("#chip-initiales").text(initiales);
        $("#topbar-initiales").text(initiales);
        // Applique la couleur d'avatar choisie (F), si profil.js est charge.
        if (typeof window.appliquer_couleur_avatar === "function") {
            window.appliquer_couleur_avatar(u.avatar);
        }
    }

    // ── Deconnexion ─────────────────────────────────────────────────
    // Envoie POST /api/auth/deconnexion (AjaxService pose le token CSRF),
    // puis recharge la page. Le rechargement repart d'une session PHP
    // vierge avec un nouveau token CSRF ; le garde du demarrage (app.js)
    // verra qu'on n'est plus connecte et affichera la page de connexion.
    function deconnexion() {
        AjaxService.post("auth/deconnexion", {}, {
            succes: function () {
                utilisateur_courant = null;
                Toast.succes("Vous etes deconnecte.");
                window.location.reload();
            },
            erreur: function (xhr, message) {
                Toast.erreur(message);
            }
        });
    }

    return {
        demarrer: demarrer,
        utilisateur: utilisateur,
        connecter: connecter,
        afficher_utilisateur: afficher_utilisateur,
        deconnexion: deconnexion
    };

}());

window.Session = Session;
