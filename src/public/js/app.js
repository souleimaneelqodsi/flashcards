// src/public/js/app.js
// Bootstrap de la SPA FlashCards MIAGE.
// Point d'entree JavaScript : initialise les composants persistants (header,
// sidebar, theme) une fois le DOM pret. Le routage des ecrans sera ajoute
// par les taches suivantes (FRONT / DASH).

$(function () {
    // Conteneur racine de l'application.
    var app = $("#app");

    // Marque l'application comme initialisee (utile pour le CSS et les tests).
    app.addClass("app-pret");
});
