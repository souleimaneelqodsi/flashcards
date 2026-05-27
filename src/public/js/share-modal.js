// src/public/js/share-modal.js
// Modale de partage de paquet (SHARE-1.4) + auto-completion par email.
// Reference visuelle : project-files/interface/share_bag.png.
//
// Auto-completion en jQuery vanilla (keyup + AjaxService + render) - pas
// de jQuery UI ni d'autre lib externe (CLAUDE.md sec. 2). Debounce
// implemente avec setTimeout / clearTimeout (250 ms) pour ne pas envoyer
// une requete a chaque touche tapee.
//
// Sequence usage :
//   1) Un autre module (ex : dashboard.js) appelle
//      window.ouvrir_modale_partage(id_paquet, titre_paquet).
//   2) L'utilisateur tape un debut d'email -> debounce -> appel
//      GET /api/users/search?q=... (SHARE-1.1).
//   3) Les resultats sont rendus en liste cliquable (avatar initiales,
//      nom prenom, email). Clic sur un item -> selection (highlight +
//      checkmark + activation du bouton "Partager avec X").
//   4) Clic sur "Partager" -> POST /api/paquets/:id/share (SHARE-1.2).
//      Sur succes -> toast + fermeture. Sur erreur -> recap en bas.

(function () {

    // SVG du checkmark, utilise pour l'etat selectionne d'un item. On
    // l'injecte via .html(...) une fois car la chaine est hard-codee
    // (pas de risque XSS, pas de contenu utilisateur).
    var SVG_CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" '
        + 'fill="none" stroke="currentColor" stroke-width="3" '
        + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<polyline points="20 6 9 17 4 12"></polyline></svg>';

    // ── Etat interne de la modale ───────────────────────────────
    var id_paquet_courant = null;
    var titre_paquet_courant = "";
    // Objet utilisateur (toArray sans MDP) si selectionne, sinon null.
    var destinataire_selectionne = null;
    // Identifiant du timer de debounce keyup (null quand inactif).
    var timer_recherche = null;

    // ── Helpers d'affichage ─────────────────────────────────────

    // Calcule les initiales de l'avatar (prenom[0] + nom[0]).
    function calculer_initiales(prenom, nom) {
        var i_prenom = (typeof prenom === "string" && prenom.length > 0)
            ? prenom.charAt(0).toUpperCase()
            : "?";
        var i_nom = (typeof nom === "string" && nom.length > 0)
            ? nom.charAt(0).toUpperCase()
            : "?";
        return i_prenom + i_nom;
    }

    // Choix de la couleur d'avatar selon l'id_user (3 variantes
    // deterministes : violet / orange / bleu). Conforme aux palettes
    // de share_bag.png.
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

    // ── Etat / cycle de vie de la modale ────────────────────────

    // Texte par defaut du bandeau info (sans destinataire selectionne).
    // Stocke en constante pour pouvoir le restaurer apres une selection.
    var TEXTE_BANDEAU_DEFAUT = "Le destinataire recevra un accès en "
        + "lecture seule. Chaque utilisateur garde ses propres scores "
        + "et progressions.";

    // Reinitialise tous les champs au cas ou l'utilisateur reouvre la
    // modale apres une fermeture. Appelee a chaque ouverture et chaque
    // fermeture pour eviter tout etat "fantome".
    function reinitialiser() {
        $("#partage-recherche").val("");
        $("#partage-resultats").empty();
        $("#partage-bouton-confirmer").prop("disabled", true).text("Partager");
        $("#partage-recap-erreurs").attr("hidden", true).empty();
        $("#partage-info-bandeau").text(TEXTE_BANDEAU_DEFAUT);
        destinataire_selectionne = null;
        if (timer_recherche !== null) {
            clearTimeout(timer_recherche);
            timer_recherche = null;
        }
    }

    // Ouvre la modale pour un paquet donne. Expose en global pour
    // pouvoir etre appelee par dashboard.js (bouton Partager d'une
    // card-paquet) ou par d'autres ecrans plus tard (visualisation).
    function ouvrir(id_paquet, titre_paquet) {
        id_paquet_courant = id_paquet;
        titre_paquet_courant = (typeof titre_paquet === "string") ? titre_paquet : "";
        reinitialiser();
        $("#partage-sous-titre").text(titre_paquet_courant);
        $("#modale-partage").attr("hidden", false);
        $("#partage-recherche").focus();
    }
    window.ouvrir_modale_partage = ouvrir;

    function fermer() {
        $("#modale-partage").attr("hidden", true);
        reinitialiser();
        id_paquet_courant = null;
        titre_paquet_courant = "";
    }

    // ── Recherche d'utilisateurs (auto-completion) ──────────────

    // Declenche une recherche apres un debounce de 250 ms. Si
    // l'utilisateur tape plusieurs touches rapidement, on annule le
    // timer en cours et on en redemarre un nouveau.
    function declencher_recherche() {
        if (timer_recherche !== null) {
            clearTimeout(timer_recherche);
        }
        timer_recherche = setTimeout(function () {
            faire_recherche();
        }, 250);
    }

    // Appelle GET /api/users/search?q=... et rend le resultat.
    function faire_recherche() {
        // Trim manuel via regex (espaces en debut et en fin). On evite
        // $.trim() qui n'est pas dans le perimetre du cours.
        var q = $("#partage-recherche").val();
        q = q.replace(/^\s+|\s+$/g, "");

        // Toute modif du champ apres une selection invalide la
        // selection : on doit re-cliquer sur un item pour partager.
        destinataire_selectionne = null;
        $("#partage-bouton-confirmer").prop("disabled", true).text("Partager");

        if (q.length < 2) {
            $("#partage-resultats").empty();
            return;
        }

        AjaxService.get("users/search", { q: q }, {
            succes: function (reponse) {
                var utilisateurs = [];
                if (reponse && reponse.utilisateurs) {
                    utilisateurs = reponse.utilisateurs;
                }
                rendre_resultats(utilisateurs);
            },
            erreur: function (xhr, message) {
                $("#partage-resultats").empty().append(
                    $("<p></p>").addClass("partage-erreur").text("Erreur de recherche : " + message)
                );
            }
        });
    }

    // Rend la liste des resultats dans #partage-resultats.
    function rendre_resultats(utilisateurs) {
        var conteneur = $("#partage-resultats");
        conteneur.empty();
        if (utilisateurs.length === 0) {
            conteneur.append(
                $("<p></p>").addClass("partage-vide").text("Aucun utilisateur trouvé.")
            );
            return;
        }
        var i;
        for (i = 0; i < utilisateurs.length; i = i + 1) {
            conteneur.append(rendre_item(utilisateurs[i]));
        }
    }

    // Construit un item de la liste : avatar + nom/email + check.
    function rendre_item(utilisateur) {
        var ligne = $("<button></button>")
            .attr("type", "button")
            .addClass("partage-item")
            .attr("data-id-user", utilisateur.id_user);

        var avatar = $("<span></span>")
            .addClass("partage-avatar")
            .text(calculer_initiales(utilisateur.prenom, utilisateur.nom));
        // Couleur d'avatar reelle choisie par l'utilisateur (fonctionnalite
        // F, stockee dans la colonne avatar et renvoyee par /users/search).
        // Repli sur un degrade deterministe id_user % 3 si l'utilisateur
        // n'a pas encore choisi de couleur (conforme share_bag.png).
        if (typeof utilisateur.avatar === "string" && utilisateur.avatar.charAt(0) === "#") {
            avatar.attr("style", "background: " + utilisateur.avatar + ";");
        } else {
            avatar.addClass(classe_avatar(utilisateur.id_user));
        }
        ligne.append(avatar);

        var bloc_info = $("<span></span>").addClass("partage-info");
        bloc_info.append(
            $("<span></span>")
                .addClass("partage-nom")
                .text(utilisateur.prenom + " " + utilisateur.nom)
        );
        bloc_info.append(
            $("<span></span>")
                .addClass("partage-email")
                .text(utilisateur.email)
        );
        ligne.append(bloc_info);

        // Checkmark SVG : visible uniquement quand .partage-item-selectionne
        // (controle par CSS). On l'injecte une seule fois via .html() avec
        // une chaine hard-codee (pas de contenu utilisateur => pas de XSS).
        var check = $("<span></span>").addClass("partage-check");
        check.html(SVG_CHECK);
        ligne.append(check);

        ligne.on("click", function () {
            selectionner_destinataire(utilisateur, ligne);
        });

        return ligne;
    }

    function selectionner_destinataire(utilisateur, element_clique) {
        destinataire_selectionne = utilisateur;
        // Retire le highlight des autres lignes.
        $("#partage-resultats .partage-item").removeClass("partage-item-selectionne");
        element_clique.addClass("partage-item-selectionne");
        // Met a jour le libelle du bouton avec le prenom du destinataire.
        var libelle = "Partager avec " + utilisateur.prenom;
        $("#partage-bouton-confirmer").prop("disabled", false).text(libelle);
        // Contextualise le bandeau info avec le nom du destinataire,
        // conformement au mockup share_bag.png. On utilise .text() pour
        // echapper le nom (defense XSS).
        var bandeau_perso = utilisateur.prenom + " " + utilisateur.nom
            + " recevra un accès en lecture seule. Chaque utilisateur garde "
            + "ses propres scores et progressions.";
        $("#partage-info-bandeau").text(bandeau_perso);
    }

    // ── Confirmation du partage ─────────────────────────────────

    // Envoie POST /api/paquets/:id/share avec l'id_destinataire.
    function confirmer_partage() {
        if (destinataire_selectionne === null) {
            return;
        }
        if (id_paquet_courant === null) {
            return;
        }
        $("#partage-recap-erreurs").attr("hidden", true).empty();

        AjaxService.post(
            "paquets/" + id_paquet_courant + "/share",
            { id_destinataire: destinataire_selectionne.id_user },
            {
                succes: function (reponse) {
                    var nom = destinataire_selectionne.prenom;
                    fermer();
                    // Toast facultatif (le module Toast peut ne pas
                    // exister selon le chargement) : on appelle si
                    // disponible, on continue sans bloquer sinon.
                    if (window.Toast && typeof window.Toast.succes === "function") {
                        window.Toast.succes(
                            "Paquet partagé avec " + nom + "."
                        );
                    }
                },
                erreur: function (xhr, message) {
                    afficher_erreur(message);
                }
            }
        );
    }

    function afficher_erreur(message) {
        var recap = $("#partage-recap-erreurs");
        recap.empty();
        recap.append($("<p></p>").text(message));
        recap.attr("hidden", false);
    }

    // ── Branchement des evenements (DOM ready) ──────────────────
    $(function () {
        $("#partage-recherche").on("keyup", declencher_recherche);
        $("#partage-bouton-confirmer").on("click", confirmer_partage);
        $("#partage-bouton-annuler").on("click", fermer);
        $("#partage-bouton-fermer").on("click", fermer);
    });

}());
