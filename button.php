<?php
$pdo = require_once 'db.php';
header("Content-Type: application/json");

// Логирование
$logFile = "button_debug_log.txt";
file_put_contents($logFile, "Запуск обработчика\n", FILE_APPEND);

// Получение данных из запроса
$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['telegramId'])) {
    file_put_contents($logFile, "Неверные входные данные: " . print_r($data, true) . PHP_EOL, FILE_APPEND);
    echo json_encode(["error" => "Invalid input"]);
    exit;
}

$telegramId = intval($data['telegramId']);
$username = $data['username'] ?? "unknown"; // Имя пользователя, если передано
$action = $_GET['action'] ?? null;

try {
    // Подключение к базе данных
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName", $dbUser, $dbPassword);
    file_put_contents($logFile, "Соединение с базой успешно\n", FILE_APPEND);

    if ($action === "getPoints") {
        // Получение текущих баллов и логин-стрика
        $stmt = $pdo->prepare("SELECT points, streak, last_login FROM users WHERE telegram_id = ?");
        $stmt->execute([$telegramId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            // Если пользователя нет, создаем запись с начальными параметрами
            $stmt = $pdo->prepare("INSERT INTO users (telegram_id, username, points, streak, last_login) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$telegramId, $username, 0, 1, date('Y-m-d')]);
            file_put_contents($logFile, "Новый пользователь добавлен: $telegramId, username: $username\n", FILE_APPEND);
            $points = 0;
            $streak = 1;
        } else {
            $points = $user['points'];
            $streak = $user['streak'];
            $lastLogin = $user['last_login'] ? new DateTime($user['last_login']) : null;
            $today = new DateTime();

            // Проверяем, нужно ли обновить streak
            if ($lastLogin && $lastLogin->diff($today)->days === 1) {
                $streak++; // Увеличиваем streak
                $stmt = $pdo->prepare("UPDATE users SET streak = ?, last_login = ? WHERE telegram_id = ?");
                $stmt->execute([$streak, $today->format('Y-m-d'), $telegramId]);
                file_put_contents($logFile, "Streak обновлён: $streak для пользователя $telegramId\n", FILE_APPEND);
            } elseif (!$lastLogin || $lastLogin->diff($today)->days > 1) {
                // Сброс streak, если прошло больше 1 дня
                $streak = 1;
                $stmt = $pdo->prepare("UPDATE users SET streak = ?, last_login = ? WHERE telegram_id = ?");
                $stmt->execute([$streak, $today->format('Y-m-d'), $telegramId]);
                file_put_contents($logFile, "Streak сброшен: $streak для пользователя $telegramId\n", FILE_APPEND);
            }
        }

        echo json_encode([
            "success" => true,
            "points" => $points,
            "streak" => $streak
        ]);
        exit;
    }

    // Добавление баллов (логика addPoints остаётся без изменений)
    if ($action === "addPoints") {
        $stmt = $pdo->prepare("UPDATE users SET points = points + 10 WHERE telegram_id = ?");
        $stmt->execute([$telegramId]);

        // Получение обновлённых баллов
        $stmt = $pdo->prepare("SELECT points FROM users WHERE telegram_id = ?");
        $stmt->execute([$telegramId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        $points = $user['points'];
        file_put_contents($logFile, "Баллы добавлены пользователю $telegramId. Текущие баллы: $points\n", FILE_APPEND);

        echo json_encode([
            "success" => true,
            "points" => $points
        ]);
        exit;
    }

    // Если действие не распознано
    echo json_encode(["error" => "Invalid action"]);
    file_put_contents($logFile, "Неизвестное действие: $action\n", FILE_APPEND);
    exit;
} catch (PDOException $e) {
    file_put_contents($logFile, "Ошибка базы: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
    echo json_encode(["error" => $e->getMessage()]);
    exit;
}
