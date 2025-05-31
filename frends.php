<?php
$pdo = require_once 'db.php';

// Получение данных из POST
$action = trim($_POST['action'] ?? '');
$telegramId = $_POST['telegram_id'] ?? null;

// Проверка параметров
if (!$action || !$telegramId) {
    error_log("[ERROR]: Action или telegram_id отсутствуют.");
    echo json_encode(["success" => false, "message" => "Invalid request. Action or telegram_id missing."]);
    exit;
}

// Обработка действий
switch ($action) {
    case 'getReferralLink':
        try {
            $stmt = $pdo->prepare("SELECT referral_code FROM users WHERE telegram_id = ?");
            $stmt->execute([$telegramId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && $user['referral_code']) {
                $referralLink = "https://t.me/TONion_World_bot?start=" . urlencode($user['referral_code']);
                echo json_encode(["success" => true, "referralLink" => $referralLink]);
            } else {
                echo json_encode(["success" => false, "message" => "Referral code not found"]);
            }
        } catch (Exception $e) {
            error_log("[ERROR]: Error fetching referral link: " . $e->getMessage());
            echo json_encode(["success" => false, "message" => "Error fetching referral link"]);
        }
        break;

    case 'getReferralBonus':
        try {
            $stmt = $pdo->prepare("SELECT referral_bonus FROM users WHERE telegram_id = ?");
            $stmt->execute([$telegramId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                echo json_encode(["success" => true, "referralBonus" => $user['referral_bonus']]);
            } else {
                echo json_encode(["success" => false, "message" => "User not found"]);
            }
        } catch (Exception $e) {
            error_log("[ERROR]: Error fetching referral bonus: " . $e->getMessage());
            echo json_encode(["success" => false, "message" => "Error fetching referral bonus"]);
        }
        break;

    case 'claimReferralBonus':
        try {
            $stmt = $pdo->prepare("SELECT referral_bonus FROM users WHERE telegram_id = ?");
            $stmt->execute([$telegramId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && $user['referral_bonus'] > 0) {
                $bonus = $user['referral_bonus'];

                // Обновим запрос, чтобы также увеличивать total_earnings
                $stmt = $pdo->prepare("UPDATE users SET onion = onion + ?, total_earnings = COALESCE(total_earnings, 0) + ?, referral_bonus = 0 WHERE telegram_id = ?");
                $result = $stmt->execute([$bonus, $bonus, $telegramId]);

                // Важный лог для транзакций
                error_log("[TRANSACTION]: User $telegramId claimed referral bonus: $bonus onions");

                if ($result) {
                    echo json_encode(["success" => true, "claimedBonus" => $bonus]);
                } else {
                    error_log("[ERROR]: Failed to update database when claiming bonus");
                    echo json_encode(["success" => false, "message" => "Error updating bonus in database."]);
                }
            } else {
                echo json_encode(["success" => false, "message" => "No referral bonus available."]);
            }
        } catch (Exception $e) {
            error_log("[ERROR]: Error claiming referral bonus: " . $e->getMessage());
            echo json_encode(["success" => false, "message" => "Error claiming referral bonus"]);
        }
        break;

    case 'getScores': // Новый кейс
        try {
            // Запрос к базе данных для получения состояния очков
            $stmt = $pdo->prepare("SELECT onion, candy, junk, coin FROM users WHERE telegram_id = ?");
            $stmt->execute([$telegramId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                echo json_encode([
                    "success" => true,
                    "onion" => $user['onion'] ?? 0,
                    "candy" => $user['candy'] ?? 0,
                    "junk" => $user['junk'] ?? 0,
                    "coin" => $user['coin'] ?? 0
                ]);
            } else {
                echo json_encode(["success" => false, "message" => "User not found"]);
            }
        } catch (Exception $e) {
            error_log("[ERROR]: Error fetching scores: " . $e->getMessage());
            echo json_encode(["success" => false, "message" => "Error fetching scores"]);
        }
        break;

    default:
        error_log("[ERROR]: Unknown action: $action");
        echo json_encode(["success" => false, "message" => "Unknown action"]);
        break;
}
?>
