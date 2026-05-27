// src/public/js/dashboard.js
// Rendu cote client du tableau de bord (DASH-1.3, BACK-2.2, DASH-2.2, DASH-2.3).
//
// Le rendu se fait en deux temps :
//   1) construire_squelette_dashboard() injecte la structure HTML (titre +
//      deux colonnes vides + compteurs a 0) dans #view ;
//   2) chaque colonne est ensuite remplie par un appel AJAX dedie :
//      - charger_mes_paquets()         -> GET /api/paquets        (DASH-2.2)
//      - charger_partages_avec_moi()   -> GET /api/paquets/shared (DASH-2.3)
//
// Pendant le chargement, chaque colonne affiche un texte "Chargement..."
// pour donner un retour visuel a l'utilisateur. En cas d'erreur reseau,
// un message d'erreur remplace le contenu de la colonne.
//
// Aucun tri n'est applique cote client : le SQL garantit deja l'ordre
// (`ORDER BY date_creation DESC` pour les paquets de l'utilisateur,
// `ORDER BY pa.date_partage DESC` pour les partages). Cf. PAQ-1.6.
//
// Depuis BACK-2.2, le rendu n'est plus automatique au DOM ready : il est
// declenche par le router (`afficher_dashboard()`), de maniere a etre
// rejoue chaque fois que l'utilisateur revient sur #dashboard.

// ── Icones SVG (chaines hard-codees : aucun contenu utilisateur, donc
// pas de risque XSS via .html()). Style "feather", coherent avec les
// autres icones de l'interface. La taille est fixee par la CSS
// (.kpi-ic svg / .btn-ic svg). ──────────────────────────────────────
var SVG_KPI_PAQUETS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
var SVG_KPI_SCORE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>';
var SVG_KPI_PARTAGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>';
var SVG_KPI_CARTES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>';
var SVG_BTN_PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
var SVG_BTN_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
var SVG_BTN_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

// Construit un bouton d'action "icone + libelle". L'icone est une chaine
// SVG hard-codee (injectee via .html(), sans risque XSS) ; le libelle
// passe par .text() (echappe).
function bouton_action(classes, svg, libelle) {
    var bouton = $("<button></button>").attr("type", "button").addClass(classes);
    bouton.append($("<span></span>").addClass("btn-ic").html(svg));
    bouton.append($("<span></span>").text(libelle));
    return bouton;
}

// Construit une carte KPI du tableau de bord (pastille coloree + valeur +
// libelle). Reference visuelle : project-files/interface/dashboard.png.
function carte_kpi(id_valeur, valeur_initiale, libelle, classe_ic, svg) {
    var carte = $("<div></div>").addClass("card kpi-card");
    carte.append($("<span></span>").addClass("kpi-ic " + classe_ic).html(svg));
    var txt = $("<span></span>").addClass("kpi-txt");
    txt.append($("<span></span>").addClass("kpi-valeur").attr("id", id_valeur).text(valeur_initiale));
    txt.append($("<span></span>").addClass("kpi-label").text(libelle));
    carte.append(txt);
    return carte;
}

// ── Formatage de la date pour l'affichage ───────────────────────
// Affiche "Aujourd'hui" pour la date du jour, "Hier" pour la veille,
// "Il y a N j" pour les dates plus anciennes. Reference visuelle :
// project-files/interface/dashboard.png ("Aujourd'hui", "Il y a 2 j").
// La date passee est la date_creation du paquet renvoyee par l'API
// (champ `date_creation` au format AAAA-MM-JJ).
function formater_date_paquet(date_iso) {
    var date_paquet = new Date(date_iso);
    var aujourdhui = new Date();
    // Met les deux dates a minuit pour comparer en nombre de jours pleins.
    aujourdhui.setHours(0, 0, 0, 0);
    date_paquet.setHours(0, 0, 0, 0);
    var diff_ms = aujourdhui.getTime() - date_paquet.getTime();
    var diff_jours = Math.round(diff_ms / (1000 * 60 * 60 * 24));
    if (diff_jours <= 0) {
        return "Aujourd'hui";
    }
    if (diff_jours === 1) {
        return "Hier";
    }
    return "Il y a " + diff_jours + " j";
}

// ── Navigation vers l'ecran de visualisation d'un paquet ───────
// Exigence sujet TER : un clic sur la card ou le titre doit ouvrir
// l'ecran de visualisation. La vue dediee sera ajoutee en FULL-2.17,
// la route SPA en BACK-2.2. Pour l'instant on positionne l'ancre, le
// routeur cote client la prendra en charge plus tard.
function naviguer_vers_paquet(id_paquet) {
    window.location.hash = "visualisation-paquet-" + id_paquet;
}

// ── Rendu d'une carte-paquet ───────────────────────────────────
// Construit l'element jQuery d'une carte-paquet a partir d'un objet
// paquet. On utilise .text() pour les champs venant des donnees, plutot
// que .html() : cela echappe naturellement le contenu et evite tout XSS
// lorsque les vraies donnees serveur arriveront. La carte entiere est
// cliquable (cf. DASH-1.6) : un clic sur le fond ou le titre amene a
// l'ecran de visualisation ; les boutons internes stoppent la
// propagation pour conserver leur propre action.
function rendre_carte_paquet(paquet, est_proprietaire) {
    // Le backend renvoie last_score et best_score a null tant qu'aucune
    // session n'a ete jouee, et le nombre de cartes n'est pas encore
    // expose par l'API (endpoint dedie hors scope DASH-2). On expose des
    // defauts surs pour eviter "undefined" dans l'affichage.
    var nombre_cartes = 0;
    if (typeof paquet.nombre_cartes === "number") {
        nombre_cartes = paquet.nombre_cartes;
    }

    var score_record = "—";
    if (paquet.best_score !== null && typeof paquet.best_score !== "undefined") {
        score_record = paquet.best_score + "%";
    }
    var score_dernier = "—";
    if (paquet.last_score !== null && typeof paquet.last_score !== "undefined") {
        score_dernier = paquet.last_score + "%";
    }
    var pourcentage_progression = 0;
    if (paquet.best_score !== null && typeof paquet.best_score !== "undefined") {
        pourcentage_progression = paquet.best_score;
    }

    // Construction par etapes (pas de gros literal HTML : chaque element
    // est cree et rempli individuellement pour rester lisible).
    var carte = $("<article></article>").addClass("paquet-card");
    carte.attr("data-id-paquet", paquet.id_paquet);
    // Carte cliquable : accessibilite clavier via tabindex + role.
    carte.attr("tabindex", "0");
    carte.attr("role", "link");
    carte.attr("aria-label", "Ouvrir le paquet : " + paquet.titre);
    carte.on("click", function () {
        naviguer_vers_paquet(paquet.id_paquet);
    });
    // Touche Entree au clavier declenche aussi la navigation.
    carte.on("keydown", function (evenement) {
        if (evenement.keyCode === 13) {
            naviguer_vers_paquet(paquet.id_paquet);
        }
    });

    var entete = $("<div></div>").addClass("paquet-card-head");
    var bloc_titre = $("<div></div>");
    bloc_titre.append($("<h4></h4>").addClass("paquet-titre").text(paquet.titre));
    bloc_titre.append($("<p></p>").addClass("paquet-theme").text(paquet.theme));
    entete.append(bloc_titre);
    entete.append(
        $("<span></span>").addClass("badge badge-p").text(nombre_cartes + " cartes")
    );
    carte.append(entete);

    var barre = $("<div></div>").addClass("paquet-progress");
    var rempli = $("<div></div>").addClass("paquet-progress-fill");
    rempli.attr("style", "width: " + pourcentage_progression + "%");
    barre.append(rempli);
    carte.append(barre);

    // Affichage Dernier / Record / Date (FRONT-2.13). Quand aucun score
    // n'est encore enregistre, on remplace la ligne par "Jamais revise"
    // pour rester aligne avec le mockup dashboard.png (carte 3).
    var jamais_revise = (paquet.best_score === null || typeof paquet.best_score === "undefined")
        && (paquet.last_score === null || typeof paquet.last_score === "undefined");
    var scores = $("<div></div>").addClass("paquet-scores");
    if (jamais_revise) {
        scores.append($("<span></span>").text("Jamais revise"));
    } else {
        scores.append($("<span></span>").text("Record : ").append($("<strong></strong>").text(score_record)));
        scores.append($("<span></span>").text("Dernier : ").append($("<strong></strong>").text(score_dernier)));
        scores.append($("<span></span>").text("Cree : ").append($("<strong></strong>").text(formater_date_paquet(paquet.date_creation))));
    }
    carte.append(scores);

    var actions = $("<div></div>").addClass("paquet-actions");
    // Bouton Reviser : navigue vers #study-:id (WIRE-1.1). Disponible
    // pour tous (proprietaire ET destinataire), conforme a STUDY-1.1
    // qui autorise l'acces proprietaire-ou-destinataire.
    var bouton_reviser = bouton_action("btn btn-primary btn-sm", SVG_BTN_PLAY, "Reviser");
    bouton_reviser.on("click", function (evenement) {
        evenement.stopPropagation();
        window.location.hash = "#study-" + paquet.id_paquet;
    });
    actions.append(bouton_reviser);

    // Boutons Editer / Partager : reserves au proprietaire. La colonne
    // "Partages avec moi" ne propose ni l'edition ni le re-partage : un
    // destinataire est un consommateur du paquet, pas un co-proprietaire.
    if (est_proprietaire) {
        // Bouton Editer : navigue vers #edit-paquet-:id (WIRE-1.2).
        // edition-paquet.js detecte le mode edition et fetch les donnees
        // via GET /api/paquets/:id (cf. PAQ-2.2 + QST-1.6).
        var bouton_editer = bouton_action("btn btn-secondary btn-sm", SVG_BTN_EDIT, "Editer");
        bouton_editer.on("click", function (evenement) {
            evenement.stopPropagation();
            window.location.hash = "#edit-paquet-" + paquet.id_paquet;
        });
        actions.append(bouton_editer);

        // Partager : ouvre la modale share-modal.js (SHARE-1.4).
        var bouton_partager = bouton_action("btn btn-secondary btn-sm", SVG_KPI_PARTAGE, "Partager");
        bouton_partager.on("click", function (evenement) {
            evenement.stopPropagation();
            if (typeof window.ouvrir_modale_partage === "function") {
                window.ouvrir_modale_partage(paquet.id_paquet, paquet.titre);
            }
        });
        actions.append(bouton_partager);
    }

    carte.append(actions);

    return carte;
}

// ── Affichage d'une liste de paquets dans une colonne ──────────
// Vide le conteneur, met a jour le compteur, puis insere les cartes
// (deja triees par date desc cote serveur). Affiche un etat vide si la
// liste est vide. Le parametre `est_proprietaire` est passe au renderer
// pour decider d'afficher ou non les actions reservees au proprietaire
// (Editer, Partager) : true pour la colonne "Mes paquets", false pour
// "Partages avec moi".
function afficher_paquets(paquets, id_conteneur, id_compteur, texte_vide, est_proprietaire) {
    var conteneur = $("#" + id_conteneur);
    conteneur.empty();
    $("#" + id_compteur).text(paquets.length);

    if (paquets.length === 0) {
        conteneur.append(
            $("<p></p>").addClass("dashboard-col-empty").text(texte_vide)
        );
        return;
    }

    var i;
    for (i = 0; i < paquets.length; i = i + 1) {
        conteneur.append(rendre_carte_paquet(paquets[i], est_proprietaire));
    }
}

// ── Construit le squelette HTML du tableau de bord ─────────────
// Cette fonction injecte la structure (titre + 2 colonnes) dans #view.
// Auparavant ce HTML etait inline dans app.php ; il a ete deplace ici
// (BACK-2.2) pour que le router puisse recreer la vue chaque fois que
// l'utilisateur revient sur #dashboard.
function construire_squelette_dashboard() {
    var vue = $("#view");
    vue.empty();

    // En-tete : titre + bouton "Nouveau paquet".
    var entete = $("<div></div>").addClass("page-title-row");
    var bloc_titre = $("<div></div>");
    bloc_titre.append($("<h2></h2>").addClass("page-title").text("Tableau de bord"));
    bloc_titre.append($("<p></p>").addClass("page-sub").text("Vos paquets et ceux qui vous ont ete partages."));
    entete.append(bloc_titre);
    var bouton_nouveau = $("<a></a>")
        .attr("href", "#nouveau-paquet")
        .attr("id", "btn-nouveau-paquet")
        .addClass("btn btn-primary")
        .text("Nouveau paquet");
    entete.append(bouton_nouveau);
    vue.append(entete);

    // Rangee de KPI (dashboard.png) : mes paquets, meilleur score,
    // partages, cartes au total. Les valeurs sont mises a jour quand les
    // appels API repondent (maj_kpis_mes_paquets / maj_kpi_partages).
    var kpis = $("<div></div>").addClass("dashboard-kpis");
    kpis.append(carte_kpi("kpi-mes-paquets", "0", "Mes paquets", "kpi-ic-violet", SVG_KPI_PAQUETS));
    kpis.append(carte_kpi("kpi-meilleur-score", "—", "Meilleur score", "kpi-ic-vert", SVG_KPI_SCORE));
    kpis.append(carte_kpi("kpi-partages", "0", "Partages avec moi", "kpi-ic-orange", SVG_KPI_PARTAGE));
    kpis.append(carte_kpi("kpi-total-cartes", "0", "Cartes au total", "kpi-ic-rose", SVG_KPI_CARTES));
    vue.append(kpis);

    // Deux colonnes : mes paquets / partages avec moi.
    var colonnes = $("<div></div>").addClass("dashboard-columns");

    var col_mes = $("<section></section>")
        .addClass("dashboard-col")
        .attr("id", "col-mes-paquets")
        .attr("aria-labelledby", "titre-mes-paquets");
    var head_mes = $("<div></div>").addClass("dashboard-col-head");
    head_mes.append($("<h3></h3>").addClass("dashboard-col-title").attr("id", "titre-mes-paquets").text("Mes paquets"));
    head_mes.append($("<span></span>").addClass("dashboard-col-count").attr("id", "compteur-mes-paquets").text("0"));
    col_mes.append(head_mes);
    col_mes.append($("<div></div>").addClass("dashboard-col-body").attr("id", "liste-mes-paquets"));
    colonnes.append(col_mes);

    var col_par = $("<section></section>")
        .addClass("dashboard-col")
        .attr("id", "col-partages")
        .attr("aria-labelledby", "titre-partages");
    var head_par = $("<div></div>").addClass("dashboard-col-head");
    head_par.append($("<h3></h3>").addClass("dashboard-col-title").attr("id", "titre-partages").text("Partages avec moi"));
    head_par.append($("<span></span>").addClass("dashboard-col-count").attr("id", "compteur-partages").text("0"));
    col_par.append(head_par);
    col_par.append($("<div></div>").addClass("dashboard-col-body").attr("id", "liste-partages"));
    colonnes.append(col_par);

    vue.append(colonnes);
}

// ── Etat de chargement / d'erreur d'une colonne ─────────────────
// Petit helper qui affiche un message neutre (chargement, erreur) en
// remplacement du contenu d'une colonne du dashboard. Utilise par les
// fonctions de chargement avant/apres l'appel AJAX.
function afficher_message_colonne(id_conteneur, message) {
    var conteneur = $("#" + id_conteneur);
    conteneur.empty();
    conteneur.append($("<p></p>").addClass("dashboard-col-empty").text(message));
}

// ── Mise a jour des KPI a partir de "Mes paquets" ───────────────
// Calcule 3 des 4 indicateurs depuis la liste des paquets de
// l'utilisateur : nombre de paquets, meilleur score (max des best_score),
// total de cartes (somme des nombre_cartes). Le 4e (partages) vient de
// l'autre colonne (maj_kpi_partages).
function maj_kpis_mes_paquets(paquets) {
    $("#kpi-mes-paquets").text(paquets.length);

    var total_cartes = 0;
    var meilleur = null;
    var i;
    for (i = 0; i < paquets.length; i = i + 1) {
        var p = paquets[i];
        if (typeof p.nombre_cartes === "number") {
            total_cartes = total_cartes + p.nombre_cartes;
        }
        if (typeof p.best_score === "number") {
            if (meilleur === null || p.best_score > meilleur) {
                meilleur = p.best_score;
            }
        }
    }
    $("#kpi-total-cartes").text(total_cartes);
    $("#kpi-meilleur-score").text(meilleur === null ? "—" : (meilleur + "%"));
}

// Met a jour le KPI "Partages avec moi" (nombre de paquets recus).
function maj_kpi_partages(nombre) {
    $("#kpi-partages").text(nombre);
}

// ── Branchement API : Mes paquets (DASH-2.2) ────────────────────
// Appelle GET /api/paquets via AjaxService et rend la liste recue
// dans la colonne gauche du dashboard. Le serveur applique deja
// `ORDER BY date_creation DESC` (PAQ-1.6), donc le front affiche les
// paquets dans l'ordre recu sans re-trier.
function charger_mes_paquets() {
    afficher_message_colonne("liste-mes-paquets", "Chargement...");
    $("#compteur-mes-paquets").text("0");

    AjaxService.get("paquets", undefined, {
        succes: function (reponse) {
            var paquets = [];
            if (reponse && reponse.paquets) {
                paquets = reponse.paquets;
            }
            afficher_paquets(
                paquets,
                "liste-mes-paquets",
                "compteur-mes-paquets",
                "Aucun paquet pour le moment.",
                true
            );
            maj_kpis_mes_paquets(paquets);
        },
        erreur: function (xhr, message) {
            afficher_message_colonne(
                "liste-mes-paquets",
                "Impossible de charger vos paquets (" + message + ")."
            );
            $("#compteur-mes-paquets").text("0");
        }
    });
}

// ── Branchement API : Partages avec moi (DASH-2.3) ──────────────
// Appelle GET /api/paquets/shared via AjaxService et rend la liste
// dans la colonne droite du dashboard. Le serveur applique deja
// `ORDER BY pa.date_partage DESC` (DASH-2.1), donc le front affiche
// les paquets dans l'ordre recu sans re-trier.
function charger_partages_avec_moi() {
    afficher_message_colonne("liste-partages", "Chargement...");
    $("#compteur-partages").text("0");

    AjaxService.get("paquets/shared", undefined, {
        succes: function (reponse) {
            var paquets = [];
            if (reponse && reponse.paquets) {
                paquets = reponse.paquets;
            }
            afficher_paquets(
                paquets,
                "liste-partages",
                "compteur-partages",
                "Aucun paquet partage.",
                false
            );
            maj_kpi_partages(paquets.length);
        },
        erreur: function (xhr, message) {
            afficher_message_colonne(
                "liste-partages",
                "Impossible de charger les partages (" + message + ")."
            );
            $("#compteur-partages").text("0");
        }
    });
}

// ── Point d'entree du tableau de bord (appele par le router) ───
// Reconstruit la vue puis declenche les chargements AJAX par colonne.
// Les deux appels sont independants : on ne chaine pas leurs callbacks,
// les deux colonnes peuvent donc remplir leur etat de chargement et
// leur resultat en parallele.
// Expose en global pour que app.js puisse l'enregistrer comme handler
// de la route #dashboard.
function afficher_dashboard() {
    construire_squelette_dashboard();

    // Mes paquets : appel API (DASH-2.2).
    charger_mes_paquets();

    // Partages avec moi : appel API (DASH-2.3).
    charger_partages_avec_moi();
}

// Expose l'entree au router.
window.afficher_dashboard = afficher_dashboard;
