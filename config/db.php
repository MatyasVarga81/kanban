<?php
// config/db.php
$dsn = 'mysql:host=localhost;dbname=kanban;charset=utf8';
$user = 'root'; $pass = 'jelszo';
$pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
