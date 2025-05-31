<?php
header('Content-Type: application/json');
$pdo = require_once 'db.php';

// Получаем параметры запроса
$data = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? '';
$telegramId = $data['telegramId'] ?? '';

// Функция для обновления очков пользователя
function updatePoints($pdo, $telegramId, $type, $amount, $baseAmount = null, $streakBonus = 0) {
    $validTypes = ['onion', 'candy', 'junk', 'coin'];
    if (!in_array($type, $validTypes)) {
        return false;
    }

    try {
        // Получаем streak пользователя, если не передан
        if ($streakBonus <= 0 && $type === 'onion') {
            $stmtStreak = $pdo->prepare("SELECT streak FROM users WHERE telegram_id = :telegram_id");
            $stmtStreak->execute(['telegram_id' => $telegramId]);
            $streakData = $stmtStreak->fetch();
            $streakBonus = $streakData['streak'] ?? 0;
        }

        // Рассчитываем дополнительный бонус для Onion от streak
        $bonusAmount = 0;
        if ($type === "onion" && $streakBonus > 0) {
            // Если baseAmount передан, используем его, иначе используем amount
            $baseValue = $baseAmount ?? $amount;
            
            // Ограничиваем максимальный бонус до 200%
            $maxBonusPercent = 200;
            $percentPerDay = 3;
            $currentBonusPercent = min($streakBonus * $percentPerDay, $maxBonusPercent);
            
            $bonusAmount = floor($baseValue * ($currentBonusPercent / 100));
            // Общая сумма с учетом бонуса
            $totalAmount = $baseValue + $bonusAmount;
            
            // Если baseAmount передан, используем общую сумму
            if ($baseAmount !== null) {
                $amount = $totalAmount;
            } else {
                $amount = $amount + $bonusAmount;
            }
        }

        // Начисляем очки пользователю
        // Если тип Onion, также увеличиваем slider_onion
        if ($type === 'onion') {
            $stmt = $pdo->prepare("UPDATE users SET onion = onion + :amount, slider_onion = COALESCE(slider_onion, 0) + :slider_amount WHERE telegram_id = :telegram_id");
            $stmt->execute([
                'amount' => $amount,
                'slider_amount' => $amount,
                'telegram_id' => $telegramId
            ]);
            
            // Подробное логирование выигрыша ресурсов
            error_log(sprintf("[REWARD] User %s won %d Onion in slider. Base amount: %d, Streak: %d, Streak bonus: %d", 
                $telegramId, 
                $amount, 
                $baseAmount ?? $amount, 
                $streakBonus,
                $bonusAmount
            ));
        } else {
            $stmt = $pdo->prepare("UPDATE users SET $type = $type + :amount WHERE telegram_id = :telegram_id");
            $stmt->execute([
                'amount' => $amount,
                'telegram_id' => $telegramId
            ]);
            
            // Подробное логирование выигрыша ресурсов
            error_log(sprintf("[REWARD] User %s won %d %s in slider", 
                $telegramId, 
                $amount, 
                ucfirst($type)
            ));
        }

        // Если тип Onion, обрабатываем потенциальный реферальный бонус
        if ($type === 'onion') {
            $stmt = $pdo->prepare("SELECT referred_by FROM users WHERE telegram_id = :telegram_id");
            $stmt->execute(['telegram_id' => $telegramId]);
            $referrerData = $stmt->fetch();
            
            if ($referrerData && $referrerData['referred_by']) {
                $referrerId = $referrerData['referred_by'];
                $referralBonus = round($amount * 0.2); // 20% от общей суммы с бонусом
                
                // Накапливаем бонус в referral_bonus
                $stmt = $pdo->prepare("UPDATE users SET referral_bonus = referral_bonus + :bonus_ref WHERE telegram_id = :referrer_id");
                $stmt->execute([
                    'bonus_ref' => $referralBonus,
                    'referrer_id' => $referrerId
                ]);
                
                error_log(sprintf("[REFERRAL] Added %d Onion to referral_bonus for user %s from user %s activity", 
                    $referralBonus,
                    $referrerId,
                    $telegramId
                ));
            }
        }

        return true;
    } catch (Exception $e) {
        error_log("[ERROR] Failed to update points for user $telegramId: " . $e->getMessage());
        return false;
    }
}

// Функция для получения очков пользователя
function getScores($pdo, $telegramId) {
    try {
        $stmt = $pdo->prepare("SELECT onion, candy, junk, coin, spins_today, last_spin, streak, last_login, pending_spin, last_streak_update FROM users WHERE telegram_id = :telegram_id");
        $stmt->execute(['telegram_id' => $telegramId]);
        $user = $stmt->fetch();

        if (!$user) {
            // Если пользователь не найден, создаем нового
            $currentTime = time();
            $stmt = $pdo->prepare("INSERT INTO users (telegram_id, onion, candy, junk, coin, spins_today, last_spin, streak, last_login, pending_spin, last_streak_update) VALUES (:telegram_id, 0, 0, 0, 0, 0, NULL, 0, NOW(), 0, :current_time)");
            $stmt->execute([
                'telegram_id' => $telegramId,
                'current_time' => $currentTime
            ]);
            return [
                'onion' => 0, 
                'candy' => 0, 
                'junk' => 0, 
                'coin' => 0,
                'spinsLeft' => 5,
                'timeLeft' => 0,
                'streak' => 0
            ];
        }

        // Устанавливаем временную зону явно для согласованности
        date_default_timezone_set('Europe/Tallinn');

        // Получаем текущую дату сервера
        $currentServerDate = date('Y-m-d');
        $currentServerDateTime = date('Y-m-d H:i:s');

        // Получаем дату последнего входа
        $lastLoginDate = $user['last_login'] ? date('Y-m-d', strtotime($user['last_login'])) : null;
        
        // Streak теперь обновляется только через updateStreak() - убираем логику отсюда
        
        // Спинов по умолчанию остается столько, сколько не использовано
        $spinsLeft = 5 - $user['spins_today'];
        
        // Если у пользователя есть незавершенный спин, проверяем, не завис ли он
        if ($user['pending_spin'] == 1 && $user['last_spin'] && time() - strtotime($user['last_spin']) > 3600) {
            // Если прошло больше часа с момента последнего спина и есть незавершенный спин,
            // сбрасываем флаг pending_spin (защита от зависших спинов)
            $stmt = $pdo->prepare("UPDATE users SET pending_spin = 0 WHERE telegram_id = :telegram_id");
            $stmt->execute(['telegram_id' => $telegramId]);
            error_log(sprintf("[SECURITY] Reset hanging pending_spin for user %s after 1 hour", $telegramId));
        }

        return [
            'onion' => (int)$user['onion'], 
            'candy' => (int)$user['candy'], 
            'junk' => (int)$user['junk'], 
            'coin' => (int)$user['coin'],
            'spinsLeft' => (int)$spinsLeft,
            'timeLeft' => 0,
            'streak' => (int)$user['streak'],
            'pendingSpin' => (int)$user['pending_spin'],
            'lastLogin' => $lastLoginDate,
            'currentDate' => $currentServerDate,
            'serverTime' => $currentServerDateTime
        ];
    } catch (Exception $e) {
        error_log("Error getting scores: " . $e->getMessage());
        return null;
    }
}

// Функция для обновления количества прокрутов
function updateSpins($pdo, $telegramId) {
    try {
        // Устанавливаем временную зону явно для согласованности
        date_default_timezone_set('Europe/Tallinn');
        
        // Запишем время до обновления
        $timeBeforeUpdate = date('Y-m-d H:i:s');
        
        $stmt = $pdo->prepare("SELECT spins_today, last_spin, pending_spin, streak, last_login FROM users WHERE telegram_id = :telegram_id");
        $stmt->execute(['telegram_id' => $telegramId]);
        $userData = $stmt->fetch();
        
        if (!$userData) {
            error_log(sprintf("[ERROR] User %s not found during updateSpins", $telegramId));
            return ['success' => false, 'error' => 'User not found'];
        }
        
        $spinsToday = $userData['spins_today'];
        $lastSpin = $userData['last_spin'];
        $pendingSpin = $userData['pending_spin'] ?? 0;
        $streak = $userData['streak'] ?? 0;
        $lastLogin = $userData['last_login'];
        
        // Логирование текущего состояния
        error_log(sprintf("[SPIN] User %s: spins=%d, last_spin=%s, pending=%d, streak=%d, last_login=%s", 
            $telegramId, $spinsToday, $lastSpin, $pendingSpin, $streak, $lastLogin));
        
        // Если есть незавершенный спин, не позволяем начать новый
        if ($pendingSpin == 1) {
            error_log(sprintf("[SECURITY] User %s attempted to spin while having a pending spin", $telegramId));
            return ['error' => 'You have a pending spin', 'pending' => true];
        }

        if ($spinsToday < 5) {
            // Получим точное время сервера перед обновлением
            $serverTime = date('Y-m-d H:i:s');
            
            // Отмечаем спин как использованный и как ожидающий завершения
            // ВАЖНО: НЕ ОБНОВЛЯЕМ last_login здесь, чтобы не сбросить streak
            $stmt = $pdo->prepare("UPDATE users SET spins_today = spins_today + 1, last_spin = :server_time, pending_spin = 1 WHERE telegram_id = :telegram_id");
            $stmt->execute([
                'server_time' => $serverTime,
                'telegram_id' => $telegramId
            ]);
            
            // Проверим результат обновления
            $stmt = $pdo->prepare("SELECT spins_today, last_spin, streak FROM users WHERE telegram_id = :telegram_id");
            $stmt->execute(['telegram_id' => $telegramId]);
            $updatedData = $stmt->fetch();
            
            error_log(sprintf("[SPIN] Updated state for user %s: spins=%d, last_spin=%s, streak=%d", 
                $telegramId, $updatedData['spins_today'], $updatedData['last_spin'], $updatedData['streak']));
            
            return ['success' => true, 'pending' => true, 'streak' => $updatedData['streak']];
        }
        return ['success' => false, 'message' => 'No spins available'];
    } catch (Exception $e) {
        error_log("Error updating spins: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Функция для завершения ожидающего спина
function completeSpin($pdo, $telegramId) {
    try {
        // Устанавливаем временную зону явно для согласованности
        date_default_timezone_set('Europe/Tallinn');
        
        // Проверяем, есть ли незавершенный спин
        $stmt = $pdo->prepare("SELECT pending_spin FROM users WHERE telegram_id = :telegram_id");
        $stmt->execute(['telegram_id' => $telegramId]);
        $userData = $stmt->fetch();
        
        if (!$userData || $userData['pending_spin'] != 1) {
            return ['success' => false, 'message' => 'No pending spin'];
        }
        
        // Сбрасываем флаг ожидающего спина
        $stmt = $pdo->prepare("UPDATE users SET pending_spin = 0 WHERE telegram_id = :telegram_id");
        $stmt->execute(['telegram_id' => $telegramId]);
        
        return ['success' => true];
    } catch (Exception $e) {
        error_log("Error completing spin: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Функция для проверки незавершенного спина
function checkPendingSpin($pdo, $telegramId) {
    try {
        // Устанавливаем временную зону явно для согласованности
        date_default_timezone_set('Europe/Tallinn');
        
        $stmt = $pdo->prepare("SELECT pending_spin FROM users WHERE telegram_id = :telegram_id");
        $stmt->execute(['telegram_id' => $telegramId]);
        $userData = $stmt->fetch();
        
        if ($userData && $userData['pending_spin'] == 1) {
            return ['pending' => true];
        }
        
        return ['pending' => false];
    } catch (Exception $e) {
        error_log("Error checking pending spin: " . $e->getMessage());
        return ['error' => $e->getMessage()];
    }
}

// Функция для обновления streak
function updateStreak($pdo, $telegramId) {
    try {
        // Устанавливаем временную зону явно для согласованности
        date_default_timezone_set('Europe/Tallinn');
        
        $currentTime = time(); // Текущее время в unix timestamp
        
        // Проверяем, существует ли пользователь и получаем его данные
        $stmt = $pdo->prepare("SELECT telegram_id, last_login, streak, last_streak_update FROM users WHERE telegram_id = :telegram_id");
        $stmt->execute(['telegram_id' => $telegramId]);
        $user = $stmt->fetch();

        if (!$user) {
            // Создаем нового пользователя, устанавливаем streak = 1 и last_streak_update = текущее время
            $stmt = $pdo->prepare("INSERT INTO users (telegram_id, onion, candy, junk, coin, spins_today, last_login, streak, last_streak_update) VALUES (:telegram_id, 0, 0, 0, 0, 0, NOW(), 1, :current_time)");
            $stmt->execute([
                'telegram_id' => $telegramId,
                'current_time' => $currentTime
            ]);
            return ['success' => true, 'streak' => 1, 'message' => 'New user created.'];
        }
        
        // Получаем время последнего обновления стрика
        $lastStreakUpdate = $user['last_streak_update'] ?? 0;
        $timeDiffHours = ($currentTime - $lastStreakUpdate) / 3600; // Разница в часах
        
        error_log(sprintf("[STREAK DEBUG] User %s: current_time=%d, last_streak_update=%d, diff_hours=%.2f", 
            $telegramId, $currentTime, $lastStreakUpdate, $timeDiffHours));
        
        if ($timeDiffHours > 48) {
            // Прошло больше 48 часов - сбрасываем стрик до 1 и ОБНУЛЯЕМ спины
            $stmt = $pdo->prepare("UPDATE users SET streak = 1, spins_today = 0, last_login = NOW(), last_streak_update = :current_time WHERE telegram_id = :telegram_id");
            $stmt->execute([
                'current_time' => $currentTime,
                'telegram_id' => $telegramId
            ]);
            
            error_log(sprintf("[STREAK] User %s: streak reset to 1 (>48h gap), spins reset to 5", 
                $telegramId));
                
            return ['success' => true, 'streak' => 1, 'message' => 'Streak reset due to long absence.'];
        } 
        elseif ($timeDiffHours > 24) {
            // Прошло больше 24 часов, но меньше 48 - увеличиваем стрик и ОБНУЛЯЕМ спины
            $newStreak = $user['streak'] + 1;
            $stmt = $pdo->prepare("UPDATE users SET streak = :streak, spins_today = 0, last_login = NOW(), last_streak_update = :current_time WHERE telegram_id = :telegram_id");
            $stmt->execute([
                'streak' => $newStreak,
                'current_time' => $currentTime,
                'telegram_id' => $telegramId
            ]);
            
            error_log(sprintf("[STREAK] User %s: streak increased to %d, spins reset to 5", 
                $telegramId, $newStreak));
                
            return ['success' => true, 'streak' => $newStreak, 'message' => 'Streak increased!'];
        } 
        else {
            // Прошло меньше 24 часов - ничего не меняем, last_streak_update остается неизменным
            // Только обновляем last_login, НЕ ТРОГАЕМ spins_today
            $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE telegram_id = :telegram_id");
            $stmt->execute(['telegram_id' => $telegramId]);
            
            // Получаем текущее количество спинов для логирования
            $stmt = $pdo->prepare("SELECT spins_today FROM users WHERE telegram_id = :telegram_id");
            $stmt->execute(['telegram_id' => $telegramId]);
            $spinsData = $stmt->fetch();
            $currentSpins = $spinsData ? 5 - $spinsData['spins_today'] : 0;
            
            error_log(sprintf("[STREAK] User %s: no streak update (<24h), current streak: %d, spins available: %d", 
                $telegramId, $user['streak'], $currentSpins));
                
            return ['success' => true, 'streak' => (int)$user['streak'], 'message' => 'Too early for streak update.'];
        }
    } catch (Exception $e) {
        error_log("Error updating streak: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Функция для получения таблицы лидеров
function getLeaderboard($pdo, $sortField = 'onion') {
    try {
        // Проверяем поле сортировки, допустимые значения: onion, streak, total_referrals
        $allowedFields = ['onion', 'streak', 'total_referrals'];
        if (!in_array($sortField, $allowedFields)) {
            $sortField = 'onion'; // По умолчанию сортируем по Onion
        }
        
        // Подготавливаем запрос с параметром сортировки
        $stmt = $pdo->prepare("SELECT telegram_id, username, onion, streak, total_referrals FROM users ORDER BY $sortField DESC LIMIT 10");
        $stmt->execute();
        return $stmt->fetchAll();
    } catch (Exception $e) {
        error_log("Error getting leaderboard: " . $e->getMessage());
        return [];
    }
}

// Функция для обновления username пользователя в базе данных
function updateUsername($pdo, $telegramId, $username = null) {
    try {
        // Проверяем, существует ли пользователь
        $stmt = $pdo->prepare("SELECT telegram_id, username FROM users WHERE telegram_id = :telegram_id");
        $stmt->execute(['telegram_id' => $telegramId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            // Если пользователь не найден, создаем нового с указанным username
            $currentTime = time();
            $stmt = $pdo->prepare("INSERT INTO users (telegram_id, onion, candy, junk, coin, spins_today, last_login, streak, username, last_streak_update) 
                                   VALUES (:telegram_id, 0, 0, 0, 0, 0, NOW(), 0, :username, :current_time)");
            $stmt->execute([
                'telegram_id' => $telegramId,
                'username' => $username,
                'current_time' => $currentTime
            ]);
            return ['success' => true, 'message' => 'New user created with username', 'username' => $username];
        }
        
        // Если username в базе отсутствует или равен "Unknown", и новый username указан, обновляем его
        if (($user['username'] === null || $user['username'] === 'Unknown' || $user['username'] === '') && $username !== null) {
            $stmt = $pdo->prepare("UPDATE users SET username = :username WHERE telegram_id = :telegram_id");
            $stmt->execute([
                'username' => $username,
                'telegram_id' => $telegramId
            ]);
            
            error_log(sprintf("[USERNAME] Updated username for user %s: %s", $telegramId, $username));
            return ['success' => true, 'message' => 'Username updated', 'username' => $username];
        }
        
        // Возвращаем текущее значение username
        return ['success' => true, 'message' => 'Username unchanged', 'username' => $user['username']];
    } catch (Exception $e) {
        error_log("Error updating username: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// Обработка запросов
switch ($action) {
    case 'getScores':
        if (empty($telegramId)) {
            echo json_encode(['success' => false, 'message' => 'Telegram ID not specified']);
            exit;
        }
        $scores = getScores($pdo, $telegramId);
        if ($scores) {
            echo json_encode(['success' => true] + $scores);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error getting data']);
        }
        break;

    case 'updatePoints':
        if (empty($telegramId) || empty($data['type']) || !isset($data['amount'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
            exit;
        }

        $baseAmount = $data['baseAmount'] ?? null;
        $streakBonus = $data['streakBonus'] ?? 0;
        
        $success = updatePoints($pdo, $telegramId, $data['type'], $data['amount'], $baseAmount, $streakBonus);
        echo json_encode(['success' => $success]);
        break;

    case 'updateSpins':
        if (empty($telegramId)) {
            echo json_encode(['success' => false, 'message' => 'Telegram ID not specified']);
            exit;
        }
        $result = updateSpins($pdo, $telegramId);
        echo json_encode(['success' => !isset($result['error'])] + $result);
        break;

    case 'completeSpin':
        if (empty($telegramId)) {
            echo json_encode(['success' => false, 'message' => 'Telegram ID not specified']);
            exit;
        }
        $result = completeSpin($pdo, $telegramId);
        echo json_encode(['success' => !isset($result['error'])] + $result);
        break;

    case 'checkPendingSpin':
        if (empty($telegramId)) {
            echo json_encode(['success' => false, 'message' => 'Telegram ID not specified']);
            exit;
        }
        $result = checkPendingSpin($pdo, $telegramId);
        echo json_encode(['success' => !isset($result['error'])] + $result);
        break;

    case 'updateStreak':
        if (empty($telegramId)) {
            echo json_encode(['success' => false, 'message' => 'Telegram ID not specified']);
            exit;
        }
        $result = updateStreak($pdo, $telegramId);
        echo json_encode(['success' => !isset($result['error'])] + $result);
        break;

    case 'getLeaderboard':
        $sortField = $data['sortField'] ?? 'onion'; // Получаем поле для сортировки из параметров
        $leaderboard = getLeaderboard($pdo, $sortField);
        echo json_encode(['success' => true, 'leaderboard' => $leaderboard]);
        break;

    case 'updateUsername':
        if (empty($telegramId)) {
            echo json_encode(['success' => false, 'message' => 'Telegram ID not specified']);
            exit;
        }
        $username = $data['username'] ?? null;
        $result = updateUsername($pdo, $telegramId, $username);
        echo json_encode(['success' => !isset($result['error'])] + $result);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Unknown action']);
        break;
}
