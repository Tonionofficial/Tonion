// Подключение скриптов
// Модуль debug.js должен быть подключен через тег script в HTML

// Main RPG App Component
const { useState, useEffect, useMemo, useRef } = React;
const { createPortal } = ReactDOM;

// Debug Information Modal Component
const DebugModal = ({ isOpen, onClose }) => {
  const [debugInfo, setDebugInfo] = useState({});

  const collectDebugInfo = () => {
    // Получаем динамическую версию приложения
    const currentVersion = window.APP_VERSION || APP_VERSION;
    
    // Функция для извлечения версии из URL скрипта
    const getVersionFromScript = (scriptSrc) => {
      try {
        const urlParams = new URLSearchParams(scriptSrc.split('?')[1] || '');
        const versionParam = urlParams.get('v');
        
        // Если параметр v является timestamp (больше 1000000000), используем APP_VERSION
        if (versionParam && !isNaN(versionParam) && parseInt(versionParam) > 1000000000) {
          return currentVersion;
        }
        
        return versionParam || currentVersion;
      } catch (error) {
        return currentVersion;
      }
    };

    // Собираем версии модулей из фактически загруженных скриптов
    const moduleVersions = {};
    const scripts = document.querySelectorAll('script[src*=".js"]');
    scripts.forEach(script => {
      const src = script.src;
      if (src.includes('rpg/')) {
        const fileName = src.split('/').pop().split('?')[0];
        moduleVersions[fileName] = getVersionFromScript(src);
      }
    });

    // Собираем версии CSS файлов
    const cssVersions = {};
    const links = document.querySelectorAll('link[href*=".css"]');
    links.forEach(link => {
      const href = link.href;
      const fileName = href.split('/').pop().split('?')[0];
      cssVersions[fileName] = getVersionFromScript(href);
    });
    
    // Если модулей не найдено, добавляем стандартные RPG модули с текущей версией
    const standardModules = [
      'app.js', 'indexedDB.js', 'inventory.js', 'modals.js', 'recipes.js', 
      'crafting.js', 'campfire.js', 'furnace.js', 'chop.js', 'mine.js', 
      'hunt.js', 'stats.js', 'manualgather.js', 'itemcatalog.js'
    ];
    
    standardModules.forEach(moduleName => {
      if (!moduleVersions[moduleName]) {
        moduleVersions[moduleName] = currentVersion;
      }
    });

    // Добавляем HTML файлы с версией из META тега или текущей версии
    const htmlVersions = {
      'rpg.html': currentVersion,
      'webapp.html': currentVersion
    };

    // Получаем актуальные версии баз данных
    const getActualDBVersions = () => {
      const dbVersions = {};
      
      // Проверяем rpgDatabase
      if (window.IndexedDBModule && window.IndexedDBModule.db) {
        dbVersions['rpgDatabase'] = `v${window.IndexedDBModule.db.version}`;
      } else if (window.DB_VERSION) {
        dbVersions['rpgDatabase'] = `v${window.DB_VERSION}`;
      } else {
        dbVersions['rpgDatabase'] = 'v7';
      }
      
      // Проверяем UserResourcesDB
      if (window.IndexedDBModule && window.IndexedDBModule.userResourcesDb) {
        dbVersions['UserResourcesDB'] = `v${window.IndexedDBModule.userResourcesDb.version}`;
      } else if (window.USER_RESOURCES_DB_VERSION) {
        dbVersions['UserResourcesDB'] = `v${window.USER_RESOURCES_DB_VERSION}`;
      } else {
        dbVersions['UserResourcesDB'] = 'v7';
      }
      
      return dbVersions;
    };

    const info = {
      app: {
        version: currentVersion,
        timestamp: new Date().toLocaleString(),
        globalVersion: window.APP_VERSION || 'not set',
        htmlVersion: APP_VERSION
      },
      modules: moduleVersions,
      indexedDB: getActualDBVersions(),
      htmlCss: {
        ...htmlVersions,
        ...cssVersions
      },
      loadedModules: {
        'IndexedDBModule': !!window.IndexedDBModule,
        'CraftingModule': !!window.CraftingModule,
        'InventoryModule': !!window.InventoryModule,
        'DebugModule': !!window.DebugModule,
        'StatsModule': !!window.StatsModule,
        'ManualGatherModule': !!window.ManualGatherModule
      },
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        language: navigator.language,
        localStorage: !!window.localStorage,
        indexedDB: !!window.indexedDB,
        webWorker: !!window.Worker
      }
    };
    setDebugInfo(info);
  };

  useEffect(() => {
    if (isOpen) {
      collectDebugInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'rgba(25, 25, 35, 0.95)',
        border: '2px solid #8a2be2',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '90%',
        maxHeight: '90%',
        overflow: 'auto',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #8a2be2',
          paddingBottom: '10px'
        }}>
          <h2 style={{ color: '#8a2be2', margin: 0 }}>🐛 Debug Information</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #8a2be2',
              color: '#8a2be2',
              padding: '5px 10px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: '15px' }}>
          <div>
            <h3 style={{ color: '#8a2be2', margin: '0 0 10px 0' }}>📱 Application</h3>
            <div style={{ marginLeft: '10px' }}>
              <div>Version: {debugInfo.app && debugInfo.app.version}</div>
              <div>Timestamp: {debugInfo.app && debugInfo.app.timestamp}</div>
            </div>
          </div>

          <div>
            <h3 style={{ color: '#8a2be2', margin: '0 0 10px 0' }}>📦 Modules</h3>
            <div style={{ marginLeft: '10px' }}>
              {Object.entries(debugInfo.modules || {}).map(([module, version]) => (
                <div key={module} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{module}</span>
                  <span style={{ color: '#00ff00' }}>v{version}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ color: '#8a2be2', margin: '0 0 10px 0' }}>🗃️ IndexedDB Schemas</h3>
            <div style={{ marginLeft: '10px' }}>
              {Object.entries(debugInfo.indexedDB || {}).map(([schema, version]) => (
                <div key={schema} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{schema}</span>
                  <span style={{ color: '#00ff00' }}>{version}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ color: '#8a2be2', margin: '0 0 10px 0' }}>🎨 HTML & CSS</h3>
            <div style={{ marginLeft: '10px' }}>
              {Object.entries(debugInfo.htmlCss || {}).map(([file, version]) => (
                <div key={file} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{file}</span>
                  <span style={{ color: '#00ff00' }}>v{version}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ color: '#8a2be2', margin: '0 0 10px 0' }}>🔧 Loaded Modules Status</h3>
            <div style={{ marginLeft: '10px' }}>
              {Object.entries(debugInfo.loadedModules || {}).map(([module, loaded]) => (
                <div key={module} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{module}</span>
                  <span style={{ color: loaded ? '#00ff00' : '#ff0000' }}>
                    {loaded ? '✅ Loaded' : '❌ Not Loaded'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ color: '#8a2be2', margin: '0 0 10px 0' }}>🌐 Browser Info</h3>
            <div style={{ marginLeft: '10px', fontSize: '10px' }}>
              <div><strong>Platform:</strong> {debugInfo.browser && debugInfo.browser.platform}</div>
              <div><strong>Vendor:</strong> {debugInfo.browser && debugInfo.browser.vendor}</div>
              <div><strong>Language:</strong> {debugInfo.browser && debugInfo.browser.language}</div>
              <div><strong>Online:</strong> {debugInfo.browser && debugInfo.browser.onLine ? '✅' : '❌'}</div>
              <div><strong>Cookies:</strong> {debugInfo.browser && debugInfo.browser.cookieEnabled ? '✅' : '❌'}</div>
              <div style={{ marginTop: '5px', wordBreak: 'break-all' }}>
                <strong>User Agent:</strong> {debugInfo.browser && debugInfo.browser.userAgent}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Import crafting functionality from the crafting module
// Note: In a real setup you'd use an import statement, but for our script tags approach, we'll use global variables
// The crafting module components will be available in the global CraftingModule object

// Глобальная функция для добавления метки времени к URL
function addTimestamp(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

// Функция для получения ресурсов пользователя из IndexedDB
const getUserResourcesFromIndexedDB = async () => {
  try {
    // Проверяем наличие IndexedDB модуля
    if (window.IndexedDBModule && typeof window.IndexedDBModule.getItems === 'function') {
      const items = await window.IndexedDBModule.getItems();
      if (items && items.inventory) {
        // Удалено избыточное логирование
        
        // Преобразуем массив предметов в объект ресурсов
        const resources = {};
        items.inventory.forEach(item => {
          if (item && item.id) {
            resources[item.id] = item.qty || item.quantity || 0;
          }
        });
        
        return resources;
      }
    }
    
    // Если не удалось получить данные из IndexedDB, возвращаем пустой объект
    return {};
  } catch (error) {
    console.error('Error getting resources from IndexedDB:', error);
    return {};
  }
};

// Функция для получения истории ресурсов (заглушка)
const getResourcesHistoryFromIndexedDB = async (limit = 3) => {
  return [];
};

// Функция для сохранения ресурсов в IndexedDB
const saveUserResourcesToIndexedDB = async (resources) => {
  try {
    if (!resources) return false;
    
    // Проверяем наличие IndexedDB модуля
    if (window.IndexedDBModule && typeof window.IndexedDBModule.updateUserInventory === 'function') {
      await window.IndexedDBModule.updateUserInventory(resources);
      // Удалено избыточное логирование
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error saving resources to IndexedDB:', error);
    return false;
  }
};

// BackButton component for navigation
const BackButton = ({ onClick, position = 'right', style = {} }) => (
  <button 
    className={`rpg-back-button ${position}`} 
    onClick={onClick}
    style={{
      position: "absolute",
      zIndex: 1000,
      padding: "8px 12px",
      background: "linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)",
      border: "2px solid rgba(0, 255, 255, 0.7)",
      boxShadow: "0 0 10px rgba(0, 255, 255, 0.5)",
      borderRadius: "8px",
      color: "white",
      cursor: "pointer",
      ...style
    }}
  >
    <span className="back-icon">↩</span>
  </button>
);

// CloseButton component with X icon
const CloseButton = ({ onClick, position = 'right', style = {} }) => (
  <button 
    className={`rpg-close-button ${position}`} 
    onClick={onClick}
    style={{
      position: "absolute",
      zIndex: 1001,
      padding: "8px 12px",
      background: "linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)",
      border: "2px solid rgba(0, 255, 255, 0.7)",
      boxShadow: "0 0 10px rgba(0, 255, 255, 0.5)",
      borderRadius: "8px",
      color: "white",
      cursor: "pointer",
      width: "36px",
      height: "36px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
      ...style
    }}
  >
    <span className="close-icon">✕</span>
  </button>
);

// Game Button Component
const GameButton = ({ icon, label, onClick, active, ...props }) => {
  return (
    <div className={`game-button ${active ? 'active' : ''}`} {...props}>
      <button 
        onClick={onClick} 
        className={active ? 'active' : ''}
      >
        {icon}
      </button>
      <span>{label}</span>
    </div>
  );
};

// Item Slot Component
const ItemSlot = ({ type, item }) => {
  return (
    <div className="item-slot">
      {item ? (
        <div className="item-image">
          <div className="text-xs text-center text-white">{item.id}</div>
        </div>
      ) : (
        <span className="empty-slot">{type}</span>
      )}
    </div>
  );
};

// Character Page Component
const Character = ({ userData, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [characterData, setCharacterData] = useState(userData);
  const [resources, setResources] = useState([]);
  const [equippedItems, setEquippedItems] = useState({});
  const [tooltipItem, setTooltipItem] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  // Состояние для актуального опыта
  const [currentExperience, setCurrentExperience] = useState(0);
  
  // Состояния для распределения статов
  const [unallocatedStats, setUnallocatedStats] = useState(0);
  const [tempStatChanges, setTempStatChanges] = useState({
    strength: 0,
    agility: 0,
    luck: 0,
    health: 0
  });
  const [isUpdatingStats, setIsUpdatingStats] = useState(false);
  
  // Получаем telegramId только из localStorage
  const telegramId = localStorage.getItem('telegramId') || '';
  
  // Обработчик обновления опыта
  useEffect(() => {
    const handleExperienceUpdate = (event) => {
      const { newExperience } = event.detail;
      if (newExperience !== undefined) {
        setCurrentExperience(newExperience);
      }
    };
    
    window.addEventListener('experienceUpdated', handleExperienceUpdate);
    
    return () => {
      window.removeEventListener('experienceUpdated', handleExperienceUpdate);
    };
  }, []);
  
  // Обновляем локальное состояние при изменении данных персонажа
  useEffect(() => {
    if (characterData && characterData.exp !== undefined) {
      setCurrentExperience(characterData.exp);
    }
  }, [characterData]);
  
  // Отслеживание изменений нераспределенных статов
  useEffect(() => {
    // Инициализация нераспределенных статов
    if (window.UnallocatedStatsModule) {
      setUnallocatedStats(window.UnallocatedStatsModule.get());
    }
    
    // Обработчик изменения нераспределенных статов
    const handleUnallocatedStatsChange = (event) => {
      setUnallocatedStats(event.detail.unallocatedStats || 0);
    };
    
    window.addEventListener('unallocatedStatsChanged', handleUnallocatedStatsChange);
    
    return () => {
      window.removeEventListener('unallocatedStatsChanged', handleUnallocatedStatsChange);
    };
  }, []);
  
  // Функции для работы с распределением статов
  const increaseStat = (statName) => {
    if (unallocatedStats > 0 && tempStatChanges[statName] < unallocatedStats) {
      setTempStatChanges(prev => ({
        ...prev,
        [statName]: prev[statName] + 1
      }));
    }
  };
  
  const decreaseStat = (statName) => {
    if (tempStatChanges[statName] > 0) {
      setTempStatChanges(prev => ({
        ...prev,
        [statName]: prev[statName] - 1
      }));
    }
  };
  
  const getTotalAllocatedStats = () => {
    return Object.values(tempStatChanges).reduce((sum, value) => sum + value, 0);
  };
  
  const getRemainingStats = () => {
    return unallocatedStats - getTotalAllocatedStats();
  };
  
  const confirmStatChanges = async () => {
    const totalAllocated = getTotalAllocatedStats();
    if (totalAllocated === 0) return;
    
    setIsUpdatingStats(true);
    
    try {
      // Подготавливаем новые значения статов
      const newStats = {
        strength: (characterData.strength || 0) + tempStatChanges.strength,
        agility: (characterData.agility || 0) + tempStatChanges.agility,
        luck: (characterData.luck || 0) + tempStatChanges.luck,
        health: (characterData.health || 0) + tempStatChanges.health
      };
      
      // Отправляем на сервер
      const response = await fetch('rpg.php?action=updateUserStats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: telegramId,
          stats: newStats,
          statsSpent: totalAllocated
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Обновляем локальные данные персонажа с сервера
        setCharacterData(prev => ({
          ...prev,
          ...data.stats,
          stats_avb: data.stats_avb
        }));
        
        // Обновляем userData для синхронизации с родительским компонентом
        if (userData) {
          Object.assign(userData, {
            ...data.stats,
            stats_avb: data.stats_avb
          });
        }
        
        // Обновляем локальное хранилище с новым количеством доступных статов
        if (window.UnallocatedStatsModule) {
          // Синхронизируем с сервером - устанавливаем точное значение
          const telegramId = localStorage.getItem('telegramId');
          if (telegramId) {
            localStorage.setItem(`unallocatedStats_${telegramId}`, data.stats_avb.toString());
            
            // Отправляем событие об обновлении статов
            window.dispatchEvent(new CustomEvent('unallocatedStatsChanged', {
              detail: { unallocatedStats: data.stats_avb }
            }));
            
            // Обновляем индикатор
            window.UnallocatedStatsModule.updateIndicator();
          }
        }
        
        // Сбрасываем временные изменения
        setTempStatChanges({
          strength: 0,
          agility: 0,
          luck: 0,
          health: 0
        });
        
        console.log('[Character] Статы успешно обновлены:', {
          stats: data.stats,
          remainingStats: data.stats_avb,
          spent: totalAllocated
        });
      } else {
        console.error('[Character] Ошибка обновления статов:', data.message || data.error);
        alert('Error updating stats: ' + (data.message || data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[Character] Ошибка запроса обновления статов:', error);
      alert('Error updating stats. Please try again.');
    } finally {
      setIsUpdatingStats(false);
    }
  };
  
  // Функция загрузки экипированных предметов из IndexedDB
  const loadEquippedItems = async () => {
    try {
      if (!telegramId) {
        console.error('No telegramId found in localStorage');
        return;
      }
      
      // Проверяем наличие IndexedDB модуля
      if (window.IndexedDBModule && typeof window.IndexedDBModule.getItems === 'function') {
        try {
          const items = await window.IndexedDBModule.getItems();
          if (items && items.equipped) {
            // Удалено избыточное логирование
            setEquippedItems(items.equipped);
            
            // Делаем экипированные предметы доступными глобально
            window.equippedItems = items.equipped;
            return;
          }
        } catch (error) {
          console.error('Error loading equipped items from IndexedDB:', error);
        }
      }
      
      // Запасной вариант - загрузка с сервера через API
      const response = await fetch(addTimestamp('rpg.php?action=getEquipped'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      
      const data = await response.json();
      if (data.success && data.equipped) {
        // Удалено избыточное логирование
        setEquippedItems(data.equipped);
        
        // Делаем экипированные предметы доступными глобально
        window.equippedItems = data.equipped;
        
        // Сохраняем в IndexedDB, если модуль доступен
        if (window.IndexedDBModule && typeof window.IndexedDBModule.checkUserData === 'function') {
          try {
            await window.IndexedDBModule.checkUserData(telegramId, { equipped: data.equipped });
            // Удалено избыточное логирование
          } catch (error) {
            console.error('Error saving equipped items to IndexedDB:', error);
          }
        }
      } else {
        console.error('Failed to load equipped items from server:', data.message);
      }
    } catch (error) {
      console.error('Error loading equipped items:', error);
    }
  };
  
  // Делаем функцию доступной глобально для вызова из модального окна
  useEffect(() => {
    window.refreshCharacterEquipment = loadEquippedItems;
    
    return () => {
      // Очищаем только функцию обновления, но сохраняем данные об экипировке
      window.refreshCharacterEquipment = null;
      // window.equippedItems = null; // Не очищаем данные об экипировке, они нужны для проверок
    };
  }, []);
  
  // Загружаем экипированные предметы при загрузке страницы
  useEffect(() => {
    loadEquippedItems();
  }, [telegramId]);
  
  // Load user data if not provided
  useEffect(() => {
    if (!userData) {
      const loadUserData = async () => {
        try {
          setIsLoading(true);
          
          // Check if telegramId is available
          if (!telegramId) {
            console.error('No telegramId found in localStorage');
            setError('No Telegram ID found. Please reload the page.');
            setIsLoading(false);
            return;
          }
          
          // Удалено избыточное логирование
          
          // Get user data from server
          const userData = await RPGApi.getUserData(telegramId);
          
          if (!userData) {
            console.error('Could not load character data, API returned null');
            setError('Could not load character data. Server returned empty response.');
            setIsLoading(false);
            return;
          }
          
          // Обновляем ExperienceModule с данными с сервера ДО установки данных в состояние
          if (window.ExperienceModule && userData.experience !== undefined) {
            const experienceData = window.ExperienceModule.get();
            experienceData.currentExperience = userData.experience || userData.exp || 0;
            experienceData.level = userData.level || 1;
            console.log('[Character] Обновлен ExperienceModule ДО рендеринга:', experienceData);
            
            // Получаем самые свежие данные с сервера
            try {
              await window.ExperienceModule.update();
              console.log('[Character] Опыт обновлен с сервера ДО рендеринга');
            } catch (error) {
              console.error('[Character] Ошибка обновления опыта:', error);
            }
          }
          
          // Удалено избыточное логирование
          setCharacterData(userData);
          
          // Синхронизируем доступные статы с сервером
          if (userData.stats_avb !== undefined && window.UnallocatedStatsModule) {
            const telegramId = localStorage.getItem('telegramId');
            if (telegramId) {
              localStorage.setItem(`unallocatedStats_${telegramId}`, userData.stats_avb.toString());
              
              // Отправляем событие об обновлении статов
              window.dispatchEvent(new CustomEvent('unallocatedStatsChanged', {
                detail: { unallocatedStats: userData.stats_avb }
              }));
              
              console.log('[Character] Синхронизированы доступные статы с сервера:', userData.stats_avb);
              
              // Обновляем индикатор с небольшой задержкой
              setTimeout(() => {
                if (window.UnallocatedStatsModule) {
                  window.UnallocatedStatsModule.updateIndicator();
                }
              }, 100);
            }
          }
          
          // Parse resources from user data
          if (userData.resources) {
            try {
              // Используем функцию из InventoryModule для обработки ресурсов, если доступна
              if (window.InventoryModule) {
                setResources(window.InventoryModule.processUserResources(userData.resources));
              } else {
                // Если модуль не доступен - используем старую логику
                let parsedResources = userData.resources;
                if (typeof userData.resources === 'string') {
                  parsedResources = JSON.parse(userData.resources);
                }
                // Удалено избыточное логирование
                
                // Преобразование ресурсов в массив
                const resourcesArray = Object.entries(parsedResources || {})
                  .filter(([resourceName, amount]) => amount > 0)
                  .map(([resourceName, amount]) => ({
                    id: resourceName,
                    name: resourceName,
                    qty: amount
                  }));
                  
                setResources(resourcesArray);
              }
            } catch (parseError) {
              console.error('Error parsing resources:', parseError);
              setResources([]);
            }
          } else {
            // Удалено избыточное логирование
            setResources([]);
          }
          
          setIsLoading(false);
        } catch (error) {
          console.error('Error loading character data:', error);
          setError(`Failed to load character data: ${error.message}`);
          setIsLoading(false);
        }
      };
      
      loadUserData();
    } else {
      // If userData was provided as a prop
      setIsLoading(false);
      // Удалено избыточное логирование
      
      // Обновляем ExperienceModule с данными из props
      if (window.ExperienceModule && userData.experience !== undefined) {
        const experienceData = window.ExperienceModule.get();
        experienceData.currentExperience = userData.experience || userData.exp || 0;
        experienceData.level = userData.level || 1;
        console.log('[Character] Обновлен ExperienceModule из props:', experienceData);
      }
      
      // Если данные переданы напрямую, извлекаем ресурсы
      if (userData.resources) {
        try {
          // Используем функцию из InventoryModule для обработки ресурсов, если доступна
          if (window.InventoryModule) {
            setResources(window.InventoryModule.processUserResources(userData.resources));
          } else {
            // Если модуль не доступен - используем старую логику
            let parsedResources = userData.resources;
            if (typeof userData.resources === 'string') {
              parsedResources = JSON.parse(userData.resources);
              // Удалено избыточное логирование
            } else {
              // Удалено избыточное логирование
            }
            
            // Преобразование ресурсов в массив
            const resourcesArray = Object.entries(parsedResources || {})
              .filter(([resourceName, amount]) => amount > 0)
              .map(([resourceName, amount]) => ({
                id: resourceName,
                name: resourceName,
                qty: amount
              }));
                
            setResources(resourcesArray);
          }
        } catch (parseError) {
          console.error('Error parsing provided resources:', parseError);
          // Удалено избыточное логирование
          setResources([]);
        }
      } else {
        // Удалено избыточное логирование
        setResources([]);
      }
    }
  }, [userData, telegramId]);
  
  // Load special resources from IndexedDB
  useEffect(() => {
    // Функция loadResourcesFromIndexedDB отключена, поскольку она конфликтует с обновленной системой хранения.
    // Теперь для работы с предметами при экипировке/снятии мы используем только rpgDatabase/inventory,
    // а не UserResourcesDB/resources. Это позволяет избежать проблем с обновлением количества предметов.
    /*
    const loadResourcesFromIndexedDB = async () => {
      try {
        // Проверяем наличие функции getItems в IndexedDBModule
        if (window.IndexedDBModule && typeof window.IndexedDBModule.getItems === 'function') {
          const items = await window.IndexedDBModule.getItems();
          if (items && items.inventory) {
            // Удалено избыточное логирование
            
            // Обрабатываем предметы инвентаря для отображения
            const processedItems = items.inventory.map(item => ({
              id: item.id,
              item_id: item.id,
              name: item.name || item.id.charAt(0).toUpperCase() + item.id.slice(1).replace(/_/g, ' '),
              qty: item.qty || item.quantity || 0,
              rarity: item.rarity || 'Common',
              type: item.type || 'Resource',
              description: item.description || 'No description available'
            }));
            
            // Обновляем состояние ресурсов
            setResources(prevResources => {
              // Если нет предыдущих ресурсов, просто используем новые
              if (!prevResources || prevResources.length === 0) {
                return processedItems;
              }
              
              // Объединяем текущие ресурсы с полученными из IndexedDB
              // и удаляем дубликаты по id
              const existingIds = new Set(prevResources.map(item => item.id));
              const newItems = processedItems.filter(item => !existingIds.has(item.id));
              
              return [...prevResources, ...newItems];
            });
            
            // Удалено избыточное логирование
          }
        } else if (window.InventoryModule && typeof window.InventoryModule.loadAllResources === 'function') {
          // Запасной вариант - используем InventoryModule
          const result = await window.InventoryModule.loadAllResources();
          if (result && result.items) {
            setResources(prevResources => {
              if (!prevResources || prevResources.length === 0) {
                return result.items;
              }
              
              const existingIds = new Set(prevResources.map(item => item.id));
              const newItems = result.items.filter(item => !existingIds.has(item.id));
              
              return [...prevResources, ...newItems];
            });
            
            // Удалено избыточное логирование
          }
        }
      } catch (error) {
        console.error('Error loading resources from IndexedDB:', error);
      }
    };
    
    loadResourcesFromIndexedDB();
    */
    
    // Вместо прямого вызова функции loadResourcesFromIndexedDB используем слушатели событий
    // для обновления интерфейса при изменениях в инвентаре (после экипировки/снятия предметов)
    const handleInventoryUpdate = () => {
      // Удалено избыточное логирование
      // При обновлении инвентаря запрашиваем обновление экипировки
      if (window.refreshCharacterEquipment) {
        window.refreshCharacterEquipment();
      }
    };
    
    // Подписываемся на события обновления инвентаря
    window.addEventListener('inventoryUpdated', handleInventoryUpdate);
    window.addEventListener('resourcesUpdated', handleInventoryUpdate);
    
    // Очистка слушателя при размонтировании компонента
    return () => {
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
      window.removeEventListener('resourcesUpdated', handleInventoryUpdate);
    };
  }, []);

  // Отрисовка опыта сразу после загрузки данных персонажа
  useEffect(() => {
    if (characterData && window.ExperienceModule) {
      // Небольшая задержка чтобы DOM успел обновиться
      setTimeout(() => {
        window.ExperienceModule.renderBar('main-experience-container');
        console.log('[Character] Опыт отрисован после загрузки данных персонажа');
      }, 50);
    }
  }, [characterData]);

  // Close item details modal
  // const closeItemDetails = () => {
  //  setShowItemDetails(false);
  //  setSelectedItem(null);
  // };
  
  if (isLoading) {
  return (
      <div className="rpg-loading futuristic">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading character data...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="rpg-error">
        <div>Error: {error}</div>
        <div>Please try reloading the page. If the problem persists, contact support.</div>
        <button onClick={onBack} className="rpg-button">Back</button>
      </div>
    );
  }
  
  if (!characterData) {
    return (
      <div className="rpg-error">
        <div>Character not found</div>
        <div>Telegram ID: {telegramId || 'Not available'}</div>
        <button onClick={onBack} className="rpg-button">Back</button>
              </div>
    );
  }
  

  
  // Calculate experience percentage
  const expTotal = characterData.level * 100;
  const expPercentage = (currentExperience / expTotal) * 100;
  
  // Функция для рендеринга слота с предметом или пустого слота
  const renderEquipmentSlot = (slotName, displayName) => {
    const itemId = equippedItems[slotName];
    
    // Проверяем, нужно ли отображать лук в слоте weapon2
    let isBowInOffhand = false;
    let opacity = 1;
    let actualItemId = itemId;
    
    // Если это слот weapon2 и в weapon1 есть лук, отображаем его с прозрачностью
    if (slotName === 'weapon2' && equippedItems.weapon1 && equippedItems.weapon1.toLowerCase().includes('bow')) {
      isBowInOffhand = true;
      actualItemId = equippedItems.weapon1; // Используем ID лука из weapon1
      opacity = 0.5; // Полупрозрачный
    }
    
    // Проверяем, является ли слот слотом для зелий
    const isPotionSlot = slotName === 'potion1' || slotName === 'potion2' || slotName === 'potion3';
    
    return (
      <div className={`equipment-slot ${slotName} futuristic`}>
        <div className="slot-name">{displayName}</div>
        {actualItemId ? (
          <div 
            className={`slot-item ${isBowInOffhand ? 'bow-offhand' : ''}`}
            style={{ 
              backgroundImage: `url(images/rpg/${actualItemId}.png)`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: opacity
            }}
            onClick={() => isBowInOffhand ? null : handleEquippedItemClick(slotName, actualItemId)}
            onMouseEnter={(e) => handleTooltipShow(e, actualItemId)}
            onMouseLeave={() => setTooltipItem(null)}
          >
            {/* Имя предмета убрано */}
          </div>
        ) : (
          <div className={`slot-item ${isPotionSlot ? 'empty-potion' : 'empty'}`}>
            {!isPotionSlot && 'Empty'}
          </div>
        )}
      </div>
    );
  };
  
  // Обработчик клика по экипированному предмету
  const handleEquippedItemClick = (slot, itemId) => {
    if (!itemId) return; // Не делаем ничего, если слот пустой
    
    // Удалено избыточное логирование
    
    // Используем модальное окно из глобального объекта window
    if (window.showItemDetailsModal) {
      // Улучшаем объект additionalInfo, добавляя более явные флаги
      window.showItemDetailsModal(itemId, false, null, {
        isEquipped: true,         // Явно указываем, что предмет экипирован
        slot: slot,               // Передаем слот для правильного снятия
        source: 'equipment',      // Источник - экипировка
        fromCharacterScreen: true // Дополнительный флаг, указывающий что открыто из экрана персонажа
      });
    } else {
      // Запасной вариант, если функция модального окна недоступна
      if (confirm(`Do you want to unequip ${itemId} from ${slot}?`)) {
        unequipItem(slot, itemId);
      }
    }
  };
  
  // Функция для снятия предмета
  const unequipItem = async (slot, itemId) => {
    try {
      const response = await fetch(addTimestamp('rpg.php?action=unequipItem'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, slot, itemId })
      });
      
      const data = await response.json();
      if (data.success) {
        // Удалено избыточное логирование
        
        // Обновляем экипировку в IndexedDB, если модуль доступен
        if (window.IndexedDBModule && typeof window.IndexedDBModule.getItems === 'function') {
          try {
            // Получаем текущую экипировку из IndexedDB
            const items = await window.IndexedDBModule.getItems();
            if (items && items.equipped) {
              // Создаем копию объекта экипировки
              const updatedEquipment = { ...items.equipped };
              // Удаляем предмет из слота
              updatedEquipment[slot] = null;
              
              // Сохраняем обновленную экипировку
              if (window.IndexedDBModule.checkUserData) {
                await window.IndexedDBModule.checkUserData(telegramId, { equipped: updatedEquipment });
                // Удалено избыточное логирование
              }
            }
          } catch (error) {
            console.error('Error updating IndexedDB after unequipping:', error);
          }
        }
        
        // Обновляем состояние экипировки
        loadEquippedItems();
      } else {
        console.error('Failed to unequip item:', data.message);
        alert('Failed to unequip item: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error unequipping item:', error);
      alert('Error unequipping item. Please try again.');
    }
  };
  
  // Обработчик для показа тултипа при наведении на экипированный предмет
  const handleTooltipShow = (e, itemId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setTooltipItem(itemId);
  };
  
  // Рендер тултипа для экипированного предмета
  const renderTooltip = () => {
    if (!tooltipItem) return null;
    
    // Получаем информацию о предмете из ItemCatalogModule (если доступно)
    let itemDetails = null;
    if (window.ItemCatalogModule && typeof window.ItemCatalogModule.findCatalogItemById === 'function') {
      try {
        itemDetails = window.ItemCatalogModule.findCatalogItemById(tooltipItem);
      } catch (error) {
        console.warn('Error fetching item details:', error);
      }
    }
    
    // Если нет данных о предмете, используем базовые данные
    if (!itemDetails) {
      itemDetails = {
        name: tooltipItem.charAt(0).toUpperCase() + tooltipItem.slice(1).replace(/_/g, ' '),
        description: `No description available for ${tooltipItem}`,
        type: 'Equipment',
        rarity: 'Common'
      };
    }
    
    // Определяем цвет рамки по редкости
    let borderColor = '#ffffff';
    switch ((itemDetails.rarity && itemDetails.rarity.toLowerCase()) || 'common') {
      case 'common': borderColor = '#aaaaaa'; break;
      case 'uncommon': borderColor = '#1eff00'; break;
      case 'rare': borderColor = '#0070dd'; break;
      case 'epic': borderColor = '#a335ee'; break;
      case 'legendary': borderColor = '#ff8000'; break;
      default: borderColor = '#aaaaaa';
    }
    
    // Размеры тултипа и экрана
    const tooltipWidth = 200;
    const tooltipHeight = 160; // Примерная высота тултипа
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Расчет начальной позиции (по центру элемента)
    let leftPos = tooltipPosition.x - tooltipWidth / 2;
    let topPos = tooltipPosition.y - tooltipHeight - 10; // 10px отступ
    
    // Проверка границ по горизонтали
    if (leftPos < 10) {
      leftPos = 10; // Минимум 10px от левого края
    } else if (leftPos + tooltipWidth > windowWidth - 10) {
      leftPos = windowWidth - tooltipWidth - 10; // Минимум 10px от правого края
    }
    
    // Проверка границ по вертикали
    // Если тултип выходит за верхний край, показываем его под элементом
    if (topPos < 10) {
      topPos = tooltipPosition.y + 30; // Показываем под элементом (смещение примерно равно высоте слота)
    }
    
    // Если и под элементом не помещается (например, в самом низу экрана)
    if (topPos + tooltipHeight > windowHeight - 10) {
      topPos = windowHeight - tooltipHeight - 10; // Минимум 10px от нижнего края
    }
    
    // Стили для тултипа с исправленным позиционированием
    const tooltipStyle = {
      position: 'fixed',
      width: `${tooltipWidth}px`,
      left: `${leftPos}px`,
      top: `${topPos}px`,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: '#fff',
      background: 'linear-gradient(135deg, rgba(0,255,255,0.18) 0%, rgba(0,0,40,0.8) 100%)',
      border: `2px solid rgba(0,255,255,0.35)`,
      borderTop: '2.5px solid #00fff7',
      borderBottom: '2.5px solid #00fff7',
      borderRadius: '8px',
      padding: '10px',
      boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 1000,
      pointerEvents: 'none',
      animation: 'tooltipFadeIn 0.15s ease-out'
    };
    
    return (
      <div className="equipment-tooltip futuristic" style={tooltipStyle}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
          <div style={{ 
            width: '30px', 
            height: '30px', 
            marginRight: '10px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0)',
            borderRadius: '4px',
            border: `1px solid ${borderColor}`
          }}>
            <img 
              src={`images/rpg/${tooltipItem}.png`}
              onError={(e) => {
                e.target.src = 'images/rpg/unknown.png';
              }}
              alt={itemDetails.name}
              style={{ maxWidth: '25px', maxHeight: '25px' }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: borderColor, textShadow: '0 0 5px rgba(0, 255, 255, 0.5)' }}>{itemDetails.name}</div>
            <div style={{ color: '#aaa', fontSize: '10px' }}>
              {itemDetails.rarity} {itemDetails.type}
            </div>
          </div>
        </div>
        
        <div style={{ 
          padding: '5px 0',
          borderTop: `1px solid ${borderColor}50`,
          marginTop: '5px',
          fontSize: '11px',
          color: '#ccc'
        }}>
          {itemDetails.description && (
            <div style={{ marginTop: '5px', fontStyle: 'italic' }}>
              {itemDetails.description}
            </div>
          )}
          {itemDetails.properties && (
            <div style={{ marginTop: '5px', color: '#8aff8a' }}>
              {itemDetails.properties}
            </div>
          )}
        </div>
        
        <div style={{ 
          fontSize: '10px', 
          marginTop: '5px', 
          color: '#aaa', 
          textAlign: 'center',
          fontStyle: 'italic',
          borderTop: `1px solid ${borderColor}30`,
          paddingTop: '8px'
        }}>
          Click for details
        </div>
      </div>
    );
  };
  
  return (
    <div className="rpg-character-screen futuristic">
      <BackButton onClick={onBack} position="right" />
      
      {/* Рендерим тултип, если нужно */}
      {renderTooltip()}
      
      <div className="rpg-character-header futuristic">
        <div className="character-name-level futuristic">
          <h2>{characterData.nickname || 'Character'}</h2>
          <span className="character-level futuristic"> {characterData.level || 1}</span>
          <div className="experience-bar-container futuristic">
            <div className="experience-bar futuristic" style={{ width: `${expPercentage}%` }}></div>
            <div className="experience-text">{window.formatLargeNumber ? window.formatLargeNumber(currentExperience) : currentExperience}/{window.formatLargeNumber ? window.formatLargeNumber(expTotal) : expTotal}</div>
          </div>
        </div>
      </div>
      
      <div className="rpg-character-body">
        <div className="character-main-container futuristic">
          <div className="character-equipment-container futuristic">
            <h3 className="futuristic">Equipment</h3>
            <div className="equipment-slots futuristic">
              {renderEquipmentSlot('helmet', 'Helmet')}
              {renderEquipmentSlot('earring', 'Earring')}
              {renderEquipmentSlot('amulet', 'Amulet')}
              {renderEquipmentSlot('gloves', 'Gloves')}
              {renderEquipmentSlot('bracers', 'Bracers')}
              {renderEquipmentSlot('armor', 'Armor')}
              {renderEquipmentSlot('weapon1', 'Weapon')}
              {renderEquipmentSlot('weapon2', 'Offhand')}
              {renderEquipmentSlot('belt', 'Belt')}
              {renderEquipmentSlot('pants', 'Pants')}
              {renderEquipmentSlot('boots', 'Boots')}
              {renderEquipmentSlot('ring1', 'Ring')}
              {renderEquipmentSlot('ring2', 'Ring')}
              {renderEquipmentSlot('ring3', 'Ring')}
              {renderEquipmentSlot('ring4', 'Ring')}
              <div className="potions-container">
                {renderEquipmentSlot('potion1', 'Pot')}
                {renderEquipmentSlot('potion2', 'Pot')}
                {renderEquipmentSlot('potion3', 'Pot')}
              </div>
            </div>
          </div>
          
          <div className="character-stats-container">
            <h3 className="futuristic">Attributes</h3>
            <div className="stats-grid">
              {Object.entries(characterData)
                .filter(([key]) => ['strength', 'agility', 'luck', 'health'].includes(key))
                .map(([stat, value]) => (
                  <div key={stat} className="stat-item futuristic">
                    <span className="stat-name futuristic">{stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                    
                    {unallocatedStats > 0 && (
                      <div className="stat-controls">
                        <button 
                          className="stat-button decrease futuristic"
                          onClick={() => decreaseStat(stat)}
                          disabled={tempStatChanges[stat] <= 0}
                        >
                          -
                        </button>
                        <button 
                          className="stat-button increase futuristic"
                          onClick={() => increaseStat(stat)}
                          disabled={getRemainingStats() <= 0}
                        >
                          +
                        </button>
                      </div>
                    )}
                    
                    <span className="stat-value futuristic">
                      {value + tempStatChanges[stat]}
                      {tempStatChanges[stat] > 0 && (
                        <span className="stat-change">+{tempStatChanges[stat]}</span>
                      )}
                    </span>
                  </div>
                ))}
              
              {/* Панель управления статами */}
              {(unallocatedStats > 0 || getTotalAllocatedStats() > 0) && (
                <div className="stats-control-panel">
                  <div className="remaining-stats">
                    <span className="remaining-stats-label">Available:</span>
                    <span className="remaining-stats-value">{getRemainingStats()}</span>
                  </div>
                  <button 
                    className="confirm-stats-button futuristic"
                    onClick={confirmStatChanges}
                    disabled={getTotalAllocatedStats() === 0 || isUpdatingStats}
                  >
                    {isUpdatingStats ? 'Updating...' : 'Confirm'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Инвентарь */}
        {window.InventoryModule ? (
          <window.InventoryModule.CharacterInventory
            userData={userData}
            getUserResourcesFromIndexedDB={getUserResourcesFromIndexedDB}
            equippedItems={equippedItems} // Передаем экипированные предметы для обновления отображения
            onEquipChange={() => loadEquippedItems()} // Функция обновления при экипировке нового предмета
          />
        ) : (
          <div className="inventory-container">
            <h3>Inventory</h3>
            <div className="no-items">
              Module not available. Please refresh the page.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Gathering Page Component
const Gathering = ({ onBack }) => {
  const [gatheringState, setGatheringState] = useState("idle"); // idle, active, completed
  const [countdown, setCountdown] = useState(0);
  const [resources, setResources] = useState({});
  const [totalGathered, setTotalGathered] = useState({});
  const [lastClaimTime, setLastClaimTime] = useState(0);
  const [nextResourceTime, setNextResourceTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionCreatedAt, setSessionCreatedAt] = useState(0);
  const [resourcesClaimed, setResourcesClaimed] = useState(0); // Добавляем состояние для подсчета количества добытых ресурсов
  const [bonusResourcesAdded, setBonusResourcesAdded] = useState(0); // Состояние для хранения информации о бонусных ресурсах
  
  // Инициализируем стили модуля ручного сбора при загрузке компонента
  React.useEffect(() => {
    if (window.ManualGatherModule) {
      window.ManualGatherModule.addStyles();
    }
  }, []);
  
  // Константы для вероятности ресурсов
  const RESOURCE_CHANCES = {
    'Rock': 8,
    'Wood Log': 8,
    'Berry': 16,
    'Herbs': 16,
    'Stick': 16,
    'Mushrooms': 16,
    'Fiber': 21
  };
  
  // Получаем TelegramID из localStorage
  const telegramId = localStorage.getItem('telegramId');
  
  // Загрузка данных о сборе из БД при инициализации
  useEffect(() => {
    loadGatheringSession();
    
    // Добавляем обработчик события на случай, если пользователь вернется на страницу
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Удалено избыточное логирование
        loadGatheringSession();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Функция загрузки текущей сессии сбора из БД
  const loadGatheringSession = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(addTimestamp(`rpg.php?action=getGatheringSession`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ telegramId })
      });
      const data = await response.json();
      if (data.success && data.session) {
        const currentTime = Math.floor(Date.now() / 1000);
        const sessionStartTime = data.session.start_time || data.session.created_at;
        if (sessionStartTime) {
          setSessionCreatedAt(sessionStartTime);
        }
        
        // Устанавливаем начальное значение resources_claimed из сессии
        setResourcesClaimed(data.session.resources_claimed || 0);
        
                  // Проверяем, не истекло ли время сессии, независимо от статуса в БД
          if (data.session.end_time <= currentTime) {
            // Удалено избыточное логирование
            
            // Проверяем, есть ли недополученные ресурсы (если resources_claimed < 16)
            const sessionResourcesClaimed = parseInt(data.session.resources_claimed, 10) || 0;
            if (sessionResourcesClaimed < 16) {
              const remainingResources = 16 - sessionResourcesClaimed;
              // Удалено избыточное логирование
              
              // Получаем текущее состояние ресурсов из сессии
              const sessionResources = data.session.resources || {};
              const sessionTotalGathered = data.session.total_gathered || {};
              
              // Создаем копии состояний для обновления
              const newResources = { ...sessionResources };
              const newTotalGathered = { ...sessionTotalGathered };
              
              // Добавляем недополученные ресурсы (максимум remainingResources, минимум 0)
              let bonusResourcesAddedCount = 0;
              // Удалено избыточное логирование
            
            for (let i = 0; i < remainingResources; i++) {
              const random = Math.floor(Math.random() * 100) + 1;
              let accumulatedChance = 0;
              let selectedResource = null;
              
              // Определение выпавшего ресурса на основе шансов
              for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
                accumulatedChance += chance;
                if (random <= accumulatedChance) {
                  selectedResource = resource;
                  break;
                }
              }
              
              if (selectedResource) {
                // Увеличиваем количество ресурсов
                newResources[selectedResource] = (newResources[selectedResource] || 0) + 1;
                newTotalGathered[selectedResource] = (newTotalGathered[selectedResource] || 0) + 1;
                bonusResourcesAddedCount++;
                // Удалено избыточное логирование
              }
            }
            
            // Обновляем состояние с новыми ресурсами и обновленным счетчиком
            const newResourcesClaimed = sessionResourcesClaimed + bonusResourcesAddedCount;
            // Удалено избыточное логирование
            
            // Сохраняем количество бонусных ресурсов для отображения пользователю
            setBonusResourcesAdded(bonusResourcesAddedCount);
            
            // Установка статуса сессии как завершенной с обновленными ресурсами
            setGatheringState('completed');
            setResources(newResources);
            setTotalGathered(newTotalGathered);
            setResourcesClaimed(newResourcesClaimed);
            
            // Обновляем данные в БД
            setTimeout(() => {
              saveGatheringData('completed', data.session.end_time, newResources, newTotalGathered, 
                                data.session.last_claim_time, data.session.next_resource_time, newResourcesClaimed);
            }, 100);
          } else {
            // Если все ресурсы уже получены, просто устанавливаем статус completed
            // Удалено избыточное логирование
            setGatheringState('completed');
            setResources(data.session.resources || {});
            setTotalGathered(data.session.total_gathered || {});
            
            // Если сессия все еще в статусе active, обновим её в БД
            if (data.session.state === 'active') {
              // Удалено избыточное логирование
              setTimeout(() => {
                saveGatheringData('completed', data.session.end_time, data.session.resources || {}, 
                                  data.session.total_gathered || {}, data.session.last_claim_time, 
                                  data.session.next_resource_time, data.session.resources_claimed || 0);
              }, 100);
            }
          }
        } else if (data.session.state === 'active') {
          setGatheringState('active');
          // Используем время окончания минус текущее время для вычисления оставшегося времени
          const remainingTime = data.session.end_time - currentTime;
          setCountdown(remainingTime);
          const sessionResources = data.session.resources || {};
          const sessionTotalGathered = data.session.total_gathered || {};
          
          // Новая логика начисления ресурсов на основе разницы между start_time и last_login
          // Вычисляем, сколько ресурсов нужно начислить (каждые 29 минут)
          const lastLoginTime = data.session.last_login || currentTime;
          const timeDifference = lastLoginTime - sessionStartTime;
          // Максимальное количество раз для начисления ресурсов (с момента start_time до last_login)
          const maxResourceAdditions = Math.floor(timeDifference / (29 * 60));
          // Если данные о последнем начислении не указаны, используем start_time
          const lastClaimTimeValue = data.session.last_claim_time || sessionStartTime;
          // Сколько ресурсов уже начислено с начала сессии (по данным last_claim_time)
          const alreadyAddedResources = Math.floor((lastClaimTimeValue - sessionStartTime) / (29 * 60));
          // Сколько ресурсов нужно добавить сейчас
          const resourcesNeedToAdd = Math.max(0, maxResourceAdditions - alreadyAddedResources);
          
          // Удалено избыточное логирование
          
          if (resourcesNeedToAdd > 0) {
            const newResources = { ...sessionResources };
            const newTotalGathered = { ...sessionTotalGathered };
            let resourcesAddedCount = 0; // Счетчик фактически добавленных ресурсов
            
            // Начисляем ресурсы за каждые 29 минут
            for (let i = 0; i < resourcesNeedToAdd; i++) {
              const random = Math.floor(Math.random() * 100) + 1;
              let accumulatedChance = 0;
              let selectedResource = null;
              for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
                accumulatedChance += chance;
                if (random <= accumulatedChance) {
                  selectedResource = resource;
                  break;
                }
              }
              if (selectedResource) {
                newResources[selectedResource] = (newResources[selectedResource] || 0) + 1;
                newTotalGathered[selectedResource] = (newTotalGathered[selectedResource] || 0) + 1;
                resourcesAddedCount++; // Увеличиваем счетчик только если ресурс был добавлен
              }
            }
            
            setResources(newResources);
            setTotalGathered(newTotalGathered);
            
            // Обновляем resources_claimed на количество фактически добавленных ресурсов
            // Используем функциональное обновление, чтобы получить актуальное значение
            setResourcesClaimed(prevResourcesClaimed => {
              // Преобразуем значения в числа
              const currentResourcesClaimed = parseInt(prevResourcesClaimed, 10) || 0;
              const sessionResourcesClaimed = parseInt(data.session.resources_claimed, 10) || 0;
              
              // Используем максимальное из значений для базового значения
              const baseResourcesClaimed = Math.max(currentResourcesClaimed, sessionResourcesClaimed);
              const newResourcesClaimed = baseResourcesClaimed + resourcesAddedCount;
              
              // Удалено избыточное логирование
            
            // Устанавливаем новое время последнего начисления
            // Это равно start_time + количество всех начислений (старых + новых) * 59 минут
            const newLastClaimTime = sessionStartTime + (alreadyAddedResources + resourcesNeedToAdd) * (59 * 60);
            setLastClaimTime(newLastClaimTime);
            
            // Вычисляем время следующего начисления (через 59 минут после последнего)
            const newNextResourceTime = newLastClaimTime + (29 * 60);
            setNextResourceTime(newNextResourceTime);
            
            // Сохраняем обновленные данные в БД
            setTimeout(() => {
                saveGatheringData('active', data.session.end_time, newResources, newTotalGathered, newLastClaimTime, newNextResourceTime, newResourcesClaimed);
            }, 100);
              
              return newResourcesClaimed;
            });
          } else {
            // Если новых ресурсов нет, просто устанавливаем данные из сессии
            setResources(sessionResources);
            setTotalGathered(sessionTotalGathered);
            setLastClaimTime(lastClaimTimeValue);
            
            // Вычисляем следующее время начисления как lastClaimTime + 59 минут
            const newNextResourceTime = lastClaimTimeValue + (29 * 60);
            setNextResourceTime(newNextResourceTime);
            
            setTimeout(() => {
              saveGatheringData('active', data.session.end_time, sessionResources, sessionTotalGathered, lastClaimTimeValue, newNextResourceTime, data.session.resources_claimed || 0);
            }, 100);
          }
        } else if (data.session.state === 'completed' || 
                  (data.session.resources && Object.keys(data.session.resources).length > 0)) {
          setGatheringState('completed');
          setResources(data.session.resources || {});
          setTotalGathered(data.session.total_gathered || {});
        } else {
          setGatheringState('idle');
          setResources({});
          setTotalGathered({});
          setResourcesClaimed(0);
        }
      } else {
        setGatheringState('idle');
        setResources({});
        setTotalGathered({});
        setResourcesClaimed(0);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке данных сбора ресурсов:', error);
      setGatheringState('idle');
      setIsLoading(false);
    }
  };
  
  // Эффект для таймера обратного отсчета
  useEffect(() => {
    let timer;
    if (gatheringState === "active" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setGatheringState("completed");
            saveGatheringData('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gatheringState, countdown]);
  
  // Проверяем, не пора ли добавить новый ресурс каждую секунду (для тестирования)
  useEffect(() => {
    const checkResourceTimer = setInterval(() => {
      if (gatheringState === 'active') {
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= nextResourceTime) addRandomResource();
      }
    }, 30000); // Проверка каждые 30 секунд для более точного срабатывания
    return () => clearInterval(checkResourceTimer);
  }, [gatheringState, nextResourceTime]);
  
  // Добавление случайного ресурса
  const addRandomResource = () => {
    // Проверяем, не превышен ли лимит ресурсов (максимум 16)
    if (resourcesClaimed >= 16) {
      // Удалено избыточное логирование
      return;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    // Удалено избыточное логирование
    // Удалено избыточное логирование
    // Удалено избыточное логирование
    
    const random = Math.floor(Math.random() * 100) + 1;
    let accumulatedChance = 0;
    let selectedResource = null;
    
    for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
      accumulatedChance += chance;
      if (random <= accumulatedChance) {
        selectedResource = resource;
        break;
      }
    }
    
    if (selectedResource) {
      const newResources = { ...resources };
      const newTotalGathered = { ...totalGathered };
      
      // Обновляем ресурсы
      newResources[selectedResource] = (newResources[selectedResource] || 0) + 1;
      newTotalGathered[selectedResource] = (newTotalGathered[selectedResource] || 0) + 1;
      
      // Вычисляем время для следующего ресурса (через 29 минут)
      const nextTime = currentTime + (29 * 60);
      
    
      
      setResources(newResources);
      setTotalGathered(newTotalGathered);
      setLastClaimTime(currentTime);
      setNextResourceTime(nextTime);
      
      // Обновляем счетчик полученных ресурсов
      setResourcesClaimed(prevValue => {
        const newValue = (parseInt(prevValue, 10) || 0) + 1;
        // Удалено избыточное логирование
        
        // Сохраняем обновленные данные в БД
        setTimeout(() => {
          saveGatheringData('active', null, newResources, newTotalGathered, currentTime, nextTime, newValue);
        }, 100);
        
        return newValue;
      });
    }
  };
  
  // Сохранение данных в БД с возможностью передачи текущих значений
  const saveGatheringData = async (state = gatheringState, existingEndTime = null, 
    currentResources = resources, currentTotalGathered = totalGathered, 
    currentLastClaimTime = lastClaimTime, currentNextResourceTime = nextResourceTime,
    currentResourcesClaimed = resourcesClaimed) => {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Гарантируем, что resources_claimed - это число
      const safeResourcesClaimed = parseInt(currentResourcesClaimed, 10) || 0;
      
      // Для определения end_time
      let endTime;
      if (state === 'active') {
        if (existingEndTime) {
          // Если есть существующее значение end_time, используем его
          endTime = existingEndTime;
          // Удалено избыточное логирование
        } else {
          // Если сессия активна и нет существующего end_time, вычисляем end_time как start_time + 8 часов
          const startTime = sessionCreatedAt || currentTime;
          endTime = startTime + (8 * 60 * 60); // 8 часов в секундах
          // Удалено избыточное логирование
        }
        
        // Проверка, не истекло ли время сессии уже сейчас
        if (currentTime >= endTime) {
          // Удалено избыточное логирование
          state = 'completed';
        }
      } else {
        // Если сессия завершена, используем текущее время или существующее
        endTime = existingEndTime || currentTime;
      }
      
      const gatheringData = {
        telegramId,
        state,
        resources: currentResources,
        totalGathered: currentTotalGathered,
        lastClaimTime: currentLastClaimTime,
        nextResourceTime: currentNextResourceTime,
        resourcesClaimed: safeResourcesClaimed,
        createdAt: currentTime, // timestamp создания записи
        endTime: endTime,
        startTime: sessionCreatedAt || currentTime // Время начала сбора (Unix timestamp)
      };
      
      // Удалено избыточное логирование
      
      const gatheringType = 'gather';
      
      const response = await fetch(addTimestamp(`rpg.php?action=saveGatheringSession`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({
          ...gatheringData,
          type: gatheringType
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('Ошибка при сохранении данных сбора ресурсов:', data.message);
      } else {
        // Удалено избыточное логирование
        
        // Если сохранили со статусом как 'completed', обновляем UI
        if (state === 'completed' && gatheringState !== 'completed') {
          setGatheringState('completed');
          // Удалено избыточное логирование
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении данных сбора ресурсов:', error);
    }
  };
  
  // Начало сбора ресурсов
  const startGathering = () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const duration = 8 * 60 * 60; // 8 часов в секундах
    
    // Сбрасываем информацию о бонусных ресурсах
    setBonusResourcesAdded(0);
    
    // Устанавливаем start_time в текущее время (Unix timestamp)
    const startTime = currentTime;
    
    // Рассчитываем время окончания сессии от start_time
    const endTime = startTime + duration;
    
    // Устанавливаем время для первого ресурса (через 29 минут после начала)
    const nextTime = startTime + (29 * 60);
    
    // Подготавливаем пустые объекты для ресурсов
    const emptyResources = {};
    const emptyTotalGathered = {};
    

    
    // Сохраняем время начала сессии
    setSessionCreatedAt(startTime);
    
    // Обновляем состояние
    setGatheringState("active");
    setCountdown(duration);
    setResources(emptyResources);
    setTotalGathered(emptyTotalGathered);
    setLastClaimTime(startTime);
    setNextResourceTime(nextTime);
    
    // Явно сбрасываем счетчик добытых ресурсов
    const initialResourcesClaimed = 0;
    setResourcesClaimed(initialResourcesClaimed);
    
    // Сохраняем начальные данные сбора в БД с явно указанными параметрами
    setTimeout(() => {
      saveGatheringData('active', endTime, emptyResources, emptyTotalGathered, startTime, nextTime, initialResourcesClaimed);
    }, 100);
  };
  
  // Флаг для предотвращения множественных нажатий на кнопки
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  // Отмена сбора ресурсов
  const cancelGathering = async () => {
    // Защита от многократных кликов
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeSpentInGathering = currentTime - sessionCreatedAt;
      
      // Сбрасываем информацию о бонусных ресурсах
      setBonusResourcesAdded(0);
      
      // Логирование отмены сбора
      await logGatheringSession('Canceled', timeSpentInGathering);
      
      if (Object.keys(resources).length > 0) {
        // Есть ресурсы для сохранения, отправляем их на сервер
        await saveResourcesInDatabase();
        
        // Добавляем вызов функции синхронизации ресурсов после сохранения в БД
        if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
         
          await window.ModalModule.syncResourcesWithIndexedDB();
        } else if (window.syncResourcesWithIndexedDB) {
          // Удалено избыточное логирование
          await window.syncResourcesWithIndexedDB();
        }
        
        // Отправляем события обновления инвентаря
        window.dispatchEvent(new CustomEvent('resourcesUpdated', { 
          detail: { timestamp: Date.now() } 
        }));
        window.dispatchEvent(new CustomEvent('inventory-update', { 
          detail: { timestamp: Date.now() } 
        }));
        
        // Обновляем отображение инвентаря, если доступна функция
        if (window.InventoryModule && typeof window.InventoryModule.refreshInventoryDisplay === 'function') {
          // Удалено избыточное логирование
          await window.InventoryModule.refreshInventoryDisplay();
        }
      }
      
      // Сбрасываем состояние
      setGatheringState("idle");
      setCountdown(0);
      setResources({});
      setTotalGathered({});
      setSessionCreatedAt(0);
      
      // Удаляем сессию из БД
      try {
        const response = await fetch(addTimestamp(`rpg.php?action=deleteGatheringSession`), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          body: JSON.stringify({ 
            telegramId,
            timestamp: Date.now() // Добавляем метку времени для предотвращения кэширования
          })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          console.error('Ошибка при удалении сессии сбора ресурсов:', data.message);
        }
      } catch (error) {
        console.error('Ошибка при удалении сессии сбора ресурсов:', error);
      }
    } finally {
      // Разблокируем кнопку через небольшую задержку для лучшего UX
      setTimeout(() => {
        setIsProcessingAction(false);
      }, 1500);
    }
  };
  
  // Забрать ресурсы
  const claimResources = async () => {
    // Защита от многократных кликов
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeSpentInGathering = currentTime - sessionCreatedAt;
      
      // Сбрасываем информацию о бонусных ресурсах
      setBonusResourcesAdded(0);
      
      // Логирование завершения сбора
      await logGatheringSession('Claimed', timeSpentInGathering);
      
      await saveResourcesInDatabase();
      
      // Добавляем вызов функции синхронизации ресурсов после сохранения в БД
      if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
        // Удалено избыточное логирование
        await window.ModalModule.syncResourcesWithIndexedDB();
      } else if (window.syncResourcesWithIndexedDB) {
        // Удалено избыточное логирование
        await window.syncResourcesWithIndexedDB();
      }
      
      // Отправляем события обновления инвентаря
      window.dispatchEvent(new CustomEvent('resourcesUpdated', { 
        detail: { timestamp: Date.now() } 
      }));
      window.dispatchEvent(new CustomEvent('inventory-update', { 
        detail: { timestamp: Date.now() } 
      }));
      
      // Обновляем отображение инвентаря, если доступна функция
      if (window.InventoryModule && typeof window.InventoryModule.refreshInventoryDisplay === 'function') {
        // Удалено избыточное логирование
        await window.InventoryModule.refreshInventoryDisplay();
      }
      
      // Сбрасываем состояние
      setGatheringState("idle");
      setCountdown(0);
      setResources({});
      setTotalGathered({});
      setSessionCreatedAt(0);
      
      // Удаляем сессию из БД
      try {
        const response = await fetch(addTimestamp(`rpg.php?action=deleteGatheringSession`), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          body: JSON.stringify({ 
            telegramId,
            timestamp: Date.now() // Добавляем метку времени для предотвращения кэширования
          })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          console.error('Ошибка при удалении сессии сбора ресурсов:', data.message);
        }
      } catch (error) {
        console.error('Ошибка при удалении сессии сбора ресурсов:', error);
      }
    } finally {
      // Разблокируем кнопку через небольшую задержку для лучшего UX
      setTimeout(() => {
        setIsProcessingAction(false);
      }, 1500);
    }
  };
  
  // Логирование сессии сбора ресурсов
  const logGatheringSession = async (endMethod, timeSpent) => {
    try {
      // Конвертируем секунды в часы, минуты, секунды
      const hours = Math.floor(timeSpent / 3600);
      const minutes = Math.floor((timeSpent % 3600) / 60);
      const seconds = Math.floor(timeSpent % 60);
      const formattedTimeSpent = `${hours}h ${minutes}m ${seconds}s`;
      
      // Формируем данные для лога
      const logData = {
        telegramId,
        startTime: new Date(sessionCreatedAt * 1000).toISOString(),
        endTime: new Date(Math.floor(Date.now() / 1000) * 1000).toISOString(),
        resources: JSON.stringify(resources),
        endMethod: `${endMethod} (${formattedTimeSpent})`
      };
      
      // Удалено избыточное логирование
      
      // Отправляем запрос на сервер для записи в лог
      const response = await fetch(addTimestamp(`rpg.php?action=logGatheringSession`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(logData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Удалено избыточное логирование
      } else {
        console.error('Ошибка при записи информации о сессии сбора в лог:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при логировании сессии сбора ресурсов:', error);
    }
  };
  
  // Сохранение ресурсов в базе данных
  const saveResourcesInDatabase = async () => {
    try {
      if (!telegramId) {
        console.error('TelegramID не найден!');
        return;
      }
      
      // Удалено избыточное логирование
      // Удалено избыточное логирование
      
      // Отправляем запрос на сервер для обновления ресурсов
      const response = await fetch(addTimestamp(`rpg.php?action=updateResources`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ 
          telegramId,
          resources,
          resourcesClaimed  // Добавляем resources_claimed для сохранения в БД
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Удалено избыточное логирование
      } else {
        console.error('Ошибка при сохранении ресурсов:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при отправке запроса на сохранение ресурсов:', error);
    }
  };
  
  // Форматирование времени
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (isLoading) {
    return (
      <div className="rpg-main-screen">
        <BackButton onClick={onBack} position="left" />
        
        <div className="rpg-content-area">
          <div className="rpg-loading futuristic">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading gathering data...</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Стили для пульсирующей анимации
  const pulseKeyframes = `
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
  `;
  
  return (
    <div className="rpg-main-screen" style={{position: 'relative', minHeight: '100vh', overflow: 'hidden'}}>
      {/* Фон на всю страницу */}
      <div className="page-background" style={{
        backgroundImage: `url('images/rpg/backgrounds/gatherbg.png')`
      }}></div>
      <BackButton onClick={onBack} position="left" />
      <div className="bottom-aligned-content">
        <div className="gathering-page futuristic-gathering">
          <div className="gathering-controls">
            {gatheringState === "idle" && (
              <div className="action-button-container">
                <button 
                  className="gathering-button futuristic"
                  onClick={startGathering}
                >
                  Auto
                </button>
                <button 
                  className="gathering-button futuristic interactive"
                  onClick={async () => {
                    // Запрашиваем актуальную стамину с сервера перед запуском
                    if (window.StaminaModule) {
                      console.log('[Interactive Button] Обновляем стамину с сервера');
                      try {
                        await window.StaminaModule.update();
                        console.log('[Interactive Button] Стамина обновлена');
                      } catch (error) {
                        console.error('[Interactive Button] Ошибка обновления стамины:', error);
                      }
                    }
                    
                    // Скрываем контейнер gathering-page
                    const gatheringPage = document.querySelector('.gathering-page.futuristic-gathering');
                    if (gatheringPage) {
                      gatheringPage.style.display = 'none';
                    }
                    
                    const container = document.createElement('div');
                    container.id = 'manual-gather-container';
                    container.style.position = 'fixed';
                    container.style.top = '0';
                    container.style.left = '0';
                    container.style.width = '100%';
                    container.style.height = '100%';
                    container.style.zIndex = '9999';
                    document.body.appendChild(container); // Добавляем в body вместо gathering-page
                    if (window.ManualGatherModule) {
                      window.ManualGatherModule.init(container, 'gather');
                    }
                  }}
                >
                  Interactive
                </button>
              </div>
            )}
            
            {gatheringState === "active" && (
              <React.Fragment>
                <div className="gathering-progress">
                  <div className="progress-bar-container futuristic">
                    <div className="timer">Remaining: {formatTime(countdown)}</div>
                    <div 
                      className="progress-bar futuristic" 
                      style={{ width: `${(countdown / (8 * 60 * 60)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <button 
                  className={`gathering-button futuristic cancel ${isProcessingAction ? 'disabled' : ''}`}
                  onClick={cancelGathering}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Processing...' : 'Cancel'}
                </button>
              </React.Fragment>
            )}
            
            {gatheringState === "completed" && (
              <div>
                <button 
                  className={`gathering-button futuristic claim ${isProcessingAction ? 'disabled' : ''}`}
                  onClick={claimResources}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Processing...' : 'Claim'}
                </button>
              </div>
            )}
          </div>
          
          {(gatheringState === "active" || gatheringState === "completed") && (
            <div className="gathered-resources">
              <h3>Gathered total:</h3>
              <div className="resources-list">
                {Object.keys(resources).length > 0 ? (
                  Object.entries(resources).map(([resource, amount]) => (
                    <div key={resource} className="resource-item">
                      <div className="resource-name">{resource}</div>
                      <div className="resource-icon futuristic">
                        <img 
                          src={`images/rpg/${resource.toLowerCase().replace(/\s+/g, '')}.png`} 
                          onError={(e) => {
                            console.log(`Error loading image for ${resource}, trying alternative filename`);
                            // Try with spaces removed completely
                            e.target.src = `images/rpg/${resource.toLowerCase().replace(/\s+/g, '')}.png`;
                            e.target.onerror = (e2) => {
                              console.log(`Still couldn't load image for ${resource}, using fallback`);
                              e2.target.onerror = null;
                              e2.target.src = "images/rpg/unknown.png";
                            };
                          }}
                          alt={resource} 
                        />
                        <span className="resource-amount">x{amount}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No resources gathered yet. Check back soon!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Game Layout Component
const GameLayout = ({ userData }) => {
  const [activePage, setActivePage] = useState(null);
  const [showCraftPanel, setShowCraftPanel] = useState(false);
  const [activeCraftPage, setActiveCraftPage] = useState(null);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [requiredItemName, setRequiredItemName] = useState('');
  const [showGatheringPanel, setShowGatheringPanel] = useState(false);
  const [showTrainingPanel, setShowTrainingPanel] = useState(false);
  
  // Добавляем состояния для модального окна блокировки добычи
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSessionType, setActiveSessionType] = useState(null);
  const [pendingPage, setPendingPage] = useState(null);
  
  // Добавляем состояния для модального окна проверки оружия
  const [showWeaponModal, setShowWeaponModal] = useState(false);
  const [requiredWeapon, setRequiredWeapon] = useState('');
  const [pendingGatheringType, setPendingGatheringType] = useState(null);
  
  // Добавляем состояния для модального окна уведомлений о тренировках
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [trainingModalMessage, setTrainingModalMessage] = useState('');
  
  // Приоритетная загрузка критически важных данных при входе на страницу
  useEffect(() => {
    const initCriticalData = async () => {
      console.log('[GameLayout] Начало загрузки критически важных данных');
    
      // 1. ПРИОРИТЕТ 1: Инициализация стамины и опыта
      try {
    if (window.StaminaModule) {
          console.log('[GameLayout] Инициализация стамины...');
          await window.StaminaModule.init();
        console.log('[GameLayout] Стамина инициализирована');
        }
        
        if (window.ExperienceModule) {
          console.log('[GameLayout] Инициализация опыта...');
          await window.ExperienceModule.init();
          console.log('[GameLayout] Опыт инициализирован');
        }
      } catch (error) {
        console.error('[GameLayout] Ошибка инициализации стамины/опыта:', error);
      }
      
      // 2. ПРИОРИТЕТ 2: Загружаем экипировку
      if (window.loadEquippedItems) {
        console.log('[GameLayout] Загрузка экипировки...');
        window.loadEquippedItems();
    }
      
      console.log('[GameLayout] Завершена загрузка критически важных данных');
    };
    
    initCriticalData();
  }, []);

  // Быстрая отрисовка стамины и опыта на главной странице
  useEffect(() => {
    let staminaTimer = null;
    // experienceTimer больше не нужен - опыт загружается только при переходе на страницу
    
    if (activePage === null || activePage === 'main') {
      console.log('[GameLayout] Начинаем отрисовку стамины и опыта на главной странице');
      
      // Функция для быстрой инициализации UI
      const initMainPageUI = async () => {
        try {
          // ПРИОРИТЕТ 1: Стамина
          const staminaContainer = document.getElementById('main-stamina-container');
          if (staminaContainer && window.StaminaModule) {
            console.log('[GameLayout] Быстрая отрисовка стамины...');
          
            // Получаем актуальные данные с сервера
          await window.StaminaModule.update();
          
            // Отрисовываем бар
          window.StaminaModule.renderBar('main-stamina-container');
          
            // Запускаем автообновление каждые 30 секунд
            staminaTimer = window.StaminaModule.startTimer('main-stamina-container', 30000);
            console.log('[GameLayout] Стамина отрисована и автообновление запущено (30 сек)');
          }
          
          // ПРИОРИТЕТ 2: Опыт
          const experienceContainer = document.getElementById('main-experience-container');
          if (experienceContainer && window.ExperienceModule) {
            console.log('[GameLayout] Быстрая отрисовка опыта...');
            
            // Получаем актуальные данные с сервера один раз при загрузке
            await window.ExperienceModule.update();
            
            // Отрисовываем бар
            window.ExperienceModule.renderBar('main-experience-container');
            
            console.log('[GameLayout] Опыт отрисован (только при загрузке)');
          }
          
          console.log('[GameLayout] Быстрая отрисовка главной страницы завершена');
        } catch (error) {
          console.error('[GameLayout] Ошибка быстрой отрисовки:', error);
        }
      };
      
      // Небольшая задержка для завершения рендеринга DOM
      const renderTimer = setTimeout(initMainPageUI, 50);
      
      return () => {
        clearTimeout(renderTimer);
        if (staminaTimer) {
          clearInterval(staminaTimer);
          console.log('[GameLayout] Очищен таймер стамины');
        }
        // experienceTimer больше не используется - опыт загружается только при переходе на страницу
      };
    }
    
    return () => {
      if (staminaTimer) clearInterval(staminaTimer);
      // experienceTimer больше не используется
    };
  }, [activePage]);
  
  // Функция проверки и перехода на добычу
  const checkAndGoToGathering = async (targetType) => {
    const telegramId = localStorage.getItem('telegramId');
    // Удалено избыточное логирование
    
    const response = await fetch(addTimestamp(`rpg.php?action=getGatheringSession`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId })
    });
    
    const data = await response.json();
    console.log('Получены данные сессии:', data);
    
    // Добавляем проверку на наличие сессии (как активной, так и завершенной)
    if (data.success && data.session) {
      // Если тип не указан (пустой) - считаем его 'gather' по умолчанию
      // Это нужно для поддержки существующих сессий, созданных до добавления поля type
      let sessionTypeRaw = data.session.type;
      if (!sessionTypeRaw || sessionTypeRaw === '') {
        console.log('Тип сессии не указан, устанавливаем значение по умолчанию: "gather"');
        sessionTypeRaw = 'gather';
      } else {
        console.log(`Получен тип сессии из БД: "${sessionTypeRaw}"`);
      }
      
      // Нормализуем строки для сравнения (приводим к нижнему регистру и убираем пробелы)
      const sessionType = sessionTypeRaw.toLowerCase().trim();
      const targetTypeNormalized = (targetType || '').toLowerCase().trim();
      
      console.log(`Сессия найдена. Тип сессии: '${sessionType}', состояние: '${data.session.state}', запрошенный тип: '${targetTypeNormalized}'`);
      
      // Если у пользователя есть сессия добычи (активная или завершенная, но не собранная)
      if (sessionType !== targetTypeNormalized) {
        // Если тип сессии отличается от выбранной - показываем модалку
        console.log('Показываем модальное окно, т.к. типы не совпадают');
        setActiveSessionType(sessionTypeRaw); // Используем оригинальное или установленное по умолчанию значение
        setPendingPage(targetType);
        setModalOpen(true);
        return false;
      } else {
        // Если тип сессии совпадает с выбранной - разрешаем переход
        console.log(`Переход разрешен: пользователь пытается войти на страницу своей сессии добычи (${targetType})`);
        return true;
      }
    }
    
    // Если нет сессии - разрешаем переход
    console.log('Сессии не найдено, переход разрешен');
    return true;
  };
  
  // Обработчики перехода на страницы добычи с проверкой
  const handleGatheringWithCheck = async (e) => {
    e.preventDefault();
    // Использую точные строковые значения 'gather', как в app.js (saveGatheringData)
    // Gather не требует проверки оружия
    const ok = await checkAndGoToGathering('gather');
    if (ok) setActivePage('gathering');
    setShowGatheringPanel(false);
  };
  
  const handleChopClick = async (e) => {
    e.preventDefault();
    
    console.log('[handleChopClick] Начало обработки клика по кнопке рубки дерева');
    
    // Сначала проверяем наличие активной сессии
    // Использую точные строковые значения 'chop', как в chop.js (saveChopData)
    const ok = await checkAndGoToGathering('chop');
    if (!ok) {
      console.log('[handleChopClick] Обнаружена активная сессия, отмена перехода');
      setShowGatheringPanel(false);
      return;
    }
    
    // Если активной сессии нет, проверяем оружие
    const { hasWeapon, weaponName } = await checkRequiredWeapon('chop');
    console.log(`[handleChopClick] Результат проверки оружия: hasWeapon=${hasWeapon}, weaponName=${weaponName}`);
    
    if (!hasWeapon) {
      console.log('[handleChopClick] Нет необходимого оружия, показываем модальное окно');
      showRequiredWeaponModal('chop', weaponName);
      setShowGatheringPanel(false);
      return;
    }
    
    // Если оружие есть и нет активной сессии, разрешаем переход
    console.log('[handleChopClick] Все проверки пройдены, переходим на страницу рубки дерева');
    setActivePage('chopwood');
    setShowGatheringPanel(false);
  };
  
  const handleMineClick = async (e) => {
    e.preventDefault();
    
    console.log('[handleMineClick] Начало обработки клика по кнопке добычи руды');
    
    // Сначала проверяем наличие активной сессии
    // Использую точные строковые значения 'mine', как в mine.js (saveMineData)
    const ok = await checkAndGoToGathering('mine');
    if (!ok) {
      console.log('[handleMineClick] Обнаружена активная сессия, отмена перехода');
      setShowGatheringPanel(false);
      return;
    }
    
    // Если активной сессии нет, проверяем оружие
    const { hasWeapon, weaponName } = await checkRequiredWeapon('mine');
    console.log(`[handleMineClick] Результат проверки оружия: hasWeapon=${hasWeapon}, weaponName=${weaponName}`);
    
    if (!hasWeapon) {
      console.log('[handleMineClick] Нет необходимого оружия, показываем модальное окно');
      showRequiredWeaponModal('mine', weaponName);
      setShowGatheringPanel(false);
      return;
    }
    
    // Если оружие есть и нет активной сессии, разрешаем переход
    console.log('[handleMineClick] Все проверки пройдены, переходим на страницу добычи руды');
    setActivePage('mining');
    setShowGatheringPanel(false);
  };
  
  const handleHuntClick = async (e) => {
    e.preventDefault();
    
    console.log('[handleHuntClick] Начало обработки клика по кнопке охоты');
    
    // Сначала проверяем наличие активной сессии
    // Использую точные строковые значения 'hunt', как в hunt.js (saveHuntData)
    const ok = await checkAndGoToGathering('hunt');
    if (!ok) {
      console.log('[handleHuntClick] Обнаружена активная сессия, отмена перехода');
      setShowGatheringPanel(false);
      return;
    }
    
    // Если активной сессии нет, проверяем оружие
    const { hasWeapon, weaponName, requiresKnife } = await checkRequiredWeapon('hunt');
    console.log(`[handleHuntClick] Результат проверки оружия: hasWeapon=${hasWeapon}, weaponName=${weaponName}, requiresKnife=${requiresKnife}`);
    
    if (!hasWeapon) {
      console.log('[handleHuntClick] Нет необходимого оружия, показываем модальное окно');
      showRequiredWeaponModal('hunt', weaponName);
      setShowGatheringPanel(false);
      return;
    }
    
    // Проверяем наличие ножа в инвентаре
    // Мы проверяем нож прямо здесь, потому что проверка через глобальную функцию может быть ненадежной
    let hasKnife = false;
    
    try {
      // Проверяем в IndexedDB
      if (window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
        console.log('[handleHuntClick] Проверка наличия ножа в инвентаре...');
        const inventory = await window.IndexedDBModule.getInventoryItems();
        
        // Возможные идентификаторы ножа
        const knifeIds = ['knife', 'Knife', 'huntingknife', 'HuntingKnife', 'hunting_knife'];
        
        // Проверяем по всем возможным идентификаторам ножа
        for (const knifeId of knifeIds) {
          const knife = inventory.find(item => 
            item.id && item.id.toLowerCase().includes(knifeId.toLowerCase()) && 
            (item.quantity > 0 || item.qty > 0)
          );
          
          if (knife) {
            console.log(`[handleHuntClick] Найден нож в инвентаре: ${knife.id}`);
            hasKnife = true;
            break;
          }
        }
        
        // Если нож не найден в инвентаре, проверяем в экипировке
        if (!hasKnife && window.equippedItems) {
          const equippedItemValues = Object.values(window.equippedItems);
          for (const itemId of equippedItemValues) {
            if (itemId && typeof itemId === 'string' && 
                knifeIds.some(knife => itemId.toLowerCase().includes(knife.toLowerCase()))) {
              console.log('[handleHuntClick] Найден экипированный нож:', itemId);
              hasKnife = true;
              break;
            }
          }
        }
        
        if (!hasKnife) {
          console.log('[handleHuntClick] Нож не найден, показываем модальное окно с требованием');
          showRequiredWeaponModal('hunt', 'Knife');
          setShowGatheringPanel(false);
          return;
        }
      }
    } catch (error) {
      console.error('[handleHuntClick] Ошибка при проверке наличия ножа:', error);
      // В случае ошибки, пропускаем проверку ножа и полагаемся на проверку на странице охоты
    }
    
    // Если оружие есть, нож есть, и нет активной сессии, разрешаем переход
    console.log('[handleHuntClick] Все проверки пройдены, переходим на страницу охоты');
    setActivePage('hunting');
    setShowGatheringPanel(false);
  };
  
  // Функция перехода на активную сессию из модалки
  const goToActiveSession = () => {
    setModalOpen(false);
    
    // Нормализуем тип сессии для надежного сравнения
    const sessionType = (activeSessionType || '').toLowerCase().trim();
    
    console.log(`Переход на активную сессию типа: ${sessionType}`);
    
    switch (sessionType) {
      case 'gather': 
        console.log('Переход на страницу gathering');
        setActivePage('gathering'); 
        break;
      case 'chop': 
        console.log('Переход на страницу chopwood');
        setActivePage('chopwood'); 
        break;
      case 'mine': 
        console.log('Переход на страницу mining');
        setActivePage('mining'); 
        break;
      case 'hunt': 
        console.log('Переход на страницу hunting');
        setActivePage('hunting'); 
        break;
      default: 
        console.log('Тип не распознан, переход на страницу gathering по умолчанию');
        setActivePage('gathering');
    }
  };
  
  // Функция проверки экипированного оружия
  const checkRequiredWeapon = async (gatheringType) => {
    // Используем глобальную функцию проверки оружия
    if (window.checkRequiredWeapon) {
      return await window.checkRequiredWeapon(gatheringType);
    }
    
    // Резервная реализация, если глобальной функции нет (не должна выполняться)
    // Если нет window.equippedItems, пробуем загрузить экипировку
    if (!window.equippedItems) {
      console.warn('window.equippedItems не найден, пробуем загрузить экипировку');
      if (window.loadEquippedItems) {
        try {
          await window.loadEquippedItems();
        } catch (error) {
          console.error('Ошибка при загрузке экипировки:', error);
        }
      }
      
      // Если после загрузки всё равно нет window.equippedItems
      if (!window.equippedItems) {
        console.error('Не удалось загрузить экипировку');
        return { hasWeapon: false, weaponName: '' };
      }
    }
    
    // Проверяем наличие оружия в слоте weapon1
    const equippedWeapon = window.equippedItems.weapon1;
    
    if (!equippedWeapon) {
      console.log('Отсутствует экипированное оружие');
      return { hasWeapon: false, weaponName: '' };
    }
    
    console.log(`Проверяем оружие для типа добычи: ${gatheringType}. Экипировано: ${equippedWeapon}`);
    
    let requiredWeapons = [];
    let weaponName = '';
    
    switch(gatheringType) {
      case 'chop':
        // Требуется топор: primaxe или axe
        requiredWeapons = ['primaxe', 'axe'];
        weaponName = 'Axe';
        break;
      case 'mine':
        // Требуется кирка: primpickaxe или pickaxe
        requiredWeapons = ['primpickaxe', 'pickaxe'];
        weaponName = 'Pickaxe';
        break;
      case 'hunt':
        // Требуется лук: primbow или bow
        requiredWeapons = ['primbow', 'bow'];
        weaponName = 'Bow';
        break;
      default:
        // Для обычного gather оружие не требуется
        return { hasWeapon: true, weaponName: '' };
    }
    
    // Проверяем точное соответствие экипированного оружия одному из требуемых идентификаторов
    const normalizedEquippedWeapon = equippedWeapon.toLowerCase().replace(/\s+/g, '');
    const hasRequiredWeapon = requiredWeapons.some(weapon => {
      const normalizedWeapon = weapon.toLowerCase().replace(/\s+/g, '');
      // Проверяем точное соответствие названия или начало строки с названием инструмента
      return normalizedEquippedWeapon === normalizedWeapon || 
             normalizedEquippedWeapon === `prim${normalizedWeapon}` ||
             normalizedEquippedWeapon === `${normalizedWeapon}s`;
    });
    
    console.log(`Результат проверки: ${hasRequiredWeapon ? 'Подходящее оружие экипировано' : 'Требуемое оружие не экипировано'}`);
    
    return { 
      hasWeapon: hasRequiredWeapon, 
      weaponName: weaponName
    };
  };

  // Функция для активации модального окна выбора оружия
  const showRequiredWeaponModal = (gatheringType, weaponName) => {
    console.log(`[showRequiredWeaponModal] Показываем модальное окно для типа: ${gatheringType}, оружие: ${weaponName}`);
    setPendingGatheringType(gatheringType);
    setRequiredWeapon(weaponName);
    setShowWeaponModal(true);
    console.log(`[showRequiredWeaponModal] Значение showWeaponModal после установки: ${showWeaponModal}`);
    // Добавляем небольшую задержку для обеспечения применения setState
    setTimeout(() => {
      console.log(`[showRequiredWeaponModal] Значение showWeaponModal после задержки: ${showWeaponModal}`);
    }, 100);
  };

  // Функция перехода к экипировке оружия
  const goToEquipWeapon = () => {
    setShowWeaponModal(false);
    // Переходим на страницу character для экипировки
    setActivePage('character');
  };

  // Добавляем useEffect для обработки кликов по документу
  useEffect(() => {
    // Обработчик клика по всему документу
    const handleDocumentClick = (event) => {
      // Проверяем, открыта ли панель крафта
      if (showCraftPanel) {
        const craftPanel = document.querySelector('.craft-panel');
        const craftButton = document.getElementById('craft-button');
        
        // Если панель существует и клик был не по панели и не по кнопке крафта
        if (craftPanel && 
            !craftPanel.contains(event.target) && 
            !craftButton.contains(event.target)) {
          setShowCraftPanel(false);
        }
      }
    };
    
    // Добавляем обработчик к документу
    document.addEventListener('mousedown', handleDocumentClick);
    
    // Удаляем обработчик при размонтировании компонента
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [showCraftPanel]);

  // 2. Обработчик для Gathering (показывает панель)
  const handleGatheringClick = (e) => {
    // Получаем позицию кнопки и передаем ее в CSS
    const buttonElement = e.currentTarget;
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      const topPosition = rect.top + window.scrollY + rect.height / 2;
      document.documentElement.style.setProperty('--gathering-panel-top', `${topPosition}px`);
    }
    setShowGatheringPanel(!showGatheringPanel);
  };

  // 3. Добавляем обработчик закрытия панели при клике вне её
  useEffect(() => {
    if (!showGatheringPanel) return;
    const handleDocumentClick = (event) => {
      const gatheringPanel = document.querySelector('.gathering-panel');
      const gatheringButton = document.getElementById('gathering-button');
      if (gatheringPanel && !gatheringPanel.contains(event.target) && !gatheringButton.contains(event.target)) {
        setShowGatheringPanel(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [showGatheringPanel]);

  // Обработчик для Training (показывает панель)
  const handleTrainingClick = (e) => {
    // Получаем позицию кнопки и передаем ее в CSS
    const buttonElement = e.currentTarget;
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      // Устанавливаем позицию панели точно на уровне кнопки
      // translateY(-50%) центрирует панель по её собственной высоте
      const topPosition = rect.top + window.scrollY + rect.height / 2;
      document.documentElement.style.setProperty('--training-panel-top', `${topPosition}px`);
    }
    setShowTrainingPanel(!showTrainingPanel);
  };

  // Добавляем обработчик закрытия панели Training при клике вне её
  useEffect(() => {
    if (!showTrainingPanel) return;
    const handleDocumentClick = (event) => {
      const trainingPanel = document.querySelector('.training-panel');
      const trainingButton = document.getElementById('training-button');
      if (trainingPanel && !trainingPanel.contains(event.target) && !trainingButton.contains(event.target)) {
        setShowTrainingPanel(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [showTrainingPanel]);

  // Обработчики для тренировок
  const handleNoviceTrainingClick = () => {
    // Проверяем уровень пользователя
    const userLevel = parseInt(userData && userData.level || 1);
    
    if (userLevel >= 6) {
      // Показываем модальное окно о недоступности
      setTrainingModalMessage(`Novice Training is only available up to level 5. You are level ${userLevel}. Try Experienced Training instead!`);
      setShowTrainingModal(true);
      setShowTrainingPanel(false);
      return;
    }
    
    setActivePage('novicetraining');
    setShowTrainingPanel(false);
  };

  const handleExperiencedTrainingClick = () => {
    // Проверяем уровень пользователя, приводим к числу
    const userLevel = parseInt(userData && userData.level || 1);
    
    console.log('User level for experienced training check:', userLevel, 'Type:', typeof userLevel);
    
    if (userLevel < 6) {
      // Показываем модальное окно о недоступности
      setTrainingModalMessage(`Experienced Training is only available starting from level 6. You are level ${userLevel}. Try Novice Training!`);
      setShowTrainingModal(true);
      setShowTrainingPanel(false);
      return;
    }
    
    setActivePage('experiencedtraining');
    setShowTrainingPanel(false);
  };

  // 4. Удаляю компонент Hunting (заглушка)
  // const Hunting = ({ onBack }) => (
  //   <div className="rpg-main-screen">
  //     <BackButton onClick={onBack} position="left" />
  //     <div className="rpg-content-area">
  //       <h2 className="text-xl mb-4">Hunting</h2>
  //       <div style={{textAlign:'center',marginTop:'2rem',color:'#aaa'}}>Coming soon...</div>
  //     </div>
  //   </div>
  // );

  const handleBackToMainRPG = () => {
    setActivePage(null);
  };

  const handleCraftClick = (e) => {
    console.log("Craft button clicked");
    
    // Получаем позицию кнопки и передаем ее в CSS
    const buttonElement = e.currentTarget;
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      const topPosition = rect.top + window.scrollY + rect.height / 2;
      
      // Устанавливаем CSS переменную с позицией
      document.documentElement.style.setProperty('--craft-panel-top', `${topPosition}px`);
    }
    
    // Переключаем состояние панели
    setShowCraftPanel(!showCraftPanel);
  };

  const handleCraftingClick = () => {
    setActivePage("crafting");
    setShowCraftPanel(false);
  };

  const handleCampfireClick = async () => {
    // Убираем проверку наличия предмета campfire, которая вызывает ошибку
    // Просто переходим на страницу campfire
    setActivePage("campfire");
    setShowCraftPanel(false);
  };

  const handleFurnaceClick = async () => {
    // Убираем проверку наличия предмета furnace, которая вызывает ошибку
    // Просто переходим на страницу furnace
    setActivePage("furnace");
    setShowCraftPanel(false);
  };

  const closeRequirementModal = () => {
    setShowRequirementModal(false);
  };
  
  const goToCraftingPage = () => {
    setActivePage("crafting");
    setShowCraftPanel(false);
    setShowRequirementModal(false);
  };

  const renderActivePage = () => {
    // Проверяем наличие модуля CraftingModule
    if (activePage !== "character" && activePage !== "gathering" && !window.CraftingModule) {
      console.error("CraftingModule не найден! Переключаемся на главный экран.");
      setActivePage("main");
      return (
        <div className="rpg-main-screen">
    <div className="rpg-content-area">
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
                <h2 className="text-2xl mb-6">Ошибка загрузки модуля</h2>
                <p>Не удалось загрузить модуль крафтинга. Пожалуйста, обновите страницу.</p>
        </div>
      </div>
    </div>
  </div>
);
    }
    
    switch (activePage) {
      case "character":
        return <Character userData={userData} onBack={handleBackToMainRPG} />;
      case "crafting":
        return window.CraftingModule && <window.CraftingModule.Crafting onBack={handleBackToMainRPG} />;
      case "campfire":
        return window.CraftingModule && <window.CraftingModule.CampfireComponent onBack={handleBackToMainRPG} />;
      case "furnace":
        return window.CraftingModule && <window.CraftingModule.FurnaceComponent onBack={handleBackToMainRPG} />;
      case "gathering":
        return <Gathering onBack={handleBackToMainRPG} />;
      case "chopwood":
        return window.CraftingModule && <window.CraftingModule.ChopWood onBack={handleBackToMainRPG} />;
      case "mining":
        return window.CraftingModule && <window.CraftingModule.Mining onBack={handleBackToMainRPG} />;
      case "hunting":
        return window.CraftingModule && <window.CraftingModule.Hunting onBack={handleBackToMainRPG} />;
      case "novicetraining":
        return window.CraftingModule && <window.CraftingModule.Training onBack={handleBackToMainRPG} trainingType="novice" />;
      case "experiencedtraining":
        return window.CraftingModule && <window.CraftingModule.Training onBack={handleBackToMainRPG} trainingType="experienced" />;
      default:
        return (
          <div className="rpg-main-screen" style={{
            backgroundImage: 'url(images/rpg/backgrounds/rpgbg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}>
            <CloseButton onClick={() => window.location.href = '../webapp.html'} />
            
            {/* Контейнер стамины и опыта в верхней части экрана */}
            <div style={{
              position: 'absolute',
              // left: '55%',
              // transform: 'translateX(-50%)',
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              gap: '5px',
              minHeight: '37px',
              zIndex: '1000',
              padding: '2px 10px',
              borderBottom: '1px solid rgba(0, 255, 255, 0.4)',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)'
            }}>
              {/* Контейнер стамины */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
            }}>
              <div style={{
                color: '#00fff7',
                fontSize: '16px',
                fontWeight: 'bold',
                marginLeft: '2rem',
                textShadow: '0 0 5px rgba(0, 255, 255, 0.7)'
              }}>Stamina:</div>
              <div id="main-stamina-container" style={{
                display: 'flex',
                alignItems: 'center'
              }}></div>
              </div>
              
              {/* Контейнер опыта */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                <div style={{
                  color: 'white',
                  fontSize: '16px',
                  marginLeft: '1rem',
                  fontWeight: 'bold',
                  textShadow: '0 0 5px rgba(138, 43, 226, 0.7)'
                }}>Exp:</div>
                <div id="main-experience-container" style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100px',
                }}></div>
              </div>
              
              {/* Контейнер уровня */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  color: '#00fff7',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  textShadow: '0 0 5px rgba(0, 255, 247, 0.7)'
                }}>

                </div>
              </div>
            </div>
            
            <div className="rpg-sidebar">
              <div className="rpg-activities">
                <GameButton 
                  icon={<img src="images/rpg/backgrounds/character.png" alt="Character" style={{ width: '35px', height: '35px' }} />} 
                  label="Character" 
                  onClick={() => setActivePage("character")}
                  id="character-button"
                />
                <GameButton 
                  icon={<img src="images/rpg/craft.png" alt="Craft" style={{ width: '30px', height: '30px' }} />} 
                  label="Craft" 
                  onClick={handleCraftClick}
                  active={showCraftPanel}
                  id="craft-button" 
                />
                <GameButton 
                  icon="🍃" 
                  label="Gathering" 
                  onClick={handleGatheringClick}
                  active={showGatheringPanel}
                  id="gathering-button"
                />
                <GameButton 
                  icon="⚔️" 
                  label="Training" 
                  onClick={handleTrainingClick}
                  active={showTrainingPanel}
                  id="training-button"
                />
              </div>
            </div>
            
            {showCraftPanel && (
              <div className="craft-panel">
                <div className="craft-activities">
                  <GameButton 
                    icon={<img src="images/rpg/craft.png" alt="Craft" style={{ width: '35px', height: '35px' }} />}  
                    label="Crafting" 
                    onClick={handleCraftingClick} 
                  />
                  <GameButton 
                    icon={<img src="images/rpg/campfire.png" alt="Campfire" style={{ width: '35px', height: '35px' }} />} 
                    label="Campfire" 
                    onClick={handleCampfireClick} 
                  />
                  <GameButton 
                    icon={<img src="images/rpg/furnace.png" alt="Furnace" style={{ width: '35px', height: '35px' }} />} 
                    label="Furnace" 
                    onClick={handleFurnaceClick} 
                  />
                </div>
              </div>
            )}
            
            {showGatheringPanel && (
              <div className="gathering-panel">
                <div className="craft-activities">
                  <GameButton 
                    icon={<img src="images/rpg/herbs.png" alt="Gathering" style={{ width: '35px', height: '35px' }} />} 
                    label="Gathering" 
                    onClick={handleGatheringWithCheck}
                  />
                  <GameButton 
                    icon={<img src="images/rpg/primaxe.png" alt="Lumbering" style={{ width: '35px', height: '35px' }} />} 
                    label="Lumbering" 
                    onClick={handleChopClick}
                  />
                  <GameButton
                    icon={<img src="images/rpg/primbow.png" alt="Hunting" style={{ width: '35px', height: '35px' }} />} 
                    label="Hunting"
                    onClick={handleHuntClick}
                  />
                  <GameButton 
                    icon={<img src="images/rpg/primpickaxe.png" alt="Mining" style={{ width: '35px', height: '35px' }} />} 
                    label="Mining" 
                    onClick={handleMineClick}
                  />
                </div>
              </div>
            )}
            
            {showTrainingPanel && (
              <div className="training-panel">
                <div className="craft-activities">
                  <GameButton 
                    icon={
                      <div style={{ position: 'relative' }}>
                        <img src="images/rpg/novicedummy.png" alt="Novice Training" style={{ width: '35px', height: '35px', opacity: (userData && userData.level || 1) >= 6 ? 0.5 : 1 }} />
                        {(userData && userData.level || 1) >= 6 && (
                          <div style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            fontSize: '12px',
                            background: 'rgba(0, 0, 0, 0.8)',
                            color: '#ff8800',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: '1px solid #ff8800',
                            zIndex: 2
                          }}>🔒</div>
                        )}
                      </div>
                    } 
                    label="Novice" 
                    onClick={handleNoviceTrainingClick}
                    style={{
                      opacity: (userData && userData.level || 1) >= 6 ? 0.5 : 1,
                      cursor: (userData && userData.level || 1) >= 6 ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <GameButton 
                    icon={
                      <div style={{ position: 'relative' }}>
                        <img src="images/rpg/dummy.png" alt="Experienced Training" style={{ width: '35px', height: '35px', opacity: parseInt(userData && userData.level || 1) < 6 ? 0.5 : 1 }} />
                        {parseInt(userData && userData.level || 1) < 6 && (
                          <div style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            fontSize: '12px',
                            background: 'rgba(0, 0, 0, 0.8)',
                            color: '#ff8800',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: '1px solid #ff8800',
                            zIndex: 2
                          }}>🔒</div>
                        )}
                      </div>
                    } 
                    label="Experienced" 
                    onClick={handleExperiencedTrainingClick}
                    style={{
                      opacity: parseInt(userData && userData.level || 1) < 6 ? 0.5 : 1,
                      cursor: parseInt(userData && userData.level || 1) < 6 ? 'not-allowed' : 'pointer'
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* {userData && (
              <div className="rpg-character-bar">
                <div className="character-info">
                  <span className="character-name">{userData.nickname}</span>
                  <div className="character-level">Lvl {userData.level || 1}</div>
                </div>
              </div>
            )} */}
            
            <div className="rpg-main-screen-content">
              <div className="welcome-message">
                <h2 style={{
                  textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8), 1px 1px 4px rgba(0, 0, 0, 0.9)',
                  color: '#ffffff'
                }}>Welcome to Tonion RPG!</h2>
              </div>
              
              {userData && (
                <div className="character-display" style={{
                  position: 'absolute',
                  top: '35%',
                  left: '50%',
                  transform: 'translate(-50%, 0)',
                  textAlign: 'center',
                  width: '100%'

                }}>
                  <div className="character-header" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '10px',
                    fontSize: '1.2rem',
                    fontWeight: 'bold'
                  }}>
                    <span style={{
                      textShadow: '2px 2px 6px rgba(0, 0, 0, 0.8), 1px 1px 3px rgba(0, 0, 0, 0.9)',
                      color: '#ffffff'
                    }}>{userData.nickname}</span>
                    <span className="character-level futuristic">Level {userData.level || 1}</span>
                  </div>

                  
                  <div className="character-image" style={{
                    height: '320px',
                    backgroundImage: 'url(images/rpg/backgrounds/character.png)',
                    backgroundPosition: 'bottom center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain'
                  }}></div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  // Следим за изменением activePage и обновляем window.activeRPGPage
  useEffect(() => {
    window.activeRPGPage = activePage || 'main';
  }, [activePage]);

  // Добавляем обработчик критического изменения уровня
  useEffect(() => {
    const handleLevelCriticalChange = (event) => {
      const { oldLevel, newLevel, shouldBlockNovice, shouldUnlockExperienced } = event.detail;
      console.log('[GameLayout] Получено событие критического изменения уровня:', { oldLevel, newLevel });
      
      if (oldLevel === 5 && newLevel === 6) {
        // Принудительно закрываем панель тренировок если она открыта
        if (showTrainingPanel) {
          setShowTrainingPanel(false);
        }
        
        // Обновляем userData для немедленного отображения изменений
        if (userData) {
          userData.level = newLevel;
        }
        
        console.log('[GameLayout] Тренировки обновлены: Novice заблокирована, Experienced разблокирована');
      }
    };

    window.addEventListener('levelCriticalChange', handleLevelCriticalChange);
    return () => window.removeEventListener('levelCriticalChange', handleLevelCriticalChange);
  }, [showTrainingPanel, userData]);

  // Инициализация при загрузке компонента
  useEffect(() => {
    console.log('[GameLayout] Компонент загружен, инициализация модулей...');
    
    // Инициализация модуля стамины
    if (window.StaminaModule) {
      window.StaminaModule.init();
    }
    
    // Инициализация модуля нераспределенных статов
    if (window.UnallocatedStatsModule) {
      window.UnallocatedStatsModule.init();
    }
    
    // Инициализация модуля опыта
    if (window.ExperienceModule) {
      window.ExperienceModule.init().then(() => {
        console.log('[GameLayout] ExperienceModule инициализирован');
      });
    }
  }, []);

  return (
    <div className="rpg-game-layout">      
      {renderActivePage()}
      
      {/* Modal for crafting requirements */}
      {showRequirementModal && window.CraftingModule && (
        <window.CraftingModule.CraftRequirementModal
          itemName={requiredItemName}
          onClose={closeRequirementModal}
          onCraft={goToCraftingPage}
        />
      )}
      
      {/* Добавляем модальное окно блокировки добычи */}
      <GatheringSessionModal
        isOpen={modalOpen}
        activeType={activeSessionType}
        onClose={() => setModalOpen(false)}
        onGoToActive={goToActiveSession}
      />
      
      {/* Модальное окно проверки оружия */}
      <WeaponRequirementModal
        isOpen={showWeaponModal}
        requiredWeapon={requiredWeapon}
        gatheringType={pendingGatheringType}
        onClose={() => setShowWeaponModal(false)}
        onEquip={goToEquipWeapon}
        onChopClick={handleChopClick}
        onMineClick={handleMineClick}
        onHuntClick={handleHuntClick}
        setPendingGatheringType={setPendingGatheringType}
        setRequiredWeapon={setRequiredWeapon}
        setShowWeaponModal={setShowWeaponModal}
      />
      
      {/* Модальное окно уведомлений о тренировках */}
      <TrainingNotificationModal
        isOpen={showTrainingModal}
        message={trainingModalMessage}
        onClose={() => setShowTrainingModal(false)}
      />
    </div>
  );
};

// Модальное окно для блокировки перехода между добычами
const GatheringSessionModal = ({ isOpen, activeType, onClose, onGoToActive }) => {
  if (!isOpen) return null;
  const sessionNames = {
    gather: 'Gathering',
    chop: 'Lumbering',
    mine: 'Mining',
    hunt: 'Hunting'
  };
  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 10, 40, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)'
    }}>
      <div className="modal-content" style={{
        background: 'linear-gradient(135deg, rgba(0,255,255,0.18) 0%, rgba(0,0,40,0.8) 100%)',
        boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '24px',
        border: '2px solid rgba(0,255,255,0.35)',
        borderTop: '2.5px solid #00fff7',
        borderBottom: '2.5px solid #00fff7',
        padding: '24px 18px 18px 18px',
        width: '90%',
        maxWidth: '400px',
        textAlign: 'center',
        color: '#fff',
        position: 'relative',
        zIndex: 2,
        opacity: 0.95,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <h3 style={{
          margin: '0 0 15px 0',
          color: '#00fff7',
          textShadow: '0 0 8px #00fff7, 0 0 2px #fff',
          fontSize: '20px',
          letterSpacing: '1px'
        }}>Activity In Progress</h3>
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>You need to finish your current activity first: <strong style={{color: '#00fff7', textShadow: '0 0 8px #00fff7, 0 0 2px #fff'}}>{sessionNames[activeType] || 'gathering'}</strong></p>
        <div className="modal-buttons" style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <button className="modal-btn" onClick={onClose} style={{
            background: 'linear-gradient(90deg, rgba(0,255,255,0.25) 0%, rgba(0,255,255,0.12) 100%)',
            color: '#00fff7',
            border: '2px solid #00fff7',
            borderRadius: '16px',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            boxShadow: '0 0 16px 2px rgba(0,255,255,0.53), 0 0 2px 0 #fff',
            textShadow: '0 0 8px #00fff7, 0 0 2px #fff',
            padding: '12px 32px',
            margin: '8px 0',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            outline: 'none',
            backdropFilter: 'blur(2px)'
          }}>Close</button>
          <button className="modal-btn primary" onClick={onGoToActive} style={{
            background: 'linear-gradient(90deg, rgba(0,255,255,0.25) 0%, rgba(0,255,255,0.12) 100%)',
            color: '#00fff7',
            border: '2px solid #00fff7',
            borderRadius: '16px',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            boxShadow: '0 0 16px 2px rgba(0,255,255,0.53), 0 0 2px 0 #fff',
            textShadow: '0 0 8px #00fff7, 0 0 2px #fff',
            padding: '12px 32px',
            margin: '8px 0',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            outline: 'none',
            backdropFilter: 'blur(2px)'
          }}>Continue</button>
        </div>
      </div>
    </div>
  );
};

// Модальное окно для проверки оружия
const WeaponRequirementModal = ({ isOpen, requiredWeapon, gatheringType, onClose, onEquip, onChopClick, onMineClick, onHuntClick, setPendingGatheringType, setRequiredWeapon, setShowWeaponModal }) => {
  if (!isOpen) return null;
  
  const gatheringNames = {
    gather: 'Gathering',
    chop: 'Lumbering',
    mine: 'Mining',
    hunt: 'Hunting'
  };
  
  // Определяем weaponId для экипировки по gatheringType
  const getWeaponIdByType = (type) => {
    switch(type) {
      case 'chop': return ['primaxe', 'axe', 'prim axe', 'Primaxe', 'Axe', 'Prim Axe'];
      case 'mine': return ['primpickaxe', 'pickaxe', 'prim pickaxe', 'Primpickaxe', 'Pickaxe', 'Prim Pickaxe'];
      case 'hunt': return ['primbow', 'bow', 'prim bow', 'Primbow', 'Bow', 'Prim Bow']; // Убрали стрелы
      default: return [];
    }
  };
  
  // Функция для быстрой экипировки необходимого оружия из инвентаря
  const equipRequiredWeapon = async () => {
    try {
      // Блокируем кнопку сразу после нажатия
      const equipButton = document.querySelector('.modal-btn.primary');
      if (equipButton) {
        equipButton.disabled = true;
        equipButton.style.opacity = '0.5';
        equipButton.style.cursor = 'not-allowed';
        equipButton.style.pointerEvents = 'none';
        equipButton.textContent = 'Equipping...';
      }
      
      // Получаем telegramId
      const telegramId = localStorage.getItem('telegramId');
      if (!telegramId) {
        console.error('No telegramId found in localStorage');
        // Отображаем сообщение об ошибке в модальном окне
        const modalContentElement = document.querySelector('.modal-content p');
        if (modalContentElement) {
          modalContentElement.innerHTML = 'Error: Could not get your user ID. Please refresh the page and try again.';
          modalContentElement.style.color = '#ff5555';
        }
        return;
      }
      
      // Получаем идентификаторы необходимого оружия (исключаем стрелы)
      const weaponIds = getWeaponIdByType(gatheringType);
      if (!weaponIds || weaponIds.length === 0) {
        console.error(`No weapon IDs defined for gathering type: ${gatheringType}`);
        // Отображаем сообщение об ошибке в модальном окне
        const modalContentElement = document.querySelector('.modal-content p');
        if (modalContentElement) {
          modalContentElement.innerHTML = `Error: Could not determine required weapon for ${gatheringType}.`;
          modalContentElement.style.color = '#ff5555';
        }
        return;
      }
      
      // Проверяем, есть ли в инвентаре нужное оружие
      let weaponToEquip = null;
      const slot = 'weapon1';
      
      // Пытаемся получить инвентарь через IndexedDBModule
      if (window.IndexedDBModule && typeof window.IndexedDBModule.getItems === 'function') {
        try {
          const items = await window.IndexedDBModule.getItems();
          console.log('[WeaponModal] Full inventory from IndexedDB:', items.inventory);
          
          if (items && items.inventory) {
            console.log('[WeaponModal] Checking inventory for required weapons:', weaponIds);
            
            // Вспомогательная функция для нормализации идентификаторов
            const normalizeId = (id) => id.toLowerCase().replace(/\s+/g, '');
            
            // Инвентарь может быть как массивом, так и объектом - проверяем оба варианта
            if (Array.isArray(items.inventory)) {
              // Логируем весь инвентарь для диагностики
              items.inventory.forEach(item => {
                console.log(`[WeaponModal] Inventory item (array): ${item.id}, quantity: ${item.quantity || item.qty || 0}`);
              });
              
              // Ищем любое подходящее оружие в инвентаре с более гибким сравнением
              for (const weaponId of weaponIds) {
                console.log(`[WeaponModal] Looking for weapon: ${weaponId}, normalized: ${normalizeId(weaponId)}`);
                
                // Ищем предмет с точным совпадением id
                const foundExactItem = items.inventory.find(item => 
                  item.id && item.id === weaponId && 
                  (item.quantity > 0 || item.qty > 0)
                );
                
                if (foundExactItem) {
                  weaponToEquip = foundExactItem.id;
                  console.log(`[WeaponModal] Found weapon by exact match: ${weaponToEquip}`);
                  break;
                }
                
                // Проверяем с нормализацией регистра и пробелов
                const foundNormalizedItem = items.inventory.find(item => 
                  item.id && normalizeId(item.id) === normalizeId(weaponId) && 
                  (item.quantity > 0 || item.qty > 0)
                );
                
                if (foundNormalizedItem) {
                  weaponToEquip = foundNormalizedItem.id;
                  console.log(`[WeaponModal] Found weapon by normalized match: ${weaponToEquip}`);
                  break;
                }
                
                // Проверяем подстроки (например, если ищем "bow" и в инвентаре есть "longbow")
                const foundPartialItem = items.inventory.find(item => 
                  item.id && normalizeId(item.id).includes(normalizeId(weaponId)) && 
                  (item.quantity > 0 || item.qty > 0)
                );
                
                if (foundPartialItem) {
                  weaponToEquip = foundPartialItem.id;
                  console.log(`[WeaponModal] Found weapon by partial match: ${weaponToEquip}`);
                  break;
                }
              }
            } else if (typeof items.inventory === 'object' && items.inventory !== null) {
              // Если инвентарь - это объект (формат с сервера)
              console.log('[WeaponModal] Inventory is an object, checking keys');
              
              // Логируем все ключи инвентаря для диагностики
              Object.keys(items.inventory).forEach(key => {
                const item = items.inventory[key];
                console.log(`[WeaponModal] Inventory item (object): ${key}, quantity: ${item.quantity || 0}`);
              });
              
              // Проверяем наличие оружия в инвентаре по ключам объекта
              for (const weaponId of weaponIds) {
                console.log(`[WeaponModal] Looking for weapon in object: ${weaponId}`);
                
                // Прямое совпадение по ключу
                if (items.inventory[weaponId] && (items.inventory[weaponId].quantity > 0)) {
                  weaponToEquip = weaponId;
                  console.log(`[WeaponModal] Found weapon by direct key match: ${weaponToEquip}`);
                  break;
                }
                
                // Проверяем с нормализацией
                for (const key of Object.keys(items.inventory)) {
                  if (normalizeId(key) === normalizeId(weaponId) && 
                      items.inventory[key].quantity > 0) {
                    weaponToEquip = key;
                    console.log(`[WeaponModal] Found weapon by normalized key match: ${weaponToEquip}`);
                    break;
                  }
                }
                
                if (weaponToEquip) break;
                
                // Проверяем частичное совпадение
                for (const key of Object.keys(items.inventory)) {
                  if (normalizeId(key).includes(normalizeId(weaponId)) && 
                      items.inventory[key].quantity > 0) {
                    weaponToEquip = key;
                    console.log(`[WeaponModal] Found weapon by partial key match: ${weaponToEquip}`);
                    break;
                  }
                }
                
                if (weaponToEquip) break;
              }
            }
          }
        } catch (error) {
          console.error('[WeaponModal] Error checking inventory:', error);
        }
      }
      
      // Пробуем искать предметы в globalUserResources, если доступны
      if (!weaponToEquip && window.globalUserResources) {
        console.log('[WeaponModal] Checking globalUserResources:', window.globalUserResources);
        const normalizeId = (id) => id.toLowerCase().replace(/\s+/g, '');
        
        for (const weaponId of weaponIds) {
          // Прямое совпадение
          if (window.globalUserResources[weaponId] && window.globalUserResources[weaponId] > 0) {
            weaponToEquip = weaponId;
            console.log(`[WeaponModal] Found weapon in globalUserResources: ${weaponToEquip}`);
            break;
          }
          
          // Поиск с нормализацией
          for (const key in window.globalUserResources) {
            if (normalizeId(key) === normalizeId(weaponId) && window.globalUserResources[key] > 0) {
              weaponToEquip = key;
              console.log(`[WeaponModal] Found normalized weapon in globalUserResources: ${weaponToEquip}`);
              break;
            }
          }
          
          if (weaponToEquip) break;
        }
      }
      
      // Проверяем userData.inventory как последний вариант
      if (!weaponToEquip && window.userData && window.userData.inventory) {
        console.log('[WeaponModal] Checking userData.inventory:', window.userData.inventory);
        const normalizeId = (id) => id.toLowerCase().replace(/\s+/g, '');
        
        for (const weaponId of weaponIds) {
          // Прямое совпадение
          if (window.userData.inventory[weaponId] && window.userData.inventory[weaponId].quantity > 0) {
            weaponToEquip = weaponId;
            console.log(`[WeaponModal] Found weapon in userData.inventory: ${weaponToEquip}`);
            break;
          }
          
          // Поиск с нормализацией
          for (const key in window.userData.inventory) {
            if (normalizeId(key) === normalizeId(weaponId) && window.userData.inventory[key].quantity > 0) {
              weaponToEquip = key;
              console.log(`[WeaponModal] Found normalized weapon in userData.inventory: ${weaponToEquip}`);
              break;
            }
          }
          
          if (weaponToEquip) break;
        }
      }
      
      if (!weaponToEquip) {
        console.error('[WeaponModal] Required weapon not found in inventory');
        
        // Отображаем сообщение об ошибке в модальном окне
        const modalContentElement = document.querySelector('.modal-content p');
        if (modalContentElement) {
          modalContentElement.innerHTML = `You don't have a <strong style="color: #0af;">${requiredWeapon}</strong> in your inventory. Please craft or find one first.`;
          modalContentElement.style.color = '#ff5555';
        }
        
        // Выводим диагностическое сообщение для пользователя
        if (window.IndexedDBModule && typeof window.IndexedDBModule.getItems === 'function') {
          try {
            const items = await window.IndexedDBModule.getItems();
            if (items && items.inventory && Array.isArray(items.inventory)) {
              let weaponNames = items.inventory
                .filter(item => item.quantity > 0 || item.qty > 0)
                .map(item => item.id)
                .join(', ');
              console.log(`[WeaponModal] Available items in inventory: ${weaponNames}`);
            }
          } catch (error) {
            console.error('Error checking inventory:', error);
          }
        }
        
        return;
      }
      
      // Экипируем найденное оружие
      console.log(`[WeaponModal] Equipping ${weaponToEquip} to slot ${slot}`);
      
      // Проверяем, есть ли уже экипированный предмет в этом слоте
      let currentEquippedItem = null;
      if (window.equippedItems && window.equippedItems[slot]) {
        currentEquippedItem = window.equippedItems[slot];
        console.log(`[WeaponModal] Current equipped item in slot ${slot}: ${currentEquippedItem}`);
      }
      
      // Если уже есть оружие в слоте, сначала снимаем его
      if (currentEquippedItem) {
        console.log(`[WeaponModal] Unequipping current weapon ${currentEquippedItem} before equipping new one...`);
        try {
          // Запрос на снятие текущего оружия
          const unequipResponse = await fetch(addTimestamp('rpg.php?action=unequipItem'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId, slot, itemId: currentEquippedItem })
          });
          
          const unequipData = await unequipResponse.json();
          if (!unequipData.success) {
            console.warn(`[WeaponModal] Failed to unequip current item: ${unequipData.message || 'Unknown error'}`);
          } else {
            console.log(`[WeaponModal] Successfully unequipped ${currentEquippedItem}`);
            
            // Добавляем снятое оружие обратно в инвентарь
            try {
              // Обновляем через IndexedDB
              const rpgDB = await new Promise((resolve, reject) => {
                const request = indexedDB.open('rpgDatabase', 10);
                request.onerror = () => reject(new Error('Failed to open rpgDatabase'));
                request.onsuccess = () => resolve(request.result);
              });
              
              if (rpgDB.objectStoreNames.contains('inventory')) {
                const transaction = rpgDB.transaction('inventory', 'readwrite');
                const store = transaction.objectStore('inventory');
                
                // Проверяем, есть ли уже такой предмет в инвентаре
                const getRequest = store.get(currentEquippedItem);
                getRequest.onsuccess = function() {
                  const item = getRequest.result;
                  if (item) {
                    // Увеличиваем количество
                    item.quantity = (item.quantity || 0) + 1;
                    store.put(item);
                    console.log(`[WeaponModal] Increased ${currentEquippedItem} quantity in inventory: ${item.quantity}`);
                  } else {
                    // Добавляем как новый предмет
                    const newItem = {
                      id: currentEquippedItem,
                      name: currentEquippedItem.replace(/_/g, ' '),
                      quantity: 1,
                      updated: new Date().toISOString()
                    };
                    store.add(newItem);
                    console.log(`[WeaponModal] Added ${currentEquippedItem} to inventory`);
                  }
                };
              }
              
              // Также обновляем через IndexedDBModule для совместимости
              if (window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
                const inventory = await window.IndexedDBModule.getInventoryItems();
                if (Array.isArray(inventory)) {
                  const idx = inventory.findIndex(i => i.id === currentEquippedItem);
                  if (idx !== -1) {
                    inventory[idx].quantity = (inventory[idx].quantity || 0) + 1;
                  } else {
                    inventory.push({
                      id: currentEquippedItem,
                      name: currentEquippedItem.replace(/_/g, ' '),
                      quantity: 1
                    });
                  }
                  
                  if (typeof window.IndexedDBModule.updateUserInventory === 'function') {
                    await window.IndexedDBModule.updateUserInventory(inventory);
                  }
                }
              }
              
              // Обновляем глобальные ресурсы
              if (window.globalUserResources) {
                if (window.globalUserResources[currentEquippedItem]) {
                  window.globalUserResources[currentEquippedItem]++;
                } else {
                  window.globalUserResources[currentEquippedItem] = 1;
                }
              }
            } catch (dbError) {
              console.error('[WeaponModal] Error adding unequipped item to inventory:', dbError);
            }
          }
        } catch (unequipError) {
          console.error('[WeaponModal] Error in unequipping current weapon:', unequipError);
        }
      }
      
      // Отправляем запрос на сервер для экипировки нового оружия
      const response = await fetch(addTimestamp('rpg.php?action=equipItem'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, itemId: weaponToEquip, slot })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log(`[WeaponModal] Successfully equipped ${weaponToEquip}`);
        
        // Обновляем экипировку в IndexedDB
        if (window.IndexedDBModule && typeof window.IndexedDBModule.getItems === 'function') {
          try {
            const items = await window.IndexedDBModule.getItems();
            if (items && items.equipped) {
              // Создаем копию объекта экипировки
              const updatedEquipment = { ...items.equipped };
              updatedEquipment[slot] = weaponToEquip;
              
              // Сохраняем обновленную экипировку
              if (window.IndexedDBModule.checkUserData) {
                await window.IndexedDBModule.checkUserData(telegramId, { equipped: updatedEquipment });
                console.log('[WeaponModal] Updated equipped items in IndexedDB after equipping');
              }
            }
          } catch (error) {
            console.error('[WeaponModal] Error updating equipped items in IndexedDB:', error);
          }
        }
        
        // Обновляем инвентарь (уменьшаем количество экипированного предмета)
        try {
          console.log(`[WeaponModal] Уменьшаем количество предмета ${weaponToEquip} в инвентаре`);
          
          // 1. Сначала обновляем через IndexedDB API напрямую (основной метод)
          const rpgDB = await new Promise((resolve, reject) => {
            const request = indexedDB.open('rpgDatabase', 10);
            request.onerror = () => reject(new Error('Failed to open rpgDatabase'));
            request.onsuccess = () => resolve(request.result);
          });
          
          if (rpgDB.objectStoreNames.contains('inventory')) {
            const transaction = rpgDB.transaction('inventory', 'readwrite');
            const store = transaction.objectStore('inventory');
            
            const getRequest = store.get(weaponToEquip);
            getRequest.onsuccess = function() {
              const item = getRequest.result;
              if (item) {
                const currentQuantity = item.quantity || item.qty || 1;
                console.log(`[WeaponModal] Current quantity of ${weaponToEquip} in inventory: ${currentQuantity}`);
                
                // Уменьшаем количество
                item.quantity = Math.max(0, currentQuantity - 1);
                
                if (item.quantity > 0) {
                  store.put(item);
                  console.log(`[WeaponModal] Updated quantity of ${weaponToEquip} to ${item.quantity}`);
                } else {
                  store.delete(weaponToEquip);
                  console.log(`[WeaponModal] Removed ${weaponToEquip} from inventory (quantity = 0)`);
                }
              } else {
                console.warn(`[WeaponModal] Item ${weaponToEquip} not found in rpgDatabase/inventory`);
              }
            };
          }
          
          // 2. Обновляем через IndexedDBModule (для совместимости с React-компонентами)
          if (window.IndexedDBModule) {
            // Метод 2.1: Через updateInventory если доступен
            if (typeof window.IndexedDBModule.getItems === 'function' && typeof window.IndexedDBModule.updateInventory === 'function') {
              const items = await window.IndexedDBModule.getItems();
              if (items && items.inventory && Array.isArray(items.inventory)) {
                const itemIndex = items.inventory.findIndex(item => item.id === weaponToEquip);
                if (itemIndex !== -1) {
                  const currentQuantity = items.inventory[itemIndex].quantity || items.inventory[itemIndex].qty || 1;
                  items.inventory[itemIndex].quantity = Math.max(0, currentQuantity - 1);
                  
                  // Если количество 0, удаляем предмет из массива
                  if (items.inventory[itemIndex].quantity === 0) {
                    items.inventory.splice(itemIndex, 1);
                  }
                  
                  // Обновляем инвентарь
                  await window.IndexedDBModule.updateInventory(items.inventory);
                  console.log(`[WeaponModal] Updated inventory through IndexedDBModule.updateInventory`);
                } else {
                  console.warn(`[WeaponModal] Item ${weaponToEquip} not found in IndexedDBModule inventory`);
                }
              }
            }
            
            // Метод 2.2: Через getInventoryItems/updateUserInventory
            if (typeof window.IndexedDBModule.getInventoryItems === 'function' && typeof window.IndexedDBModule.updateUserInventory === 'function') {
              const inventory = await window.IndexedDBModule.getInventoryItems();
              if (Array.isArray(inventory)) {
                const idx = inventory.findIndex(i => i.id === weaponToEquip);
                if (idx !== -1) {
                  const currentQuantity = inventory[idx].quantity || inventory[idx].qty || 1;
                  inventory[idx].quantity = Math.max(0, currentQuantity - 1);
                  
                  // Если количество 0, удаляем предмет из массива
                  if (inventory[idx].quantity === 0) {
                    inventory.splice(idx, 1);
                  }
                  
                  await window.IndexedDBModule.updateUserInventory(inventory);
                  console.log(`[WeaponModal] Updated inventory through IndexedDBModule.updateUserInventory`);
                } else {
                  console.warn(`[WeaponModal] Item ${weaponToEquip} not found in inventory items`);
                }
              }
            }
          }
          
          // 3. Обновляем globalUserResources (для совместимости с некоторыми UI-компонентами)
          if (window.globalUserResources && window.globalUserResources[weaponToEquip]) {
            const currentQuantity = window.globalUserResources[weaponToEquip];
            window.globalUserResources[weaponToEquip] = Math.max(0, currentQuantity - 1);
            console.log(`[WeaponModal] Updated globalUserResources: ${weaponToEquip} = ${window.globalUserResources[weaponToEquip]}`);
          }
          
          // 4. Обновляем userData.inventory если есть
          if (window.userData && window.userData.inventory && window.userData.inventory[weaponToEquip]) {
            const currentQuantity = window.userData.inventory[weaponToEquip].quantity || 1;
            window.userData.inventory[weaponToEquip].quantity = Math.max(0, currentQuantity - 1);
            console.log(`[WeaponModal] Updated userData.inventory: ${weaponToEquip} = ${window.userData.inventory[weaponToEquip].quantity}`);
          }
        } catch (error) {
          console.error('[WeaponModal] Error updating inventory after equipping:', error);
        }
        
        // Обновляем глобальную переменную window.equippedItems
        if (window.equippedItems) {
          window.equippedItems[slot] = weaponToEquip;
        } else {
          window.equippedItems = { [slot]: weaponToEquip };
        }
        
        // Обновляем React-компоненты через события
        window.dispatchEvent(new CustomEvent('inventoryUpdated', { 
          detail: { timestamp: Date.now() }
        }));
        
        window.dispatchEvent(new CustomEvent('resourcesUpdated', { 
          detail: { timestamp: Date.now() }
        }));
        
        // Принудительно загружаем экипировку через глобальную функцию
        if (window.loadEquippedItems) {
          await window.loadEquippedItems(true);
        }
        
        // Закрываем модальное окно и продолжаем действие
        onClose();
        
        // Принудительно запускаем проверку оружия снова, которая теперь должна пройти успешно
        if (window.checkRequiredWeapon) {
          window.checkRequiredWeapon(gatheringType).then(result => {
            if (result.hasWeapon) {
              console.log(`[WeaponModal] Weapon check successful after equipping, continuing to ${gatheringType}`);
              // Создаем полный объект события для передачи в обработчики
              const mockEvent = {
                preventDefault: () => {},
                target: document.createElement('button'),
                currentTarget: document.createElement('button'),
                stopPropagation: () => {},
                type: 'click'
              };
              
              // Выполняем переход к нужной странице
              if (gatheringType === 'chop') onChopClick(mockEvent);
              else if (gatheringType === 'mine') onMineClick(mockEvent);
              else if (gatheringType === 'hunt') onHuntClick(mockEvent);
            } else {
              console.error('[WeaponModal] Weapon check still failed after equipping');
              // Показываем сообщение об ошибке прямо в модальном окне, не закрывая его
              const modalContentElement = document.querySelector('.modal-content p');
              if (modalContentElement) {
                modalContentElement.innerHTML = 'There was a problem with your equipment. Please try again or check your inventory.';
                modalContentElement.style.color = '#ff5555';
              }
            }
          });
        }
      } else {
        console.error('[WeaponModal] Failed to equip weapon:', data.message);
        // Показываем сообщение об ошибке прямо в модальном окне, не закрывая его
        const modalContentElement = document.querySelector('.modal-content p');
        if (modalContentElement) {
          modalContentElement.innerHTML = 'Failed to equip the weapon: ' + (data.message || 'Unknown error');
          modalContentElement.style.color = '#ff5555';
        }
      }
    } catch (error) {
      console.error('[WeaponModal] Error in equipRequiredWeapon:', error);
      // Показываем сообщение об ошибке прямо в модальном окне, не закрывая его
      const modalContentElement = document.querySelector('.modal-content p');
      if (modalContentElement) {
        modalContentElement.innerHTML = 'An error occurred while equipping the weapon. Please try again.';
        modalContentElement.style.color = '#ff5555';
      }
    }
  };
  
  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 10, 40, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)'
    }}>
      <div className="modal-content" style={{
        background: 'linear-gradient(135deg, rgba(0,255,255,0.18) 0%, rgba(0,0,40,0.8) 100%)',
        boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '24px',
        border: '2px solid rgba(0,255,255,0.35)',
        borderTop: '2.5px solid #00fff7',
        borderBottom: '2.5px solid #00fff7',
        padding: '24px 18px 18px 18px',
        width: '90%',
        maxWidth: '400px',
        textAlign: 'center',
        color: '#fff',
        position: 'relative',
        zIndex: 2,
        opacity: 0.95,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <h3 style={{
          margin: '0 0 15px 0',
          color: '#00fff7',
          textShadow: '0 0 8px #00fff7, 0 0 2px #fff',
          fontSize: '20px',
          letterSpacing: '1px'
        }}>Equipment Required</h3>
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          {gatheringType === 'hunt' && requiredWeapon === 'Knife' ? (
            <React.Fragment>
              You need a <strong style={{color: '#00fff7', textShadow: '0 0 8px #00fff7, 0 0 2px #fff'}}>Knife</strong> in your inventory to start hunting. Make sure to craft or find one first.
            </React.Fragment>
          ) : (
            <React.Fragment>
              You need a <strong style={{color: '#00fff7', textShadow: '0 0 8px #00fff7, 0 0 2px #fff'}}>{requiredWeapon}</strong> equipped to start {gatheringNames[gatheringType] || gatheringType}.
              
              {gatheringType === 'hunt' && (
                <div style={{marginTop: '10px', fontSize: '14px', color: '#ffa500'}}>
                  <strong>Note:</strong> For hunting you also need a knife in your inventory and arrows.
                </div>
              )}
            </React.Fragment>
          )}
        </p>
        <div className="modal-buttons" style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <button className="modal-btn" onClick={onClose} style={{
            background: 'linear-gradient(90deg, rgba(0,255,255,0.25) 0%, rgba(0,255,255,0.12) 100%)',
            border: '2px solid #00fff7',
            borderRadius: '16px',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            boxShadow: '0 0 16px 2px rgba(0,255,255,0.53), 0 0 2px 0 #fff',
            textShadow: '0 0 8px #00fff7, 0 0 2px #fff',
            padding: '12px 32px',
            margin: '8px 0',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            outline: 'none',
            backdropFilter: 'blur(2px)'
          }}>Close</button>
          
          {/* Показываем кнопку "Equip" только если требуется оружие, но не нож для охоты */}
          {!(gatheringType === 'hunt' && requiredWeapon === 'Knife') && (
            <button 
              className="modal-btn primary" 
              onClick={equipRequiredWeapon}
              style={{
                background: 'linear-gradient(90deg, rgba(0,255,255,0.25) 0%, rgba(0,255,255,0.12) 100%)',
                border: '2px solid #00fff7',
                borderRadius: '16px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                letterSpacing: '1px',
                boxShadow: '0 0 16px 2px rgba(0,255,255,0.53), 0 0 2px 0 #fff',
                textShadow: '0 0 8px #00fff7, 0 0 2px #fff',
                padding: '12px 32px',
                margin: '8px 0',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
                outline: 'none',
                backdropFilter: 'blur(2px)'
              }}
            >
              Equip
            </button>
          )}
          
          {/* Убрали кнопку крафта для ножа по требованию пользователя */}
        </div>
      </div>
    </div>
  );
};

// Функция для логирования данных RPG при загрузке страницы
const logRPGDataToServer = async () => {
  try {
    // Проверяем, включено ли логирование - если localStorage содержит disable_rpg_logging, то не выполняем логирование
    if (localStorage.getItem('disable_rpg_logging') === 'true') {
      console.log('[RPG Logger] Логирование отключено через localStorage');
      return;
    }
    
    // Получаем telegramId из localStorage или Telegram WebApp
    let telegramId;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
    } else {
      telegramId = localStorage.getItem('telegramId');
    }
    
    if (!telegramId) {
      console.error('[RPG Logger] Не удалось определить telegramId для логирования');
      return;
    }
    
    // Подготавливаем данные для отправки
    const logData = {
      telegramId: telegramId,
      timestamp: new Date().toISOString(),
      resources: {},
      inventory: [],
      equipped: {}
    };
    
    // Получаем ресурсы пользователя
    if (window.IndexedDBModule && typeof window.IndexedDBModule.getUserResources === 'function') {
      try {
        const resources = await window.IndexedDBModule.getUserResources();
        if (resources) {
          logData.resources = resources;
        }
      } catch (error) {
        console.error('[RPG Logger] Ошибка при получении ресурсов:', error);
      }
    }
    
    // Получаем инвентарь пользователя
    if (window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
      try {
        const inventory = await window.IndexedDBModule.getInventoryItems();
        if (inventory && Array.isArray(inventory)) {
          logData.inventory = inventory;
        }
      } catch (error) {
        console.error('[RPG Logger] Ошибка при получении инвентаря:', error);
      }
    }
    
    // Получаем экипировку пользователя
    try {
      // Пытаемся получить данные из глобальной переменной
      if (window.equippedItems) {
        logData.equipped = window.equippedItems;
      } else {
        // Или делаем запрос к API для получения экипировки
        const response = await fetch(addTimestamp('rpg.php?action=getEquipped'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId })
        });
        
        const data = await response.json();
        if (data.success && data.equipped) {
          logData.equipped = data.equipped;
        }
      }
    } catch (error) {
      console.error('[RPG Logger] Ошибка при получении экипировки:', error);
    }
    
    // Проверяем наличие файла rpg_log.php перед отправкой данных
    try {
      // Сначала проверим, существует ли файл, отправив HEAD запрос
      const checkFile = await fetch('rpg_log.php', { method: 'HEAD' })
        .catch(error => {
          console.warn('[RPG Logger] Файл rpg_log.php не найден, логирование отключено');
          // Отключаем логирование для будущих загрузок страницы
          localStorage.setItem('disable_rpg_logging', 'true');
          return { ok: false };
        });
      
      // Если файл не существует, прекращаем выполнение
      if (!checkFile.ok) {
        return;
      }
      
      // Отправляем данные на сервер для логирования
      const response = await fetch('rpg_log.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      
      if (!response.ok) {
        // Если получили ошибку HTTP, логируем её, но не вызываем исключение
        console.warn(`[RPG Logger] Сервер вернул статус ${response.status} при логировании данных`);
        if (response.status === 404) {
          // Если файл не найден, отключаем логирование для будущих загрузок
          localStorage.setItem('disable_rpg_logging', 'true');
        }
        return;
      }
      
      // Пробуем получить текст ответа для предварительной проверки
      const responseText = await response.text();
      
      // Проверяем, что ответ не пустой и похож на JSON
      if (!responseText || responseText.trim() === '') {
        console.warn('[RPG Logger] Сервер вернул пустой ответ');
        return;
      }
      
      // Проверяем, не содержит ли ответ HTML-разметку (признак ошибки)
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        console.warn('[RPG Logger] Сервер вернул HTML вместо JSON, возможно, файл не найден');
        localStorage.setItem('disable_rpg_logging', 'true');
        return;
      }
      
      // Теперь безопасно парсим JSON
      try {
        const result = JSON.parse(responseText);
        if (result.success) {
          console.log('[RPG Logger] Данные успешно отправлены для логирования');
        } else {
          console.warn('[RPG Logger] Ошибка при логировании данных:', result.message);
        }
      } catch (parseError) {
        console.warn('[RPG Logger] Не удалось разобрать ответ как JSON:', parseError);
      }
    } catch (fetchError) {
      // Это более серьезная ошибка, но мы все равно не хотим, чтобы она блокировала работу
      console.warn('[RPG Logger] Ошибка при отправке запроса логирования:', fetchError);
    }
  } catch (error) {
    console.error('[RPG Logger] Критическая ошибка при логировании данных:', error);
  }
};

// Main RPG App
const RPGApp = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePage, setActivePage] = useState('main');
  const [showCreateCharacterModal, setShowCreateCharacterModal] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  
  // Удаляю дублирующиеся состояния для модалки блокировки добычи
  // const [modalOpen, setModalOpen] = React.useState(false);
  // const [activeSessionType, setActiveSessionType] = React.useState(null);
  // const [pendingPage, setPendingPage] = React.useState(null);

  // Инициализация IndexedDB
  const initIndexedDB = async () => {
    try {
      // Проверяем наличие IndexedDBModule
      if (window.IndexedDBModule && typeof window.IndexedDBModule.initDB === 'function') {
        console.log('Initializing IndexedDB...');
        await window.IndexedDBModule.initDB();
        console.log('IndexedDB initialized successfully');
        return true;
      } else {
        console.warn('IndexedDBModule not available');
        return false;
      }
    } catch (error) {
      console.error('Error initializing IndexedDB:', error);
      return false;
    }
  };

  // Загрузка данных пользователя
  const loadUserData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      // Получаем telegramId из localStorage
      let telegramId = localStorage.getItem('telegramId');
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
          window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
        telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
      }
      
      if (!telegramId) {
        throw new Error("Telegram ID не найден");
      }
      
      // Проверяем, является ли пользователь новым
      const isNewUser = localStorage.getItem('isNewUser') === 'true';
      
      if (isNewUser && retryCount === 0) {
        // Для новых пользователей добавляем задержку перед первым запросом
        console.log("Новый пользователь, добавляем задержку перед запросом данных...");
        await new Promise(resolve => setTimeout(resolve, 1500)); // Задержка 1.5 секунды
        localStorage.removeItem('isNewUser'); // Удаляем флаг нового пользователя
      }
      
      // Сначала проверяем существование пользователя
      console.log(`Проверка существования пользователя с ID: ${telegramId}...`);
      const checkEndpoint = addTimestamp('rpg.php?action=checkUser');
      const checkResponse = await fetch(checkEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ telegramId: telegramId })
      });
      
      if (!checkResponse.ok) {
        console.error('Ошибка HTTP при проверке пользователя:', checkResponse.status, checkResponse.statusText);
        throw new Error(`Ошибка HTTP при проверке пользователя: ${checkResponse.status}`);
      }
      
      const checkData = await checkResponse.json();
      console.log('Результат проверки пользователя:', checkData);
      
      // Если пользователь не существует, ожидаем завершения его регистрации
      if (!checkData.exists && (!checkData.data || !checkData.data.exists)) {
        console.log('Пользователь не найден в базе данных. Ожидание завершения регистрации...');
        if (retryCount < 3) {
          // Повторная попытка через 1.5 секунды
          setTimeout(() => loadUserData(retryCount + 1), 1500);
          return null;
        }
        throw new Error("Пользователь не зарегистрирован после нескольких попыток");
      }
      
      // Сначала пытаемся получить данные из IndexedDB
      let userDataFromDB = null;
      if (window.IndexedDBModule && typeof window.IndexedDBModule.getUserData === 'function') {
        try {
          console.log('Trying to get user data from IndexedDB...');
          userDataFromDB = await window.IndexedDBModule.getUserData(telegramId);
          if (userDataFromDB) {
            console.log('User data retrieved from IndexedDB:', userDataFromDB);
          }
        } catch (dbError) {
          console.warn('Failed to get user data from IndexedDB:', dbError);
        }
      }
      
      // Если данные получены из IndexedDB, используем их
      if (userDataFromDB) {
        setUserData(userDataFromDB);
        setLoading(false);
        return userDataFromDB;
      }
      
      // Если данных в IndexedDB нет, получаем с сервера
      console.log(`Загрузка данных для пользователя ${telegramId} с сервера...`);
      
      // Получение данных пользователя с сервера через POST запрос
      const endpoint = addTimestamp('rpg.php?action=getUserData');
      console.log('Вызов API:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ telegramId: telegramId })
      });
      
      if (!response.ok) {
        console.error('Ошибка HTTP:', response.status, response.statusText);
        const responseText = await response.text();
        console.error('Ответ сервера:', responseText);
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }
      
      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
        console.log('Данные, полученные от сервера:', data);
      } catch (e) {
        console.error("Ошибка при разборе JSON:", text);
        throw new Error("Некорректный ответ сервера");
      }
      
      if (!data.success) {
        throw new Error(data.message || "Не удалось загрузить данные");
      }
      
      console.log("Данные пользователя получены с сервера:", data);
      
      // Сохраняем данные в IndexedDB, если модуль доступен
      if (window.IndexedDBModule && typeof window.IndexedDBModule.checkUserData === 'function') {
        try {
          console.log('Saving user data to IndexedDB...');
          await window.IndexedDBModule.checkUserData(telegramId, data.userData);
          console.log('User data saved to IndexedDB');
        } catch (dbError) {
          console.error('Failed to save user data to IndexedDB:', dbError);
        }
      }
      
      setUserData(data.userData);
      return data.userData;
    } catch (error) {
      console.error("Ошибка при загрузке данных пользователя:", error);
      
      // Попытка перезагрузить данные
      if (retryCount < 2) {
        console.log(`Повторная попытка загрузки данных (${retryCount + 1}/2)...`);
        setTimeout(function() { 
          loadUserData(retryCount + 1);
        }, 2000); // Повторная попытка через 2 секунды
      } else {
        console.log("Максимальное количество попыток достигнуто, используем данные по умолчанию");
        setError(error.message);
        // Set default user data as fallback
        let userId = localStorage.getItem('telegramId');
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
            window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
          userId = window.Telegram.WebApp.initDataUnsafe.user.id;
        }
        
        if (userId) {
          setDefaultUserData(userId);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Установка данных пользователя по умолчанию в случае ошибки
  const setDefaultUserData = (telegramId) => {
    console.log("Установка данных по умолчанию...");
    setUserData({
      telegram_id: telegramId,
      nickname: `player_${telegramId.slice(-4)}`,
      level: 1,
      exp: 0,
      health: 100,
      max_health: 100,
      energy: 100,
      max_energy: 100,
      inventory: [],
      equipment: {},
      stats: {
        strength: 5,
        agility: 5,
        intelligence: 5,
        vitality: 5
      },
      resources: {
        gold: 0,
        wood: 0,
        stone: 0,
        herbs: 0
      },
      created_at: new Date().toISOString()
    });
  };

  // Загрузка пользовательских ресурсов из IndexedDB
  const loadUserResourcesFromIndexedDB = async () => {
    try {
      let telegramId;
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
          window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
        telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
      } else {
        telegramId = localStorage.getItem('telegramId');
      }
      
      if (!telegramId) {
        console.warn('[RPG] Не удалось определить telegramId при загрузке ресурсов');
        return { resources: {}, history: [] };
      }
      
      console.log(`[RPG] Загрузка ресурсов для telegramId ${telegramId}...`);
      
      // Используем новую функцию для UserResourcesDB для получения специальных ресурсов
      let resources = {};
      if (window.IndexedDBModule && typeof window.IndexedDBModule.getUserResourcesFromUserDB === 'function') {
        resources = await window.IndexedDBModule.getUserResourcesFromUserDB(telegramId);
        console.log(`[RPG] Получены специальные ресурсы из UserResourcesDB:`, resources);
      } else if (window.IndexedDBModule && typeof window.IndexedDBModule.getUserResourcesFromIndexedDB === 'function') {
        // Запасной вариант - используем rpgDatabase
        resources = await window.IndexedDBModule.getUserResourcesFromIndexedDB(telegramId);
        console.log(`[RPG] Получены ресурсы из rpgDatabase:`, resources);
      } else {
        // Запасной вариант, если функции недоступны - используем старый метод
        resources = await getUserResourcesFromIndexedDB();
        console.log(`[RPG] Получены ресурсы старым методом:`, resources);
      }
      
      // Если ресурсы не найдены или отсутствуют специальные ресурсы, пробуем загрузить их с сервера
      if (!resources || (!resources.onion && !resources.candy && !resources.junk && !resources.coin)) {
        console.log(`[RPG] Специальные ресурсы не найдены, пробуем загрузить их с сервера...`);
        
        // Проверяем наличие функции loadSpecialResourcesIfNeeded
        if (window.IndexedDBModule && typeof window.IndexedDBModule.loadSpecialResourcesIfNeeded === 'function') {
          const loaded = await window.IndexedDBModule.loadSpecialResourcesIfNeeded();
          if (loaded) {
            // Получаем обновленные ресурсы после загрузки из правильной БД
            resources = await window.IndexedDBModule.getUserResourcesFromUserDB(telegramId);
            console.log(`[RPG] Специальные ресурсы успешно загружены с сервера:`, resources);
          }
        }
      }
      
      // Синхронизируем ресурсы между БД, если они были найдены в UserResourcesDB
      if (resources && resources.onion && window.IndexedDBModule && 
          typeof window.IndexedDBModule.saveUserResourcesToIndexedDB === 'function') {
        try {
          await window.IndexedDBModule.saveUserResourcesToIndexedDB(resources, telegramId);
          console.log(`[RPG] Ресурсы синхронизированы с rpgDatabase для совместимости`);
        } catch (syncError) {
          console.warn(`[RPG] Ошибка при синхронизации ресурсов:`, syncError);
        }
      }
      
      // Получаем историю изменений ресурсов (заглушка)
      const history = await getResourcesHistoryFromIndexedDB(3);
      
      return { resources: resources || {}, history: history };
    } catch (error) {
      console.error('[RPG] Ошибка при загрузке ресурсов из IndexedDB:', error);
      return { resources: {}, history: [] };
    }
  };

  useEffect(() => {
    // Инициализируем IndexedDB, затем загружаем данные пользователя
    const initAndLoadData = async () => {
      try {
        // Инициализация IndexedDB
        await initIndexedDB();
        
        // ПРИОРИТЕТ 1: Быстрая инициализация стамины и опыта
        try {
          console.log('[RPGApp] Приоритетная инициализация стамины и опыта...');
          
          if (window.StaminaModule) {
            await window.StaminaModule.init();
            console.log('[RPGApp] Стамина приоритетно инициализирована');
          }
          
          if (window.ExperienceModule) {
            await window.ExperienceModule.init();
            console.log('[RPGApp] Опыт приоритетно инициализирован');
          }
        } catch (priorityError) {
          console.error('[RPGApp] Ошибка приоритетной инициализации:', priorityError);
        }
        
        // Проверяем и при необходимости загружаем специальные ресурсы
        try {
          await loadSpecialResourcesIfNeeded();
          console.log("[RPG] Проверка специальных ресурсов завершена");
        } catch(resourceError) {
          console.error("[RPG] Ошибка при загрузке специальных ресурсов:", resourceError);
          // Продолжаем работу приложения даже при ошибке загрузки специальных ресурсов
        }
        
        // Проверяем, зарегистрирован ли пользователь
        if (window.userRegistered) {
          console.log('Пользователь уже зарегистрирован, загружаем данные...');
        // Загрузка данных пользователя
          const userDataResult = await loadUserData();
        
        // Загрузка ресурсов
          await loadUserResourcesFromIndexedDB();
          
          // Логируем данные RPG после успешной загрузки данных пользователя
          if (userDataResult) {
            await logRPGDataToServer();
          }
        } else {
          console.log('Ожидание регистрации пользователя...');
          
          // Создаем обработчик события регистрации пользователя
          const handleUserRegistered = async (event) => {
            console.log('Получено событие userRegistered в компоненте RPGApp');
            // Удаляем обработчик, чтобы не вызывать функцию несколько раз
            document.removeEventListener('userRegistered', handleUserRegistered);
            
            // Добавляем небольшую задержку перед загрузкой данных
            setTimeout(async () => {
              // Загрузка данных пользователя
              const userData = await loadUserData();
              
              // Загрузка ресурсов
              await loadUserResourcesFromIndexedDB();
              
              // Логируем данные RPG после успешной загрузки
              if (userData) {
                await logRPGDataToServer();
              }
            }, 1500);
          };
          
          // Устанавливаем обработчик события
          document.addEventListener('userRegistered', handleUserRegistered);
          
          // На всякий случай пытаемся загрузить данные через определенное время
          setTimeout(async () => {
            // Если событие еще не сработало, пробуем загрузить данные
            if (!window.userRegistered) {
              console.log('Тайм-аут ожидания события регистрации, пробуем загрузить данные...');
              try {
                const userData = await loadUserData();
                await loadUserResourcesFromIndexedDB();
                
                // Логируем данные RPG после успешной загрузки
                if (userData) {
                  await logRPGDataToServer();
                }
              } catch (e) {
                console.error('Ошибка при загрузке данных после тайм-аута:', e);
              }
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Ошибка при инициализации RPG приложения:', error);
      }
    };
    
    initAndLoadData();
  }, []);

  // Дополнительная загрузка экипировки (в случае если первичная загрузка не сработала)
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (window.loadEquippedItems) {
        console.log('[RPGApp] Дополнительная загрузка экипировки (fallback)');
        window.loadEquippedItems();
      }
    }, 2000); // Проверяем через 2 секунды
    
    return () => clearTimeout(fallbackTimer);
  }, []);

  if (loading) {
    return (
      <div className="rpg-loading futuristic">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading character data...</div>
      </div>
    );
  }

  // Даже при наличии ошибки отображаем интерфейс без сообщения об ошибке
  return (
    <div style={{position: 'relative'}}>
      {/* Отображение версии приложения в правом верхнем углу на всех страницах */}
      <div style={{
        position: 'fixed',
        top: '5px',
        right: '10px',
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.5)',
        zIndex: 9999,
        fontFamily: 'monospace'
      }}>
        {APP_VERSION}
      </div>
      
      {/* Кнопка дебага под версией */}
      <button
        onClick={() => setShowDebugModal(true)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '10px',
          width: '24px',
          height: '24px',
          backgroundColor: 'rgba(138, 43, 226, 0.8)',
          border: '1px solid rgba(138, 43, 226, 1)',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}
        title="Debug Info"
      >
        🐛
      </button>
      
      {/* Модальное окно дебага */}
      <DebugModal 
        isOpen={showDebugModal} 
        onClose={() => setShowDebugModal(false)} 
      />
      
      <GameLayout userData={userData} />
    </div>
  );
};

// Render the app
ReactDOM.render(<RPGApp />, document.getElementById('rpg-app-root'));

// В конце файла app.js добавьте:
if (!window.RPGApp) {
  window.RPGApp = {};
}

// Создаем глобальную функцию loadUserData, которая может быть вызвана откуда угодно
window.RPGApp.loadUserData = async function(retryCount = 0) {
  console.log('Вызов глобальной функции loadUserData');
  try {
    // Получаем telegramId из localStorage
    let telegramId = localStorage.getItem('telegramId');
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    
    if (!telegramId) {
      console.error('Telegram ID не найден');
      throw new Error("Telegram ID не найден");
    }
    
    // Сначала пытаемся получить данные из IndexedDB
    if (window.IndexedDBModule && typeof window.IndexedDBModule.getUserData === 'function') {
      try {
        console.log('Trying to get user data from IndexedDB in global function...');
        const userDataFromDB = await window.IndexedDBModule.getUserData(telegramId);
        if (userDataFromDB) {
          console.log('User data retrieved from IndexedDB in global function:', userDataFromDB);
          return userDataFromDB;
        }
      } catch (dbError) {
        console.warn('Failed to get user data from IndexedDB in global function:', dbError);
      }
    }
    
    // Если данных в IndexedDB нет, получаем с сервера
    console.log(`Загрузка данных для пользователя ${telegramId} с сервера из глобальной функции...`);
    
    // Добавление временной метки к URL
    const timestamp = new Date().getTime();
    const endpoint = `rpg.php?action=getUserData&t=${timestamp}`;
    
    // Получение данных пользователя с сервера через POST запрос
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify({ telegramId: telegramId })
    });
    
    if (!response.ok) {
      console.error('Ошибка HTTP:', response.status, response.statusText);
      const responseText = await response.text();
      console.error('Ответ сервера:', responseText);
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }
    
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
      console.log('Данные, полученные от сервера (global function):', data);
    } catch (e) {
      console.error("Ошибка при разборе JSON:", text);
      throw new Error("Некорректный ответ сервера");
    }
    
    if (!data.success) {
      throw new Error(data.message || "Не удалось загрузить данные");
    }
    
    // Сохраняем данные в IndexedDB, если модуль доступен
    if (window.IndexedDBModule && typeof window.IndexedDBModule.checkUserData === 'function') {
      try {
        console.log('Saving user data to IndexedDB from global function...');
        await window.IndexedDBModule.checkUserData(telegramId, data.userData);
        console.log('User data saved to IndexedDB from global function');
      } catch (dbError) {
        console.error('Failed to save user data to IndexedDB from global function:', dbError);
      }
    }
    
    console.log("Данные пользователя получены (global function):", data);
    return data.userData;
  } catch (error) {
    console.error("Ошибка при загрузке данных пользователя (global function):", error);
    if (retryCount < 2) {
      console.log(`Повторная попытка загрузки данных (${retryCount + 1}/2)...`);
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(window.RPGApp.loadUserData(retryCount + 1));
        }, 2000); // Повторная попытка через 2 секунды
      });
    } else {
      console.log("Максимальное количество попыток достигнуто");
      throw error;
    }
  }
}; 

// Добавляем глобальную функцию loadEquippedItems для загрузки экипировки
window.loadEquippedItems = async function(forceUpdate = false) {
  console.log('Вызов глобальной функции loadEquippedItems, forceUpdate:', forceUpdate);
  try {
    // Получаем telegramId из localStorage
    let telegramId = localStorage.getItem('telegramId');
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
      telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    
    if (!telegramId) {
      console.error('No telegramId found in localStorage for loadEquippedItems');
      return null;
    }
    
    // Если не требуется принудительное обновление и уже есть экипировка в глобальной переменной, используем её
    if (!forceUpdate && window.equippedItems) {
      console.log('Using cached equipped items:', window.equippedItems);
      return window.equippedItems;
    }
    
    // Проверяем наличие IndexedDB модуля
    if (window.IndexedDBModule && typeof window.IndexedDBModule.getItems === 'function') {
      try {
        const items = await window.IndexedDBModule.getItems();
        if (items && items.equipped) {
          console.log('Loaded equipped items from IndexedDB (global):', items.equipped);
          
          // Делаем экипированные предметы доступными глобально
          window.equippedItems = items.equipped;
          return items.equipped;
        }
      } catch (error) {
        console.error('Error loading equipped items from IndexedDB (global):', error);
      }
    }
    
    // Запасной вариант - загрузка с сервера через API
    const response = await fetch(addTimestamp('rpg.php?action=getEquipped'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId })
    });
    
    const data = await response.json();
    if (data.success && data.equipped) {
      console.log('Loaded equipped items from server (global):', data.equipped);
      
      // Делаем экипированные предметы доступными глобально
      window.equippedItems = data.equipped;
      
      // Сохраняем в IndexedDB, если модуль доступен
      if (window.IndexedDBModule && typeof window.IndexedDBModule.checkUserData === 'function') {
        try {
          await window.IndexedDBModule.checkUserData(telegramId, { equipped: data.equipped });
          console.log('Equipped items saved to IndexedDB (global)');
        } catch (error) {
          console.error('Error saving equipped items to IndexedDB (global):', error);
        }
      }
      
      return data.equipped;
    } else {
      console.error('Failed to load equipped items from server (global):', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error in global loadEquippedItems:', error);
    return null;
  }
}; 

// Добавляем обработчик события DOMContentLoaded для загрузки экипировки при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded: Загружаем экипировку при инициализации RPG...');
  
  // Даем небольшую задержку для уверенности, что все модули загружены
  setTimeout(async () => {
    try {
      if (window.loadEquippedItems) {
        console.log('Вызываем loadEquippedItems при загрузке страницы...');
        await window.loadEquippedItems();
        console.log('Экипировка успешно загружена при инициализации');
      } else {
        console.warn('Функция loadEquippedItems недоступна при загрузке страницы');
      }
    } catch (error) {
      console.error('Ошибка при загрузке экипировки при инициализации:', error);
    }
  }, 1000); // Задержка в 1 секунду
});

// Добавляем глобальную функцию для проверки наличия нужного оружия
window.checkRequiredWeapon = async (gatheringType) => {
  console.log(`[Global checkRequiredWeapon] Проверка оружия для типа добычи: ${gatheringType}`);
  
  // Если нет window.equippedItems, пробуем загрузить экипировку
  if (!window.equippedItems) {
    console.warn('[Global checkRequiredWeapon] window.equippedItems не найден, пробуем загрузить экипировку');
    if (window.loadEquippedItems) {
      try {
        await window.loadEquippedItems();
      } catch (error) {
        console.error('[Global checkRequiredWeapon] Ошибка при загрузке экипировки:', error);
      }
    }
    
    // Если после загрузки всё равно нет window.equippedItems
    if (!window.equippedItems) {
      console.error('[Global checkRequiredWeapon] Не удалось загрузить экипировку');
      return { hasWeapon: false, weaponName: '' };
    }
  }
  
  // Проверяем наличие оружия в слоте weapon1
  const equippedWeapon = window.equippedItems.weapon1;
  
  if (!equippedWeapon) {
    console.log('[Global checkRequiredWeapon] Отсутствует экипированное оружие');
    return { hasWeapon: false, weaponName: '' };
  }
  
  console.log(`[Global checkRequiredWeapon] Экипировано: ${equippedWeapon}`);
  
  let requiredWeapons = [];
  let weaponName = '';
  
  switch(gatheringType) {
    case 'chop':
      // Требуется топор: primaxe или axe
      requiredWeapons = ['primaxe', 'axe'];
      weaponName = 'Axe';
      break;
    case 'mine':
      // Требуется кирка: primpickaxe или pickaxe
      requiredWeapons = ['primpickaxe', 'pickaxe'];
      weaponName = 'Pickaxe';
      break;
    case 'hunt':
      // Требуется лук: primbow или bow
      requiredWeapons = ['primbow', 'bow'];
      weaponName = 'Bow';
      break;
    default:
      // Для обычного gather оружие не требуется
      return { hasWeapon: true, weaponName: '' };
  }
  
  // Проверяем точное соответствие экипированного оружия одному из требуемых идентификаторов
  const normalizedEquippedWeapon = equippedWeapon.toLowerCase().replace(/\s+/g, '');
  const hasRequiredWeapon = requiredWeapons.some(weapon => {
    const normalizedWeapon = weapon.toLowerCase().replace(/\s+/g, '');
    // Проверяем точное соответствие названия или начало строки с названием инструмента
    return normalizedEquippedWeapon === normalizedWeapon || 
           normalizedEquippedWeapon === `prim${normalizedWeapon}` ||
           normalizedEquippedWeapon === `${normalizedWeapon}s`;
  });
  
  // Для охоты дополнительно проверяем наличие ножа в инвентаре
  if (gatheringType === 'hunt' && hasRequiredWeapon) {
    console.log('[Global checkRequiredWeapon] Для охоты также требуется нож, проверяем его наличие...');
    
    try {
      // Попробуем самостоятельно проверить наличие ножа в инвентаре и экипировке
      let hasKnife = false;
      
      // Возможные идентификаторы ножа
      const knifeIds = ['knife', 'Knife', 'huntingknife', 'HuntingKnife', 'hunting_knife'];
      
      // Проверяем экипированные предметы (нож может быть экипирован в любой слот)
      if (window.equippedItems) {
        for (const slot in window.equippedItems) {
          const itemId = window.equippedItems[slot];
          if (itemId && typeof itemId === 'string' && 
              knifeIds.some(knife => itemId.toLowerCase().includes(knife.toLowerCase()))) {
            console.log('[Global checkRequiredWeapon] Найден экипированный нож:', itemId);
            hasKnife = true;
            break;
          }
        }
      }
      
      // Если нет экипированного ножа, проверяем инвентарь
      if (!hasKnife && window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
        const inventory = await window.IndexedDBModule.getInventoryItems();
        
        for (const knifeId of knifeIds) {
          const knife = inventory.find(item => 
            item.id && item.id.toLowerCase().includes(knifeId.toLowerCase()) && 
            (item.quantity > 0 || item.qty > 0)
          );
          
          if (knife) {
            console.log('[Global checkRequiredWeapon] Найден нож в инвентаре:', knife.id);
            hasKnife = true;
            break;
          }
        }
      }
      
      // Если нож не найден, возвращаем информацию о том, что нож отсутствует
      if (!hasKnife) {
        console.log('[Global checkRequiredWeapon] Нож не найден в инвентаре или экипировке');
        return { 
          hasWeapon: true, // Лук есть, можно продолжить процесс
          weaponName: weaponName,
          requiresKnife: true,
          hasKnife: false
        };
      }
      
      // Если нож найден, возвращаем информацию о наличии и лука и ножа
      console.log('[Global checkRequiredWeapon] Нож найден, все требования выполнены');
      return { 
        hasWeapon: true,
        weaponName: weaponName,
        requiresKnife: true,
        hasKnife: true
      };
    } catch (error) {
      console.error('[Global checkRequiredWeapon] Ошибка при проверке ножа:', error);
      
      // В случае ошибки, отправляем информацию о требовании ножа, но не блокируем процесс
      return { 
        hasWeapon: hasRequiredWeapon,
        weaponName: weaponName,
        requiresKnife: true 
      };
    }
  }
  
  console.log(`[Global checkRequiredWeapon] Результат проверки: ${hasRequiredWeapon ? 'Подходящее оружие экипировано' : 'Требуемое оружие не экипировано'}`);
  
  return { 
    hasWeapon: hasRequiredWeapon, 
    weaponName: weaponName
  };
}; 

// Обработчик события загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log("[RPG] DOM Content Loaded - initializing app...");
    
    // Инициализация базы данных IndexedDB
    initDB().then(() => {
        console.log("[RPG] IndexedDB initialized successfully");
        
        // Проверяем и при необходимости загружаем специальные ресурсы
        loadSpecialResourcesIfNeeded().then(success => {
            if (success) {
                console.log("[RPG] Специальные ресурсы успешно загружены или уже присутствуют в IndexedDB");
            } else {
                console.warn("[RPG] Не удалось загрузить специальные ресурсы");
            }
            
            // Продолжаем инициализацию приложения
            initializeApp();
        }).catch(error => {
            console.error("[RPG] Ошибка при загрузке специальных ресурсов:", error);
            
            // Продолжаем инициализацию приложения даже при ошибке
            initializeApp();
        });
    }).catch(error => {
        console.error("[RPG] Error initializing IndexedDB:", error);
        
        // Показываем модальное окно с ошибкой
        showErrorModal("Database Error", "Failed to initialize game database. Please refresh the page or clear your browser data.");
    });

    // ... existing code ...
}); 

// Training Notification Modal Component
const TrainingNotificationModal = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,255,255,0.18) 0%, rgba(0,0,40,0.9) 100%)',
        boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37), 0 0 16px 2px rgba(0,255,255,0.53)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '2px solid rgba(0,255,255,0.35)',
        borderTop: '2.5px solid #00fff7',
        borderBottom: '2.5px solid #00fff7',
        borderRadius: '24px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        position: 'relative',
        zIndex: 2,
        overflow: 'hidden'
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#00fff7',
          marginBottom: '15px',
          textShadow: '0 0 8px #00fff7, 0 0 2px #fff',
          letterSpacing: '1px'
        }}>
          Training Unavailable
        </div>
        <div style={{
          fontSize: '16px',
          color: '#ffffff',
          marginBottom: '20px',
          lineHeight: '1.5',
          textShadow: '0 0 4px rgba(0, 255, 255, 0.5)'
        }}>
          {message}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'linear-gradient(90deg, rgba(0,255,255,0.25) 0%, rgba(0,255,255,0.12) 100%)',
            color: '#00fff7',
            border: '2px solid #00fff7',
            borderRadius: '16px',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            boxShadow: '0 0 16px 2px rgba(0,255,255,0.53), 0 0 2px 0 #fff',
            textShadow: '0 0 8px #00fff7, 0 0 2px #fff',
            padding: '12px 32px',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            outline: 'none',
            backdropFilter: 'blur(2px)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'linear-gradient(90deg, rgba(0,255,255,0.35) 0%, rgba(0,255,255,0.18) 100%)';
            e.target.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'linear-gradient(90deg, rgba(0,255,255,0.25) 0%, rgba(0,255,255,0.12) 100%)';
            e.target.style.color = '#00fff7';
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};