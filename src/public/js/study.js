// src/public/js/study.js
// Comportement de la vue de session d'etude (FRONT-2.7 a 2.14).
//
// FRONT-2.7 : bascule entre la face recto (question) et la face verso
// (reponse) au clic sur la carte. Implementation par show/hide jQuery +
// une petite animation d'entree CSS (opacity + transform 2D, cf.
// montrer_face et study.css), plutot que via une rotation 3D CSS
// (transform: rotateY) : la perspective 3D n'est pas garantie dans le
// perimetre du cours initiation-HTML-CSS.pdf. La navigation entre
// questions joue un glissement lateral (gauche/droite) selon le sens.
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

// Classe d'animation d'entree a jouer au prochain affichage d'une face
// (cf. montrer_face). "flip" par defaut (retournement recto/verso) ;
// la navigation positionne "droite"/"gauche" selon le sens.
var prochaine_anim_entree = "study-carte-entre-flip";

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
                afficher_etat_erreur("réponse serveur invalide.");
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
                afficher_etat_erreur("vous n'avez pas accès à ce paquet.");
            } else {
                afficher_etat_erreur(message);
            }
        }
    });
}

window.afficher_etude_paquet = afficher_etude_paquet;

// ── Affichage anime d'une face ────────────────────────────────
// Rend une face visible avec une petite animation d'entree (opacity +
// transform 2D, pilotee par la CSS .study-carte / .study-carte-entre-*).
// Technique : on applique la classe d'etat de depart AVANT show() (pour
// eviter un flash), on force un reflow, puis on retire la classe -> la
// carte transitionne vers son etat normal. Pas de rotation 3D (perimetre
// du cours, CLAUDE.md §2bis).
function montrer_face(id_face) {
    var face = $("#" + id_face);
    var classe_entree = prochaine_anim_entree;
    // On applique l'etat de depart AVANT d'afficher (evite un flash), puis
    // on affiche la face.
    face.addClass(classe_entree);
    face.show().removeAttr("hidden");
    // Retrait differe de la classe : le court delai laisse le navigateur
    // peindre l'etat de depart, puis la transition CSS s'execute vers
    // l'etat normal. setTimeout est deja utilise dans le projet (toast.js)
    // et reste dans le perimetre du cours.
    setTimeout(function () {
        face.removeClass(classe_entree);
    }, 20);
    // Retour au flip par defaut pour le prochain affichage (la navigation
    // repositionnera "droite"/"gauche" si besoin).
    prochaine_anim_entree = "study-carte-entre-flip";
}

// ── Bascule de la face recto <-> verso ────────────────────────
// On masque l'autre face puis on affiche la face cible via montrer_face
// (animation d'entree). L'attribut HTML5 hidden est synchronise pour
// rester semantiquement coherent (accessibilite). La zone d'evaluation
// (boutons Check/Bad) n'apparait qu'apres flip vers la face verso.
function afficher_face_recto() {
    $("#study-carte-verso").hide().attr("hidden", "hidden");
    $("#study-evaluation").hide().attr("hidden", "hidden");
    montrer_face("study-carte-recto");
    etat_session = ETAT_QUESTION;
}

function afficher_face_verso() {
    $("#study-carte-recto").hide().attr("hidden", "hidden");
    montrer_face("study-carte-verso");
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
    // Sens de l'animation d'entree : glissement depuis la droite si on
    // avance, depuis la gauche si on recule (consomme par montrer_face).
    if (nouvel_index > index_question_courante) {
        prochaine_anim_entree = "study-carte-entre-droite";
    } else if (nouvel_index < index_question_courante) {
        prochaine_anim_entree = "study-carte-entre-gauche";
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

// ── Calcul du pourcentage de la session ──────────────────────
// Helper isole pour le partager entre envoyer_resultat_session et la
// vue de fin (qui en a besoin pour le rendu du pourcentage et du best).
function calculer_pourcentage_session() {
    var total_evaluees = nb_correctes + nb_mauvaises;
    if (total_evaluees === 0) {
        return 0;
    }
    return Math.round((nb_correctes / total_evaluees) * 100);
}

// ── Pre-remplissage de la vue de fin de session (STUDY-1.4) ──
// Remplit les champs de #vue-fin-session a partir des compteurs en
// memoire (nb_correctes, nb_mauvaises, questions_session.length) +
// le titre du paquet courant (lu depuis le header de study). Le
// best_score est passe en parametre car il vient de la reponse POST
// score (peut etre null si la session vient d'etre faite par un
// destinataire et qu'on n'a pas re-questionne le serveur).
function remplir_recap_fin_session(best_serveur) {
    var pourcentage = calculer_pourcentage_session();
    var nb_total = questions_session.length;
    var titre_paquet = $("#study-titre").text();
    var sous_titre_session = titre_paquet + " - " + nb_total + " cartes";

    $("#fin-session-paquet").text(sous_titre_session);
    $("#fin-session-score-pct").text(pourcentage);
    $("#fin-session-reussies").text(nb_correctes);
    $("#fin-session-total").text(nb_total);
    $("#fin-session-correctes").text(nb_correctes);
    $("#fin-session-mauvaises").text(nb_mauvaises);

    // Best : si renvoye par le serveur (proprietaire qui a persiste),
    // on l'affiche tel quel. Sinon (destinataire ou erreur reseau)
    // on affiche le pourcentage courant comme repere (le meilleur de
    // la session en cours est au moins ce pourcentage).
    if (typeof best_serveur === "number") {
        $("#fin-session-best").text(best_serveur);
    } else {
        $("#fin-session-best").text(pourcentage);
    }

    // Mise a jour des liens d'action de la vue de fin (recommencer +
    // retour dashboard). Le bouton "Recommencer" pointe vers la
    // session courante.
    $("#btn-recommencer-session").attr("href", "#study-" + id_paquet_session);
}

// ── Appel API de fin de session (STUDY-1.4) ──────────────────
// Persiste le score uniquement pour le proprietaire (regle metier
// CLAUDE.md §4 : last_score / best_score sont strictement personnels au
// proprietaire). Cote serveur l'endpoint POST /api/paquets/:id/score
// (STUDY-1.2) refuse de toute facon les destinataires avec un 403, mais
// on evite l'appel inutile cote front.
//
// Format du payload : { score: 0..100 }. Le serveur deduit last_score =
// score et best_score = max(best_score, score). En retour, le paquet
// renvoye contient les nouvelles valeurs (utilisable pour pre-remplir
// la vue de fin de session sans relire l'API).
//
// La navigation vers #fin-session-<id> se fait dans tous les cas
// (proprietaire, destinataire, erreur reseau) : la vue de fin reste
// utile pour visualiser le score de la session courante meme si elle
// n'est pas persistee.
function envoyer_resultat_session() {
    var pourcentage = calculer_pourcentage_session();
    var hash_fin = "#fin-session-" + id_paquet_session;

    // Destinataire : pas d'appel API (le serveur refuserait de toute
    // facon avec 403). On remplit la vue de fin avec les compteurs en
    // memoire sans best_score serveur, et on bascule.
    if (utilisateur_est_proprietaire !== true) {
        remplir_recap_fin_session(undefined);
        window.location.hash = hash_fin;
        return;
    }

    AjaxService.post(
        "paquets/" + id_paquet_session + "/score",
        { score: pourcentage },
        {
            succes: function (reponse) {
                // Le serveur a persiste : on recupere best_score depuis
                // la reponse pour l'afficher sur la vue de fin.
                var best = null;
                if (reponse && reponse.paquet && typeof reponse.paquet.best_score === "number") {
                    best = reponse.paquet.best_score;
                }
                remplir_recap_fin_session(best);
                window.location.hash = hash_fin;
            },
            erreur: function (xhr, message) {
                // L'echec d'enregistrement du score ne doit pas
                // empecher l'utilisateur de voir le recap. Toast +
                // bascule avec best inconnu.
                if (window.Toast && typeof window.Toast.erreur === "function") {
                    window.Toast.erreur(
                        "Impossible d'enregistrer le score : " + message
                    );
                }
                remplir_recap_fin_session(undefined);
                window.location.hash = hash_fin;
            }
        }
    );
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

    // "À revoir" : symetrique. Meme garde sur l'etat.
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
