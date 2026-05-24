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
                        <span class="topbar-av">JD</span>
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

            </main>
        </div>
    </div>

    <script src="js/lib/jquery-3.7.1.min.js"></script>
    <script src="js/theme.js"></script>
    <script src="js/app.js"></script>
    <script src="js/dashboard.js"></script>
</body>
</html>
