<?php
// src/public/index.php
// Point d'entree unique de la SPA FlashCards MIAGE.
// La navigation entre ecrans se fait cote client (jQuery), sans rechargement.
?>
<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlashCards MIAGE</title>
</head>
<body>
    <div id="app">
        <noscript>Cette application necessite JavaScript pour fonctionner.</noscript>
    </div>

    <script src="js/lib/jquery-3.7.1.min.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
