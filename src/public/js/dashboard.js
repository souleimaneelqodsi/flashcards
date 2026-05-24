// src/public/js/dashboard.js
// Rendu cote client du tableau de bord (DASH-1.3).
//
// Tant que les vrais endpoints (BACK-2 / FULL-2) ne sont pas branches, les
// donnees affichees sont des stubs locaux (tableaux JavaScript en dur). Le
// tri par date decroissante simule deja le comportement final : "mises a
// jour les plus recentes en haut".

// ── Donnees stub ────────────────────────────────────────────────
// Chaque paquet expose les champs cibles du modele de donnees :
//   - id_paquet : identifiant unique
//   - titre, theme : libelles affiches
//   - nombre_cartes : taille du paquet (badge)
//   - last_score, best_score : 0 a 100 (ou null si jamais revise)
//   - date_maj : date au format ISO (AAAA-MM-JJ), utilisee pour le tri
//
// Les vrais champs viendront du backend via $.ajax (FULL-2.8 / FULL-2.9).

var paquets_stub = [
    {
        id_paquet: 1,
        titre: "Bases de donnees relationnelles",
        theme: "SQL et modelisation",
        nombre_cartes: 24,
        last_score: 78,
        best_score: 92,
        date_maj: "2026-05-22"
    },
    {
        id_paquet: 2,
        titre: "Architecture des systemes d'information",
        theme: "Systemes d'information",
        nombre_cartes: 18,
        last_score: 85,
        best_score: 85,
        date_maj: "2026-05-24"
    },
    {
        id_paquet: 3,
        titre: "Gestion de projet Agile et Scrum",
        theme: "Management et methodes",
        nombre_cartes: 12,
        last_score: null,
        best_score: null,
        date_maj: "2026-05-20"
    },
    {
        id_paquet: 4,
        titre: "Programmation Web Avancee",
        theme: "PHP, jQuery, AJAX",
        nombre_cartes: 30,
        last_score: 64,
        best_score: 71,
        date_maj: "2026-05-18"
    },
    {
        id_paquet: 5,
        titre: "Algorithmique et complexite",
        theme: "Tri, graphes, recursivite",
        nombre_cartes: 22,
        last_score: 80,
        best_score: 88,
        date_maj: "2026-05-15"
    }
];

var partages_stub = [
    {
        id_paquet: 101,
        titre: "Statistiques pour decideurs",
        theme: "Probabilites, tests",
        nombre_cartes: 16,
        last_score: null,
        best_score: null,
        date_maj: "2026-05-23"
    },
    {
        id_paquet: 102,
        titre: "Anglais professionnel",
        theme: "Vocabulaire et expressions",
        nombre_cartes: 40,
        last_score: 90,
        best_score: 95,
        date_maj: "2026-05-21"
    }
];

// ── Tri par date de mise a jour decroissante ────────────────────
// Renvoie un nouveau tableau (sans modifier la source). Le format de
// date "AAAA-MM-JJ" se compare lexicographiquement comme un tri par
// date : pas besoin d'objet Date pour le tri lui-meme.
function trier_par_date_desc(paquets) {
    var copie = paquets.slice();
    copie.sort(function (a, b) {
        if (a.date_maj < b.date_maj) {
            return 1;
        }
        if (a.date_maj > b.date_maj) {
            return -1;
        }
        return 0;
    });
    return copie;
}

// ── Formatage de la date pour l'affichage ───────────────────────
// Affiche "Aujourd'hui" pour la date du jour, "Hier" pour la veille,
// "il y a N jours" pour les dates plus anciennes. Reference visuelle :
// project-files/interface/dashboard.png ("Aujourd'hui", "Il y a 2 j").
function formater_date_maj(date_iso) {
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
    window.location.hash = "paquet-" + id_paquet;
}

// ── Rendu d'une carte-paquet ───────────────────────────────────
// Construit l'element jQuery d'une carte-paquet a partir d'un objet
// paquet. On utilise .text() pour les champs venant des donnees, plutot
// que .html() : cela echappe naturellement le contenu et evite tout XSS
// lorsque les vraies donnees serveur arriveront. La carte entiere est
// cliquable (cf. DASH-1.6) : un clic sur le fond ou le titre amene a
// l'ecran de visualisation ; les boutons internes stoppent la
// propagation pour conserver leur propre action.
function rendre_carte_paquet(paquet) {
    var score_record = "—";
    if (paquet.best_score !== null) {
        score_record = paquet.best_score + "%";
    }
    var score_dernier = "—";
    if (paquet.last_score !== null) {
        score_dernier = paquet.last_score + "%";
    }
    var pourcentage_progression = 0;
    if (paquet.best_score !== null) {
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
        $("<span></span>").addClass("badge badge-p").text(paquet.nombre_cartes + " cartes")
    );
    carte.append(entete);

    var barre = $("<div></div>").addClass("paquet-progress");
    var rempli = $("<div></div>").addClass("paquet-progress-fill");
    rempli.attr("style", "width: " + pourcentage_progression + "%");
    barre.append(rempli);
    carte.append(barre);

    var scores = $("<div></div>").addClass("paquet-scores");
    scores.append($("<span></span>").text("Record : ").append($("<strong></strong>").text(score_record)));
    scores.append($("<span></span>").text("Dernier : ").append($("<strong></strong>").text(score_dernier)));
    scores.append($("<span></span>").text("Mise a jour : ").append($("<strong></strong>").text(formater_date_maj(paquet.date_maj))));
    carte.append(scores);

    var actions = $("<div></div>").addClass("paquet-actions");
    var bouton_reviser = $("<button></button>")
        .attr("type", "button")
        .addClass("btn btn-primary btn-sm")
        .text("Reviser");
    var bouton_editer = $("<button></button>")
        .attr("type", "button")
        .addClass("btn btn-secondary btn-sm")
        .text("Editer");
    // Les boutons internes ont leurs propres actions (a venir en FULL-2)
    // : ils stoppent la propagation du clic pour ne pas declencher la
    // navigation de la carte vers l'ecran de visualisation.
    bouton_reviser.on("click", function (evenement) {
        evenement.stopPropagation();
    });
    bouton_editer.on("click", function (evenement) {
        evenement.stopPropagation();
    });
    actions.append(bouton_reviser);
    actions.append(bouton_editer);
    carte.append(actions);

    return carte;
}

// ── Affichage d'une liste de paquets dans une colonne ──────────
// Vide le conteneur, met a jour le compteur, puis insere les cartes
// (deja triees par date desc). Affiche un etat vide si la liste est
// vide. Le parametre id_compteur est l'identifiant du badge a mettre
// a jour ("compteur-mes-paquets" ou "compteur-partages").
function afficher_paquets(paquets, id_conteneur, id_compteur, texte_vide) {
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
        conteneur.append(rendre_carte_paquet(paquets[i]));
    }
}

// ── Initialisation au chargement du DOM ────────────────────────
$(function () {
    var mes_paquets_tries = trier_par_date_desc(paquets_stub);
    var partages_tries = trier_par_date_desc(partages_stub);

    afficher_paquets(
        mes_paquets_tries,
        "liste-mes-paquets",
        "compteur-mes-paquets",
        "Aucun paquet pour le moment."
    );
    afficher_paquets(
        partages_tries,
        "liste-partages",
        "compteur-partages",
        "Aucun paquet partage."
    );
});
