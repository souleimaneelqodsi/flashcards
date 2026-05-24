// src/public/js/theme.js
// Gestion du theme clair / sombre avec persistance.
//
// La preference est conservee via localStorage. Cette API n'apparait pas dans
// les PDFs de cours : choix assume en auto-formation (cf. CSV UI-1.5), a
// justifier dans le rapport. Le reste (selection, classes, evenements) reste
// dans le perimetre jQuery enseigne.

var CLE_THEME = "flashcards_theme";

// Applique un theme ("light" ou "dark") au document et synchronise le switch.
function appliquer_theme(theme) {
    $("html").attr("data-theme", theme);
    if (theme === "dark") {
        $("#theme-switch").addClass("on");
    } else {
        $("#theme-switch").removeClass("on");
    }
}

$(function () {
    // Au chargement : restaure la preference, "light" par defaut.
    var theme_enregistre = localStorage.getItem(CLE_THEME);
    if (theme_enregistre !== "dark") {
        theme_enregistre = "light";
    }
    appliquer_theme(theme_enregistre);

    // Au clic sur le switch : bascule le theme et enregistre la preference.
    $("#theme-switch").on("click", function () {
        var theme_actuel = $("html").attr("data-theme");
        var nouveau_theme = (theme_actuel === "dark") ? "light" : "dark";
        appliquer_theme(nouveau_theme);
        localStorage.setItem(CLE_THEME, nouveau_theme);
    });
});
