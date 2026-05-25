// src/public/js/toast.js
// Composant toast d'erreur / succes / info cote front (BACK-2.9).
//
// Toast = mini-message non-bloquant en surimpression. Apparait en bas a
// droite, disparait apres quelques secondes. Utile pour confirmer un
// succes ("Paquet cree") ou notifier une erreur reseau (couple aux
// callbacks d'erreur de AjaxService).
//
// API publique :
//   Toast.succes("Texte court")
//   Toast.erreur("Texte court")
//   Toast.info("Texte court")
//
// Perimetre cours :
//   - $() selecteurs, .append(), .text(), .addClass(), .removeClass()
//   - setTimeout pour le retrait differe
//   - .on('click', ...) pour la fermeture manuelle

var Toast = (function () {

    // Duree d'affichage par defaut (en millisecondes).
    var duree_par_defaut = 4000;

    // S'assure que le conteneur racine des toasts existe dans le DOM. Il
    // est cree a la volee si absent (ainsi le composant fonctionne meme
    // sans element pre-existant dans la vue).
    function garantir_conteneur() {
        var conteneur = $("#toasts");
        if (conteneur.length === 0) {
            conteneur = $("<div></div>")
                .attr("id", "toasts")
                .addClass("toasts-conteneur");
            $("body").append(conteneur);
        }
        return conteneur;
    }

    // Affiche un toast avec le niveau et le message demande. Retire
    // automatiquement le toast apres `duree` millisecondes ; un clic
    // sur le toast le retire immediatement.
    function afficher(niveau, message, duree) {
        if (typeof duree !== "number") {
            duree = duree_par_defaut;
        }
        var conteneur = garantir_conteneur();

        var toast = $("<div></div>")
            .addClass("toast")
            .addClass("toast-" + niveau)
            .attr("role", "status");
        // .text() echappe automatiquement le message : pas d'XSS si le
        // message vient d'une reponse serveur.
        toast.text(message);

        // Bouton de fermeture explicite (croix).
        var bouton_fermer = $("<button></button>")
            .attr("type", "button")
            .addClass("toast-fermer")
            .attr("aria-label", "Fermer la notification")
            .text("×"); // caractere "×" (multiplication sign)
        toast.append(bouton_fermer);

        conteneur.append(toast);

        // Fermeture sur clic du bouton.
        bouton_fermer.on("click", function () {
            toast.remove();
        });

        // Fermeture automatique apres `duree` millisecondes.
        setTimeout(function () {
            toast.remove();
        }, duree);
    }

    function succes(message) {
        afficher("succes", message);
    }
    function erreur(message) {
        afficher("erreur", message);
    }
    function info(message) {
        afficher("info", message);
    }

    return {
        succes: succes,
        erreur: erreur,
        info: info,
        afficher: afficher
    };

}());

window.Toast = Toast;
