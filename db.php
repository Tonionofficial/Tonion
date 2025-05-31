<?php

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;

// Загружаем переменные окружения из .env файла
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Функция для безопасного получения переменных окружения
function env($key, $default = null) {
    return $_ENV[$key] ?? $default;
}

try {
    $host = env('DB_HOST', 'localhost');
    $dbname = env('DB_DATABASE');
    $username = env('DB_USERNAME');
    $password = env('DB_PASSWORD');
    $charset = env('DB_CHARSET', 'utf8mb4');

    $dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $pdo = new PDO($dsn, $username, $password, $options);
    return $pdo;
} catch (PDOException $e) {
    throw new Exception("Database connection failed: " . $e->getMessage());
}

