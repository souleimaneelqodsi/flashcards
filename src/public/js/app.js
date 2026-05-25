// src/public/js/app.js
// Bootstrap de la SPA FlashCards MIAGE.
// Point d'entree JavaScript : initialise les composants persistants (header,
// sidebar, theme) une fois le DOM pret, declare la table de routes du SPA
// puis demarre le router (cf. src/public/js/router.js, BACK-2.1 a 2.3).
//
// Mapping route -> vue (BACK-2.2). Les vraies vues seront implementees par
// les phases FRONT/AUTH/FULL : ici on n'ecrit que des placeholders quand la
// vue n'existe pas encore. La vue par defaut est #dashboard (deja livree en
// DASH-1). Le router se base sur `window.location.hash` (perimetre cours,
// pas de History API).

// ── Titres affiches dans le topbar ──────────────────────────────
// Table de correspondance route -> libelle a afficher dans le topbar.
// Centralise pour eviter les "if" en cascade dans les handlers.
var titres_routes = {
    "#dashboard": "Tableau de bord",
    "#nouveau-paquet": "Nouveau paquet",
    "#edit-paquet": "Editer un paquet",
    "#study": "Mode revision",
    "#visualisation-paquet": "Visualisation du paquet",
    "#partages": "Partages avec moi",
    "#profil": "Mon profil",
    "#parametres": "Parametres",
    "#login": "Connexion",
    "#register": "Inscription"
};

// ── Mise a jour de l'etat actif dans la sidebar ─────────────────
// Met la classe `.active` sur le bon lien (`data-screen`) et l'enleve
// sur tous les autres. Le `data-screen` correspond au hash sans le `#`.
function mettre_a_jour_sidebar(hash) {
    var nom_ecran = hash.substring(1);
    // Si la route a un suffixe (ex : #visualisation-paquet-3), on prend
    // juste le prefixe pour matcher le data-screen ("visualisation-paquet").
    var position_tiret_id = nom_ecran.indexOf("-");
    var ecran_de_base = nom_ecran;
    if (nom_ecran.indexOf("visualisation-paquet-") === 0) {
        ecran_de_base = "visualisation-paquet";
    }
    // Note : on garde le test simple pour les autres routes (pas de
    // suffixe attendu).
    if (position_tiret_id !== -1 && ecran_de_base === nom_ecran) {
        // Cas general : pas de modification, on garde le nom complet.
    }
    $(".nav-link").removeClass("active");
    $(".nav-link[data-screen='" + ecran_de_base + "']").addClass("active");
}

// ── Mise a jour du titre du topbar ──────────────────────────────
function mettre_a_jour_titre(hash) {
    var titre = titres_routes[hash];
    if (typeof titre !== "string") {
        // Routes avec suffixe (ex : #visualisation-paquet-3) : on retombe
        // sur le titre du prefixe connu.
        if (hash.indexOf("#visualisation-paquet-") === 0) {
            titre = titres_routes["#visualisation-paquet"];
        }
    }
    if (typeof titre !== "string") {
        titre = "FlashCards MIAGE";
    }
    $("#topbar-title").text(titre);
}

// ── Placeholder pour les vues non encore implementees ───────────
// Affiche un encart simple dans #view avec le titre de la vue et un
// message indiquant que la vraie vue est en cours d'integration. Les
// vraies vues remplaceront ces placeholders dans les phases FRONT /
// AUTH / FULL.
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
// Affichee quand l'utilisateur saisit un hash inconnu dans la barre
// d'adresse. Propose un retour explicite au tableau de bord.
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
// Une fonction par route : on s'assure que chaque vue est explicitement
// rattachee a un handler, plutot que de generer dynamiquement. Plus
// verbeux, mais plus lisible et facile a parcourir lors de la review.
function enregistrer_routes() {
    Router.definir_defaut("#dashboard");

    Router.ajouter("#dashboard", function () {
        afficher_dashboard();
    });

    Router.ajouter("#nouveau-paquet", function () {
        afficher_vue_placeholder("Nouveau paquet", "Creer un nouveau paquet de revisions.");
    });

    Router.ajouter("#edit-paquet", function () {
        afficher_vue_placeholder("Editer un paquet", "Modifier le titre, le theme et les questions du paquet.");
    });

    Router.ajouter("#study", function () {
        afficher_vue_placeholder("Mode revision", "Lancer une session de revision style Anki.");
    });

    Router.ajouter("#visualisation-paquet", function () {
        afficher_vue_placeholder("Visualisation du paquet", "Detail du paquet et liste des destinataires de partage.");
    });
    // Cette route accepte un id en suffixe (#visualisation-paquet-3) : on
    // declare le prefixe au router pour qu'il route les variantes vers le
    // meme handler. Le handler lira l'id sur `window.location.hash`.
    Router.ajouter_avec_id("#visualisation-paquet");

    Router.ajouter("#partages", function () {
        afficher_vue_placeholder("Partages avec moi", "Paquets qui vous ont ete partages.");
    });

    Router.ajouter("#profil", function () {
        afficher_vue_placeholder("Mon profil", "Informations de votre compte et avatar.");
    });

    Router.ajouter("#parametres", function () {
        afficher_vue_placeholder("Parametres", "Preferences de l'application.");
    });

    Router.ajouter("#login", function () {
        afficher_vue_placeholder("Connexion", "Se connecter a son compte.");
    });

    Router.ajouter("#register", function () {
        afficher_vue_placeholder("Inscription", "Creer un nouveau compte.");
    });

    // Handler 404 (BACK-2.3) : affiche la vue "page introuvable" plutot
    // que de rediriger silencieusement. L'utilisateur peut ainsi revenir
    // au dashboard via le bouton dedie.
    Router.definir_404(function (hash_demande) {
        $("#topbar-title").text("Page introuvable");
        $(".nav-link").removeClass("active");
        afficher_vue_404(hash_demande);
    });
}

$(function () {
    // Conteneur racine de l'application.
    var app = $("#app");

    // Marque l'application comme initialisee (utile pour le CSS et les tests).
    app.addClass("app-pret");

    // Enregistre toutes les routes puis demarre le router (1er rendu).
    enregistrer_routes();

    // Au changement de route : on met aussi a jour le titre du topbar et
    // la sidebar active. Le rendu de la vue est fait par le handler.
    $(window).on("hashchange", function () {
        var hash_courant = window.location.hash;
        if (hash_courant === "" || hash_courant === "#") {
            hash_courant = "#dashboard";
        }
        mettre_a_jour_titre(hash_courant);
        mettre_a_jour_sidebar(hash_courant);
    });

    // Mise a jour initiale (premier chargement) avant le demarrage du router.
    var hash_initial = window.location.hash;
    if (hash_initial === "" || hash_initial === "#") {
        hash_initial = "#dashboard";
    }
    mettre_a_jour_titre(hash_initial);
    mettre_a_jour_sidebar(hash_initial);

    // Demarre le router (1er rendu de la vue active).
    Router.demarrer();
});
