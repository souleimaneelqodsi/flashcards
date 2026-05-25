// src/public/js/auth.js
// Validation client + soumission des formulaires d'authentification
// (AUTH-2.9, AUTH-2.10, AUTH-2.11).
//
// Regles imposees (CLAUDE.md section 6 + sujet TER) :
//   - validation au keyup / blur (rouge dynamique des qu'une mauvaise
//     saisie est detectee, pas seulement au submit) ;
//   - champ invalide : classe .champ-invalide (background + bordure
//     rouge), texte rouge ;
//   - message d'erreur sous le champ ;
//   - recap rouge en bas du formulaire avant submit ;
//   - submit bloque tant qu'il y a une erreur visible.
//
// Perimetre cours :
//   - $() selecteurs, .on(), .val(), .text(), .addClass(), .removeClass(),
//     .show(), .hide(), .empty(), .append(), .submit(), .preventDefault()
//   - regex via JavaScript natif (test / exec)
//   - AjaxService (BACK-2.4) pour les requetes ajax
//   - Toast (BACK-2.9) pour les feedbacks de succes / d'erreur

// ── Expressions regulieres ──────────────────────────────────────
// Email : login@domaine.extension. Volontairement stricte mais standard.
var REGEX_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// Date de naissance : 8 chiffres AAAAMMJJ (validation cote serveur
// completera avec checkdate pour les dates impossibles type 19999999).
var REGEX_DATE_AAAAMMJJ = /^[0-9]{8}$/;

// ── Helpers d'affichage d'erreur ────────────────────────────────
// Marque un champ comme invalide : ajoute la classe .champ-invalide,
// affiche le message sous le champ. Le champ devient visuellement rouge
// via la regle CSS deja definie (components.css).
function marquer_champ_invalide(id_input, id_message, texte_erreur) {
    $("#" + id_input).addClass("champ-invalide");
    var message = $("#" + id_message);
    message.text(texte_erreur);
    message.removeAttr("hidden");
}

// Marque un champ comme valide : retire la classe rouge et masque le
// message d'erreur.
function marquer_champ_valide(id_input, id_message) {
    $("#" + id_input).removeClass("champ-invalide");
    var message = $("#" + id_message);
    message.text("");
    message.attr("hidden", "hidden");
}

// Affiche le recap des erreurs en bas du formulaire (toutes les
// erreurs en cours), ou le masque si aucune erreur.
function afficher_recap_erreurs(id_recap, id_liste, erreurs) {
    var recap = $("#" + id_recap);
    var liste = $("#" + id_liste);
    liste.empty();
    var champs = [];
    var cle;
    for (cle in erreurs) {
        if (Object.prototype.hasOwnProperty.call(erreurs, cle)) {
            champs.push(cle);
        }
    }
    if (champs.length === 0) {
        recap.attr("hidden", "hidden");
        return;
    }
    var i;
    for (i = 0; i < champs.length; i = i + 1) {
        liste.append($("<li></li>").text(erreurs[champs[i]]));
    }
    recap.removeAttr("hidden");
}

// ── Validation Login (AUTH-2.10) ────────────────────────────────
// Verifie un champ du formulaire de login. Renvoie le message d'erreur
// (chaine vide si OK). La validation reelle est en deux temps :
// - sur keyup/blur : on appelle valider_champ_login pour le champ touche
// - au submit : on appelle valider_login_complet qui passe tous les champs

function valider_champ_login(nom_champ, valeur) {
    if (nom_champ === "email") {
        if (valeur === "") {
            return "L'email est obligatoire.";
        }
        if (!REGEX_EMAIL.test(valeur)) {
            return "Format d'email invalide.";
        }
        return "";
    }
    if (nom_champ === "mot_de_passe") {
        if (valeur === "") {
            return "Le mot de passe est obligatoire.";
        }
        return "";
    }
    return "";
}

function valider_login_complet() {
    var erreurs = {};
    var email = $("#login-email").val();
    var mdp   = $("#login-mot-de-passe").val();
    var e_email = valider_champ_login("email", email);
    var e_mdp   = valider_champ_login("mot_de_passe", mdp);
    if (e_email !== "") { erreurs.email = e_email; }
    if (e_mdp   !== "") { erreurs.mot_de_passe = e_mdp; }
    return erreurs;
}

function rafraichir_affichage_erreurs_login(erreurs) {
    if (erreurs.email) {
        marquer_champ_invalide("login-email", "erreur-login-email", erreurs.email);
    } else {
        marquer_champ_valide("login-email", "erreur-login-email");
    }
    if (erreurs.mot_de_passe) {
        marquer_champ_invalide("login-mot-de-passe", "erreur-login-mot-de-passe", erreurs.mot_de_passe);
    } else {
        marquer_champ_valide("login-mot-de-passe", "erreur-login-mot-de-passe");
    }
    afficher_recap_erreurs("recap-erreurs-login", "liste-erreurs-login", erreurs);
}

// Valide et met a jour l'affichage d'UN SEUL champ du formulaire de
// login. Utilise au keyup / blur : seul le champ en cours d'edition
// reagit (rouge si invalide, normal sinon), les autres champs ne sont
// pas touches. Le recap global, lui, n'apparait qu'au submit.
function valider_et_afficher_champ_login(nom_champ, id_input, id_message) {
    var valeur = $("#" + id_input).val();
    var message = valider_champ_login(nom_champ, valeur);
    if (message !== "") {
        marquer_champ_invalide(id_input, id_message, message);
    } else {
        marquer_champ_valide(id_input, id_message);
    }
}

// ── Validation Register (AUTH-2.9, AUTH-2.10) ───────────────────
// Verifie un champ du formulaire d'inscription.

function valider_champ_register(nom_champ, valeur, valeur_mdp) {
    if (nom_champ === "prenom") {
        if (valeur === "") {
            return "Le prenom est obligatoire.";
        }
        if (valeur.length > 100) {
            return "Le prenom est trop long (100 caracteres maximum).";
        }
        return "";
    }
    if (nom_champ === "nom") {
        if (valeur === "") {
            return "Le nom est obligatoire.";
        }
        if (valeur.length > 100) {
            return "Le nom est trop long (100 caracteres maximum).";
        }
        return "";
    }
    if (nom_champ === "email") {
        if (valeur === "") {
            return "L'email est obligatoire.";
        }
        if (valeur.length > 150) {
            return "L'email est trop long (150 caracteres maximum).";
        }
        if (!REGEX_EMAIL.test(valeur)) {
            return "Format d'email invalide.";
        }
        return "";
    }
    if (nom_champ === "date_naissance") {
        if (valeur === "") {
            return "La date de naissance est obligatoire.";
        }
        if (!REGEX_DATE_AAAAMMJJ.test(valeur)) {
            return "Date attendue au format AAAAMMJJ (ex : 19990315).";
        }
        return "";
    }
    if (nom_champ === "mot_de_passe") {
        if (valeur === "") {
            return "Le mot de passe est obligatoire.";
        }
        if (valeur.length < 6) {
            return "Le mot de passe doit faire au moins 6 caracteres.";
        }
        return "";
    }
    if (nom_champ === "mot_de_passe_confirme") {
        if (valeur === "") {
            return "Confirmation du mot de passe obligatoire.";
        }
        if (valeur !== valeur_mdp) {
            return "Les deux mots de passe ne correspondent pas.";
        }
        return "";
    }
    return "";
}

function valider_register_complet() {
    var erreurs = {};
    var prenom = $("#reg-prenom").val();
    var nom    = $("#reg-nom").val();
    var email  = $("#reg-email").val();
    var date   = $("#reg-date-naissance").val();
    var mdp    = $("#reg-mot-de-passe").val();
    var mdp2   = $("#reg-mot-de-passe-confirme").val();
    var e_prenom = valider_champ_register("prenom", prenom);
    var e_nom    = valider_champ_register("nom", nom);
    var e_email  = valider_champ_register("email", email);
    var e_date   = valider_champ_register("date_naissance", date);
    var e_mdp    = valider_champ_register("mot_de_passe", mdp);
    var e_mdp2   = valider_champ_register("mot_de_passe_confirme", mdp2, mdp);
    if (e_prenom !== "") { erreurs.prenom = e_prenom; }
    if (e_nom    !== "") { erreurs.nom = e_nom; }
    if (e_email  !== "") { erreurs.email = e_email; }
    if (e_date   !== "") { erreurs.date_naissance = e_date; }
    if (e_mdp    !== "") { erreurs.mot_de_passe = e_mdp; }
    if (e_mdp2   !== "") { erreurs.mot_de_passe_confirme = e_mdp2; }
    return erreurs;
}

function rafraichir_affichage_erreurs_register(erreurs) {
    var paires = [
        ["prenom",                 "reg-prenom",                 "erreur-reg-prenom"],
        ["nom",                    "reg-nom",                    "erreur-reg-nom"],
        ["email",                  "reg-email",                  "erreur-reg-email"],
        ["date_naissance",         "reg-date-naissance",         "erreur-reg-date-naissance"],
        ["mot_de_passe",           "reg-mot-de-passe",           "erreur-reg-mot-de-passe"],
        ["mot_de_passe_confirme",  "reg-mot-de-passe-confirme",  "erreur-reg-mot-de-passe-confirme"]
    ];
    var i;
    for (i = 0; i < paires.length; i = i + 1) {
        var cle = paires[i][0];
        var id_input = paires[i][1];
        var id_message = paires[i][2];
        if (erreurs[cle]) {
            marquer_champ_invalide(id_input, id_message, erreurs[cle]);
        } else {
            marquer_champ_valide(id_input, id_message);
        }
    }
    afficher_recap_erreurs("recap-erreurs-register", "liste-erreurs-register", erreurs);
}

// Valide et met a jour l'affichage d'UN SEUL champ du formulaire
// d'inscription. Utilise au keyup / blur : seul le champ en cours
// d'edition reagit, les autres ne sont pas touches. Pour la confirmation
// du mot de passe, on relit le mot de passe principal afin de comparer.
function valider_et_afficher_champ_register(nom_champ, id_input, id_message) {
    var valeur = $("#" + id_input).val();
    var valeur_mdp = $("#reg-mot-de-passe").val();
    var message = valider_champ_register(nom_champ, valeur, valeur_mdp);
    if (message !== "") {
        marquer_champ_invalide(id_input, id_message, message);
    } else {
        marquer_champ_valide(id_input, id_message);
    }
}

// ── Soumission Login (AUTH-2.11) ────────────────────────────────
// Envoi vers POST /api/auth/connexion via AjaxService. En cas de succes,
// redirection vers le dashboard. En cas d'erreur, message via Toast et
// affichage de l'erreur sous le champ approprie ou en recap.

function soumettre_login(evenement) {
    evenement.preventDefault();

    var erreurs = valider_login_complet();
    rafraichir_affichage_erreurs_login(erreurs);
    var nb_erreurs = 0;
    var cle;
    for (cle in erreurs) {
        if (Object.prototype.hasOwnProperty.call(erreurs, cle)) {
            nb_erreurs = nb_erreurs + 1;
        }
    }
    if (nb_erreurs > 0) {
        return;
    }

    var donnees = {
        email: $("#login-email").val(),
        mot_de_passe: $("#login-mot-de-passe").val()
    };

    AjaxService.post("auth/connexion", donnees, {
        succes: function (reponse) {
            // Le serveur a regenere le token CSRF a la connexion : on met a
            // jour la balise <meta> pour que les requetes suivantes envoient
            // le bon token (la SPA ne recharge pas la page).
            if (reponse && typeof reponse.csrf_token === "string") {
                $("meta[name='csrf-token']").attr("content", reponse.csrf_token);
            }
            // Memorise l'utilisateur connecte et affiche son identite dans
            // le chrome (la SPA ne rechargeant pas la page, le garde de
            // demarrage n'est pas rejoue).
            if (reponse && reponse.utilisateur) {
                Session.connecter(reponse.utilisateur);
            }
            Toast.succes("Connexion reussie.");
            window.location.hash = "#dashboard";
        },
        erreur: function (xhr, message) {
            // 401 (identifiants invalides) ou 400 (champs manquants).
            // Affiche le message en recap et un toast d'erreur.
            var erreurs_serveur = { _global: message };
            afficher_recap_erreurs("recap-erreurs-login", "liste-erreurs-login", erreurs_serveur);
            Toast.erreur(message);
        }
    });
}

// ── Soumission Register (AUTH-2.11) ─────────────────────────────
// Envoi vers POST /api/auth/inscription. En cas de succes, redirige
// vers la page de login (CLAUDE.md : "redirection post-inscription").

function soumettre_register(evenement) {
    evenement.preventDefault();

    var erreurs = valider_register_complet();
    rafraichir_affichage_erreurs_register(erreurs);
    var nb_erreurs = 0;
    var cle;
    for (cle in erreurs) {
        if (Object.prototype.hasOwnProperty.call(erreurs, cle)) {
            nb_erreurs = nb_erreurs + 1;
        }
    }
    if (nb_erreurs > 0) {
        return;
    }

    var donnees = {
        prenom: $("#reg-prenom").val(),
        nom: $("#reg-nom").val(),
        email: $("#reg-email").val(),
        date_naissance: $("#reg-date-naissance").val(),
        mot_de_passe: $("#reg-mot-de-passe").val()
    };

    AjaxService.post("auth/inscription", donnees, {
        succes: function () {
            Toast.succes("Compte cree. Vous pouvez vous connecter.");
            // Reinitialise le formulaire et bascule vers login.
            $("#form-register")[0].reset();
            window.location.hash = "#login";
        },
        erreur: function (xhr, message) {
            // Le serveur peut renvoyer 400 (erreurs de validation
            // detaillees par champ) ou 409 (email deja utilise).
            if (xhr.status === 400 && xhr.responseJSON && xhr.responseJSON.erreurs) {
                rafraichir_affichage_erreurs_register(xhr.responseJSON.erreurs);
                Toast.erreur("Veuillez corriger les erreurs du formulaire.");
                return;
            }
            if (xhr.status === 409) {
                marquer_champ_invalide("reg-email", "erreur-reg-email", message);
                afficher_recap_erreurs("recap-erreurs-register", "liste-erreurs-register", { email: message });
                Toast.erreur(message);
                return;
            }
            Toast.erreur(message);
        }
    });
}

// ── Bindings (AUTH-2.10) ─────────────────────────────────────────
// Pose les ecouteurs keyup / blur / submit. Le pattern est repete pour
// chaque champ : on revalide ce champ et on met a jour l'affichage.

$(function () {

    // ── Login : validation par champ au keyup / blur ──
    // Chaque champ ne valide que lui-meme : taper dans l'email ne doit pas
    // faire rougir le mot de passe encore vide. Le controle complet (tous
    // les champs + recap) se fait au submit (soumettre_login).
    $("#login-email").on("keyup blur", function () {
        valider_et_afficher_champ_login("email", "login-email", "erreur-login-email");
    });
    $("#login-mot-de-passe").on("keyup blur", function () {
        valider_et_afficher_champ_login("mot_de_passe", "login-mot-de-passe", "erreur-login-mot-de-passe");
    });
    $("#form-login").on("submit", soumettre_login);

    // ── Register : validation par champ au keyup / blur ──
    // Table (nom logique du champ, id de l'input, id du message d'erreur).
    var champs_register = [
        ["prenom",                "reg-prenom",                "erreur-reg-prenom"],
        ["nom",                   "reg-nom",                   "erreur-reg-nom"],
        ["email",                 "reg-email",                 "erreur-reg-email"],
        ["date_naissance",        "reg-date-naissance",        "erreur-reg-date-naissance"],
        ["mot_de_passe",          "reg-mot-de-passe",          "erreur-reg-mot-de-passe"],
        ["mot_de_passe_confirme", "reg-mot-de-passe-confirme", "erreur-reg-mot-de-passe-confirme"]
    ];
    var i;
    for (i = 0; i < champs_register.length; i = i + 1) {
        // Capture des valeurs dans une fonction nommee pour eviter le piege
        // classique de la cloture sur la variable de boucle.
        brancher_champ_register(champs_register[i][0], champs_register[i][1], champs_register[i][2]);
    }
    $("#form-register").on("submit", soumettre_register);

});

// Pose les ecouteurs keyup / blur sur un champ d'inscription donne. Sortie
// de la boucle pour que chaque ecouteur garde ses propres identifiants.
function brancher_champ_register(nom_champ, id_input, id_message) {
    $("#" + id_input).on("keyup blur", function () {
        valider_et_afficher_champ_register(nom_champ, id_input, id_message);
    });
}
