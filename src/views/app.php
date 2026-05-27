<?php
// src/views/app.php
// Coquille HTML de la SPA FlashCards MIAGE (couche Vue du MVC).
// Servie par le front-controller pour toute requete non-API.
// La navigation entre ecrans se fait cote client (jQuery), sans rechargement.
//
// Le front-controller (src/public/index.php) demarre la session PHP et
// initialise le token CSRF (AUTH-2.12) avant d'inclure ce fichier. On
// peut donc lire `$_SESSION['csrf_token']` ici pour l'exposer au front
// via la balise <meta name="csrf-token">.

require_once __DIR__ . '/../core/Csrf.php';
$csrf_token = Csrf::obtenir();
?>
<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($csrf_token, ENT_QUOTES, 'UTF-8'); ?>">
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
    <link rel="stylesheet" href="css/study.css">
    <link rel="stylesheet" href="css/profil.css">
    <link rel="stylesheet" href="css/share-modal.css">
    <link rel="stylesheet" href="css/visualisation-paquet.css">
</head>
<body>
    <div id="app">
        <noscript>Cette application necessite JavaScript pour fonctionner.</noscript>

        <!-- Loader global affiche pendant les requetes AJAX (BACK-2.6).
             Pilote par js/ajax.js : ajout/retrait de la classe ".visible". -->
        <div id="ajax-loader" class="ajax-loader" role="status" aria-live="polite" aria-label="Chargement en cours">
            <div class="ajax-loader-spinner"></div>
        </div>

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
                </nav>

                <div class="app-sidebar-footer">
                    <!-- Bandeau utilisateur : avatar + identite, cliquable
                         pour acceder au profil (DASH-1.5). Les libelles sont
                         des stubs en attendant l'auth (AUTH-2). -->
                    <a href="#profil" class="user-chip" aria-label="Acceder a mon profil">
                        <span class="user-av" id="chip-initiales"></span>
                        <span class="user-chip-info">
                            <span class="user-chip-name" id="chip-nom"></span>
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

                    <div class="topbar-actions">
                        <a href="#profil" class="topbar-av" id="topbar-initiales" aria-label="Mon profil"></a>
                    </div>
                </header>

                <!-- Zone de contenu : la vue courante est injectee ici par
                     le router cote client (BACK-2.2). Le contenu inline a ete
                     deplace dans js/dashboard.js (afficher_dashboard) pour
                     pouvoir etre rejoue a chaque navigation. -->
                <div class="page-body" id="view"></div>

                <!-- ════════════════════════════════════════════════
                     VUE : Visualisation d'un paquet (VIEW-1.3)
                     Affiche le titre, la date d'ajout, le proprietaire,
                     la liste des destinataires (chips). Si l'utilisateur
                     courant est proprietaire : liens Editer / Supprimer
                     / Partager + bouton Reviser. Sinon : Reviser
                     uniquement. Le contenu est injecte par
                     js/visualisation-paquet.js (afficher_visualisation_paquet)
                     a partir de GET /api/paquets/:id.
                ════════════════════════════════════════════════ -->
                <section class="page-body view-screen" id="vue-visualisation-paquet" hidden></section>

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
                                    <p class="message-erreur" id="erreur-paquet-titre" hidden>Le titre est obligatoire (150 caracteres maximum).</p>
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
                                    <div class="apercu-card-count"><span id="apercu-count">0</span> cartes</div>
                                </div>
                            </div>

                            <div class="recap-erreurs" id="recap-erreurs-paquet" hidden>
                                <p>Veuillez corriger les erreurs avant d'enregistrer le paquet :</p>
                                <ul id="liste-erreurs-paquet"></ul>
                            </div>
                        </aside>

                        <!-- Colonne droite : liste des questions du paquet -->
                        <div class="edition-questions">
                            <div class="edition-questions-head">
                                <h3 class="edition-section-titre">Questions (<span id="nb-questions">0</span>)</h3>
                            </div>

                            <!-- Liste des questions du paquet. Remplie par
                                 js/edition-paquet.js a partir de GET
                                 /api/paquets/:id/questions (QST-1.4 / QST-1.6)
                                 en mode edition, ou laissee vide en mode
                                 creation tant que le paquet n'est pas
                                 enregistre. -->
                            <div class="questions-liste" id="questions-liste"></div>

                            <button type="button" class="btn-ajouter-question" id="btn-ajouter-question">
                                + Ajouter une question
                            </button>
                        </div>

                    </div>
                </section>

                <!-- ════════════════════════════════════════════════
                     VUE : Mode etude (FRONT-2.6 - 2.14)
                     Reference visuelle : question_give_response.png,
                     current_revision.png. Masquee par defaut, activee
                     par le dispatcher hashchange sur #study-<id>.
                ════════════════════════════════════════════════ -->
                <section class="page-body view-screen" id="vue-study" aria-labelledby="study-titre" hidden>

                    <!-- Header de session : titre paquet + progression + compteur.
                         Les valeurs (titre, theme/nb-cartes, numero courant,
                         total, progression) sont remplies dynamiquement par
                         js/study.js a partir de GET /api/paquets/:id/study
                         (STUDY-1.1 / STUDY-1.3). -->
                    <div class="study-header">
                        <div class="study-header-info">
                            <div class="study-header-titre" id="study-titre"></div>
                            <div class="study-header-sous-titre" id="study-sous-titre"></div>
                        </div>
                        <div class="study-progress" role="progressbar" aria-label="Progression de la session">
                            <div class="study-progress-fill" id="study-progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="study-header-compteur"><span id="study-numero-courant">0</span> / <span id="study-total">0</span></div>
                    </div>

                    <div class="study-layout">

                        <!-- Zone principale : carte + evaluation -->
                        <div class="study-main">

                            <div class="study-difficulte-row">
                                <span class="badge" id="study-badge-difficulte"></span>
                            </div>

                            <!-- Face recto (question) : visible par defaut.
                                 Contenu rempli par js/study.js (STUDY-1.3). -->
                            <div class="study-carte study-carte-recto" id="study-carte-recto" tabindex="0" role="button" aria-label="Carte question - cliquer pour reveler la reponse">
                                <div class="study-carte-label">Question</div>
                                <p class="study-carte-contenu" id="study-question"></p>
                                <p class="study-carte-aide">Cliquer pour reveler la reponse</p>
                            </div>

                            <!-- Face verso (reponse) : masquee par defaut, FRONT-2.7. -->
                            <div class="study-carte study-carte-verso" id="study-carte-verso" tabindex="0" role="button" aria-label="Carte reponse - cliquer pour revoir la question" hidden>
                                <div class="study-carte-label">Reponse</div>
                                <p class="study-carte-contenu" id="study-reponse"></p>
                                <p class="study-carte-aide">Cliquer pour revoir la question</p>
                            </div>

                            <!-- Boutons d'evaluation : visibles uniquement face verso (FRONT-2.8) -->
                            <div class="study-evaluation" id="study-evaluation" hidden>
                                <button type="button" class="btn-evaluation btn-evaluation-savais" id="btn-savais">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    <span>Je savais !</span>
                                </button>
                                <button type="button" class="btn-evaluation btn-evaluation-revoir" id="btn-revoir">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                    <span>A revoir</span>
                                </button>
                            </div>

                            <!-- Indicateurs clavier (FRONT-2.9 active la navigation) -->
                            <div class="study-indicateurs-clavier" aria-hidden="true">
                                <span><span class="touche">Espace</span>retourner la carte</span>
                                <span><span class="touche">1</span>je savais <span class="touche">2</span>a revoir</span>
                                <span><span class="touche">&larr;</span><span class="touche">&rarr;</span>naviguer</span>
                            </div>
                        </div>

                        <!-- Panneau lateral : score + liste des questions de la session -->
                        <aside class="study-side" aria-label="Session en cours">
                            <h3 class="study-side-titre">Session en cours</h3>

                            <div class="study-score-card">
                                <div class="study-score-grand"><span id="study-score-pct">0</span>%</div>
                                <div class="study-score-label">Score actuel</div>
                                <div class="study-score-stats">
                                    <span class="score-pastille score-pastille-ok"><span id="study-correctes">0</span></span>
                                    <span class="score-pastille score-pastille-bad"><span id="study-mauvaises">0</span></span>
                                    <span class="score-pastille score-pastille-best"><span id="study-best">0</span>%</span>
                                </div>
                            </div>

                            <div>
                                <h4 class="study-liste-titre">Questions</h4>
                                <!-- Remplie dynamiquement par js/study.js (STUDY-1.3). -->
                                <ol class="study-liste" id="study-liste-questions"></ol>
                            </div>
                        </aside>
                    </div>
                </section>

                <!-- ════════════════════════════════════════════════
                     VUE : Connexion (AUTH-2.7)
                     Reference visuelle : project-files/interface/login.png.
                     Masquee par defaut, activee par la route #login. Le
                     mockup propose un layout 2 colonnes (panneau violet
                     a gauche + formulaire a droite) ; la structure
                     fonctionnelle (formulaire + validation + soumission
                     ajax) est ici, la fidelite visuelle complete
                     viendra avec une feuille de style dediee.
                ════════════════════════════════════════════════ -->
                <section class="page-body view-screen" id="vue-login" aria-labelledby="titre-login" hidden>
                    <div class="auth-fond">
                        <div class="auth-carte">
                            <h2 class="auth-titre" id="titre-login">Connexion</h2>
                            <p class="auth-sous-titre">Accedez a vos paquets de revisions.</p>

                            <!-- Le formulaire est soumis via js/auth.js en AJAX. L'attribut
                                 novalidate desactive la validation HTML5 du navigateur :
                                 toutes les verifications passent par notre validation JS
                                 (regex, longueur, presence) pour rester coherent avec la
                                 validation cote serveur (AuthController). -->
                            <form id="form-login" class="auth-form" novalidate>
                                <div class="form-group">
                                    <label class="form-label" for="login-email">Email <span class="req">*</span></label>
                                    <input type="email" id="login-email" name="email" class="form-control" autocomplete="email" required>
                                    <p class="message-erreur" id="erreur-login-email" hidden></p>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="login-mot-de-passe">Mot de passe <span class="req">*</span></label>
                                    <input type="password" id="login-mot-de-passe" name="mot_de_passe" class="form-control" autocomplete="current-password" required>
                                    <p class="message-erreur" id="erreur-login-mot-de-passe" hidden></p>
                                </div>

                                <div class="recap-erreurs" id="recap-erreurs-login" hidden>
                                    <p>Veuillez corriger les erreurs avant de continuer :</p>
                                    <ul id="liste-erreurs-login"></ul>
                                </div>

                                <button type="submit" class="btn btn-primary btn-full" id="btn-soumettre-login">Se connecter</button>
                            </form>

                            <p class="auth-bascule">
                                Pas encore de compte ?
                                <a href="#register" id="lien-vers-register">Creer un compte</a>
                            </p>
                        </div>
                    </div>
                </section>

                <!-- ════════════════════════════════════════════════
                     VUE : Inscription (AUTH-2.8)
                     Reference visuelle : project-files/interface/signup.png.
                     Double saisie du mot de passe (CLAUDE.md §6). La
                     validation dynamique (rouge au keyup/blur, message
                     sous champ, recap en bas, submit bloque) est en
                     auth.js (AUTH-2.10).
                ════════════════════════════════════════════════ -->
                <section class="page-body view-screen" id="vue-register" aria-labelledby="titre-register" hidden>
                    <div class="auth-fond">
                        <div class="auth-carte">
                            <h2 class="auth-titre" id="titre-register">Inscription</h2>
                            <p class="auth-sous-titre">Creez votre compte FlashCards MIAGE.</p>

                            <form id="form-register" class="auth-form" novalidate>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label" for="reg-prenom">Prenom <span class="req">*</span></label>
                                        <input type="text" id="reg-prenom" name="prenom" class="form-control" maxlength="100" autocomplete="given-name" required>
                                        <p class="message-erreur" id="erreur-reg-prenom" hidden></p>
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label" for="reg-nom">Nom <span class="req">*</span></label>
                                        <input type="text" id="reg-nom" name="nom" class="form-control" maxlength="100" autocomplete="family-name" required>
                                        <p class="message-erreur" id="erreur-reg-nom" hidden></p>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="reg-email">Email <span class="req">*</span></label>
                                    <input type="email" id="reg-email" name="email" class="form-control" maxlength="150" autocomplete="email" required>
                                    <p class="message-erreur" id="erreur-reg-email" hidden></p>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="reg-date-naissance">Date de naissance (AAAAMMJJ) <span class="req">*</span></label>
                                    <input type="text" id="reg-date-naissance" name="date_naissance" class="form-control" maxlength="8" pattern="[0-9]{8}" placeholder="19990315" inputmode="numeric" required>
                                    <p class="message-erreur" id="erreur-reg-date-naissance" hidden></p>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="reg-mot-de-passe">Mot de passe <span class="req">*</span></label>
                                    <input type="password" id="reg-mot-de-passe" name="mot_de_passe" class="form-control" autocomplete="new-password" required>
                                    <p class="message-erreur" id="erreur-reg-mot-de-passe" hidden></p>
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="reg-mot-de-passe-confirme">Confirmer le mot de passe <span class="req">*</span></label>
                                    <input type="password" id="reg-mot-de-passe-confirme" name="mot_de_passe_confirme" class="form-control" autocomplete="new-password" required>
                                    <p class="message-erreur" id="erreur-reg-mot-de-passe-confirme" hidden></p>
                                </div>

                                <div class="recap-erreurs" id="recap-erreurs-register" hidden>
                                    <p>Veuillez corriger les erreurs avant de creer votre compte :</p>
                                    <ul id="liste-erreurs-register"></ul>
                                </div>

                                <button type="submit" class="btn btn-primary btn-full" id="btn-soumettre-register">Creer mon compte</button>
                            </form>

                            <p class="auth-bascule">
                                Deja un compte ?
                                <a href="#login" id="lien-vers-login">Se connecter</a>
                            </p>
                        </div>
                    </div>
                </section>

                <!-- ════════════════════════════════════════════════
                     VUE : Recapitulatif de fin de session (FRONT-2.10)
                     Reference visuelle : end_of_session.png. Affichee
                     quand toutes les questions ont ete evaluees (route
                     #fin-session-<id>).
                ════════════════════════════════════════════════ -->
                <section class="page-body view-screen" id="vue-fin-session" aria-labelledby="fin-session-titre" hidden>
                    <div class="fin-session-fond">
                        <div class="fin-session-carte">
                            <svg class="fin-session-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M12 2l2.39 4.84L19.78 8l-3.89 3.79.92 5.36L12 14.77l-4.81 2.38.92-5.36L4.22 8l5.39-1.16L12 2z"></path>
                            </svg>
                            <h2 class="fin-session-titre" id="fin-session-titre">Session terminee !</h2>
                            <p class="fin-session-sous-titre" id="fin-session-paquet">Bases de donnees relationnelles - 24 cartes</p>

                            <div class="fin-session-score"><span id="fin-session-score-pct">75</span>%</div>
                            <p class="fin-session-detail"><span id="fin-session-reussies">18</span> sur <span id="fin-session-total">24</span> cartes reussies</p>

                            <div class="fin-session-stats">
                                <div class="fin-session-stat fin-session-stat-correctes">
                                    <div class="fin-session-stat-valeur" id="fin-session-correctes">18</div>
                                    <div class="fin-session-stat-label">Correctes</div>
                                </div>
                                <div class="fin-session-stat fin-session-stat-mauvaises">
                                    <div class="fin-session-stat-valeur" id="fin-session-mauvaises">6</div>
                                    <div class="fin-session-stat-label">A revoir</div>
                                </div>
                                <div class="fin-session-stat fin-session-stat-best">
                                    <div class="fin-session-stat-valeur"><span id="fin-session-best">92</span>%</div>
                                    <div class="fin-session-stat-label">Meilleur score</div>
                                </div>
                            </div>

                            <div class="fin-session-actions">
                                <a href="#study-1" class="btn btn-primary" id="btn-recommencer-session">Recommencer</a>
                                <a href="#dashboard" class="btn btn-secondary" id="btn-retour-dashboard">Tableau de bord</a>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ════════════════════════════════════════════════
                     VUE : Mon profil (complement AUTH-2)
                     Reference visuelle : project-files/interface/my_profile.png.
                     Structure statique ; les valeurs (nom, email, ...) sont
                     remplies par js/profil.js a partir de la session client.
                     Les compteurs (paquets / record / sessions) afficheront
                     les vraies stats quand FULL-2 / le mode etude les
                     fourniront ; pour un compte neuf ils valent 0.
                ════════════════════════════════════════════════ -->
                <section class="page-body view-screen" id="vue-profil" aria-labelledby="titre-profil" hidden>
                    <h2 class="sr-only" id="titre-profil">Mon profil</h2>
                    <div class="profil-layout">

                        <!-- Colonne gauche : carte violette identite + stats -->
                        <aside class="profil-carte">
                            <div class="profil-avatar-grand" id="profil-initiales" aria-hidden="true"></div>
                            <h3 class="profil-nom" id="profil-nom"></h3>
                            <p class="profil-email" id="profil-email"></p>
                            <div class="profil-stats">
                                <div class="profil-stat">
                                    <span class="profil-stat-valeur" id="profil-nb-paquets">0</span>
                                    <span class="profil-stat-label">Paquets</span>
                                </div>
                                <div class="profil-stat">
                                    <span class="profil-stat-valeur" id="profil-record">0%</span>
                                    <span class="profil-stat-label">Record</span>
                                </div>
                                <div class="profil-stat">
                                    <span class="profil-stat-valeur" id="profil-nb-sessions">0</span>
                                    <span class="profil-stat-label">Sessions</span>
                                </div>
                            </div>
                            <button type="button" class="profil-lien-avatar" id="btn-modifier-avatar">Modifier l'avatar</button>
                        </aside>

                        <!-- Colonne droite : infos du compte + reglages + actions -->
                        <div class="profil-droite">

                            <!-- Chaque ligne est cliquable (chevron) et ouvre la
                                 meme modale d'edition du profil (D). -->
                            <div class="card profil-info-card">
                                <button type="button" class="profil-info-row profil-info-bouton" aria-label="Modifier mes informations">
                                    <span class="profil-info-ic">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <circle cx="12" cy="8" r="4"></circle>
                                            <path d="M4 21c0-4 4-6 8-6s8 2 8 6"></path>
                                        </svg>
                                    </span>
                                    <span class="profil-info-txt">
                                        <span class="profil-info-label">Prenom</span>
                                        <span class="profil-info-valeur" id="profil-val-prenom"></span>
                                    </span>
                                    <span class="profil-chevron">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <polyline points="9 6 15 12 9 18"></polyline>
                                        </svg>
                                    </span>
                                </button>
                                <button type="button" class="profil-info-row profil-info-bouton" aria-label="Modifier mes informations">
                                    <span class="profil-info-ic">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2"></path>
                                            <line x1="4" y1="12" x2="14" y2="12"></line>
                                        </svg>
                                    </span>
                                    <span class="profil-info-txt">
                                        <span class="profil-info-label">Nom</span>
                                        <span class="profil-info-valeur" id="profil-val-nom"></span>
                                    </span>
                                    <span class="profil-chevron">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <polyline points="9 6 15 12 9 18"></polyline>
                                        </svg>
                                    </span>
                                </button>
                                <button type="button" class="profil-info-row profil-info-bouton" aria-label="Modifier mes informations">
                                    <span class="profil-info-ic">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                        </svg>
                                    </span>
                                    <span class="profil-info-txt">
                                        <span class="profil-info-label">Date de naissance</span>
                                        <span class="profil-info-valeur" id="profil-val-date"></span>
                                    </span>
                                    <span class="profil-chevron">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <polyline points="9 6 15 12 9 18"></polyline>
                                        </svg>
                                    </span>
                                </button>
                                <button type="button" class="profil-info-row profil-info-bouton" aria-label="Modifier mes informations">
                                    <span class="profil-info-ic">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                                            <polyline points="3 7 12 13 21 7"></polyline>
                                        </svg>
                                    </span>
                                    <span class="profil-info-txt">
                                        <span class="profil-info-label">Email</span>
                                        <span class="profil-info-valeur" id="profil-val-email"></span>
                                    </span>
                                    <span class="profil-chevron">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <polyline points="9 6 15 12 9 18"></polyline>
                                        </svg>
                                    </span>
                                </button>
                            </div>

                            <div class="card profil-reglages-card">
                                <div class="profil-reglage-row">
                                    <span class="profil-reglage-txt">
                                        <span class="profil-reglage-titre">Mode sombre</span>
                                        <span class="profil-reglage-sous">Changer l'apparence de l'application</span>
                                    </span>
                                    <button type="button" class="theme-switch" id="theme-switch-profil" aria-label="Basculer le theme sombre ou clair"></button>
                                </div>
                                <button type="button" class="profil-reglage-row profil-reglage-bouton" id="btn-changer-mdp">
                                    <span class="profil-reglage-txt">
                                        <span class="profil-reglage-titre">Mot de passe</span>
                                        <span class="profil-reglage-sous">Changer votre mot de passe</span>
                                    </span>
                                    <span class="profil-chevron">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <polyline points="9 6 15 12 9 18"></polyline>
                                        </svg>
                                    </span>
                                </button>
                            </div>

                            <div class="profil-actions">
                                <button type="button" class="btn btn-secondary" id="btn-deconnexion-profil">Se deconnecter</button>
                                <button type="button" class="btn profil-btn-supprimer" id="btn-supprimer-compte">Supprimer le compte</button>
                            </div>
                        </div>
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
         Modale de partage d'un paquet (SHARE-1.4).
         Reference visuelle : project-files/interface/share_bag.png.
         Auto-completion en jQuery vanilla (keyup + ajax + render),
         pas de jQuery UI (lib externe hors stack). La logique est
         dans js/share-modal.js ; le point d'entree global est
         window.ouvrir_modale_partage(id_paquet, titre).
    ════════════════════════════════════════════════ -->
    <div class="modale-overlay" id="modale-partage" role="dialog" aria-modal="true" aria-labelledby="titre-modale-partage" hidden>
        <div class="modale-boite modale-boite-partage">
            <div class="modale-titre-row">
                <div>
                    <h3 class="modale-titre" id="titre-modale-partage">Partager ce paquet</h3>
                    <p class="modale-sous-titre" id="partage-sous-titre"></p>
                </div>
                <button type="button" class="btn-fermer-modale" id="partage-bouton-fermer" aria-label="Fermer la modale">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div class="modale-corps">
                <label class="partage-label" for="partage-recherche">Rechercher un utilisateur</label>
                <div class="partage-input-wrap">
                    <svg class="partage-input-icone" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7"></circle>
                        <line x1="16.5" y1="16.5" x2="21" y2="21"></line>
                    </svg>
                    <input type="text" id="partage-recherche" class="form-control partage-input" placeholder="Email ou debut d'email..." autocomplete="off">
                </div>
                <div class="partage-resultats" id="partage-resultats" role="listbox" aria-label="Resultats de recherche"></div>
                <p class="partage-info-bandeau" id="partage-info-bandeau">Le destinataire recevra un acces en lecture seule. Chaque utilisateur garde ses propres scores et progressions.</p>
            </div>

            <div class="recap-erreurs modale-recap-erreurs" id="partage-recap-erreurs" hidden></div>

            <div class="modale-actions">
                <button type="button" class="btn btn-secondary" id="partage-bouton-annuler">Annuler</button>
                <button type="button" class="btn btn-primary" id="partage-bouton-confirmer" disabled>Partager</button>
            </div>
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

    <!-- ════════════════════════════════════════════════
         Modale d'edition du profil (D). Validation client en miroir de
         la validation serveur (UtilisateurController::valider_profil) :
         champ rouge au keyup/blur + message sous le champ + recap en bas
         (pattern impose CLAUDE.md §6). Logique dans js/profil.js.
    ════════════════════════════════════════════════ -->
    <div class="modale-overlay" id="modale-edition-profil" role="dialog" aria-modal="true" aria-labelledby="titre-modale-edition-profil" hidden>
        <div class="modale-boite">
            <div class="modale-titre-row">
                <h3 class="modale-titre" id="titre-modale-edition-profil">Modifier mes informations</h3>
                <button type="button" class="btn-fermer-modale" id="btn-fermer-edition-profil" aria-label="Fermer la modale">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <form class="modale-corps" id="form-edition-profil" novalidate>
                <div class="form-group">
                    <label class="form-label" for="edit-prenom">Prenom <span class="req">*</span></label>
                    <input type="text" id="edit-prenom" name="prenom" class="form-control" maxlength="100" required>
                    <p class="message-erreur" id="erreur-edit-prenom" hidden></p>
                </div>
                <div class="form-group">
                    <label class="form-label" for="edit-nom">Nom <span class="req">*</span></label>
                    <input type="text" id="edit-nom" name="nom" class="form-control" maxlength="100" required>
                    <p class="message-erreur" id="erreur-edit-nom" hidden></p>
                </div>
                <div class="form-group">
                    <label class="form-label" for="edit-date">Date de naissance (AAAAMMJJ) <span class="req">*</span></label>
                    <input type="text" id="edit-date" name="date_naissance" class="form-control" placeholder="19990315" maxlength="8" required>
                    <p class="message-erreur" id="erreur-edit-date" hidden></p>
                </div>
                <div class="form-group">
                    <label class="form-label" for="edit-email">Email <span class="req">*</span></label>
                    <input type="email" id="edit-email" name="email" class="form-control" maxlength="150" required>
                    <p class="message-erreur" id="erreur-edit-email" hidden></p>
                </div>
                <div class="recap-erreurs modale-recap-erreurs" id="recap-erreurs-profil" hidden>
                    <p>Veuillez corriger les erreurs ci-dessus avant de valider :</p>
                    <ul id="liste-erreurs-profil"></ul>
                </div>
                <div class="modale-actions">
                    <button type="button" class="btn btn-secondary" id="btn-annuler-edition-profil">Annuler</button>
                    <button type="submit" class="btn btn-primary" id="btn-valider-edition-profil">Enregistrer</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ════════════════════════════════════════════════
         Modale de changement de mot de passe (E / OPT-1.3). Validation
         client + serveur (>= 6 caracteres, confirmation identique, ancien
         mot de passe verifie cote serveur). Logique dans js/profil.js.
    ════════════════════════════════════════════════ -->
    <div class="modale-overlay" id="modale-mot-de-passe" role="dialog" aria-modal="true" aria-labelledby="titre-modale-mot-de-passe" hidden>
        <div class="modale-boite">
            <div class="modale-titre-row">
                <h3 class="modale-titre" id="titre-modale-mot-de-passe">Changer mon mot de passe</h3>
                <button type="button" class="btn-fermer-modale" id="btn-fermer-mot-de-passe" aria-label="Fermer la modale">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <form class="modale-corps" id="form-mot-de-passe" novalidate>
                <div class="form-group">
                    <label class="form-label" for="mdp-actuel">Mot de passe actuel <span class="req">*</span></label>
                    <input type="password" id="mdp-actuel" name="mot_de_passe_actuel" class="form-control" required>
                    <p class="message-erreur" id="erreur-mdp-actuel" hidden></p>
                </div>
                <div class="form-group">
                    <label class="form-label" for="mdp-nouveau">Nouveau mot de passe <span class="req">*</span></label>
                    <input type="password" id="mdp-nouveau" name="nouveau_mot_de_passe" class="form-control" required>
                    <p class="message-erreur" id="erreur-mdp-nouveau" hidden></p>
                </div>
                <div class="form-group">
                    <label class="form-label" for="mdp-confirmation">Confirmer le nouveau mot de passe <span class="req">*</span></label>
                    <input type="password" id="mdp-confirmation" name="confirmation_mot_de_passe" class="form-control" required>
                    <p class="message-erreur" id="erreur-mdp-confirmation" hidden></p>
                </div>
                <div class="recap-erreurs modale-recap-erreurs" id="recap-erreurs-mdp" hidden>
                    <p>Veuillez corriger les erreurs ci-dessus avant de valider :</p>
                    <ul id="liste-erreurs-mdp"></ul>
                </div>
                <div class="modale-actions">
                    <button type="button" class="btn btn-secondary" id="btn-annuler-mot-de-passe">Annuler</button>
                    <button type="submit" class="btn btn-primary" id="btn-valider-mot-de-passe">Mettre a jour</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ════════════════════════════════════════════════
         Modale de choix de couleur d'avatar (F). Variante "initiales
         colorees" : pas d'upload de fichier (hors perimetre du cours),
         la couleur est choisie dans la palette officielle et stockee
         dans la colonne avatar. Logique dans js/profil.js.
    ════════════════════════════════════════════════ -->
    <div class="modale-overlay" id="modale-avatar" role="dialog" aria-modal="true" aria-labelledby="titre-modale-avatar" hidden>
        <div class="modale-boite">
            <div class="modale-titre-row">
                <h3 class="modale-titre" id="titre-modale-avatar">Couleur de l'avatar</h3>
                <button type="button" class="btn-fermer-modale" id="btn-fermer-avatar" aria-label="Fermer la modale">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modale-corps">
                <p class="avatar-modale-info">Choisissez la couleur du cercle de vos initiales.</p>
                <div class="avatar-palette" role="group" aria-label="Couleurs disponibles">
                    <button type="button" class="avatar-swatch" data-couleur="#7C4DFF" style="background-color: #7C4DFF" aria-label="Violet"></button>
                    <button type="button" class="avatar-swatch" data-couleur="#FF6584" style="background-color: #FF6584" aria-label="Rose"></button>
                    <button type="button" class="avatar-swatch" data-couleur="#22C55E" style="background-color: #22C55E" aria-label="Vert"></button>
                    <button type="button" class="avatar-swatch" data-couleur="#F59E0B" style="background-color: #F59E0B" aria-label="Orange"></button>
                    <button type="button" class="avatar-swatch" data-couleur="#3B82F6" style="background-color: #3B82F6" aria-label="Bleu"></button>
                    <button type="button" class="avatar-swatch" data-couleur="#EC4899" style="background-color: #EC4899" aria-label="Magenta"></button>
                    <button type="button" class="avatar-swatch" data-couleur="#14B8A6" style="background-color: #14B8A6" aria-label="Turquoise"></button>
                    <button type="button" class="avatar-swatch" data-couleur="#6366F1" style="background-color: #6366F1" aria-label="Indigo"></button>
                </div>
            </div>
            <div class="modale-actions">
                <button type="button" class="btn btn-secondary" id="btn-annuler-avatar">Fermer</button>
            </div>
        </div>
    </div>

    <script src="js/lib/jquery-3.7.1.min.js"></script>
    <script src="js/theme.js"></script>
    <script src="js/toast.js"></script>
    <script src="js/ajax.js"></script>
    <script src="js/router.js"></script>
    <script src="js/dashboard.js"></script>
    <script src="js/edition-paquet.js"></script>
    <script src="js/share-modal.js"></script>
    <script src="js/visualisation-paquet.js"></script>
    <script src="js/study.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/session.js"></script>
    <script src="js/profil.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
