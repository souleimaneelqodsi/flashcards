// src/public/js/study.js
// Comportement de la vue de session d'etude (FRONT-2.7 a 2.14).
//
// FRONT-2.7 : bascule entre la face recto (question) et la face verso
// (reponse) au clic sur la carte. Implementation par .toggle() jQuery
// (alternance show/hide) plutot que via une transformation 3D CSS
// (transform: rotateY) : la perspective 3D n'est pas garantie dans le
// perimetre du cours initiation-HTML-CSS.pdf.
//
// Les fonctionnalites suivantes seront ajoutees au fil des micro-taches :
//   - FRONT-2.8  : boutons Check / Bad apres flip
//   - FRONT-2.9  : navigation clavier (fleches, Espace, 1, 2)
//   - FRONT-2.10 : ecran recapitulatif de fin de session
//   - FRONT-2.11 : compteur de score en temps reel
//   - FRONT-2.12 : appel AJAX de fin de session
//   - FRONT-2.14 : machine d'etats (Q_affichee / R_revelee / Session_finie)

// ── Bascule de la face recto <-> verso ────────────────────────
// Utilise jQuery .toggle() qui alterne entre display:none et display:''
// sur les deux faces. L'attribut HTML5 hidden est synchronise pour
// rester semantiquement coherent (CLAUDE.md §6 sur l'accessibilite).
function basculer_face_carte() {
    var recto = $("#study-carte-recto");
    var verso = $("#study-carte-verso");

    if (recto.is(":visible")) {
        recto.hide().attr("hidden", "hidden");
        verso.show().removeAttr("hidden");
    } else {
        verso.hide().attr("hidden", "hidden");
        recto.show().removeAttr("hidden");
    }
}

// ── Initialisation au chargement du DOM ──────────────────────
$(function () {

    // Clic souris sur l'une des deux faces : flip.
    $("#study-carte-recto").on("click", function () {
        basculer_face_carte();
    });
    $("#study-carte-verso").on("click", function () {
        basculer_face_carte();
    });

    // Accessibilite clavier : la touche Entree (sur la carte focused)
    // declenche aussi le flip. Permet la navigation au clavier sans
    // souris (cf. tabindex="0" sur les deux articles dans app.php).
    $("#study-carte-recto, #study-carte-verso").on("keydown", function (evenement) {
        if (evenement.keyCode === 13) {
            evenement.preventDefault();
            basculer_face_carte();
        }
    });

});
