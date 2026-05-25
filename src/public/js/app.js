// src/public/js/app.js
// Bootstrap de la SPA FlashCards MIAGE.
//
// Point d'entree JavaScript : initialise les composants persistants, declare
// la table de routes du SPA puis demarre le router (src/public/js/router.js,
// BACK-2.1 a 2.3). Chaque route affiche une des vraies vues (sections de
// app.php) via afficher_vue(), ou un placeholder pour les vues pas encore
// construites. Le router se base sur window.location.hash (perimetre cours,
// pas de History API).

// ── Vues principales (sections de app.php) ──────────────────────
// Chaque vue est une <section> de app.php. afficher_vue() montre la bonne
// section et masque les autres. La vue par defaut est le dashboard (#view).
var VUE_DASHBOARD = "view";
var VUE_EDITION_PAQUET = "vue-edition-paquet";
var VUE_STUDY = "vue-study";
var VUE_FIN_SESSION = "vue-fin-session";
var VUE_LOGIN = "vue-login";
var VUE_REGISTER = "vue-register";
var VUE_PROFIL = "vue-profil";
var TOUTES_LES_VUES = [
    VUE_DASHBOARD,
    VUE_EDITION_PAQUET,
    VUE_STUDY,
    VUE_FIN_SESSION,
    VUE_LOGIN,
    VUE_REGISTER,
    VUE_PROFIL
];

// Affiche une vue (section) et masque toutes les autres.
function afficher_vue(id_vue) {
    var i;
    for (i = 0; i < TOUTES_LES_VUES.length; i = i + 1) {
        var id = TOUTES_LES_VUES[i];
        var element = $("#" + id);
        if (id === id_vue) {
            element.show();
            element.removeAttr("hidden");
        } else {
            element.hide();
            element.attr("hidden", "hidden");
        }
    }
}

// ── Titres affiches dans le topbar ──────────────────────────────
// Table de correspondance route -> libelle a afficher dans le topbar.
var titres_routes = {
    "#dashboard": "Tableau de bord",
    "#nouveau-paquet": "Nouveau paquet",
    "#edit-paquet": "Editer un paquet",
    "#study": "Mode revision",
    "#fin-session": "Fin de session",
    "#visualisation-paquet": "Visualisation du paquet",
    "#partages": "Partages avec moi",
    "#profil": "Mon profil",
    "#parametres": "Parametres",
    "#login": "Connexion",
    "#register": "Inscription"
};

// Routes qui acceptent un id en suffixe (ex : "#study-3"). On ramene le hash
// a son prefixe ("#study") pour retrouver son libelle et son lien de sidebar.
var prefixes_avec_id = ["#study", "#fin-session", "#visualisation-paquet", "#edit-paquet"];

// Renvoie le prefixe d'une route a id, ou le hash tel quel sinon.
function prefixe_de_route(hash) {
    var i;
    for (i = 0; i < prefixes_avec_id.length; i = i + 1) {
        var prefixe = prefixes_avec_id[i];
        if (hash === prefixe || hash.indexOf(prefixe + "-") === 0) {
            return prefixe;
        }
    }
    return hash;
}

// ── Mise a jour du titre du topbar ──────────────────────────────
function mettre_a_jour_titre(hash) {
    var titre = titres_routes[prefixe_de_route(hash)];
    if (typeof titre !== "string") {
        titre = "FlashCards MIAGE";
    }
    $("#topbar-title").text(titre);
}

// ── Mise a jour de l'etat actif dans la sidebar ─────────────────
// Met la classe `.active` sur le lien (`data-screen`) correspondant au
// prefixe de la route, et l'enleve des autres.
function mettre_a_jour_sidebar(hash) {
    var nom_ecran = prefixe_de_route(hash).substring(1);
    $(".nav-link").removeClass("active");
    $(".nav-link[data-screen='" + nom_ecran + "']").addClass("active");
}

// ── Normalisation du hash ───────────────────────────────────────
// Un hash vide ("" ou "#") correspond a la route par defaut (#dashboard).
function normaliser_hash(hash) {
    if (hash === "" || hash === "#") {
        return "#dashboard";
    }
    return hash;
}

// ── Mode authentification (complement AUTH-2) ───────────────────
// Sur les pages de connexion / inscription, on masque la sidebar et le
// topbar (via la classe .app-mode-auth, definie dans layout.css) pour
// presenter ces ecrans en plein cadre.
function appliquer_mode_auth(hash) {
    if (route_authentification(hash)) {
        $("#app").addClass("app-mode-auth");
    } else {
        $("#app").removeClass("app-mode-auth");
    }
}

// Vrai si le hash correspond a une page d'authentification (connexion ou
// inscription), seules pages accessibles sans etre connecte.
function route_authentification(hash) {
    var prefixe = prefixe_de_route(hash);
    return prefixe === "#login" || prefixe === "#register";
}

// ── Placeholder pour les vues non encore implementees ───────────
// Affiche un encart simple dans #view (la zone du dashboard) avec le titre
// de la vue et un message d'integration a venir.
function afficher_vue_placeholder(libelle_ecran, sous_titre) {
    var vue = $("#view");
    vue.empty();

    var entete = $("<div></div>").addClass("page-title-row");
    var bloc_titre = $("<div></div>");
    bloc_titre.append($("<h2></h2>").addClass("page-title").text(libelle_ecran));
    bloc_titre.append($("<p></p>").addClass("page-sub").text(sous_titre));
    entete.append(bloc_titre);
    vue.append(entete);

    var carte = $("<div></div>").addClass("card");
    carte.append($("<p></p>").text("Cette vue est en cours d'integration. Elle sera disponible dans les prochaines taches du projet."));
    vue.append(carte);
}

// ── Vue 404 (BACK-2.3) ──────────────────────────────────────────
// Affichee quand l'utilisateur saisit un hash inconnu. Propose un retour
// explicite au tableau de bord.
function afficher_vue_404(hash_demande) {
    var vue = $("#view");
    vue.empty();

    var entete = $("<div></div>").addClass("page-title-row");
    var bloc_titre = $("<div></div>");
    bloc_titre.append($("<h2></h2>").addClass("page-title").text("Page introuvable"));
    bloc_titre.append(
        $("<p></p>").addClass("page-sub").text("La route demandee n'existe pas : " + hash_demande)
    );
    entete.append(bloc_titre);
    vue.append(entete);

    var carte = $("<div></div>").addClass("card");
    carte.append($("<p></p>").text("L'adresse que vous avez saisie n'est associee a aucune vue de l'application."));
    var lien_retour = $("<a></a>")
        .attr("href", "#dashboard")
        .addClass("btn btn-primary")
        .text("Retour au tableau de bord");
    carte.append(lien_retour);
    vue.append(carte);
}

// ── Enregistrement des routes du SPA ────────────────────────────
// Une fonction par route : chaque vue est explicitement rattachee a un
// handler. Les vues reelles (dashboard, edition, study, fin de session)
// sont affichees via afficher_vue() ; les autres affichent un placeholder.
function enregistrer_routes() {
    Router.definir_defaut("#dashboard");

    Router.ajouter("#dashboard", function () {
        afficher_vue(VUE_DASHBOARD);
        afficher_dashboard();
    });

    // Creation d'un nouveau paquet et edition d'un paquet existant partagent
    // la meme vue d'edition. #edit-paquet accepte un id en suffixe.
    Router.ajouter("#nouveau-paquet", function () {
        afficher_vue(VUE_EDITION_PAQUET);
    });
    Router.ajouter("#edit-paquet", function () {
        afficher_vue(VUE_EDITION_PAQUET);
    });
    Router.ajouter_avec_id("#edit-paquet");

    // Mode revision : #study-<id> (l'id du paquet est lu par study.js).
    Router.ajouter("#study", function () {
        afficher_vue(VUE_STUDY);
    });
    Router.ajouter_avec_id("#study");

    // Recapitulatif de fin de session : #fin-session-<id>.
    Router.ajouter("#fin-session", function () {
        afficher_vue(VUE_FIN_SESSION);
    });
    Router.ajouter_avec_id("#fin-session");

    // Visualisation d'un paquet (#visualisation-paquet-<id>) : la vraie vue
    // n'est pas encore construite, on affiche un placeholder dans #view.
    Router.ajouter("#visualisation-paquet", function () {
        afficher_vue(VUE_DASHBOARD);
        afficher_vue_placeholder("Visualisation du paquet", "Detail du paquet et liste des destinataires de partage.");
    });
    Router.ajouter_avec_id("#visualisation-paquet");

    // Vues non encore construites : placeholders rendus dans #view.
    Router.ajouter("#partages", function () {
        afficher_vue(VUE_DASHBOARD);
        afficher_vue_placeholder("Partages avec moi", "Paquets qui vous ont ete partages.");
    });
    Router.ajouter("#profil", function () {
        afficher_vue(VUE_PROFIL);
        remplir_profil();
    });
    Router.ajouter("#parametres", function () {
        afficher_vue(VUE_DASHBOARD);
        afficher_vue_placeholder("Parametres", "Preferences de l'application.");
    });
    // Vues d'authentification : routes vers les vraies sections HTML
    // de app.php (AUTH-2.7, AUTH-2.8). La validation et la soumission
    // sont gerees par js/auth.js.
    Router.ajouter("#login", function () {
        afficher_vue(VUE_LOGIN);
    });
    Router.ajouter("#register", function () {
        afficher_vue(VUE_REGISTER);
    });

    // Handler 404 (BACK-2.3) : affiche la vue "page introuvable" dans #view.
    Router.definir_404(function (hash_demande) {
        $("#topbar-title").text("Page introuvable");
        $(".nav-link").removeClass("active");
        afficher_vue(VUE_DASHBOARD);
        afficher_vue_404(hash_demande);
    });
}

// ── Bootstrap au chargement du DOM ─────────────────────────────
$(function () {
    var app = $("#app");
    app.addClass("app-pret");

    // Enregistre toutes les routes avant de demarrer le router.
    enregistrer_routes();

    // Au changement de route : titre du topbar, lien actif de la sidebar
    // et mode authentification. Le rendu de la vue est fait par le router.
    $(window).on("hashchange", function () {
        var hash_courant = normaliser_hash(window.location.hash);
        // Garde de navigation : un visiteur non connecte qui tente une
        // route protegee (en tapant un hash directement) est renvoye vers
        // la connexion. Session.utilisateur() vaut null tant qu'on n'est
        // pas authentifie (la sonde de demarrage l'a renseigne).
        if (Session.utilisateur() === null && !route_authentification(hash_courant)) {
            window.location.hash = "#login";
            return;
        }
        mettre_a_jour_titre(hash_courant);
        mettre_a_jour_sidebar(hash_courant);
        appliquer_mode_auth(hash_courant);
    });

    // Garde d'authentification (complement AUTH-2). Avant tout affichage,
    // on demande au serveur qui est connecte (GET /api/auth/moi) :
    //   - connecte : on affiche son identite dans le chrome et, si on
    //     arrive sur une page d'auth, on bascule vers le tableau de bord ;
    //   - non connecte : seules les pages de connexion / inscription sont
    //     accessibles ; toute autre route est redirigee vers #login.
    // Le router n'est demarre qu'apres cette resolution pour eviter
    // d'afficher brievement le tableau de bord a un visiteur non connecte.
    Session.demarrer(function (est_connecte, utilisateur) {
        var hash = normaliser_hash(window.location.hash);
        var prefixe = prefixe_de_route(hash);

        if (est_connecte) {
            Session.afficher_utilisateur(utilisateur);
            if (prefixe === "#login" || prefixe === "#register") {
                window.location.hash = "#dashboard";
            }
        } else {
            if (prefixe !== "#login" && prefixe !== "#register") {
                window.location.hash = "#login";
            }
        }

        var hash_actif = normaliser_hash(window.location.hash);
        mettre_a_jour_titre(hash_actif);
        mettre_a_jour_sidebar(hash_actif);
        appliquer_mode_auth(hash_actif);

        // Demarre le router (1er rendu de la vue active).
        Router.demarrer();
    });
});
