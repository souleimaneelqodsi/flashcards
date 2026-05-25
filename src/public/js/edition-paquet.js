// src/public/js/edition-paquet.js
// Comportement de la vue d'edition d'un paquet (FRONT-2.2 a 2.5).
//
// Couvre :
//   - Ouverture / fermeture de la modale d'ajout de question.
//   - Validation dynamique des champs Question et Reponse au keyup et au
//     blur (pattern impose CLAUDE.md §6 : champ rouge des qu'une mauvaise
//     entree est detectee + message sous le champ + recap rouge en bas).
//   - Selecteur de difficulte (radio visuel).
//   - Ajout d'une question dans la liste, mise a jour du compteur.
//
// La persistance reelle (POST /api/paquets/<id>/questions) viendra avec
// FULL-2 / AUTH-2. Pour l'instant, l'ajout est purement cote DOM.

// ── Identifiants des elements de la modale ────────────────────
var ID_MODALE = "modale-ajout-question";
var ID_FORM = "form-ajout-question";
var ID_CHAMP_QUESTION = "champ-question";
var ID_CHAMP_REPONSE = "champ-reponse";
var ID_ERREUR_QUESTION = "erreur-question";
var ID_ERREUR_REPONSE = "erreur-reponse";
var ID_RECAP = "recap-erreurs-question";
var ID_LISTE_ERREURS = "liste-erreurs-question";

// Compteur incremental pour les nouveaux IDs DOM des questions ajoutees
// cote client (a remplacer par les IDs serveur quand l'API sera branchee).
var compteur_nouvelles_questions = 1000;

// ── Ouvre la modale et reinitialise son etat ──────────────────
function ouvrir_modale_ajout_question() {
    $("#" + ID_CHAMP_QUESTION).val("");
    $("#" + ID_CHAMP_REPONSE).val("");
    $("#" + ID_CHAMP_QUESTION).removeClass("champ-invalide");
    $("#" + ID_CHAMP_REPONSE).removeClass("champ-invalide");
    $("#" + ID_ERREUR_QUESTION).attr("hidden", "hidden");
    $("#" + ID_ERREUR_REPONSE).attr("hidden", "hidden");
    $("#" + ID_RECAP).attr("hidden", "hidden");
    $("#" + ID_LISTE_ERREURS).empty();
    // Reset du selecteur de difficulte : Facile actif par defaut.
    $("#" + ID_FORM + " .badge-diff").removeClass("active").attr("aria-checked", "false");
    $("#" + ID_FORM + " .badge-diff-facile").addClass("active").attr("aria-checked", "true");
    $("#" + ID_MODALE).removeAttr("hidden");
    $("#" + ID_CHAMP_QUESTION).focus();
}

function fermer_modale_ajout_question() {
    $("#" + ID_MODALE).attr("hidden", "hidden");
}

// ── Validation d'un champ individuel ─────────────────────────
// Retourne true si le champ est valide (texte non vide apres trim),
// false sinon. Met a jour la classe .champ-invalide et l'affichage du
// message d'erreur correspondant. Utilise pour le keyup / blur.
function valider_champ(id_champ, id_erreur) {
    var champ = $("#" + id_champ);
    var valeur = champ.val();
    if (typeof valeur === "string") {
        valeur = valeur.replace(/^\s+|\s+$/g, "");
    } else {
        valeur = "";
    }
    if (valeur.length === 0) {
        champ.addClass("champ-invalide");
        $("#" + id_erreur).removeAttr("hidden");
        return false;
    }
    champ.removeClass("champ-invalide");
    $("#" + id_erreur).attr("hidden", "hidden");
    return true;
}

// ── Validation complete du formulaire (au submit) ────────────
// Renvoie true si tout est valide, false sinon. Affiche le recap des
// erreurs en pied de formulaire si necessaire (pattern impose).
function valider_formulaire_ajout_question() {
    var question_ok = valider_champ(ID_CHAMP_QUESTION, ID_ERREUR_QUESTION);
    var reponse_ok = valider_champ(ID_CHAMP_REPONSE, ID_ERREUR_REPONSE);

    var liste_erreurs = $("#" + ID_LISTE_ERREURS);
    liste_erreurs.empty();
    var erreurs = [];
    if (!question_ok) {
        erreurs.push("La question est obligatoire.");
    }
    if (!reponse_ok) {
        erreurs.push("La reponse est obligatoire.");
    }
    if (erreurs.length === 0) {
        $("#" + ID_RECAP).attr("hidden", "hidden");
        return true;
    }
    var i;
    for (i = 0; i < erreurs.length; i = i + 1) {
        liste_erreurs.append($("<li></li>").text(erreurs[i]));
    }
    $("#" + ID_RECAP).removeAttr("hidden");
    return false;
}

// ── Recuperation de la difficulte selectionnee ───────────────
function difficulte_selectionnee() {
    var bouton_actif = $("#" + ID_FORM + " .badge-diff.active").first();
    var difficulte = bouton_actif.attr("data-difficulte");
    if (typeof difficulte !== "string") {
        return "facile";
    }
    return difficulte;
}

// ── Mise a jour du compteur de questions affiche dans la vue ─
function mettre_a_jour_compteur_questions() {
    var nombre = $("#questions-liste .question-item").length;
    $("#nb-questions").text(nombre);
    $("#apercu-count").text(nombre);
}

// ── Construction d'un element question a inserer dans la liste ─
// Genere le meme markup que les questions statiques de FRONT-2.1 :
// numero + corps (titre + apercu reponse + selecteur difficulte) +
// bouton de suppression. Utilise .text() systematiquement pour eviter
// toute injection HTML/JS si le contenu vient un jour du serveur.
function construire_element_question(numero, contenu_question, contenu_reponse, difficulte) {
    var id_local = compteur_nouvelles_questions;
    compteur_nouvelles_questions = compteur_nouvelles_questions + 1;

    var item = $("<article></article>").addClass("question-item");
    item.attr("data-id-question", id_local);

    item.append($("<span></span>").addClass("question-numero").text(numero).attr("aria-label", "Question " + numero));

    var corps = $("<div></div>").addClass("question-corps");
    corps.append($("<p></p>").addClass("question-titre").text(contenu_question));
    corps.append($("<p></p>").addClass("question-reponse-preview").text(contenu_reponse));

    var difficulte_row = $("<div></div>").addClass("question-difficulte").attr("role", "radiogroup").attr("aria-label", "Difficulte de la question " + numero);

    var niveaux = ["facile", "moyen", "difficile"];
    var libelles = ["Facile", "Moyen", "Difficile"];
    var j;
    for (j = 0; j < niveaux.length; j = j + 1) {
        var bouton = $("<button></button>")
            .attr("type", "button")
            .addClass("badge-diff badge-diff-" + niveaux[j])
            .attr("role", "radio")
            .text(libelles[j]);
        if (niveaux[j] === difficulte) {
            bouton.addClass("active").attr("aria-checked", "true");
        } else {
            bouton.attr("aria-checked", "false");
        }
        difficulte_row.append(bouton);
    }
    corps.append(difficulte_row);
    item.append(corps);

    var bouton_supprimer = $("<button></button>")
        .attr("type", "button")
        .addClass("btn-supprimer-question")
        .attr("aria-label", "Supprimer la question " + numero);
    // Icone croix construite element par element (pas de .html() avec un
    // gros literal a interpreter).
    var svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    bouton_supprimer.html(svg);
    item.append(bouton_supprimer);

    return item;
}

// ── Initialisation au chargement du DOM ───────────────────────
$(function () {

    // Ouverture de la modale au clic sur "+ Ajouter une question".
    $("#btn-ajouter-question").on("click", function () {
        ouvrir_modale_ajout_question();
    });

    // Fermeture de la modale : croix, bouton Annuler, ou clic en dehors
    // de la boite (sur l'overlay).
    $("#btn-fermer-modale-ajout").on("click", function () {
        fermer_modale_ajout_question();
    });
    $("#btn-annuler-ajout-question").on("click", function () {
        fermer_modale_ajout_question();
    });
    $("#" + ID_MODALE).on("click", function (evenement) {
        // Le clic sur l'overlay (et non sur la boite) ferme la modale.
        if (evenement.target === this) {
            fermer_modale_ajout_question();
        }
    });

    // Validation dynamique : champ vire au rouge des le keyup / blur
    // (CLAUDE.md §6).
    $("#" + ID_CHAMP_QUESTION).on("keyup blur", function () {
        valider_champ(ID_CHAMP_QUESTION, ID_ERREUR_QUESTION);
    });
    $("#" + ID_CHAMP_REPONSE).on("keyup blur", function () {
        valider_champ(ID_CHAMP_REPONSE, ID_ERREUR_REPONSE);
    });

    // Selecteur de difficulte (radio visuel) dans la modale.
    $("#" + ID_FORM + " .badge-diff").on("click", function () {
        $("#" + ID_FORM + " .badge-diff").removeClass("active").attr("aria-checked", "false");
        $(this).addClass("active").attr("aria-checked", "true");
    });

    // Soumission du formulaire : validation complete, ajout dans la
    // liste si tout est OK, fermeture de la modale.
    $("#" + ID_FORM).on("submit", function (evenement) {
        evenement.preventDefault();
        var formulaire_ok = valider_formulaire_ajout_question();
        if (!formulaire_ok) {
            return;
        }
        var question = $("#" + ID_CHAMP_QUESTION).val().replace(/^\s+|\s+$/g, "");
        var reponse = $("#" + ID_CHAMP_REPONSE).val().replace(/^\s+|\s+$/g, "");
        var difficulte = difficulte_selectionnee();
        var numero = $("#questions-liste .question-item").length + 1;
        var nouvel_element = construire_element_question(numero, question, reponse, difficulte);
        $("#questions-liste").append(nouvel_element);
        mettre_a_jour_compteur_questions();
        fermer_modale_ajout_question();
    });

});
