<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Подключаем файл с подключением к базе данных
$pdo = require_once 'db.php';

// Определяем токен бота из .env файла
$botToken = env('BOT_TOKEN');

// Получение данных из запроса Telegram
$rawContent = file_get_contents("php://input");
$update = json_decode($rawContent, true);

// Генерация уникального реферального кода
function generateReferralCode() {
    return bin2hex(random_bytes(5));
}

// Функция для отправки сообщений в Telegram
function sendTelegram($method, $data) {
    global $botToken;
    $url = "https://api.telegram.org/bot$botToken/$method";

    $options = [
        'http' => [
            'header'  => "Content-Type: application/json\r\n",
            'method'  => 'POST',
            'content' => json_encode($data),
        ],
    ];

    $context = stream_context_create($options);
    file_get_contents($url, false, $context);
}

// Функция для отправки фото в Telegram
function sendTelegramPhoto($chatId, $photoPath, $caption, $keyboard) {
    global $botToken;
    $url = "https://api.telegram.org/bot$botToken/sendPhoto";

    if (!file_exists($photoPath)) {
        error_log("[ERROR]: Файл изображения не найден: $photoPath");
        return false;
    }

    $postData = [
        'chat_id' => $chatId,
        'photo' => new CURLFile(realpath($photoPath)),
        'caption' => $caption,
        'reply_markup' => json_encode($keyboard)
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($httpCode !== 200) {
        error_log("[ERROR]: Ошибка отправки фото. Код HTTP: $httpCode. Ответ: $response");
    }

    curl_close($ch);
    return json_decode($response, true);
}

// Обработка команды /start
if (isset($update['message']) && strpos($update['message']['text'], '/start') === 0) {
    $chatId = $update['message']['chat']['id'];
    $telegramUsername = $update['message']['chat']['username'] ?? "Unknown";

    $referrerCode = null;
    if (strpos($update['message']['text'], '/start ') !== false) {
        $referrerCode = explode(' ', $update['message']['text'])[1] ?? null;
    }

    // Проверяем наличие пользователя в базе
    $stmt = $pdo->prepare("SELECT * FROM users WHERE telegram_id = ?");
    $stmt->execute([$chatId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $referralCode = generateReferralCode();

        $referredBy = null;
        if ($referrerCode) {
            $refStmt = $pdo->prepare("SELECT telegram_id FROM users WHERE referral_code = ?");
            $refStmt->execute([$referrerCode]);
            $referrer = $refStmt->fetch(PDO::FETCH_ASSOC);
            $referredBy = $referrer['telegram_id'] ?? null;
        }

        $stmt = $pdo->prepare("INSERT INTO users (telegram_id, username, referral_code, referred_by, total_spins, total_referrals) 
                               VALUES (?, ?, ?, ?, 0, 0)");
        $stmt->execute([$chatId, $telegramUsername, $referralCode, $referredBy]);
    }

    // Отправляем приветственное сообщение с изображением
    $imagePath = __DIR__ . "/source/images/welcome_image.jpg";
    $caption = "Hello👋, $telegramUsername! Launch the app and don't forget to visit our website and social😉";

    $keyboard = [
        'inline_keyboard' => [
            [['text' => "🚀 Launch App", 'web_app' => ['url' => 'https://tonion.io/webapp.html']]],
            [['text' => "🌐 Visit Website", 'url' => 'https://tonion.io']],
            [['text' => "📢 Join Telegram", 'url' => 'https://t.me/Tonion_Official']],
            [['text' => "🐦 Follow Twitter", 'url' => 'https://twitter.com/TONion_io']],
            [['text' => "🧅 Buy Tonion", 'url' => 'https://t.me/blum/app?startapp=memepadjetton_TONION_wQ75P-ref_2hCXbmgmXW']]
        ]
    ];

    if (!sendTelegramPhoto($chatId, $imagePath, $caption, $keyboard)) {
        sendTelegram("sendMessage", [
            'chat_id' => $chatId,
            'text' => $caption,
            'reply_markup' => json_encode($keyboard)
        ]);
    }
}

// Функция для начисления заработка и бонусов
function addEarnings($pdo, $telegramId, $amount) {
    try {
        $stmt = $pdo->prepare("UPDATE users SET total_earnings = total_earnings + ? WHERE telegram_id = ?");
        $stmt->execute([$amount, $telegramId]);

        $stmt = $pdo->prepare("SELECT referred_by FROM users WHERE telegram_id = ?");
        $stmt->execute([$telegramId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && $user['referred_by']) {
            $referrerId = $user['referred_by'];
            $bonus = $amount * 0.20;

            $stmt = $pdo->prepare("UPDATE users SET referral_bonus = referral_bonus + ? WHERE telegram_id = ?");
            $stmt->execute([$bonus, $referrerId]);

            sendTelegram("sendMessage", [
                'chat_id' => $referrerId,
                'text' => "Вам начислен бонус $bonus за активность вашего приглашенного пользователя!"
            ]);
        }
    } catch (PDOException $e) {
        file_put_contents("error_log.txt", "Ошибка в addEarnings: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
    }
}

// Пример вызова функции addEarnings
// addEarnings($pdo, $telegramId, $amount); // Раскомментируйте, если нужно вызвать

exit("OK");
?>