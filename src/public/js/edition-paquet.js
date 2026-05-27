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

// ── Tampon de questions en mode CREATION (conforme new_bag.png) ─
// En creation, le paquet n'a pas encore d'id_paquet : on ne peut donc
// pas appeler POST /api/paquets/:id/questions tout de suite. On memorise
// les questions saisies dans ce tampon (et on les affiche dans la liste),
// puis a l'enregistrement on cree le paquet PUIS chaque question. Chaque
// entree : { id_local, contenu_question, contenu_reponse, id_difficulte }.
// id_local est l'identifiant DOM temporaire (data-id-question) qui sert a
// retrouver / modifier / supprimer la question dans le tampon avant envoi.
// En mode EDITION, ce tampon n'est pas utilise (les questions vont
// directement a l'API).
var questions_buffer = [];

// ── Mapping difficulte (QST-1.6) ───────────────────────────────
// Cote front, la difficulte est manipulee comme une chaine
// ("facile"/"moyen"/"difficile") pour piloter les classes CSS et
// l'aria-checked. Cote serveur, c'est un entier (FK vers la table
// referentiel `difficultes` seedee Facile/Moyen/Difficile par
// install.php, dans cet ordre - donc 1/2/3).
function niveau_vers_id_difficulte(niveau) {
    if (niveau === "facile") {
        return 1;
    }
    if (niveau === "moyen") {
        return 2;
    }
    if (niveau === "difficile") {
        return 3;
    }
    return 1;
}

function id_difficulte_vers_niveau(id_difficulte) {
    if (id_difficulte === 2) {
        return "moyen";
    }
    if (id_difficulte === 3) {
        return "difficile";
    }
    return "facile";
}

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

// ── Branchement API des questions (QST-1.6) ──────────────────

// POST /api/paquets/:id/questions : creation d'une nouvelle question
// pour le paquet en cours d'edition. Sur succes, insere la question
// dans le DOM avec l'id_question reel renvoye par l'API. Sur erreur,
// affiche les erreurs dans le recap-erreurs-question.
function envoyer_post_question(contenu_question, contenu_reponse, niveau, id_difficulte) {
    // Mode CREATION : le paquet n'existe pas encore -> on bufferise la
    // question (elle sera envoyee a l'enregistrement du paquet).
    if (paquet_mode !== "edition" || paquet_id_courant === null) {
        ajouter_question_buffer(contenu_question, contenu_reponse, niveau, id_difficulte);
        return;
    }
    var payload = {
        contenu_question: contenu_question,
        contenu_reponse:  contenu_reponse,
        id_difficulte:    id_difficulte
    };
    AjaxService.post(
        "paquets/" + paquet_id_courant + "/questions",
        payload,
        {
            succes: function (reponse) {
                var question = (reponse && reponse.question) ? reponse.question : null;
                if (question === null) {
                    afficher_erreurs_question(["Reponse serveur invalide."]);
                    return;
                }
                ajouter_question_au_dom(question, niveau);
                fermer_modale_ajout_question();
                if (window.Toast && typeof window.Toast.succes === "function") {
                    window.Toast.succes("Question ajoutee.");
                }
            },
            erreur: function (xhr, message) {
                traiter_erreur_question(xhr, message);
            }
        }
    );
}

// PUT /api/questions/:id : edition d'une question existante. Sur
// succes, met a jour le DOM avec les nouvelles valeurs. Sur erreur,
// affiche dans le recap-erreurs-question.
function envoyer_put_question(contenu_question, contenu_reponse, niveau, id_difficulte) {
    var id_question = modale_id_question_courante;
    if (id_question === null) {
        afficher_erreurs_question(["Identifiant de question manquant."]);
        return;
    }
    // Mode CREATION : la question editee n'est qu'en tampon (pas en base)
    // -> on met a jour le tampon et le DOM, sans appel API.
    if (paquet_mode !== "edition" || paquet_id_courant === null) {
        modifier_question_buffer(id_question, contenu_question, contenu_reponse, niveau, id_difficulte);
        return;
    }
    var payload = {
        contenu_question: contenu_question,
        contenu_reponse:  contenu_reponse,
        id_difficulte:    id_difficulte
    };
    AjaxService.put(
        "questions/" + id_question,
        payload,
        {
            succes: function () {
                mettre_a_jour_question_existante(
                    id_question, contenu_question, contenu_reponse, niveau
                );
                fermer_modale_ajout_question();
                if (window.Toast && typeof window.Toast.succes === "function") {
                    window.Toast.succes("Question mise a jour.");
                }
            },
            erreur: function (xhr, message) {
                traiter_erreur_question(xhr, message);
            }
        }
    );
}

// DELETE /api/questions/:id : suppression d'une question. Sur succes,
// retire l'element du DOM, renumerote les questions restantes, met a
// jour le compteur. Sur erreur, toast d'erreur (la modale de
// confirmation est deja fermee, on n'a pas de recap a alimenter).
function envoyer_delete_question(id_question, element_question) {
    // Mode CREATION : question seulement en tampon -> suppression locale.
    if (paquet_mode !== "edition" || paquet_id_courant === null) {
        supprimer_question_buffer(id_question, element_question);
        return;
    }
    AjaxService.supprimer("questions/" + id_question, {
        succes: function () {
            element_question.remove();
            renumeroter_questions();
            mettre_a_jour_compteur_questions();
            if (window.Toast && typeof window.Toast.succes === "function") {
                window.Toast.succes("Question supprimee.");
            }
        },
        erreur: function (xhr, message) {
            if (window.Toast && typeof window.Toast.erreur === "function") {
                window.Toast.erreur(
                    "Impossible de supprimer la question : " + message
                );
            }
        }
    });
}

// Ajoute une question (renvoyee par l'API) en bas de la liste, avec
// son id_question reel et le numero sequentiel suivant. Met a jour le
// compteur. Utilise pour le POST en ajout.
function ajouter_question_au_dom(question, niveau) {
    var numero = $("#questions-liste .question-item").length + 1;
    var element = construire_element_question(
        numero,
        question.contenu_question,
        question.contenu_reponse,
        niveau
    );
    element.attr("data-id-question", question.id_question);
    $("#questions-liste").append(element);
    mettre_a_jour_compteur_questions();
}

// ── Tampon de questions (mode CREATION) ───────────────────────
// Ajoute une question au tampon + au DOM (avec son id_local genere par
// construire_element_question). Aucun appel API : l'envoi se fera a
// l'enregistrement du paquet (enregistrer_questions_bufferisees).
function ajouter_question_buffer(contenu_question, contenu_reponse, niveau, id_difficulte) {
    var numero = $("#questions-liste .question-item").length + 1;
    var element = construire_element_question(numero, contenu_question, contenu_reponse, niveau);
    var id_local = element.attr("data-id-question");
    $("#questions-liste").append(element);
    questions_buffer.push({
        id_local:         id_local,
        contenu_question: contenu_question,
        contenu_reponse:  contenu_reponse,
        id_difficulte:    id_difficulte
    });
    mettre_a_jour_compteur_questions();
    fermer_modale_ajout_question();
    if (window.Toast && typeof window.Toast.succes === "function") {
        window.Toast.succes("Question ajoutee.");
    }
}

// Met a jour une question du tampon (et son rendu DOM) en mode CREATION.
function modifier_question_buffer(id_local, contenu_question, contenu_reponse, niveau, id_difficulte) {
    var i;
    for (i = 0; i < questions_buffer.length; i = i + 1) {
        if (questions_buffer[i].id_local === id_local) {
            questions_buffer[i].contenu_question = contenu_question;
            questions_buffer[i].contenu_reponse = contenu_reponse;
            questions_buffer[i].id_difficulte = id_difficulte;
            break;
        }
    }
    mettre_a_jour_question_existante(id_local, contenu_question, contenu_reponse, niveau);
    fermer_modale_ajout_question();
    if (window.Toast && typeof window.Toast.succes === "function") {
        window.Toast.succes("Question mise a jour.");
    }
}

// Retire une question du tampon (et du DOM) en mode CREATION. On
// reconstruit le tableau sans l'element supprime (pas de splice, plus
// lisible). Renumerote ensuite les questions restantes.
function supprimer_question_buffer(id_local, element_question) {
    var nouveau = [];
    var i;
    for (i = 0; i < questions_buffer.length; i = i + 1) {
        if (questions_buffer[i].id_local !== id_local) {
            nouveau.push(questions_buffer[i]);
        }
    }
    questions_buffer = nouveau;
    element_question.remove();
    renumeroter_questions();
    mettre_a_jour_compteur_questions();
    if (window.Toast && typeof window.Toast.succes === "function") {
        window.Toast.succes("Question supprimee.");
    }
}

// Renumerote toutes les questions visibles (apres suppression). Meme
// logique que celle qui etait inline dans le handler de suppression.
function renumeroter_questions() {
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
}

// Affiche un tableau de messages dans le recap-erreurs-question
// (pattern impose CLAUDE.md §6 : recap rouge en pied de modale).
function afficher_erreurs_question(messages) {
    var liste = $("#" + ID_LISTE_ERREURS);
    liste.empty();
    var i;
    for (i = 0; i < messages.length; i = i + 1) {
        liste.append($("<li></li>").text(messages[i]));
    }
    if (messages.length > 0) {
        $("#" + ID_RECAP).removeAttr("hidden");
    } else {
        $("#" + ID_RECAP).attr("hidden", "hidden");
    }
}

// Signale une erreur technique (reseau, CSRF, serveur) via un toast.
// A distinguer des erreurs de validation de champ qui, elles, vont dans
// le recap du formulaire (pattern impose CLAUDE.md §6). Une erreur
// d'infrastructure n'est pas une faute de saisie : l'afficher dans le
// recap "corrigez les erreurs" induit l'utilisateur en erreur.
function signaler_erreur_technique(message) {
    if (window.Toast && typeof window.Toast.erreur === "function") {
        window.Toast.erreur(message);
    }
}

// Decode les erreurs serveur de la modale question. Deux cas distincts :
//  - validation par champ (400, format { erreurs: {champ: msg} }) :
//    champs en rouge + recap de la modale ;
//  - erreur technique (reseau, CSRF, 500) : pas de recap (ce n'est pas
//    une faute de saisie) mais un toast dedie.
function traiter_erreur_question(xhr, message_par_defaut) {
    // Reset visuel des champs.
    $("#" + ID_CHAMP_QUESTION).removeClass("champ-invalide");
    $("#" + ID_CHAMP_REPONSE).removeClass("champ-invalide");
    $("#" + ID_ERREUR_QUESTION).attr("hidden", "hidden");
    $("#" + ID_ERREUR_REPONSE).attr("hidden", "hidden");

    var corps = null;
    if (xhr.responseJSON && typeof xhr.responseJSON === "object") {
        corps = xhr.responseJSON;
    }

    // Cas 1 : erreurs de validation par champ.
    if (corps !== null && corps.erreurs && typeof corps.erreurs === "object") {
        var messages = [];
        if (corps.erreurs.contenu_question) {
            $("#" + ID_CHAMP_QUESTION).addClass("champ-invalide");
            $("#" + ID_ERREUR_QUESTION)
                .text(corps.erreurs.contenu_question)
                .removeAttr("hidden");
            messages.push(corps.erreurs.contenu_question);
        }
        if (corps.erreurs.contenu_reponse) {
            $("#" + ID_CHAMP_REPONSE).addClass("champ-invalide");
            $("#" + ID_ERREUR_REPONSE)
                .text(corps.erreurs.contenu_reponse)
                .removeAttr("hidden");
            messages.push(corps.erreurs.contenu_reponse);
        }
        if (corps.erreurs.id_difficulte) {
            messages.push(corps.erreurs.id_difficulte);
        }
        afficher_erreurs_question(messages);
        return;
    }

    // Cas 2 : erreur technique -> toast, pas de recap de validation.
    afficher_erreurs_question([]);
    var message = message_par_defaut;
    if (corps !== null && typeof corps.erreur === "string") {
        message = corps.erreur;
    }
    signaler_erreur_technique("Impossible d'enregistrer la question : " + message);
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
// affiche un toast et on bascule vers le dashboard. Apres avoir charge
// le paquet, on enchaine sur le chargement des questions associees
// (QST-1.6).
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
            // Enchaine sur le chargement des questions (QST-1.6).
            charger_questions_du_paquet(id_paquet);
        },
        erreur: function (xhr, message) {
            rediriger_apres_erreur(message);
        }
    });
}

// Mode edition : charge les questions du paquet via GET (QST-1.4) et
// les rend dans #questions-liste. Reutilise construire_element_question
// pour garantir une mise en forme identique aux ajouts en cours de
// session. Appele apres le chargement du paquet, depuis
// charger_paquet_pour_edition.
function charger_questions_du_paquet(id_paquet) {
    $("#questions-liste").empty();
    AjaxService.get("paquets/" + id_paquet + "/questions", undefined, {
        succes: function (reponse) {
            var questions = (reponse && reponse.questions) ? reponse.questions : [];
            rendre_questions(questions);
            mettre_a_jour_compteur_questions();
        },
        erreur: function (xhr, message) {
            if (window.Toast && typeof window.Toast.erreur === "function") {
                window.Toast.erreur(
                    "Impossible de charger les questions : " + message
                );
            }
        }
    });
}

// Rendu d'une liste de questions API dans #questions-liste. Chaque
// question est convertie au format DOM par construire_element_question.
// Le champ data-id-question recoit l'id_question reel renvoye par
// l'API (pas le compteur local), de maniere a pouvoir cibler
// l'endpoint PUT/DELETE plus tard.
function rendre_questions(questions) {
    var liste = $("#questions-liste");
    var i;
    for (i = 0; i < questions.length; i = i + 1) {
        var q = questions[i];
        var niveau = id_difficulte_vers_niveau(q.id_difficulte);
        var numero = i + 1;
        var element = construire_element_question(
            numero,
            q.contenu_question,
            q.contenu_reponse,
            niveau
        );
        // Remplace l'id local genere par l'id_question reel (BD).
        element.attr("data-id-question", q.id_question);
        liste.append(element);
    }
}

// Le bouton "Ajouter une question" est actif dans les deux modes
// (conforme a new_bag.png qui montre l'ajout de questions des l'ecran de
// creation) :
//  - edition  : la question est envoyee a l'API immediatement ;
//  - creation : la question est mise en tampon et envoyee a
//    l'enregistrement du paquet (enregistrer_questions_bufferisees).
function appliquer_etat_creation_ou_edition() {
    var bouton_ajouter = $("#btn-ajouter-question");
    bouton_ajouter.prop("disabled", false);
    bouton_ajouter.removeAttr("title");
}

function rediriger_apres_erreur(message) {
    if (window.Toast && typeof window.Toast.erreur === "function") {
        window.Toast.erreur(message);
    }
    window.location.hash = "#dashboard";
}

// Point d'entree appele par le router au changement de hash. Configure
// la vue selon le mode courant. Expose en global pour app.js.
function afficher_edition_paquet() {
    detecter_mode_edition();
    // Vide la liste de questions a chaque entree pour eviter d'afficher
    // les questions d'un paquet precedemment visite, et repart d'un
    // tampon vide (mode creation).
    $("#questions-liste").empty();
    questions_buffer = [];
    mettre_a_jour_compteur_questions();
    appliquer_etat_creation_ou_edition();
    if (paquet_mode === "creation") {
        $("#titre-edition-paquet").text("Nouveau paquet");
        reinitialiser_form_paquet();
    } else {
        // Mode edition : reset puis fetch + populate (paquet + questions).
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
            var id_cree = null;
            if (reponse && reponse.paquet && reponse.paquet.id_paquet) {
                id_cree = reponse.paquet.id_paquet;
            }
            // Des questions ont ete saisies pendant la creation : on les
            // cree maintenant que le paquet possede un id, puis on redirige.
            if (id_cree !== null && questions_buffer.length > 0) {
                enregistrer_questions_bufferisees(id_cree, 0);
            } else {
                apres_succes(reponse, "Paquet cree.");
            }
        },
        erreur: function (xhr, message) {
            traiter_erreur_form(xhr, message);
        }
    });
}

// Envoie en serie les questions du tampon (mode creation) une fois le
// paquet cree. Recursion nommee plutot que callbacks imbriques (CLAUDE.md
// §7bis). A la fin : toast + redirection vers la visualisation du paquet.
// Si une question echoue, le paquet existe deja : on previent et on
// bascule vers l'edition pour permettre de reprendre.
function enregistrer_questions_bufferisees(id_paquet, index) {
    if (index >= questions_buffer.length) {
        if (window.Toast && typeof window.Toast.succes === "function") {
            window.Toast.succes("Paquet et questions enregistres.");
        }
        questions_buffer = [];
        window.location.hash = "#visualisation-paquet-" + id_paquet;
        return;
    }
    var q = questions_buffer[index];
    var payload = {
        contenu_question: q.contenu_question,
        contenu_reponse:  q.contenu_reponse,
        id_difficulte:    q.id_difficulte
    };
    AjaxService.post("paquets/" + id_paquet + "/questions", payload, {
        succes: function () {
            enregistrer_questions_bufferisees(id_paquet, index + 1);
        },
        erreur: function (xhr, message) {
            if (window.Toast && typeof window.Toast.erreur === "function") {
                window.Toast.erreur("Paquet cree, mais une question n'a pas pu etre enregistree : " + message);
            }
            questions_buffer = [];
            window.location.hash = "#edit-paquet-" + id_paquet;
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

// Succes : toast + redirection. En mode CREATION, on bascule vers le
// mode EDITION du nouveau paquet (#edit-paquet-<id>) pour permettre
// d'ajouter immediatement des questions (QST-1.6 a besoin d'un id_paquet
// existant pour POST /api/paquets/:id/questions). En mode EDITION, on
// va sur la vue de visualisation pour voir le resultat.
function apres_succes(reponse, message_succes) {
    if (window.Toast && typeof window.Toast.succes === "function") {
        window.Toast.succes(message_succes);
    }
    var id_cible = paquet_id_courant;
    if (reponse && reponse.paquet && reponse.paquet.id_paquet) {
        id_cible = reponse.paquet.id_paquet;
    }
    if (id_cible === null || id_cible === undefined) {
        window.location.hash = "#dashboard";
        return;
    }
    if (paquet_mode === "creation") {
        window.location.hash = "#edit-paquet-" + id_cible;
    } else {
        window.location.hash = "#visualisation-paquet-" + id_cible;
    }
}

// Erreur API : decode les erreurs serveur si format { erreurs: {champ: msg}}
// (cas validation 400 - PAQ-1.5) et les affiche sur les champs + recap.
function traiter_erreur_form(xhr, message_par_defaut) {
    // Reset visuel des champs.
    $("#paquet-titre").removeClass("champ-invalide");
    $("#erreur-paquet-titre").attr("hidden", "hidden");

    var corps = null;
    if (xhr.responseJSON && typeof xhr.responseJSON === "object") {
        corps = xhr.responseJSON;
    }

    // Cas 1 : erreurs de validation par champ (400 - PAQ-1.5) -> champs
    // rouges + recap de validation (pattern impose CLAUDE.md §6).
    if (corps !== null && corps.erreurs && typeof corps.erreurs === "object") {
        var messages = [];
        if (corps.erreurs.titre) {
            marquer_champ_invalide("paquet-titre", "erreur-paquet-titre", corps.erreurs.titre);
            messages.push(corps.erreurs.titre);
        }
        if (corps.erreurs.theme) {
            $("#paquet-theme").addClass("champ-invalide");
            messages.push(corps.erreurs.theme);
        }
        afficher_erreurs_form(messages);
        return;
    }

    // Cas 2 : erreur technique (reseau, CSRF, serveur) -> on masque le
    // recap de validation (trompeur ici) et on signale via un toast.
    afficher_erreurs_form([]);
    var message = message_par_defaut;
    if (corps !== null && typeof corps.erreur === "string") {
        message = corps.erreur;
    }
    signaler_erreur_technique("Impossible d'enregistrer le paquet : " + message);
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

    // Soumission du formulaire (QST-1.6) : branche sur l'API selon le
    // mode (POST en ajout, PUT en edition). La maj DOM ne se fait
    // qu'apres succes serveur, pour ne jamais afficher une question
    // qui n'existe pas en base. Erreurs serveur affichees dans le
    // recap-erreurs-question (pattern impose CLAUDE.md §6).
    $("#" + ID_FORM).on("submit", function (evenement) {
        evenement.preventDefault();
        var formulaire_ok = valider_formulaire_ajout_question();
        if (!formulaire_ok) {
            return;
        }
        var question_txt = $("#" + ID_CHAMP_QUESTION).val().replace(/^\s+|\s+$/g, "");
        var reponse_txt  = $("#" + ID_CHAMP_REPONSE).val().replace(/^\s+|\s+$/g, "");
        var niveau = difficulte_selectionnee();
        var id_difficulte = niveau_vers_id_difficulte(niveau);

        if (modale_mode === "edition" && modale_id_question_courante !== null) {
            envoyer_put_question(question_txt, reponse_txt, niveau, id_difficulte);
        } else {
            envoyer_post_question(question_txt, reponse_txt, niveau, id_difficulte);
        }
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

    // Confirmation (QST-1.6) : DELETE /api/questions/:id, puis retrait
    // DOM + renumerotation + compteur si succes. On ferme la modale de
    // confirmation tout de suite (le retour utilisateur passera par un
    // toast en cas d'echec ou de succes).
    $("#btn-confirmer-suppression").on("click", function () {
        if (id_question_a_supprimer === null) {
            fermer_modale_suppression();
            return;
        }
        var element = $("#questions-liste .question-item[data-id-question='"
            + id_question_a_supprimer + "']");
        var id = id_question_a_supprimer;
        fermer_modale_suppression();
        envoyer_delete_question(id, element);
    });

});
