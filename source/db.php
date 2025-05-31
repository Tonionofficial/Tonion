<?php
// Соединение с базой данных для модуля RPG

/**
 * Простая функция для парсинга .env файла
 * @param string $path Путь к .env файлу
 * @return array Массив с переменными окружения
 */
function parse_env_file($path) {
    if (!file_exists($path) || !is_readable($path)) {
        return false;
    }

    $vars = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        // Пропускаем комментарии и пустые строки
        if (empty($line) || strpos(trim($line), '#') === 0) {
            continue;
        }

        // Разбиваем строку на ключ и значение
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);

        // Удаляем кавычки, если они есть
        if (strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) {
            $value = substr($value, 1, -1);
        } elseif (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1) {
            $value = substr($value, 1, -1);
        }

        $vars[$name] = $value;
    }

    return $vars;
}

try {
    // Путь к корневой директории проекта
    $root_dir = dirname(__DIR__);
    
    // Пути к файлам и директориям
    $root_env_file = $root_dir . '/.env';
    $local_env_file = __DIR__ . '/.env';
    $autoload_file = $root_dir . '/vendor/autoload.php';
    
    // Сначала проверяем, есть ли .env файл в текущей директории
    if (file_exists($local_env_file)) {
        $env_file = $local_env_file;
    } 
    // Если нет, то проверяем в корне проекта
    elseif (file_exists($root_env_file)) {
        $env_file = $root_env_file;
    } 
    // Если нигде нет, то сообщаем об ошибке
    else {
        throw new Exception("Environment file (.env) not found in source or root directory");
    }
    
    // Проверяем наличие автозагрузчика Composer
    if (file_exists($autoload_file)) {
        // Пытаемся подключить автозагрузчик Composer
        try {
            require_once $autoload_file;
            
            // Проверяем наличие библиотеки vlucas/phpdotenv
            if (class_exists('Dotenv\Dotenv')) {
                try {
                    // Загружаем переменные окружения из .env файла
                    $dotenv_dir = dirname($env_file);
                    $dotenv = Dotenv\Dotenv::createImmutable($dotenv_dir);
                    $dotenv->load();
                    
                    // Получаем данные для подключения к БД из переменных окружения
                    $host = $_ENV['DB_HOST'] ?? '';
                    $dbname = $_ENV['DB_NAME'] ?? '';
                    $username = $_ENV['DB_USER'] ?? '';
                    $password = $_ENV['DB_PASS'] ?? '';
                    $charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';
                } catch (Exception $e) {
                    // Используем встроенный парсер для .env файла
                    if (file_exists($env_file)) {
                        $env_vars = parse_env_file($env_file);
                        
                        // Устанавливаем переменные окружения вручную
                        foreach ($env_vars as $key => $value) {
                            $_ENV[$key] = $value;
                            putenv("$key=$value");
                        }
                    } else {
                        throw new Exception("Environment file not found after dotenv library failure");
                    }
                }
            } else {
                // Если библиотека не установлена, используем встроенный парсер для .env файла
                if (file_exists($env_file)) {
                    $env_vars = parse_env_file($env_file);
                    
                    // Устанавливаем переменные окружения вручную
                    foreach ($env_vars as $key => $value) {
                        $_ENV[$key] = $value;
                        putenv("$key=$value");
                    }
                } else {
                    throw new Exception("Environment file not found");
                }
            }
        } catch (Exception $e) {
            // Если не удалось загрузить автозагрузчик, используем встроенный парсер для .env файла
            if (file_exists($env_file)) {
                $env_vars = parse_env_file($env_file);
                
                // Устанавливаем переменные окружения вручную
                foreach ($env_vars as $key => $value) {
                    $_ENV[$key] = $value;
                    putenv("$key=$value");
                }
            } else {
                throw new Exception("Environment file not found after autoloader failure");
            }
        }
    } else {
        // Если автозагрузчик не найден, используем встроенный парсер для .env файла
        if (file_exists($env_file)) {
            $env_vars = parse_env_file($env_file);
            
            // Устанавливаем переменные окружения вручную
            foreach ($env_vars as $key => $value) {
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        } else {
            throw new Exception("Environment file not found");
        }
    }
    
    // После того как переменные окружения загружены (любым способом),
    // получаем параметры подключения к БД
    $host = $_ENV['DB_HOST'] ?? '';
    $dbname = $_ENV['DB_NAME'] ?? '';
    $username = $_ENV['DB_USER'] ?? '';
    $password = $_ENV['DB_PASS'] ?? '';
    $charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';
    
    // Проверяем, что все необходимые параметры подключения к БД заполнены
    if (empty($host) || empty($dbname) || empty($username)) {
        throw new Exception("Missing required database connection parameters in .env file");
    }

    $dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    // Установка соединения с БД
    $pdo = new PDO($dsn, $username, $password, $options);
    
    // Возвращаем объект PDO
    return $pdo;
} catch (PDOException $e) {
    // Логируем только ошибки
    $log_file = __DIR__ . '/db_connection_log.txt';
    file_put_contents($log_file, date('Y-m-d H:i:s') . " - Database connection error: " . $e->getMessage() . "\n", FILE_APPEND);
    
    // Выброс исключения для обработки выше с безопасным сообщением без реквизитов
    throw new Exception("Database connection failed. See error log for details.");
} 