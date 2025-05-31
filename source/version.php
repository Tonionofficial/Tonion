<?php
// Файл для проверки версии приложения
header("Content-Type: application/json");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Текущая версия приложения, должна совпадать с APP_VERSION в rpg.html
$version = "1.1.32";

// Возвращаем версию в формате JSON
echo json_encode([
    "success" => true,
    "version" => $version,
    "timestamp" => time()
]);
?> 