// IndexedDB модуль для работы с базой данных RPG
// Модуль debug.js должен быть подключен через тег script в HTML

const DB_NAME = 'rpgDatabase';
// Версия базы данных (строковая), обновляется автоматически скриптом update_version.py
const DB_APP_VERSION = '1.1.32';
// Числовая версия базы данных, увеличивайте при изменении схемы
const DB_VERSION = 10;

let db;

// ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ ГАРАНТИРОВАННОГО ПОЛУЧЕНИЯ TELEGRAMID
window.ensureTelegramId = async (maxAttempts = 10, delayMs = 500) => {
  console.log('[EnsureTelegramId] Начинаем поиск telegramId...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[EnsureTelegramId] Попытка ${attempt}/${maxAttempts}`);
    
    let telegramId = null;
    
    // Приоритет 1: Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
      console.log(`[EnsureTelegramId] ✅ telegramId найден в Telegram WebApp: ${telegramId}`);
    }
    
    // Приоритет 2: URL параметры
    if (!telegramId) {
      const urlParams = new URLSearchParams(window.location.search);
      const tgIdFromUrl = urlParams.get('tgId');
      if (tgIdFromUrl) {
        telegramId = tgIdFromUrl;
        console.log(`[EnsureTelegramId] ✅ telegramId найден в URL: ${telegramId}`);
      }
    }
    
    // Приоритет 3: localStorage
    if (!telegramId) {
      telegramId = localStorage.getItem('telegramId');
      if (telegramId) {
        console.log(`[EnsureTelegramId] ✅ telegramId найден в localStorage: ${telegramId}`);
      }
    }
    
    // Приоритет 4: sessionStorage
    if (!telegramId) {
      telegramId = sessionStorage.getItem('telegramId');
      if (telegramId) {
        console.log(`[EnsureTelegramId] ✅ telegramId найден в sessionStorage: ${telegramId}`);
      }
    }
    
    // Приоритет 5: глобальная переменная
    if (!telegramId && window.globalTelegramId) {
      telegramId = window.globalTelegramId;
      console.log(`[EnsureTelegramId] ✅ telegramId найден в глобальной переменной: ${telegramId}`);
    }
    
    // Если нашли telegramId, сохраняем везде и возвращаем
    if (telegramId) {
      localStorage.setItem('telegramId', telegramId);
      sessionStorage.setItem('telegramId', telegramId);
      window.globalTelegramId = telegramId;
      
      console.log(`[EnsureTelegramId] 🎉 telegramId успешно получен и сохранен: ${telegramId}`);
      return telegramId;
    }
    
    // Если не нашли, ждем и пробуем снова
    console.log(`[EnsureTelegramId] ⏳ telegramId не найден, ожидание ${delayMs}ms...`);
    
    // Попытка принудительной инициализации Telegram WebApp
    if (attempt <= 3 && window.Telegram && window.Telegram.WebApp) {
      try {
        console.log(`[EnsureTelegramId] Попытка принудительной инициализации Telegram WebApp (попытка ${attempt})`);
        if (typeof window.Telegram.WebApp.ready === 'function') {
          window.Telegram.WebApp.ready();
        }
        if (typeof window.Telegram.WebApp.expand === 'function') {
          window.Telegram.WebApp.expand();
        }
      } catch (error) {
        console.warn(`[EnsureTelegramId] Ошибка при инициализации Telegram WebApp:`, error);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  console.error(`[EnsureTelegramId] ❌ Не удалось получить telegramId после ${maxAttempts} попыток`);
  return null;
};

// Инициализация базы данных
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('[IndexedDB] Ошибка при открытии базы данных');
      reject(event.target.error);
    };
    
    request.onsuccess = async (event) => {
      db = event.target.result;
      
      console.log('[IndexedDB] База данных открыта, начинаем инициализацию...');
      
      // КРИТИЧЕСКИ ВАЖНО: Сначала гарантированно получаем telegramId
      const telegramId = await window.ensureTelegramId();
      
      if (!telegramId) {
        console.error('[IndexedDB] КРИТИЧЕСКАЯ ОШИБКА: Не удалось получить telegramId!');
        // Продолжаем работу, но с предупреждением
      }
      
      // Проверяем URL-параметры для обработки после очистки
      const urlParams = new URLSearchParams(window.location.search);
      const freshInstall = urlParams.get('freshInstall');
      const tgIdFromUrl = urlParams.get('tgId');
      const isMobile = urlParams.get('mobile');
      
      if (freshInstall) {
        console.log(`[IndexedDB] Обнаружен параметр freshInstall с версией ${freshInstall}`);
        
        // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Восстанавливаем telegramId из URL если он есть
        if (tgIdFromUrl && tgIdFromUrl !== telegramId) {
          localStorage.setItem('telegramId', tgIdFromUrl);
          sessionStorage.setItem('telegramId', tgIdFromUrl);
          window.globalTelegramId = tgIdFromUrl;
          console.log(`[IndexedDB] telegramId дополнительно восстановлен из URL: ${tgIdFromUrl}`);
        }
        
        if (isMobile) {
          console.log('[IndexedDB] Обнаружена загрузка после очистки на мобильном устройстве');
        }
        
        // Сохраняем версию из URL и продолжаем загрузку
        localStorage.setItem('app_version', freshInstall);
        saveAppVersion(freshInstall).then(async () => {
          console.log(`[IndexedDB] Версия ${freshInstall} сохранена после обновления`);
          
          // После обновления проверяем и загружаем специальные ресурсы, если необходимо
          try {
            await loadSpecialResourcesIfNeeded();
            console.log('[IndexedDB] Специальные ресурсы загружены успешно');
            resolve(db);
          } catch (error) {
            console.error('[IndexedDB] Ошибка при загрузке специальных ресурсов:', error);
            resolve(db); // Продолжаем загрузку приложения даже при ошибке
          }
        }).catch(error => {
          console.error('[IndexedDB] Ошибка при сохранении версии после обновления:', error);
          resolve(db);
        });
      } else {
        // Обычный процесс проверки версии
        try {
          const isVersionMatch = await checkAppVersion();
          if (!isVersionMatch) {
            console.warn('[IndexedDB] Версия приложения изменилась, требуется очистка данных');
            try {
              await clearSiteData();
              // НЕ перезагружаем страницу здесь, т.к. clearSiteData уже делает это
              // Перезагрузка будет выполнена в clearSiteData с параметром freshInstall
            } catch (error) {
              console.error('[IndexedDB] Ошибка при очистке данных:', error);
              resolve(db);
            }
          } else {
            console.log('[IndexedDB] Версия приложения актуальна');
            resolve(db);
          }
        } catch (error) {
          console.error('[IndexedDB] Ошибка при проверке версии приложения:', error);
          resolve(db); // Продолжаем загрузку даже при ошибке проверки версии
        }
      }
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Создаем хранилища (если они еще не существуют)
      if (!db.objectStoreNames.contains('inventory')) {
        db.createObjectStore('inventory', { keyPath: 'id' });
      }
      
      // Создаем отдельную таблицу для хранения версии приложения
      if (!db.objectStoreNames.contains('appVersion')) {
        db.createObjectStore('appVersion');
      }
    };
  });
};

// Функция для сохранения версии приложения в IndexedDB
const saveAppVersion = async (version = null) => {
  if (!db) await initDB();
  
  // Используем указанную версию или берем версию из константы
  const versionToSave = version || DB_APP_VERSION;
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(['appVersion'], 'readwrite');
      const store = transaction.objectStore('appVersion');
      
      const versionData = {
        value: versionToSave,
        timestamp: new Date().toISOString()
      };
      
      const request = store.put(versionData, 'current');
      
      request.onsuccess = () => {
        console.log(`[IndexedDB] Версия приложения ${versionToSave} сохранена в таблице appVersion`);
        
        // Также сохраняем версию в localStorage для двойной проверки
        localStorage.setItem('app_version', versionToSave);
        
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('[IndexedDB] Ошибка при сохранении версии приложения в таблицу appVersion');
        reject(event.target.error);
      };
    } catch (error) {
      console.error('[IndexedDB] Ошибка в saveAppVersion:', error);
      reject(error);
    }
  });
};

// Функция для проверки версии приложения
const checkAppVersion = async () => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    try {
      // Проверяем наличие объектного хранилища appVersion
      if (!db.objectStoreNames.contains('appVersion')) {
        console.log('[IndexedDB] Таблица appVersion не существует, считаем что версия не совпадает');
        resolve(false);
        return;
      }
      
      const transaction = db.transaction(['appVersion'], 'readonly');
      const store = transaction.objectStore('appVersion');
      
      const request = store.get('current');
      
      request.onsuccess = (event) => {
        const storedVersionData = event.target.result;
        const storedVersion = storedVersionData ? storedVersionData.value : null;
        const localStorageVersion = localStorage.getItem('app_version');
        
        console.log(`[IndexedDB] Проверка версии приложения: 
          Текущая: ${DB_APP_VERSION}, 
          В appVersion: ${storedVersion || 'отсутствует'}, 
          В localStorage: ${localStorageVersion || 'отсутствует'}`);
        
        // Если версии нет в IndexedDB или localStorage, сохраняем текущую и считаем, что версии совпадают
        if (!storedVersion && !localStorageVersion) {
          saveAppVersion().then(() => resolve(true)).catch(() => resolve(true));
          return;
        }
        
        // Проверяем совпадение версий
        const isVersionMatch = (storedVersion === DB_APP_VERSION) && (localStorageVersion === DB_APP_VERSION);
        
        if (!isVersionMatch) {
          console.warn(`[IndexedDB] Версия приложения изменилась: 
            С ${storedVersion || localStorageVersion || 'неизвестной'} 
            на ${DB_APP_VERSION}`);
        }
        
        resolve(isVersionMatch);
      };
      
      request.onerror = (event) => {
        console.error('[IndexedDB] Ошибка при проверке версии приложения');
        reject(event.target.error);
      };
    } catch (error) {
      console.error('[IndexedDB] Ошибка в checkAppVersion:', error);
      reject(error);
    }
  });
};

// Функция для очистки всех данных сайта
const clearSiteData = async () => {
  console.log('[ClearSiteData] Начинаем очистку данных сайта...');
  
  try {
    // ИСПРАВЛЕНО: Сохраняем telegramId перед очисткой - ПРИОРИТЕТ для Telegram WebApp
    let savedTelegramId = null;
    
    // ПРИОРИТЕТ 1: Telegram WebApp (основной источник для мобильных устройств)
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      savedTelegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
      console.log('[ClearSiteData] telegramId получен из Telegram WebApp (приоритет):', savedTelegramId);
    }
    
    // ПРИОРИТЕТ 2: localStorage (резервный источник)
    if (!savedTelegramId && localStorage.getItem('telegramId')) {
      savedTelegramId = localStorage.getItem('telegramId');
      console.log('[ClearSiteData] telegramId получен из localStorage (резерв):', savedTelegramId);
    }
    
    // ПРИОРИТЕТ 3: Дополнительная попытка через Telegram WebApp
    if (!savedTelegramId && window.Telegram && window.Telegram.WebApp) {
      try {
        // Попробуем принудительно инициализировать WebApp
        if (typeof window.Telegram.WebApp.ready === 'function') {
          window.Telegram.WebApp.ready();
        }
        
        // Ждем немного для инициализации
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (window.Telegram.WebApp.initDataUnsafe && 
            window.Telegram.WebApp.initDataUnsafe.user && 
            window.Telegram.WebApp.initDataUnsafe.user.id) {
          savedTelegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
          console.log('[ClearSiteData] telegramId получен после принудительной инициализации:', savedTelegramId);
        }
      } catch (initError) {
        console.warn('[ClearSiteData] Ошибка при принудительной инициализации Telegram WebApp:', initError);
      }
    }
    
    if (!savedTelegramId) {
      console.error('[ClearSiteData] КРИТИЧЕСКАЯ ОШИБКА: Не удалось получить telegramId из всех источников!');
    }
    
    // 1. АГРЕССИВНАЯ ОЧИСТКА для мобильных устройств и Telegram WebApp
    console.log('[ClearSiteData] Начинаем агрессивную очистку для Telegram WebApp...');
    
    // 1.1. Очистка всех типов Storage
    try {
      // localStorage
      localStorage.clear();
      console.log('[ClearSiteData] localStorage очищен');
      
      // sessionStorage  
      sessionStorage.clear();
      console.log('[ClearSiteData] sessionStorage очищен');
      
      // Очистка специфичных для Telegram данных
      ['TelegramWebViewData', 'telegram-web-data', 'tgWebAppData'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      console.log('[ClearSiteData] Telegram-специфичные данные очищены');
      
    } catch (storageError) {
      console.error('[ClearSiteData] Ошибка при очистке Storage:', storageError);
    }
    
    // 1.2. ВОССТАНАВЛИВАЕМ telegramId ПЕРВЫМ ПРИОРИТЕТОМ
    if (savedTelegramId) {
      localStorage.setItem('telegramId', savedTelegramId);
      sessionStorage.setItem('telegramId', savedTelegramId); // Дублируем в sessionStorage
      console.log('[ClearSiteData] telegramId восстановлен с приоритетом:', savedTelegramId);
    }
    
    // 2. ПРИНУДИТЕЛЬНАЯ ОЧИСТКА IndexedDB для мобильных устройств
    console.log('[ClearSiteData] Начинаем принудительную очистку IndexedDB...');
    let dbsCleared = true;
    
    try {
      // Принудительно закрываем ВСЕ соединения с базами данных
      if (db) {
        db.close();
        db = null;
      }
      if (userResourcesDb) {
        userResourcesDb.close();
        userResourcesDb = null;
      }
      
      // Закрываем все потенциальные соединения через глобальные переменные
      if (window.db) {
        window.db.close();
        window.db = null;
      }
      if (window.userResourcesDb) {
        window.userResourcesDb.close();
        window.userResourcesDb = null;
      }
      
      console.log('[ClearSiteData] Все соединения с базами данных принудительно закрыты');
      
      // Проверяем поддержку метода databases()
      if ('databases' in window.indexedDB) {
        const databases = await window.indexedDB.databases();
        
        // Создаем массив промисов для параллельного удаления всех баз
        const deletePromises = databases.map(dbInfo => 
          new Promise((resolve) => {
            console.log(`[ClearSiteData] Удаление базы данных ${dbInfo.name}...`);
            const deleteRequest = indexedDB.deleteDatabase(dbInfo.name);
            
            deleteRequest.onsuccess = () => {
              console.log(`[ClearSiteData] База данных ${dbInfo.name} успешно удалена`);
              resolve(true);
            };
            
            deleteRequest.onerror = (event) => {
              console.error(`[ClearSiteData] Ошибка при удалении базы данных ${dbInfo.name}:`, event.target.error);
              dbsCleared = false;
              resolve(false);
            };
            
            // Также обрабатываем событие blocked
            deleteRequest.onblocked = () => {
              console.warn(`[ClearSiteData] Удаление базы данных ${dbInfo.name} заблокировано. Возможно, есть открытые соединения`);
              dbsCleared = false;
              resolve(false);
            };
          })
        );
        
        // Ждем завершения всех операций удаления
        await Promise.all(deletePromises);
      } else {
        // Если метод databases() не поддерживается, явно удаляем нашу базу
        await new Promise((resolve) => {
          console.log('[ClearSiteData] Удаление базы данных rpgDatabase...');
          const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
          
          deleteRequest.onsuccess = () => {
            console.log('[ClearSiteData] База данных rpgDatabase успешно удалена');
            resolve(true);
          };
          
          deleteRequest.onerror = (event) => {
            console.error('[ClearSiteData] Ошибка при удалении базы данных rpgDatabase:', event.target.error);
            dbsCleared = false;
            resolve(false);
          };
          
          deleteRequest.onblocked = () => {
            console.warn('[ClearSiteData] Удаление базы данных rpgDatabase заблокировано');
            dbsCleared = false;
            resolve(false);
          };
        });
        
        // Также удаляем UserResourcesDB
        await new Promise((resolve) => {
          console.log('[ClearSiteData] Удаление базы данных UserResourcesDB...');
          const deleteRequest = indexedDB.deleteDatabase('UserResourcesDB');
          
          deleteRequest.onsuccess = () => {
            console.log('[ClearSiteData] База данных UserResourcesDB успешно удалена');
            resolve(true);
          };
          
          deleteRequest.onerror = () => {
            // Не считаем ошибкой, если этой базы не существовало
            console.log('[ClearSiteData] База данных UserResourcesDB не существует или не может быть удалена');
            resolve(true);
          };
        });
      }
    } catch (dbError) {
      console.error('[ClearSiteData] Ошибка при очистке IndexedDB:', dbError);
      dbsCleared = false;
    }
    
    // 3. ПРИНУДИТЕЛЬНАЯ ОЧИСТКА COOKIES для мобильных устройств
    try {
      console.log('[ClearSiteData] Начинаем принудительную очистку cookies...');
      
      const cookies = document.cookie.split(";");
      console.log(`[ClearSiteData] Найдено ${cookies.length} cookies для очистки`);
      
      // Массив всех возможных доменов и путей для очистки
      const domains = [
        window.location.hostname,
        '.' + window.location.hostname,
        window.location.hostname.split('.').slice(1).join('.'),
        '.' + window.location.hostname.split('.').slice(1).join('.'),
        window.location.hostname.split('.').slice(-2).join('.'),
        '.' + window.location.hostname.split('.').slice(-2).join('.'),
        'localhost',
        '.localhost',
        'tonion.io',
        '.tonion.io',
        'test.tonion.io',
        '.test.tonion.io'
      ].filter(domain => domain && domain !== '.');
      
      const paths = ['/', '/public', '/source', '/js', '/style'];
      
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        if (name) {
          console.log(`[ClearSiteData] Удаление cookie: ${name}`);
          
          // Удаляем cookie для всех комбинаций доменов и путей
          for (const domain of domains) {
            for (const path of paths) {
              try {
                // Удаляем с указанием домена и пути
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`;
                // Удаляем без указания домена
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
                // Удаляем без указания пути
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${domain}`;
                // Базовое удаление
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              } catch (deleteCookieError) {
                // Игнорируем ошибки удаления отдельных cookies
              }
            }
          }
        }
      }
      
      // Дополнительная очистка специфичных для Telegram cookies
      const telegramCookies = ['tgWebAppData', 'telegram_auth', 'telegram_user'];
      for (const tgCookie of telegramCookies) {
        for (const domain of domains) {
          for (const path of paths) {
            document.cookie = `${tgCookie}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`;
            document.cookie = `${tgCookie}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
            document.cookie = `${tgCookie}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${domain}`;
            document.cookie = `${tgCookie}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          }
        }
      }
      
      console.log('[ClearSiteData] Принудительная очистка cookies завершена');
    } catch (cookieError) {
      console.error('[ClearSiteData] Ошибка при принудительной очистке cookies:', cookieError);
    }
    
    // 4. АГРЕССИВНАЯ ОЧИСТКА КЭША для мобильных устройств
    try {
      console.log('[ClearSiteData] Начинаем агрессивную очистку кэша...');
      
      // 4.1. Service Worker очистка и перезагрузка
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          console.log(`[ClearSiteData] Найдено ${registrations.length} Service Worker регистраций`);
          
          for (const registration of registrations) {
            console.log('[ClearSiteData] Удаление Service Worker регистрации...');
            await registration.unregister();
          }
          console.log('[ClearSiteData] Все Service Workers удалены');
        } catch (swError) {
          console.error('[ClearSiteData] Ошибка при удалении Service Workers:', swError);
        }
      }
      
      // 4.2. Кэш Storage принудительная очистка
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log(`[ClearSiteData] Найдено ${cacheNames.length} кэшей:`, cacheNames);
        
        // Принудительно удаляем каждый кэш
        for (const cacheName of cacheNames) {
          try {
            const deleted = await caches.delete(cacheName);
            console.log(`[ClearSiteData] Кэш ${cacheName} удален:`, deleted);
          } catch (deleteError) {
            console.error(`[ClearSiteData] Ошибка удаления кэша ${cacheName}:`, deleteError);
          }
        }
        console.log('[ClearSiteData] Агрессивная очистка Cache Storage завершена');
      }
      
      // 4.3. Дополнительная очистка для Telegram WebApp
      if (window.Telegram && window.Telegram.WebApp) {
        try {
          // Закрываем WebApp если возможно
          if (typeof window.Telegram.WebApp.close === 'function') {
            console.log('[ClearSiteData] Попытка закрытия Telegram WebApp...');
            // Не вызываем close() здесь, так как это закроет приложение
          }
          
          // Очищаем данные WebApp если есть методы
          if (typeof window.Telegram.WebApp.clearStorage === 'function') {
            window.Telegram.WebApp.clearStorage();
            console.log('[ClearSiteData] Вызвана очистка Telegram WebApp Storage');
          }
        } catch (tgError) {
          console.warn('[ClearSiteData] Ошибка при работе с Telegram WebApp:', tgError);
        }
      }
      
    } catch (cacheError) {
      console.error('[ClearSiteData] Ошибка при агрессивной очистке кэша:', cacheError);
    }
    
    // 5. Используем современный API Clear-Site-Data если он доступен (очищает всё)
    try {
      if ('fetch' in window) {
        const clearDataResponse = await fetch('/', {
          method: 'HEAD',
          headers: {
            'Clear-Site-Data': '"cache", "cookies", "storage", "executionContexts"'
          }
        });
        
        if (clearDataResponse.ok) {
          console.log('[ClearSiteData] Выполнена дополнительная очистка через Clear-Site-Data API');
        }
      }
    } catch (clearDataError) {
      console.error('[ClearSiteData] Ошибка при использовании Clear-Site-Data API:', clearDataError);
    }
    
    // ФИНАЛЬНАЯ ПРОВЕРКА И ВОССТАНОВЛЕНИЕ telegramId
    console.log('[ClearSiteData] Финальная проверка и восстановление данных...');
    
    // Сохраняем текущую версию в localStorage перед перезагрузкой
    localStorage.setItem('app_version', DB_APP_VERSION);
    
    // КРИТИЧЕСКИ ВАЖНО: Гарантируем сохранение telegramId
    if (savedTelegramId) {
      localStorage.setItem('telegramId', savedTelegramId);
      sessionStorage.setItem('telegramId', savedTelegramId);
      
      // Дополнительная защита - сохраняем в глобальную переменную
      window.globalTelegramId = savedTelegramId;
      
      // Убеждаемся что данные действительно сохранены
      const verifyLocal = localStorage.getItem('telegramId');
      const verifySession = sessionStorage.getItem('telegramId');
      
      if (verifyLocal === savedTelegramId && verifySession === savedTelegramId) {
        console.log('[ClearSiteData] ✅ telegramId успешно сохранен во всех местах:', savedTelegramId);
      } else {
        console.error('[ClearSiteData] ❌ ОШИБКА: telegramId не был сохранен корректно!', {
          saved: savedTelegramId,
          localStorage: verifyLocal,
          sessionStorage: verifySession
        });
        
        // Повторная попытка сохранения
        localStorage.setItem('telegramId', savedTelegramId);
        sessionStorage.setItem('telegramId', savedTelegramId);
      }
    } else {
      console.error('[ClearSiteData] ❌ КРИТИЧЕСКАЯ ОШИБКА: savedTelegramId отсутствует!');
    }
    
    console.log(`[ClearSiteData] Агрессивная очистка завершена, версия ${DB_APP_VERSION} сохранена`);
    
    // Перезагружаем страницу с принудительной перезагрузкой из сервера (не из кэша)
    console.log('[ClearSiteData] Подготовка к перезагрузке страницы...');
    
    // Подготавливаем URL с дополнительными параметрами для мобильных устройств
    const baseUrl = window.location.href.split('?')[0];
    const timestamp = Date.now();
    const version = encodeURIComponent(DB_APP_VERSION);
    
    let reloadUrl = `${baseUrl}?v=${timestamp}&freshInstall=${version}&mobile=1`;
    
    // Если есть telegramId, добавляем его как дополнительную защиту
    if (savedTelegramId) {
      reloadUrl += `&tgId=${encodeURIComponent(savedTelegramId)}`;
      console.log('[ClearSiteData] URL включает telegramId для дополнительной защиты');
    }
    
    console.log('[ClearSiteData] URL для перезагрузки:', reloadUrl);
    
    // Дополнительная задержка для мобильных устройств
    setTimeout(() => {
      console.log('[ClearSiteData] 🔄 Выполняем перезагрузку...');
      window.location.href = reloadUrl;
    }, 1000); // Увеличиваем задержку для мобильных устройств
    
    return true;
  } catch (error) {
    console.error('[ClearSiteData] Критическая ошибка при очистке данных сайта:', error);
    
    // При любой критической ошибке все равно перезагружаем страницу
    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
    
    return false;
  }
};

// Функция для сохранения ресурсов пользователя
const saveUserResources = async (resources) => {
  console.log('[IndexedDB] saveUserResources: Перенаправление в UserResourcesDB');
  
  // Получаем telegramId пользователя
  let telegramId;
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
      window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
    telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
  } else {
    telegramId = localStorage.getItem('telegramId');
  }
  
  if (!telegramId) {
    console.error('[IndexedDB] saveUserResources: Не удалось определить telegramId');
    return Promise.reject('Не удалось определить telegramId');
  }
  
  try {
    await saveUserResourcesInUserDB(telegramId, resources);
    return Promise.resolve();
  } catch (error) {
    console.error('[IndexedDB] saveUserResources: Ошибка сохранения в UserResourcesDB', error);
    return Promise.reject(error);
  }
};

// Функция для получения ресурсов пользователя
const getUserResources = async () => {
  console.log('[IndexedDB] getUserResources: Получение данных из UserResourcesDB');
  
  // Получаем telegramId пользователя
  let telegramId;
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
      window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
    telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
  } else {
    telegramId = localStorage.getItem('telegramId');
  }
  
  if (!telegramId) {
    console.error('[IndexedDB] getUserResources: Не удалось определить telegramId');
    return Promise.resolve({});
  }
  
  try {
    const resources = await getUserResourcesFromUserDB(telegramId);
    return Promise.resolve(resources || {});
  } catch (error) {
    console.error('[IndexedDB] getUserResources: Ошибка получения из UserResourcesDB', error);
    return Promise.resolve({});
  }
};

// Функция для получения ресурсов пользователя по telegramId (берет из UserResourcesDB)
const getUserResourcesFromIndexedDB = async (telegramId) => {
  console.log('[IndexedDB] getUserResourcesFromIndexedDB: Получение данных из UserResourcesDB');
  
  if (!telegramId) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
    } else {
      telegramId = localStorage.getItem('telegramId');
    }
    
    if (!telegramId) {
      console.error('[IndexedDB] getUserResourcesFromIndexedDB: Не удалось определить telegramId');
      return null;
    }
  }
  
  try {
    const resources = await getUserResourcesFromUserDB(telegramId);
    
    if (resources) {
      // Сохраняем в глобальной переменной для совместимости
      window.globalUserResources = {...resources};
      return resources;
    } else {
      console.log('[IndexedDB] getUserResourcesFromIndexedDB: Ресурсы не найдены, возвращаем глобальную переменную');
      return window.globalUserResources || {};
    }
  } catch (error) {
    console.error('[IndexedDB] getUserResourcesFromIndexedDB: Ошибка', error.message);
    return window.globalUserResources || {};
  }
};

// Функция для сохранения ресурсов пользователя с привязкой к telegramId (использует UserResourcesDB)
const saveUserResourcesToIndexedDB = async (resources, telegramId) => {
  console.log('[IndexedDB] saveUserResourcesToIndexedDB: Сохранение в UserResourcesDB');
  
  // Если telegramId не указан, пробуем получить стандартный
  if (!telegramId) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
    } else {
      telegramId = localStorage.getItem('telegramId');
    }
    
    if (!telegramId) {
      console.error('[IndexedDB] saveUserResourcesToIndexedDB: Не удалось определить telegramId');
      return Promise.reject('Не удалось определить telegramId');
    }
  }
  
  try {
    // Сохраняем в глобальной переменной для совместимости
    window.globalUserResources = {...resources};
    
    await saveUserResourcesInUserDB(telegramId, resources);
    return Promise.resolve();
  } catch (error) {
    console.error('[IndexedDB] saveUserResourcesToIndexedDB: Ошибка', error.message);
    return Promise.reject(error);
  }
};

// Создание новой сессии крафтинга (отправляет запрос на сервер)
const createCraftingSession = async (userId, recipeId, quantity, requiredMaterials, craftTime) => {
  console.log('[IndexedDB] createCraftingSession: Отправка запроса на сервер');
  
  try {
    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = currentTime + (craftTime * quantity);
    
    const session = {
      telegramId: userId,
      itemId: recipeId,
      itemName: recipeId, // Имя берем из recipeId для простоты
      quantity,
      materials: JSON.stringify(requiredMaterials),
      craftTime,
      startTime: currentTime,
      endTime
    };
    
    const response = await fetch('rpg.php?action=craftItem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(session)
    });
    
    if (!response.ok) {
      throw new Error(`Сервер вернул статус ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Неизвестная ошибка сервера');
    }
    
    return data.sessionId || Date.now(); // Возвращаем ID сессии с сервера или временную метку
  } catch (error) {
    console.error('[IndexedDB] createCraftingSession: Ошибка', error);
    throw error;
  }
};

// Получение всех активных сессий крафтинга для пользователя (получает с сервера)
const getActiveCraftingSessions = async (userId) => {
  console.log('[IndexedDB] getActiveCraftingSessions: Получение данных с сервера');
  
  try {
    const response = await fetch(`rpg.php?action=getActiveCraftingSessions&telegramId=${encodeURIComponent(userId)}`);
    
    if (!response.ok) {
      throw new Error(`Сервер вернул статус ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Неизвестная ошибка сервера');
    }
    
    return data.activeCraftingSessions || [];
  } catch (error) {
    console.error('[IndexedDB] getActiveCraftingSessions: Ошибка', error);
    return [];
  }
};

// Обновление текущей сессии крафтинга (отправляет запрос на сервер)
const updateCraftingSession = async (sessionId, updates) => {
  console.log('[IndexedDB] updateCraftingSession: Отправка запроса на сервер');
  
  try {
    // Получаем telegramId пользователя
    let telegramId;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
    } else {
      telegramId = localStorage.getItem('telegramId');
    }
    
    if (!telegramId) {
      throw new Error('Не удалось определить telegramId');
    }
    
    const updateData = {
      sessionId: sessionId,
      telegramId,
      status: updates.status || 'active',
      lastUpdated: Math.floor(Date.now() / 1000)
    };
    
    const response = await fetch('rpg.php?action=updateCraftingSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`Сервер вернул статус ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Неизвестная ошибка сервера');
    }
    
    return {
      ...updates,
      lastUpdated: updateData.lastUpdated
    };
  } catch (error) {
    console.error('[IndexedDB] updateCraftingSession: Ошибка', error);
    throw error;
  }
};

// Удаление сессии крафтинга (отправляет запрос на сервер)
const deleteCraftingSession = async (sessionId) => {
  console.log('[IndexedDB] deleteCraftingSession: Отправка запроса на сервер');
  
  try {
    // Получаем telegramId пользователя
    let telegramId;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
    } else {
      telegramId = localStorage.getItem('telegramId');
    }
    
    if (!telegramId) {
      throw new Error('Не удалось определить telegramId');
    }
    
    const deleteData = {
      sessionId: sessionId,
      telegramId,
      status: 'deleted'
    };
    
    const response = await fetch('rpg.php?action=deleteCraftingSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deleteData)
    });
    
    if (!response.ok) {
      throw new Error(`Сервер вернул статус ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Неизвестная ошибка сервера');
    }
    
    return true;
  } catch (error) {
    console.error('[IndexedDB] deleteCraftingSession: Ошибка', error);
    return false;
  }
};

/**
 * Обновление или добавление предмета в инвентарь пользователя в IndexedDB
 * @param {string} itemId - ID предмета для обновления
 * @param {Object} itemData - Данные предмета (должны содержать id, name, quantity)
 * @returns {Promise<boolean>} - Результат операции
 */
const updateInventoryItem = async (itemId, itemData) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error('[IndexedDB] База данных не инициализирована');
      reject('Database not initialized');
      return;
    }
    
    if (!itemId || !itemData) {
      console.error('[IndexedDB] Не переданы обязательные параметры itemId или itemData');
      reject('Missing required parameters');
      return;
    }
    
    try {
      // Проверяем существование хранилища inventory
      if (!db.objectStoreNames.contains("inventory")) {
        console.error("[IndexedDB] Хранилище inventory не существует, создаем новое хранилище");
        
        // Закрываем текущее соединение с БД
        db.close();
        
        // Открываем новую БД с большей версией
        const request = indexedDB.open("rpgGame", db.version + 1);
        
        request.onupgradeneeded = (event) => {
          const upgradedDb = event.target.result;
          if (!upgradedDb.objectStoreNames.contains("inventory")) {
            const store = upgradedDb.createObjectStore("inventory", { keyPath: "id" });
            store.createIndex("id", "id", { unique: true });
          }
        };
        
        request.onsuccess = (event) => {
          db = event.target.result;
          
          // Повторно вызываем функцию после создания хранилища
          updateInventoryItem(itemId, itemData).then(resolve).catch(reject);
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
        
        return;
      }
      
      const transaction = db.transaction(["inventory"], "readwrite");
      const store = transaction.objectStore("inventory");
      
      // Нормализация данных предмета
      const normalizedItem = {
        id: itemId,
        name: itemData.name || itemId,
        quantity: itemData.quantity !== undefined ? parseInt(itemData.quantity) : 0,
        updated: new Date().toISOString()
      };
      
      // Проверка существующего предмета
      const getRequest = store.get(itemId);
      
      getRequest.onsuccess = (event) => {
        const existingItem = event.target.result;
        
        if (existingItem) {
          // Обновляем существующий предмет
          const updatedItem = {
            ...existingItem,
            quantity: itemData.quantity !== undefined ? parseInt(itemData.quantity) : existingItem.quantity,
            name: itemData.name || existingItem.name,
            updated: new Date().toISOString()
          };
          
          // Если количество становится 0 или меньше, удаляем предмет из инвентаря
          if (updatedItem.quantity <= 0) {
            const deleteRequest = store.delete(itemId);
            
            deleteRequest.onsuccess = () => {
              console.log(`[IndexedDB] Предмет ${itemId} удален из инвентаря (количество: ${updatedItem.quantity})`);
              resolve(true);
            };
            
            deleteRequest.onerror = (event) => {
              console.error(`[IndexedDB] Ошибка при удалении предмета ${itemId}`);
              reject(event.target.error);
            };
          } else {
            const updateRequest = store.put(updatedItem);
            
            updateRequest.onsuccess = () => {
              resolve(true);
            };
            
            updateRequest.onerror = (event) => {
              console.error(`[IndexedDB] Ошибка при обновлении предмета ${itemId}`);
              reject(event.target.error);
            };
          }
        } else {
          // Добавляем новый предмет только если количество больше 0
          if (normalizedItem.quantity > 0) {
            const addRequest = store.add(normalizedItem);
            
            addRequest.onsuccess = () => {
              resolve(true);
            };
            
            addRequest.onerror = (event) => {
              console.error(`[IndexedDB] Ошибка при добавлении предмета ${itemId}`);
              reject(event.target.error);
            };
          } else {
            // Если количество 0 или меньше, не добавляем предмет
            console.log(`[IndexedDB] Предмет ${itemId} не добавлен (количество: ${normalizedItem.quantity})`);
            resolve(true);
          }
        }
      };
      
      getRequest.onerror = (event) => {
        console.error(`[IndexedDB] Ошибка при чтении предмета ${itemId}`);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        // Транзакция завершена
      };
      
      transaction.onerror = (event) => {
        console.error(`[IndexedDB] Ошибка в транзакции обновления инвентаря`);
        reject(event.target.error);
      };
    } catch (error) {
      console.error('[IndexedDB] Ошибка при обновлении предмета:', error.message);
      reject(error);
    }
  });
};

/**
 * Получение всех предметов из инвентаря пользователя
 * @returns {Promise<Array>} - Массив предметов инвентаря
 */
const getInventoryItems = async () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error('[IndexedDB] База данных не инициализирована');
      reject('Database not initialized');
      return;
    }
    
    try {
      // Проверяем существование хранилища inventory
      if (!db.objectStoreNames.contains("inventory")) {
        console.warn('[IndexedDB] Хранилище inventory не существует');
        resolve([]);
        return;
      }
      
      const transaction = db.transaction(["inventory"], "readonly");
      const store = transaction.objectStore("inventory");
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        const items = event.target.result || [];
        resolve(items);
      };
      
      request.onerror = (event) => {
        console.error(`[IndexedDB] Ошибка при получении предметов инвентаря`);
        reject(event.target.error);
      };
    } catch (error) {
      console.error('[IndexedDB] Ошибка при получении инвентаря:', error.message);
      reject(error);
    }
  });
};

// Константы для UserResourcesDB
const USER_RESOURCES_DB_NAME = 'UserResourcesDB';
const USER_RESOURCES_DB_VERSION = 10;

// Переменная для хранения соединения с UserResourcesDB
let userResourcesDb;

// Инициализация UserResourcesDB для работы со специальными ресурсами
const initUserResourcesDB = () => {
  return new Promise((resolve, reject) => {
    console.log('[UserResourcesDB] Инициализация базы данных пользовательских ресурсов...');
    
    const request = indexedDB.open(USER_RESOURCES_DB_NAME, USER_RESOURCES_DB_VERSION);
    
    request.onerror = (event) => {
      console.error('[UserResourcesDB] Ошибка при открытии базы данных:', event.target.error);
      reject(event.target.error);
    };
    
    request.onblocked = (event) => {
      console.warn('[UserResourcesDB] База данных заблокирована. Закройте другие вкладки с приложением.');
      // Пытаемся удалить и пересоздать базу
      try {
        indexedDB.deleteDatabase(USER_RESOURCES_DB_NAME);
        console.log('[UserResourcesDB] База данных удалена после блокировки.');
      } catch (e) {
        console.error('[UserResourcesDB] Ошибка при удалении базы данных:', e);
      }
      reject(new Error('База данных заблокирована'));
    };
    
    request.onupgradeneeded = (event) => {
      console.log('[UserResourcesDB] Обновление структуры базы данных до версии 10...');
      const db = event.target.result;
      
      // Удаляем старые хранилища, если они существуют
      if (db.objectStoreNames.contains('resources')) {
        db.deleteObjectStore('resources');
        console.log('[UserResourcesDB] Удалено старое хранилище "resources"');
      }
      if (db.objectStoreNames.contains('resourcesLog')) {
        db.deleteObjectStore('resourcesLog');
        console.log('[UserResourcesDB] Удалено старое хранилище "resourcesLog"');
      }
      
      // Создаем новые хранилища
      // Используем явные ключи (keyPath) и строковые идентификаторы
      const resourcesStore = db.createObjectStore('resources', { keyPath: 'id' });
      resourcesStore.createIndex('telegramId', 'telegramId', { unique: true });
      console.log('[UserResourcesDB] Создано хранилище "resources" с ключом id');
      
      const logsStore = db.createObjectStore('resourcesLog', { autoIncrement: true });
      logsStore.createIndex('telegramId', 'telegramId', { unique: false });
      logsStore.createIndex('timestamp', 'timestamp', { unique: false });
      console.log('[UserResourcesDB] Создано хранилище "resourcesLog" с автоинкрементным ключом');
    };
    
    request.onsuccess = (event) => {
      userResourcesDb = event.target.result;
      console.log('[UserResourcesDB] База данных успешно открыта. Версия:', userResourcesDb.version);
      resolve(userResourcesDb);
    };
  });
};

// Функция для сохранения ресурсов пользователя в UserResourcesDB
const saveUserResourcesInUserDB = async (telegramId, resources) => {
  try {
    // Проверка telegramId
    if (!telegramId) {
      console.error('[UserResourcesDB] Ошибка: telegramId не указан');
      throw new Error('telegramId обязателен для сохранения данных');
    }
    
    // Приводим telegramId к строке и создаем уникальный id записи
    const telegramIdStr = String(telegramId);
    const resourceId = `user_${telegramIdStr}`;
    
    console.log(`[UserResourcesDB] Сохранение ресурсов с id=${resourceId} для пользователя ${telegramIdStr}:`, resources);
    
    if (!userResourcesDb) {
      await initUserResourcesDB();
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = userResourcesDb.transaction(['resources', 'resourcesLog'], 'readwrite');
        
        transaction.onerror = (event) => {
          console.error('[UserResourcesDB] Ошибка транзакции:', event.target.error);
          reject(event.target.error);
        };
        
        const resourcesStore = transaction.objectStore('resources');
        const logsStore = transaction.objectStore('resourcesLog');
        
        // Чтение существующих данных по id
        const getRequest = resourcesStore.get(resourceId);
        
        getRequest.onsuccess = (event) => {
          try {
            const currentData = event.target.result;
            const timestamp = new Date().toISOString();
            
            // Создаем обновленный объект ресурсов
            const resourceData = {
              id: resourceId,            // Явно задаем id для использования в качестве ключа
              telegramId: telegramIdStr, // Сохраняем telegramId как строку
              ...resources,
              lastUpdated: timestamp
            };
            
            console.log('[UserResourcesDB] Объект для сохранения:', resourceData);
            
            // Если есть существующие данные, создаем запись лога
            if (currentData) {
              console.log('[UserResourcesDB] Найдены существующие данные:', currentData);
              
              // Проверяем наличие изменений
              const hasChanges = Object.keys(resources).some(key => 
                resources[key] !== currentData[key]
              );
              
              if (hasChanges) {
                // Формируем объект изменений
                const changes = {};
                Object.keys(resources).forEach(key => {
                  if (resources[key] !== currentData[key]) {
                    const oldVal = currentData[key] || 0;
                    const newVal = resources[key];
                    const diff = newVal - oldVal;
                    changes[key] = {
                      old: oldVal,
                      new: newVal,
                      diff: diff
                    };
                    console.log(`[UserResourcesDB] Изменение ${key}: ${oldVal} -> ${newVal} (${diff > 0 ? '+' + diff : diff})`);
                  }
                });
                
                // Создаем запись в лог
                const logEntry = {
                  telegramId: telegramIdStr,
                  timestamp,
                  resourceId,
                  changes,
                  prevData: { ...currentData },
                  newData: { ...resourceData }
                };
                
                // Добавляем запись в лог
                const addLogRequest = logsStore.add(logEntry);
                addLogRequest.onerror = (e) => {
                  console.error('[UserResourcesDB] Ошибка добавления записи лога:', e.target.error);
                };
              } else {
                console.log('[UserResourcesDB] Изменений не обнаружено, запись в лог не добавлена');
              }
            } else {
              console.log('[UserResourcesDB] Данные не найдены, создаем новую запись');
              
              // Запись лога для новой записи
              const logEntry = {
                telegramId: telegramIdStr,
                timestamp,
                resourceId,
                type: 'initial',
                data: { ...resourceData }
              };
              
              // Добавляем запись в лог
              const addLogRequest = logsStore.add(logEntry);
              addLogRequest.onerror = (e) => {
                console.error('[UserResourcesDB] Ошибка добавления начального лога:', e.target.error);
              };
            }
            
            // Сохраняем данные
            const putRequest = resourcesStore.put(resourceData);
            
            putRequest.onsuccess = () => {
              console.log('[UserResourcesDB] Ресурсы успешно сохранены с id:', resourceId);
              resolve(true);
            };
            
            putRequest.onerror = (e) => {
              console.error('[UserResourcesDB] Ошибка сохранения ресурсов:', e.target.error);
              reject(e.target.error);
            };
          } catch (innerError) {
            console.error('[UserResourcesDB] Ошибка в обработчике получения данных:', innerError);
            reject(innerError);
          }
        };
        
        getRequest.onerror = (e) => {
          console.error('[UserResourcesDB] Ошибка чтения данных:', e.target.error);
          reject(e.target.error);
        };
        
        transaction.oncomplete = () => {
          console.log('[UserResourcesDB] Транзакция завершена успешно');
        };
      } catch (transactionError) {
        console.error('[UserResourcesDB] Ошибка создания транзакции:', transactionError);
        reject(transactionError);
      }
    });
  } catch (error) {
    console.error('[UserResourcesDB] Общая ошибка сохранения:', error);
    throw error;
  }
};

// Функция для получения ресурсов пользователя из UserResourcesDB
const getUserResourcesFromUserDB = async (telegramId) => {
  try {
    if (!telegramId) {
      console.error('[UserResourcesDB] Ошибка: telegramId не указан при получении ресурсов');
      throw new Error('telegramId обязателен для получения данных');
    }
    
    // Формируем id записи из telegramId
    const telegramIdStr = String(telegramId);
    const resourceId = `user_${telegramIdStr}`;
    
    console.log(`[UserResourcesDB] Получение ресурсов для id=${resourceId}`);
    
    if (!userResourcesDb) {
      await initUserResourcesDB();
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = userResourcesDb.transaction('resources', 'readonly');
        const store = transaction.objectStore('resources');
        
        // Получаем данные по id
        const request = store.get(resourceId);
        
        request.onsuccess = (event) => {
          const result = event.target.result;
          
          if (result) {
            console.log('[UserResourcesDB] Получены данные ресурсов:', result);
            resolve(result);
          } else {
            console.log('[UserResourcesDB] Ресурсы не найдены для id:', resourceId);
            resolve(null);
          }
        };
        
        request.onerror = (e) => {
          console.error('[UserResourcesDB] Ошибка при чтении ресурсов:', e.target.error);
          reject(e.target.error);
        };
        
        transaction.oncomplete = () => {
          // Закрываем транзакцию
        };
      } catch (error) {
        console.error('[UserResourcesDB] Ошибка в транзакции получения ресурсов:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('[UserResourcesDB] Общая ошибка при получении ресурсов:', error);
    throw error;
  }
};

// Функция для загрузки и сохранения специальных ресурсов (onion, candy, junk, coin) после очистки IndexedDB
const loadSpecialResourcesIfNeeded = async () => {
  try {
    console.log('[SpecialResources] Проверка наличия специальных ресурсов после очистки базы данных...');
    
    // Получаем telegramId пользователя
    let telegramId;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
    } else {
      telegramId = localStorage.getItem('telegramId');
    }
    
    if (!telegramId) {
      console.warn('[SpecialResources] Не удалось определить telegramId пользователя.');
      
      // ИСПРАВЛЕНО: Пытаемся подождать и повторить попытку получения telegramId
      console.log('[SpecialResources] Ожидание инициализации Telegram WebApp...');
      
      // Ждем немного для инициализации Telegram WebApp
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Повторная попытка получения telegramId
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
          window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
        telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        console.log('[SpecialResources] telegramId получен после ожидания:', telegramId);
        
        // Сохраняем в localStorage для следующих использований
        localStorage.setItem('telegramId', telegramId);
      }
      
      if (!telegramId) {
        console.error('[SpecialResources] telegramId так и не удалось получить после ожидания.');
        return false;
      }
    }
    
    // Проверяем наличие специальных ресурсов в UserResourcesDB
    const resources = await getUserResourcesFromUserDB(telegramId);
    console.log(`[SpecialResources] Проверка ресурсов для telegramId ${telegramId}:`, resources);
    
    // Если ресурсы не найдены или не содержат основных специальных ресурсов, загружаем их с сервера
    if (!resources || (!resources.onion && !resources.candy && !resources.junk && !resources.coin)) {
      console.log('[SpecialResources] Специальные ресурсы не найдены. Загружаем с сервера...');
      
      try {
        // Запрос к серверу для получения специальных ресурсов
        const response = await fetch("https://test.tonion.io/wheel.php?action=getScores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId })
        });
        
        if (!response.ok) {
          throw new Error(`Сервер вернул код ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          console.log("[SpecialResources] Данные успешно получены с сервера:", data);
          
          // Готовим объект с ресурсами
          const specialResources = {
            onion: data.onion || 0,
            candy: data.candy || 0,
            junk: data.junk || 0,
            coin: data.coin || 0,
            streak: data.streak || 0,
            spinsLeft: data.spinsLeft || 0,
            lastUpdated: new Date().toISOString()
          };
          
          // Сохраняем специальные ресурсы в UserResourcesDB
          try {
            console.log(`[SpecialResources] Сохраняем ресурсы для telegramId ${telegramId}:`, specialResources);
            await saveUserResourcesInUserDB(telegramId, specialResources);
            
            // Проверяем, действительно ли сохранены ресурсы
            const verifyResources = await getUserResourcesFromUserDB(telegramId);
            if (verifyResources && verifyResources.onion) {
              console.log("[SpecialResources] Проверка успешна, ресурсы сохранены в UserResourcesDB:", verifyResources);
            } else {
              console.warn("[SpecialResources] Проверка не удалась, ресурсы не сохранены правильно в UserResourcesDB");
            }
            
            console.log("[SpecialResources] Специальные ресурсы успешно сохранены в UserResourcesDB");
            
            // Также сохраняем в глобальной переменной для доступа в других частях приложения
            window.globalUserResources = specialResources;
            
            // Дополнительно сохраняем в rpgDatabase для совместимости
            await saveUserResourcesToIndexedDB(specialResources, telegramId);
            
            return true;
          } catch (dbError) {
            console.error("[SpecialResources] Ошибка при сохранении ресурсов в UserResourcesDB:", dbError);
            
            // В случае ошибки сохраняем хотя бы в глобальную переменную
            window.globalUserResources = specialResources;
            return false;
          }
        } else {
          console.error("[SpecialResources] Ошибка при загрузке данных с сервера:", data.message || 'Неизвестная ошибка');
          return false;
        }
      } catch (serverError) {
        console.error("[SpecialResources] Ошибка при обращении к серверу:", serverError);
        return false;
      }
    } else {
      console.log('[SpecialResources] Специальные ресурсы уже присутствуют в UserResourcesDB:', resources);
      
      // Обновляем глобальную переменную существующими ресурсами
      window.globalUserResources = resources;
      
      // Дополнительно копируем данные в rpgDatabase для совместимости
      try {
        await saveUserResourcesToIndexedDB(resources, telegramId);
        console.log('[SpecialResources] Специальные ресурсы скопированы в rpgDatabase для совместимости');
      } catch (syncError) {
        console.warn('[SpecialResources] Ошибка при синхронизации ресурсов с rpgDatabase:', syncError);
      }
      
      return true;
    }
  } catch (error) {
    console.error('[SpecialResources] Критическая ошибка при проверке и загрузке специальных ресурсов:', error);
    return false;
  }
};

// Экспортируем модуль
window.IndexedDBModule = {
  initDB,
  saveUserResources,
  getUserResources,
  createCraftingSession,
  getActiveCraftingSessions,
  updateCraftingSession,
  deleteCraftingSession,
  updateInventoryItem,
  getInventoryItems,
  saveAppVersion,
  checkAppVersion,
  clearSiteData,
  // Функции для работы со специальными ресурсами
  getUserResourcesFromIndexedDB,
  saveUserResourcesToIndexedDB,
  loadSpecialResourcesIfNeeded,
  // Функции для работы с UserResourcesDB
  initUserResourcesDB,
  getUserResourcesFromUserDB,
  saveUserResourcesInUserDB,
  // Объекты баз данных для доступа к версиям
  get db() { return db; },
  get userResourcesDb() { return userResourcesDb; },
  // Константы версий
  DB_VERSION,
  USER_RESOURCES_DB_VERSION,
  DB_NAME,
  USER_RESOURCES_DB_NAME
};

// Экспортируем константы версий в глобальную область для fallback
window.DB_VERSION = DB_VERSION;
window.USER_RESOURCES_DB_VERSION = USER_RESOURCES_DB_VERSION;

// Инициализируем базу данных при загрузке модуля
initDB().then(() => {
  console.log('[IndexedDB] ✅ База данных успешно инициализирована');
  
  // Сохраняем версию приложения при первичной инициализации
  saveAppVersion().catch(error => {
    console.error('[IndexedDB] Ошибка при сохранении версии приложения при инициализации:', error);
  });
  
  // Также инициализируем UserResourcesDB для работы с ресурсами
  initUserResourcesDB().then(() => {
    console.log('[IndexedDB] ✅ UserResourcesDB инициализирована');
    
    // ОТПРАВЛЯЕМ ГЛОБАЛЬНОЕ СОБЫТИЕ О ГОТОВНОСТИ INDEXEDDB
    const readyEvent = new CustomEvent('indexeddb-ready', {
      detail: {
        timestamp: Date.now(),
        version: DB_APP_VERSION,
        dbVersion: DB_VERSION
      }
    });
    
    document.dispatchEvent(readyEvent);
    console.log('[IndexedDB] 🎉 Отправлено событие indexeddb-ready');
    
    // Также устанавливаем глобальный флаг готовности
    window.indexedDBReady = true;
    
  }).catch(error => {
    console.error('[IndexedDB] Ошибка при инициализации UserResourcesDB:', error);
    
    // Даже при ошибке UserResourcesDB, отправляем событие готовности основной БД
    const readyEvent = new CustomEvent('indexeddb-ready', {
      detail: {
        timestamp: Date.now(),
        version: DB_APP_VERSION,
        dbVersion: DB_VERSION,
        userResourcesDbError: true
      }
    });
    
    document.dispatchEvent(readyEvent);
    window.indexedDBReady = true;
  });
}).catch(error => {
  console.error('[IndexedDB] ❌ Критическая ошибка инициализации базы данных:', error);
});
