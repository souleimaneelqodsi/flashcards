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

// ── Machine d'etats simple (FRONT-2.14) ──────────────────────
// Reflete directement le diagramme etats-transitions DESIGN-0.4 du
// dossier de conception. Pas d'implementation du pattern State (hors
// des 3 patrons retenus, CLAUDE.md §3) : flags JavaScript simples.
//
//   ┌──────────────┐  flip   ┌──────────────┐
//   │  Q_affichee  │────────>│  R_revelee   │
//   │  (question)  │<────────│  (reponse)   │
//   └──────────────┘  flip   └──────┬───────┘
//                                   │ savais | revoir + plus de question
//                                   v
//                            ┌──────────────┐
//                            │ Session_finie│
//                            └──────────────┘
//
// Les fonctions afficher_face_recto() / afficher_face_verso() mettent
// a jour la variable etat_session ET la presentation. Les handlers
// d'evenement consultent etat_session avant d'agir, ce qui constitue
// la garde du diagramme d'etats-transitions.

var ETAT_QUESTION = "Q_affichee";
var ETAT_REPONSE = "R_revelee";
var ETAT_FINIE = "Session_finie";
var etat_session = ETAT_QUESTION;

// Compteurs de score (remis a zero a chaque entree dans la vue par
// reinitialiser_session, STUDY-1.3).
var nb_correctes = 0;
var nb_mauvaises = 0;

// Index de la question courante dans la liste laterale (FRONT-2.9).
var index_question_courante = 0;

// Identifiant du paquet en cours d'etude, lu depuis le hash
// (ex : #study-3 -> id_paquet_session = 3). Renseigne par
// afficher_etude_paquet() au demarrage de la session.
var id_paquet_session = null;

// Liste des questions de la session (chargee depuis l'API en STUDY-1.3).
// Format : tableau d'objets { id_question, contenu_question,
// contenu_reponse, id_paquet, id_difficulte }.
var questions_session = [];

// Indique si l'utilisateur est proprietaire du paquet en cours. Lu
// depuis la reponse de GET /api/paquets/:id/study (STUDY-1.1). Le
// sujet TER precise que last_score / best_score ne sont mis a jour
// que pour le proprietaire (CLAUDE.md §4) - le front ne tente meme
// pas l'appel POST score quand ce flag est faux.
var utilisateur_est_proprietaire = false;

// ── Conversion id_difficulte <-> libelle (STUDY-1.3) ─────────
// Le serveur renvoie un id_difficulte numerique (1=Facile, 2=Moyen,
// 3=Difficile, seedee dans cet ordre par install.php). On a besoin
// du libelle pour l'afficher dans le badge ".study-badge-difficulte",
// et de la classe CSS de couleur (badge-warn / badge-success /
// badge-danger) pour matcher la palette du mockup.
function libelle_difficulte(id_difficulte) {
    if (id_difficulte === 2) {
        return "Moyen";
    }
    if (id_difficulte === 3) {
        return "Difficile";
    }
    return "Facile";
}

function classe_badge_difficulte(id_difficulte) {
    if (id_difficulte === 2) {
        return "badge-warn";
    }
    if (id_difficulte === 3) {
        return "badge-err";
    }
    return "badge-ok";
}

// ── Lecture de l'id_paquet depuis le hash (STUDY-1.3) ────────
// Hash attendu : #study-<id>. Renvoie null si le hash n'a pas la
// bonne forme (id non numerique).
function extraire_id_etude_depuis_hash() {
    var hash = window.location.hash;
    var prefixe = "#study-";
    if (hash.indexOf(prefixe) !== 0) {
        return null;
    }
    var suffixe = hash.substring(prefixe.length);
    if (!suffixe.match(/^[0-9]+$/)) {
        return null;
    }
    return parseInt(suffixe, 10);
}

// ── Reinitialisation de l'etat de session (STUDY-1.3) ────────
// Vide les compteurs, l'index, les questions, la liste laterale, le
// recto/verso. Appelee en entree de afficher_etude_paquet() pour ne
// pas heriter des donnees d'une session precedente.
function reinitialiser_session() {
    nb_correctes = 0;
    nb_mauvaises = 0;
    index_question_courante = 0;
    questions_session = [];
    etat_session = ETAT_QUESTION;
    $("#study-liste-questions").empty();
    $("#study-question").text("");
    $("#study-reponse").text("");
    $("#study-badge-difficulte")
        .removeClass("badge-ok badge-warn badge-err")
        .text("");
    $("#study-correctes").text("0");
    $("#study-mauvaises").text("0");
    $("#study-score-pct").text("0");
    $("#study-best").text("0");
    $("#study-numero-courant").text("0");
    $("#study-total").text("0");
    $("#study-progress-fill").attr("style", "width: 0%");
}

// ── Affichage d'une question dans la carte courante (STUDY-1.3) ──
// Met a jour le recto (contenu_question), le verso (contenu_reponse),
// le badge de difficulte. Remet systematiquement sur la face recto.
function rendre_question_courante() {
    if (questions_session.length === 0) {
        return;
    }
    if (index_question_courante < 0 || index_question_courante >= questions_session.length) {
        return;
    }
    var q = questions_session[index_question_courante];

    $("#study-question").text(q.contenu_question);
    $("#study-reponse").text(q.contenu_reponse);

    var badge = $("#study-badge-difficulte");
    badge.removeClass("badge-ok badge-warn badge-err");
    badge.addClass(classe_badge_difficulte(q.id_difficulte));
    badge.text(libelle_difficulte(q.id_difficulte));

    // Met a jour le compteur du header "X / N".
    $("#study-numero-courant").text(index_question_courante + 1);

    afficher_face_recto();
}

// ── Construction de la liste laterale (STUDY-1.3) ────────────
// Cree un <li> par question (avec son numero et le debut du contenu).
// L'item correspondant a l'index courant recoit la classe .active.
function construire_side_list() {
    var liste = $("#study-liste-questions");
    liste.empty();
    var i;
    for (i = 0; i < questions_session.length; i = i + 1) {
        var q = questions_session[i];
        var item = $("<li></li>").addClass("study-liste-item");
        if (i === index_question_courante) {
            item.addClass("active");
        }
        item.append($("<span></span>").addClass("study-liste-numero").text(i + 1));
        // On utilise contenu_question comme intitule abrege dans la
        // liste laterale (le mockup met une courte description).
        item.append($("<span></span>").addClass("study-liste-titre-question").text(q.contenu_question));
        liste.append(item);
    }
}

// ── Etats : aucune question, erreur de chargement ────────────
function afficher_etat_vide() {
    $("#study-question").text("Ce paquet ne contient aucune question pour le moment.");
    $("#study-reponse").text("");
    $("#study-evaluation").hide().attr("hidden", "hidden");
}

function afficher_etat_erreur(message) {
    $("#study-question").text("Impossible de charger la session : " + message);
    $("#study-reponse").text("");
    $("#study-evaluation").hide().attr("hidden", "hidden");
}

// ── Entree principale : appelee par le router au changement de hash ──
// 1. Lit id_paquet depuis le hash.
// 2. Reinitialise l'etat.
// 3. Appelle GET /api/paquets/:id/study.
// 4. Sur succes : renseigne questions_session + est_proprietaire,
//    construit la side list, rend la 1ere question.
// 5. Sur erreur : message d'erreur dans la carte.
function afficher_etude_paquet() {
    reinitialiser_session();
    var id = extraire_id_etude_depuis_hash();
    if (id === null) {
        afficher_etat_erreur("identifiant de paquet invalide.");
        return;
    }
    id_paquet_session = id;

    AjaxService.get("paquets/" + id + "/study", undefined, {
        succes: function (reponse) {
            if (!reponse || !reponse.paquet) {
                afficher_etat_erreur("reponse serveur invalide.");
                return;
            }
            questions_session = (reponse.questions) ? reponse.questions : [];
            utilisateur_est_proprietaire = (reponse.est_proprietaire === true);

            // Header de session : titre + nombre de cartes.
            $("#study-titre").text(reponse.paquet.titre || "");
            $("#study-sous-titre").text(
                (reponse.paquet.theme || "")
                + ((reponse.paquet.theme && questions_session.length > 0) ? " - " : "")
                + questions_session.length + " cartes"
            );
            $("#study-total").text(questions_session.length);

            if (questions_session.length === 0) {
                afficher_etat_vide();
                return;
            }

            construire_side_list();
            rendre_question_courante();
            rafraichir_pastilles_score();
        },
        erreur: function (xhr, message) {
            if (xhr.status === 404) {
                afficher_etat_erreur("ce paquet n'existe pas.");
            } else if (xhr.status === 403) {
                afficher_etat_erreur("vous n'avez pas acces a ce paquet.");
            } else {
                afficher_etat_erreur(message);
            }
        }
    });
}

window.afficher_etude_paquet = afficher_etude_paquet;

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
    etat_session = ETAT_QUESTION;
}

function afficher_face_verso() {
    $("#study-carte-recto").hide().attr("hidden", "hidden");
    $("#study-carte-verso").show().removeAttr("hidden");
    $("#study-evaluation").show().removeAttr("hidden");
    etat_session = ETAT_REPONSE;
}

function basculer_face_carte() {
    // La transition flip n'est possible que si on n'est pas en
    // Session_finie : protection contre les clics tardifs apres la
    // bascule vers la vue de fin.
    if (etat_session === ETAT_FINIE) {
        return;
    }
    if (etat_session === ETAT_QUESTION) {
        afficher_face_verso();
    } else {
        afficher_face_recto();
    }
}

// ── Mise a jour de l'affichage du score (FRONT-2.11) ──────────
// Synchronise les compteurs visuels (pastilles, gros pourcentage,
// barre de progression du header) avec l'etat courant. Le pourcentage
// est calcule a partir des deux compteurs : correctes / total * 100,
// arrondi a l'entier le plus proche pour eviter l'affichage de
// decimales (mockup : "75%" et non "75.34%").
function rafraichir_pastilles_score() {
    $("#study-correctes").text(nb_correctes);
    $("#study-mauvaises").text(nb_mauvaises);

    var total_evaluees = nb_correctes + nb_mauvaises;
    var pourcentage = 0;
    if (total_evaluees > 0) {
        pourcentage = Math.round((nb_correctes / total_evaluees) * 100);
    }
    $("#study-score-pct").text(pourcentage);

    // Barre de progression : ratio des questions deja evaluees sur le
    // nombre total de questions de la session (taille de la liste).
    var nb_total_session = $("#study-liste-questions .study-liste-item").length;
    var pourcentage_progression = 0;
    if (nb_total_session > 0) {
        pourcentage_progression = Math.round((total_evaluees / nb_total_session) * 100);
    }
    $("#study-progress-fill").attr("style", "width: " + pourcentage_progression + "%");
    $("#study-total").text(nb_total_session);
}

// ── Navigation entre questions (FRONT-2.9 + STUDY-1.3) ───────
// Selectionne la question d'index donne dans la liste laterale,
// met a jour l'item .active et rend le contenu de la nouvelle
// question (recto/verso) via rendre_question_courante.
function aller_a_question(nouvel_index) {
    var total = questions_session.length;
    if (total === 0) {
        return;
    }
    if (nouvel_index < 0) {
        nouvel_index = 0;
    }
    if (nouvel_index >= total) {
        nouvel_index = total - 1;
    }
    index_question_courante = nouvel_index;

    // Met a jour la classe active sur la liste laterale.
    var items = $("#study-liste-questions .study-liste-item");
    items.removeClass("active");
    items.eq(nouvel_index).addClass("active");

    // Rend la question + reset la carte sur la face recto.
    rendre_question_courante();
}

function aller_question_precedente() {
    aller_a_question(index_question_courante - 1);
}

function aller_question_suivante() {
    aller_a_question(index_question_courante + 1);
}

// ── Appel API de fin de session (FRONT-2.12) ─────────────────
// Envoie le score calcule au serveur pour mise a jour de last_score
// (et de best_score si meilleur). L'endpoint cible (FULL-2.12) :
//   POST /api/paquets/<id>/session
//   { correctes: N, mauvaises: N, score: pct }
// Cote serveur, last_score et best_score sont mis a jour seulement si
// l'utilisateur connecte est le proprietaire du paquet (regle metier
// CLAUDE.md §4). Cote client on appelle aussi cet endpoint pour les
// destinataires : le serveur ignorera silencieusement leur score.
function envoyer_resultat_session() {
    var total_evaluees = nb_correctes + nb_mauvaises;
    var pourcentage = 0;
    if (total_evaluees > 0) {
        pourcentage = Math.round((nb_correctes / total_evaluees) * 100);
    }

    // Pour la phase frontend (FRONT-2), l'endpoint reel n'est pas encore
    // disponible : on log la requete et on bascule directement sur la
    // vue de fin de session. Le branchement AJAX sera complete quand le
    // backend exposera la route (cf. FULL-2.12). Le bloc $.ajax ci-
    // dessous est cable pret a l'emploi.
    $.ajax({
        url: "/api/paquets/" + id_paquet_session + "/session",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            correctes: nb_correctes,
            mauvaises: nb_mauvaises,
            score: pourcentage
        }),
        dataType: "json",
        success: function () {
            // Le serveur a accepte : on navigue vers la fin de session.
            window.location.hash = "fin-session-" + id_paquet_session;
        },
        error: function () {
            // En attendant que le backend existe, on bascule quand meme
            // pour permettre les tests UI. Quand FULL-2.12 sera fait,
            // remplacer ce fallback par un message d'erreur explicite.
            window.location.hash = "fin-session-" + id_paquet_session;
        }
    });
}

// ── Initialisation au chargement du DOM ──────────────────────
$(function () {

    // Synchronisation initiale du score live : permet d'afficher un
    // pourcentage coherent avec les compteurs stub des le chargement.
    rafraichir_pastilles_score();

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

    // ── Boutons d'evaluation (FRONT-2.8 + STUDY-1.3) ──
    // Helper interne : apres evaluation, avance d'une question OU
    // bascule vers la fin de session si on etait sur la derniere.
    // Transition R_revelee -> Q_affichee (suivante) OU -> Session_finie.
    // On utilise questions_session.length plutot que la taille du DOM
    // pour rester source-de-verite.
    function avancer_apres_evaluation() {
        var total = questions_session.length;
        if (index_question_courante >= total - 1) {
            // Derniere question : transition vers Session_finie. On
            // envoie le score au serveur (STUDY-1.4) avant la bascule
            // de vue (faite dans le callback success/error).
            etat_session = ETAT_FINIE;
            envoyer_resultat_session();
        } else {
            aller_question_suivante();
        }
    }

    // "Je savais !" : valide uniquement depuis l'etat R_revelee
    // (cf. machine d'etats FRONT-2.14). Incrementation du compteur,
    // marquage de la question en liste, transition vers la suivante
    // (ou Session_finie si derniere).
    $("#btn-savais").on("click", function () {
        if (etat_session !== ETAT_REPONSE) {
            return;
        }
        nb_correctes = nb_correctes + 1;
        $("#study-liste-questions .study-liste-item.active")
            .addClass("savais")
            .removeClass("revoir");
        rafraichir_pastilles_score();
        avancer_apres_evaluation();
    });

    // "A revoir" : symetrique. Meme garde sur l'etat.
    $("#btn-revoir").on("click", function () {
        if (etat_session !== ETAT_REPONSE) {
            return;
        }
        nb_mauvaises = nb_mauvaises + 1;
        $("#study-liste-questions .study-liste-item.active")
            .addClass("revoir")
            .removeClass("savais");
        rafraichir_pastilles_score();
        avancer_apres_evaluation();
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
            // Touche "1" : autorisee uniquement depuis l'etat R_revelee.
            if (etat_session === ETAT_REPONSE) {
                evenement.preventDefault();
                $("#btn-savais").click();
            }
            return;
        }
        if (evenement.keyCode === 50) {
            // Touche "2" : symetrique.
            if (etat_session === ETAT_REPONSE) {
                evenement.preventDefault();
                $("#btn-revoir").click();
            }
        }
    });

});
