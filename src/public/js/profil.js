// src/public/js/profil.js
// Vue "Mon profil" de la SPA FlashCards MIAGE (complement AUTH-2).
//
// Reference visuelle : project-files/interface/my_profile.png.
//
// La structure HTML est statique dans app.php (section #vue-profil). Ce
// fichier se contente de :
//   - remplir les valeurs (nom, email, prenom, date de naissance, initiales)
//     a partir de l'utilisateur connecte (Session.utilisateur()) ;
//   - cabler le toggle de theme sombre du profil sur le systeme de theme
//     existant (theme.js), sans dupliquer sa logique ;
//   - cabler le bouton "Se deconnecter" sur Session.deconnexion().
//
// Les actions sans backend a ce stade (modifier l'avatar, changer le mot
// de passe, supprimer le compte) affichent un toast "a venir" : elles
// seront branchees quand les endpoints correspondants existeront.
//
// Perimetre des APIs : $() selecteurs, .text(), .on(), .click(),
// .addClass/.removeClass, .attr — tout dans le cours.

// Noms de mois (sans accents, comme le reste de l'UI) pour formater la
// date de naissance "AAAA-MM-JJ" en "JJ mois AAAA" (ex : "15 mars 1999").
var MOIS_FRANCAIS = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

// Transforme "1999-03-15" en "15 mars 1999". Si la date est absente ou
// mal formee, on renvoie la valeur telle quelle (robustesse).
function formater_date_naissance(date_iso) {
    if (typeof date_iso !== "string" || date_iso.length !== 10) {
        return date_iso;
    }
    var annee = date_iso.substring(0, 4);
    var mois = parseInt(date_iso.substring(5, 7), 10);
    var jour = parseInt(date_iso.substring(8, 10), 10);
    if (isNaN(mois) || mois < 1 || mois > 12 || isNaN(jour)) {
        return date_iso;
    }
    return jour + " " + MOIS_FRANCAIS[mois - 1] + " " + annee;
}

// Calcule les initiales "Prenom Nom" -> "PN".
function initiales_profil(prenom, nom) {
    var initiale_prenom = "";
    var initiale_nom = "";
    if (typeof prenom === "string" && prenom.length > 0) {
        initiale_prenom = prenom.charAt(0);
    }
    if (typeof nom === "string" && nom.length > 0) {
        initiale_nom = nom.charAt(0);
    }
    var initiales = (initiale_prenom + initiale_nom).toUpperCase();
    if (initiales === "") {
        return "?";
    }
    return initiales;
}

// Synchronise l'etat visuel du toggle de theme du profil avec le theme
// courant (lu sur <html data-theme>).
function synchroniser_toggle_theme_profil() {
    if ($("html").attr("data-theme") === "dark") {
        $("#theme-switch-profil").addClass("on");
    } else {
        $("#theme-switch-profil").removeClass("on");
    }
}

// Remplit la vue profil avec les donnees de l'utilisateur connecte.
// Appelee par le router (app.js) a chaque affichage de #profil. On utilise
// .text() (jamais .html()) pour neutraliser tout risque XSS.
function remplir_profil() {
    var utilisateur = Session.utilisateur();
    if (!utilisateur) {
        return;
    }
    $("#profil-initiales").text(initiales_profil(utilisateur.prenom, utilisateur.nom));
    $("#profil-nom").text(utilisateur.prenom + " " + utilisateur.nom);
    $("#profil-email").text(utilisateur.email);
    $("#profil-val-prenom").text(utilisateur.prenom);
    $("#profil-val-nom").text(utilisateur.nom);
    $("#profil-val-date").text(formater_date_naissance(utilisateur.date_naissance));
    $("#profil-val-email").text(utilisateur.email);
    appliquer_couleur_avatar(utilisateur.avatar);
    synchroniser_toggle_theme_profil();
    charger_stats_profil();
}

// ── Couleur d'avatar (F) ────────────────────────────────────────────
// Applique la couleur d'accent choisie au cercle des initiales, dans les
// trois endroits ou il apparait (carte profil, chip de la sidebar, topbar).
// La couleur vient de la colonne `avatar` (validee serveur contre une
// palette blanche), donc poser le style en dur est sans risque XSS. Si
// aucune couleur n'est definie, on laisse le style par defaut de la CSS.
function appliquer_couleur_avatar(couleur) {
    if (typeof couleur !== "string" || couleur.charAt(0) !== "#") {
        return;
    }
    var style = "background: " + couleur + ";";
    $("#profil-initiales").attr("style", style);
    $("#chip-initiales").attr("style", style);
    $("#topbar-initiales").attr("style", style);
}
window.appliquer_couleur_avatar = appliquer_couleur_avatar;

// ── Compteurs du profil (WIRE-1.4) ──────────────────────────────────
// Branche les 3 stats de la carte profil (Paquets / Record / Sessions)
// sur les vraies donnees, calculees a partir de GET /api/paquets :
//  - Paquets  : nombre de paquets dont l'utilisateur est proprietaire
//               (taille de la liste retournee).
//  - Record   : meilleur best_score parmi ses paquets (null si aucun
//               paquet n'a encore ete revise).
//  - Sessions : approximation = nombre de paquets dont last_score est
//               renseigne, i.e. revises au moins une fois. Le modele
//               actuel (CLAUDE.md §4) ne stocke pas de compteur de
//               sessions distinct ; cette approximation sera affinee
//               si une colonne dediee est ajoutee plus tard.
//
// Aucun nouvel endpoint backend n'est cree pour WIRE-1.4 : on reutilise
// GET /api/paquets (PAQ-1.1) qui renvoie deja best_score / last_score
// par paquet. Une session expiree (401) declenchera la redirection
// automatique vers login via AjaxService.
function charger_stats_profil() {
    AjaxService.get("paquets", undefined, {
        succes: function (reponse) {
            var paquets = (reponse && reponse.paquets) ? reponse.paquets : [];
            mettre_a_jour_stats_profil(paquets);
        },
        erreur: function () {
            // En cas d'erreur reseau, on laisse les "0" du markup par
            // defaut : pas de toast pour ne pas saturer (le profil est
            // une vue secondaire, l'erreur est non bloquante).
        }
    });
}

// Calcule et injecte les 3 stats dans le DOM. Separe de
// charger_stats_profil pour pouvoir etre teste manuellement avec une
// liste forgee en console.
function mettre_a_jour_stats_profil(paquets) {
    $("#profil-nb-paquets").text(paquets.length);

    var best_global = null;
    var nb_sessions = 0;
    var i;
    for (i = 0; i < paquets.length; i = i + 1) {
        var p = paquets[i];
        if (typeof p.best_score === "number") {
            if (best_global === null || p.best_score > best_global) {
                best_global = p.best_score;
            }
        }
        if (typeof p.last_score === "number") {
            nb_sessions = nb_sessions + 1;
        }
    }

    var libelle_record = (best_global === null) ? "—" : (best_global + "%");
    $("#profil-record").text(libelle_record);
    $("#profil-nb-sessions").text(nb_sessions);
}

// ════════════════════════════════════════════════════════════════════
// Edition du profil, changement de mot de passe, couleur d'avatar.
// Validation client en miroir du serveur (UtilisateurController) :
// champ rouge + message sous le champ + recap en bas (CLAUDE.md §6).
// ════════════════════════════════════════════════════════════════════

var REGEX_EMAIL_PROFIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

// Lit la valeur d'un champ en retirant les espaces de bord.
function lire_trim(id_champ) {
    var v = $("#" + id_champ).val();
    if (typeof v !== "string") {
        return "";
    }
    return v.replace(/^\s+|\s+$/g, "");
}

// Lit la valeur brute d'un champ (sans trim : utile pour les mots de
// passe ou un espace peut etre significatif).
function lire_brut(id_champ) {
    var v = $("#" + id_champ).val();
    if (typeof v !== "string") {
        return "";
    }
    return v;
}

// Toasts (raccourcis avec garde sur la presence du module Toast).
function toast_succes(message) {
    if (window.Toast && typeof window.Toast.succes === "function") {
        window.Toast.succes(message);
    }
}
function toast_erreur(message) {
    if (window.Toast && typeof window.Toast.erreur === "function") {
        window.Toast.erreur(message);
    }
}

// Marque un champ en rouge + affiche le message sous le champ.
function afficher_erreur_champ(id_champ, id_msg, texte) {
    $("#" + id_champ).addClass("champ-invalide");
    $("#" + id_msg).text(texte).removeAttr("hidden");
}

// Retire l'etat d'erreur d'un champ.
function effacer_erreur_champ(id_champ, id_msg) {
    $("#" + id_champ).removeClass("champ-invalide");
    $("#" + id_msg).attr("hidden", "hidden");
}

// Applique le resultat d'une validation de champ et empile le message
// dans le recap si une erreur est presente.
function appliquer_resultat(id_champ, id_msg, erreur, messages) {
    if (erreur !== "") {
        afficher_erreur_champ(id_champ, id_msg, erreur);
        messages.push(erreur);
    } else {
        effacer_erreur_champ(id_champ, id_msg);
    }
}

// Affiche (ou masque) le recap des erreurs en bas d'un formulaire.
function afficher_recap(id_recap, id_liste, messages) {
    var liste = $("#" + id_liste);
    liste.empty();
    var i;
    for (i = 0; i < messages.length; i = i + 1) {
        liste.append($("<li></li>").text(messages[i]));
    }
    if (messages.length > 0) {
        $("#" + id_recap).removeAttr("hidden");
    } else {
        $("#" + id_recap).attr("hidden", "hidden");
    }
}

// Vrai si la chaine AAAAMMJJ correspond a une date reelle (memes regles
// que checkdate cote serveur).
function date_reelle(aaaammjj) {
    var annee = parseInt(aaaammjj.substring(0, 4), 10);
    var mois  = parseInt(aaaammjj.substring(4, 6), 10);
    var jour  = parseInt(aaaammjj.substring(6, 8), 10);
    if (mois < 1 || mois > 12 || jour < 1 || jour > 31) {
        return false;
    }
    var date = new Date(annee, mois - 1, jour);
    return date.getFullYear() === annee
        && date.getMonth() === (mois - 1)
        && date.getDate() === jour;
}

// Convertit "1999-03-15" (DATE SQLite) en "19990315" (saisie AAAAMMJJ).
function date_iso_vers_aaaammjj(iso) {
    if (typeof iso !== "string" || iso.length !== 10) {
        return "";
    }
    return iso.substring(0, 4) + iso.substring(5, 7) + iso.substring(8, 10);
}

// ── Validateurs de champ (renvoient "" si valide, sinon le message) ──
function erreur_prenom(v) {
    if (v === "") {
        return "Le prénom est obligatoire.";
    }
    if (v.length > 100) {
        return "Le prénom est trop long (100 caractères maximum).";
    }
    return "";
}
function erreur_nom(v) {
    if (v === "") {
        return "Le nom est obligatoire.";
    }
    if (v.length > 100) {
        return "Le nom est trop long (100 caractères maximum).";
    }
    return "";
}
function erreur_email(v) {
    if (v === "") {
        return "L'email est obligatoire.";
    }
    if (v.length > 150) {
        return "L'email est trop long (150 caractères maximum).";
    }
    if (!REGEX_EMAIL_PROFIL.test(v)) {
        return "Format d'email invalide.";
    }
    return "";
}
function erreur_date(v) {
    if (v === "") {
        return "La date de naissance est obligatoire.";
    }
    if (!/^[0-9]{8}$/.test(v)) {
        return "Date attendue au format AAAAMMJJ (ex : 19990315).";
    }
    if (!date_reelle(v)) {
        return "Date de naissance invalide.";
    }
    return "";
}

// ── Modale d'edition du profil (D) ──────────────────────────────────
function ouvrir_modale_edition_profil() {
    var utilisateur = Session.utilisateur();
    if (!utilisateur) {
        return;
    }
    $("#edit-prenom").val(utilisateur.prenom || "");
    $("#edit-nom").val(utilisateur.nom || "");
    $("#edit-email").val(utilisateur.email || "");
    $("#edit-date").val(date_iso_vers_aaaammjj(utilisateur.date_naissance));
    effacer_erreur_champ("edit-prenom", "erreur-edit-prenom");
    effacer_erreur_champ("edit-nom", "erreur-edit-nom");
    effacer_erreur_champ("edit-date", "erreur-edit-date");
    effacer_erreur_champ("edit-email", "erreur-edit-email");
    afficher_recap("recap-erreurs-profil", "liste-erreurs-profil", []);
    $("#modale-edition-profil").removeAttr("hidden");
    $("#edit-prenom").focus();
}

function fermer_modale_edition_profil() {
    $("#modale-edition-profil").attr("hidden", "hidden");
}

// Valide les 4 champs du profil et alimente le recap. Renvoie true si OK.
function valider_form_profil() {
    var messages = [];
    appliquer_resultat("edit-prenom", "erreur-edit-prenom", erreur_prenom(lire_trim("edit-prenom")), messages);
    appliquer_resultat("edit-nom", "erreur-edit-nom", erreur_nom(lire_trim("edit-nom")), messages);
    appliquer_resultat("edit-date", "erreur-edit-date", erreur_date(lire_trim("edit-date")), messages);
    appliquer_resultat("edit-email", "erreur-edit-email", erreur_email(lire_trim("edit-email")), messages);
    afficher_recap("recap-erreurs-profil", "liste-erreurs-profil", messages);
    return messages.length === 0;
}

function soumettre_profil() {
    if (!valider_form_profil()) {
        return;
    }
    var payload = {
        prenom:         lire_trim("edit-prenom"),
        nom:            lire_trim("edit-nom"),
        date_naissance: lire_trim("edit-date"),
        email:          lire_trim("edit-email")
    };
    AjaxService.put("profil", payload, {
        succes: function (reponse) {
            if (reponse && reponse.utilisateur) {
                // Met a jour la session + le chrome (nom / initiales).
                Session.connecter(reponse.utilisateur);
            }
            fermer_modale_edition_profil();
            remplir_profil();
            toast_succes("Profil mis à jour.");
        },
        erreur: function (xhr, message) {
            traiter_erreur_serveur_profil(xhr, message);
        }
    });
}

// Decode une erreur serveur du profil : validation par champ -> recap +
// champs rouges ; erreur technique -> toast (pas de recap trompeur).
function traiter_erreur_serveur_profil(xhr, message_par_defaut) {
    var corps = null;
    if (xhr.responseJSON && typeof xhr.responseJSON === "object") {
        corps = xhr.responseJSON;
    }
    if (corps !== null && corps.erreurs && typeof corps.erreurs === "object") {
        var messages = [];
        if (corps.erreurs.prenom) {
            afficher_erreur_champ("edit-prenom", "erreur-edit-prenom", corps.erreurs.prenom);
            messages.push(corps.erreurs.prenom);
        }
        if (corps.erreurs.nom) {
            afficher_erreur_champ("edit-nom", "erreur-edit-nom", corps.erreurs.nom);
            messages.push(corps.erreurs.nom);
        }
        if (corps.erreurs.date_naissance) {
            afficher_erreur_champ("edit-date", "erreur-edit-date", corps.erreurs.date_naissance);
            messages.push(corps.erreurs.date_naissance);
        }
        if (corps.erreurs.email) {
            afficher_erreur_champ("edit-email", "erreur-edit-email", corps.erreurs.email);
            messages.push(corps.erreurs.email);
        }
        afficher_recap("recap-erreurs-profil", "liste-erreurs-profil", messages);
        return;
    }
    afficher_recap("recap-erreurs-profil", "liste-erreurs-profil", []);
    var message = message_par_defaut;
    if (corps !== null && typeof corps.erreur === "string") {
        message = corps.erreur;
    }
    toast_erreur("Impossible de mettre à jour le profil : " + message);
}

// ── Modale de changement de mot de passe (E / OPT-1.3) ──────────────
function ouvrir_modale_mot_de_passe() {
    $("#mdp-actuel").val("");
    $("#mdp-nouveau").val("");
    $("#mdp-confirmation").val("");
    effacer_erreur_champ("mdp-actuel", "erreur-mdp-actuel");
    effacer_erreur_champ("mdp-nouveau", "erreur-mdp-nouveau");
    effacer_erreur_champ("mdp-confirmation", "erreur-mdp-confirmation");
    afficher_recap("recap-erreurs-mdp", "liste-erreurs-mdp", []);
    $("#modale-mot-de-passe").removeAttr("hidden");
    $("#mdp-actuel").focus();
}

function fermer_modale_mot_de_passe() {
    $("#modale-mot-de-passe").attr("hidden", "hidden");
}

function erreur_mdp_actuel(v) {
    if (v === "") {
        return "Le mot de passe actuel est obligatoire.";
    }
    return "";
}
function erreur_mdp_nouveau(v) {
    if (v === "") {
        return "Le nouveau mot de passe est obligatoire.";
    }
    if (v.length < 6) {
        return "Le mot de passe doit faire au moins 6 caractères.";
    }
    return "";
}
function erreur_mdp_confirmation(v, nouveau) {
    if (v === "") {
        return "La confirmation est obligatoire.";
    }
    if (v !== nouveau) {
        return "Les deux mots de passe ne correspondent pas.";
    }
    return "";
}

function valider_form_mdp() {
    var actuel  = lire_brut("mdp-actuel");
    var nouveau = lire_brut("mdp-nouveau");
    var conf    = lire_brut("mdp-confirmation");
    var messages = [];
    appliquer_resultat("mdp-actuel", "erreur-mdp-actuel", erreur_mdp_actuel(actuel), messages);
    appliquer_resultat("mdp-nouveau", "erreur-mdp-nouveau", erreur_mdp_nouveau(nouveau), messages);
    appliquer_resultat("mdp-confirmation", "erreur-mdp-confirmation", erreur_mdp_confirmation(conf, nouveau), messages);
    afficher_recap("recap-erreurs-mdp", "liste-erreurs-mdp", messages);
    return messages.length === 0;
}

function soumettre_mdp() {
    if (!valider_form_mdp()) {
        return;
    }
    var payload = {
        mot_de_passe_actuel:       lire_brut("mdp-actuel"),
        nouveau_mot_de_passe:      lire_brut("mdp-nouveau"),
        confirmation_mot_de_passe: lire_brut("mdp-confirmation")
    };
    AjaxService.post("profil/mot-de-passe", payload, {
        succes: function () {
            fermer_modale_mot_de_passe();
            toast_succes("Mot de passe mis à jour.");
        },
        erreur: function (xhr, message) {
            traiter_erreur_serveur_mdp(xhr, message);
        }
    });
}

function traiter_erreur_serveur_mdp(xhr, message_par_defaut) {
    var corps = null;
    if (xhr.responseJSON && typeof xhr.responseJSON === "object") {
        corps = xhr.responseJSON;
    }
    if (corps !== null && corps.erreurs && typeof corps.erreurs === "object") {
        var messages = [];
        if (corps.erreurs.mot_de_passe_actuel) {
            afficher_erreur_champ("mdp-actuel", "erreur-mdp-actuel", corps.erreurs.mot_de_passe_actuel);
            messages.push(corps.erreurs.mot_de_passe_actuel);
        }
        if (corps.erreurs.nouveau_mot_de_passe) {
            afficher_erreur_champ("mdp-nouveau", "erreur-mdp-nouveau", corps.erreurs.nouveau_mot_de_passe);
            messages.push(corps.erreurs.nouveau_mot_de_passe);
        }
        if (corps.erreurs.confirmation_mot_de_passe) {
            afficher_erreur_champ("mdp-confirmation", "erreur-mdp-confirmation", corps.erreurs.confirmation_mot_de_passe);
            messages.push(corps.erreurs.confirmation_mot_de_passe);
        }
        afficher_recap("recap-erreurs-mdp", "liste-erreurs-mdp", messages);
        return;
    }
    afficher_recap("recap-erreurs-mdp", "liste-erreurs-mdp", []);
    var message = message_par_defaut;
    if (corps !== null && typeof corps.erreur === "string") {
        message = corps.erreur;
    }
    toast_erreur("Impossible de changer le mot de passe : " + message);
}

// ── Modale de couleur d'avatar (F) ──────────────────────────────────
function ouvrir_modale_avatar() {
    $("#modale-avatar").removeAttr("hidden");
}

function fermer_modale_avatar() {
    $("#modale-avatar").attr("hidden", "hidden");
}

function choisir_couleur_avatar(couleur) {
    AjaxService.post("profil/avatar", { couleur: couleur }, {
        succes: function (reponse) {
            if (reponse && reponse.utilisateur) {
                Session.connecter(reponse.utilisateur);
            }
            appliquer_couleur_avatar(couleur);
            fermer_modale_avatar();
            toast_succes("Avatar mis à jour.");
        },
        erreur: function (xhr, message) {
            fermer_modale_avatar();
            toast_erreur("Impossible de changer l'avatar : " + message);
        }
    });
}

window.remplir_profil = remplir_profil;

// ── Cablage des controles (une seule fois au chargement) ────────────
// La section #vue-profil etant statique dans app.php, ses elements
// existent des le depart : on pose les ecouteurs ici.
$(function () {

    // Toggle de theme du profil : on reutilise integralement la logique de
    // theme.js en declenchant le clic du switch de la sidebar, puis on
    // resynchronise l'etat visuel du toggle du profil.
    $("#theme-switch-profil").on("click", function () {
        $("#theme-switch").click();
        synchroniser_toggle_theme_profil();
    });

    // Deconnexion (action fonctionnelle).
    $("#btn-deconnexion-profil").on("click", function () {
        Session.deconnexion();
    });

    // Suppression du compte : non implementee (hors-sujet OPT-1.5).
    $("#btn-supprimer-compte").on("click", function () {
        Toast.info("Suppression du compte : fonctionnalité à venir.");
    });

    // ── Edition du profil (D) ──
    // Chaque ligne d'info ouvre la meme modale d'edition.
    $(".profil-info-bouton").on("click", function () {
        ouvrir_modale_edition_profil();
    });
    $("#btn-fermer-edition-profil").on("click", fermer_modale_edition_profil);
    $("#btn-annuler-edition-profil").on("click", fermer_modale_edition_profil);
    $("#modale-edition-profil").on("click", function (evenement) {
        if (evenement.target === this) {
            fermer_modale_edition_profil();
        }
    });
    // Validation dynamique : on valide au blur (rouge si invalide) et on
    // nettoie au keyup quand le champ redevient valide (CLAUDE.md §6).
    brancher_champ("edit-prenom", "erreur-edit-prenom", erreur_prenom);
    brancher_champ("edit-nom", "erreur-edit-nom", erreur_nom);
    brancher_champ("edit-date", "erreur-edit-date", erreur_date);
    brancher_champ("edit-email", "erreur-edit-email", erreur_email);
    $("#form-edition-profil").on("submit", function (evenement) {
        evenement.preventDefault();
        soumettre_profil();
    });

    // ── Changement de mot de passe (E) ──
    $("#btn-changer-mdp").on("click", function () {
        ouvrir_modale_mot_de_passe();
    });
    $("#btn-fermer-mot-de-passe").on("click", fermer_modale_mot_de_passe);
    $("#btn-annuler-mot-de-passe").on("click", fermer_modale_mot_de_passe);
    $("#modale-mot-de-passe").on("click", function (evenement) {
        if (evenement.target === this) {
            fermer_modale_mot_de_passe();
        }
    });
    brancher_champ("mdp-actuel", "erreur-mdp-actuel", erreur_mdp_actuel);
    brancher_champ("mdp-nouveau", "erreur-mdp-nouveau", erreur_mdp_nouveau);
    // La confirmation depend du nouveau mot de passe : validateur dedie.
    $("#mdp-confirmation").on("blur", function () {
        var e = erreur_mdp_confirmation(lire_brut("mdp-confirmation"), lire_brut("mdp-nouveau"));
        if (e !== "") {
            afficher_erreur_champ("mdp-confirmation", "erreur-mdp-confirmation", e);
        } else {
            effacer_erreur_champ("mdp-confirmation", "erreur-mdp-confirmation");
        }
    });
    $("#mdp-confirmation").on("keyup", function () {
        var e = erreur_mdp_confirmation(lire_brut("mdp-confirmation"), lire_brut("mdp-nouveau"));
        if (e === "") {
            effacer_erreur_champ("mdp-confirmation", "erreur-mdp-confirmation");
        }
    });
    $("#form-mot-de-passe").on("submit", function (evenement) {
        evenement.preventDefault();
        soumettre_mdp();
    });

    // ── Couleur d'avatar (F) ──
    $("#btn-modifier-avatar").on("click", function () {
        ouvrir_modale_avatar();
    });
    $("#btn-fermer-avatar").on("click", fermer_modale_avatar);
    $("#btn-annuler-avatar").on("click", fermer_modale_avatar);
    $("#modale-avatar").on("click", function (evenement) {
        if (evenement.target === this) {
            fermer_modale_avatar();
        }
    });
    $("#modale-avatar .avatar-swatch").on("click", function () {
        var couleur = $(this).attr("data-couleur");
        choisir_couleur_avatar(couleur);
    });

});

// Branche la validation dynamique d'un champ : blur valide (ajoute le
// rouge si invalide), keyup nettoie quand le champ redevient valide. Le
// validateur recoit la valeur trimee et renvoie "" si valide.
function brancher_champ(id_champ, id_msg, fn_erreur) {
    $("#" + id_champ).on("blur", function () {
        var erreur = fn_erreur(lire_trim(id_champ));
        if (erreur !== "") {
            afficher_erreur_champ(id_champ, id_msg, erreur);
        } else {
            effacer_erreur_champ(id_champ, id_msg);
        }
    });
    $("#" + id_champ).on("keyup", function () {
        if (fn_erreur(lire_trim(id_champ)) === "") {
            effacer_erreur_champ(id_champ, id_msg);
        }
    });
}
