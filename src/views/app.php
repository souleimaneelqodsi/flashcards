<?php
// src/views/app.php
// Coquille HTML de la SPA FlashCards MIAGE (couche Vue du MVC).
// Servie par le front-controller pour toute requete non-API.
// La navigation entre ecrans se fait cote client (jQuery), sans rechargement.
?>
<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlashCards MIAGE</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/reset.css">
    <link rel="stylesheet" href="css/theme.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <link rel="stylesheet" href="css/edition-paquet.css">
</head>
<body>
    <div id="app">
        <noscript>Cette application necessite JavaScript pour fonctionner.</noscript>

        <div class="app-wrap">

            <!-- Sidebar gauche : logo, navigation, compte, toggle de theme -->
            <aside class="app-sidebar" id="sidebar">
                <div class="app-sidebar-logo">
                    <span class="sidebar-mark"></span>
                    <span>
                        <span class="brand">FlashCards</span>
                        <span class="brand-sub">MIAGE</span>
                    </span>
                </div>

                <nav class="nav-section">
                    <div class="nav-section-title">Navigation</div>
                    <a href="#dashboard" class="nav-link active" data-screen="dashboard">
                        <span class="nl-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                        </span>
                        <span class="nl-text">Tableau de bord</span>
                    </a>
                    <a href="#nouveau-paquet" class="nav-link" data-screen="nouveau-paquet">
                        <span class="nl-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </span>
                        <span class="nl-text">Nouveau paquet</span>
                    </a>
                    <a href="#partages" class="nav-link" data-screen="partages">
                        <span class="nl-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.6" y1="10.6" x2="15.4" y2="6.4"></line>
                                <line x1="8.6" y1="13.4" x2="15.4" y2="17.6"></line>
                            </svg>
                        </span>
                        <span class="nl-text">Partages avec moi</span>
                    </a>
                </nav>

                <nav class="nav-section">
                    <div class="nav-section-title">Compte</div>
                    <a href="#profil" class="nav-link" data-screen="profil">
                        <span class="nl-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <circle cx="12" cy="8" r="4"></circle>
                                <path d="M4 21c0-4 4-6 8-6s8 2 8 6"></path>
                            </svg>
                        </span>
                        <span class="nl-text">Mon profil</span>
                    </a>
                    <a href="#parametres" class="nav-link" data-screen="parametres">
                        <span class="nl-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"></path>
                            </svg>
                        </span>
                        <span class="nl-text">Parametres</span>
                    </a>
                </nav>

                <div class="app-sidebar-footer">
                    <!-- Bandeau utilisateur : avatar + identite, cliquable
                         pour acceder au profil (DASH-1.5). Les libelles sont
                         des stubs en attendant l'auth (AUTH-2). -->
                    <a href="#profil" class="user-chip" aria-label="Acceder a mon profil">
                        <span class="user-av">JD</span>
                        <span class="user-chip-info">
                            <span class="user-chip-name">Jean Dupont</span>
                            <span class="user-chip-role">M1 MIAGE</span>
                        </span>
                    </a>
                    <div class="theme-row">
                        <span>Theme sombre</span>
                        <button type="button" class="theme-switch" id="theme-switch" aria-label="Basculer le theme sombre ou clair"></button>
                    </div>
                </div>
            </aside>

            <main class="app-main">

                <!-- Header global : bouton menu, titre, recherche, actions compte -->
                <header class="app-topbar">
                    <button type="button" class="menu-btn" id="menu-btn" aria-label="Afficher ou masquer le menu">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                            <line x1="4" y1="7" x2="20" y2="7"></line>
                            <line x1="4" y1="12" x2="20" y2="12"></line>
                            <line x1="4" y1="17" x2="20" y2="17"></line>
                        </svg>
                    </button>

                    <h1 class="topbar-title" id="topbar-title">Tableau de bord</h1>

                    <div class="search-bar">
                        <svg class="search-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="7"></circle>
                            <line x1="16.5" y1="16.5" x2="21" y2="21"></line>
                        </svg>
                        <input type="text" placeholder="Rechercher un paquet..." aria-label="Rechercher un paquet">
                    </div>

                    <div class="topbar-actions">
                        <button type="button" class="icon-btn" aria-label="Notifications">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.7 21a2 2 0 0 1-3.4 0"></path>
                            </svg>
                            <span class="notif-dot"></span>
                        </button>
                        <a href="#profil" class="topbar-av" aria-label="Mon profil">JD</a>
                    </div>
                </header>

                <!-- Zone de contenu : la vue courante sera injectee ici.
                     Vue par defaut : tableau de bord (DASH-1). Le sujet TER
                     impose deux zones distinctes (Mes paquets / Partages avec
                     moi) : on les affiche en deux colonnes cote a cote, plutot
                     qu'en onglets comme dans le mockup. Les cartes seront
                     ajoutees en DASH-1.2 et 1.3. -->
                <div class="page-body" id="view">
                    <div class="page-title-row">
                        <div>
                            <h2 class="page-title">Tableau de bord</h2>
                            <p class="page-sub">Vos paquets et ceux qui vous ont ete partages.</p>
                        </div>
                        <!-- Entree principale vers la creation d'un paquet
                             (vue dediee a venir : route SPA #nouveau-paquet). -->
                        <a href="#nouveau-paquet" class="btn btn-primary" id="btn-nouveau-paquet">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span>Nouveau paquet</span>
                        </a>
                    </div>

                    <div class="dashboard-columns">

                        <!-- Colonne gauche : paquets dont l'utilisateur est proprietaire -->
                        <section class="dashboard-col" id="col-mes-paquets" aria-labelledby="titre-mes-paquets">
                            <div class="dashboard-col-head">
                                <h3 class="dashboard-col-title" id="titre-mes-paquets">Mes paquets</h3>
                                <span class="dashboard-col-count" id="compteur-mes-paquets">0</span>
                            </div>
                            <div class="dashboard-col-body" id="liste-mes-paquets">
                                <!-- Cartes injectees par js/dashboard.js (DASH-1.3). -->
                            </div>
                        </section>

                        <!-- Colonne droite : paquets recus en partage -->
                        <section class="dashboard-col" id="col-partages" aria-labelledby="titre-partages">
                            <div class="dashboard-col-head">
                                <h3 class="dashboard-col-title" id="titre-partages">Partages avec moi</h3>
                                <span class="dashboard-col-count" id="compteur-partages">0</span>
                            </div>
                            <div class="dashboard-col-body" id="liste-partages">
                                <!-- Cartes injectees par js/dashboard.js (DASH-1.3). -->
                            </div>
                        </section>

                    </div>
                </div>

                <!-- ════════════════════════════════════════════════
                     VUE : Edition d'un paquet (FRONT-2.1 - 2.5)
                     Masquee par defaut, activee par le dispatcher
                     hashchange dans app.js (route #nouveau-paquet ou
                     #paquet-<id>/edition). Le routeur SPA definitif
                     viendra en BACK-2.1.
                ════════════════════════════════════════════════ -->
                <section class="page-body view-screen" id="vue-edition-paquet" aria-labelledby="titre-edition-paquet" hidden>
                    <div class="page-title-row">
                        <div class="edition-titre-bloc">
                            <a href="#dashboard" class="btn-retour" aria-label="Retour au tableau de bord">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </a>
                            <h2 class="page-title" id="titre-edition-paquet">Nouveau paquet</h2>
                        </div>
                        <div class="edition-actions">
                            <a href="#dashboard" class="btn btn-secondary">Annuler</a>
                            <button type="button" class="btn btn-primary" id="btn-enregistrer-paquet">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                <span>Enregistrer le paquet</span>
                            </button>
                        </div>
                    </div>

                    <div class="edition-layout">

                        <!-- Colonne gauche : informations + apercu -->
                        <aside class="edition-infos">
                            <div>
                                <h3 class="edition-section-titre">Informations du paquet</h3>
                                <div class="form-group">
                                    <label class="form-label" for="paquet-titre">Titre <span class="req">*</span></label>
                                    <input type="text" id="paquet-titre" class="form-control" maxlength="150" value="Bases de donnees relationnelles" placeholder="Bases de donnees relationnelles">
                                    <p class="form-counter"><span id="paquet-titre-counter">33</span> / 150 caracteres</p>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="paquet-theme">Theme</label>
                                    <input type="text" id="paquet-theme" class="form-control" value="SQL et modelisation" placeholder="SQL et modelisation">
                                </div>
                            </div>

                            <div>
                                <h3 class="edition-section-titre">Apercu</h3>
                                <div class="apercu-card">
                                    <div class="apercu-card-titre" id="apercu-titre">Bases de donnees relationnelles</div>
                                    <div class="apercu-card-theme" id="apercu-theme">SQL et modelisation</div>
                                    <div class="apercu-card-count"><span id="apercu-count">2</span> cartes</div>
                                </div>
                            </div>
                        </aside>

                        <!-- Colonne droite : liste des questions du paquet -->
                        <main class="edition-questions">
                            <div class="edition-questions-head">
                                <h3 class="edition-section-titre">Questions (<span id="nb-questions">2</span>)</h3>
                            </div>

                            <div class="questions-liste" id="questions-liste">

                                <!-- Question stub n°1 (FRONT-2.1 : structure et liste). Les
                                     interactions (ajout, edition, suppression, validation)
                                     viennent en FRONT-2.2 a 2.5. -->
                                <article class="question-item" data-id-question="1">
                                    <span class="question-numero" aria-label="Question 1">1</span>
                                    <div class="question-corps">
                                        <p class="question-titre">Qu'est-ce que la normalisation 3NF ?</p>
                                        <p class="question-reponse-preview">Un schema est en 3NF si toute dependance fonctionnelle non triviale implique une cle.</p>
                                        <div class="question-difficulte" role="radiogroup" aria-label="Difficulte de la question 1">
                                            <button type="button" class="badge-diff badge-diff-facile active" data-difficulte="facile" role="radio" aria-checked="true">Facile</button>
                                            <button type="button" class="badge-diff badge-diff-moyen" data-difficulte="moyen" role="radio" aria-checked="false">Moyen</button>
                                            <button type="button" class="badge-diff badge-diff-difficile" data-difficulte="difficile" role="radio" aria-checked="false">Difficile</button>
                                        </div>
                                    </div>
                                    <button type="button" class="btn-supprimer-question" aria-label="Supprimer la question 1">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </article>

                                <article class="question-item" data-id-question="2">
                                    <span class="question-numero" aria-label="Question 2">2</span>
                                    <div class="question-corps">
                                        <p class="question-titre">Qu'est-ce qu'une jointure INNER JOIN ?</p>
                                        <p class="question-reponse-preview">Retourne les lignes communes aux deux tables selon une condition de jointure.</p>
                                        <div class="question-difficulte" role="radiogroup" aria-label="Difficulte de la question 2">
                                            <button type="button" class="badge-diff badge-diff-facile" data-difficulte="facile" role="radio" aria-checked="false">Facile</button>
                                            <button type="button" class="badge-diff badge-diff-moyen active" data-difficulte="moyen" role="radio" aria-checked="true">Moyen</button>
                                            <button type="button" class="badge-diff badge-diff-difficile" data-difficulte="difficile" role="radio" aria-checked="false">Difficile</button>
                                        </div>
                                    </div>
                                    <button type="button" class="btn-supprimer-question" aria-label="Supprimer la question 2">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </article>

                            </div>

                            <button type="button" class="btn-ajouter-question" id="btn-ajouter-question">
                                + Ajouter une question
                            </button>
                        </main>

                    </div>
                </section>

            </main>
        </div>
    </div>

    <!-- ════════════════════════════════════════════════
         Modale d'ajout / d'edition d'une question (FRONT-2.2).
         Pattern impose CLAUDE.md §6 : validation client en miroir de
         la validation serveur, champ rouge au keyup/blur + message
         sous champ + recap rouge en bas. La logique est dans
         js/edition-paquet.js.
    ════════════════════════════════════════════════ -->
    <div class="modale-overlay" id="modale-ajout-question" role="dialog" aria-modal="true" aria-labelledby="titre-modale-ajout-question" hidden>
        <div class="modale-boite">
            <div class="modale-titre-row">
                <!-- Le libelle est ajuste en JS selon le mode (ajout vs edition). -->
                <h3 class="modale-titre" id="titre-modale-ajout-question">Ajouter une question</h3>
                <button type="button" class="btn-fermer-modale" id="btn-fermer-modale-ajout" aria-label="Fermer la modale">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <form class="modale-corps" id="form-ajout-question" novalidate>
                <div class="form-group">
                    <label class="form-label" for="champ-question">Question <span class="req">*</span></label>
                    <textarea id="champ-question" name="question" class="form-control" placeholder="Saisissez la question..." required></textarea>
                    <p class="message-erreur" id="erreur-question" hidden>La question est obligatoire.</p>
                </div>

                <div class="form-group">
                    <label class="form-label" for="champ-reponse">Reponse <span class="req">*</span></label>
                    <textarea id="champ-reponse" name="reponse" class="form-control" placeholder="Saisissez la reponse..." required></textarea>
                    <p class="message-erreur" id="erreur-reponse" hidden>La reponse est obligatoire.</p>
                </div>

                <div class="form-group">
                    <label class="form-label">Difficulte</label>
                    <div class="modale-difficulte-row" role="radiogroup" aria-label="Difficulte de la nouvelle question">
                        <button type="button" class="badge-diff badge-diff-facile active" data-difficulte="facile" role="radio" aria-checked="true">Facile</button>
                        <button type="button" class="badge-diff badge-diff-moyen" data-difficulte="moyen" role="radio" aria-checked="false">Moyen</button>
                        <button type="button" class="badge-diff badge-diff-difficile" data-difficulte="difficile" role="radio" aria-checked="false">Difficile</button>
                    </div>
                </div>

                <div class="recap-erreurs modale-recap-erreurs" id="recap-erreurs-question" hidden>
                    <p>Veuillez corriger les erreurs ci-dessus avant de valider :</p>
                    <ul id="liste-erreurs-question"></ul>
                </div>

                <div class="modale-actions">
                    <button type="button" class="btn btn-secondary" id="btn-annuler-ajout-question">Annuler</button>
                    <!-- Le texte du bouton est ajuste en JS selon le mode. -->
                    <button type="submit" class="btn btn-primary" id="btn-valider-ajout-question">Ajouter la question</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ════════════════════════════════════════════════
         Modale de confirmation de suppression (FRONT-2.4).
         Affichee avant toute suppression destructrice d'une question
         pour eviter les clics accidentels.
    ════════════════════════════════════════════════ -->
    <div class="modale-overlay" id="modale-confirmation-suppression" role="dialog" aria-modal="true" aria-labelledby="titre-modale-suppression" hidden>
        <div class="modale-boite">
            <div class="modale-titre-row">
                <h3 class="modale-titre" id="titre-modale-suppression">Supprimer la question ?</h3>
                <button type="button" class="btn-fermer-modale" id="btn-fermer-modale-suppression" aria-label="Fermer la modale">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modale-corps">
                <p>Cette action est definitive. La question sera retiree du paquet et ne pourra pas etre restauree.</p>
            </div>
            <div class="modale-actions">
                <button type="button" class="btn btn-secondary" id="btn-annuler-suppression">Annuler</button>
                <button type="button" class="btn btn-danger" id="btn-confirmer-suppression">Supprimer</button>
            </div>
        </div>
    </div>

    <script src="js/lib/jquery-3.7.1.min.js"></script>
    <script src="js/theme.js"></script>
    <script src="js/app.js"></script>
    <script src="js/dashboard.js"></script>
    <script src="js/edition-paquet.js"></script>
</body>
</html>
