<?php
$pdo = require_once 'db.php';

// Получаем данные запроса
$telegram_id = $_POST['telegram_id'] ?? null;
$device_info = $_POST['device_info'] ?? '{}';
$page = $_POST['page'] ?? 'unknown';

// Получаем IP-адрес
$ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $ip_address = $_SERVER['HTTP_X_FORWARDED_FOR'];
} elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
    $ip_address = $_SERVER['HTTP_CLIENT_IP'];
}

// Получаем текущее время и дату
$access_time = date('Y-m-d H:i:s');

// Получаем данные пользователя и обновляем IP
try {
    // Проверяем существование пользователя и получаем данные
    $stmt = $pdo->prepare("SELECT streak, onion, candy, junk, coin FROM users WHERE telegram_id = ?");
    $stmt->execute([$telegram_id]);
    $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Если пользователь существует, обновляем его IP-адрес
    if ($user_data) {
        // Проверяем наличие поля lastip в таблице users
        try {
            $updateStmt = $pdo->prepare("UPDATE users SET lastip = ? WHERE telegram_id = ?");
            $updateStmt->execute([$ip_address, $telegram_id]);
            
            // Логируем обновление IP
            error_log(sprintf("[IP UPDATE] User %s IP updated: %s", $telegram_id, $ip_address));
        } catch (Exception $ipError) {
            // Если поле отсутствует, логируем ошибку
            error_log("[ERROR] Failed to update IP, column may not exist: " . $ipError->getMessage());
        }
        
        // Формируем строку с ресурсами пользователя
        $resources = "Onion: {$user_data['onion']}, Candy: {$user_data['candy']}, Junk: {$user_data['junk']}, Coin: {$user_data['coin']}";
        $streak = $user_data['streak'] ?? 0;
    } else {
        $resources = "No resources";
        $streak = 0;
    }
    
    // Формируем лог в едину строку
    $log_entry = sprintf(
        "[ACCESS] %s - User: %s, IP: %s, Page: %s, Device: %s, Resources: [%s], Streak: %d",
        $access_time,
        $telegram_id,
        $ip_address,
        $page,
        $device_info,
        $resources,
        $streak
    );
    
    // Записываем в лог-файл
    error_log($log_entry);
    
    // Отвечаем успехом
    header('Content-Type: application/json');
    echo json_encode(['success' => true]);
    
} catch (Exception $e) {
    // Логируем ошибку, но не отправляем клиенту
    error_log("[ERROR] Failed to log user access: " . $e->getMessage());
    
    // Отвечаем успехом в любом случае, чтобы не блокировать работу приложения
    header('Content-Type: application/json');
    echo json_encode(['success' => true]);
} 