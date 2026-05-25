// src/public/js/router.js
// Router cote client de la SPA FlashCards MIAGE.
//
// Tres simple : ecoute les changements de `window.location.hash` et appelle
// le handler correspondant a la route demandee. Aucune dependance a la
// History API (hors cours). Le perimetre suit le PDF JavaScript du cours :
// uniquement `window.location.hash`, `$()`, `.on()` et un objet associatif
// pour la table des routes.
//
// Decoupage en sous-taches :
//   - BACK-2.1 : detection du hash et evenement de navigation (ce fichier).
//   - BACK-2.2 : mapping route -> vue (table `routes`, ajoutee plus bas).
//   - BACK-2.3 : route 404 + redirection fallback vers la route par defaut.
//
// Le router est expose en global via `window.Router` : pas de modules ES6
// (hors cours), un seul objet partage par toute la SPA.

var Router = (function () {

    // ── Etat interne ───────────────────────────────────────────────
    // Table des routes : `routes["#dashboard"] = function () { ... }`.
    // Remplie par les appels a `Router.ajouter(...)` depuis app.js.
    var routes = {};

    // Liste des prefixes de routes qui acceptent un suffixe id (ex :
    // "#visualisation-paquet-3"). Pour ces routes on resout sur le prefixe
    // avant de declencher le handler, qui pourra lire l'id sur
    // `window.location.hash` lui-meme.
    var routes_avec_id = [];

    // Route a afficher par defaut quand le hash est vide (premier chargement).
    var route_par_defaut = "#dashboard";

    // Handler personnalise pour la route 404 (BACK-2.3). Si non defini, le
    // router utilise une redirection automatique vers la route par defaut.
    var handler_404 = null;

    // Memoire de la derniere route resolue (utile pour deboguer / eviter de
    // redeclencher un rendu si le hash n'a pas reellement change).
    var route_courante = null;

    // ── API publique ───────────────────────────────────────────────

    // Enregistre un handler pour une route donnee (BACK-2.2).
    // Le hash doit etre fourni avec le diese : "#dashboard", "#profil", ...
    function ajouter(hash, handler) {
        routes[hash] = handler;
    }

    // Enregistre une route prefixe qui accepte un id en suffixe (BACK-2.3).
    // Exemple : `Router.ajouter_avec_id("#visualisation-paquet")` capture
    // `#visualisation-paquet-3`, `#visualisation-paquet-42`, etc. Le handler
    // doit avoir ete enregistre via `ajouter()` sur le prefixe lui-meme.
    function ajouter_avec_id(prefixe) {
        routes_avec_id.push(prefixe);
    }

    // Definit la route par defaut affichee au premier chargement.
    function definir_defaut(hash) {
        route_par_defaut = hash;
    }

    // Definit le handler de la route 404 (BACK-2.3). Le handler recoit le
    // hash demande comme parametre. S'il n'est pas defini, le router fait
    // une redirection automatique vers la route par defaut.
    function definir_404(handler) {
        handler_404 = handler;
    }

    // Renvoie le hash courant tel que vu dans la barre d'adresse. Si vide
    // ("/" ou pas de #), renvoie la route par defaut.
    function obtenir_hash_courant() {
        var hash = window.location.hash;
        if (hash === "" || hash === "#") {
            return route_par_defaut;
        }
        return hash;
    }

    // Resout le handler associe a un hash. Renvoie `null` si la route est
    // inconnue. Verifie aussi les routes prefixees (#visualisation-paquet-3
    // matche le prefixe "#visualisation-paquet" si declare via
    // `ajouter_avec_id`).
    function resoudre(hash) {
        if (typeof routes[hash] === "function") {
            return routes[hash];
        }
        // Essai sur les prefixes d'id : on parcourt la liste declaree et on
        // verifie si le hash commence par "prefixe-".
        var i;
        for (i = 0; i < routes_avec_id.length; i = i + 1) {
            var prefixe = routes_avec_id[i];
            if (hash.indexOf(prefixe + "-") === 0) {
                if (typeof routes[prefixe] === "function") {
                    return routes[prefixe];
                }
            }
        }
        return null;
    }

    // Declenche la navigation vers la route correspondant au hash courant.
    // - Si une route est trouvee : appelle son handler.
    // - Si le hash est introuvable et que `handler_404` est defini : appelle
    //   ce handler avec le hash demande.
    // - Sinon : redirige automatiquement vers la route par defaut (BACK-2.3).
    function naviguer() {
        var hash = obtenir_hash_courant();
        var handler = resoudre(hash);
        route_courante = hash;
        if (handler !== null) {
            handler(hash);
            return;
        }
        // Route inconnue : on gere le 404.
        if (typeof handler_404 === "function") {
            handler_404(hash);
            return;
        }
        // Pas de handler 404 declare : redirection automatique vers la route
        // par defaut. On change le hash, ce qui declenchera un nouvel appel
        // a `naviguer()` via l'evenement `hashchange`.
        window.location.hash = route_par_defaut;
    }

    // Demarre le router : bind l'evenement `hashchange` (jQuery) puis fait
    // un premier rendu pour la route initiale. A appeler une seule fois,
    // depuis app.js, apres que toutes les routes sont enregistrees.
    function demarrer() {
        $(window).on("hashchange", function () {
            naviguer();
        });
        naviguer();
    }

    // Renvoie le hash actuellement actif (utile pour les tests manuels et
    // pour la mise a jour de la sidebar - lien actif).
    function route_active() {
        return route_courante;
    }

    return {
        ajouter: ajouter,
        ajouter_avec_id: ajouter_avec_id,
        definir_defaut: definir_defaut,
        definir_404: definir_404,
        naviguer: naviguer,
        demarrer: demarrer,
        route_active: route_active
    };

}());

// Expose le router en global pour que app.js puisse y acceder.
window.Router = Router;
