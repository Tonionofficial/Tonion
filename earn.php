<?php
$pdo = require_once 'db.php';

header('Content-Type: application/json');

// Константы для Telegram Bot
define('BOT_TOKEN', env('BOT_TOKEN'));
define('CHANNEL_ID_1', '@Tonion_Official'); // Для task1
define('CHANNEL_ID_2', '@Tonion_General'); // Для task2

// Функция для логирования критических ошибок
function debug_log($message, $data = null) {
    $log = date('Y-m-d H:i:s') . " - " . $message;
    if ($data !== null) {
        $log .= " - Data: " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    error_log($log);
}

// Функция проверки подписки на канал
function checkSubscription($telegram_id, $channel_id) {
    $url = "https://api.telegram.org/bot" . BOT_TOKEN . "/getChatMember";
    $data = [
        'chat_id' => $channel_id,
        'user_id' => $telegram_id
    ];
    
    $ch = curl_init($url . '?' . http_build_query($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);
    
    if ($response) {
        $result = json_decode($response, true);
        if ($result['ok']) {
            $status = $result['result']['status'];
            return in_array($status, ['member', 'administrator', 'creator']);
        }
    }
    
    return false;
}

// Получаем параметры запроса
$action = $_POST['action'] ?? '';
$telegram_id = $_POST['telegram_id'] ?? '';
$task = $_POST['task'] ?? '';

if (empty($telegram_id)) {
    echo json_encode(['success' => false, 'message' => 'Telegram ID не указан']);
    exit;
}

// Обработка различных действий
switch ($action) {
    case 'checkSubscription':
        $channel = $_POST['channel'] ?? '';
        if (empty($channel)) {
            echo json_encode(['success' => false, 'message' => 'Канал не указан']);
            exit;
        }
        
        $channel_id = '@' . $channel;
        $is_subscribed = checkSubscription($telegram_id, $channel_id);
        
        echo json_encode([
            'success' => true,
            'subscribed' => $is_subscribed,
            'message' => $is_subscribed ? 'Подписка активна' : 'Подписка не найдена'
        ]);
        break;

    case 'getScores':
        try {
            $checkUser = $pdo->prepare("SELECT * FROM users WHERE telegram_id = :telegram_id");
            $checkUser->execute(['telegram_id' => $telegram_id]);
            $user = $checkUser->fetch();

            if (!$user) {
                $createUser = $pdo->prepare("
                    INSERT INTO users (telegram_id, onion, candy, junk, coin, task1, task2, task3, task4, task5, task6)
                    VALUES (:telegram_id, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL)
                ");
                $createUser->execute(['telegram_id' => $telegram_id]);
                
                echo json_encode([
                    'success' => true,
                    'task1' => null,
                    'task2' => null,
                    'task3' => null,
                    'task4' => null,
                    'task5' => null,
                    'task6' => null,
                    'onion' => 0,
                    'candy' => 0,
                    'junk' => 0,
                    'coin' => 0
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'task1' => $user['task1'],
                    'task2' => $user['task2'],
                    'task3' => $user['task3'],
                    'task4' => $user['task4'] ?? null,
                    'task5' => $user['task5'] ?? null,
                    'task6' => $user['task6'] ?? null,
                    'onion' => $user['onion'],
                    'candy' => $user['candy'],
                    'junk' => $user['junk'],
                    'coin' => $user['coin']
                ]);
            }
        } catch (Exception $e) {
            debug_log("Ошибка при получении данных пользователя", ['error' => $e->getMessage()]);
            echo json_encode(['success' => false, 'message' => 'Ошибка при получении данных пользователя']);
        }
        break;

    case 'accept':
        try {
            if (!in_array($task, ['task1', 'task2', 'task3', 'task4', 'task5', 'task6'])) {
                echo json_encode(['success' => false, 'message' => 'Неверное имя задания']);
                exit;
            }

            $updateTask = $pdo->prepare("
                UPDATE users 
                SET $task = 0 
                WHERE telegram_id = :telegram_id
            ");
            $updateTask->execute(['telegram_id' => $telegram_id]);

            echo json_encode(['success' => true, 'message' => "Задание $task принято."]);
        } catch (Exception $e) {
            debug_log("Ошибка при принятии задания", ['error' => $e->getMessage()]);
            echo json_encode(['success' => false, 'message' => 'Ошибка при принятии задания']);
        }
        break;

    case 'claim':
        try {
            if (!in_array($task, ['task1', 'task2', 'task3', 'task4', 'task5', 'task6'])) {
                echo json_encode(['success' => false, 'message' => 'Неверное имя задания']);
                exit;
            }

            $checkStatus = $pdo->prepare("SELECT task1, task2, task3, referred_by FROM users WHERE telegram_id = :telegram_id");
            $checkStatus->execute(['telegram_id' => $telegram_id]);
            $taskStatus = $checkStatus->fetch();

            if ($task === 'task3') {
                if ($taskStatus['task1'] != 2 || $taskStatus['task2'] != 2) {
                    $resetTask = $pdo->prepare("
                        UPDATE users 
                        SET task3 = NULL 
                        WHERE telegram_id = :telegram_id
                    ");
                    $resetTask->execute(['telegram_id' => $telegram_id]);
                    
                    echo json_encode([
                        'success' => false,
                        'message' => 'Please subscribe to the channel firs',
                        'reset_task' => true
                    ]);
                    exit;
                }
            }

            if ($task === 'task1' || $task === 'task2') {
                $channelId = $task === 'task1' ? CHANNEL_ID_1 : CHANNEL_ID_2;
                if (!checkSubscription($telegram_id, $channelId)) {
                    echo json_encode(['success' => false, 'message' => 'Please subscribe to the channel first']);
                    exit;
                }
            }

            // Начисляем награду пользователю
            $reward = 50;
            $updateTask = $pdo->prepare("
                UPDATE users 
                SET $task = 2,
                    onion = onion + :reward
                WHERE telegram_id = :telegram_id
            ");
            $updateTask->execute([
                'reward' => $reward,
                'telegram_id' => $telegram_id
            ]);
            
            // Подробный лог о выполнении задания
            debug_log("Задание выполнено", [
                'user_id' => $telegram_id,
                'task' => $task,
                'reward' => $reward,
                'task_status' => 2 // Статус 2 означает "Награда получена"
            ]);

            // Если есть пригласивший, начисляем ему 20% от награды
            if ($taskStatus['referred_by']) {
                $referralBonus = round($reward * 0.2);
                // Добавим подробную отладочную информацию
                debug_log("Начисление реферального бонуса", [
                    'user_id' => $telegram_id, // Кто выполнил задание
                    'referrer_id' => $taskStatus['referred_by'], // Кому начислен бонус
                    'bonus' => $referralBonus,
                    'task' => $task,
                    'bonus_type' => 'task_completion' // Тип бонуса: за выполнение задания
                ]);
                
                // Используем разные имена параметров для каждого поля
                $updateReferrer = $pdo->prepare("
                    UPDATE users 
                    SET referral_bonus = referral_bonus + :bonus_ref 
                    WHERE telegram_id = :referrer_id
                ");
                $updateReferrer->execute([
                    'bonus_ref' => $referralBonus,
                    'referrer_id' => $taskStatus['referred_by']
                ]);
            }

            // Проверяем, выполнены ли все задания
            if ($task === 'task3' && $taskStatus['task1'] == 2 && $taskStatus['task2'] == 2) {
                // Все задания выполнены, проверяем наличие пригласившего
                if ($taskStatus['referred_by']) {
                    // Начисляем дополнительные 50 Onion пригласившему за полное выполнение
                    $completionBonus = 50;
                    // Добавим подробную отладочную информацию
                    debug_log("Начисление бонуса за выполнение всех заданий", [
                        'user_id' => $telegram_id, // Кто выполнил все задания
                        'referrer_id' => $taskStatus['referred_by'], // Кому начислен бонус
                        'bonus' => $completionBonus,
                        'bonus_type' => 'all_tasks_completion' // Тип бонуса: за выполнение всех заданий
                    ]);
                    
                    // Используем разные имена параметров для каждого поля
                    $updateReferrer = $pdo->prepare("
                        UPDATE users 
                        SET referral_bonus = referral_bonus + :bonus_ref,
                            total_referrals = total_referrals + 1 
                        WHERE telegram_id = :referrer_id
                    ");
                    $updateReferrer->execute([
                        'bonus_ref' => $completionBonus,
                        'referrer_id' => $taskStatus['referred_by']
                    ]);
                    
                    // Добавляем лог об увеличении total_referrals
                    debug_log("Увеличение счетчика total_referrals", [
                        'user_id' => $telegram_id,
                        'referrer_id' => $taskStatus['referred_by'],
                        'action' => 'total_referrals_increment',
                        'reason' => 'all_tasks_completed'
                    ]);
                }
            }

            echo json_encode(['success' => true, 'message' => 'Task completed successfully']);
        } catch (Exception $e) {
            debug_log("Ошибка при выполнении задания", ['error' => $e->getMessage()]);
            echo json_encode(['success' => false, 'message' => 'Ошибка при выполнении задания']);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Неизвестное действие']);
        break;
}