// src/public/js/visualisation-paquet.js
// Ecran de visualisation d'un paquet (VIEW-1.3).
//
// Exigence sujet TER (CLAUDE.md sec. 5) :
//   "Doit afficher le titre, la date d'ajout, le proprietaire, et la
//    liste des utilisateurs avec lesquels le paquet est partage. Si
//    l'utilisateur courant est proprietaire, afficher les liens Editer
//    et Supprimer."
//
// L'ecran est compose en JavaScript a partir de la reponse de
// GET /api/paquets/:id (VIEW-1.2). Aucun mockup dedie n'existe : la
// mise en forme s'inspire de new_bag.png (en-tete avec bouton retour
// + titre + actions) et dashboard.png (carte d'info, palette violette).
//
// Repartition VIEW-1.3 vs VIEW-1.1 :
//   - VIEW-1.3 (ce fichier) : structure complete + rendu des chips en
//     lecture seule.
//   - VIEW-1.1 (a venir) : ajoute le bouton X de retrait + l'appel
//     DELETE /api/paquets/:id/share/:userId sur chaque chip.

(function () {

    // Stocke le dernier id rendu, pratique pour eviter de rappeler l'API
    // si l'utilisateur clique sur le meme paquet deux fois.
    var dernier_id_paquet = null;

    // ── Lecture de l'id depuis le hash (#visualisation-paquet-42) ──
    function extraire_id_depuis_hash(hash) {
        var prefixe = "#visualisation-paquet-";
        if (hash.indexOf(prefixe) !== 0) {
            return null;
        }
        var suffixe = hash.substring(prefixe.length);
        // Verifie que le suffixe est bien un entier positif.
        if (!suffixe.match(/^[0-9]+$/)) {
            return null;
        }
        return parseInt(suffixe, 10);
    }

    // ── Helpers d'affichage ─────────────────────────────────────

    // Reutilise la convention de classe_avatar() de share-modal.js
    // pour avoir une palette d'avatars coherente entre les ecrans.
    function classe_avatar(id_user) {
        var modulo = id_user % 3;
        if (modulo === 0) {
            return "avatar-grad-violet";
        }
        if (modulo === 1) {
            return "avatar-grad-orange";
        }
        return "avatar-grad-bleu";
    }

    function calculer_initiales(prenom, nom) {
        var i_prenom = (typeof prenom === "string" && prenom.length > 0)
            ? prenom.charAt(0).toUpperCase()
            : "?";
        var i_nom = (typeof nom === "string" && nom.length > 0)
            ? nom.charAt(0).toUpperCase()
            : "?";
        return i_prenom + i_nom;
    }

    // Formate "AAAA-MM-JJ" en "JJ/MM/AAAA" (plus naturel pour le lecteur
    // francophone). Si la chaine n'a pas la bonne forme, on la rend telle
    // quelle pour ne pas masquer un bug en silence.
    function formater_date_iso(date_iso) {
        if (typeof date_iso !== "string") {
            return "";
        }
        var morceaux = date_iso.split("-");
        if (morceaux.length !== 3) {
            return date_iso;
        }
        return morceaux[2] + "/" + morceaux[1] + "/" + morceaux[0];
    }

    // ── Rendu : etat de chargement ──────────────────────────────
    function afficher_chargement() {
        var vue = $("#vue-visualisation-paquet");
        vue.empty();
        var carte = $("<div></div>").addClass("card");
        carte.append($("<p></p>").text("Chargement du paquet..."));
        vue.append(carte);
    }

    // ── Rendu : etat d'erreur ───────────────────────────────────
    function afficher_erreur(message) {
        var vue = $("#vue-visualisation-paquet");
        vue.empty();
        var entete = $("<div></div>").addClass("page-title-row");
        var bloc = $("<div></div>");
        bloc.append($("<h2></h2>").addClass("page-title").text("Paquet inaccessible"));
        bloc.append($("<p></p>").addClass("page-sub").text(message));
        entete.append(bloc);
        vue.append(entete);

        var carte = $("<div></div>").addClass("card");
        var lien = $("<a></a>")
            .attr("href", "#dashboard")
            .addClass("btn btn-primary")
            .text("Retour au tableau de bord");
        carte.append(lien);
        vue.append(carte);
    }

    // ── Rendu : chip d'un destinataire ─────────────────────────
    // VIEW-1.3 : avatar + nom + email en lecture seule.
    // VIEW-1.1 : ajoute un bouton X de retrait, visible uniquement si
    // l'utilisateur courant est proprietaire (sinon il n'a pas le droit
    // de retirer un destinataire, cf. SHARE-1.3 cote serveur).
    function rendre_chip_destinataire(utilisateur, paquet, est_proprietaire) {
        var chip = $("<span></span>")
            .addClass("chip-destinataire")
            .attr("data-id-user", utilisateur.id_user);

        var avatar = $("<span></span>")
            .addClass("chip-avatar")
            .addClass(classe_avatar(utilisateur.id_user))
            .text(calculer_initiales(utilisateur.prenom, utilisateur.nom));
        chip.append(avatar);

        var libelle = utilisateur.prenom + " " + utilisateur.nom;
        chip.append($("<span></span>").addClass("chip-nom").text(libelle));
        chip.append($("<span></span>").addClass("chip-email").text(utilisateur.email));

        // Bouton X de retrait (VIEW-1.1) : seulement pour le proprietaire.
        if (est_proprietaire) {
            var bouton = $("<button></button>")
                .attr("type", "button")
                .addClass("chip-retirer")
                .attr(
                    "aria-label",
                    "Retirer " + utilisateur.prenom + " " + utilisateur.nom
                        + " du partage"
                );
            // SVG croix (icone constante, pas de contenu utilisateur).
            bouton.html(
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" '
                + 'stroke="currentColor" stroke-width="3" stroke-linecap="round" '
                + 'stroke-linejoin="round" aria-hidden="true">'
                + '<line x1="18" y1="6" x2="6" y2="18"></line>'
                + '<line x1="6" y1="6" x2="18" y2="18"></line></svg>'
            );
            bouton.on("click", function () {
                retirer_destinataire(paquet, utilisateur, chip);
            });
            chip.append(bouton);
        }

        return chip;
    }

    // ── Retrait d'un destinataire (VIEW-1.1) ───────────────────
    // 1. Confirmation utilisateur (action destructrice pour le partage).
    // 2. Appel DELETE /api/paquets/:id/share/:userId (SHARE-1.3 serveur).
    // 3. Sur succes : retire le chip du DOM, met a jour le compteur, et
    //    affiche un toast. Sur erreur : toast d'erreur, le chip reste.
    function retirer_destinataire(paquet, utilisateur, element_chip) {
        var nom = utilisateur.prenom + " " + utilisateur.nom;
        var message_confirm = "Retirer " + nom + " du partage de \""
            + paquet.titre + "\" ? Cette personne perdra l'acces au paquet.";
        if (!window.confirm(message_confirm)) {
            return;
        }

        var chemin = "paquets/" + paquet.id_paquet + "/share/" + utilisateur.id_user;
        AjaxService.supprimer(chemin, {
            succes: function () {
                element_chip.remove();
                mettre_a_jour_compteur_destinataires();
                if (window.Toast && typeof window.Toast.succes === "function") {
                    window.Toast.succes(nom + " a ete retire du partage.");
                }
            },
            erreur: function (xhr, message_erreur) {
                if (window.Toast && typeof window.Toast.erreur === "function") {
                    window.Toast.erreur(
                        "Impossible de retirer " + nom + " : " + message_erreur
                    );
                }
            }
        });
    }

    // Recompte les chips restants dans la liste et met a jour le badge
    // "N personne(s)" affiche dans l'en-tete de la section. On utilise
    // .find() (explicite dans le perimetre cours) plutot que .children()
    // (non listee).
    function mettre_a_jour_compteur_destinataires() {
        var conteneur = $("#vp-chips-liste");
        var nb = conteneur.find(".chip-destinataire").length;
        var libelle = nb + (nb > 1 ? " personnes" : " personne");
        $(".vp-destinataires .vp-section-count").text(libelle);

        // Si on vient de retirer le dernier destinataire, on affiche le
        // message d'etat vide a la place de la liste.
        if (nb === 0) {
            var section = $(".vp-destinataires");
            section.find(".vp-chips-liste").remove();
            section.append(
                $("<p></p>")
                    .addClass("vp-section-empty")
                    .text("Ce paquet n'est partage avec personne pour l'instant.")
            );
        }
    }

    // ── Rendu : section "Destinataires de partage" ──────────────
    function rendre_section_destinataires(destinataires, est_proprietaire, paquet) {
        var section = $("<section></section>").addClass("vp-section vp-destinataires");

        var entete = $("<div></div>").addClass("vp-section-head");
        entete.append(
            $("<h3></h3>")
                .addClass("vp-section-title")
                .text("Destinataires du partage")
        );
        entete.append(
            $("<span></span>")
                .addClass("vp-section-count")
                .text(destinataires.length + (destinataires.length > 1 ? " personnes" : " personne"))
        );
        section.append(entete);

        if (destinataires.length === 0) {
            var texte_vide = est_proprietaire
                ? "Ce paquet n'est partage avec personne pour l'instant."
                : "Vous etes la seule personne avec qui ce paquet est partage.";
            section.append(
                $("<p></p>").addClass("vp-section-empty").text(texte_vide)
            );
            return section;
        }

        var conteneur_chips = $("<div></div>")
            .addClass("vp-chips-liste")
            .attr("id", "vp-chips-liste");
        var i;
        for (i = 0; i < destinataires.length; i = i + 1) {
            conteneur_chips.append(
                rendre_chip_destinataire(destinataires[i], paquet, est_proprietaire)
            );
        }
        section.append(conteneur_chips);

        return section;
    }

    // ── Rendu : carte d'informations (titre, theme, date, proprietaire) ──
    function rendre_carte_infos(paquet, proprietaire) {
        var carte = $("<div></div>").addClass("card vp-carte-infos");

        var theme = paquet.theme;
        if (typeof theme !== "string" || theme === "") {
            theme = "Aucun theme renseigne";
        }
        carte.append($("<p></p>").addClass("vp-theme").text(theme));

        var infos = $("<div></div>").addClass("vp-meta-row");

        // Bloc "Cree le"
        var bloc_date = $("<div></div>").addClass("vp-meta-bloc");
        bloc_date.append($("<span></span>").addClass("vp-meta-label").text("Cree le"));
        bloc_date.append(
            $("<span></span>")
                .addClass("vp-meta-valeur")
                .text(formater_date_iso(paquet.date_creation))
        );
        infos.append(bloc_date);

        // Bloc "Proprietaire"
        if (proprietaire !== null) {
            var bloc_prop = $("<div></div>").addClass("vp-meta-bloc");
            bloc_prop.append($("<span></span>").addClass("vp-meta-label").text("Proprietaire"));
            var bloc_prop_val = $("<span></span>").addClass("vp-meta-valeur vp-meta-personne");
            bloc_prop_val.append(
                $("<span></span>")
                    .addClass("chip-avatar chip-avatar-sm")
                    .addClass(classe_avatar(proprietaire.id_user))
                    .text(calculer_initiales(proprietaire.prenom, proprietaire.nom))
            );
            bloc_prop_val.append(
                $("<span></span>").text(proprietaire.prenom + " " + proprietaire.nom)
            );
            bloc_prop.append(bloc_prop_val);
            infos.append(bloc_prop);
        }

        // Bloc "Scores" (seulement si proprietaire car la progression est
        // personnelle au proprietaire, cf. CLAUDE.md sec. 4).
        if (paquet.best_score !== null
            || paquet.last_score !== null) {
            var bloc_scores = $("<div></div>").addClass("vp-meta-bloc");
            bloc_scores.append($("<span></span>").addClass("vp-meta-label").text("Progression"));
            var record = (paquet.best_score === null) ? "—" : (paquet.best_score + "%");
            var dernier = (paquet.last_score === null) ? "—" : (paquet.last_score + "%");
            bloc_scores.append(
                $("<span></span>")
                    .addClass("vp-meta-valeur")
                    .text("Record " + record + "  -  Dernier " + dernier)
            );
            infos.append(bloc_scores);
        }

        carte.append(infos);
        return carte;
    }

    // ── Rendu : barre d'actions (boutons selon proprietaire) ────
    function rendre_barre_actions(paquet, est_proprietaire) {
        var actions = $("<div></div>").addClass("vp-actions");

        // Reviser : disponible pour tous (proprietaire + destinataire).
        var bouton_reviser = $("<a></a>")
            .attr("href", "#study-" + paquet.id_paquet)
            .addClass("btn btn-primary")
            .text("Reviser");
        actions.append(bouton_reviser);

        if (!est_proprietaire) {
            return actions;
        }

        // Actions reservees au proprietaire (CLAUDE.md sec. 5).
        var bouton_editer = $("<a></a>")
            .attr("href", "#edit-paquet-" + paquet.id_paquet)
            .addClass("btn btn-secondary")
            .text("Editer");
        actions.append(bouton_editer);

        var bouton_partager = $("<button></button>")
            .attr("type", "button")
            .addClass("btn btn-secondary")
            .text("Partager");
        bouton_partager.on("click", function () {
            if (typeof window.ouvrir_modale_partage === "function") {
                window.ouvrir_modale_partage(paquet.id_paquet, paquet.titre);
            }
        });
        actions.append(bouton_partager);

        var bouton_supprimer = $("<button></button>")
            .attr("type", "button")
            .addClass("btn btn-danger")
            .text("Supprimer");
        bouton_supprimer.on("click", function () {
            confirmer_suppression(paquet);
        });
        actions.append(bouton_supprimer);

        return actions;
    }

    // Confirmation de suppression simple via window.confirm (le cours
    // mentionne confirm). Une modale dediee pourrait etre ajoutee plus
    // tard si besoin (reutiliser modale-confirmation-suppression).
    function confirmer_suppression(paquet) {
        var message = "Supprimer le paquet \"" + paquet.titre + "\" ? "
            + "Cette action supprimera aussi les questions et les "
            + "partages associes, et elle est definitive.";
        if (!window.confirm(message)) {
            return;
        }
        AjaxService.supprimer("paquets/" + paquet.id_paquet, {
            succes: function () {
                if (window.Toast && typeof window.Toast.succes === "function") {
                    window.Toast.succes("Paquet supprime.");
                }
                window.location.hash = "#dashboard";
            },
            erreur: function (xhr, message) {
                if (window.Toast && typeof window.Toast.erreur === "function") {
                    window.Toast.erreur("Erreur : " + message);
                }
            }
        });
    }

    // ── Rendu : en-tete de page (retour + titre) ────────────────
    function rendre_entete(paquet, est_proprietaire) {
        var entete = $("<div></div>").addClass("page-title-row vp-page-head");

        var groupe_titre = $("<div></div>").addClass("vp-titre-groupe");
        var lien_retour = $("<a></a>")
            .attr("href", "#dashboard")
            .addClass("btn-retour")
            .attr("aria-label", "Retour au tableau de bord");
        // SVG fleche gauche (meme pictogramme que edition-paquet).
        lien_retour.html(
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" '
            + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
            + 'stroke-linejoin="round" aria-hidden="true">'
            + '<polyline points="15 18 9 12 15 6"></polyline></svg>'
        );
        groupe_titre.append(lien_retour);

        var bloc_titre = $("<div></div>");
        bloc_titre.append(
            $("<h2></h2>").addClass("page-title").text(paquet.titre)
        );
        bloc_titre.append(
            $("<p></p>").addClass("page-sub").text(
                est_proprietaire
                    ? "Vue de detail de votre paquet."
                    : "Paquet partage avec vous."
            )
        );
        groupe_titre.append(bloc_titre);
        entete.append(groupe_titre);

        // Les boutons d'action sont mis dans une 2e ligne ; on les ajoute
        // au container parent en complement (cf. fonction principale).
        return entete;
    }

    // ── Rendu principal a partir de la reponse API ──────────────
    function rendre(reponse) {
        var vue = $("#vue-visualisation-paquet");
        vue.empty();

        var paquet = reponse.paquet;
        var proprietaire = reponse.proprietaire;
        var destinataires = reponse.destinataires;
        var est_proprietaire = (reponse.est_proprietaire === true);

        vue.append(rendre_entete(paquet, est_proprietaire));
        vue.append(rendre_barre_actions(paquet, est_proprietaire));
        vue.append(rendre_carte_infos(paquet, proprietaire));
        vue.append(rendre_section_destinataires(destinataires, est_proprietaire, paquet));
    }

    // ── Point d'entree appele par le router ─────────────────────
    // Lit l'id depuis le hash, declenche l'appel API, gere chargement
    // et erreur. Expose en global pour app.js.
    function afficher_visualisation_paquet() {
        var hash = window.location.hash;
        var id_paquet = extraire_id_depuis_hash(hash);
        if (id_paquet === null) {
            afficher_erreur("L'identifiant du paquet est invalide.");
            return;
        }
        dernier_id_paquet = id_paquet;
        afficher_chargement();
        AjaxService.get("paquets/" + id_paquet, undefined, {
            succes: function (reponse) {
                // Le hash a pu changer entre temps : on ignore les
                // reponses pour des ids obsoletes (defense anti-race).
                if (id_paquet !== dernier_id_paquet) {
                    return;
                }
                rendre(reponse);
            },
            erreur: function (xhr, message) {
                if (id_paquet !== dernier_id_paquet) {
                    return;
                }
                // Si on a un code precis (403, 404), on affiche un message
                // plus parlant. Sinon on utilise le message generique du
                // wrapper AjaxService.
                if (xhr.status === 404) {
                    afficher_erreur("Ce paquet n'existe pas.");
                } else if (xhr.status === 403) {
                    afficher_erreur("Vous n'avez pas acces a ce paquet.");
                } else {
                    afficher_erreur(message);
                }
            }
        });
    }

    window.afficher_visualisation_paquet = afficher_visualisation_paquet;

}());
