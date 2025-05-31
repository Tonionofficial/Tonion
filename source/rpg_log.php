<?php
header('Content-Type: application/json');

// Включаем отображение всех ошибок для отладки
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Путь к лог-файлу
$logFilePath = __DIR__ . '/rpg_game_log.txt';

// Получаем данные из POST запроса
$postData = file_get_contents('php://input');
$data = json_decode($postData, true);

// Проверка наличия данных
if (!$data) {
    echo json_encode(['success' => false, 'message' => 'No data received']);
    exit;
}

// Получение идентификатора пользователя
$telegramId = $data['telegramId'] ?? 'unknown_user';
$timestamp = date('Y-m-d H:i:s');
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown_ip';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown_browser';

// Форматирование данных для записи в лог
$logEntry = "=== RPG GAME LOG ENTRY ===\n";
$logEntry .= "Date: $timestamp\n";
$logEntry .= "User: $telegramId\n";
$logEntry .= "IP: $ip\n";
$logEntry .= "User Agent: $userAgent\n";
$logEntry .= "----------------------------\n";

// Добавление информации о ресурсах
if (isset($data['resources']) && is_array($data['resources'])) {
    $logEntry .= "RESOURCES:\n";
    foreach ($data['resources'] as $resource => $amount) {
        $logEntry .= "  - $resource: $amount\n";
    }
    $logEntry .= "----------------------------\n";
}

// Добавление информации об инвентаре
if (isset($data['inventory']) && is_array($data['inventory'])) {
    $logEntry .= "INVENTORY:\n";
    foreach ($data['inventory'] as $item) {
        $itemId = $item['id'] ?? 'unknown';
        $itemName = $item['name'] ?? 'unknown';
        $itemQuantity = $item['quantity'] ?? '0';
        $logEntry .= "  - $itemId ($itemName): $itemQuantity\n";
    }
    $logEntry .= "----------------------------\n";
}

// Добавление информации об экипировке
if (isset($data['equipped']) && is_array($data['equipped'])) {
    $logEntry .= "EQUIPPED ITEMS:\n";
    foreach ($data['equipped'] as $slot => $item) {
        if (!empty($item)) {
            $itemId = is_array($item) ? ($item['id'] ?? 'unknown') : $item;
            $logEntry .= "  - $slot: $itemId\n";
        }
    }
    $logEntry .= "----------------------------\n";
}

$logEntry .= "=== END OF LOG ENTRY ===\n\n";

// Запись данных в лог-файл
$result = file_put_contents($logFilePath, $logEntry, FILE_APPEND);

// Возвращаем результат операции
if ($result !== false) {
    echo json_encode(['success' => true, 'message' => 'Data logged successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to write to log file']);
}
?> 