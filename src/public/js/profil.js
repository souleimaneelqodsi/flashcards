// src/public/js/profil.js
// Vue "Mon profil" de la SPA FlashCards MIAGE (complement AUTH-2).
//
// Reference visuelle : project-files/interface/my_profile.png.
//
// La structure HTML est statique dans app.php (section #vue-profil). Ce
// fichier se contente de :
//   - remplir les valeurs (nom, email, prenom, date de naissance, initiales)
//     a partir de l'utilisateur connecte (Session.utilisateur()) ;
//   - cabler le toggle de theme sombre du profil sur le systeme de theme
//     existant (theme.js), sans dupliquer sa logique ;
//   - cabler le bouton "Se deconnecter" sur Session.deconnexion().
//
// Les actions sans backend a ce stade (modifier l'avatar, changer le mot
// de passe, supprimer le compte) affichent un toast "a venir" : elles
// seront branchees quand les endpoints correspondants existeront.
//
// Perimetre des APIs : $() selecteurs, .text(), .on(), .click(),
// .addClass/.removeClass, .attr — tout dans le cours.

// Noms de mois (sans accents, comme le reste de l'UI) pour formater la
// date de naissance "AAAA-MM-JJ" en "JJ mois AAAA" (ex : "15 mars 1999").
var MOIS_FRANCAIS = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
];

// Transforme "1999-03-15" en "15 mars 1999". Si la date est absente ou
// mal formee, on renvoie la valeur telle quelle (robustesse).
function formater_date_naissance(date_iso) {
    if (typeof date_iso !== "string" || date_iso.length !== 10) {
        return date_iso;
    }
    var annee = date_iso.substring(0, 4);
    var mois = parseInt(date_iso.substring(5, 7), 10);
    var jour = parseInt(date_iso.substring(8, 10), 10);
    if (isNaN(mois) || mois < 1 || mois > 12 || isNaN(jour)) {
        return date_iso;
    }
    return jour + " " + MOIS_FRANCAIS[mois - 1] + " " + annee;
}

// Calcule les initiales "Prenom Nom" -> "PN".
function initiales_profil(prenom, nom) {
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

// Synchronise l'etat visuel du toggle de theme du profil avec le theme
// courant (lu sur <html data-theme>).
function synchroniser_toggle_theme_profil() {
    if ($("html").attr("data-theme") === "dark") {
        $("#theme-switch-profil").addClass("on");
    } else {
        $("#theme-switch-profil").removeClass("on");
    }
}

// Remplit la vue profil avec les donnees de l'utilisateur connecte.
// Appelee par le router (app.js) a chaque affichage de #profil. On utilise
// .text() (jamais .html()) pour neutraliser tout risque XSS.
function remplir_profil() {
    var utilisateur = Session.utilisateur();
    if (!utilisateur) {
        return;
    }
    $("#profil-initiales").text(initiales_profil(utilisateur.prenom, utilisateur.nom));
    $("#profil-nom").text(utilisateur.prenom + " " + utilisateur.nom);
    $("#profil-email").text(utilisateur.email);
    $("#profil-val-prenom").text(utilisateur.prenom);
    $("#profil-val-nom").text(utilisateur.nom);
    $("#profil-val-date").text(formater_date_naissance(utilisateur.date_naissance));
    $("#profil-val-email").text(utilisateur.email);
    synchroniser_toggle_theme_profil();
}

window.remplir_profil = remplir_profil;

// ── Cablage des controles (une seule fois au chargement) ────────────
// La section #vue-profil etant statique dans app.php, ses elements
// existent des le depart : on pose les ecouteurs ici.
$(function () {

    // Toggle de theme du profil : on reutilise integralement la logique de
    // theme.js en declenchant le clic du switch de la sidebar, puis on
    // resynchronise l'etat visuel du toggle du profil.
    $("#theme-switch-profil").on("click", function () {
        $("#theme-switch").click();
        synchroniser_toggle_theme_profil();
    });

    // Deconnexion (action fonctionnelle).
    $("#btn-deconnexion-profil").on("click", function () {
        Session.deconnexion();
    });

    // Actions sans backend a ce stade : on informe l'utilisateur plutot
    // que de simuler un comportement. Elles seront branchees plus tard.
    $("#btn-modifier-avatar").on("click", function () {
        Toast.info("Modification de l'avatar : fonctionnalite a venir.");
    });
    $("#btn-changer-mdp").on("click", function () {
        Toast.info("Changement de mot de passe : fonctionnalite a venir.");
    });
    $("#btn-supprimer-compte").on("click", function () {
        Toast.info("Suppression du compte : fonctionnalite a venir.");
    });

});
