// src/public/js/app.js
// Bootstrap de la SPA FlashCards MIAGE.
// Point d'entree JavaScript : initialise les composants persistants (sidebar,
// header, theme) une fois le DOM pret, et fournit un dispatcher minimal qui
// bascule l'affichage entre les vues principales en fonction du hash de
// l'URL. Le routeur SPA definitif viendra en BACK-2.1 et generalisera ce
// dispatcher (gestion des parametres, vues a venir : study, fin de session,
// visualisation d'un paquet, profil).

// ── Configuration des vues connues ─────────────────────────────
// Chaque route mappe vers l'ID DOM de la section a afficher. Les autres
// sections sont masquees (display: none + attribut hidden pour la
// semantique). La vue par defaut est le dashboard ("view").
var VUE_DASHBOARD = "view";
var VUE_EDITION_PAQUET = "vue-edition-paquet";
var VUE_STUDY = "vue-study";

// Toutes les vues geree par le dispatcher (utile pour les masquer toutes
// avant d'afficher la bonne).
var TOUTES_LES_VUES = [VUE_DASHBOARD, VUE_EDITION_PAQUET, VUE_STUDY];

// ── Determination de la vue cible depuis un hash ───────────────
// Centralise la logique de mapping pour pouvoir l'etendre simplement
// quand de nouvelles routes seront ajoutees.
function vue_pour_hash(hash) {
    if (hash === "#nouveau-paquet") {
        return VUE_EDITION_PAQUET;
    }
    // Ex : #paquet-3/edition -> vue d'edition d'un paquet existant.
    if (/^#paquet-\d+\/edition$/.test(hash)) {
        return VUE_EDITION_PAQUET;
    }
    // Ex : #study-3 -> session d'etude pour le paquet d'id 3.
    if (/^#study-\d+$/.test(hash)) {
        return VUE_STUDY;
    }
    // Toute autre route inconnue retombe sur le dashboard.
    return VUE_DASHBOARD;
}

// ── Affichage de la vue cible et masquage des autres ───────────
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

// ── Dispatcher : reagit au changement de hash dans l'URL ───────
function basculer_vue() {
    var vue = vue_pour_hash(window.location.hash);
    afficher_vue(vue);
}

// ── Bootstrap au chargement du DOM ─────────────────────────────
$(function () {
    var app = $("#app");
    app.addClass("app-pret");

    // Synchronise l'affichage avec le hash initial (si l'utilisateur
    // arrive directement sur #nouveau-paquet, par exemple) puis ecoute
    // les changements ulterieurs.
    basculer_vue();
    $(window).on("hashchange", function () {
        basculer_vue();
    });
});
