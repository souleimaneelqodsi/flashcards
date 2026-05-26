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

// Etat de la modale : "ajout" pour creer une nouvelle question, "edition"
// pour modifier une question existante. En mode "edition" on conserve
// l'ID de la question en cours d'edition pour pouvoir la mettre a jour
// dans le DOM apres validation.
var modale_mode = "ajout";
var modale_id_question_courante = null;

// Identifiant de la question dont on attend la confirmation de
// suppression (cible de la modale #modale-confirmation-suppression).
var id_question_a_supprimer = null;

// ── Etat du paquet en cours d'edition (PAQ-2.2) ────────────────
// "creation" pour POST /api/paquets, "edition" pour PUT /api/paquets/:id.
// L'id n'est renseigne qu'en mode edition. Reinitialise a chaque entree
// dans la vue par afficher_edition_paquet() (appele par le router).
var paquet_mode = "creation";
var paquet_id_courant = null;

// ── Selection visuelle d'une difficulte dans la modale ────────
function selectionner_difficulte_modale(niveau) {
    $("#" + ID_FORM + " .badge-diff").removeClass("active").attr("aria-checked", "false");
    $("#" + ID_FORM + " .badge-diff[data-difficulte='" + niveau + "']")
        .addClass("active")
        .attr("aria-checked", "true");
}

// ── Reset commun a chaque ouverture de la modale ──────────────
function reinitialiser_modale() {
    $("#" + ID_CHAMP_QUESTION).val("");
    $("#" + ID_CHAMP_REPONSE).val("");
    $("#" + ID_CHAMP_QUESTION).removeClass("champ-invalide");
    $("#" + ID_CHAMP_REPONSE).removeClass("champ-invalide");
    $("#" + ID_ERREUR_QUESTION).attr("hidden", "hidden");
    $("#" + ID_ERREUR_REPONSE).attr("hidden", "hidden");
    $("#" + ID_RECAP).attr("hidden", "hidden");
    $("#" + ID_LISTE_ERREURS).empty();
    selectionner_difficulte_modale("facile");
}

// ── Ouvre la modale en mode AJOUT ─────────────────────────────
function ouvrir_modale_ajout_question() {
    modale_mode = "ajout";
    modale_id_question_courante = null;
    reinitialiser_modale();
    $("#titre-modale-ajout-question").text("Ajouter une question");
    $("#btn-valider-ajout-question").text("Ajouter la question");
    $("#" + ID_MODALE).removeAttr("hidden");
    $("#" + ID_CHAMP_QUESTION).focus();
}

// ── Ouvre la modale en mode EDITION pour une question existante ─
// Pre-remplit les champs avec les valeurs actuelles de la question
// ciblee (titre, apercu reponse, difficulte active).
function ouvrir_modale_edition_question(element_question) {
    modale_mode = "edition";
    modale_id_question_courante = element_question.attr("data-id-question");
    reinitialiser_modale();

    var contenu_question = element_question.find(".question-titre").text();
    var contenu_reponse = element_question.find(".question-reponse-preview").text();
    var difficulte_active = element_question.find(".badge-diff.active").eq(0);
    var difficulte = "facile";
    if (difficulte_active.length > 0) {
        var attr_difficulte = difficulte_active.attr("data-difficulte");
        if (attr_difficulte === "facile" || attr_difficulte === "moyen" || attr_difficulte === "difficile") {
            difficulte = attr_difficulte;
        }
    }

    $("#" + ID_CHAMP_QUESTION).val(contenu_question);
    $("#" + ID_CHAMP_REPONSE).val(contenu_reponse);
    selectionner_difficulte_modale(difficulte);

    $("#titre-modale-ajout-question").text("Modifier la question");
    $("#btn-valider-ajout-question").text("Mettre a jour");
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
    var bouton_actif = $("#" + ID_FORM + " .badge-diff.active").eq(0);
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

// ── Met a jour le DOM d'une question existante (mode edition) ─
// Modifie en place les champs visibles (titre, apercu reponse,
// selecteur de difficulte) sans recreer l'element.
function mettre_a_jour_question_existante(id_question, contenu_question, contenu_reponse, difficulte) {
    var element = $("#questions-liste .question-item[data-id-question='" + id_question + "']");
    if (element.length === 0) {
        return;
    }
    element.find(".question-titre").text(contenu_question);
    element.find(".question-reponse-preview").text(contenu_reponse);

    var boutons = element.find(".badge-diff");
    boutons.removeClass("active").attr("aria-checked", "false");

    // Selection par classe CSS uniquement : toutes les questions (statiques
    // de FRONT-2.1 et dynamiques de FRONT-2.2) portent maintenant la classe
    // .badge-diff-<niveau>, donc plus besoin de fallback.
    element.find(".badge-diff-" + difficulte).addClass("active").attr("aria-checked", "true");
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

    item.append($("<span></span>").addClass("question-numero").text(numero));

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
            .attr("data-difficulte", niveaux[j])
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

// ── Validation dynamique du titre du paquet (FRONT-2.5) ──────
// Le titre est requis (cf. mockup new_bag.png : "TITRE *") et limite
// a 150 caracteres (CLAUDE.md §6). Cette fonction met aussi a jour le
// compteur de caracteres affiche sous le champ et bascule la classe
// .champ-invalide selon le contenu.
function valider_titre_paquet() {
    var champ = $("#paquet-titre");
    var valeur = champ.val();
    if (typeof valeur !== "string") {
        valeur = "";
    }
    var valeur_nettoyee = valeur.replace(/^\s+|\s+$/g, "");
    var longueur = valeur.length;
    $("#paquet-titre-counter").text(longueur);

    if (valeur_nettoyee.length === 0 || longueur > 150) {
        champ.addClass("champ-invalide");
        $("#erreur-paquet-titre").removeAttr("hidden");
        return false;
    }
    champ.removeClass("champ-invalide");
    $("#erreur-paquet-titre").attr("hidden", "hidden");
    return true;
}

// ── Synchronisation de la carte d'apercu (FRONT-2.5) ──────────
// La preview violette (titre + theme + nombre de cartes) reflete en
// temps reel ce que l'utilisateur saisit. .text() est utilise pour
// echapper le contenu (protection XSS).
function synchroniser_apercu() {
    var titre = $("#paquet-titre").val();
    var theme = $("#paquet-theme").val();
    if (typeof titre !== "string" || titre.replace(/^\s+|\s+$/g, "").length === 0) {
        titre = "Sans titre";
    }
    if (typeof theme !== "string" || theme.replace(/^\s+|\s+$/g, "").length === 0) {
        theme = "";
    }
    $("#apercu-titre").text(titre);
    $("#apercu-theme").text(theme);
}

// ── Branchement API (PAQ-2.2) ────────────────────────────────
// Detecte le mode courant en lisant window.location.hash :
//   #nouveau-paquet         -> mode "creation" (POST /api/paquets).
//   #edit-paquet-<id>       -> mode "edition" (PUT /api/paquets/:id).
// Conserve l'id du paquet en cours d'edition pour le PUT et pour la
// redirection vers la vue de visualisation apres succes.
function detecter_mode_edition() {
    var hash = window.location.hash;
    var prefixe_edition = "#edit-paquet-";
    if (hash.indexOf(prefixe_edition) === 0) {
        var suffixe = hash.substring(prefixe_edition.length);
        if (suffixe.match(/^[0-9]+$/)) {
            paquet_mode = "edition";
            paquet_id_courant = parseInt(suffixe, 10);
            return;
        }
    }
    paquet_mode = "creation";
    paquet_id_courant = null;
}

// Remet le formulaire a vide : utilise a l'entree en mode creation pour
// effacer les valeurs initiales statiques de app.php (titre stub, theme
// stub) qui ne servaient qu'a illustrer le rendu du mockup.
function reinitialiser_form_paquet() {
    $("#paquet-titre").val("").removeClass("champ-invalide");
    $("#paquet-theme").val("");
    $("#erreur-paquet-titre").attr("hidden", "hidden");
    $("#recap-erreurs-paquet").attr("hidden", "hidden");
    $("#liste-erreurs-paquet").empty();
    $("#paquet-titre-counter").text("0");
    synchroniser_apercu();
}

// Mode edition : recupere le paquet depuis l'API et pre-remplit le
// formulaire. En cas d'erreur (paquet inexistant, acces refuse), on
// affiche un toast et on bascule vers le dashboard.
function charger_paquet_pour_edition(id_paquet) {
    AjaxService.get("paquets/" + id_paquet, undefined, {
        succes: function (reponse) {
            // Reponse VIEW-1.2 : { paquet, proprietaire, destinataires, est_proprietaire }
            if (!reponse || !reponse.paquet) {
                rediriger_apres_erreur("Paquet introuvable.");
                return;
            }
            if (reponse.est_proprietaire !== true) {
                rediriger_apres_erreur("Vous n'etes pas proprietaire de ce paquet.");
                return;
            }
            var paquet = reponse.paquet;
            $("#paquet-titre").val(paquet.titre || "");
            $("#paquet-theme").val(paquet.theme || "");
            $("#paquet-titre-counter").text((paquet.titre || "").length);
            $("#titre-edition-paquet").text("Editer un paquet");
            synchroniser_apercu();
            valider_titre_paquet();
        },
        erreur: function (xhr, message) {
            rediriger_apres_erreur(message);
        }
    });
}

function rediriger_apres_erreur(message) {
    if (window.Toast && typeof window.Toast.afficher === "function") {
        window.Toast.afficher(message, "erreur");
    }
    window.location.hash = "#dashboard";
}

// Point d'entree appele par le router au changement de hash. Configure
// la vue selon le mode courant. Expose en global pour app.js.
function afficher_edition_paquet() {
    detecter_mode_edition();
    if (paquet_mode === "creation") {
        $("#titre-edition-paquet").text("Nouveau paquet");
        reinitialiser_form_paquet();
    } else {
        // Mode edition : reset puis fetch + populate.
        reinitialiser_form_paquet();
        $("#titre-edition-paquet").text("Chargement...");
        charger_paquet_pour_edition(paquet_id_courant);
    }
}
window.afficher_edition_paquet = afficher_edition_paquet;

// Affiche un tableau d'erreurs dans le recap pied de formulaire.
function afficher_erreurs_form(messages) {
    var liste = $("#liste-erreurs-paquet");
    liste.empty();
    var i;
    for (i = 0; i < messages.length; i = i + 1) {
        liste.append($("<li></li>").text(messages[i]));
    }
    if (messages.length > 0) {
        $("#recap-erreurs-paquet").removeAttr("hidden");
    } else {
        $("#recap-erreurs-paquet").attr("hidden", "hidden");
    }
}

// Marque visuellement un champ comme invalide (pattern impose CLAUDE.md
// §6 : .champ-invalide + message visible). On cible titre et theme.
function marquer_champ_invalide(id_champ, id_message, texte) {
    $("#" + id_champ).addClass("champ-invalide");
    if (id_message) {
        $("#" + id_message).text(texte).removeAttr("hidden");
    }
}

// Envoie le formulaire vers l'API selon le mode courant.
function enregistrer_paquet() {
    // Validation cliente : titre obligatoire <= 150 (FRONT-2.5).
    var titre_ok = valider_titre_paquet();
    if (!titre_ok) {
        afficher_erreurs_form(["Le titre est obligatoire (150 caracteres maximum)."]);
        $("#paquet-titre").focus();
        return;
    }
    afficher_erreurs_form([]);

    var titre = $("#paquet-titre").val().replace(/^\s+|\s+$/g, "");
    var theme = $("#paquet-theme").val();
    if (typeof theme !== "string") {
        theme = "";
    }
    theme = theme.replace(/^\s+|\s+$/g, "");

    var payload = { titre: titre, theme: theme };

    // Le mode est lu une derniere fois pour eviter un decalage si le hash
    // a change entre l'entree dans la vue et le clic sur Enregistrer.
    detecter_mode_edition();

    if (paquet_mode === "edition") {
        envoyer_put(payload);
    } else {
        envoyer_post(payload);
    }
}

function envoyer_post(payload) {
    AjaxService.post("paquets", payload, {
        succes: function (reponse) {
            apres_succes(reponse, "Paquet cree.");
        },
        erreur: function (xhr, message) {
            traiter_erreur_form(xhr, message);
        }
    });
}

function envoyer_put(payload) {
    if (paquet_id_courant === null) {
        afficher_erreurs_form(["Identifiant de paquet manquant."]);
        return;
    }
    AjaxService.put("paquets/" + paquet_id_courant, payload, {
        succes: function (reponse) {
            apres_succes(reponse, "Paquet mis a jour.");
        },
        erreur: function (xhr, message) {
            traiter_erreur_form(xhr, message);
        }
    });
}

// Succes : toast + redirection vers la vue de visualisation du paquet.
function apres_succes(reponse, message_succes) {
    if (window.Toast && typeof window.Toast.afficher === "function") {
        window.Toast.afficher(message_succes, "succes");
    }
    var id_cible = paquet_id_courant;
    if (reponse && reponse.paquet && reponse.paquet.id_paquet) {
        id_cible = reponse.paquet.id_paquet;
    }
    if (id_cible !== null && id_cible !== undefined) {
        window.location.hash = "#visualisation-paquet-" + id_cible;
    } else {
        window.location.hash = "#dashboard";
    }
}

// Erreur API : decode les erreurs serveur si format { erreurs: {champ: msg}}
// (cas validation 400 - PAQ-1.5) et les affiche sur les champs + recap.
function traiter_erreur_form(xhr, message_par_defaut) {
    // Reset visuel des champs.
    $("#paquet-titre").removeClass("champ-invalide");
    $("#erreur-paquet-titre").attr("hidden", "hidden");

    var messages = [];

    if (xhr.responseJSON && typeof xhr.responseJSON === "object") {
        var corps = xhr.responseJSON;
        if (corps.erreurs && typeof corps.erreurs === "object") {
            if (corps.erreurs.titre) {
                marquer_champ_invalide("paquet-titre", "erreur-paquet-titre", corps.erreurs.titre);
                messages.push(corps.erreurs.titre);
            }
            if (corps.erreurs.theme) {
                $("#paquet-theme").addClass("champ-invalide");
                messages.push(corps.erreurs.theme);
            }
        } else if (typeof corps.erreur === "string") {
            messages.push(corps.erreur);
        }
    }

    if (messages.length === 0) {
        messages.push(message_par_defaut);
    }

    afficher_erreurs_form(messages);
}

// ── Initialisation au chargement du DOM ───────────────────────
$(function () {

    // Validation dynamique du titre du paquet et mise a jour du compteur
    // et de l'apercu en temps reel (FRONT-2.5).
    $("#paquet-titre").on("keyup blur", function () {
        valider_titre_paquet();
        synchroniser_apercu();
    });
    $("#paquet-theme").on("keyup blur", function () {
        synchroniser_apercu();
    });

    // Clic sur "Enregistrer le paquet" (PAQ-2.2). Selon le mode courant
    // (creation vs edition), envoie POST ou PUT vers l'API. La validation
    // dynamique du titre (FRONT-2.5) reste le pre-filtre cote client ;
    // les eventuelles erreurs serveur (longueur, autre regle metier)
    // sont affichees dans le meme recap-erreurs-paquet.
    $("#btn-enregistrer-paquet").on("click", function () {
        enregistrer_paquet();
    });

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

    // Soumission du formulaire : selon le mode (ajout vs edition),
    // soit on ajoute une nouvelle question, soit on met a jour celle
    // qui est en cours d'edition.
    $("#" + ID_FORM).on("submit", function (evenement) {
        evenement.preventDefault();
        var formulaire_ok = valider_formulaire_ajout_question();
        if (!formulaire_ok) {
            return;
        }
        var question = $("#" + ID_CHAMP_QUESTION).val().replace(/^\s+|\s+$/g, "");
        var reponse = $("#" + ID_CHAMP_REPONSE).val().replace(/^\s+|\s+$/g, "");
        var difficulte = difficulte_selectionnee();

        if (modale_mode === "edition" && modale_id_question_courante !== null) {
            mettre_a_jour_question_existante(modale_id_question_courante, question, reponse, difficulte);
        } else {
            var numero = $("#questions-liste .question-item").length + 1;
            var nouvel_element = construire_element_question(numero, question, reponse, difficulte);
            $("#questions-liste").append(nouvel_element);
            mettre_a_jour_compteur_questions();
        }

        fermer_modale_ajout_question();
    });

    // ── Edition inline (FRONT-2.3) ──
    // Clic sur une question existante (n'importe ou sauf croix et badges) :
    // ouvre la modale en mode edition. La delegation par '#questions-liste'
    // s'applique aussi aux questions ajoutees dynamiquement.
    $("#questions-liste").on("click", ".question-item", function () {
        ouvrir_modale_edition_question($(this));
    });

    // Les badges de difficulte dans la liste agissent comme un toggle
    // inline (changement direct de la difficulte sans ouvrir la modale).
    // stopPropagation empeche d'ouvrir la modale d'edition par accident.
    $("#questions-liste").on("click", ".question-difficulte .badge-diff", function (evenement) {
        evenement.stopPropagation();
        // Le badge-diff est enfant direct de .question-difficulte ;
        // .parent() suffit (cf. CLAUDE.md §2 bis - perimetre courant).
        var groupe = $(this).parent();
        groupe.find(".badge-diff").removeClass("active").attr("aria-checked", "false");
        $(this).addClass("active").attr("aria-checked", "true");
    });

    // ── Suppression d'une question (FRONT-2.4) ──
    // Clic sur la croix : on memorise l'ID et on ouvre la modale de
    // confirmation. stopPropagation empeche l'ouverture parallele de la
    // modale d'edition.
    $("#questions-liste").on("click", ".btn-supprimer-question", function (evenement) {
        evenement.stopPropagation();
        var item = $(this).parent();
        id_question_a_supprimer = item.attr("data-id-question");
        $("#modale-confirmation-suppression").removeAttr("hidden");
    });

    function fermer_modale_suppression() {
        $("#modale-confirmation-suppression").attr("hidden", "hidden");
        id_question_a_supprimer = null;
    }

    $("#btn-fermer-modale-suppression").on("click", function () {
        fermer_modale_suppression();
    });
    $("#btn-annuler-suppression").on("click", function () {
        fermer_modale_suppression();
    });
    $("#modale-confirmation-suppression").on("click", function (evenement) {
        if (evenement.target === this) {
            fermer_modale_suppression();
        }
    });

    // Confirmation : retire la question du DOM, met a jour le compteur,
    // re-numerote les questions restantes pour conserver la sequence
    // 1, 2, 3, ... visible dans le mockup.
    $("#btn-confirmer-suppression").on("click", function () {
        if (id_question_a_supprimer === null) {
            fermer_modale_suppression();
            return;
        }
        $("#questions-liste .question-item[data-id-question='" + id_question_a_supprimer + "']").remove();
        // Renumerotation visuelle des questions restantes.
        $("#questions-liste .question-item").each(function (index) {
            var nouveau_numero = index + 1;
            $(this).find(".question-numero")
                .text(nouveau_numero)
                .attr("aria-label", "Question " + nouveau_numero);
            $(this).find(".btn-supprimer-question")
                .attr("aria-label", "Supprimer la question " + nouveau_numero);
            $(this).find(".question-difficulte")
                .attr("aria-label", "Difficulte de la question " + nouveau_numero);
        });
        mettre_a_jour_compteur_questions();
        fermer_modale_suppression();
    });

});
