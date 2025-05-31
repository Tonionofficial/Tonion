<?php
// RPG Game API endpoints
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Экстренное логирование отключено

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Function to sanitize input data
function sanitizeInput($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            $data[$key] = sanitizeInput($value);
        }
        return $data;
    }
    // Strip tags, remove extra whitespace and convert special characters to HTML entities
    $data = trim(strip_tags($data));
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

// Function to handle errors
function errorHandler($message, $context = '') {
    log_error($message, ['context' => $context]);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => $message]);
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Set up a more reliable log file location
$log_file = __DIR__ . '/rpg_game_log.txt';
$crafting_log_file = __DIR__ . '/crafting_log.txt';

// Function to log messages to a file
function log_message($message, $data = null) {
    // Фильтруем сообщения - логируем только важные события
    
    // Список сообщений, которые НЕ нужно логировать (рутинные операции)
    $skip_messages = [
        'Current directory', 'Attempting to include', 'game_users table exists',
        'gathering_sessions table exists', 'crafting_sessions table exists',
        'Getting active crafting sessions', 'Getting user resources',
        'Getting inventory', 'Getting equipped items', 'Getting gathering session',
        'Checking active craft sessions', 'Updating inventory', 'Returning', 
        'Processing inventory', 'Converting JSON', 'Using inventory data'
    ];
    
    // Проверяем, не нужно ли пропустить сообщение
    foreach ($skip_messages as $skip) {
        if (strpos($message, $skip) !== false) {
            return true; // Пропускаем логирование этого сообщения
        }
    }
    
    // Всегда логируем ошибки и важные события
    $should_log = false;
    
    // Важные операции, которые всегда нужно логировать
    $important_events = [
        'ERROR', 'FAILED', 'Failed', 'Exception', 'exception',
        'Database connection established',
        'Creating character', 'User data retrieved', 'Session saved',
        'Session deleted', 'Resources updated'
    ];
    
    foreach ($important_events as $event) {
        if (strpos($message, $event) !== false) {
            $should_log = true;
            break;
        }
    }
    
    // Если сообщение не важное и не ошибка - пропускаем
    if (!$should_log) {
        return true;
    }
    
    $log_file = __DIR__ . '/rpg_game_log.txt';
    $timestamp = date('Y-m-d H:i:s');
    
    // Format the message
    $log_entry = "[$timestamp] $message";
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            // Максимально сокращаем объем данных до самых важных ключей
            $data_array = (array)$data;
            $compact_data = [];
            $important_fields = ['telegramId', 'error', 'status', 'itemId', 'sessionId'];
            foreach ($important_fields as $field) {
                if (isset($data_array[$field])) {
                    $compact_data[$field] = $data_array[$field];
                }
            }
            $log_entry .= " - " . json_encode($compact_data, JSON_UNESCAPED_UNICODE);
        } else {
            $log_entry .= " - $data";
        }
    }
    $log_entry .= PHP_EOL;
    
    // Сразу пишем в файл, игнорируя ошибки
    @file_put_contents($log_file, $log_entry, FILE_APPEND);
    return true;
}

// Function to log errors to a file
function log_error($message, $data = null) {
    $error_prefix = "❌ ERROR - ";
    return log_message($error_prefix . $message, $data);
}

// Function to log crafting-related messages to crafting_log.txt
function log_crafting($message, $data = null) {
    // Логируем только критически важные и редкие события
    $should_log = false;
    
    // Всегда логируем ошибки
    if (strpos($message, 'ERROR') !== false) {
        $should_log = true;
    }
    
    // Список событий, которые НЕ нужно логировать (фильтруем рутинные операции)
    $skip_events = [
        'CHECKING ACTIVE', 'RETURNING', 'SENDING', 'CLEANUP', 'GET CRAFTING SESSION REQUEST',
        'GET CRAFTING SESSION SUCCESS', 'UPDATE SESSION REQUEST', 'UPDATE SESSION RESPONSE',
        'SESSION BEFORE UPDATE', 'SESSION WILL BE DELETED', 'EXPIRED SESSIONS'
    ];
    
    // Проверяем, содержит ли сообщение какую-либо из нежелательных строк
    foreach ($skip_events as $event) {
        if (strpos($message, $event) !== false) {
            return true; // Пропускаем логирование таких сообщений
        }
    }
    
    // Логируем только самые важные события
    $important_events = [
                'CRAFT START', 'КРАФТ НАЧАТ', 'КРАФТ ЗАВЕРШЕН',
        'SESSION UPDATE SUCCESS', 'SESSION UPDATE', 'SESSION DELETED', 'SESSION NOT FOUND'
    ];
    
    foreach ($important_events as $event) {
        if (strpos($message, $event) !== false) {
            $should_log = true;
            break;
        }
    }
    
    // Если не нужно логировать это событие, выходим
    if (!$should_log && strpos($message, 'ERROR') === false) {
        return true;
    }
    
    $log_file = __DIR__ . '/crafting_log.txt';
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[$timestamp] $message";
    
    // Только самые критичные поля для ультра-компактного лога
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $data_array = (array)$data;
            $compact_data = [];
            // Минимальный набор полей - компактный список для новых логов крафта
            $important_fields = ['telegramId', 'itemId', 'itemName', 'sessionId', 'error', 'status', 
                               'username', 'item', 'craftTime', 'resourcesDetailed', 'resourcesProduced', 'inventoryChange'];
            
            // Для русских логов включаем все данные
            if (strpos($message, 'КРАФТ') !== false) {
                $compact_data = $data_array; // Включаем все данные для детальных русских логов
            } else {
                // Для старых логов используем минимальный набор
                foreach ($important_fields as $field) {
                    if (isset($data_array[$field])) {
                        $compact_data[$field] = $data_array[$field];
                    }
                }
            }
                    // Добавляем quantity и materials только для CRAFT START и КРАФТ НАЧАТ
        if ((strpos($message, 'CRAFT START') !== false || strpos($message, 'КРАФТ НАЧАТ') !== false) && 
                isset($data_array['quantity'])) {
                $compact_data['quantity'] = $data_array['quantity'];
                if (isset($data_array['materials'])) {
                    // Если materials это JSON строка, декодируем её
                    $materials = $data_array['materials'];
                    if (is_string($materials)) {
                        $materials = json_decode($materials, true);
                    }
                    
                    // Если удалось декодировать материалы и есть quantity, умножаем на количество
                    if (is_array($materials) && isset($data_array['quantity']) && $data_array['quantity'] > 1) {
                        $totalMaterials = [];
                        foreach ($materials as $material => $amount) {
                            $totalMaterials[$material] = $amount * $data_array['quantity'];
                        }
                        $compact_data['materials'] = json_encode($totalMaterials);
                        $compact_data['totalMaterialsUsed'] = $totalMaterials;
                    } else {
                        // Если не массив или quantity = 1, записываем как есть
                        $compact_data['materials'] = $data_array['materials'];
                    }
                }
            }
            $log_entry .= ' - ' . json_encode($compact_data, JSON_UNESCAPED_UNICODE);
        } else {
            $log_entry .= ' - ' . $data;
        }
    }
    
    $log_entry .= PHP_EOL;
    @file_put_contents($log_file, $log_entry, FILE_APPEND);
    return true;
}

// Send JSON response
function send_response($success, $message = '', $status_code = 200, $data = []) {
    http_response_code($status_code);
    
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if (!empty($data)) {
        $response = array_merge($response, $data);
    }
    
    echo json_encode($response);
    exit;
}

// Database connection
try {
    // Использование файла db.php из текущей директории
    $db_file_path = __DIR__ . '/db.php';
    
    // Проверяем, существует ли файл
    if (!file_exists($db_file_path)) {
        throw new Exception("db.php file not found at path: " . $db_file_path);
    }
    
    // Include the existing database connection file
    $pdo = require_once $db_file_path;
    
    // Check if PDO connection was established
    if (!$pdo || !($pdo instanceof PDO)) {
        throw new Exception("Database connection not available");
    }
    
    // Check if game_users table exists
    try {
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'game_users'");
        $tableExists = $tableCheck && $tableCheck->rowCount() > 0;
        
        log_message("game_users table exists: " . ($tableExists ? 'Yes' : 'No'));
        
        if (!$tableExists) {
            // Try to create the table
            log_message("Attempting to create game_users table");
            
            $createTableSQL = "CREATE TABLE IF NOT EXISTS `game_users` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `telegram_id` varchar(50) NOT NULL,
                `nickname` varchar(50) NOT NULL,
                `level` int(11) NOT NULL DEFAULT 1,
                `experience` int(11) NOT NULL DEFAULT 0,
                `stats` json DEFAULT NULL,
                `resources` json DEFAULT NULL,
                `created_at` datetime NOT NULL,
                `last_login` datetime NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `telegram_id` (`telegram_id`),
                UNIQUE KEY `nickname` (`nickname`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            
            $result = $pdo->exec($createTableSQL);
            log_message("Table creation result: " . ($result !== false ? 'Success' : 'Failed'));
        }
        
        // Проверяем существование таблицы gathering_sessions
        $gatheringTableCheck = $pdo->query("SHOW TABLES LIKE 'gathering_sessions'");
        $gatheringTableExists = $gatheringTableCheck && $gatheringTableCheck->rowCount() > 0;
        
        log_message("gathering_sessions table exists: " . ($gatheringTableExists ? 'Yes' : 'No'));
        
        if (!$gatheringTableExists) {
            log_message("Attempting to create gathering_sessions table");
            
            $createGatheringTableSQL = "CREATE TABLE IF NOT EXISTS `gathering_sessions` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `telegram_id` varchar(255) NOT NULL,
                `state` ENUM('idle', 'active', 'completed') NOT NULL DEFAULT 'idle',
                `end_time` int(11) NOT NULL DEFAULT 0,
                `resources` TEXT,
                `total_gathered` TEXT,
                `last_claim_time` int(11) NOT NULL DEFAULT 0,
                `next_resource_time` int(11) NOT NULL DEFAULT 0,
                `created_at` datetime NOT NULL,
                `updated_at` datetime NOT NULL,
                PRIMARY KEY (`id`),
                INDEX `idx_telegram_id` (`telegram_id`),
                INDEX `idx_state` (`state`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            
            $result = $pdo->exec($createGatheringTableSQL);
            log_message("Gathering table creation result: " . ($result !== false ? 'Success' : 'Failed'));
        }
        
        // Проверяем существование таблицы для крафтинга
        $craftingTableCheck = $pdo->query("SHOW TABLES LIKE 'crafting_sessions'");
        $craftingTableExists = $craftingTableCheck && $craftingTableCheck->rowCount() > 0;
        
        log_message("crafting_sessions table exists: " . ($craftingTableExists ? 'Yes' : 'No'));
        
        if (!$craftingTableExists) {
            log_message("Attempting to create crafting_sessions table");
            
            $createCraftingTableSQL = "CREATE TABLE IF NOT EXISTS `crafting_sessions` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `telegram_id` varchar(255) NOT NULL,
                `item_id` varchar(255) NOT NULL,
                `item_name` varchar(255) NOT NULL,
                `quantity` int(11) NOT NULL DEFAULT 1,
                `completed_items` int(11) NOT NULL DEFAULT 0,
                `materials` TEXT,
                `status` ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
                `start_time` int(11) NOT NULL,
                `end_time` int(11) NOT NULL,
                `craft_time` int(11) NOT NULL DEFAULT 0,
                `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                INDEX `idx_telegram_id` (`telegram_id`),
                INDEX `idx_status` (`status`),
                INDEX `idx_item_id` (`item_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            
            $result = $pdo->exec($createCraftingTableSQL);
            log_message("Crafting table creation result: " . ($result !== false ? 'Success' : 'Failed'));
        }
    } catch (PDOException $tableEx) {
        log_error("Error checking/creating tables: " . $tableEx->getMessage());
    }
} catch (Exception $e) {
    log_error("Database connection failed: " . $e->getMessage());
    send_response(false, "Database connection failed: " . $e->getMessage(), 500);
    exit;
}

// Оборачиваем весь обработчик в try-catch для предотвращения вывода ошибок в HTML
try {
    // Проверяем, существует ли action параметр
    if (!isset($_GET['action'])) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Missing action parameter']);
        exit;
    }

    // Get the JSON request data
    $post_data = [];
    $raw_input = file_get_contents('php://input');
    if (!empty($raw_input)) {
        $post_data = json_decode($raw_input, true) ?: [];
        log_message("Received POST data: " . json_encode($post_data, JSON_PRETTY_PRINT));
    }

    // Получаем текущее действие
    $action = $_GET['action'];

    // Логируем запрос
    log_message("Processing action: $action", ['method' => $_SERVER['REQUEST_METHOD'], 'query' => $_SERVER['QUERY_STRING']]);

    // Обрабатываем запрос
    switch ($action) {
        case 'updateUserBoolean':
            updateUserBoolean($pdo, $post_data);
            break;
        case 'getUserData':
            getUserData($pdo, $post_data);
            break;
        case 'getInventory':
            getInventory($pdo, $post_data);
            break;
        case 'createCharacter':
            create_character($pdo, $post_data);
            break;
        case 'updateResources':
            update_resources($pdo, $post_data);
            break;
        case 'updateUserInventoryItem':
            updateUserInventoryItem($pdo, $post_data);
            break;
        case 'getGatheringSession':
            get_gathering_session($pdo, $post_data);
            break;
        case 'saveGatheringSession':
            save_gathering_session($pdo, $post_data);
            break;
        case 'deleteGatheringSession':
            delete_gathering_session($pdo, $post_data);
            break;
        case 'logGatheringSession':
            log_gathering_session($post_data);
            break;
        case 'checkUser':
            check_user($pdo, $post_data);
            break;
        case 'getGatheringSessions':
            if (!isset($_GET['telegramId'])) {
                send_response(false, "Telegram ID is required", 400);
                exit;
            }
            
            $telegramId = $_GET['telegramId'];
            
            // Get sessions from db
            $sessions = get_gathering_sessions($telegramId);
            send_response(true, "Sessions retrieved successfully", 200, ['sessions' => $sessions]);
            break;
        case 'getCraftingSessions':
            if (!isset($_GET['telegramId'])) {
                errorHandler('Missing telegramId parameter', $_SERVER['REQUEST_URI']);
                exit;
            }
            
            $telegramId = sanitizeInput($_GET['telegramId']);
            $craftingSessions = get_crafting_sessions($telegramId);
            
            echo json_encode(['success' => true, 'craftingSessions' => $craftingSessions]);
            break;
            
        case 'getActiveCraftingSessions':
            if (!isset($_GET['telegramId'])) {
                errorHandler('Missing telegramId parameter', $_SERVER['REQUEST_URI']);
                exit;
            }
            
            $telegramId = sanitizeInput($_GET['telegramId']);
            
            // Получаем активные сессии крафта (включая обновление статуса истекших сессий)
            $activeCraftingSessions = get_active_crafting_sessions($telegramId);
            
            // Дополнительно добавляем проверку текущего времени, чтобы помочь клиенту определить истекшие сессии
            $currentTime = time();
            
            log_message("Sending " . count($activeCraftingSessions) . " crafting sessions to client");
            
            // Отправляем ответ клиенту
            echo json_encode([
                'success' => true, 
                'activeCraftingSessions' => $activeCraftingSessions,
                'serverTime' => $currentTime
            ]);
            break;
        
        case 'getCraftingSession':
            // Проверяем наличие обязательных параметров
            if (!isset($_GET['sessionId']) || !isset($_GET['telegramId'])) {
                errorHandler('Missing required parameters (sessionId, telegramId)', $_SERVER['REQUEST_URI']);
                exit;
            }
            
            $sessionId = sanitizeInput($_GET['sessionId']);
            $telegramId = sanitizeInput($_GET['telegramId']);
            
            log_message("Getting crafting session info", [
                'sessionId' => $sessionId,
                'telegramId' => $telegramId
            ]);
            
            try {
                // Проверяем существование таблицы
                $tableCheck = $pdo->query("SHOW TABLES LIKE 'crafting_sessions'");
                if (!$tableCheck || $tableCheck->rowCount() == 0) {
                    throw new Exception("Crafting sessions table does not exist");
                }
                
                // Получаем информацию о конкретной сессии крафта
                $sessionSQL = "SELECT * FROM crafting_sessions 
                           WHERE id = :session_id 
                           AND telegram_id = :telegram_id 
                           LIMIT 1";
                
                $sessionStmt = $pdo->prepare($sessionSQL);
                $sessionStmt->execute([
                    'session_id' => $sessionId,
                    'telegram_id' => $telegramId
                ]);
                
                $session = $sessionStmt->fetch(PDO::FETCH_ASSOC);
                
                // Если сессия не найдена, ищем любую активную сессию этого пользователя
                if (!$session) {
                    log_message("Exact crafting session not found, looking for any active session", [
                        'requestedSessionId' => $sessionId,
                        'telegramId' => $telegramId
                    ]);
                    
                    // Пробуем найти любую активную сессию для этого пользователя
                    $alternativeSQL = "SELECT * FROM crafting_sessions 
                                   WHERE telegram_id = :telegram_id 
                                   AND status = 'active' 
                                   ORDER BY end_time ASC LIMIT 1";
                    $alternativeStmt = $pdo->prepare($alternativeSQL);
                    $alternativeStmt->execute(['telegram_id' => $telegramId]);
                    $session = $alternativeStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($session) {
                        log_message("Found alternative active session", [
                            'requestedSessionId' => $sessionId,
                            'foundSessionId' => $session['id'],
                            'telegramId' => $telegramId
                        ]);
                        
                        log_crafting("SESSION REMAPPED", [
                            'originalSessionId' => $sessionId,
                            'remappedSessionId' => $session['id'],
                            'telegramId' => $telegramId
                        ]);
                    }
                }
                
                // Если всё ещё не нашли сессию после всех проверок
                if (!$session) {
                    log_message("No active crafting sessions found", [
                        'sessionId' => $sessionId,
                        'telegramId' => $telegramId
                    ]);
                    
                    log_crafting("SESSION NOT FOUND", [
                        'sessionId' => $sessionId,
                        'telegramId' => $telegramId
                    ]);
                    
                    echo json_encode([
                        'success' => false,
                        'error' => 'Session not found'
                    ]);
                    exit;
                }
                
                // Возвращаем информацию о сессии
                echo json_encode([
                    'success' => true,
                    'session' => $session
                ]);
                

                
            } catch (Exception $e) {
                log_error("Error getting crafting session: " . $e->getMessage());
                
                echo json_encode([
                    'success' => false,
                    'error' => 'Error getting session: ' . $e->getMessage()
                ]);
            }
            break;
        
        case 'updateCraftingSession':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            
            // Parse input data from JSON body
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            
            log_message("Received updateCraftingSession request: " . json_encode($data));
            
            // Проверка наличия необходимых полей
            if (empty($data['status'])) {
                log_error("updateCraftingSession missing status parameter: " . json_encode($data));
                log_crafting("UPDATE SESSION REQUEST ERROR", [
                    'error' => 'Missing status parameter',
                    'receivedData' => $data,
                    'rawInput' => $jsonData
                ]);
                
                errorHandler('Missing status parameter', $_SERVER['REQUEST_URI']);
                exit;
            }
            
            // Проверка наличия telegramId - он обязателен для новой логики
            if (empty($data['telegramId'])) {
                log_error("updateCraftingSession missing telegramId parameter: " . json_encode($data));
                log_crafting("UPDATE SESSION REQUEST ERROR", [
                    'error' => 'Missing telegramId parameter',
                    'receivedData' => $data,
                    'rawInput' => $jsonData
                ]);
                
                errorHandler('Missing telegramId parameter, which is now required', $_SERVER['REQUEST_URI']);
                exit;
            }
            
            $sessionId = !empty($data['sessionId']) ? sanitizeInput($data['sessionId']) : 0;
            $status = sanitizeInput($data['status']);
            $telegramId = sanitizeInput($data['telegramId']);
            $logSessionId = !empty($data['logSessionId']) ? sanitizeInput($data['logSessionId']) : $sessionId;
            
            // Добавляем логирование для отладки
            log_crafting("CRAFT SESSION UPDATE REQUEST", [
                'originalSessionId' => $logSessionId,
                'sessionId' => $sessionId,
                'telegramId' => $telegramId,
                'status' => $status
            ]);
            
            // Проверка, нужно ли удалить сессию
            $shouldDelete = $status === 'completed' && $telegramId !== null;
            if ($shouldDelete) {
                log_message("Request to mark session as completed and delete it: session " . $sessionId . " for user " . $telegramId);
            }
            
            $result = update_crafting_session($sessionId, $status, $telegramId);
            

            
            echo json_encode(['success' => $result]);
            break;
            
        case 'updateGathering':
            // ... existing code ...
            break;
        case 'craftItem':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            log_message("craftItem data: " . print_r($data, true));
            
            if (empty($data['telegramId']) || empty($data['itemId']) || empty($data['itemName']) || 
                empty($data['craftTime']) || empty($data['materials']) || empty($data['quantity'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required parameters']);
                exit;
            }
            
            // Проверяем, нет ли уже активной сессии крафта для этого предмета
            $existingSessionsSQL = "SELECT * FROM crafting_sessions 
                               WHERE telegram_id = :telegram_id 
                               AND item_id = :item_id
                               AND status = 'active'
                               LIMIT 1";
            
            try {
                $existingStmt = $pdo->prepare($existingSessionsSQL);
                $existingStmt->execute([
                    'telegram_id' => $data['telegramId'],
                    'item_id' => $data['itemId']
                ]);
                
                $existingSession = $existingStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingSession) {
                    // Уже есть активная сессия для этого предмета
                    log_message("User already has an active crafting session for item: " . $data['itemId']);
                    log_crafting("DUPLICATE CRAFT SESSION PREVENTED", [
                        'telegramId' => $data['telegramId'],
                        'itemId' => $data['itemId'],
                        'existingSessionId' => $existingSession['id']
                    ]);
                    
                    echo json_encode([
                        'success' => true, 
                        'message' => 'Already crafting this item',
                        'sessionId' => $existingSession['id'],
                        'existingSession' => true
                    ]);
                    exit;
                }
            } catch (PDOException $e) {
                log_error("Error checking for existing craft sessions: " . $e->getMessage());
                // Продолжаем выполнение, создавая новую сессию, даже если была ошибка при проверке
            }
            
            $session = save_crafting_session(
                $data['telegramId'],
                $data['itemId'],
                $data['itemName'],
                $data['quantity'],
                $data['materials'],
                $data['craftTime']
            );
            
            if ($session) {
                echo json_encode(['success' => true, 'sessionId' => $session['id']]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create crafting session']);
            }
            break;
        case 'updateInventory':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            
            if (empty($data['telegramId']) || !isset($data['inventory'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required parameters']);
                exit;
            }
            
            // Логирование информации о полученных данных
            log_message("Received inventory update request", [
                'telegramId' => $data['telegramId'],
                'inventoryType' => gettype($data['inventory']),
                'requestContentLength' => $_SERVER['CONTENT_LENGTH'] ?? 'unknown'
            ]);
            
            $result = update_inventory($data['telegramId'], $data['inventory']);
            echo json_encode(['success' => $result]);
            break;
            
        case 'updateUserInventory':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            
            if (empty($data['telegramId']) || !isset($data['inventory'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required parameters']);
                exit;
            }
            
            // Логирование информации о полученных данных
            log_message("Received user inventory update request", [
                'telegramId' => $data['telegramId'],
                'inventoryType' => gettype($data['inventory']),
                'dataKeys' => is_array($data['inventory']) ? array_keys($data['inventory']) : 'not array'
            ]);
            
            $result = update_user_inventory($data['telegramId'], $data['inventory']);
            echo json_encode(['success' => $result]);
            break;
            
        case 'cleanupCompletedSessions':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
                exit;
            }
            
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            
            if (empty($data['telegramId'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing telegramId parameter']);
                exit;
            }
            
            $telegramId = sanitizeInput($data['telegramId']);
            
            log_message("Cleaning up completed crafting sessions", [
                'telegramId' => $telegramId
            ]);
            
            try {
                // Проверяем существование таблицы
                $tableCheck = $pdo->query("SHOW TABLES LIKE 'crafting_sessions'");
                if (!$tableCheck || $tableCheck->rowCount() == 0) {
                    log_message("Crafting sessions table doesn't exist", [
                        'telegramId' => $telegramId
                    ]);
                    
                    echo json_encode([
                        'success' => true,
                        'message' => 'No table to cleanup',
                        'deletedCount' => 0
                    ]);
                    exit;
                }
                
                // Удаляем все завершенные сессии пользователя
                $deleteSQL = "DELETE FROM crafting_sessions 
                          WHERE telegram_id = :telegram_id 
                          AND status = 'completed'";
                
                $deleteStmt = $pdo->prepare($deleteSQL);
                $deleteStmt->execute(['telegram_id' => $telegramId]);
                
                $deletedCount = $deleteStmt->rowCount();
                
                log_message("Completed crafting sessions cleanup result", [
                    'telegramId' => $telegramId,
                    'deletedCount' => $deletedCount
                ]);
                
                echo json_encode([
                    'success' => true,
                    'deletedCount' => $deletedCount,
                    'message' => "Successfully removed $deletedCount completed crafting sessions"
                ]);
            } catch (Exception $e) {
                log_error("Error cleaning up completed crafting sessions: " . $e->getMessage());
                
                echo json_encode([
                    'success' => false,
                    'error' => 'Error cleaning up sessions: ' . $e->getMessage()
                ]);
            }
            break;
            
        case 'getUserResources':
            // Проверяем наличие обязательного параметра telegramId
            if (!isset($_GET['telegramId'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing telegramId parameter']);
                exit;
            }
            
            $telegramId = sanitizeInput($_GET['telegramId']);
            
            log_message("Fetching user resources", [
                'telegramId' => $telegramId
            ]);
            
            try {
                // Проверяем существование таблицы
                $tableCheck = $pdo->query("SHOW TABLES LIKE 'game_users'");
                if (!$tableCheck || $tableCheck->rowCount() == 0) {
                    throw new Exception("Game users table does not exist");
                }
                
                // Получаем данные пользователя из БД
                $userSQL = "SELECT * FROM game_users WHERE telegram_id = :telegram_id LIMIT 1";
                $userStmt = $pdo->prepare($userSQL);
                $userStmt->execute(['telegram_id' => $telegramId]);
                
                $userData = $userStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$userData) {
                    log_error("User not found when fetching resources", [
                        'telegramId' => $telegramId
                    ]);
                    
                    echo json_encode([
                        'success' => false,
                        'error' => 'User not found'
                    ]);
                    exit;
                }
                
                // Формируем объект с ресурсами пользователя
                $resources = [
                    'Wood Log' => (int) ($userData['wood_log'] ?? 0),
                    'Rock' => (int) ($userData['rock'] ?? 0),
                    'Fiber' => (int) ($userData['fiber'] ?? 0),
                    'Berry' => (int) ($userData['berry'] ?? 0),
                    'Herbs' => (int) ($userData['herbs'] ?? 0),
                    'Stick' => (int) ($userData['stick'] ?? 0),
                    'Mushrooms' => (int) ($userData['mushrooms'] ?? 0),
                    'Coal' => (int) ($userData['coal'] ?? 0),
                    'Iron Ore' => (int) ($userData['iron_ore'] ?? 0),
                    'Gold Ore' => (int) ($userData['gold_ore'] ?? 0),
                    'telegramId' => $telegramId,
                    'lastUpdated' => date('Y-m-d H:i:s')
                ];
                
                // Логируем успешное получение ресурсов
                log_message("Successfully fetched user resources", [
                    'telegramId' => $telegramId,
                    'resourcesCount' => count($resources)
                ]);
                
                // Отправляем ответ клиенту
                echo json_encode([
                    'success' => true,
                    'resources' => $resources
                ]);
            } catch (Exception $e) {
                log_error("Error fetching user resources: " . $e->getMessage());
                echo json_encode([
                    'success' => false,
                    'error' => 'Error fetching resources: ' . $e->getMessage()
                ]);
            }
            break;
            
        case 'equipItem':
            equip_item($pdo, $post_data);
            break;
        case 'unequipItem':
            unequip_item($pdo, $post_data);
            break;
        case 'getEquipped':
            get_equipped($pdo, $post_data);
            break;
        case 'updateBurnTime':
            updateBurnTime($pdo, $post_data);
            break;
        case 'checkUser':
            check_user($pdo, $post_data);
            break;
        case 'getStamina':
            getStamina($pdo, $post_data);
            break;
        case 'decreaseStamina':
            decreaseStamina($pdo, $post_data);
            break;
        case 'updateStamina':
            updateStamina($pdo, $post_data);
            break;
        case 'updateUserExperience':
            updateUserExperience($pdo, $post_data);
            break;
        case 'updateUserLevel':
            updateUserLevel($pdo, $post_data);
            break;
        case 'updateUserStats':
            updateUserStats($pdo, $post_data);
            break;
            
        default:
            log_error("Invalid action requested: " . $action);
            send_response(false, "Unknown action", 400);
            break;
    }
} catch (Exception $e) {
    log_error("Unhandled exception in main request handler", ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Unhandled exception: ' . $e->getMessage()]);
    exit;
}

// Check if user exists in game_users table
function check_user($pdo, $data) {
    if (!isset($data['telegramId'])) {
        log_error("Missing telegramId in check_user request", $data);
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    log_message("🔍 CHECK_USER - Starting user existence check", ["telegramId" => $telegram_id]);
    
    try {
        // Query to check if user exists
        $sql = "SELECT * FROM game_users WHERE telegram_id = :telegram_id";
        log_message("🔄 Executing user check query", ["sql" => $sql, "telegramId" => $telegram_id]);
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegram_id]);
        
        $user_exists = $stmt->rowCount() > 0;
        log_message("✅ User existence check result", ["userExists" => ($user_exists ? "YES" : "NO"), "rowCount" => $stmt->rowCount()]);
        
        if ($user_exists) {
            // User exists
            $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
            log_message("✅ USER FOUND IN DATABASE", $user_data);
            
            // Build response with user data
            $response = [
                'exists' => true,
                'telegramId' => $telegram_id,
                'nickname' => $user_data['nickname'],
                'level' => (int)$user_data['level'],
                'experience' => (int)$user_data['experience'],
                'stats' => json_decode($user_data['stats'], true) ?: [
                    'strength' => 1,
                    'agility' => 1,
                    'intelligence' => 1
                ],
                'resources' => json_decode($user_data['resources'], true) ?: [
                    'Rock' => 0,
                    'Wood Log' => 0,
                    'Berry' => 0,
                    'Herbs' => 0,
                    'Stick' => 0,
                    'Mushrooms' => 0
                ]
            ];
            
            // Проверяем и преобразуем инвентарь, если он существует и в упрощенном формате
            if (isset($user_data['inventory']) && !empty($user_data['inventory'])) {
                try {
                    $inventory = json_decode($user_data['inventory'], true);
                    if ($inventory && is_array($inventory)) {
                        // Проверяем, является ли это упрощенным форматом ({"itemId": X})
                        $expandedInventory = [];
                        $isSimplifiedFormat = false;
                        
                        // Проверяем формат инвентаря
                        foreach ($inventory as $itemId => $value) {
                            if (is_numeric($value)) {
                                $isSimplifiedFormat = true;
                                break;
                            }
                        }
                        
                        // Если это упрощенный формат, преобразуем его обратно в полный
                        if ($isSimplifiedFormat) {
                            log_message("Converting simplified inventory format to expanded format");
                            foreach ($inventory as $itemId => $quantity) {
                                $expandedInventory[$itemId] = [
                                    'quantity' => (int)$quantity,
                                    'name' => str_replace('_', ' ', ucwords(str_replace('_', ' ', $itemId)))
                                ];
                            }
                            $userData['inventory'] = $expandedInventory;
                        } else {
                            $userData['inventory'] = $inventory;
                            
                            // Если формат не упрощенный, автоматически преобразуем его и сохраняем в базе
                            $simplifiedInventory = [];
                            foreach ($inventory as $itemId => $item) {
                                if (isset($item['quantity']) && $item['quantity'] > 0) {
                                    $simplifiedInventory[$itemId] = (int)$item['quantity'];
                                }
                            }
                            
                            // Обновляем запись в базе данных только если есть предметы
                            if (!empty($simplifiedInventory)) {
                                $simplifiedInventoryJson = json_encode($simplifiedInventory);
                                log_message("Auto-converting inventory to simplified format for user: " . $telegram_id);
                                
                                $updateUserSQL = "UPDATE game_users SET inventory = :inventory WHERE telegram_id = :telegram_id";
                                $updateUserStmt = $pdo->prepare($updateUserSQL);
                                $updateUserStmt->execute([
                                    'inventory' => $simplifiedInventoryJson,
                                    'telegram_id' => $telegram_id
                                ]);
                                
                                log_message("Auto-conversion complete, inventory updated for user: " . $telegram_id);
                            }
                        }
                    }
                } catch (Exception $e) {
                    log_error("Error parsing inventory JSON: " . $e->getMessage());
                }
            }
            
            log_message("📤 Sending user data to client", $response);
            send_response(true, "User found", 200, $response);
        } else {
            // User does not exist
            log_message("⚠️ USER NOT FOUND", ["telegramId" => $telegram_id]);
            log_message("📤 Sending 'user not found' response to client");
            send_response(true, "User not found", 200, ['exists' => false]);
        }
    } catch (PDOException $e) {
        log_error("❌ DATABASE ERROR during user check", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// Create a new character in game_users table
function create_character($pdo, $data) {
    // Debug incoming request data
    log_message("📝 CREATE_CHARACTER - Raw request data: " . json_encode($data, JSON_PRETTY_PRINT));
    
    if (!isset($data['telegramId']) || !isset($data['nickname'])) {
        log_error("❌ Missing required data for character creation", $data);
        send_response(false, "Telegram ID and nickname are required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $nickname = $data['nickname'];
    
    log_message("🔍 CREATE_CHARACTER - Starting character creation process", ['telegramId' => $telegram_id, 'nickname' => $nickname]);
    
    try {
        // Verify PDO connection
        if (!$pdo || !($pdo instanceof PDO)) {
            log_error("❌ Invalid PDO connection in create_character", ['telegramId' => $telegram_id]);
            send_response(false, "Database connection error", 500);
            return;
        }
        
        // Check database connection by querying a simple statement
        try {
            $test_stmt = $pdo->query("SELECT 1");
            log_message("✅ Database connection test: " . ($test_stmt ? 'Successful' : 'Failed'));
        } catch (PDOException $e) {
            log_error("❌ Database connection test failed", ['message' => $e->getMessage()]);
            send_response(false, "Database connection test failed: " . $e->getMessage(), 500);
            return;
        }

        // Begin transaction
        $pdo->beginTransaction();
        log_message("🔄 Transaction started for character creation");
        
        // Check if user already exists
        $check_sql = "SELECT * FROM game_users WHERE telegram_id = :telegram_id";
        log_message("🔍 Checking if user with this Telegram ID already exists", ['query' => $check_sql, 'telegramId' => $telegram_id]);
        $check_stmt = $pdo->prepare($check_sql);
        $check_stmt->execute(['telegram_id' => $telegram_id]);
        
        log_message("✅ User existence check complete", ['rowCount' => $check_stmt->rowCount(), 'userExists' => ($check_stmt->rowCount() > 0 ? 'YES' : 'NO')]);
        if ($check_stmt->rowCount() > 0) {
            log_message("⚠️ User already exists in database", ['telegramId' => $telegram_id]);
            $pdo->rollBack();
            send_response(false, "User with this Telegram ID already exists", 400);
            return;
        }
        
        // Check if nickname is already taken
        $nick_check_sql = "SELECT * FROM game_users WHERE nickname = :nickname";
        log_message("🔍 Checking if nickname is already taken", ['query' => $nick_check_sql, 'nickname' => $nickname]);
        $nick_check_stmt = $pdo->prepare($nick_check_sql);
        $nick_check_stmt->execute(['nickname' => $nickname]);
        
        log_message("✅ Nickname check complete", ['rowCount' => $nick_check_stmt->rowCount(), 'nicknameTaken' => ($nick_check_stmt->rowCount() > 0 ? 'YES' : 'NO')]);
        if ($nick_check_stmt->rowCount() > 0) {
            log_message("⚠️ Nickname already taken", ['nickname' => $nickname]);
            $pdo->rollBack();
            send_response(false, "This nickname is already taken", 400);
            return;
        }
        
        // Default stats and resources
        $default_stats = json_encode([
            'strength' => 1,
            'agility' => 1,
            'luck' => 1,
            'health' => 1
        ]);
        
        $default_resources = json_encode([
            'Rock' => 0,
            'Wood Log' => 0,
            'Berry' => 0,
            'Herbs' => 0,
            'Stick' => 0,
            'Mushrooms' => 0,
            'Fiber' => 0
        ]);
        
        // Create new user - preparation
        $insert_sql = "INSERT INTO game_users (telegram_id, nickname, level, experience, stats, resources, created_at, last_login) 
                     VALUES (:telegram_id, :nickname, 1, 0, :stats, :resources, NOW(), NOW())";
        
        log_message("🔄 Preparing user creation SQL", [
            'query' => $insert_sql,
            'telegramId' => $telegram_id,
            'nickname' => $nickname
        ]);
        
        // Try to catch PDO preparation errors
        try {
            $insert_stmt = $pdo->prepare($insert_sql);
            log_message("✅ SQL statement preparation successful");
        } catch (PDOException $e) {
            log_error("❌ Failed to prepare SQL statement", [
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
                'query' => $insert_sql
            ]);
            $pdo->rollBack();
            send_response(false, "Failed to prepare database query: " . $e->getMessage(), 500);
            return;
        }
        
        $params = [
            'telegram_id' => $telegram_id,
            'nickname' => $nickname,
            'stats' => $default_stats,
            'resources' => $default_resources
        ];
        
        log_message("📋 User creation parameters prepared", $params);
        
        // Try to execute the insert and capture detailed error info if it fails
        log_message("🔄 Executing INSERT operation for new user");
        try {
            $success = $insert_stmt->execute($params);
            log_message("Insert execution result: " . ($success ? 'Success' : 'Failed'));
        } catch (PDOException $e) {
            log_error("❌ INSERT EXECUTION FAILED", [
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
                'sql_state' => $e->errorInfo[0] ?? 'Unknown',
                'driver_code' => $e->errorInfo[1] ?? 'Unknown',
                'driver_message' => $e->errorInfo[2] ?? 'Unknown'
            ]);
            $pdo->rollBack();
            send_response(false, "Failed to insert user: " . $e->getMessage(), 500);
            return;
        }
        
        if ($success) {
            $rows_affected = $insert_stmt->rowCount();
            log_message("✅ INSERT OPERATION SUCCESSFUL", [
                'telegramId' => $telegram_id, 
                'nickname' => $nickname,
                'rowsAffected' => $rows_affected
            ]);
            
            if ($rows_affected < 1) {
                log_error("⚠️ INSERT statement executed but no rows were affected", [
                    'rowsAffected' => $rows_affected,
                    'telegramId' => $telegram_id
                ]);
                $pdo->rollBack();
                send_response(false, "Insert operation did not create any records", 500);
                return;
            }
            
            // Verify the user was actually created
            $verify_sql = "SELECT * FROM game_users WHERE telegram_id = :telegram_id";
            log_message("🔍 Verifying user was created", ['query' => $verify_sql, 'telegramId' => $telegram_id]);
            $verify_stmt = $pdo->prepare($verify_sql);
            $verify_stmt->execute(['telegram_id' => $telegram_id]);
            
            $verify_count = $verify_stmt->rowCount();
            log_message("✅ Verification query complete", ['rowCount' => $verify_count, 'userFound' => ($verify_count > 0 ? 'YES' : 'NO')]);
            
            if ($verify_count > 0) {
                $user_data = $verify_stmt->fetch(PDO::FETCH_ASSOC);
                log_message("✅ USER CREATED AND VERIFIED SUCCESSFULLY", $user_data);
                
                // Commit the transaction
                try {
                    $pdo->commit();
                    log_message("✅ Database transaction committed successfully");
                } catch (PDOException $e) {
                    log_error("❌ Failed to commit transaction", [
                        'message' => $e->getMessage(),
                        'code' => $e->getCode()
                    ]);
                    $pdo->rollBack();
                    send_response(false, "Failed to commit transaction: " . $e->getMessage(), 500);
                    return;
                }
                
                // Return success with user data
                $response = [
                    'telegramId' => $telegram_id,
                    'nickname' => $nickname,
                    'level' => 1,
                    'experience' => 0,
                    'stats' => json_decode($default_stats, true),
                    'resources' => json_decode($default_resources, true)
                ];
                
                log_message("✅ Sending success response to client", $response);
                send_response(true, "Character created successfully", 201, $response);
            } else {
                log_error("❌ Verification failed - user not found after insert", [
                    'telegramId' => $telegram_id
                ]);
                $pdo->rollBack();
                send_response(false, "Failed to verify user creation", 500);
            }
        } else {
            log_error("❌ INSERT OPERATION FAILED", [
                'telegramId' => $telegram_id,
                'pdoError' => $insert_stmt->errorInfo()
            ]);
            $pdo->rollBack();
            send_response(false, "Failed to create character", 500);
        }
        
    } catch (PDOException $e) {
        log_error("❌ DATABASE EXCEPTION in create_character", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
        
        // Try to roll back if a transaction is active
        try {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
                log_message("Transaction rolled back");
            }
        } catch (Exception $rollback_e) {
            log_error("Failed to roll back transaction", [
                'message' => $rollback_e->getMessage()
            ]);
        }
        
        send_response(false, "Database error: " . $e->getMessage(), 500);
    } catch (Exception $e) {
        log_error("❌ GENERAL EXCEPTION in create_character", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
        
        // Try to roll back if a transaction is active
        try {
            if ($pdo && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
                log_message("Transaction rolled back");
            }
        } catch (Exception $rollback_e) {
            log_error("Failed to roll back transaction", [
                'message' => $rollback_e->getMessage()
            ]);
        }
        
        send_response(false, "Error: " . $e->getMessage(), 500);
    }
}

// Get user's inventory
function get_inventory($pdo, $data) {
    if (!isset($data['telegramId'])) {
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    
    // For now, return empty inventory as it's not implemented yet
    send_response(true, "Inventory retrieved", 200, ['inventory' => []]);
}

// Get user's equipped items
function get_equipped($pdo, $data) {
    if (!isset($data['telegramId'])) {
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    
    try {
        // Получаем экипированные предметы из таблицы equiped_items
        $query = $pdo->prepare("SELECT * FROM equiped_items WHERE telegram_id = :telegram_id");
        $query->execute(['telegram_id' => $telegram_id]);
        $equipped = $query->fetch(PDO::FETCH_ASSOC);
        
        if (!$equipped) {
            // Если записи нет, возвращаем пустой объект со слотами
            $equipped = [
                'telegram_id' => $telegram_id,
                'weapon1' => null,
                'weapon2' => null,
                'helmet' => null, 
                'armor' => null,
                'belt' => null,
                'pants' => null,
                'boots' => null,
                'gloves' => null,
                'bracers' => null,
                'earring' => null,
                'amulet' => null,
                'ring1' => null,
                'ring2' => null,
                'ring3' => null,
                'ring4' => null,
                'potion1' => null,
                'potion2' => null,
                'potion3' => null
            ];
        }
        
        // Добавляем подробности о каждом предмете (можно реализовать позже)
        // TODO: присоединить информацию о каждом предмете (название, характеристики и т.д.)
        
        send_response(true, "Equipped items retrieved", 200, ['equipped' => $equipped]);
    } catch (Exception $e) {
        log_error("Error getting equipped items: " . $e->getMessage());
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// Start gathering resources
function start_gathering($pdo, $data) {
    if (!isset($data['telegramId'])) {
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    
    try {
        // Check if user exists
        $check_sql = "SELECT * FROM game_users WHERE telegram_id = :telegram_id";
        $check_stmt = $pdo->prepare($check_sql);
        $check_stmt->execute(['telegram_id' => $telegram_id]);
        
        if ($check_stmt->rowCount() === 0) {
            send_response(false, "User not found", 404);
            return;
        }
        
        // Check if user is already gathering
        $check_gathering_sql = "SELECT * FROM gathering_sessions WHERE telegram_id = :telegram_id AND end_time IS NULL";
        $check_gathering_stmt = $pdo->prepare($check_gathering_sql);
        $check_gathering_stmt->execute(['telegram_id' => $telegram_id]);
        
        if ($check_gathering_stmt->rowCount() > 0) {
            send_response(false, "User is already gathering resources", 400);
            return;
        }
        
        // Start new gathering session
        $start_time = date('Y-m-d H:i:s');
        $insert_sql = "INSERT INTO gathering_sessions (telegram_id, start_time, created_at) 
                     VALUES (:telegram_id, :start_time, NOW())";
        
        $insert_stmt = $pdo->prepare($insert_sql);
        $success = $insert_stmt->execute([
            'telegram_id' => $telegram_id,
            'start_time' => $start_time
        ]);
        
        if ($success) {
            send_response(true, "Gathering started", 200, [
                'startTime' => $start_time,
                'inProgress' => true
            ]);
        } else {
            log_error("Error starting gathering: PDO execution failed");
            send_response(false, "Database error", 500);
        }
    } catch (PDOException $e) {
        log_error("Database error: " . $e->getMessage());
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// Check gathering status
function check_gathering($pdo, $data) {
    if (!isset($data['telegramId'])) {
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    
    try {
        // Check if user has active gathering session
        $sql = "SELECT * FROM gathering_sessions WHERE telegram_id = :telegram_id AND end_time IS NULL ORDER BY created_at DESC LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegram_id]);
        
        if ($stmt->rowCount() > 0) {
            $session = $stmt->fetch(PDO::FETCH_ASSOC);
            $created_at = $session['created_at'];
            $session_id = $session['id'];
            
            // Calculate resources gathered based on time
            $now = time();
            $start = strtotime($created_at);
            $elapsed_seconds = $now - $start;
            $elapsed_minutes = floor($elapsed_seconds / 60);
            
            // Simple resource calculation (can be made more complex)
            $resources = [
                'wood' => min(100, $elapsed_minutes * 2),
                'stone' => min(80, $elapsed_minutes),
                'herbs' => min(50, floor($elapsed_minutes / 2)),
                'ore' => min(30, floor($elapsed_minutes / 3))
            ];
            
            send_response(true, "Gathering in progress", 200, [
                'inProgress' => true,
                'startTime' => $created_at,
                'elapsedSeconds' => $elapsed_seconds,
                'sessionId' => $session_id,
                'results' => $resources
            ]);
        } else {
            send_response(true, "No active gathering session", 200, [
                'inProgress' => false
            ]);
        }
    } catch (PDOException $e) {
        log_error("Database error: " . $e->getMessage());
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// Claim gathered resources
function claim_gathering($pdo, $data) {
    if (!isset($data['telegramId'])) {
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    
    try {
        // Check if user has active gathering session
        $sql = "SELECT * FROM gathering_sessions WHERE telegram_id = :telegram_id AND end_time IS NULL ORDER BY start_time DESC LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegram_id]);
        
        if ($stmt->rowCount() === 0) {
            send_response(false, "No active gathering session found", 404);
            return;
        }
        
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        $start_time = $session['start_time'];
        $session_id = $session['id'];
        
        // Calculate resources gathered
        $now = time();
        $start = strtotime($start_time);
        $elapsed_seconds = $now - $start;
        $elapsed_minutes = floor($elapsed_seconds / 60);
        
        // Calculate resources
        $resources = [
            'wood' => min(100, $elapsed_minutes * 2),
            'stone' => min(80, $elapsed_minutes),
            'herbs' => min(50, floor($elapsed_minutes / 2)),
            'ore' => min(30, floor($elapsed_minutes / 3))
        ];
        
        // Begin transaction
        $pdo->beginTransaction();
        
        // Get user's resources
        $get_user_sql = "SELECT resources FROM game_users WHERE telegram_id = :telegram_id";
        $user_stmt = $pdo->prepare($get_user_sql);
        $user_stmt->execute(['telegram_id' => $telegram_id]);
        
        if ($user_stmt->rowCount() === 0) {
            $pdo->rollBack();
            send_response(false, "User not found", 404);
            return;
        }
        
        $user_data = $user_stmt->fetch(PDO::FETCH_ASSOC);
        $current_resources = json_decode($user_data['resources'], true) ?: [
            'wood' => 0,
            'stone' => 0,
            'herbs' => 0,
            'ore' => 0
        ];
        
        // Add gathered resources to current resources
        foreach ($resources as $resource => $amount) {
            if (!isset($current_resources[$resource])) {
                $current_resources[$resource] = 0;
            }
            $current_resources[$resource] += $amount;
        }
        
        // Update user's resources in database
        $new_resources_json = json_encode($current_resources);
        $update_resources_sql = "UPDATE game_users SET resources = :resources WHERE telegram_id = :telegram_id";
        
        $update_stmt = $pdo->prepare($update_resources_sql);
        $update_result = $update_stmt->execute([
            'resources' => $new_resources_json,
            'telegram_id' => $telegram_id
        ]);
        
        if (!$update_result) {
            $pdo->rollBack();
            log_error("Error updating resources");
            send_response(false, "Error updating resources", 500);
            return;
        }
        
        // End gathering session
        $end_time = date('Y-m-d H:i:s');
        $resources_data = json_encode($resources);
        $update_session_sql = "UPDATE gathering_sessions SET end_time = :end_time, resources_claimed = 1, 
                             resources_data = :resources_data WHERE id = :session_id";
        
        $session_stmt = $pdo->prepare($update_session_sql);
        $session_result = $session_stmt->execute([
            'end_time' => $end_time,
            'resources_data' => $resources_data,
            'session_id' => $session_id
        ]);
        
        if (!$session_result) {
            $pdo->rollBack();
            log_error("Error updating gathering session");
            send_response(false, "Error updating gathering session", 500);
            return;
        }
        
        // Commit transaction
        $pdo->commit();
        
        send_response(true, "Resources claimed successfully", 200, [
            'resources' => $resources,
            'totalResources' => $current_resources
        ]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        log_error("Database error: " . $e->getMessage());
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// Cancel gathering session
function cancel_gathering($pdo, $data) {
    if (!isset($data['telegramId'])) {
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    
    try {
        // Check if user has active gathering session
        $sql = "SELECT * FROM gathering_sessions WHERE telegram_id = :telegram_id AND end_time IS NULL ORDER BY created_at DESC LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegram_id]);
        
        if ($stmt->rowCount() === 0) {
            send_response(false, "No active gathering session found", 404);
            return;
        }
        
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        $session_id = $session['id'];
        
        // Cancel gathering session
        $update_sql = "UPDATE gathering_sessions SET end_time = NOW(), state = 'completed' WHERE id = :session_id";
        $update_stmt = $pdo->prepare($update_sql);
        $result = $update_stmt->execute(['session_id' => $session_id]);
        
        if ($result) {
            send_response(true, "Gathering session cancelled", 200);
        } else {
            log_error("Error cancelling gathering session");
            send_response(false, "Error cancelling gathering session", 500);
        }
    } catch (PDOException $e) {
        log_error("Database error: " . $e->getMessage());
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// Get user data from game_users table
function getUserData($pdo, $data) {
    log_message("🔍 GET_USER_DATA - Starting to retrieve user data");
    
    if (!isset($data['telegramId'])) {
        log_error("Missing telegramId in getUserData request", $data);
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    log_message("🔍 GET_USER_DATA - Retrieving data for user", ["telegramId" => $telegram_id]);
    
    try {
        // Check if resources column exists in game_users table
        try {
            log_message("Checking if resources column exists in game_users table");
            $columnCheck = $pdo->query("SHOW COLUMNS FROM game_users LIKE 'resources'");
            $columnExists = $columnCheck && $columnCheck->rowCount() > 0;
            
            log_message("Resources column exists in game_users: " . ($columnExists ? 'Yes' : 'No'));
            
            if (!$columnExists) {
                // Add resources column if it doesn't exist
                log_message("Resources column does not exist in game_users table, adding it");
                $addColumnSQL = "ALTER TABLE game_users ADD COLUMN resources JSON DEFAULT NULL AFTER stats";
                $pdo->exec($addColumnSQL);
                
                // Add default empty resources for all existing users
                $defaultResources = json_encode([]);
                
                $updateResourcesSQL = "UPDATE game_users SET resources = :resources WHERE resources IS NULL";
                $updateStmt = $pdo->prepare($updateResourcesSQL);
                $updateStmt->execute(['resources' => $defaultResources]);
                
                log_message("Added resources column and default values to game_users table");
            }
        } catch (PDOException $e) {
            log_error("Error checking/adding resources column: " . $e->getMessage());
        }
        
        // Check if campfire column exists in game_users table
        try {
            log_message("Checking if campfire column exists in game_users table");
            $campfireColumnCheck = $pdo->query("SHOW COLUMNS FROM game_users LIKE 'campfire'");
            $campfireColumnExists = $campfireColumnCheck && $campfireColumnCheck->rowCount() > 0;
            
            log_message("Campfire column exists in game_users: " . ($campfireColumnExists ? 'Yes' : 'No'));
            
            if (!$campfireColumnExists) {
                // Add campfire column if it doesn't exist
                log_message("Campfire column does not exist in game_users table, adding it");
                $addColumnSQL = "ALTER TABLE game_users ADD COLUMN campfire BOOLEAN DEFAULT 0 AFTER resources_claimed";
                $pdo->exec($addColumnSQL);
                log_message("Added campfire column to game_users table");
            }
        } catch (PDOException $e) {
            log_error("Error checking/adding campfire column: " . $e->getMessage());
        }
        
        // Check if furnace column exists in game_users table
        try {
            log_message("Checking if furnace column exists in game_users table");
            $furnaceColumnCheck = $pdo->query("SHOW COLUMNS FROM game_users LIKE 'furnace'");
            $furnaceColumnExists = $furnaceColumnCheck && $furnaceColumnCheck->rowCount() > 0;
            
            log_message("Furnace column exists in game_users: " . ($furnaceColumnExists ? 'Yes' : 'No'));
            
            if (!$furnaceColumnExists) {
                // Add furnace column if it doesn't exist
                log_message("Furnace column does not exist in game_users table, adding it");
                $addColumnSQL = "ALTER TABLE game_users ADD COLUMN furnace BOOLEAN DEFAULT 0 AFTER campfire";
                $pdo->exec($addColumnSQL);
                log_message("Added furnace column to game_users table");
            }
        } catch (PDOException $e) {
            log_error("Error checking/adding furnace column: " . $e->getMessage());
        }
        
        // Check if campfire_burn column exists in game_users table
        try {
            $columnCheck = $pdo->query("SHOW COLUMNS FROM game_users LIKE 'campfire_burn'");
            $columnExists = $columnCheck && $columnCheck->rowCount() > 0;
            
            if (!$columnExists) {
                // Add campfire_burn column if it doesn't exist
                log_message("campfire_burn column does not exist in game_users table, adding it");
                $addColumnSQL = "ALTER TABLE game_users ADD COLUMN campfire_burn INT DEFAULT 0 AFTER campfire";
                $pdo->exec($addColumnSQL);
                log_message("Added campfire_burn column to game_users table");
            }
        } catch (PDOException $e) {
            log_error("Error checking/adding campfire_burn column: " . $e->getMessage());
        }
        
        // Check if furnace_burn column exists in game_users table
        try {
            $columnCheck = $pdo->query("SHOW COLUMNS FROM game_users LIKE 'furnace_burn'");
            $columnExists = $columnCheck && $columnCheck->rowCount() > 0;
            
            if (!$columnExists) {
                // Add furnace_burn column if it doesn't exist
                log_message("furnace_burn column does not exist in game_users table, adding it");
                $addColumnSQL = "ALTER TABLE game_users ADD COLUMN furnace_burn INT DEFAULT 0 AFTER furnace";
                $pdo->exec($addColumnSQL);
                log_message("Added furnace_burn column to game_users table");
            }
        } catch (PDOException $e) {
            log_error("Error checking/adding furnace_burn column: " . $e->getMessage());
        }
        
        // Check if resources_claimed column exists
        try {
            log_message("Checking if resources_claimed column exists in game_users table");
            $claimedColumnCheck = $pdo->query("SHOW COLUMNS FROM game_users LIKE 'resources_claimed'");
            $claimedColumnExists = $claimedColumnCheck && $claimedColumnCheck->rowCount() > 0;
            
            log_message("Resources_claimed column exists in game_users: " . ($claimedColumnExists ? 'Yes' : 'No'));
            
            if (!$claimedColumnExists) {
                // Add resources_claimed column if it doesn't exist
                log_message("Resources_claimed column does not exist in game_users table, adding it");
                $addColumnSQL = "ALTER TABLE game_users ADD COLUMN resources_claimed INT NOT NULL DEFAULT 0 AFTER resources";
                $pdo->exec($addColumnSQL);
                log_message("Added resources_claimed column to game_users table");
            }
        } catch (PDOException $e) {
            log_error("Error checking/adding resources_claimed column: " . $e->getMessage());
        }
        
        // Check if stats column exists in game_users table
        try {
            $columnCheck = $pdo->query("SHOW COLUMNS FROM game_users LIKE 'stats'");
            $columnExists = $columnCheck && $columnCheck->rowCount() > 0;
            
            if (!$columnExists) {
                // Add stats column if it doesn't exist
                log_message("Stats column does not exist in game_users table, adding it");
                $addColumnSQL = "ALTER TABLE game_users ADD COLUMN stats JSON DEFAULT NULL AFTER experience";
                $pdo->exec($addColumnSQL);
                
                // Add default stats for all existing users
                $defaultStats = json_encode([
                    'strength' => 1,
                    'agility' => 1,
                    'luck' => 1,
                    'health' => 1
                ]);
                
                $updateStatsSQL = "UPDATE game_users SET stats = :stats WHERE stats IS NULL";
                $updateStmt = $pdo->prepare($updateStatsSQL);
                $updateStmt->execute(['stats' => $defaultStats]);
                
                log_message("Added stats column and default values to game_users table");
            }
        } catch (PDOException $e) {
            log_error("Error checking/adding stats column: " . $e->getMessage());
        }
        
        // Check if stats_avb column exists in game_users table
        try {
            $columnCheck = $pdo->query("SHOW COLUMNS FROM game_users LIKE 'stats_avb'");
            $columnExists = $columnCheck && $columnCheck->rowCount() > 0;
            
            if (!$columnExists) {
                // Add stats_avb column if it doesn't exist
                log_message("Stats_avb column does not exist in game_users table, adding it");
                $addColumnSQL = "ALTER TABLE game_users ADD COLUMN stats_avb INT DEFAULT 0 AFTER stats";
                $pdo->exec($addColumnSQL);
                
                // Set initial available stats based on level for existing users
                $updateStatsAvbSQL = "UPDATE game_users SET stats_avb = (level - 1) * 5 WHERE stats_avb = 0";
                $pdo->exec($updateStatsAvbSQL);
                
                log_message("Added stats_avb column and initialized values based on level");
            }
        } catch (PDOException $e) {
            log_error("Error checking/adding stats_avb column: " . $e->getMessage());
        }
        
        // Check if stamina column exists in game_users table
        try {
            log_message("Checking if stamina column exists in game_users table");
            $staminaColumnCheck = $pdo->query("SHOW COLUMNS FROM game_users LIKE 'stamina'");
            $staminaColumnExists = $staminaColumnCheck && $staminaColumnCheck->rowCount() > 0;
            
            log_message("Stamina column exists in game_users: " . ($staminaColumnExists ? 'Yes' : 'No'));
            
            if (!$staminaColumnExists) {
                // Add stamina column if it doesn't exist (default max stamina = 10)
                log_message("Stamina column does not exist in game_users table, adding it");
                $addColumnSQL = "ALTER TABLE game_users ADD COLUMN stamina INT NOT NULL DEFAULT 10 AFTER furnace_burn";
                $pdo->exec($addColumnSQL);
                log_message("Added stamina column to game_users table");
            }
        } catch (PDOException $e) {
            log_error("Error checking/adding stamina column: " . $e->getMessage());
        }
        
        // Check if stamina_update column exists in game_users table
        try {
            log_message("Checking if stamina_update column exists in game_users table");
            $staminaUpdateColumnCheck = $pdo->query("SHOW COLUMNS FROM game_users LIKE 'stamina_update'");
            $staminaUpdateColumnExists = $staminaUpdateColumnCheck && $staminaUpdateColumnCheck->rowCount() > 0;
            
            log_message("Stamina_update column exists in game_users: " . ($staminaUpdateColumnExists ? 'Yes' : 'No'));
            
            if (!$staminaUpdateColumnExists) {
                // Add stamina_update column if it doesn't exist (stores timestamp of last stamina update)
                log_message("Stamina_update column does not exist in game_users table, adding it");
                $addColumnSQL = "ALTER TABLE game_users ADD COLUMN stamina_update BIGINT NOT NULL DEFAULT 0 AFTER stamina";
                $pdo->exec($addColumnSQL);
                
                // Initialize stamina_update for all existing users to current timestamp
                $currentTimestamp = round(microtime(true)); // Current timestamp in seconds
                $updateSQL = "UPDATE game_users SET stamina_update = :timestamp WHERE stamina_update = 0";
                $updateStmt = $pdo->prepare($updateSQL);
                $updateStmt->execute(['timestamp' => $currentTimestamp]);
                
                log_message("Added stamina_update column to game_users table and initialized timestamps");
            }
        } catch (PDOException $e) {
            log_error("Error checking/adding stamina_update column: " . $e->getMessage());
        }
        
        // Query to get user data
        $sql = "SELECT * FROM game_users WHERE telegram_id = :telegram_id";
        log_message("🔄 Executing query to get user data", ["sql" => $sql, "telegramId" => $telegram_id]);
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegram_id]);
        
        $user_exists = $stmt->rowCount() > 0;
        log_message("✅ User data check result", ["userExists" => ($user_exists ? "YES" : "NO"), "rowCount" => $stmt->rowCount()]);
        
        if ($user_exists) {
            // User exists
            $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
            log_message("✅ USER DATA RETRIEVED FROM DATABASE", $user_data);
            
            // Parse stats JSON - ensure all required stats are included with defaults
            $stats = json_decode($user_data['stats'], true) ?: [];
            
            // Ensure all required stats exist with defaults
            $stats = array_merge([
                'strength' => 1,
                'agility' => 1,
                'luck' => 1,
                'health' => 1,
                'damage' => 1,
                'armor' => 0
            ], $stats);
            
            // Update user stats if any required stats were missing
            $shouldUpdateStats = false;
            foreach (['strength', 'agility', 'luck', 'health'] as $requiredStat) {
                if (!isset($stats[$requiredStat])) {
                    $stats[$requiredStat] = ($requiredStat === 'health') ? 1 : 1;
                    $shouldUpdateStats = true;
                }
            }
            
            // Update the stats in the database if needed
            if ($shouldUpdateStats) {
                $updateUserStats = "UPDATE game_users SET stats = :stats WHERE telegram_id = :telegram_id";
                $updateStmt = $pdo->prepare($updateUserStats);
                $updateStmt->execute([
                    'stats' => json_encode($stats),
                    'telegram_id' => $telegram_id
                ]);
                log_message("📊 Updated missing stats for user", ["telegramId" => $telegram_id, "updatedStats" => $stats]);
            }
            
            // Get resources from database if available
            $resources = [];
            if (isset($user_data['resources'])) {
                // Try to decode the resources JSON
                $decoded_resources = json_decode($user_data['resources'], true);
                if ($decoded_resources !== null) {
                    $resources = $decoded_resources;
                    log_message("📊 User resources retrieved from database", ["resources" => $resources]);
                } else {
                    log_message("⚠️ Resources field is invalid JSON, returning empty object", ["raw_resources" => $user_data['resources']]);
                }
            } else {
                log_message("⚠️ Resources field does not exist in the database record");
            }
            
            // Get resources_claimed value
            $resources_claimed = 0;
            if (isset($user_data['resources_claimed'])) {
                $resources_claimed = (int)$user_data['resources_claimed'];
                log_message("📊 Resources claimed value retrieved: " . $resources_claimed);
            } else {
                log_message("⚠️ Resources_claimed field does not exist in the database record");
            }
            
            // Get campfire status
            $campfire = false;
            if (isset($user_data['campfire'])) {
                $campfire = (bool)$user_data['campfire'];
                log_message("📊 Campfire status retrieved: " . ($campfire ? 'true' : 'false'));
            } else {
                log_message("⚠️ Campfire field does not exist in the database record");
            }
            
            // Get campfire_burn time
            $campfire_burn = 0;
            if (isset($user_data['campfire_burn'])) {
                $campfire_burn = (int)$user_data['campfire_burn'];
                log_message("📊 Campfire burn time retrieved: " . $campfire_burn);
            } else {
                log_message("⚠️ campfire_burn field does not exist in the database record");
            }
            
            // Get furnace status
            $furnace = false;
            if (isset($user_data['furnace'])) {
                $furnace = (bool)$user_data['furnace'];
                log_message("📊 Furnace status retrieved: " . ($furnace ? 'true' : 'false'));
            } else {
                log_message("⚠️ Furnace field does not exist in the database record");
            }
            
            // Get furnace_burn time
            $furnace_burn = 0;
            if (isset($user_data['furnace_burn'])) {
                $furnace_burn = (int)$user_data['furnace_burn'];
                log_message("📊 Furnace burn time retrieved: " . $furnace_burn);
            } else {
                log_message("⚠️ furnace_burn field does not exist in the database record");
            }
            
            // Get stamina value and last update timestamp
            $stamina = 10; // Default max stamina
            $stamina_update = round(microtime(true)); // Current timestamp in seconds
            
            if (isset($user_data['stamina'])) {
                $stamina = (int)$user_data['stamina'];
                log_message("📊 Stamina value retrieved: " . $stamina);
            } else {
                log_message("⚠️ Stamina field does not exist in the database record, using default: " . $stamina);
            }
            
            if (isset($user_data['stamina_update'])) {
                $stamina_update = (int)$user_data['stamina_update'];
                log_message("📊 Stamina update timestamp retrieved: " . $stamina_update);
            } else {
                log_message("⚠️ Stamina_update field does not exist in the database record, using current timestamp");
            }
            
            // Get stats_avb (available stats for distribution)
            $stats_avb = 0;
            if (isset($user_data['stats_avb'])) {
                $stats_avb = (int)$user_data['stats_avb'];
                log_message("📊 Available stats for distribution retrieved: " . $stats_avb);
            } else {
                log_message("⚠️ Stats_avb field does not exist in the database record, using default: 0");
            }
            
            // Build formatted response
            $userData = [
                'nickname' => $user_data['nickname'],
                'level' => (int)$user_data['level'],
                'exp' => (int)$user_data['experience'],
                'strength' => (int)$stats['strength'],
                'agility' => (int)$stats['agility'],
                'luck' => (int)$stats['luck'],
                'health' => (int)$stats['health'],
                'damage' => (int)($stats['damage'] ?? $stats['strength']), // Default damage based on strength
                'armor' => (int)($stats['armor'] ?? 0),
                'resources' => $resources, // Добавляем ресурсы пользователя в ответ
                'resources_claimed' => $resources_claimed, // Добавляем количество собранных ресурсов
                'campfire' => $campfire, // Добавляем статус campfire
                'furnace' => $furnace, // Добавляем статус furnace
                'campfire_burn' => $campfire_burn, // Добавляем время горения campfire
                'furnace_burn' => $furnace_burn, // Добавляем время горения furnace
                'stamina' => $stamina, // Добавляем текущее значение стамины
                'stamina_update' => $stamina_update, // Добавляем время последнего обновления стамины
                'stats_avb' => $stats_avb // Добавляем количество доступных статов для распределения
            ];
            
            // Проверяем и преобразуем инвентарь, если он существует и в упрощенном формате
            if (isset($user_data['inventory']) && !empty($user_data['inventory'])) {
                try {
                    $inventory = json_decode($user_data['inventory'], true);
                    if ($inventory && is_array($inventory)) {
                        // Проверяем, является ли это упрощенным форматом ({"itemId": X})
                        $expandedInventory = [];
                        $isSimplifiedFormat = false;
                        
                        // Проверяем формат инвентаря
                        foreach ($inventory as $itemId => $value) {
                            if (is_numeric($value)) {
                                $isSimplifiedFormat = true;
                                break;
                            }
                        }
                        
                        // Если это упрощенный формат, преобразуем его обратно в полный
                        if ($isSimplifiedFormat) {
                            log_message("Converting simplified inventory format to expanded format");
                            foreach ($inventory as $itemId => $quantity) {
                                $expandedInventory[$itemId] = [
                                    'quantity' => (int)$quantity,
                                    'name' => str_replace('_', ' ', ucwords(str_replace('_', ' ', $itemId)))
                                ];
                            }
                            $userData['inventory'] = $expandedInventory;
                        } else {
                            $userData['inventory'] = $inventory;
                            
                            // Если формат не упрощенный, автоматически преобразуем его и сохраняем в базе
                            $simplifiedInventory = [];
                            foreach ($inventory as $itemId => $item) {
                                if (isset($item['quantity']) && $item['quantity'] > 0) {
                                    $simplifiedInventory[$itemId] = (int)$item['quantity'];
                                }
                            }
                            
                            // Обновляем запись в базе данных только если есть предметы
                            if (!empty($simplifiedInventory)) {
                                $simplifiedInventoryJson = json_encode($simplifiedInventory);
                                log_message("Auto-converting inventory to simplified format for user: " . $telegram_id);
                                
                                $updateUserSQL = "UPDATE game_users SET inventory = :inventory WHERE telegram_id = :telegram_id";
                                $updateUserStmt = $pdo->prepare($updateUserSQL);
                                $updateUserStmt->execute([
                                    'inventory' => $simplifiedInventoryJson,
                                    'telegram_id' => $telegram_id
                                ]);
                                
                                log_message("Auto-conversion complete, inventory updated for user: " . $telegram_id);
                            }
                        }
                    }
                } catch (Exception $e) {
                    log_error("Error parsing inventory JSON: " . $e->getMessage());
                }
            }
            
            log_message("📤 Sending user data to client", $userData);
            send_response(true, "User data retrieved successfully", 200, ['userData' => $userData]);
        } else {
            // User does not exist
            log_message("⚠️ USER NOT FOUND", ["telegramId" => $telegram_id]);
            log_message("📤 Sending 'user not found' response to client");
            send_response(false, "User not found", 404);
        }
    } catch (PDOException $e) {
        log_error("❌ DATABASE ERROR during user data retrieval", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// Get inventory items from inventory_items table
function getInventory($pdo, $data) {
    log_message("🔍 GET_INVENTORY - Starting to retrieve inventory items");
    
    if (!isset($data['telegramId'])) {
        log_error("Missing telegramId in getInventory request", $data);
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    log_message("🔍 GET_INVENTORY - Retrieving inventory for user", ["telegramId" => $telegram_id]);
    
    try {
        // First check if inventory_items table exists
        try {
            $tableCheck = $pdo->query("SHOW TABLES LIKE 'inventory_items'");
            $tableExists = $tableCheck && $tableCheck->rowCount() > 0;
            
            log_message("inventory_items table exists: " . ($tableExists ? 'Yes' : 'No'));
            
            if (!$tableExists) {
                // Create inventory_items table if not exists
                log_message("Attempting to create inventory_items table");
                
                $createTableSQL = "CREATE TABLE IF NOT EXISTS `inventory_items` (
                    `id` int(11) NOT NULL AUTO_INCREMENT,
                    `telegram_id` varchar(50) NOT NULL,
                    `item_id` varchar(50) NOT NULL,
                    `quantity` int(11) NOT NULL DEFAULT 1,
                    `equipped` tinyint(1) NOT NULL DEFAULT 0,
                    `slot` varchar(20) DEFAULT NULL,
                    `created_at` datetime NOT NULL,
                    `updated_at` datetime NOT NULL,
                    PRIMARY KEY (`id`),
                    KEY `telegram_id` (`telegram_id`),
                    KEY `item_id` (`item_id`),
                    KEY `equipped` (`equipped`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
                
                $result = $pdo->exec($createTableSQL);
                log_message("Inventory table creation result: " . ($result !== false ? 'Success' : 'Failed'));
            }
        } catch (PDOException $tableEx) {
            log_error("Error checking/creating inventory table: " . $tableEx->getMessage());
        }
        
        // Query to get inventory items (non-equipped)
        $inventorySql = "SELECT * FROM inventory_items WHERE telegram_id = :telegram_id AND equipped = 0";
        log_message("🔄 Executing query to get inventory items", ["sql" => $inventorySql, "telegramId" => $telegram_id]);
        $inventoryStmt = $pdo->prepare($inventorySql);
        $inventoryStmt->execute(['telegram_id' => $telegram_id]);
        
        // Query to get equipped items
        $equippedSql = "SELECT * FROM inventory_items WHERE telegram_id = :telegram_id AND equipped = 1";
        log_message("🔄 Executing query to get equipped items", ["sql" => $equippedSql, "telegramId" => $telegram_id]);
        $equippedStmt = $pdo->prepare($equippedSql);
        $equippedStmt->execute(['telegram_id' => $telegram_id]);
        
        // Format inventory items
        $inventoryItems = [];
        while ($item = $inventoryStmt->fetch(PDO::FETCH_ASSOC)) {
            $inventoryItems[] = [
                'id' => $item['item_id'],
                'qty' => (int)$item['quantity']
            ];
        }
        
        // Format equipped items
        $equippedItems = [];
        while ($item = $equippedStmt->fetch(PDO::FETCH_ASSOC)) {
            $equippedItems[$item['slot']] = $item['item_id'];
        }
        
        log_message("📤 Sending inventory data to client", [
            'inventoryCount' => count($inventoryItems),
            'equippedCount' => count($equippedItems)
        ]);
        
        send_response(true, "Inventory retrieved successfully", 200, [
            'inventory' => $inventoryItems,
            'equipped' => $equippedItems
        ]);
    } catch (PDOException $e) {
        log_error("❌ DATABASE ERROR during inventory retrieval", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// Update user stats in game_users table
function updateUserStats($pdo, $data) {
    log_message("🔍 UPDATE_USER_STATS - Starting to update user stats");
    
    if (!isset($data['telegramId'])) {
        log_error("Missing telegramId in updateUserStats request", $data);
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    if (!isset($data['stats']) || !is_array($data['stats'])) {
        log_error("Missing or invalid stats in updateUserStats request", $data);
        send_response(false, "Stats object is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $stats = $data['stats'];
    
    // Получаем количество потраченных статов из запроса
    $stats_spent = isset($data['statsSpent']) ? (int)$data['statsSpent'] : 0;
    
    log_message("🔍 UPDATE_USER_STATS - Updating stats for user", [
        "telegramId" => $telegram_id, 
        "stats" => $stats,
        "statsSpent" => $stats_spent
    ]);
    
    try {
        // First, get current user data
        $sql = "SELECT * FROM game_users WHERE telegram_id = :telegram_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegram_id]);
        
        if ($stmt->rowCount() === 0) {
            log_error("User not found in updateUserStats", ["telegramId" => $telegram_id]);
            send_response(false, "User not found", 404);
            return;
        }
        
        $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Parse existing stats
        $current_stats = json_decode($user_data['stats'], true) ?: [];
        
        // Get current available stats
        $current_stats_avb = isset($user_data['stats_avb']) ? (int)$user_data['stats_avb'] : 0;
        
        // Check if user has enough available stats
        if ($stats_spent > $current_stats_avb) {
            log_error("Insufficient available stats", [
                "telegramId" => $telegram_id,
                "requested" => $stats_spent,
                "available" => $current_stats_avb
            ]);
            send_response(false, "Insufficient available stats", 400);
            return;
        }
        
        // Merge with new stats
        $updated_stats = array_merge($current_stats, $stats);
        
        // Calculate new available stats
        $new_stats_avb = $current_stats_avb - $stats_spent;
        
        // Update user stats and available stats
        $update_sql = "UPDATE game_users SET stats = :stats, stats_avb = :stats_avb WHERE telegram_id = :telegram_id";
        $update_stmt = $pdo->prepare($update_sql);
        $result = $update_stmt->execute([
            'stats' => json_encode($updated_stats),
            'stats_avb' => $new_stats_avb,
            'telegram_id' => $telegram_id
        ]);
        
        if ($result) {
            log_message("✅ Stats updated successfully", [
                "telegramId" => $telegram_id, 
                "stats" => $updated_stats,
                "statsSpent" => $stats_spent,
                "newStatsAvb" => $new_stats_avb
            ]);
            send_response(true, "Stats updated successfully", 200, [
                "stats" => $updated_stats,
                "stats_avb" => $new_stats_avb
            ]);
        } else {
            log_error("Failed to update user stats", ["telegramId" => $telegram_id, "error" => $update_stmt->errorInfo()]);
            send_response(false, "Failed to update stats", 500);
        }
    } catch (PDOException $e) {
        log_error("Database error during stats update", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// Register a new user in the game_users table
function registerUser($pdo, $data) {
    // ... existing code ...
}

// Update player resources
function update_resources($pdo, $data) {
    log_message("📝 UPDATE_RESOURCES - Raw request data: " . json_encode($data, JSON_PRETTY_PRINT));
    
    if (!isset($data['telegramId']) || !isset($data['resources'])) {
        log_error("❌ Missing required data for resources update", $data);
        send_response(false, "Telegram ID and resources are required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $resources = $data['resources'];
    
    // Проверяем формат данных и преобразуем к строке JSON если нужно
    if (is_array($resources) || is_object($resources)) {
        $resources_json = json_encode($resources);
    } else if (is_string($resources)) {
        // Проверяем, не является ли строка уже JSON
        $decoded = json_decode($resources, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            log_error("❌ Invalid JSON for resources", ["resources" => $resources]);
            send_response(false, "Resources are not in valid format", 400);
            return;
        }
        $resources_json = $resources;
        $resources = $decoded;
    } else {
        log_error("❌ Invalid format for resources", ["resources" => $resources]);
        send_response(false, "Resources are not in valid format", 400);
        return;
    }
    
    // Получаем значение resources_claimed, если оно передано
    $resources_claimed = isset($data['resourcesClaimed']) ? (int)$data['resourcesClaimed'] : null;
    
    // Проверяем, передан ли параметр для вычитания ресурсов
    $is_crafting = isset($data['isCrafting']) && $data['isCrafting'] === true;
    
    log_message("🔍 UPDATE_RESOURCES - Starting resources update process", [
        'telegramId' => $telegram_id, 
        'resources' => $resources,
        'resourcesClaimed' => $resources_claimed,
        'isCrafting' => $is_crafting
    ]);
    
    try {
        // Verify PDO connection
        if (!$pdo || !($pdo instanceof PDO)) {
            log_error("❌ Invalid PDO connection in update_resources", ['telegramId' => $telegram_id]);
            send_response(false, "Database connection error", 500);
            return;
        }
        
        // Begin transaction
        $pdo->beginTransaction();
        log_message("🔄 Transaction started for resources update");
        
        // Get current resources
        $get_sql = "SELECT resources FROM game_users WHERE telegram_id = :telegram_id";
        $get_stmt = $pdo->prepare($get_sql);
        $get_stmt->execute(['telegram_id' => $telegram_id]);
        
        if ($get_stmt->rowCount() === 0) {
            log_error("❌ User not found", ['telegramId' => $telegram_id]);
            $pdo->rollBack();
            send_response(false, "User not found", 404);
            return;
        }
        
        $user_data = $get_stmt->fetch(PDO::FETCH_ASSOC);
        $current_resources = json_decode($user_data['resources'], true) ?: [];
        
        log_message("✅ Current resources retrieved", ['current' => $current_resources]);
        
        // Список стандартных ресурсов и маппинг ключей
        $resource_mapping = [
            'rock' => 'Rock',
            'woodlog' => 'Wood Log',
            'wood_log' => 'Wood Log',
            'woodlogs' => 'Wood Log',
            'berry' => 'Berry',
            'berries' => 'Berry',
            'fiber' => 'Fiber',
            'fibers' => 'Fiber',
            'herb' => 'Herbs',
            'herbs' => 'Herbs',
            'stick' => 'Stick',
            'sticks' => 'Stick',
            'mushroom' => 'Mushrooms',
            'mushrooms' => 'Mushrooms'
        ];
        
        // При крафте используем текущие ресурсы как основу и применяем переданные значения
        if ($is_crafting) {
            log_message("🔨 Processing crafting operation - will update only specific resources");
            
            // Копируем текущие ресурсы без изменений
            $final_resources = $current_resources;
            
            // Проходим только по ресурсам, которые нужно обновить
            foreach ($resources as $key => $value) {
                // Пропускаем служебные поля
                if ($key === 'id' || $key === 'telegramId' || $key === 'lastUpdated') {
                    continue;
                }
                
                // Преобразуем значение в число
                $value = intval($value);
                
                // Стандартизируем имя ресурса
                $normalized_key = $key;
                $search_key = strtolower(str_replace(' ', '', $key));
                
                if (isset($resource_mapping[$search_key])) {
                    $normalized_key = $resource_mapping[$search_key];
                }
                
                // Определяем ключ, который фактически используется в current_resources
                $actual_key = null;
                
                // Пытаемся найти ресурс в различных форматах
                if (isset($current_resources[$normalized_key])) {
                    $actual_key = $normalized_key;
                } elseif (isset($current_resources[$key])) {
                    $actual_key = $key;
                } else {
                    // Ищем по другим возможным ключам
                    foreach ($current_resources as $curr_key => $curr_value) {
                        $curr_search_key = strtolower(str_replace(' ', '', $curr_key));
                        if ($curr_search_key === $search_key) {
                            $actual_key = $curr_key;
                            break;
                        }
                    }
                }
                
                // Если нашли ключ в текущих ресурсах, применяем изменение (добавляем значение, которое может быть отрицательным)
                if ($actual_key !== null) {
                    $old_value = $current_resources[$actual_key];
                    $new_value = $old_value + $value; // Просто добавляем значение (с учетом знака)
                    $final_resources[$actual_key] = max(0, $new_value); // Не даем стать отрицательным
                    
                    if ($value < 0) {
                        log_message("🔍 Вычитаем ресурс {$actual_key}: {$old_value} {$value} = {$final_resources[$actual_key]}");
                    } else {
                        log_message("🔍 Добавляем ресурс {$actual_key}: {$old_value} + {$value} = {$final_resources[$actual_key]}");
                    }
                } else {
                    log_error("❌ Ресурс {$normalized_key} не найден в текущих ресурсах пользователя", [
                        'telegramId' => $telegram_id,
                        'key' => $key,
                        'normalized_key' => $normalized_key,
                        'search_key' => $search_key
                    ]);
                }
            }
            
            // Удаляем поле lastUpdated, если оно есть
            if (isset($final_resources['lastUpdated'])) {
                unset($final_resources['lastUpdated']);
            }
        } else {
            // Для обычного обновления ресурсов (не крафта)
            log_message("📊 Standard resource update - calculating final resources");
            
            // Создаем финальный массив ресурсов
            $final_resources = [];
            
            // Сохраняем служебные поля
            if (isset($current_resources['id'])) $final_resources['id'] = $current_resources['id'];
            if (isset($current_resources['telegramId'])) $final_resources['telegramId'] = $current_resources['telegramId'];
            
            // Сначала копируем текущие ресурсы
            foreach ($current_resources as $key => $value) {
                // Пропускаем служебные поля
                if ($key === 'id' || $key === 'telegramId' || $key === 'lastUpdated') {
                    continue;
                }
                
                // Добавляем в финальный массив
                $final_resources[$key] = intval($value);
            }
            
            // Обновляем ресурсы из запроса
            foreach ($resources as $key => $value) {
                // Пропускаем служебные поля
                if ($key === 'id' || $key === 'telegramId' || $key === 'lastUpdated') {
                    continue;
                }
                
                // Преобразуем значение в число
                $value = intval($value);
                
                // Стандартизируем имя ресурса
                $normalized_key = $key;
                $search_key = strtolower(str_replace(' ', '', $key));
                
                if (isset($resource_mapping[$search_key])) {
                    $normalized_key = $resource_mapping[$search_key];
                }
                
                // Добавляем или обновляем ресурс
                if (!isset($final_resources[$normalized_key])) {
                    $final_resources[$normalized_key] = $value;
                    log_message("🔍 Добавляем новый ресурс {$normalized_key}: {$value}");
                } else {
                    $old_value = $final_resources[$normalized_key];
                    $final_resources[$normalized_key] += $value;
                    log_message("🔍 Добавляем ресурс {$normalized_key}: {$old_value} + {$value} = {$final_resources[$normalized_key]}");
                }
            }
        }
        
        // Подготавливаем SQL-запрос в зависимости от того, передано ли значение resources_claimed
        if ($resources_claimed !== null) {
            // Если resources_claimed передан, обновляем также эту колонку
            $update_sql = "UPDATE game_users SET resources = :resources, resources_claimed = resources_claimed + :resources_claimed WHERE telegram_id = :telegram_id";
            $update_params = [
                'resources' => json_encode($final_resources),
                'resources_claimed' => $resources_claimed,
                'telegram_id' => $telegram_id
            ];
            log_message("✅ Updating resources and resources_claimed", ['resourcesClaimed' => $resources_claimed]);
        } else {
            // Если resources_claimed не передан, обновляем только ресурсы
            $update_sql = "UPDATE game_users SET resources = :resources WHERE telegram_id = :telegram_id";
            $update_params = [
                'resources' => json_encode($final_resources),
                'telegram_id' => $telegram_id
            ];
        }
        
        // Update resources in database
        $update_stmt = $pdo->prepare($update_sql);
        $update_stmt->execute($update_params);
        
        if ($update_stmt->rowCount() === 0) {
            log_error("❌ Failed to update resources", ['telegramId' => $telegram_id]);
            $pdo->rollBack();
            send_response(false, "Failed to update resources", 500);
            return;
        }
        
        // Commit transaction
        $pdo->commit();
        log_message("✅ Resources updated successfully", [
            'telegramId' => $telegram_id, 
            'resources' => $final_resources,
            'resourcesClaimedUpdated' => ($resources_claimed !== null)
        ]);
        
        send_response(true, "Resources updated successfully", 200, ['resources' => $final_resources]);
    } catch (PDOException $e) {
        log_error("❌ DATABASE ERROR during resources update", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        send_response(false, "Database error: " . $e->getMessage(), 500);
    } catch (Exception $e) {
        log_error("❌ GENERAL ERROR during resources update", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        
        if ($pdo && $pdo instanceof PDO && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        send_response(false, "Error: " . $e->getMessage(), 500);
    }
}

// Get gathering session
function get_gathering_session($pdo, $data) {
    log_message("📝 GET_GATHERING_SESSION - Raw request data: " . json_encode($data, JSON_PRETTY_PRINT));
    
    if (!isset($data['telegramId'])) {
        log_error("❌ Missing required data for gathering session retrieval", $data);
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    
    log_message("🔍 GET_GATHERING_SESSION - Starting session retrieval process", ['telegramId' => $telegram_id]);
    
    try {
        // Verify PDO connection
        if (!$pdo || !($pdo instanceof PDO)) {
            log_error("❌ Invalid PDO connection in get_gathering_session", ['telegramId' => $telegram_id]);
            send_response(false, "Database connection error", 500);
            return;
        }
        
        // Check if there is an active gathering session for the user
        $get_sql = "SELECT * FROM gathering_sessions WHERE telegram_id = :telegram_id AND (state = 'active' OR state = 'completed') LIMIT 1";
        $get_stmt = $pdo->prepare($get_sql);
        $get_stmt->execute(['telegram_id' => $telegram_id]);
        
        if ($get_stmt->rowCount() === 0) {
            log_message("ℹ️ No active gathering session found", ['telegramId' => $telegram_id]);
            send_response(true, "No active gathering session", 200, ['session' => null]);
            return;
        }
        
        $session_data = $get_stmt->fetch(PDO::FETCH_ASSOC);
        $current_time = time();
        
        // Проверяем, истек ли таймер для активной сессии
        if ($session_data['state'] === 'active' && (int)$session_data['end_time'] <= $current_time) {
            // Если таймер истек, автоматически обновляем статус на 'completed'
            log_message("ℹ️ Session timer has expired, updating state to completed", ['telegramId' => $telegram_id]);
            
            $update_state_sql = "UPDATE gathering_sessions SET state = 'completed' WHERE id = :id";
            $update_state_stmt = $pdo->prepare($update_state_sql);
            $update_state_stmt->execute(['id' => $session_data['id']]);
            
            // Обновляем данные сессии в нашей переменной
            $session_data['state'] = 'completed';
            
            log_message("✅ Session state updated to completed", ['sessionId' => $session_data['id']]);
        }
        
        // Получаем start_time в правильном формате
        $start_time = $session_data['start_time'];
        // Если start_time хранится как timestamp, используем как есть, иначе конвертируем
        if (is_numeric($start_time)) {
            $start_time = (int)$start_time;
        } else if ($start_time) {
            // Если это в формате SQL DATETIME
            $start_time = strtotime($start_time);
        } else {
            // Если start_time пуст, используем created_at
            $start_time = strtotime($session_data['created_at']);
        }
        
        // Получаем last_login в правильном формате (или устанавливаем текущее время, если его нет)
        $last_login = $session_data['last_login'] ?? time();
        if (!is_numeric($last_login) && $last_login) {
            $last_login = strtotime($last_login);
        } else if (is_numeric($last_login)) {
            $last_login = (int)$last_login;
        } else {
            $last_login = time();
        }
        
        // Получаем resources_claimed или устанавливаем значение по умолчанию, если поля нет
        $resources_claimed = 0;
        if (isset($session_data['resources_claimed'])) {
            $resources_claimed = (int)$session_data['resources_claimed'];
        }
        
        // Получаем тип сессии, по умолчанию 'gather'
        $session_type = isset($session_data['type']) ? $session_data['type'] : 'gather';
        log_message("ℹ️ Session type from database: " . $session_type);
        
        // Обновляем last_login в базе данных
        $update_time_sql = "UPDATE gathering_sessions SET last_login = :last_login WHERE id = :id";
        $update_time_stmt = $pdo->prepare($update_time_sql);
        $update_time_stmt->execute([
            'last_login' => time(),
            'id' => $session_data['id']
        ]);
        
        // Prepare the response data
        $response_data = [
            'id' => $session_data['id'],
            'telegram_id' => $session_data['telegram_id'],
            'state' => $session_data['state'],
            'end_time' => (int)$session_data['end_time'],
            'resources' => json_decode($session_data['resources'], true) ?: [],
            'total_gathered' => json_decode($session_data['total_gathered'], true) ?: [],
            'last_claim_time' => (int)$session_data['last_claim_time'],
            'next_resource_time' => (int)$session_data['next_resource_time'],
            'resources_claimed' => $resources_claimed, // Добавляем resources_claimed в ответ
            'created_at' => strtotime($session_data['created_at']), // Convert to timestamp
            'start_time' => $start_time, // Уже в формате timestamp
            'last_login' => time(), // Текущее время
            'updated_at' => $session_data['updated_at'],
            'type' => $session_type // Добавляем тип сессии в ответ
        ];
        
        log_message("✅ Gathering session retrieved successfully", [
            'telegramId' => $telegram_id,
            'startTime' => $response_data['start_time'],
            'lastLogin' => $response_data['last_login'],
            'createdAt' => $response_data['created_at'],
            'resourcesClaimed' => $response_data['resources_claimed'],
            'type' => $response_data['type'] // Логируем тип сессии
        ]);
        
        send_response(true, "Gathering session retrieved successfully", 200, ['session' => $response_data]);
    } catch (PDOException $e) {
        log_error("❌ DATABASE ERROR during gathering session retrieval", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        
        send_response(false, "Database error: " . $e->getMessage(), 500);
    } catch (Exception $e) {
        log_error("❌ GENERAL ERROR during gathering session retrieval", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        
        send_response(false, "Error: " . $e->getMessage(), 500);
    }
}

// Save gathering session
function save_gathering_session($pdo, $data) {
    log_message("📝 SAVE_GATHERING_SESSION - Raw request data: " . json_encode($data, JSON_PRETTY_PRINT));
    
    if (!isset($data['telegramId']) || !isset($data['state'])) {
        log_error("❌ Missing required data for gathering session save", $data);
        send_response(false, "Telegram ID and state are required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $state = $data['state'];
    $resources = $data['resources'] ?? [];
    $total_gathered = $data['totalGathered'] ?? [];
    $last_claim_time = $data['lastClaimTime'] ?? 0;
    $next_resource_time = $data['nextResourceTime'] ?? 0;
    $resources_claimed = isset($data['resourcesClaimed']) ? (int)$data['resourcesClaimed'] : 0; // Принудительно преобразуем в число
    $created_at_timestamp = $data['createdAt'] ?? time();
    $end_time = $data['endTime'] ?? 0;
    $start_time_timestamp = $data['startTime'] ?? $created_at_timestamp; // Используем startTime или createdAt как резерв
    $last_login = time(); // Текущее время в unix timestamp
    $type = isset($data['type']) ? $data['type'] : 'gather';
    
    log_message("🔍 SAVE_GATHERING_SESSION - Starting session save process", [
        'telegramId' => $telegram_id,
        'state' => $state,
        'createdAt' => $created_at_timestamp,
        'startTime' => $start_time_timestamp,
        'lastLogin' => $last_login,
        'endTime' => $end_time,
        'resources' => $resources,
        'total_gathered' => $total_gathered,
        'resources_claimed' => $resources_claimed,
        'type' => $type
    ]);
    
    try {
        // Verify PDO connection
        if (!$pdo || !($pdo instanceof PDO)) {
            log_error("❌ Invalid PDO connection in save_gathering_session", ['telegramId' => $telegram_id]);
            send_response(false, "Database connection error", 500);
            return;
        }
        
        // Проверяем, существует ли колонка resources_claimed в таблице gathering_sessions
        try {
            $check_column_sql = "SHOW COLUMNS FROM gathering_sessions LIKE 'resources_claimed'";
            $check_column_stmt = $pdo->query($check_column_sql);
            $column_exists = $check_column_stmt && $check_column_stmt->rowCount() > 0;
            
            if (!$column_exists) {
                log_message("ℹ️ Column 'resources_claimed' does not exist, adding it");
                $add_column_sql = "ALTER TABLE gathering_sessions ADD COLUMN resources_claimed INT NOT NULL DEFAULT 0 AFTER next_resource_time";
                $pdo->exec($add_column_sql);
                log_message("✅ Column 'resources_claimed' successfully added to gathering_sessions table");
            }
            
            // Проверяем, существует ли колонка type в таблице gathering_sessions
            $check_type_column_sql = "SHOW COLUMNS FROM gathering_sessions LIKE 'type'";
            $check_type_column_stmt = $pdo->query($check_type_column_sql);
            $type_column_exists = $check_type_column_stmt && $check_type_column_stmt->rowCount() > 0;
            
            if (!$type_column_exists) {
                log_message("ℹ️ Column 'type' does not exist, adding it");
                $add_type_column_sql = "ALTER TABLE gathering_sessions ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'gather' AFTER resources_claimed";
                $pdo->exec($add_type_column_sql);
                log_message("✅ Column 'type' successfully added to gathering_sessions table");
            } else {
                // Проверяем размер существующей колонки type и увеличиваем при необходимости
                try {
                    $check_type_size_sql = "SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'gathering_sessions' AND COLUMN_NAME = 'type'";
                    $check_type_size_stmt = $pdo->query($check_type_size_sql);
                    $type_size_info = $check_type_size_stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($type_size_info && $type_size_info['CHARACTER_MAXIMUM_LENGTH'] < 50) {
                        log_message("ℹ️ Column 'type' size is too small, modifying to VARCHAR(50)");
                        $modify_type_column_sql = "ALTER TABLE gathering_sessions MODIFY COLUMN type VARCHAR(50) NOT NULL DEFAULT 'gather'";
                        $pdo->exec($modify_type_column_sql);
                        log_message("✅ Column 'type' successfully modified to VARCHAR(50)");
                    }
                } catch (PDOException $e) {
                    log_error("❌ Error checking/modifying type column size", ['message' => $e->getMessage()]);
                }
            }
        } catch (PDOException $e) {
            log_error("❌ Error checking/adding columns to gathering_sessions table", ['message' => $e->getMessage()]);
            // Продолжаем выполнение, так как ошибка при проверке колонки не должна останавливать процесс
        }
        
        // Begin transaction
        $pdo->beginTransaction();
        log_message("🔄 Transaction started for gathering session save");
        
        // Check if there is already a session for this user
        $check_sql = "SELECT id, start_time, resources_claimed FROM gathering_sessions WHERE telegram_id = :telegram_id";
        $check_stmt = $pdo->prepare($check_sql);
        $check_stmt->execute(['telegram_id' => $telegram_id]);
        
        // Create a MySQL datetime from the timestamp for created_at
        $created_at = date('Y-m-d H:i:s', $created_at_timestamp);
        
        if ($check_stmt->rowCount() > 0) {
            // Update existing session
            $session_data = $check_stmt->fetch(PDO::FETCH_ASSOC);
            $session_id = $session_data['id'];
            
            // Получаем текущее значение resources_claimed из базы для проверки
            $current_db_resources_claimed = isset($session_data['resources_claimed']) ? (int)$session_data['resources_claimed'] : 0;
            log_message("ℹ️ Current resources_claimed in DB: {$current_db_resources_claimed}, New value from request: {$resources_claimed}");
            
            // Если новое значение меньше, чем текущее в базе, используем значение из базы
            if ($resources_claimed < $current_db_resources_claimed) {
                log_message("⚠️ New resources_claimed value ({$resources_claimed}) is less than DB value ({$current_db_resources_claimed}), using DB value");
                $resources_claimed = $current_db_resources_claimed;
            }
            
            // НЕ обновляем start_time для существующей сессии, но ОБНОВЛЯЕМ last_login
            $update_sql = "UPDATE gathering_sessions SET 
                state = :state,
                end_time = :end_time,
                resources = :resources,
                total_gathered = :total_gathered,
                last_claim_time = :last_claim_time,
                next_resource_time = :next_resource_time,
                resources_claimed = :resources_claimed,
                created_at = :created_at,
                last_login = :last_login,
                updated_at = NOW(),
                type = :type
                WHERE id = :id";
            
            $update_stmt = $pdo->prepare($update_sql);
            $update_success = $update_stmt->execute([
                'state' => $state,
                'end_time' => $end_time,
                'resources' => json_encode($resources),
                'total_gathered' => json_encode($total_gathered),
                'last_claim_time' => $last_claim_time,
                'next_resource_time' => $next_resource_time,
                'resources_claimed' => $resources_claimed,
                'created_at' => $created_at,
                'last_login' => $last_login,
                'id' => $session_id,
                'type' => $type
            ]);
            
            if (!$update_success) {
                log_error("❌ Failed to update gathering session", ['telegramId' => $telegram_id, 'sessionId' => $session_id]);
                $pdo->rollBack();
                send_response(false, "Failed to update gathering session", 500);
                return;
            }
            
            log_message("✅ Gathering session updated successfully", [
                'telegramId' => $telegram_id, 
                'sessionId' => $session_id,
                'createdAt' => $created_at,
                'startTime' => $session_data['start_time'],
                'lastLogin' => $last_login,
                'endTime' => $end_time,
                'resources' => $resources,
                'total_gathered' => $total_gathered,
                'resources_claimed' => $resources_claimed
            ]);
        } else {
            // Create new session с INT для start_time и last_login
            $insert_sql = "INSERT INTO gathering_sessions (
                telegram_id, state, end_time, resources, total_gathered, 
                last_claim_time, next_resource_time, resources_claimed, created_at, start_time, last_login, updated_at, type
            ) VALUES (
                :telegram_id, :state, :end_time, :resources, :total_gathered, 
                :last_claim_time, :next_resource_time, :resources_claimed, :created_at, :start_time, :last_login, NOW(), :type
            )";
            
            $insert_stmt = $pdo->prepare($insert_sql);
            $insert_success = $insert_stmt->execute([
                'telegram_id' => $telegram_id,
                'state' => $state,
                'end_time' => $end_time,
                'resources' => json_encode($resources),
                'total_gathered' => json_encode($total_gathered),
                'last_claim_time' => $last_claim_time,
                'next_resource_time' => $next_resource_time,
                'resources_claimed' => $resources_claimed,
                'created_at' => $created_at,
                'start_time' => $start_time_timestamp, // Сохраняем как INT
                'last_login' => $last_login, // Сохраняем текущее время как INT
                'type' => $type
            ]);
            
            if (!$insert_success) {
                log_error("❌ Failed to create gathering session", ['telegramId' => $telegram_id]);
                $pdo->rollBack();
                send_response(false, "Failed to create gathering session", 500);
                return;
            }
            
            $session_id = $pdo->lastInsertId();
            log_message("✅ Gathering session created successfully", [
                'telegramId' => $telegram_id, 
                'sessionId' => $session_id,
                'createdAt' => $created_at,
                'startTime' => $start_time_timestamp,
                'lastLogin' => $last_login,
                'endTime' => $end_time,
                'resources' => $resources,
                'total_gathered' => $total_gathered,
                'resources_claimed' => $resources_claimed
            ]);
        }
        
        // Commit transaction
        $pdo->commit();
        
        send_response(true, "Gathering session saved successfully", 200, ['sessionId' => $session_id]);
    } catch (PDOException $e) {
        log_error("❌ DATABASE ERROR during gathering session save", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        send_response(false, "Database error: " . $e->getMessage(), 500);
    } catch (Exception $e) {
        log_error("❌ GENERAL ERROR during gathering session save", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        
        if ($pdo && $pdo instanceof PDO && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        send_response(false, "Error: " . $e->getMessage(), 500);
    }
}

// Delete gathering session
function delete_gathering_session($pdo, $data) {
    log_message("📝 DELETE_GATHERING_SESSION - Raw request data: " . json_encode($data, JSON_PRETTY_PRINT));
    
    if (!isset($data['telegramId'])) {
        log_error("❌ Missing required data for gathering session deletion", $data);
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    
    // Защита от дублирующих запросов - проверяем, существует ли сессия
    try {
        $check_sql = "SELECT COUNT(*) as session_count FROM gathering_sessions WHERE telegram_id = :telegram_id";
        $check_stmt = $pdo->prepare($check_sql);
        $check_stmt->execute(['telegram_id' => $telegram_id]);
        $result = $check_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result || intval($result['session_count']) === 0) {
            // Если сессия уже не существует, значит вероятно это повторный запрос
            log_message("⚠️ Попытка удалить несуществующую сессию - возможен дублирующий запрос", 
                ['telegramId' => $telegram_id]);
            
            // Возвращаем успех, так как сессия уже удалена
            send_response(true, "Session already deleted", 200);
            return;
        }
    } catch (Exception $e) {
        // В случае ошибки продолжаем выполнение, чтобы не блокировать основную функциональность
        log_message("⚠️ Ошибка при проверке существования сессии: " . $e->getMessage());
    }
    
    log_message("🔍 DELETE_GATHERING_SESSION - Starting session deletion process", ['telegramId' => $telegram_id]);
    
    try {
        // Verify PDO connection
        if (!$pdo || !($pdo instanceof PDO)) {
            log_error("❌ Invalid PDO connection in delete_gathering_session", ['telegramId' => $telegram_id]);
            send_response(false, "Database connection error", 500);
            return;
        }
        
        // Delete the gathering session
        $delete_sql = "DELETE FROM gathering_sessions WHERE telegram_id = :telegram_id";
        $delete_stmt = $pdo->prepare($delete_sql);
        $delete_success = $delete_stmt->execute(['telegram_id' => $telegram_id]);
        
        if (!$delete_success) {
            log_error("❌ Failed to delete gathering session", ['telegramId' => $telegram_id]);
            send_response(false, "Failed to delete gathering session", 500);
            return;
        }
        
        $rows_affected = $delete_stmt->rowCount();
        log_message("✅ Gathering session deleted successfully", ['telegramId' => $telegram_id, 'rowsAffected' => $rows_affected]);
        
        send_response(true, "Gathering session deleted successfully", 200);
    } catch (PDOException $e) {
        log_error("❌ DATABASE ERROR during gathering session deletion", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        
        send_response(false, "Database error: " . $e->getMessage(), 500);
    } catch (Exception $e) {
        log_error("❌ GENERAL ERROR during gathering session deletion", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        
        send_response(false, "Error: " . $e->getMessage(), 500);
    }
}

// Log gathering session to file
function log_gathering_session($data) {
    if (!isset($data['telegramId']) || !isset($data['resources']) || !isset($data['endMethod'])) {
        send_response(false, "Required fields missing for logging", 400);
        return;
    }
    
    $logFile = __DIR__ . '/gathering_log.txt';
    $timestamp = date('Y-m-d H:i:s');
    
    // Компактное логирование только основных данных
    $compact_data = [
        'telegramId' => $data['telegramId'],
        'resources' => $data['resources'],
        'method' => $data['endMethod']
    ];
    
    // Format log entry и пишем в файл
    $logEntry = "[$timestamp] GATHERING SESSION: " . json_encode($compact_data, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    @file_put_contents($logFile, $logEntry, FILE_APPEND);
    
    // Возвращаем успешный результат
    send_response(true, "Gathering session logged", 200);
}

// Функция для получения активных сессий крафтинга пользователя
function get_crafting_sessions($telegramId) {
    global $pdo;
    log_message("Getting crafting sessions for user: " . $telegramId);
    
    try {
        $sql = "SELECT * FROM crafting_sessions WHERE telegram_id = :telegram_id AND status = 'active'";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegramId]);
        
        $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        log_message("Found " . count($sessions) . " active crafting sessions");
        
        return $sessions;
    } catch (PDOException $e) {
        log_error("Error getting crafting sessions: " . $e->getMessage());
        return [];
    }
}

/**
 * Получить только активные сеансы крафтинга пользователя
 * 
 * @param string $telegramId Telegram ID пользователя
 * @return array Список активных сеансов крафтинга
 */
function get_active_crafting_sessions($telegramId) {
    global $pdo;
    log_message("Getting active crafting sessions for user: " . $telegramId);
    
    try {
        // Проверяем, существует ли таблица crafting_sessions
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'crafting_sessions'");
        $tableExists = $tableCheck && $tableCheck->rowCount() > 0;
        
        if (!$tableExists) {
            // Создаем таблицу если не существует
            $createTableSQL = "CREATE TABLE IF NOT EXISTS `crafting_sessions` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `telegram_id` varchar(50) NOT NULL,
                `item_id` varchar(50) NOT NULL,
                `item_name` varchar(100) NOT NULL,
                `quantity` int(11) NOT NULL DEFAULT 1,
                `materials` text NOT NULL,
                `status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
                `start_time` int(11) NOT NULL,
                `end_time` int(11) NOT NULL,
                `craft_time` int(11) NOT NULL,
                `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `telegram_id` (`telegram_id`),
                KEY `status` (`status`),
                KEY `end_time` (`end_time`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            
            $pdo->exec($createTableSQL);
            log_message("Crafting sessions table created successfully");
            return [];
        }
        
        // Первым делом - найдем и обновим статус всех сессий, у которых истекло время крафта
        $currentTime = time();
        
        // Сначала найдем сессии, которые должны быть уже завершены
        $expiredSessionsSQL = "SELECT * FROM crafting_sessions 
                               WHERE telegram_id = :telegram_id 
                               AND status = 'active' 
                               AND end_time <= :current_time";
        
        $expiredStmt = $pdo->prepare($expiredSessionsSQL);
        $expiredStmt->execute([
            'telegram_id' => $telegramId,
            'current_time' => $currentTime
        ]);
        
        $expiredSessions = $expiredStmt->fetchAll(PDO::FETCH_ASSOC);
        $expiredCount = count($expiredSessions);
        
        if ($expiredCount > 0) {
            log_message("Found " . $expiredCount . " expired crafting sessions that need to be updated");
            
            // Обновим статус истекших сессий на "completed"
            $updateExpiredSQL = "UPDATE crafting_sessions 
                              SET status = 'completed', updated_at = NOW() 
                              WHERE telegram_id = :telegram_id 
                              AND status = 'active' 
                              AND end_time <= :current_time";
            
            $updateExpiredStmt = $pdo->prepare($updateExpiredSQL);
            $updateResult = $updateExpiredStmt->execute([
                'telegram_id' => $telegramId,
                'current_time' => $currentTime
            ]);
            
            if ($updateResult) {
                log_message("Successfully updated status for " . $expiredCount . " expired crafting sessions");
            } else {
                log_error("Failed to update expired sessions status");
            }
        }
        
        // Теперь получаем все активные сессии - как истекшие, так и текущие
        // Чтобы клиент мог получить информацию о завершенных сессиях и добавить предметы в инвентарь
        $sql = "SELECT * FROM crafting_sessions 
               WHERE telegram_id = :telegram_id 
               AND status = 'active' OR (status = 'completed' AND updated_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR))
               ORDER BY end_time ASC";
               
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'telegram_id' => $telegramId
        ]);
        
        $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        log_message("Returning " . count($sessions) . " crafting sessions for user " . $telegramId);
        
        return $sessions;
    } catch (PDOException $e) {
        log_error("Error getting active crafting sessions: " . $e->getMessage());
        log_crafting("ERROR", [
            'error' => $e->getMessage(),
            'telegramId' => $telegramId
        ]);
        return [];
    }
}

// Функция для обновления статуса сессии крафтинга
function update_crafting_session($sessionId, $status, $telegramId = null) {
    global $pdo;
    log_message("Updating crafting session status: " . $sessionId . " to " . $status);
    
    try {
        // Если передан telegramId, используем его как основной критерий поиска сессии
        if ($telegramId) {
            log_message("Using telegramId as primary search criteria for session", [
                'telegramId' => $telegramId,
                'sessionId' => $sessionId,
                'status' => $status
            ]);
            
            // Сначала попробуем найти сессию по совпадению telegramId и sessionId
            $checkSQL = "SELECT * FROM crafting_sessions WHERE id = :id AND telegram_id = :telegram_id";
        $checkStmt = $pdo->prepare($checkSQL);
            $checkStmt->execute([
                'id' => $sessionId, 
                'telegram_id' => $telegramId
            ]);
            $session = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            // Если не нашли точное совпадение, найдем любую активную сессию этого пользователя 
            if (!$session) {
                log_message("Session not found with exact ID match, looking for any active session for user", [
                    'telegramId' => $telegramId,
                    'requestedSessionId' => $sessionId
                ]);
                
                // Ищем ЛЮБУЮ активную сессию для этого пользователя
                $alternativeSQL = "SELECT * FROM crafting_sessions 
                                   WHERE telegram_id = :telegram_id 
                                   AND status = 'active' 
                                   ORDER BY end_time ASC LIMIT 1";
                $alternativeStmt = $pdo->prepare($alternativeSQL);
                $alternativeStmt->execute(['telegram_id' => $telegramId]);
                $session = $alternativeStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($session) {
                    log_message("Found alternative active session for user", [
                        'telegramId' => $telegramId,
                        'requestedSessionId' => $sessionId,
                        'foundSessionId' => $session['id']
                    ]);
                    
                    // Обновляем sessionId на найденный ID
                    $sessionId = $session['id'];
                    log_crafting("SESSION ID REMAPPED", [
                        'originalSessionId' => $sessionId,
                        'newSessionId' => $session['id'],
                        'telegramId' => $telegramId
                    ]);
        }
            }
        } else {
            // Если telegramId не передан, ищем сессию только по ID
            $checkSQL = "SELECT * FROM crafting_sessions WHERE id = :id";
            $checkStmt = $pdo->prepare($checkSQL);
            $checkStmt->execute(['id' => $sessionId]);
        $session = $checkStmt->fetch(PDO::FETCH_ASSOC);
        }
        
        // Если сессия не найдена после всех проверок
        if (!$session) {
            log_error("Crafting session not found: " . $sessionId);
            log_crafting("SESSION NOT FOUND", [
                'sessionId' => $sessionId,
                'telegramId' => $telegramId
            ]);
            return false;
        }
        
        // Если статус обновляется на 'completed' и есть telegramId, то удаляем сессию после обновления
        $shouldDelete = $status === 'completed' && $telegramId !== null;
        
        if ($shouldDelete) {
            log_message("Session will be deleted after status update: " . $sessionId);
        }
        
        // Выполняем обновление статуса
        if ($telegramId) {
            // Если есть telegramId, обновляем только для этого пользователя
            $sql = "UPDATE crafting_sessions SET status = :status, updated_at = NOW() 
                    WHERE id = :id AND telegram_id = :telegram_id";
            $updateParams = [
                'status' => $status,
                'id' => $sessionId,
                'telegram_id' => $telegramId
            ];
        } else {
            // Иначе просто по ID
            $sql = "UPDATE crafting_sessions SET status = :status, updated_at = NOW() WHERE id = :id";
        $updateParams = [
            'status' => $status,
            'id' => $sessionId
        ];
        }
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($updateParams);
        
        if ($result) {
            log_message("Crafting session updated successfully");
            
            // Если крафт завершен, добавляем информацию о выданных предметах
            if ($status === 'completed') {
                // Получаем информацию о пользователе
                $userInfo = get_user_info($session['telegram_id']);
                $quantity = $session['quantity'] ?? 1;
                
                // Отладочные логи
                log_message("ОТЛАДКА КРАФТ ЗАВЕРШЕН - данные сессии", [
                    'session' => $session,
                    'userInfo' => $userInfo,
                    'quantity' => $quantity
                ]);
                
                // Получаем текущий инвентарь для расчета изменений
                $currentInventory = getUserInventoryData($session['telegram_id']);
                $producedItemId = $session['item_id'];
                
                // Рассчитываем изменение в инвентаре
                $itemsAdded = $quantity;
                $itemCurrentCount = 0;
                
                if ($currentInventory && isset($currentInventory[$producedItemId])) {
                    $itemCurrentCount = $currentInventory[$producedItemId]['quantity'] ?? 0;
                }
                
                // Текущий инвентарь уже содержит добавленные предметы
                $itemBeforeCount = max(0, $itemCurrentCount - $itemsAdded); // Количество до добавления
                $itemAfterCount = $itemCurrentCount; // Количество после добавления
                
                // Структурированный лог завершения крафта (упорядоченные поля)
                $craftCompleteData = [
                    'sessionId' => $sessionId,
                    'telegramId' => $session['telegram_id'],
                    'username' => $userInfo['nickname'],
                    'item' => [
                        'id' => $session['item_id'],
                        'quantity' => $quantity
                    ],
                    'resourcesProduced' => [
                        $session['item_id'] => $quantity
                    ],
                    'inventoryChange' => [
                        'itemId' => $producedItemId,
                        'before' => $itemBeforeCount, // До добавления
                        'added' => $itemsAdded,
                        'after' => $itemAfterCount
                    ]
                ];
                
                log_message("ОТЛАДКА КРАФТ ЗАВЕРШЕН - итоговые данные для лога", $craftCompleteData);
                log_crafting("КРАФТ ЗАВЕРШЕН", $craftCompleteData);
            } else {
                // Обычный лог для других статусов
                log_crafting("SESSION UPDATE", [
                    'action' => 'session_status_update',
                    'sessionId' => $sessionId,
                    'telegramId' => $session['telegram_id'],
                    'itemId' => $session['item_id'],
                    'itemName' => $session['item_name'],
                    'status' => $status
                ]);
            }
            
            // Если нужно удалить сессию
            if ($shouldDelete) {
                try {
                    // Удаляем сессию из БД
                    $deleteSQL = "DELETE FROM crafting_sessions WHERE id = :id AND telegram_id = :telegram_id";
                    $deleteStmt = $pdo->prepare($deleteSQL);
                    $deleteResult = $deleteStmt->execute([
                        'id' => $sessionId,
                        'telegram_id' => $telegramId
                    ]);
                    
                    if ($deleteResult) {
                        log_message("Crafting session deleted after completion: " . $sessionId);
                        // Дополнительный лог для удаления сессии (основной лог "КРАФТ ЗАВЕРШЕН" уже есть выше)
                        log_message("Crafting session removed from database: " . $sessionId);
                    } else {
                        log_error("Failed to delete crafting session: " . $sessionId);
                        log_crafting("ERROR", [
                            'sessionId' => $sessionId,
                            'telegramId' => $telegramId,
                            'error' => 'Failed to delete crafting session'
                        ]);
                    }
                } catch (PDOException $deleteEx) {
                    log_error("Error deleting crafting session: " . $deleteEx->getMessage());
                    log_crafting("ERROR", [
                        'sessionId' => $sessionId,
                        'telegramId' => $telegramId,
                        'error' => $deleteEx->getMessage()
                    ]);
                }
            }
            
            return true;
        } else {
            log_error("Failed to update crafting session status");
            log_crafting("ERROR", [
                'sessionId' => $sessionId,
                'telegramId' => $session['telegram_id'],
                'error' => 'Failed to update crafting session status'
            ]);
            return false;
        }
    } catch (PDOException $e) {
        log_error("Error updating crafting session: " . $e->getMessage());
        log_crafting("ERROR", [
            'sessionId' => $sessionId,
            'error' => $e->getMessage()
        ]);
        return false;
    }
}

// Функция для сохранения новой сессии крафтинга
// Функция для получения информации о пользователе (ресурсы и никнейм)
function get_user_info($telegramId) {
    global $pdo;
    
    try {
        $sql = "SELECT nickname, resources FROM game_users WHERE telegram_id = :telegram_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegramId]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        log_message("get_user_info debug", [
            'telegramId' => $telegramId,
            'foundResult' => !!$result,
            'nickname' => $result['nickname'] ?? 'not found',
            'resourcesField' => $result['resources'] ?? 'not found'
        ]);
        
        if ($result) {
            $resources = [];
            if ($result['resources']) {
                $resources = json_decode($result['resources'], true) ?: [];
            }
            
            return [
                'nickname' => $result['nickname'] ?? 'Unknown',
                'resources' => $resources
            ];
        }
        
        return [
            'nickname' => 'Unknown',
            'resources' => []
        ];
    } catch (PDOException $e) {
        log_error("Error getting user info: " . $e->getMessage());
        return [
            'nickname' => 'Unknown',
            'resources' => []
        ];
    }
}

// Функция для получения ресурсов пользователя (для обратной совместимости)
function get_user_resources($telegramId) {
    $userInfo = get_user_info($telegramId);
    return $userInfo['resources'];
}

// Функция для получения инвентаря пользователя
function getUserInventoryData($telegramId) {
    global $pdo;
    
    try {
        $sql = "SELECT inventory FROM game_users WHERE telegram_id = :telegram_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegramId]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result && $result['inventory']) {
            $inventory = json_decode($result['inventory'], true);
            if ($inventory && is_array($inventory)) {
                // Если это упрощенный формат ({"itemId": quantity}), преобразуем в полный
                $fullInventory = [];
                foreach ($inventory as $itemId => $value) {
                    if (is_numeric($value)) {
                        // Упрощенный формат
                        $fullInventory[$itemId] = [
                            'quantity' => (int)$value,
                            'name' => $itemId
                        ];
                    } else {
                        // Полный формат
                        $fullInventory[$itemId] = $value;
                    }
                }
                return $fullInventory;
            }
        }
        return [];
    } catch (PDOException $e) {
        log_error("Error getting user inventory: " . $e->getMessage());
        return [];
    }
}

function save_crafting_session($telegramId, $itemId, $itemName, $quantity, $materials, $craftTime) {
    global $pdo;
    log_message("Creating new crafting session for item: " . $itemId);
    
    // Получаем информацию о пользователе (никнейм и ресурсы)
    $userInfo = get_user_info($telegramId);
    $resourcesBefore = $userInfo['resources'];
    $username = $userInfo['nickname'];
    
    // Парсим материалы
    $materialsArray = [];
    if (is_string($materials)) {
        $materialsArray = json_decode($materials, true) ?: [];
    } elseif (is_array($materials)) {
        $materialsArray = $materials;
    }
    
    // Вычисляем общее количество материалов с учетом количества крафтимых предметов
    $totalMaterialsUsed = [];
    foreach ($materialsArray as $materialId => $materialAmount) {
        $totalMaterialsUsed[$materialId] = $materialAmount * $quantity;
    }
    
    // Создаем детальную информацию о ресурсах (только затронутые крафтом)
    $resourcesInfo = [];
    $affectedResourcesBefore = [];
    $affectedResourcesAfter = [];
    
    foreach ($totalMaterialsUsed as $materialId => $usedAmount) {
        // Ищем правильное название ресурса в текущих ресурсах пользователя (игнорируем регистр)
        $actualResourceKey = null;
        $beforeAmount = 0;
        
        foreach ($resourcesBefore as $resourceKey => $resourceAmount) {
            // Расширенная логика поиска ресурсов с учетом различных вариантов названий
            $normalizedResourceKey = strtolower(str_replace([' ', '_'], '', $resourceKey));
            $normalizedMaterialId = strtolower(str_replace([' ', '_'], '', $materialId));
            
            if ($normalizedResourceKey === $normalizedMaterialId || 
                strtolower($resourceKey) === strtolower($materialId) ||
                ($normalizedMaterialId === 'woodlog' && $normalizedResourceKey === 'woodlog') ||
                ($normalizedMaterialId === 'woodlog' && strtolower($resourceKey) === 'wood log')) {
                $actualResourceKey = $resourceKey;
                $beforeAmount = $resourceAmount;
                break;
            }
        }
        
        if ($actualResourceKey) {
            $afterAmount = $beforeAmount - $usedAmount;
            
            $resourcesInfo[$actualResourceKey] = [
                'before' => $beforeAmount,
                'used' => $usedAmount,
                'after' => $afterAmount
            ];
            
            // Собираем только затронутые ресурсы для компактного отображения
            $affectedResourcesBefore[$actualResourceKey] = $beforeAmount;
            $affectedResourcesAfter[$actualResourceKey] = $afterAmount;
        } else {
            // Если ресурс не найден, все равно записываем для отладки
            $resourcesInfo[$materialId] = [
                'before' => 0,
                'used' => $usedAmount,
                'after' => -$usedAmount
            ];
            $affectedResourcesBefore[$materialId] = 0;
            $affectedResourcesAfter[$materialId] = -$usedAmount;
        }
    }
    
    // Отладочные логи перед основным логом
    log_message("ОТЛАДКА КРАФТ НАЧАТ - данные перед логированием", [
        'telegramId' => $telegramId,
        'username' => $username,
        'itemId' => $itemId,
        'itemName' => $itemName,
        'quantity' => $quantity,
        'craftTime' => $craftTime,
        'resourcesBefore' => $resourcesBefore,
        'totalMaterialsUsed' => $totalMaterialsUsed,
        'resourcesInfo' => $resourcesInfo
    ]);
    
    // Структурированный лог начала крафта (компактный формат)
    $craftStartData = [
        'telegramId' => $telegramId,
        'username' => $username,
        'item' => [
            'id' => $itemId,
            'quantity' => $quantity
        ],
        'craftTime' => $craftTime,
        'resourcesDetailed' => $resourcesInfo
    ];
    
    try {
        $currentTime = time();
        $endTime = $currentTime + $craftTime;
        
        $sql = "INSERT INTO crafting_sessions 
                (telegram_id, item_id, item_name, quantity, materials, status, start_time, end_time, craft_time) 
                VALUES 
                (:telegram_id, :item_id, :item_name, :quantity, :materials, 'active', :start_time, :end_time, :craft_time)";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            'telegram_id' => $telegramId,
            'item_id' => $itemId,
            'item_name' => $itemName,
            'quantity' => $quantity,
            'materials' => $materials,
            'start_time' => $currentTime,
            'end_time' => $endTime,
            'craft_time' => $craftTime
        ]);
        
        if ($result) {
            $sessionId = $pdo->lastInsertId();
            log_message("Crafting session created successfully with ID: " . $sessionId);
            
            // Обновляем данные для лога с sessionId и упорядочиваем поля
            $craftStartData = [
                'sessionId' => $sessionId,
                'telegramId' => $telegramId,
                'username' => $username,
                'item' => [
                    'id' => $itemId,
                    'quantity' => $quantity
                ],
                'craftTime' => $craftTime,
                'resourcesDetailed' => $resourcesInfo
            ];
            
            log_message("ОТЛАДКА КРАФТ НАЧАТ - итоговые данные для лога", $craftStartData);
            log_crafting("КРАФТ НАЧАТ", $craftStartData);
            
            return [
                'id' => $sessionId,
                'telegramId' => $telegramId,
                'itemId' => $itemId,
                'itemName' => $itemName,
                'startTime' => $currentTime,
                'endTime' => $endTime,
                'craftTime' => $craftTime
            ];
        } else {
            log_error("Failed to create crafting session");
            log_crafting("ERROR", [
                'telegramId' => $telegramId,
                'itemId' => $itemId,
                'itemName' => $itemName,
                'error' => 'Failed to create crafting session'
            ]);
            return null;
        }
    } catch (PDOException $e) {
        log_error("Error creating crafting session: " . $e->getMessage());
        log_crafting("ERROR", [
            'error' => $e->getMessage(),
            'telegramId' => $telegramId,
            'itemId' => $itemId
        ]);
        return null;
    }
}

// Функция для обновления инвентаря пользователя
function update_inventory($telegramId, $inventoryJson) {
    global $pdo;
    log_message("Updating inventory for user: " . $telegramId);
    
    try {
        // Проверяем существование таблицы
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'inventory_items'");
        $tableExists = $tableCheck && $tableCheck->rowCount() > 0;
        
        if (!$tableExists) {
            // Создаем таблицу инвентаря если не существует
            $createTableSQL = "CREATE TABLE IF NOT EXISTS `inventory_items` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `telegram_id` varchar(50) NOT NULL,
                `item_id` varchar(50) NOT NULL,
                `quantity` int(11) NOT NULL DEFAULT 1,
                `equipped` tinyint(1) NOT NULL DEFAULT 0,
                `slot` varchar(20) DEFAULT NULL,
                `created_at` datetime NOT NULL,
                `updated_at` datetime NOT NULL,
                PRIMARY KEY (`id`),
                KEY `telegram_id` (`telegram_id`),
                KEY `item_id` (`item_id`),
                KEY `equipped` (`equipped`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            
            $result = $pdo->exec($createTableSQL);
            log_message("Inventory table creation result: " . ($result !== false ? 'Success' : 'Failed'));
        }
        
        // Определяем формат инвентаря и конвертируем в нужный формат
        $inventoryData = $inventoryJson;
        
        // Если это строка, пробуем декодировать как JSON
        if (is_string($inventoryJson)) {
            $inventoryData = json_decode($inventoryJson, true);
            if ($inventoryData === null) {
                log_error("Invalid inventory JSON data: " . json_last_error_msg());
                log_crafting("ERROR", [
                    'telegramId' => $telegramId,
                    'error' => 'Invalid inventory JSON data: ' . json_last_error_msg()
                ]);
                return false;
            }
            log_message("Converted JSON string to array data");
        } else {
            // Просто используем как есть - это уже должен быть массив или объект
            log_message("Using inventory data as is - already decoded");
        }
        
        // Преобразуем инвентарь в стандартный формат (id => quantity)
        $newItems = [];
        
        // Проверяем формат инвентаря (массив или объект)
        if (isset($inventoryData[0]) && is_array($inventoryData)) {
            // Формат массива объектов [{itemId: "id1", quantity: 5}, ...]
            log_message("Processing inventory in array format");
            foreach ($inventoryData as $item) {
                if (isset($item['itemId']) && isset($item['quantity']) && $item['quantity'] > 0) {
                    $newItems[$item['itemId']] = [
                        'quantity' => (int)$item['quantity']
                    ];
                }
            }
        } else {
            // Формат объекта {id1: {quantity: 5}, ...}
            log_message("Processing inventory in object format");
            foreach ($inventoryData as $itemId => $item) {
                if (isset($item['quantity']) && $item['quantity'] > 0) {
                    $newItems[$itemId] = [
                        'quantity' => (int)$item['quantity']
                    ];
                } else if (is_numeric($item) && $item > 0) {
                    $newItems[$itemId] = [
                        'quantity' => (int)$item
                    ];
                }
            }
        }
        


        // Начинаем транзакцию
        $pdo->beginTransaction();
        
        // Получаем существующие предметы пользователя
        $getExistingSQL = "SELECT item_id, quantity FROM inventory_items WHERE telegram_id = :telegram_id AND equipped = 0";
        $getExistingStmt = $pdo->prepare($getExistingSQL);
        $getExistingStmt->execute(['telegram_id' => $telegramId]);
        $existingItems = $getExistingStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Преобразуем в формат item_id => quantity
        $existingItemsMap = [];
        foreach ($existingItems as $item) {
            $existingItemsMap[$item['item_id']] = (int)$item['quantity'];
        }
        

        
        // Удаляем текущие предметы пользователя (только неэкипированные)
        $deleteSQL = "DELETE FROM inventory_items WHERE telegram_id = :telegram_id AND equipped = 0";
        $deleteStmt = $pdo->prepare($deleteSQL);
        $deleteStmt->execute(['telegram_id' => $telegramId]);
        
        // Объединяем существующие предметы с новыми
        $finalInventory = [];
        
        // Сначала копируем все существующие предметы
        foreach ($existingItemsMap as $itemId => $quantity) {
            $finalInventory[$itemId] = [
                'quantity' => $quantity
            ];
        }
        
        // Затем добавляем или обновляем новые предметы
        foreach ($newItems as $itemId => $item) {
            if (isset($finalInventory[$itemId])) {
                // Если предмет уже существует, прибавляем количество
                $finalInventory[$itemId]['quantity'] += $item['quantity'];

            } else {
                // Если предмета нет, добавляем его
                $finalInventory[$itemId] = [
                    'quantity' => $item['quantity']
                ];

            }
        }
        
        // Добавляем новые предметы
        $insertSQL = "INSERT INTO inventory_items 
                    (telegram_id, item_id, quantity, equipped, created_at, updated_at) 
                    VALUES 
                    (:telegram_id, :item_id, :quantity, 0, NOW(), NOW())";
        $insertStmt = $pdo->prepare($insertSQL);
        
        foreach ($finalInventory as $itemId => $item) {
            if (!isset($item['quantity']) || $item['quantity'] <= 0) {
                continue;
            }
            
            $insertStmt->execute([
                'telegram_id' => $telegramId,
                'item_id' => $itemId,
                'quantity' => $item['quantity']
            ]);
            

        }
        
        // Also update the inventory column in game_users table
        // Преобразуем инвентарь в упрощенный формат для сохранения в game_users
        $simplifiedInventory = [];
        foreach ($finalInventory as $itemId => $item) {
            if (isset($item['quantity']) && $item['quantity'] > 0) {
                $simplifiedInventory[$itemId] = (int)$item['quantity'];
            }
        }
        
        // Преобразуем упрощенный инвентарь в JSON
        $simplifiedInventoryJson = json_encode($simplifiedInventory);
        
        log_message("Saving inventory in simplified format to game_users", [
            'telegramId' => $telegramId
        ]);
        
        $updateUserSQL = "UPDATE game_users SET inventory = :inventory WHERE telegram_id = :telegram_id";
        $updateUserStmt = $pdo->prepare($updateUserSQL);
        $updateResult = $updateUserStmt->execute([
            'inventory' => $simplifiedInventoryJson,
            'telegram_id' => $telegramId
        ]);
        
        if (!$updateResult) {
            log_error("Failed to update game_users inventory", [
                'telegramId' => $telegramId
            ]);
        }
        
        // Завершаем транзакцию
        $pdo->commit();
        log_message("Inventory updated successfully for user: " . $telegramId);
        return true;
        
    } catch (PDOException $e) {
        // Откатываем транзакцию в случае ошибки
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        log_error("Error updating inventory: " . $e->getMessage());
        log_crafting("INVENTORY UPDATE ERROR", [
            'telegramId' => $telegramId,
            'error' => $e->getMessage()
        ]);
        return false;
    }
}

/**
 * Функция для обновления инвентаря в колонке inventory таблицы game_users
 * @param string $telegramId ID пользователя в Telegram
 * @param string $inventoryJson JSON-строка с инвентарем (id предмета => количество)
 * @return bool Результат операции
 */
function update_user_inventory($telegramId, $inventoryJson) {
    global $pdo;
    log_message("Updating inventory in game_users for user: " . $telegramId);
    log_crafting("USER INVENTORY UPDATE REQUESTED", [
        'telegramId' => $telegramId,
        'inventoryType' => gettype($inventoryJson)
    ]);
    
    try {
        // Определяем формат инвентаря и конвертируем в нужный формат
        $inventoryData = $inventoryJson;
        
        // Если это строка, пробуем декодировать как JSON
        if (is_string($inventoryJson)) {
            $inventoryData = json_decode($inventoryJson, true);
            if ($inventoryData === null) {
                log_error("Invalid inventory JSON data for game_users: " . json_last_error_msg());
                log_crafting("USER INVENTORY UPDATE FAILED - Invalid JSON", [
                    'telegramId' => $telegramId,
                    'error' => json_last_error_msg()
                ]);
                return false;
            }
            log_message("Converted JSON string to array data for user inventory");
        } else {
            // Просто используем как есть - это уже должен быть массив или объект
            log_message("Using user inventory data as is - already decoded");
        }
        
        // Преобразуем формат инвентаря в более компактный (ID => количество)
        $newItems = [];
        
        // Проверяем формат инвентаря (массив или объект)
        if (isset($inventoryData[0]) && is_array($inventoryData)) {
            // Формат массива объектов [{itemId: "id1", quantity: 5}, ...]
            foreach ($inventoryData as $item) {
                if (isset($item['itemId']) && isset($item['quantity']) && $item['quantity'] > 0) {
                    $newItems[$item['itemId']] = (int)$item['quantity'];
                }
            }
        } else {
            // Формат объекта {id1: {quantity: 5, name: "Item name"}, ...} или {id1: 5, id2: 10, ...}
            foreach ($inventoryData as $itemId => $item) {
                // Проверяем, является ли значение простым числом или объектом
                if (is_array($item) && isset($item['quantity'])) {
                    $newItems[$itemId] = (int)$item['quantity'];
                } else if (is_numeric($item)) {
                    $newItems[$itemId] = (int)$item;
                }
            }
        }
        
        // Получаем текущий инвентарь из базы данных
        $getCurrentSQL = "SELECT inventory FROM game_users WHERE telegram_id = :telegram_id";
        $getCurrentStmt = $pdo->prepare($getCurrentSQL);
        $getCurrentStmt->execute(['telegram_id' => $telegramId]);
        $currentData = $getCurrentStmt->fetch(PDO::FETCH_ASSOC);
        
        $currentInventory = [];
        if ($currentData && isset($currentData['inventory']) && !empty($currentData['inventory'])) {
            $currentInventory = json_decode($currentData['inventory'], true);
            if (!is_array($currentInventory)) {
                $currentInventory = []; // Сбрасываем если инвентарь невалидный
            }
        }
        
        log_crafting("CURRENT INVENTORY", [
            'count' => count($currentInventory),
            'items' => is_array($currentInventory) ? array_keys($currentInventory) : 'invalid'
        ]);
        
        // Объединяем текущий инвентарь с новыми предметами
        $finalInventory = $currentInventory;
        
        foreach ($newItems as $itemId => $quantity) {
            if (isset($finalInventory[$itemId])) {
                // Если предмет уже существует, прибавляем количество
                $finalInventory[$itemId] += $quantity;
                log_crafting("UPDATED EXISTING ITEM", [
                    'itemId' => $itemId,
                    'oldQuantity' => $currentInventory[$itemId],
                    'addedQuantity' => $quantity,
                    'newQuantity' => $finalInventory[$itemId]
                ]);
            } else {
                // Если предмета нет, добавляем его
                $finalInventory[$itemId] = $quantity;
                log_crafting("ADDED NEW ITEM", [
                    'itemId' => $itemId,
                    'quantity' => $quantity
                ]);
            }
        }
        
        log_crafting("PROCESSED USER INVENTORY DATA", [
            'count' => count($finalInventory),
            'items' => array_keys($finalInventory)
        ]);
        
        // Преобразуем упрощенный инвентарь в JSON
        $finalInventoryJson = json_encode($finalInventory);
        
        // Обновляем инвентарь в таблице game_users
        $updateSQL = "UPDATE game_users SET inventory = :inventory WHERE telegram_id = :telegram_id";
        $updateStmt = $pdo->prepare($updateSQL);
        $updateResult = $updateStmt->execute([
            'inventory' => $finalInventoryJson,
            'telegram_id' => $telegramId
        ]);
        
        if ($updateResult) {
            log_message("User inventory in game_users table updated successfully for user: " . $telegramId);
            log_crafting("USER INVENTORY UPDATE COMPLETED SUCCESSFULLY", [
                'telegramId' => $telegramId,
                'itemCount' => count($finalInventory)
            ]);
            return true;
        } else {
            log_error("Failed to update user inventory in game_users table for user: " . $telegramId);
            log_crafting("USER INVENTORY UPDATE FAILED - DB ERROR", [
                'telegramId' => $telegramId
            ]);
            return false;
        }
        
    } catch (PDOException $e) {
        log_error("Error updating user inventory in game_users: " . $e->getMessage());
        log_crafting("USER INVENTORY UPDATE ERROR", [
            'telegramId' => $telegramId,
            'error' => $e->getMessage()
        ]);
        return false;
    }
}

// Функция для обновления булевых полей в таблице game_users (например campfire и furnace)
function updateUserBoolean($pdo, $data) {
    log_message("📝 UPDATE_USER_BOOLEAN - Raw request data: " . json_encode($data, JSON_PRETTY_PRINT));
    
    if (!isset($data['telegramId']) || !isset($data['column']) || !isset($data['value'])) {
        log_error("❌ Missing required data for boolean field update", $data);
        send_response(false, "Telegram ID, column name and value are required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $column = $data['column'];
    $value = (int)$data['value']; // Преобразуем в число
    
    // Проверяем, что колонка допустима для обновления (белый список)
    $allowed_columns = ['campfire', 'furnace']; // Только колонки, которые можно обновлять через этот API
    
    if (!in_array($column, $allowed_columns)) {
        log_error("❌ Attempt to update forbidden column", ['column' => $column, 'telegramId' => $telegram_id]);
        send_response(false, "Column not allowed for updates through this API", 400);
        return;
    }
    
    try {
        // Проверяем соединение с БД
        if (!$pdo || !($pdo instanceof PDO)) {
            log_error("❌ Invalid PDO connection in updateUserBoolean", ['telegramId' => $telegram_id]);
            send_response(false, "Database connection error", 500);
            return;
        }
        
        // Безопасное построение SQL-запроса с использованием подготовленных выражений
        $update_sql = "UPDATE game_users SET {$column} = :value WHERE telegram_id = :telegram_id";
        $update_stmt = $pdo->prepare($update_sql);
        
        // Выполняем запрос
        $result = $update_stmt->execute([
            'value' => $value,
            'telegram_id' => $telegram_id
        ]);
        
        if ($result) {
            log_message("✅ Successfully updated {$column} = {$value} for user {$telegram_id}");
            send_response(true, "Field {$column} updated successfully", 200);
        } else {
            log_error("❌ Failed to update {$column} for user", ['telegramId' => $telegram_id, 'error' => $update_stmt->errorInfo()]);
            send_response(false, "Failed to update user field", 500);
        }
        
    } catch (Exception $e) {
        log_error("❌ Exception in updateUserBoolean: " . $e->getMessage(), [
            'telegramId' => $telegram_id,
            'column' => $column,
            'stack' => $e->getTraceAsString()
        ]);
        send_response(false, "Error updating user field: " . $e->getMessage(), 500);
    }
}

// Функция для обновления количества конкретного предмета в инвентаре пользователя
function updateUserInventoryItem($pdo, $data) {
    log_message("📝 UPDATE_USER_INVENTORY_ITEM - Raw request data: " . json_encode($data, JSON_PRETTY_PRINT));
    
    if (!isset($data['telegramId']) || !isset($data['itemId']) || !isset($data['quantity'])) {
        log_error("❌ Missing required data for inventory item update", $data);
        send_response(false, "Telegram ID, item ID and quantity are required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $item_id = $data['itemId'];
    $quantity = (int)$data['quantity'];
    $operation = isset($data['operation']) ? $data['operation'] : 'increment'; // 'increment' или 'set'
    
    log_message("🔍 UPDATE_USER_INVENTORY_ITEM - Starting inventory item update", [
        'telegramId' => $telegram_id,
        'itemId' => $item_id,
        'quantity' => $quantity,
        'operation' => $operation
    ]);
    
    try {
        // Проверяем соединение с БД
        if (!$pdo || !($pdo instanceof PDO)) {
            log_error("❌ Invalid PDO connection in updateUserInventoryItem", ['telegramId' => $telegram_id]);
            send_response(false, "Database connection error", 500);
            return;
        }
        
        // Начинаем транзакцию
        $pdo->beginTransaction();
        
        // Получаем текущий инвентарь пользователя
        $get_sql = "SELECT inventory FROM game_users WHERE telegram_id = :telegram_id";
        $get_stmt = $pdo->prepare($get_sql);
        $get_stmt->execute(['telegram_id' => $telegram_id]);
        
        if ($get_stmt->rowCount() === 0) {
            log_error("❌ User not found", ['telegramId' => $telegram_id]);
            $pdo->rollBack();
            send_response(false, "User not found", 404);
            return;
        }
        
        $user_data = $get_stmt->fetch(PDO::FETCH_ASSOC);
        $current_inventory = json_decode($user_data['inventory'], true) ?: [];
        
        log_message("✅ Current inventory retrieved", ['current' => $current_inventory]);
        
        // Обновляем количество предмета в инвентаре
        if ($operation === 'set') {
            // Режим установки конкретного значения
            if ($quantity <= 0) {
                // Если количество 0 или меньше, удаляем предмет из инвентаря
                if (isset($current_inventory[$item_id])) {
                    unset($current_inventory[$item_id]);
                    log_message("🔍 Removing item {$item_id} from inventory (quantity set to {$quantity})");
                }
            } else {
                // Устанавливаем новое количество
                $current_inventory[$item_id] = $quantity;
                log_message("🔍 Setting item {$item_id} quantity to {$quantity}");
            }
        } else {
            // Режим инкремента (по умолчанию) - увеличиваем или уменьшаем количество
            $current_quantity = isset($current_inventory[$item_id]) ? (int)$current_inventory[$item_id] : 0;
            $new_quantity = $current_quantity + $quantity;
            
            if ($new_quantity <= 0) {
                // Если новое количество 0 или меньше, удаляем предмет из инвентаря
                if (isset($current_inventory[$item_id])) {
                    unset($current_inventory[$item_id]);
                    log_message("🔍 Removing item {$item_id} from inventory (new quantity: {$new_quantity})");
                }
            } else {
                // Обновляем количество
                $current_inventory[$item_id] = $new_quantity;
                log_message("🔍 Updating item {$item_id}: {$current_quantity} + ({$quantity}) = {$new_quantity}");
            }
        }
        
        // Обновляем инвентарь в базе данных
        $update_sql = "UPDATE game_users SET inventory = :inventory WHERE telegram_id = :telegram_id";
        $update_stmt = $pdo->prepare($update_sql);
        $update_result = $update_stmt->execute([
            'inventory' => json_encode($current_inventory),
            'telegram_id' => $telegram_id
        ]);
        
        if (!$update_result) {
            log_error("❌ Failed to update inventory", [
                'telegramId' => $telegram_id,
                'itemId' => $item_id,
                'errorInfo' => $update_stmt->errorInfo()
            ]);
            $pdo->rollBack();
            send_response(false, "Failed to update inventory", 500);
            return;
        }
        
        // Фиксируем транзакцию
        $pdo->commit();
        
        log_message("✅ Inventory item updated successfully", [
            'telegramId' => $telegram_id,
            'itemId' => $item_id,
            'quantity' => $quantity,
            'operation' => $operation
        ]);
        
        send_response(true, "Inventory item updated successfully", 200, [
            'itemId' => $item_id,
            'newInventory' => $current_inventory
        ]);
        
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        log_error("❌ DATABASE ERROR during inventory item update", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id,
            'itemId' => $item_id
        ]);
        
        send_response(false, "Database error: " . $e->getMessage(), 500);
    } catch (Exception $e) {
        if ($pdo && $pdo instanceof PDO && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        log_error("❌ GENERAL ERROR during inventory item update", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id,
            'itemId' => $item_id
        ]);
        
        send_response(false, "Error: " . $e->getMessage(), 500);
    }
}

// Close the database connection is no longer needed for PDO


function equip_item($pdo, $post_data) {
    error_log('EQUIP_ITEM DEBUG: ' . print_r($post_data, true));
    log_message('EQUIP_ITEM входящие данные', $post_data);
    if (!isset($post_data['telegramId'], $post_data['slot'], $post_data['itemId'])) {
        send_response(false, 'Missing parameters', 400);
        return;
    }
    
    $telegram_id = $post_data['telegramId'];
    $slot = $post_data['slot'];
    $item_id = $post_data['itemId'];
    
    try {
        $pdo->beginTransaction();
        
        // Получаем текущую экипировку пользователя
        $checkEquipped = $pdo->prepare("SELECT * FROM equiped_items WHERE telegram_id = :telegram_id");
        $checkEquipped->execute(['telegram_id' => $telegram_id]);
        $equipped = $checkEquipped->fetch(PDO::FETCH_ASSOC);
        
        // Проверка для weapon2: если в weapon1 экипирован лук, нельзя ничего надеть во второй слот
        if ($slot === 'weapon2' && $equipped && !empty($equipped['weapon1'])) {
            $weapon1 = $equipped['weapon1'];
            if (stripos($weapon1, 'bow') !== false) {
                error_log("EQUIP_ITEM ERROR: Нельзя экипировать предмет в weapon2, так как в weapon1 уже экипирован лук");
                $pdo->rollBack();
                send_response(false, 'Cannot equip item in offhand slot while bow is equipped in main hand', 400);
                return;
            }
        }
        
        // Получаем текущий инвентарь пользователя
        $getInventory = $pdo->prepare("SELECT inventory FROM game_users WHERE telegram_id = :telegram_id");
        $getInventory->execute(['telegram_id' => $telegram_id]);
        $inventoryRow = $getInventory->fetch(PDO::FETCH_ASSOC);
        
        if (!$inventoryRow) {
            $pdo->rollBack();
            error_log("EQUIP_ITEM ERROR: Пользователь не найден: $telegram_id");
            send_response(false, 'User not found', 404);
            return;
        }
        
        $inventory = json_decode($inventoryRow['inventory'], true);
        if (!is_array($inventory)) {
            $inventory = [];
        }
        
        // Проверка наличия предмета в инвентаре
        if (!isset($inventory[$item_id]) || $inventory[$item_id] <= 0) {
            $pdo->rollBack();
            error_log("EQUIP_ITEM ERROR: Предмет $item_id не найден в инвентаре пользователя $telegram_id");
            send_response(false, 'Item not found in inventory', 400);
            return;
        }
        
        error_log('EQUIP_ITEM: текущая экипировка: ' . print_r($equipped, true));
        
        // Если в слоте уже есть предмет, возвращаем его в инвентарь
        if ($equipped && !empty($equipped[$slot])) {
            $oldItemId = $equipped[$slot];
            error_log("EQUIP_ITEM: снимаем предмет $oldItemId из слота $slot");
            
            // Возвращаем старый предмет в инвентарь
            if (isset($inventory[$oldItemId])) {
                $inventory[$oldItemId]++;
            } else {
                $inventory[$oldItemId] = 1;
            }
            
            // Если снимаем лук из weapon1, то освобождаем также слот weapon2
            if ($slot == 'weapon1' && (stripos($oldItemId, 'bow') !== false)) {
                // Слот weapon2 визуально занят луком, но формально пуст, так как лук занимает оба слота
                // Дополнительных действий не требуется
            }
        }
        
        // Уменьшаем количество предмета в инвентаре
        $inventory[$item_id]--;
        if ($inventory[$item_id] <= 0) {
            unset($inventory[$item_id]); // Удаляем, если количество 0
        }
        
        // Отключаем автоматическое надевание стрел
        $autoEquipArrows = false;
        $arrowItem = null;
        
        // Обновляем инвентарь в game_users
        $invJson = json_encode($inventory);
        $updUser = $pdo->prepare("UPDATE game_users SET inventory = :inv WHERE telegram_id = :telegram_id");
        $updUser->execute(['inv' => $invJson, 'telegram_id' => $telegram_id]);
        error_log("EQUIP_ITEM: обновлен инвентарь в game_users для $telegram_id, новый JSON: $invJson");
        
        // Обновляем экипировку в equiped_items
        if ($equipped) {
            // Обновляем основной слот
            $updEquiped = $pdo->prepare("UPDATE equiped_items SET $slot = :item_id WHERE telegram_id = :telegram_id");
            $updEquiped->execute(['item_id' => $item_id, 'telegram_id' => $telegram_id]);
            error_log("EQUIP_ITEM: обновлен equiped_items ($slot = $item_id) для пользователя $telegram_id");
            } else {
                // Обычная экипировка
                $insEquiped = $pdo->prepare("INSERT INTO equiped_items (telegram_id, $slot) VALUES (:telegram_id, :item_id)");
                $insEquiped->execute(['telegram_id' => $telegram_id, 'item_id' => $item_id]);
                error_log("EQUIP_ITEM: создан equiped_items ($slot = $item_id) для пользователя $telegram_id");
        }
        
        $pdo->commit();
        error_log('EQUIP_ITEM: успешно завершено для пользователя ' . $telegram_id);
        send_response(true, 'Equipped', 200);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('EQUIP_ITEM ERROR: ' . $e->getMessage());
        send_response(false, 'DB error: ' . $e->getMessage(), 500);
    }
}

// Функция для снятия экипированного предмета
function unequip_item($pdo, $post_data) {
    error_log('UNEQUIP_ITEM DEBUG: ' . print_r($post_data, true));
    log_message('UNEQUIP_ITEM входящие данные', $post_data);
    if (!isset($post_data['telegramId'], $post_data['slot'], $post_data['itemId'])) {
        send_response(false, 'Missing parameters', 400);
        return;
    }
    
    $telegram_id = $post_data['telegramId'];
    $slot = $post_data['slot'];
    $item_id = $post_data['itemId'];
    
    try {
        $pdo->beginTransaction();
        
        // Проверяем, что предмет действительно экипирован в указанный слот
        $checkEquipped = $pdo->prepare("SELECT * FROM equiped_items WHERE telegram_id = :telegram_id");
        $checkEquipped->execute(['telegram_id' => $telegram_id]);
        $equipped = $checkEquipped->fetch(PDO::FETCH_ASSOC);
        
        // Проверка, что в слоте находится этот предмет
        if (!$equipped || $equipped[$slot] !== $item_id) {
            $pdo->rollBack();
            error_log("UNEQUIP_ITEM ERROR: Предмет $item_id не найден в слоте $slot для пользователя $telegram_id");
            send_response(false, 'Item not found in specified slot', 400);
            return;
        }
        
        // Получаем текущий инвентарь из game_users
        $getInventory = $pdo->prepare("SELECT inventory FROM game_users WHERE telegram_id = :telegram_id");
        $getInventory->execute(['telegram_id' => $telegram_id]);
        $inventoryRow = $getInventory->fetch(PDO::FETCH_ASSOC);
        
        if (!$inventoryRow) {
            $pdo->rollBack();
            error_log("UNEQUIP_ITEM ERROR: Пользователь не найден: $telegram_id");
            send_response(false, 'User not found', 404);
            return;
        }
        
        $inventory = json_decode($inventoryRow['inventory'], true);
        if (!is_array($inventory)) {
            $inventory = [];
        }
        
        // Возвращаем предмет в инвентарь
        if (isset($inventory[$item_id])) {
            $inventory[$item_id]++;
        } else {
            $inventory[$item_id] = 1;
        }
        
        // Отключаем автоматическое снятие стрел
        $autoUnequipArrows = false;
        
        // Обновляем инвентарь в game_users
        $invJson = json_encode($inventory);
        $updUser = $pdo->prepare("UPDATE game_users SET inventory = :inv WHERE telegram_id = :telegram_id");
        $updUser->execute(['inv' => $invJson, 'telegram_id' => $telegram_id]);
        error_log("UNEQUIP_ITEM: обновлен инвентарь в game_users для $telegram_id, новый JSON: $invJson");
        
        // Удаляем предмет из слота экипировки
            $updateEquipped = $pdo->prepare("UPDATE equiped_items SET $slot = NULL WHERE telegram_id = :telegram_id");
            $updateEquipped->execute(['telegram_id' => $telegram_id]);
            error_log("UNEQUIP_ITEM: предмет $item_id удален из слота $slot для пользователя $telegram_id");
        
        $pdo->commit();
        send_response(true, 'Item unequipped successfully', 200);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('UNEQUIP_ITEM ERROR: ' . $e->getMessage());
        send_response(false, 'DB error: ' . $e->getMessage(), 500);
    }
}

// Функция для определения подходящего слота для предмета
function get_item_slot($item_id) {
    if (!$item_id) return null;
    
    // Стрелы больше нельзя экипировать
    if (stripos($item_id, 'arrow') !== false || stripos($item_id, 'bolt') !== false || 
        stripos($item_id, 'ammo') !== false || stripos($item_id, 'ammunition') !== false) {
        return null;
    }
    
    if (stripos($item_id, 'bow') !== false) {
        return 'weapon1';
    } else if (stripos($item_id, 'sword') !== false || stripos($item_id, 'axe') !== false || 
               stripos($item_id, 'dagger') !== false || stripos($item_id, 'staff') !== false ||
               stripos($item_id, 'mace') !== false || stripos($item_id, 'hammer') !== false) {
        return 'weapon1';
    } else if (stripos($item_id, 'shield') !== false || stripos($item_id, 'offhand') !== false) {
        return 'weapon2';
    } else if (stripos($item_id, 'helmet') !== false || stripos($item_id, 'crown') !== false || 
               stripos($item_id, 'hat') !== false || stripos($item_id, 'mask') !== false) {
        return 'helmet';
    } else if (stripos($item_id, 'armor') !== false || stripos($item_id, 'robe') !== false || 
               stripos($item_id, 'chest') !== false) {
        return 'armor';
    } else if (stripos($item_id, 'belt') !== false || stripos($item_id, 'sash') !== false) {
        return 'belt';
    } else if (stripos($item_id, 'pants') !== false || stripos($item_id, 'leggings') !== false || 
               stripos($item_id, 'trousers') !== false) {
        return 'pants';
    } else if (stripos($item_id, 'boots') !== false || stripos($item_id, 'shoes') !== false || 
               stripos($item_id, 'greaves') !== false) {
        return 'boots';
    } else if (stripos($item_id, 'gloves') !== false || stripos($item_id, 'gauntlets') !== false) {
        return 'gloves';
    } else if (stripos($item_id, 'bracers') !== false || stripos($item_id, 'vambrace') !== false) {
        return 'bracers';
    } else if (stripos($item_id, 'earring') !== false) {
        return 'earring';
    } else if (stripos($item_id, 'amulet') !== false || stripos($item_id, 'necklace') !== false || 
               stripos($item_id, 'pendant') !== false) {
        return 'amulet';
    } else if (stripos($item_id, 'ring') !== false) {
        return 'ring1';
    } else if (stripos($item_id, 'potion') !== false || stripos($item_id, 'elixir') !== false || 
               stripos($item_id, 'flask') !== false) {
        return 'potion1';
    } else {
    return null;
    }
}

// ----------------------------------------
// Function to update burn time for campfire or furnace
// ----------------------------------------
function updateBurnTime($pdo, $data) {
    log_message("📝 UPDATE_BURN_TIME - Raw request data: " . json_encode($data, JSON_PRETTY_PRINT));
    
    if (!isset($data['telegramId']) || !isset($data['column']) || !isset($data['value'])) {
        log_error("❌ Missing required data for burn time update", $data);
        send_response(false, "Telegram ID, column name and value are required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $column = $data['column'];
    $value = (int)$data['value']; // Преобразуем в число (Unix timestamp)
    
    // Проверяем, что колонка допустима для обновления (белый список)
    $allowed_columns = ['campfire_burn', 'furnace_burn']; // Только колонки, которые можно обновлять через этот API
    
    if (!in_array($column, $allowed_columns)) {
        log_error("❌ Attempt to update forbidden column", ['column' => $column, 'telegramId' => $telegram_id]);
        send_response(false, "Column not allowed for updates through this API", 400);
        return;
    }
    
    try {
        // Проверяем соединение с БД
        if (!$pdo || !($pdo instanceof PDO)) {
            log_error("❌ Invalid PDO connection in updateBurnTime", ['telegramId' => $telegram_id]);
            send_response(false, "Database connection error", 500);
            return;
        }
        
        // Безопасное построение SQL-запроса с использованием подготовленных выражений
        $update_sql = "UPDATE game_users SET {$column} = :value WHERE telegram_id = :telegram_id";
        $update_stmt = $pdo->prepare($update_sql);
        
        // Выполняем запрос
        $result = $update_stmt->execute([
            'value' => $value,
            'telegram_id' => $telegram_id
        ]);
        
        if ($result) {
            log_message("✅ Successfully updated {$column} = {$value} for user {$telegram_id}");
            send_response(true, "Field {$column} updated successfully", 200);
        } else {
            log_error("❌ Failed to update {$column} for user", ['telegramId' => $telegram_id, 'error' => $update_stmt->errorInfo()]);
            send_response(false, "Failed to update user field", 500);
        }
        
    } catch (Exception $e) {
        log_error("❌ Exception in updateBurnTime: " . $e->getMessage(), [
            'telegramId' => $telegram_id,
            'column' => $column,
            'stack' => $e->getTraceAsString()
        ]);
        send_response(false, "Error updating user field: " . $e->getMessage(), 500);
    }
}

// ----------------------------------------
// Функция для получения текущей стамины с расчетом регенерации
// ----------------------------------------
function getStamina($pdo, $data) {
    log_message("🔍 GET_STAMINA - Starting to retrieve stamina data");
    
    if (!isset($data['telegramId'])) {
        log_error("Missing telegramId in getStamina request", $data);
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    log_message("🔍 GET_STAMINA - Retrieving stamina for user", ["telegramId" => $telegram_id]);
    
    try {
        // Константы для стамины
        $MAX_STAMINA = 10;
        $REGEN_RATE = 1; // 1 очко стамины за минуту
        
        // Получаем текущие данные стамины из БД
        $sql = "SELECT stamina, stamina_update FROM game_users WHERE telegram_id = :telegram_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegram_id]);
        $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user_data) {
            log_error("User not found in getStamina", ['telegramId' => $telegram_id]);
            send_response(false, "User not found", 404);
            return;
        }
        
        $current_stamina = (int)$user_data['stamina'];
        $last_update = (int)$user_data['stamina_update'];
        $now = round(microtime(true)); // Текущее время в секундах
        
        log_message("📊 Current stamina data from DB", [
            'stamina' => $current_stamina,
            'last_update' => $last_update,
            'current_time' => $now
        ]);
        
        // Если стамина не максимальная, рассчитываем регенерацию
        if ($current_stamina < $MAX_STAMINA) {
            $elapsed_seconds = $now - $last_update;
            $elapsed_minutes = $elapsed_seconds / 60; // Переводим в минуты
            
            if ($elapsed_minutes > 0) {
                // Рассчитываем количество восстановленной стамины
                $stamina_regenerated = floor($elapsed_minutes * $REGEN_RATE);
                $new_stamina = min($MAX_STAMINA, $current_stamina + $stamina_regenerated);
                
                log_message("🔄 Stamina regeneration calculation", [
                    'elapsed_minutes' => $elapsed_minutes,
                    'stamina_regenerated' => $stamina_regenerated,
                    'old_stamina' => $current_stamina,
                    'new_stamina' => $new_stamina
                ]);
                
                // Если стамина изменилась, обновляем в БД
                if ($new_stamina !== $current_stamina) {
                    // ИСПРАВЛЕНО: При регенерации ОБНОВЛЯЕМ stamina_update на время последней полной минуты регенерации
                    // Это предотвращает повторную регенерацию при следующих запросах
                    $new_update_time = $last_update + (floor($elapsed_minutes) * 60);
                    
                    $update_sql = "UPDATE game_users SET stamina = :stamina, stamina_update = :stamina_update WHERE telegram_id = :telegram_id";
                    $update_stmt = $pdo->prepare($update_sql);
                    $update_stmt->execute([
                        'stamina' => $new_stamina,
                        'stamina_update' => $new_update_time,
                        'telegram_id' => $telegram_id
                    ]);
                    
                    log_message("✅ Stamina regenerated in database", [
                        'old_stamina' => $current_stamina,
                        'new_stamina' => $new_stamina,
                        'old_update_time' => $last_update,
                        'new_update_time' => $new_update_time,
                        'elapsed_minutes' => $elapsed_minutes,
                        'minutes_processed' => floor($elapsed_minutes)
                    ]);
                    
                    $current_stamina = $new_stamina;
                    $last_update = $new_update_time; // Обновляем для возврата клиенту
                }
            }
        }
        
        // Отправляем ответ
        send_response(true, "Stamina retrieved successfully", 200, [
            'stamina' => $current_stamina,
            'maxStamina' => $MAX_STAMINA,
            'lastUpdate' => $last_update  // ИСПРАВЛЕНО: возвращаем оригинальное время последнего обновления
        ]);
        
    } catch (PDOException $e) {
        log_error("❌ DATABASE ERROR during stamina retrieval", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// ----------------------------------------
// Функция для уменьшения стамины
// ----------------------------------------
function decreaseStamina($pdo, $data) {
    log_message("🔻 DECREASE_STAMINA - Starting to decrease stamina");
    
    if (!isset($data['telegramId'])) {
        log_error("Missing telegramId in decreaseStamina request", $data);
        send_response(false, "Telegram ID is required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $amount = isset($data['amount']) ? (int)$data['amount'] : 1;
    
    log_message("🔻 DECREASE_STAMINA - Processing for user", [
        "telegramId" => $telegram_id,
        "amount" => $amount
    ]);
    
    try {
        // Константы для стамины
        $MAX_STAMINA = 10;
        $REGEN_RATE = 1; // 1 очко стамины в минуту
        
        // Получаем текущие данные стамины из БД
        $sql = "SELECT stamina, stamina_update FROM game_users WHERE telegram_id = :telegram_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegram_id]);
        $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user_data) {
            log_error("User not found in decreaseStamina", ['telegramId' => $telegram_id]);
            send_response(false, "User not found", 404);
            return;
        }
        
        $current_stamina = (int)$user_data['stamina'];
        $last_update = (int)$user_data['stamina_update'];
        $now = round(microtime(true));
        
        log_message("📊 Current stamina data from DB in decreaseStamina", [
            'stamina' => $current_stamina,
            'last_update' => $last_update,
            'current_time' => $now
        ]);
        
        // Если стамина не максимальная, рассчитываем регенерацию ПЕРЕД уменьшением
        if ($current_stamina < $MAX_STAMINA) {
            $elapsed_seconds = $now - $last_update;
            $elapsed_minutes = $elapsed_seconds / 60;
            
            if ($elapsed_minutes > 0) {
                $stamina_regenerated = floor($elapsed_minutes * $REGEN_RATE);
                $regenerated_stamina = min($MAX_STAMINA, $current_stamina + $stamina_regenerated);
                
                // Если стамина регенерировалась, обновляем время последней регенерации
                if ($regenerated_stamina !== $current_stamina) {
                    $last_update = $last_update + (floor($elapsed_minutes) * 60);
                }
                
                log_message("🔄 Stamina regeneration in decreaseStamina", [
                    'elapsed_minutes' => $elapsed_minutes,
                    'stamina_regenerated' => $stamina_regenerated,
                    'old_stamina' => $current_stamina,
                    'regenerated_stamina' => $regenerated_stamina,
                    'minutes_processed' => floor($elapsed_minutes),
                    'updated_last_update' => $last_update
                ]);
                
                $current_stamina = $regenerated_stamina;
            }
        }
        
        log_message("📊 Stamina before decrease", [
            'current_stamina' => $current_stamina,
            'amount_to_decrease' => $amount
        ]);
        
        // Проверяем, достаточно ли стамины
        if ($current_stamina < $amount) {
            log_message("⚠️ Insufficient stamina", [
                'current' => $current_stamina,
                'required' => $amount
            ]);
            send_response(false, "Insufficient stamina", 400, [
                'stamina' => $current_stamina,
                'required' => $amount
            ]);
            return;
        }
        
        // Уменьшаем стамину
        $new_stamina = $current_stamina - $amount;
        
        log_message("📊 Stamina after calculation", [
            'old_stamina' => $current_stamina,
            'new_stamina' => $new_stamina
        ]);
        
        $update_sql = "UPDATE game_users SET stamina = :stamina, stamina_update = :stamina_update WHERE telegram_id = :telegram_id";
        $update_stmt = $pdo->prepare($update_sql);
        $result = $update_stmt->execute([
            'stamina' => $new_stamina,
            'stamina_update' => $now,
            'telegram_id' => $telegram_id
        ]);
        
        if ($result && $update_stmt->rowCount() > 0) {
            log_message("✅ Stamina decreased successfully", [
                'old_stamina' => $current_stamina,
                'new_stamina' => $new_stamina,
                'amount_decreased' => $amount,
                'rows_affected' => $update_stmt->rowCount()
            ]);
            
            send_response(true, "Stamina decreased successfully", 200, [
                'stamina' => $new_stamina,
                'maxStamina' => $MAX_STAMINA,
                'lastUpdate' => $now,  // При трате стамины возвращаем новое время
                'decreased' => $amount
            ]);
        } else {
            log_error("Failed to update stamina in database", [
                'telegramId' => $telegram_id,
                'rows_affected' => $update_stmt->rowCount()
            ]);
            send_response(false, "Failed to update stamina", 500);
        }
        
    } catch (PDOException $e) {
        log_error("❌ DATABASE ERROR during stamina decrease", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// ----------------------------------------
// Функция для установки стамины (админская или для особых случаев)
// ----------------------------------------
function updateStamina($pdo, $data) {
    log_message("🔧 UPDATE_STAMINA - Starting to update stamina");
    
    if (!isset($data['telegramId']) || !isset($data['stamina'])) {
        log_error("Missing required data in updateStamina request", $data);
        send_response(false, "Telegram ID and stamina value are required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $new_stamina = (int)$data['stamina'];
    $MAX_STAMINA = 10;
    
    // Проверяем границы значений
    if ($new_stamina < 0 || $new_stamina > $MAX_STAMINA) {
        log_error("Invalid stamina value", [
            'telegramId' => $telegram_id,
            'stamina' => $new_stamina,
            'max_allowed' => $MAX_STAMINA
        ]);
        send_response(false, "Stamina value must be between 0 and {$MAX_STAMINA}", 400);
        return;
    }
    
    log_message("🔧 UPDATE_STAMINA - Processing for user", [
        "telegramId" => $telegram_id,
        "new_stamina" => $new_stamina
    ]);
    
    try {
        $now = round(microtime(true));
        
        $update_sql = "UPDATE game_users SET stamina = :stamina, stamina_update = :stamina_update WHERE telegram_id = :telegram_id";
        $update_stmt = $pdo->prepare($update_sql);
        $result = $update_stmt->execute([
            'stamina' => $new_stamina,
            'stamina_update' => $now,
            'telegram_id' => $telegram_id
        ]);
        
        if ($result && $update_stmt->rowCount() > 0) {
            log_message("✅ Stamina updated successfully", [
                'new_stamina' => $new_stamina,
                'update_time' => $now
            ]);
            
            send_response(true, "Stamina updated successfully", 200, [
                'stamina' => $new_stamina,
                'maxStamina' => $MAX_STAMINA,
                'lastUpdate' => $now
            ]);
        } else {
            log_error("Failed to update stamina - user not found", ['telegramId' => $telegram_id]);
            send_response(false, "User not found", 404);
        }
        
    } catch (PDOException $e) {
        log_error("❌ DATABASE ERROR during stamina update", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// ----------------------------------------
// Функция для обновления опыта пользователя
// ----------------------------------------
function updateUserExperience($pdo, $data) {
    log_message("🎯 UPDATE_USER_EXPERIENCE - Starting to update user experience");
    
    if (!isset($data['telegramId']) || !isset($data['experience'])) {
        log_error("Missing required data in updateUserExperience request", $data);
        send_response(false, "Telegram ID and experience value are required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $experience_to_add = (int)$data['experience'];
    
    log_message("🎯 UPDATE_USER_EXPERIENCE - Processing for user", [
        "telegramId" => $telegram_id,
        "experience_to_add" => $experience_to_add
    ]);
    
    try {
        // Начинаем транзакцию
        $pdo->beginTransaction();
        
        // Получаем текущий опыт пользователя
        $sql = "SELECT experience FROM game_users WHERE telegram_id = :telegram_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegram_id]);
        $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user_data) {
            log_error("User not found in updateUserExperience", ['telegramId' => $telegram_id]);
            $pdo->rollBack();
            send_response(false, "User not found", 404);
            return;
        }
        
        $current_experience = (int)$user_data['experience'];
        $new_experience = $current_experience + $experience_to_add;
        
        log_message("📊 Experience calculation", [
            'current_experience' => $current_experience,
            'experience_to_add' => $experience_to_add,
            'new_experience' => $new_experience
        ]);
        
        // Обновляем опыт в базе данных
        $update_sql = "UPDATE game_users SET experience = :experience WHERE telegram_id = :telegram_id";
        $update_stmt = $pdo->prepare($update_sql);
        $result = $update_stmt->execute([
            'experience' => $new_experience,
            'telegram_id' => $telegram_id
        ]);
        
        if ($result && $update_stmt->rowCount() > 0) {
            // Коммитим транзакцию
            $pdo->commit();
            
            log_message("✅ User experience updated successfully", [
                'telegramId' => $telegram_id,
                'experience_was' => $current_experience,
                'experience_added' => $experience_to_add,
                'experience_became' => $new_experience,
                'summary' => "Было: {$current_experience}, добавлено: +{$experience_to_add}, стало: {$new_experience}"
            ]);
            
            send_response(true, "Experience updated successfully", 200, [
                'experience' => $new_experience,
                'experience_added' => $experience_to_add,
                'previous_experience' => $current_experience
            ]);
        } else {
            $pdo->rollBack();
            log_error("Failed to update experience in database", [
                'telegramId' => $telegram_id,
                'rows_affected' => $update_stmt->rowCount()
            ]);
            send_response(false, "Failed to update experience", 500);
        }
        
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        log_error("❌ DATABASE ERROR during experience update", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}

// ----------------------------------------
// Функция для обновления уровня пользователя
// ----------------------------------------
function updateUserLevel($pdo, $data) {
    log_message("🎯 UPDATE_USER_LEVEL - Starting to update user level");
    
    if (!isset($data['telegramId']) || !isset($data['level'])) {
        log_error("Missing required data in updateUserLevel request", $data);
        send_response(false, "Telegram ID and level value are required", 400);
        return;
    }
    
    $telegram_id = $data['telegramId'];
    $new_level = (int)$data['level'];
    
    // Проверяем разумные границы уровня
    if ($new_level < 1 || $new_level > 1000) {
        log_error("Invalid level value", [
            'telegramId' => $telegram_id,
            'level' => $new_level
        ]);
        send_response(false, "Level value must be between 1 and 1000", 400);
        return;
    }
    
    log_message("🎯 UPDATE_USER_LEVEL - Processing for user", [
        "telegramId" => $telegram_id,
        "new_level" => $new_level
    ]);
    
    try {
        // Начинаем транзакцию
        $pdo->beginTransaction();
        
        // Получаем текущий уровень и доступные статы пользователя
        $sql = "SELECT level, stats_avb FROM game_users WHERE telegram_id = :telegram_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['telegram_id' => $telegram_id]);
        $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user_data) {
            log_error("User not found in updateUserLevel", ['telegramId' => $telegram_id]);
            $pdo->rollBack();
            send_response(false, "User not found", 404);
            return;
        }
        
        $current_level = (int)$user_data['level'];
        $current_stats_avb = (int)$user_data['stats_avb'];
        
        log_message("📊 Level change", [
            'current_level' => $current_level,
            'new_level' => $new_level,
            'current_stats_avb' => $current_stats_avb
        ]);
        
        // Рассчитываем количество новых статов (5 статов за каждый уровень)
        $levels_gained = $new_level - $current_level;
        $stats_to_add = $levels_gained * 5;
        $new_stats_avb = $current_stats_avb + $stats_to_add;
        
        log_message("📊 Level change with stats calculation", [
            'current_level' => $current_level,
            'new_level' => $new_level,
            'levels_gained' => $levels_gained,
            'current_stats_avb' => $current_stats_avb,
            'stats_to_add' => $stats_to_add,
            'new_stats_avb' => $new_stats_avb
        ]);
        
        // Обновляем уровень и доступные статы в базе данных
        $update_sql = "UPDATE game_users SET level = :level, stats_avb = :stats_avb WHERE telegram_id = :telegram_id";
        $update_stmt = $pdo->prepare($update_sql);
        $result = $update_stmt->execute([
            'level' => $new_level,
            'stats_avb' => $new_stats_avb,
            'telegram_id' => $telegram_id
        ]);
        
        if ($result && $update_stmt->rowCount() > 0) {
            // Коммитим транзакцию
            $pdo->commit();
            
            log_message("✅ User level and stats updated successfully", [
                'telegramId' => $telegram_id,
                'level_was' => $current_level,
                'level_became' => $new_level,
                'stats_avb_was' => $current_stats_avb,
                'stats_avb_became' => $new_stats_avb,
                'stats_added' => $stats_to_add,
                'summary' => "Уровень: {$current_level} -> {$new_level}, Статов добавлено: +{$stats_to_add}"
            ]);
            
            send_response(true, "Level updated successfully", 200, [
                'level' => $new_level,
                'previous_level' => $current_level,
                'stats_avb' => $new_stats_avb,
                'stats_added' => $stats_to_add
            ]);
        } else {
            $pdo->rollBack();
            log_error("Failed to update level in database", [
                'telegramId' => $telegram_id,
                'rows_affected' => $update_stmt->rowCount()
            ]);
            send_response(false, "Failed to update level", 500);
        }
        
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        log_error("❌ DATABASE ERROR during level update", [
            'message' => $e->getMessage(),
            'code' => $e->getCode(),
            'telegramId' => $telegram_id
        ]);
        send_response(false, "Database error: " . $e->getMessage(), 500);
    }
}
?>