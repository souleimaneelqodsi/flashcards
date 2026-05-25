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

// ── Etat de la session d'etude (prepare la machine FRONT-2.14) ─
// Compteurs simples partages entre les micro-taches : le pourcentage
// de score (FRONT-2.11) sera derivé de ces deux compteurs.
var nb_correctes = 6;
var nb_mauvaises = 2;

// Index de la question courante dans la liste laterale (FRONT-2.9).
// Les vraies donnees viendront en FULL-2 ; pour l'instant on parcourt
// les items DOM .study-liste-item dans l'ordre.
var index_question_courante = 3;

// ── Bascule de la face recto <-> verso ────────────────────────
// Utilise jQuery .show()/.hide() qui modifient l'attribut display
// sur les deux faces. L'attribut HTML5 hidden est synchronise pour
// rester semantiquement coherent (CLAUDE.md §6 sur l'accessibilite).
// La zone d'evaluation (boutons Check/Bad) n'apparait qu'apres flip
// vers la face verso (FRONT-2.8).
function afficher_face_recto() {
    $("#study-carte-recto").show().removeAttr("hidden");
    $("#study-carte-verso").hide().attr("hidden", "hidden");
    $("#study-evaluation").hide().attr("hidden", "hidden");
}

function afficher_face_verso() {
    $("#study-carte-recto").hide().attr("hidden", "hidden");
    $("#study-carte-verso").show().removeAttr("hidden");
    $("#study-evaluation").show().removeAttr("hidden");
}

function basculer_face_carte() {
    if ($("#study-carte-recto").is(":visible")) {
        afficher_face_verso();
    } else {
        afficher_face_recto();
    }
}

// ── Mise a jour de l'affichage du score ──────────────────────
// Synchronise les compteurs visuels (pastilles correctes/mauvaises)
// avec l'etat courant. Le pourcentage live sera ajoute en FRONT-2.11.
function rafraichir_pastilles_score() {
    $("#study-correctes").text(nb_correctes);
    $("#study-mauvaises").text(nb_mauvaises);
}

// ── Navigation entre questions (FRONT-2.9) ───────────────────
// Selectionne la question d'index donne dans la liste laterale,
// met a jour l'item .active, le compteur "X / N" du header et
// remet la carte sur la face question.
function aller_a_question(nouvel_index) {
    var items = $("#study-liste-questions .study-liste-item");
    var total = items.length;
    if (total === 0) {
        return;
    }
    if (nouvel_index < 0) {
        nouvel_index = 0;
    }
    if (nouvel_index >= total) {
        nouvel_index = total - 1;
    }
    items.removeClass("active");
    items.eq(nouvel_index).addClass("active");
    index_question_courante = nouvel_index;

    // Met a jour le compteur du header. On reprend le numero affiche
    // dans le pastille de l'item (visuel : "1", "2", ..., "9", ...).
    var numero = items.eq(nouvel_index).find(".study-liste-numero").text();
    $("#study-numero-courant").text(numero);

    // Retour systematique sur la face question apres navigation.
    afficher_face_recto();
}

function aller_question_precedente() {
    aller_a_question(index_question_courante - 1);
}

function aller_question_suivante() {
    aller_a_question(index_question_courante + 1);
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

    // ── Boutons d'evaluation (FRONT-2.8) ──
    // "Je savais !" : la reponse a ete trouvee -> incrementer le
    // compteur de bonnes reponses, marquer la question en cours dans
    // la liste laterale, et revenir a la face question (la suite,
    // navigation vers la question suivante, viendra en FRONT-2.9).
    $("#btn-savais").on("click", function () {
        nb_correctes = nb_correctes + 1;
        $("#study-liste-questions .study-liste-item.active")
            .addClass("savais")
            .removeClass("revoir");
        rafraichir_pastilles_score();
        afficher_face_recto();
    });

    // "A revoir" : symetrique pour les mauvaises reponses.
    $("#btn-revoir").on("click", function () {
        nb_mauvaises = nb_mauvaises + 1;
        $("#study-liste-questions .study-liste-item.active")
            .addClass("revoir")
            .removeClass("savais");
        rafraichir_pastilles_score();
        afficher_face_recto();
    });

    // ── Navigation (FRONT-2.9) ──
    // Clic sur un item de la liste laterale : navigue vers cette
    // question. La delegation permet de couvrir les questions ajoutees
    // dynamiquement plus tard si necessaire.
    $("#study-liste-questions").on("click", ".study-liste-item", function () {
        var index = $("#study-liste-questions .study-liste-item").index(this);
        aller_a_question(index);
    });

    // Navigation au clavier global. Les codes touches utilises sont
    // ceux historiquement enseignes (event.keyCode) :
    //   - 32 : Espace -> flip de la carte
    //   - 37 : fleche gauche -> question precedente
    //   - 39 : fleche droite -> question suivante
    //   - 49 : touche "1" -> Je savais
    //   - 50 : touche "2" -> A revoir
    // Les raccourcis 1 et 2 ne s'activent que lorsque la face verso
    // est affichee (machine d'etat allegee, sera formalisee en
    // FRONT-2.14).
    $(document).on("keydown", function (evenement) {
        // On ignore les raccourcis quand un champ de saisie est focus
        // pour ne pas interferer avec l'edition (ex : modale d'ajout
        // de question ouverte sur une autre vue).
        var cible = evenement.target;
        if (cible && (cible.tagName === "INPUT" || cible.tagName === "TEXTAREA")) {
            return;
        }
        // Et uniquement si la vue d'etude est visible.
        var vue_study_visible = $("#vue-study").is(":visible");
        if (!vue_study_visible) {
            return;
        }
        if (evenement.keyCode === 37) {
            evenement.preventDefault();
            aller_question_precedente();
            return;
        }
        if (evenement.keyCode === 39) {
            evenement.preventDefault();
            aller_question_suivante();
            return;
        }
        if (evenement.keyCode === 32) {
            evenement.preventDefault();
            basculer_face_carte();
            return;
        }
        if (evenement.keyCode === 49) {
            // Touche "1" : seulement si la reponse est revelee.
            if ($("#study-carte-verso").is(":visible")) {
                evenement.preventDefault();
                $("#btn-savais").click();
            }
            return;
        }
        if (evenement.keyCode === 50) {
            // Touche "2" : symetrique.
            if ($("#study-carte-verso").is(":visible")) {
                evenement.preventDefault();
                $("#btn-revoir").click();
            }
        }
    });

});
