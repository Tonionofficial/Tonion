// Компонент Печи (Furnace) для крафтинга
// Использует глобальные функции для получения ресурсов и данных о крафте

const { useState, useEffect, useCallback } = React;

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

// Модальное окно для добавления дров
const AddWoodModal = ({ isOpen, onClose, onAddWood, woodLogCount }) => {
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)",
        color: '#fff',
        border: "1px solid rgba(0, 255, 255, 0.4)",
        borderRadius: "15px",
        boxShadow: "0 0 30px rgba(0, 255, 255, 0.3), 0 0 15px rgba(0, 255, 255, 0.2)",
        padding: 20,
        maxWidth: '320px',
        width: '100%',
        position: 'relative'
      }}>
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          cursor: 'pointer',
          width: '24px',
          height: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: "#00fff7",
          textShadow: "0 0 5px rgba(0, 255, 255, 0.7)",
          fontSize: '18px',
          fontWeight: 'bold'
        }} onClick={onClose}>
          ✕
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: "#00fff7", textShadow: "0 0 5px rgba(0, 255, 255, 0.7)", marginBottom: '10px' }}>Refill Furnace</h3>
          <div style={{ fontSize: '16px', marginBottom: '15px' }}>
            Add <b>5 Wood Log</b> to refill your furnace.
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <img 
              src="images/rpg/woodlog.png" 
              alt="Wood Log" 
              style={{ width: '32px', height: '32px', marginRight: '10px' }} 
            />
            <div>
              <div style={{ fontWeight: 'bold' }}>Wood Log</div>
              <div style={{ color: woodLogCount >= 5 ? '#4caf50' : '#f44336' }}>
                {woodLogCount} / 5 available
              </div>
            </div>
          </div>
          
          <button 
            className="gathering-button futuristic" 
            onClick={onAddWood}
            disabled={woodLogCount < 5}
            style={{
              fontSize: '14px',
              padding: '8px 20px',
              opacity: woodLogCount < 5 ? 0.6 : 1,
              cursor: woodLogCount < 5 ? 'not-allowed' : 'pointer'
            }}
          >
            Add Wood
          </button>
        </div>
      </div>
    </div>
  );
};

// Компонент печи
const FurnaceComponent = ({ onBack }) => {
  const [resources, setResources] = useState({});
  const [hasFurnace, setHasFurnace] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [ores, setOres] = useState({});
  const [isInstallingFurnace, setIsInstallingFurnace] = useState(false);
  // --- NEW STATE ---
  const [burnEndTime, setBurnEndTime] = useState(null); // timestamp
  const [isLit, setIsLit] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false); // Изменено с true на false - состояние по умолчанию "заправлено"
  const [isStatusUnknown, setIsStatusUnknown] = useState(true); // НОВОЕ: true пока не получены реальные данные с сервера
  const [showAddWoodRecipe, setShowAddWoodRecipe] = useState(false);
  const [showAddWoodModal, setShowAddWoodModal] = useState(false); // Новое состояние для модального окна
  const [timerText, setTimerText] = useState('');
  const [isLoadingState, setIsLoadingState] = useState(true); // Новое состояние для блокировки кнопок во время загрузки
  const [isLoadingFurnaceStatus, setIsLoadingFurnaceStatus] = useState(true); // НОВОЕ: состояние загрузки статуса печи
  const [isIgniting, setIsIgniting] = useState(false); // НОВОЕ: состояние процесса поджигания для предотвращения повторных нажатий
  const telegramId = localStorage.getItem('telegramId');
  // 1. Добавляю состояния hoveredRecipe и tooltipPosition
  const [hoveredRecipe, setHoveredRecipe] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isCrafting, setIsCrafting] = useState(false);
  
  // --- Модификация: вместо craftTimers используем forceUpdate для обновления компонента ---
  const [updateCounter, setUpdateCounter] = useState(0);
  const forceUpdate = () => setUpdateCounter(prev => prev + 1);

  // Локальное состояние для таймеров, которое будет синхронизироваться с глобальным
  const [localCraftTimers, setLocalCraftTimers] = useState({});

  // Метод для сохранения активных таймеров в localStorage
  const saveTimersToLocalStorage = () => {
    try {
      if (window.activeCraftTimers) {
        localStorage.setItem('activeCraftTimers', JSON.stringify(window.activeCraftTimers));
        console.log('[Furnace] Таймеры сохранены в localStorage');
      }
    } catch (e) {
      console.error('[Furnace] Ошибка при сохранении таймеров в localStorage:', e);
    }
  };

  // Метод для загрузки активных таймеров из localStorage
  const loadTimersFromLocalStorage = () => {
    try {
      const savedTimers = localStorage.getItem('activeCraftTimers');
      if (savedTimers) {
        window.activeCraftTimers = JSON.parse(savedTimers);
        console.log('[Furnace] Таймеры загружены из localStorage:', window.activeCraftTimers);
        return true;
      }
    } catch (e) {
      console.error('[Furnace] Ошибка при загрузке таймеров из localStorage:', e);
    }
    return false;
  };

  // useEffect для инициализации таймеров при монтировании компонента
  useEffect(() => {
    // Пытаемся загрузить таймеры из localStorage, если нет из глобальной переменной
    const now = Math.floor(Date.now() / 1000);
    let hasLoadedTimers = false;
    
    // 1. Проверяем localStorage сначала
    if (loadTimersFromLocalStorage()) {
      hasLoadedTimers = true;
    }
    
    // 2. Проверяем глобальную переменную, если она есть
    if (!hasLoadedTimers && window.activeCraftTimers) {
      console.log('[Furnace] Используем существующие таймеры из глобальной переменной:', window.activeCraftTimers);
      hasLoadedTimers = true;
    }
    
    if (hasLoadedTimers && window.activeCraftTimers) {
      // Обновляем состояние локальных таймеров из window.activeCraftTimers
      const timersToAdd = {};
      
      Object.entries(window.activeCraftTimers).forEach(([itemId, session]) => {
        if (session && session.endTime && session.endTime > now) {
          const secondsLeft = session.endTime - now;
          const craftTime = session.craftTime || secondsLeft; // Используем сохраненное время крафта или оставшееся время
          
          // Добавляем таймер в локальное состояние
          timersToAdd[itemId] = {
            endTime: session.endTime,
            secondsLeft,
            craftTime,
            sessionId: session.sessionId
          };
          
          console.log(`[Furnace] Восстановлен таймер для ${itemId}, осталось ${secondsLeft}с`);
        }
      });
      
      // Обновляем состояние сразу всеми таймерами
      if (Object.keys(timersToAdd).length > 0) {
        setLocalCraftTimers(prev => ({ ...prev, ...timersToAdd }));
        console.log('[Furnace] Локальные таймеры обновлены из сохраненных данных');
      }
    }
    
    // Запускаем проверку и завершение активных крафт-сессий
    if (typeof window.checkActiveCraftingSessions === 'function') {
      window.checkActiveCraftingSessions();
    }
    
    // Создаем интервал для регулярного сохранения таймеров в localStorage
    const saveInterval = setInterval(saveTimersToLocalStorage, 5000);
    
    return () => {
      clearInterval(saveInterval);
      saveTimersToLocalStorage(); // Сохраняем при размонтировании
    };
  }, []);

  // Модифицируем startLocalTimer для сохранения времени крафта в глобальной переменной
  const startLocalTimer = (itemId, craftTime) => {
    console.log(`[Furnace] Немедленный запуск локального таймера для ${itemId}, время: ${craftTime}с`);
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + craftTime;
    
    // Обновляем локальное состояние
    setLocalCraftTimers(prev => {
      const updated = { ...prev };
      updated[itemId] = {
        endTime,
        secondsLeft: craftTime,
        craftTime // Сохраняем оригинальное время для расчета прогресса
      };
      console.log(`[Furnace] Обновленные таймеры:`, JSON.stringify(updated));
      return updated;
    });
    
    // Также обновляем глобальное состояние, включая время крафта
    window.activeCraftTimers = window.activeCraftTimers || {};
    window.activeCraftTimers[itemId] = {
      endTime,
      sessionId: null,
      craftTime  // Сохраняем время крафта для восстановления прогресса
    };
    
    // Сохраняем в localStorage сразу
    saveTimersToLocalStorage();
    
    // Принудительно обновляем компонент React, чтобы отобразить таймер
    forceUpdate();
  };

  // Метод для остановки и удаления таймера
  const stopLocalTimer = (itemId) => {
    setLocalCraftTimers(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
    
    // Удаляем из глобальной переменной
    if (window.activeCraftTimers && window.activeCraftTimers[itemId]) {
      delete window.activeCraftTimers[itemId];
    }
    
    // Сохраняем изменения
    saveTimersToLocalStorage();
  };
  
  // Обработчик завершения таймера
  const handleTimerComplete = useCallback((itemId) => {
    console.log(`[Furnace] Локальный таймер завершен для ${itemId}`);
    setLocalCraftTimers(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
    
    if (window.activeCraftTimers && window.activeCraftTimers[itemId]) {
      delete window.activeCraftTimers[itemId];
    }
    
    // Проверить завершенные сессии
    if (typeof window.checkActiveCraftingSessions === 'function') {
      window.checkActiveCraftingSessions();
    }
  }, []); // Массив зависимостей пуст, так как функция использует только стабильные сеттеры

  // 1. Создаем функцию updateTimers с useCallback на верхнем уровне компонента
  const updateTimers = useCallback(() => {
    const now = Math.floor(Date.now() / 1000);
    
    // Обновляем локальные таймеры
    setLocalCraftTimers(prev => {
      const updated = { ...prev };
      let changed = false;
      
      // Обновляем существующие таймеры
      Object.entries(updated).forEach(([itemId, timer]) => {
        if (timer.endTime > now) {
          updated[itemId] = {
            ...timer,
            secondsLeft: timer.endTime - now
          };
          changed = true;
        } else {
          // Таймер истек
          delete updated[itemId];
          handleTimerComplete(itemId);
          changed = true;
        }
      });
      
      // Синхронизируем с глобальными таймерами
      if (window.activeCraftTimers) {
        Object.entries(window.activeCraftTimers).forEach(([itemId, session]) => {
          if (session && session.endTime && !updated[itemId]) {
            const secondsLeft = session.endTime - now;
            if (secondsLeft > 0) {
              updated[itemId] = {
                endTime: session.endTime,
                secondsLeft,
                sessionId: session.sessionId
              };
              changed = true;
            }
          }
        });
      }
      
      return changed ? updated : prev;
    });
  }, [handleTimerComplete]); // Добавляем зависимость handleTimerComplete

  // useEffect для синхронизации локальных таймеров с глобальными
  useEffect(() => {
    let interval;
    
    updateTimers(); // Первый вызов сразу
    interval = setInterval(updateTimers, 1000); // Обновление раз в секунду
    
    return () => clearInterval(interval);
  }, [updateTimers]); // updateTimers стабилизирован с помощью useCallback

  // --- useEffect для добавления локальных рецептов печи в глобальный массив ---
  useEffect(() => {
    if (!window.CraftingRecipes) window.CraftingRecipes = { recipes: {} };
    if (!window.CraftingRecipes.recipes) window.CraftingRecipes.recipes = {};
    if (!Array.isArray(window.CraftingRecipes.recipes.furnace)) window.CraftingRecipes.recipes.furnace = [];
    getFurnaceRecipes().forEach(recipe => {
      if (!window.CraftingRecipes.recipes.furnace.find(r => r.id === recipe.id)) {
        window.CraftingRecipes.recipes.furnace.push(recipe);
      }
    });
  }, []);

  // useEffect для автоматического обновления ресурсов при изменении globalUserResources
  useEffect(() => {
    const updateResources = () => {
      if (window.globalUserResources) {
        console.log('[FURNACE] Обновляем локальные ресурсы из globalUserResources');
        setResources(prevResources => {
          // Создаем новый объект ресурсов, объединяя текущие и глобальные
          const updatedResources = { ...prevResources, ...window.globalUserResources };
          
          // Нормализация Iron Ore
          const ironOreVariants = ['ironore', 'Iron Ore', 'iron ore', 'IRON ORE', 'iron_ore', 'Iron_Ore', 'IRON_ORE'];
          let maxIronOreValue = 0;
          
          ironOreVariants.forEach(variant => {
            if (updatedResources[variant] !== undefined && updatedResources[variant] > maxIronOreValue) {
              maxIronOreValue = updatedResources[variant];
            }
          });
          
          if (maxIronOreValue > 0) {
            ironOreVariants.forEach(variant => {
              updatedResources[variant] = maxIronOreValue;
            });
          }
          
          return updatedResources;
        });
      }
    };
    
    // Обновляем сразу
    updateResources();
    
    // Настраиваем интервал для регулярного обновления
    const interval = setInterval(updateResources, 2000); // Проверяем каждые 2 секунды
    
    // Слушатель для события обновления инвентаря
    const handleInventoryUpdate = (event) => {
      console.log('[FURNACE] Получено событие обновления инвентаря');
      updateResources();
    };
    
    // Добавляем слушатель события
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('inventoryUpdated', handleInventoryUpdate);
      window.addEventListener('resourcesUpdated', handleInventoryUpdate);
    }
    
    return () => {
      clearInterval(interval);
      if (typeof window.removeEventListener === 'function') {
        window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
        window.removeEventListener('resourcesUpdated', handleInventoryUpdate);
      }
    };
  }, []);

  // Загрузка данных при инициализации компонента
  useEffect(() => {
    console.log('[FURNACE] Component initialized');
    loadFurnaceData();
    
    // Дополнительная проверка времени горения после загрузки данных
    const checkBurnTimeStatus = () => {
      if (telegramId && window.globalUserResources) {
        const now = Math.floor(Date.now() / 1000);
        // Выведем все ключи из globalUserResources для отладки
        console.log('[FURNACE] Диагностика: ключи в globalUserResources:', 
                    Object.keys(window.globalUserResources).filter(k => k.includes('burn') || k.includes('furnace')));
        
        // Проверяем все возможные варианты ключей для времени горения
        const possibleKeys = ['furnace_burn', 'furnaceBurn', 'furnace-burn', 'furnaceBurnTime'];
        let foundKey = null;
        let burnTime = null;
        
        for (const key of possibleKeys) {
          if (window.globalUserResources[key] !== undefined) {
            foundKey = key;
            burnTime = parseInt(window.globalUserResources[key], 10);
            console.log(`[FURNACE] Найден ключ времени горения: ${key}=${burnTime}`);
            break;
          }
        }
        
        // Стандартная проверка (furnace_burn)
        if (window.globalUserResources.furnace_burn) {
          burnTime = parseInt(window.globalUserResources.furnace_burn, 10);
          if (!isNaN(burnTime) && burnTime > now) {
            console.log(`[FURNACE] Проверка: furnace_burn=${burnTime}, осталось ${Math.floor((burnTime-now)/60)} мин.`);
            // Устанавливаем состояние "горит"
            setIsLit(true);
            setBurnEndTime(burnTime);
            setIsEmpty(false);
            setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
            console.log(`[FURNACE] Печь горит, furnace_burn=${burnTime}, осталось ${Math.floor((burnTime-now)/60)} мин.`);
            // ИСПРАВЛЕНО: Сбрасываем состояние загрузки после установки состояния с задержкой
            setTimeout(() => {
              setTimeout(() => { setIsLoadingFurnaceStatus(false); }, 1500);
              setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
            }, 1500);
            return;
          } else {
            console.log(`[FURNACE] Проверка: furnace_burn=${burnTime} (неактивно)`);
          }
        } else if (foundKey) {
          // Если стандартный ключ не найден, но найден альтернативный
          if (!isNaN(burnTime) && burnTime > now) {
            console.log(`[FURNACE] Используем альтернативный ключ ${foundKey}=${burnTime}, осталось ${Math.floor((burnTime-now)/60)} мин.`);
            setIsLit(true);
            setBurnEndTime(burnTime);
            setIsEmpty(false);
            
            const left = burnTime - now;
            if (left > 0) {
              const h = Math.floor(left / 3600);
              const m = Math.floor((left % 3600) / 60);
              setTimerText(`${h}h ${m}m left`);
            }
          }
        } else {
          console.log('[FURNACE] Проверка: furnace_burn отсутствует');
          // Попробуем загрузить свежие данные с сервера
          if (telegramId && telegramId.trim() !== '') {
            // Проверка telegramId перед запросом
            console.log(`[FURNACE] Использую telegramId для запроса: ${telegramId}`);
            
            // Используем полный путь к API
            const fetchURL = `rpg.php?action=getUserData&telegramId=${encodeURIComponent(telegramId)}`;
            console.log(`[FURNACE] Пытаемся загрузить данные с сервера: ${fetchURL}`);
            
            // Используем POST метод вместо GET
            fetch(fetchURL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ telegramId })
            })
              .then(response => {
                if (!response.ok) {
                  console.error(`[FURNACE] Ошибка HTTP: ${response.status} ${response.statusText} при запросе ${fetchURL}`);
                  return response.text().then(text => {
                    console.error("[FURNACE] Тело ответа сервера (ошибка):", text);
                    throw new Error(`HTTP error ${response.status}`); 
                  });
                }
                return response.json();
              })
              .then(data => {
                if (data.success && data.userData) {
                  console.log('[FURNACE] Получены свежие данные с сервера:', 
                             Object.keys(data.userData).filter(k => k.includes('burn') || k.includes('furnace')));
                  
                  // Если нашли время горения в свежих данных
                  if (data.userData.furnace_burn) {
                    const serverBurnTime = parseInt(data.userData.furnace_burn, 10);
                    console.log(`[FURNACE] Найдено время на сервере: furnace_burn=${serverBurnTime}`);
                    
                    // Обновляем глобальные данные
                    if (window.globalUserResources) {
                      window.globalUserResources.furnace_burn = serverBurnTime;
                    }
                    
                    // Если время действительно
                    if (!isNaN(serverBurnTime) && serverBurnTime > now) {
                      setIsLit(true);
                      setBurnEndTime(serverBurnTime);
                      setIsEmpty(false);
                      
                      const left = serverBurnTime - now;
                      if (left > 0) {
                        const h = Math.floor(left / 3600);
                        const m = Math.floor((left % 3600) / 60);
                        setTimerText(`${h}h ${m}m left`);
                      }
                    }
                  } else {
                    console.log('[FURNACE] furnace_burn отсутствует в свежих данных с сервера.');
                  }
                } else {
                  console.log('[FURNACE] Запрос успешен, но данные не получены или data.success=false. Ответ сервера:', data);
                }
              })
              .catch(error => {
                console.error('[FURNACE] Ошибка получения или обработки данных с сервера:', error);
              });
          }
        }
      }
    };
    
    // Выполняем проверку через небольшую задержку, чтобы дать время загрузке данных
    const timer = setTimeout(checkBurnTimeStatus, 500);
    
    // Логируем при размонтировании компонента
    return () => {
      console.log('[FURNACE] Component unmounted');
      clearTimeout(timer);
    };
  }, [telegramId]);

  // --- Таймер обновления ---
  useEffect(() => {
    let interval;
    if (isLit && burnEndTime) {
      interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const left = burnEndTime - now;
        if (left > 0) {
          const h = Math.floor(left / 3600);
          const m = Math.floor((left % 3600) / 60);
          setTimerText(`${h}h ${m}m left`);
        } else {
          // Печь потухла
          setIsLit(false);
          setIsEmpty(true);
          setBurnEndTime(null);
          setTimerText('');
          
          // Обновляем статус furnace=1 (потухла, пустая)
          if (telegramId) {
            fetch('rpg.php?action=updateUserBoolean', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                telegramId, 
                column: 'furnace', 
                value: 1 // Потухла, пустая
              })
            }).then(() => {
              // Обновляем глобальные данные
              if (window.globalUserResources) {
                window.globalUserResources.furnace = 1;
              }
              console.log('[FURNACE] Время горения истекло, статус обновлен на "пустая" (1)');
            }).catch(e => {
              console.error('[FURNACE] Ошибка обновления статуса печи при потухании:', e);
            });
          }
        }
      }, 1000 * 60); // Проверка каждую минуту
      
      // Первое обновление сразу
      const now = Math.floor(Date.now() / 1000);
      const left = burnEndTime - now;
      if (left > 0) {
        const h = Math.floor(left / 3600);
        const m = Math.floor((left % 3600) / 60);
        setTimerText(`${h}h ${m}m left`);
      }
    }
    return () => interval && clearInterval(interval);
  }, [isLit, burnEndTime, telegramId]);

  // --- Проверка состояния при загрузке ---
  useEffect(() => {
    if (hasFurnace && telegramId) {
      const now = Math.floor(Date.now() / 1000);
      
      console.log(`[FURNACE] Проверка состояния при загрузке. Состояние globalUserResources.furnace:`, 
                 window.globalUserResources && window.globalUserResources.furnace, 
                 typeof (window.globalUserResources && window.globalUserResources.furnace));
      
      // ИСПРАВЛЕНО: Устанавливаем состояние загрузки статуса печи
      setIsLoadingFurnaceStatus(true);
      
      // Проверяем время горения
      if (window.globalUserResources && window.globalUserResources.furnace_burn) {
        const end = parseInt(window.globalUserResources.furnace_burn, 10);
        // Проверяем, что значение существует и является числом
        if (!isNaN(end) && end > now) {
          // Печь горит - таймер не истек
          setIsLit(true);
          setBurnEndTime(end);
          setIsEmpty(false);
          console.log(`[FURNACE] Печь горит, furnace_burn=${end}, осталось ${Math.floor((end-now)/60)} мин.`);
          // ИСПРАВЛЕНО: Сбрасываем состояние загрузки после установки состояния
          setTimeout(() => { setIsLoadingFurnaceStatus(false); }, 1500);
          return;
        } else if (!isNaN(end)) {
          // Таймер истек, нужно проверить статус furnace
          console.log(`[FURNACE] Время горения печи истекло: furnace_burn=${end}, time=${now}`);
        }
      }
      
      // Проверяем статус печи - используем стандартный запрос getUserData
      console.log('[FURNACE] Проверка состояния установленной печи');
      
      // Делаем явный запрос к серверу для получения данных пользователя
      if (telegramId) {
        // Используем стандартный эндпоинт getUserData вместо несуществующего getUserCraftingStations
        fetch(`rpg.php?action=getUserData&telegramId=${encodeURIComponent(telegramId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success && data.userData) {
            console.log('[FURNACE] Получены данные пользователя:', 
                       Object.keys(data.userData).filter(k => k.includes('furnace')));
            
            // Проверяем наличие информации о печи в userData
            let furnaceStatus = data.userData.furnace || null;
            let furnaceBurn = data.userData.furnace_burn || null;
            
            // Если furnaceStatus строка, преобразуем в число
            if (typeof furnaceStatus === 'string') {
              furnaceStatus = parseInt(furnaceStatus, 10);
            } else if (typeof furnaceStatus === 'boolean' && furnaceStatus === true) {
              furnaceStatus = 2; // Если boolean true, считаем, что заправлена
            }
            
            // Проверяем истекло ли время горения для статуса 3
            if (furnaceStatus === 3 && furnaceBurn) {
              const currentTime = Math.floor(Date.now() / 1000);
              const burnTime = parseInt(furnaceBurn, 10);
              
              if (burnTime < currentTime) {
                console.log(`[FURNACE] Время горения истекло: ${burnTime} < ${currentTime}, меняем статус на 1 (потухла)`);
                furnaceStatus = 1;
                
                // Обновляем статус на сервере
                fetch('rpg.php?action=updateUserBoolean', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    telegramId, 
                    column: 'furnace', 
                    value: 1 // Потухла, пустая
                  })
                }).then(response => {
                  if (response.ok) {
                    console.log('[FURNACE] Статус печи обновлен на сервере на "потухла" (1)');
                    if (window.globalUserResources) {
                      window.globalUserResources.furnace = 1;
                    }
                  }
                }).catch(e => {
                  console.error('[FURNACE] Ошибка обновления статуса печи:', e);
                });
              }
            }
            
            console.log(`[FURNACE] Статус печи из запроса: ${furnaceStatus}, тип: ${typeof furnaceStatus}, время горения: ${furnaceBurn}`);
            
            // Теперь проверяем по полученному значению
            if (furnaceStatus === 3) {
              // Статус 3 = печь горит (новое значение)
              console.log('[FURNACE] Печь имеет статус 3 - горит');
              setIsLit(true);
              setIsEmpty(false);
              setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
              
              // Если нет времени горения - устанавливаем дефолтное (текущее + 8 часов)
              if (!(window.globalUserResources && window.globalUserResources.furnace_burn) && furnaceBurn) {
                setBurnEndTime(parseInt(furnaceBurn, 10));
                console.log(`[FURNACE] Получено время горения из запроса: ${furnaceBurn}`);
              } else if (!(window.globalUserResources && window.globalUserResources.furnace_burn)) {
                const defaultEndTime = now + 8 * 3600;
                setBurnEndTime(defaultEndTime);
                console.log(`[FURNACE] Установлено стандартное время горения: ${defaultEndTime}`);
              }
            } else if (furnaceStatus === 2) { 
              console.log('[FURNACE] Печь имеет статус 2 - заправлена');
              
              // По умолчанию печь не горит при статусе 2
              setIsLit(false);
              setBurnEndTime(null);
              setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
              
              // Проверяем, есть ли истекшее время горения
              if (furnaceBurn && parseInt(furnaceBurn, 10) < now) {
                // Печь потухла - показываем кнопку Add Wood и меняем статус на 1
                setIsEmpty(true);
                console.log('[FURNACE] Печь потухла, нужно добавить дрова (furnace=2, furnace_burn < now)');
                
                // Обновляем статус на сервере на 1 (пустая)
                fetch('rpg.php?action=updateUserBoolean', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    telegramId, 
                    column: 'furnace', 
                    value: 1 // Потухла, пустая
                  })
                }).then(response => {
                  if (response.ok) {
                    console.log('[FURNACE] Статус печи обновлен на сервере на "пустая" (1)');
                    if (window.globalUserResources) {
                      window.globalUserResources.furnace = 1;
                    }
                  }
                }).catch(e => {
                  console.error('[FURNACE] Ошибка обновления статуса печи:', e);
                });
              } else {
                // Печь заправлена и готова к поджиганию (furnace_burn=null или отсутствует)
                setIsEmpty(false);
                console.log('[FURNACE] Печь заправлена и готова к поджиганию (furnace=2, furnace_burn=null)');
              }
            } else if (furnaceStatus === 1) { 
              // Статус 1 - печь пуста
              setIsLit(false);
              setBurnEndTime(null);
              setIsEmpty(true);
              setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
              console.log('[FURNACE] Печь пуста (furnace=1)');
            } else {
              // Печь не установлена
              setHasFurnace(false);
              setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
              console.log('[FURNACE] Печь не установлена');
            }
          } else {
            console.log('[FURNACE] Не удалось получить данные пользователя или userData пуст', data);
            // Используем резервную логику с проверкой через globalUserResources (может быть неточно)
            checkFurnaceStatusFromGlobalResources();
          }
          
          // ИСПРАВЛЕНО: Сбрасываем состояние загрузки статуса печи после получения данных с сервера
          setTimeout(() => { setIsLoadingFurnaceStatus(false); }, 1500);
        })
        .catch(error => {
          console.error('[FURNACE] Ошибка при запросе данных пользователя:', error);
          // Используем резервную логику с проверкой через globalUserResources (может быть неточно)
          checkFurnaceStatusFromGlobalResources();
          
          // ИСПРАВЛЕНО: Сбрасываем состояние загрузки статуса печи и при ошибке с задержкой
          setTimeout(() => {
            setTimeout(() => { setIsLoadingFurnaceStatus(false); }, 1500);
            setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
          }, 1500);
        });
      } else {
        // Если нет telegramId, используем резервную логику
        checkFurnaceStatusFromGlobalResources();
      }
      
      // Резервная функция для проверки статуса через globalUserResources
      function checkFurnaceStatusFromGlobalResources() {
        console.log('[FURNACE] Используем резервный метод проверки статуса печи через globalUserResources');
        
        // Сначала проверим специальное поле, если оно есть
        if (window.globalUserResources && window.globalUserResources.furnaceStatus !== undefined) {
          const status = Number(window.globalUserResources.furnaceStatus);
          console.log(`[FURNACE] Найдено отдельное поле furnaceStatus = ${status}`);
          
          if (status === 3) {
            setIsLit(true);
            setIsEmpty(false);
          } else if (status === 2) {
        setIsLit(false);
        setBurnEndTime(null);
          setIsEmpty(false);
          } else if (status === 1) {
            setIsLit(false);
            setBurnEndTime(null);
            setIsEmpty(true);
        } else {
            setHasFurnace(false);
          }
          setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
        } 
        // В противном случае пробуем проверить через globalUserResources.furnace,
        // но это может быть не точно, так как может быть количеством в инвентаре
        else if (window.craftingInstallations && window.craftingInstallations.furnace !== undefined) {
          const isInstalled = window.craftingInstallations.furnace === true;
          console.log(`[FURNACE] Печь ${isInstalled ? "установлена" : "не установлена"} согласно craftingInstallations`);
          
          if (isInstalled) {
            // Печь установлена, но статус неизвестен - устанавливаем заправленной по умолчанию
            setIsLit(false);
            setBurnEndTime(null);
          setIsEmpty(false);
          } else {
            setHasFurnace(false);
          }
        } else {
          // Отсутствуют данные - по умолчанию считаем, что печь не установлена
          setHasFurnace(false);
          console.log('[FURNACE] Нет данных о состоянии печи, считаем что она не установлена');
        }
        
        // ИСПРАВЛЕНО: Сбрасываем состояние загрузки статуса и в резервном методе с задержкой
        setTimeout(() => {
          setTimeout(() => { setIsLoadingFurnaceStatus(false); }, 1500);
          setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
        }, 1500);
      }
    } else {
      // ИСПРАВЛЕНО: Если печь не установлена, сразу сбрасываем состояние загрузки с задержкой
      setTimeout(() => {
        setTimeout(() => { setIsLoadingFurnaceStatus(false); }, 1500);
        setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
      }, 1500);
    }
  }, [hasFurnace, telegramId]);

  // --- useEffect для загрузки и обновления activeCraftTimers ---
  useEffect(() => {
    const telegramId = localStorage.getItem('telegramId');
    if (!telegramId) return;
    
    const fetchActiveCrafts = async () => {
      try {
        const res = await fetch(`rpg.php?action=getActiveCraftingSessions&telegramId=${telegramId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.activeCraftingSessions)) {
          const timers = {};
          const now = Math.floor(Date.now() / 1000);
          data.activeCraftingSessions.forEach(session => {
            if (session.status === 'active' && session.end_time > now) {
              timers[session.item_id || session.itemId] = {
                endTime: session.end_time,
                sessionId: session.id
              };
            }
          });
          
          // Проверяем, есть ли изменения, перед обновлением
          let hasChanges = false;
          const currentTimers = window.activeCraftTimers || {};
          
          // Проверяем новые или измененные таймеры
          Object.entries(timers).forEach(([key, value]) => {
            if (!currentTimers[key] || currentTimers[key].endTime !== value.endTime) {
              hasChanges = true;
            }
          });
          
          // Проверяем удаленные таймеры
          Object.keys(currentTimers).forEach(key => {
            if (!timers[key]) {
              hasChanges = true;
            }
          });
          
          // Обновляем только если есть изменения
          if (hasChanges) {
          // merge timers into window.activeCraftTimers, не стирая локальные таймеры
          window.activeCraftTimers = window.activeCraftTimers || {};
          Object.entries(timers).forEach(([key, value]) => {
            window.activeCraftTimers[key] = value;
          });
          // удаляем неактуальные таймеры
          Object.keys(window.activeCraftTimers).forEach(key => {
            if (!timers[key]) delete window.activeCraftTimers[key];
          });
            // console.log('[Furnace] window.activeCraftTimers обновлены:', window.activeCraftTimers);
          }
        }
      } catch (e) {}
    };
    
    fetchActiveCrafts();
    const interval = setInterval(fetchActiveCrafts, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- Проверка и завершение крафт-сессий при монтировании ---
  useEffect(() => {
    if (typeof window.checkActiveCraftingSessions === 'function') {
      window.checkActiveCraftingSessions();
    }
    
    // Немедленно инициализируем таймеры из существующей глобальной переменной
    if (window.activeCraftTimers) {
      const now = Math.floor(Date.now() / 1000);
      const timers = {};
      Object.entries(window.activeCraftTimers).forEach(([itemId, session]) => {
        if (session && session.endTime) {
          const left = session.endTime - now;
          if (left > 0) {
            timers[itemId] = left;
          }
        }
      });
      if (Object.keys(timers).length > 0) {
        console.log('[Furnace] Таймеры инициализированы напрямую:', timers);
      }
    }
  }, []);

  // Функция установки печи (записывает в БД что пользователь установил печь)
  const installFurnace = async () => {
    try {
      console.log('[FURNACE] Attempting to install furnace...');
      setIsInstallingFurnace(true);
      
      // Получаем Telegram ID пользователя
      const telegramId = localStorage.getItem('telegramId');
      if (!telegramId) {
        console.error('[FURNACE] Telegram ID is missing in localStorage');
        setIsInstallingFurnace(false);
        return false;
      }
      
      // ИСПРАВЛЕНО: Улучшенная проверка наличия печи в инвентаре
      let hasFurnaceInInventory = false;
      
      // Способ 1: Проверяем через globalResourceLoader
      if (window.globalResourceLoader && typeof window.globalResourceLoader === 'function') {
        try {
          const result = await window.globalResourceLoader();
          const userResources = result.resources || result || {};
          console.log('[FURNACE] Ресурсы пользователя:', userResources);
          
          // Проверяем все возможные варианты написания печи
          const furnaceVariants = ['furnace', 'Furnace', 'FURNACE'];
          for (const variant of furnaceVariants) {
            if (userResources[variant] && parseInt(userResources[variant], 10) > 0) {
              hasFurnaceInInventory = true;
              console.log(`[FURNACE] Найдена печь в инвентаре: ${variant} = ${userResources[variant]}`);
              break;
            }
          }
        } catch (error) {
          console.error('[FURNACE] Ошибка при проверке через globalResourceLoader:', error);
        }
      }
      
      // Способ 2: Проверяем через прямой запрос к серверу (если первый способ не сработал)
      if (!hasFurnaceInInventory) {
        try {
          console.log('[FURNACE] Проверяем инвентарь через прямой запрос к серверу...');
          const response = await fetch(`rpg.php?action=getUserData&t=${Date.now()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId })
          });
          const data = await response.json();
          if (data.success && data.userData && data.userData.resources) {
            const serverResources = data.userData.resources;
            console.log('[FURNACE] Ресурсы с сервера:', serverResources);
            
            // Проверяем все возможные варианты написания печи
            const furnaceVariants = ['furnace', 'Furnace', 'FURNACE'];
            for (const variant of furnaceVariants) {
              if (serverResources[variant] && parseInt(serverResources[variant], 10) > 0) {
                hasFurnaceInInventory = true;
                console.log(`[FURNACE] Найдена печь в серверных ресурсах: ${variant} = ${serverResources[variant]}`);
                break;
              }
            }
          }
        } catch (error) {
          console.error('[FURNACE] Ошибка при проверке через прямой запрос:', error);
        }
      }
      
      // Способ 3: Проверяем через IndexedDB (если предыдущие способы не сработали)
      if (!hasFurnaceInInventory && window.getRPGdb) {
        try {
          console.log('[FURNACE] Проверяем инвентарь через IndexedDB...');
          const db = await window.getRPGdb();
          const tx = db.transaction('inventory', 'readonly');
          const store = tx.objectStore('inventory');
          const item = await store.get('furnace');
          if (item && item.quantity > 0) {
            hasFurnaceInInventory = true;
            console.log(`[FURNACE] Найдена печь в IndexedDB: quantity = ${item.quantity}`);
          }
          await tx.done;
        } catch (error) {
          console.error('[FURNACE] Ошибка при проверке через IndexedDB:', error);
        }
      }
      
      if (!hasFurnaceInInventory) {
        console.log('[FURNACE] User does not have a furnace in inventory');
        setIsInstallingFurnace(false);
        alert('You need to craft a furnace first');
        return false;
      }
      
      console.log('[FURNACE] Печь найдена в инвентаре, продолжаем установку...');
      
      // Отправляем запрос на сервер для установки печи в отдельной колонке 'furnace'
      // Значение 2 означает, что печь установлена и заправлена
      const timestamp = new Date().getTime();
      const response = await fetch(`rpg.php?action=updateUserBoolean&t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          telegramId, 
          column: 'furnace',
          value: 2 // Устанавливаем значение 2 (установлена и заправлена)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[FURNACE] Furnace successfully installed');
        setHasFurnace(true);
        
        // Обновляем инвентарь: уменьшаем furnace на 1 в базе данных
        try {
          const inventoryUpdateResponse = await fetch('rpg.php?action=updateUserInventoryItem', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              telegramId,
              itemId: 'furnace',
              quantity: -1,
              operation: 'increment'
            })
          });
          if (inventoryUpdateResponse.ok) {
            console.log('[FURNACE] Inventory updated: furnace set to -1');
          } else {
            console.error('[FURNACE] Failed to update inventory: furnace to -1');
          }
        } catch (inventoryError) {
          console.error('[FURNACE] Error updating inventory:', inventoryError);
        }

        // --- Update local IndexedDB inventory (if available) ---
        if (window.getRPGdb) {
          try {
            const db = await window.getRPGdb();
            const tx = db.transaction('inventory', 'readwrite');
            const store = tx.objectStore('inventory');
            const item = await store.get('furnace');
            if (item && item.quantity > 0) {
              item.quantity -= 1;
              if (item.quantity > 0) {
                await store.put(item);
                console.log('[FURNACE] IndexedDB: furnace -1, осталось', item.quantity);
              } else {
                await store.delete('furnace');
                console.log('[FURNACE] IndexedDB: furnace удалён (0 осталось)');
              }
            } else {
              console.log('[FURNACE] IndexedDB: furnace не найден или уже 0');
            }
            await tx.done;
          } catch (e) {
            console.error('[FURNACE] Ошибка при обновлении IndexedDB:', e);
          }
        }

        // --- Синхронизация глобальных ресурсов и UI (всегда!) ---
        let updatedResources = { ...window.globalUserResources };
        if (typeof updatedResources.furnace === 'number' && updatedResources.furnace > 0) {
          updatedResources.furnace -= 1;
          if (updatedResources.furnace < 0) updatedResources.furnace = 0;
        }
        if (window.saveResourcesForModals) {
          window.saveResourcesForModals(updatedResources);
        } else {
          window.globalUserResources = { ...updatedResources };
        }
        console.log('[FURNACE] globalUserResources.furnace теперь:', updatedResources.furnace);
        if (window.forceUpdateUI) {
          await window.forceUpdateUI();
        }
        
        // Обновляем глобальную переменную craftingInstallations
        if (window.craftingInstallations) {
          window.craftingInstallations.furnace = true;
          console.log('[FURNACE] Updated global variable craftingInstallations.furnace =', window.craftingInstallations.furnace);
        }
        
        // Состояние "заправленный" уже установлено на сервере (furnace = 2)
        console.log('[FURNACE] Initial state set as installed and filled on server (value=2)');
        
        // Перезагружаем данные
        await loadFurnaceData();
        
        setIsInstallingFurnace(false);
        return true;
      } else {
        console.error('[FURNACE] Error installing furnace:', data.message);
        setIsInstallingFurnace(false);
        alert(`Failed to install furnace: ${data.message || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('[FURNACE] Error installing furnace:', error);
      console.error('[FURNACE] Error stack:', error.stack);
      setIsInstallingFurnace(false);
      alert(`Error installing furnace: ${error.message}`);
      return false;
    }
  };

  // Функция загрузки данных о печи и ресурсах
  const loadFurnaceData = async () => {
    try {
      setIsLoading(true);
      // ИСПРАВЛЕНО: Сбрасываем isLoadingState в начале загрузки
      setIsLoadingState(true);
      
      if (window.globalResourceLoader && typeof window.globalResourceLoader === 'function') {
        const result = await window.globalResourceLoader();
        const userResources = result.resources || {};
        
        // Улучшенная нормализация ресурсов - находим самое большое значение для всех вариантов написания Iron Ore
        const ironOreVariants = ['ironore', 'Iron Ore', 'iron ore', 'IRON ORE', 'iron_ore', 'Iron_Ore', 'IRON_ORE'];
        let maxIronOreValue = 0;
        
        // Находим максимальное значение
        ironOreVariants.forEach(variant => {
          if (userResources[variant] !== undefined && userResources[variant] > maxIronOreValue) {
            maxIronOreValue = userResources[variant];
          }
        });
        
        // Если нашли хотя бы один вариант, устанавливаем все варианты на это значение
        if (maxIronOreValue > 0) {
          ironOreVariants.forEach(variant => {
            userResources[variant] = maxIronOreValue;
            // Обновляем также глобальную переменную
              window.globalUserResources[variant] = maxIronOreValue;
            });
          console.log(`[Furnace] Установили максимальное значение ${maxIronOreValue} для всех вариантов ironore (из globalUserResources)`);
        }
        
        setResources(userResources);
        console.log('[Furnace] Загруженные ресурсы из globalUserResources:', userResources);
        
        // ИСПРАВЛЕНО: Проверяем статус установки печи через userData, а не через инвентарь
        let hasFurnaceInstalled = false;
        if (window.checkCraftingInstallation && typeof window.checkCraftingInstallation === 'function') {
          hasFurnaceInstalled = window.checkCraftingInstallation('furnace');
          console.log(`[Furnace] Проверка через checkCraftingInstallation: ${hasFurnaceInstalled}`);
        } else {
          // Проверяем статус установки через userData, а не через инвентарь
          const telegramId = localStorage.getItem('telegramId');
          if (telegramId) {
            try {
              const response = await fetch(`rpg.php?action=getUserData&t=${Date.now()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId })
              });
              const data = await response.json();
              if (data.success && data.userData) {
                const furnaceStatus = data.userData.furnace;
                // Печь установлена, если статус 1, 2, 3 или true (любое значение кроме null/undefined/0/false)
                hasFurnaceInstalled = furnaceStatus !== null && furnaceStatus !== undefined && furnaceStatus !== 0 && furnaceStatus !== false;
                console.log(`[Furnace] Статус печи из userData: ${furnaceStatus}, установлена: ${hasFurnaceInstalled}`);
              } else {
                console.log('[Furnace] Не удалось получить userData, считаем печь не установленной');
                hasFurnaceInstalled = false;
              }
            } catch (error) {
              console.error('[Furnace] Ошибка проверки статуса печи:', error);
              hasFurnaceInstalled = false;
            }
          } else {
            console.log('[Furnace] telegramId отсутствует, считаем печь не установленной');
            hasFurnaceInstalled = false;
          }
        }
        setHasFurnace(hasFurnaceInstalled);
        
        // Отфильтровываем руды и обрабатываем все возможные варианты названия
        const userOres = {};
        const knownOres = ['ironore', 'copperore', 'goldore', 'silverore', 'iron ore', 'Iron Ore'];
        
        Object.entries(userResources).forEach(([key, value]) => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.endsWith('ore') || knownOres.includes(lowerKey)) {
            userOres[key] = value;
            
            // Если это железная руда, добавляем все варианты
            if (lowerKey === 'ironore' || lowerKey === 'iron ore') {
              userOres.ironore = value;
              userOres['Iron Ore'] = value;
              userOres['iron ore'] = value;
            }
          }
        });
        
        setOres(userOres);
        console.log('[Furnace] Обнаруженные руды:', userOres);
        
      } else if (window.globalUserResources) {
        let hasFurnaceInstalled = false;
        if (window.checkCraftingInstallation && typeof window.checkCraftingInstallation === 'function') {
          hasFurnaceInstalled = window.checkCraftingInstallation('furnace');
          console.log(`[Furnace] Проверка через checkCraftingInstallation (ветка else): ${hasFurnaceInstalled}`);
        } else {
          // ИСПРАВЛЕНО: Проверяем статус установки через userData, а не через инвентарь
          const telegramId = localStorage.getItem('telegramId');
          if (telegramId) {
            try {
              const response = await fetch(`rpg.php?action=getUserData&t=${Date.now()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId })
              });
              const data = await response.json();
              if (data.success && data.userData) {
                const furnaceStatus = data.userData.furnace;
                // Печь установлена, если статус 1, 2, 3 или true (любое значение кроме null/undefined/0/false)
                hasFurnaceInstalled = furnaceStatus !== null && furnaceStatus !== undefined && furnaceStatus !== 0 && furnaceStatus !== false;
                console.log(`[Furnace] Статус печи из userData (ветка else): ${furnaceStatus}, установлена: ${hasFurnaceInstalled}`);
              } else {
                console.log('[Furnace] Не удалось получить userData (ветка else), считаем печь не установленной');
                hasFurnaceInstalled = false;
              }
            } catch (error) {
              console.error('[Furnace] Ошибка проверки статуса печи (ветка else):', error);
              hasFurnaceInstalled = false;
            }
          } else {
            console.log('[Furnace] telegramId отсутствует (ветка else), считаем печь не установленной');
            hasFurnaceInstalled = false;
          }
        }
        setHasFurnace(hasFurnaceInstalled);
        
        // Получаем ресурсы из глобальной переменной
        const userResources = window.globalUserResources || {};
        
        // Улучшенная нормализация ресурсов - находим самое большое значение для всех вариантов написания Iron Ore
        const ironOreVariants = ['ironore', 'Iron Ore', 'iron ore', 'IRON ORE', 'iron_ore', 'Iron_Ore', 'IRON_ORE'];
        let maxIronOreValue = 0;
        
        // Находим максимальное значение
        ironOreVariants.forEach(variant => {
          if (userResources[variant] !== undefined && userResources[variant] > maxIronOreValue) {
            maxIronOreValue = userResources[variant];
          }
        });
        
        // Если нашли хотя бы один вариант, устанавливаем все варианты на это значение
        if (maxIronOreValue > 0) {
          ironOreVariants.forEach(variant => {
            userResources[variant] = maxIronOreValue;
            // Обновляем также глобальную переменную
            window.globalUserResources[variant] = maxIronOreValue;
          });
          console.log(`[Furnace] Установили максимальное значение ${maxIronOreValue} для всех вариантов ironore (из globalUserResources)`);
        }
        
        setResources(userResources);
        
        // Отфильтровываем руды и обрабатываем все возможные варианты названия
        const userOres = {};
        const knownOres = ['ironore', 'copperore', 'goldore', 'silverore', 'iron ore', 'Iron Ore'];
        
        Object.entries(userResources).forEach(([key, value]) => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.endsWith('ore') || knownOres.includes(lowerKey)) {
            userOres[key] = value;
            
            // Если это железная руда, добавляем все варианты
            if (lowerKey === 'ironore' || lowerKey === 'iron ore') {
              userOres.ironore = value;
              userOres['Iron Ore'] = value;
              userOres['iron ore'] = value;
            }
          }
        });
        
        setOres(userOres);
        console.log('[Furnace] Обнаруженные руды из globalUserResources:', userOres);
      } else {
        setHasFurnace(false);
        setResources({});
        setOres({});
      }
      
      // --- Используем только локальные рецепты ---
      setRecipes(getFurnaceRecipes());
      console.log('[Furnace] Установлены рецепты:', getFurnaceRecipes());
      
      setIsLoading(false);
      
      // ИСПРАВЛЕНО: Всегда сбрасываем isLoadingState после загрузки данных
      setTimeout(() => {
        setTimeout(() => { setIsLoadingState(false); }, 1500);
        console.log('[Furnace] isLoadingState сброшено после успешной загрузки данных');
      }, 100);
      
    } catch (error) {
      console.error('[Furnace] Ошибка загрузки данных:', error);
      setHasFurnace(false);
      setResources({});
      setOres({});
      setIsLoading(false);
      
      // ИСПРАВЛЕНО: Сбрасываем isLoadingState даже при ошибке
      setTimeout(() => {
        setTimeout(() => { setIsLoadingState(false); }, 1500);
        console.log('[Furnace] isLoadingState сброшено после ошибки загрузки данных');
      }, 100);
    }
  };

  // --- Рецепты для furnace ---
  function getFurnaceRecipes() {
    return [
      {
        id: 'ironingot',
        name: 'Iron Ingot',
        description: 'A bar of refined iron. Used for advanced crafting.',
        category: 'metal',
        materials: { IronOre: 2 },
        result: { ironingot: 1 },
        craftTime: 600, 
        unlockLevel: 1,
        type: 'recipe'
      }
    ];
  }

  // --- Функция обработки плавки в печи с немедленным запуском таймера
  const handleSmelt = async (recipe) => {
    const telegramId = localStorage.getItem('telegramId');
    if (!telegramId) {
      alert('Telegram ID not found');
      return;
    }
    
    // Немедленно запускаем локальный таймер
    const craftTime = recipe.craftTime || 60;
    startLocalTimer(recipe.id, craftTime);
    
    // Отправляем запрос на сервер
    try {
      const response = await fetch('rpg.php?action=craftItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          itemId: recipe.id,
          itemName: recipe.name,
          quantity: 1,
          materials: JSON.stringify(recipe.materials),
          craftTime: craftTime
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Обновляем sessionId если сервер вернул
        if (data.sessionId && window.activeCraftTimers && window.activeCraftTimers[recipe.id]) {
          window.activeCraftTimers[recipe.id].sessionId = data.sessionId;
          
          // Обновляем также локальный таймер
          setLocalCraftTimers(prev => ({
            ...prev,
            [recipe.id]: {
              ...prev[recipe.id],
              sessionId: data.sessionId
            }
          }));
        }
      } else {
        // Если ошибка - удаляем таймер
        setLocalCraftTimers(prev => {
          const updated = { ...prev };
          delete updated[recipe.id];
          return updated;
        });
        
        if (window.activeCraftTimers && window.activeCraftTimers[recipe.id]) {
          delete window.activeCraftTimers[recipe.id];
        }
        
        alert(`Failed to start crafting: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      // Если ошибка - удаляем таймер
      setLocalCraftTimers(prev => {
        const updated = { ...prev };
        delete updated[recipe.id];
        return updated;
      });
      
      if (window.activeCraftTimers && window.activeCraftTimers[recipe.id]) {
        delete window.activeCraftTimers[recipe.id];
      }
      
      alert(`Error: ${error.message}`);
    }
  };

  // --- Функция поджечь печь ---
  const handleIgnite = async () => {
    // ИСПРАВЛЕНО: Блокируем повторные вызовы если уже идет поджигание или печь уже горит
    if (isIgniting) {
      console.log('[FURNACE] Поджигание уже в процессе, игнорируем повторный вызов');
      return;
    }
    
    if (isLit) {
      console.log('[FURNACE] Печь уже горит, игнорируем попытку поджечь снова');
      return;
    }
    
    console.log('[FURNACE] Начинаем процесс поджигания печи');
    setIsIgniting(true);
    
    const now = Math.floor(Date.now() / 1000);
    const end = now + 8 * 3600; // 8 часов
    
    if (telegramId) {
      try {
        // 1. Сначала проверяем текущий статус печи на сервере для дополнительной безопасности
        const checkResponse = await fetch(`rpg.php?action=getUserData&t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId })
        });
        
        const checkData = await checkResponse.json();
        if (checkData.success && checkData.userData) {
          const currentFurnaceStatus = checkData.userData.furnace;
          const currentBurnTime = checkData.userData.furnace_burn;
          
          // Проверяем, что печь не горит уже на сервере
          if (currentFurnaceStatus === 3 && currentBurnTime && parseInt(currentBurnTime, 10) > now) {
            console.log('[FURNACE] Печь уже горит на сервере, отменяем поджигание');
            setIsIgniting(false);
            
            // Обновляем локальное состояние согласно серверу
            setIsLit(true);
            setBurnEndTime(parseInt(currentBurnTime, 10));
            setIsEmpty(false);
            return;
          }
        }
        
        // 2. Обновляем статус печи на "горит" (значение 3)
        await fetch('rpg.php?action=updateUserBoolean', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            telegramId, 
            column: 'furnace', 
            value: 3 // Горит
          })
        }).then(response => {
          if (response.ok) {
            console.log('[FURNACE] Статус печи обновлен на "горит" (3)');
            // Обновляем глобальную переменную
            if (window.globalUserResources) {
              window.globalUserResources.furnace = 3;
            }
          }
        });
        
        // 3. Обновляем время горения
        await fetch('rpg.php?action=updateBurnTime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            telegramId, 
            column: 'furnace_burn', 
            value: end 
          })
        });
        
        // 4. Обновляем локальное состояние только после успешного обновления на сервере
        setIsLit(true);
        setBurnEndTime(end);
        setIsEmpty(false);
        
        // 5. Обновляем глобальные данные
        if (window.globalUserResources) {
          window.globalUserResources.furnace_burn = end;
        }
        
        console.log(`[FURNACE] Печь успешно зажжена, время горения до: ${new Date(end * 1000).toLocaleString()}`);
      } catch (e) {
        console.error('[FURNACE] Ошибка при поджигании печи:', e);
        // При ошибке не обновляем локальное состояние
      }
    }
    
    // ИСПРАВЛЕНО: Всегда сбрасываем состояние поджигания в конце
    setIsIgniting(false);
  };

  // --- Функция добавить дрова ---
  const handleAddWood = async () => {
    setShowAddWoodModal(false);
    if ((resources['Wood Log'] || 0) < 5) {
      alert('You need 5 Wood Log to refill the furnace.');
      return;
    }
    if (telegramId) {
      // 1. Обновить в БД (отнимаем ресурсы)
      try {
        await fetch('rpg.php?action=updateResources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId, resources: { 'Wood Log': -5 } })
        });
      } catch (e) { console.error('[FURNACE] Ошибка обновления Wood Log в БД:', e); }
      
      // 2. Обновить локально ресурсы
      const newRes = { ...resources, 'Wood Log': (resources['Wood Log'] || 0) - 5 };
      if (window.ModalModule && typeof window.ModalModule.enhancedSaveResourcesWithSync === 'function') {
        window.ModalModule.enhancedSaveResourcesWithSync(newRes, { skipServerSync: true });
      } else if (window.saveResourcesForModals) {
        window.saveResourcesForModals(newRes);
      }
      setResources(newRes);
      
      // 3. Обновить в глобальных переменных
      if (window.globalUserResources) {
        window.globalUserResources['Wood Log'] = newRes['Wood Log'];
        window.globalUserResources['woodlog'] = newRes['Wood Log']; // Также обновляем вариант в нижнем регистре
      }
      if (window.globalResourceLoader && typeof window.globalResourceLoader === 'function') {
        window.globalResourceLoader().then(r => {
          if (r && r.resources) {
            r.resources['Wood Log'] = newRes['Wood Log'];
            r.resources['woodlog'] = newRes['Wood Log'];
          }
        });
      }
      
      // 4. Принудительно обновляем UI если есть соответствующая функция
      if (window.forceUpdateUI && typeof window.forceUpdateUI === 'function') {
        setTimeout(() => window.forceUpdateUI(), 100);
      }
      
      // 5. Запускаем событие обновления ресурсов
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('resourcesUpdated', { detail: { resources: newRes } }));
      }
      
      // 4. Обновляем статус печи на "заправлена" (значение 2)
      try {
        await fetch('rpg.php?action=updateUserBoolean', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            telegramId, 
            column: 'furnace', 
            value: 2 // Заправлена
          })
        });
        
        // Обновляем глобальные данные
        if (window.globalUserResources) {
          window.globalUserResources.furnace = 2;
        }
      } catch (e) {
        console.error('[FURNACE] Ошибка обновления статуса печи на сервере:', e);
      }

      // 5. Устанавливаем furnace_burn=0 (убираем время горения)
      try {
        // Используем тот же эндпоинт updateBurnTime, что и при установке времени горения
        await fetch('rpg.php?action=updateBurnTime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            telegramId, 
            column: 'furnace_burn', 
            value: 0 // Используем 0 для сброса времени
          })
        });
        
        // Обновляем глобальные данные
        if (window.globalUserResources) {
          window.globalUserResources.furnace_burn = 0;
        }
        
        console.log('[FURNACE] Успешно сброшено время горения печи');
      } catch (e) {
        console.error('[FURNACE] Ошибка обновления времени горения печи на сервере:', e);
      }
    }
    
    // Обновляем UI - печь заправлена, но не горит
    setIsEmpty(false);
    setIsLit(false);
    setBurnEndTime(null);
  };

  // Функция для открытия модального окна добавления дров
  const openAddWoodModal = () => {
    setShowAddWoodModal(true);
  };

  // Функция для закрытия модального окна добавления дров
  const closeAddWoodModal = () => {
    setShowAddWoodModal(false);
  };

  // Стили для иконки
  const emptyIconStyle = {
    width: '80px',
    height: '80px',
    border: '2px solid #553311',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222', // тёмный фон
    color: '#fff',
    fontSize: '16px',
    margin: '0 auto',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 1.5px 0 #000',
    cursor: 'pointer',
    transition: 'transform 0.25s cubic-bezier(.4,1.5,.6,1), box-shadow 0.18s',
    position: 'relative',
    outline: 'none',
    userSelect: 'none',
  };
  
  // Стили для иконки печи
  const furnaceIconStyle = {
    ...emptyIconStyle,
    backgroundColor: '#222', // тёмный фон
  };

  // --- универсальный обработчик клика по иконке ---
  const handleIconClick = async () => {
    // ИСПРАВЛЕНО: Блокируем нажатие если идет загрузка данных, установка печи, общая загрузка компонента, загрузка статуса печи, поджигание или статус неизвестен
    if (isLoading || isInstallingFurnace || isLoadingState || isLoadingFurnaceStatus || isIgniting || isStatusUnknown) {
      console.log('[FURNACE] Кнопка заблокирована: идет загрузка данных, поджигание или статус неизвестен...', {
        isLoading,
        isInstallingFurnace,
        isLoadingState,
        isLoadingFurnaceStatus,
        isIgniting,
        isStatusUnknown
      });
      return;
    }
    
    if (!hasFurnace) {
      await installFurnace();
      return;
    }
    if (isEmpty) {
      openAddWoodModal();
      return;
    }
    if (!isLit) {
      handleIgnite();
      return;
    }
    // Если горит — ничего не делаем
  };

  // --- стили для эффекта поднятия ---
  const [isIconActive, setIsIconActive] = useState(false);
  const iconActiveStyle = isIconActive ? {
    transform: 'translateY(-5px) scale(1.04)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.7), 0 2px 0 #000',
  } : {};

  // 2. Функции для показа/скрытия тултипа
  const handleRecipeMouseEnter = (recipe, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({ x: rect.left + rect.width + 8, y: rect.top });
    setHoveredRecipe(recipe);
  };
  const handleRecipeMouseLeave = () => setHoveredRecipe(null);

  // Универсальная функция поиска количества ресурса по всем вариантам написания
  function findResourceAmount(mat, displayName) {
    if (!mat) return 0;
    const variants = [
      mat,
      mat.toLowerCase(),
      mat.toUpperCase(),
      mat.charAt(0).toUpperCase() + mat.slice(1),
      mat.replace(/_/g, ''),
      mat.replace(/_/g, ' '),
      mat.replace(/\s+/g, ''),
      mat.replace(/\s+/g, '_'),
      'iron ore', 'Iron Ore', 'IRON ORE', 'iron_ore', 'Iron_Ore', 'IRON_ORE'
    ];
    
    // Специальная обработка для ironore
    if (mat === 'ironore') {
      variants.push('iron ore', 'Iron Ore', 'IRON ORE', 'iron_ore', 'Iron_Ore', 'IRON_ORE');
    }
    
    if (displayName && displayName !== mat) {
      variants.push(displayName);
      variants.push(displayName.toLowerCase());
      variants.push(displayName.toUpperCase());
      variants.push(displayName.replace(/_/g, ' '));
      variants.push(displayName.replace(/\s+/g, ''));
      variants.push(displayName.replace(/\s+/g, '_'));
    }
    
    // ИСПРАВЛЕНИЕ: Сначала проверяем актуальные globalUserResources
    if (window.globalUserResources) {
      for (const v of variants) {
        if (window.globalUserResources[v] !== undefined) {
          return window.globalUserResources[v];
        }
      }
    }
    
    // Затем проверяем локальное состояние resources как запасной вариант
    for (const v of variants) {
      if (resources[v] !== undefined) {
        return resources[v];
      }
    }
    
    return 0;
  }

  // Открыть модальное окно крафта из модуля при клике на рецепт
  const handleRecipeClick = (recipe) => {
    if (window.ModalModule && typeof window.ModalModule.showItemDetailsModal === 'function') {
      // Устанавливаем источник вызова
      window.lastModalSource = 'furnace';
      
      // Вызываем модальное окно с дополнительной информацией о источнике
      window.ModalModule.showItemDetailsModal(recipe.id, true, null, {
        source: 'furnace-recipes'
      });
    }
  };

  // Отображение, если у пользователя нет печи
  if (!hasFurnace) {
    console.log('[FURNACE] Rendering "no furnace" state');
    return (
      <div className="furnace-container">
        <BackButton onClick={onBack} position="left" style={{ top: "0px", left: "0px" }} />
        <div className="no-furnace-message">
          <h2>Furnace Not Installed</h2>
          <p>You need to install a furnace before you can use it for smelting.</p>
          <div
            style={{ 
              ...emptyIconStyle, 
              ...iconActiveStyle,
              background: "linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)",
              border: "1px solid rgba(0, 255, 255, 0.4)",
              borderTop: "2px solid #00fff7",
              borderBottom: "2px solid #00fff7",
              borderRadius: "15px",
              boxShadow: "0 0 30px rgba(0, 255, 255, 0.3), 0 0 15px rgba(0, 255, 255, 0.2)",
              color: "#fff",
              textShadow: "0 0 8px rgba(0, 255, 255, 0.8)"
            }}
            onClick={handleIconClick}
            onMouseDown={() => setIsIconActive(true)}
            onMouseUp={() => setIsIconActive(false)}
            onMouseLeave={() => setIsIconActive(false)}
            tabIndex={0}
            title="Click to install furnace"
          >
            {isInstallingFurnace ? (
              <div className="loading-spinner" style={{ width: '20px', height: '20px' }}></div>
            ) : (
              <div>Install Furnace</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  console.log('[FURNACE] Rendering main component state');
  // Отображение печи с доступными рудами и рецептами
  return (
    <div className="furnace-container">
      <BackButton onClick={onBack} position="left" style={{ top: "0px", left: "0px" }} />
      <div className="furnace-content">
        <h2 style={{ color: "white", textShadow: "0 0 10px rgba(0, 255, 255, 0.7)" }}>Furnace</h2>
        <div className="furnace-image" style={{ position: 'relative' }}>
          <div
            style={{ 
              ...furnaceIconStyle, 
              ...iconActiveStyle,
              background: "linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)",
              border: "1px solid rgba(0, 255, 255, 0.4)",
              borderRadius: "15px",
              boxShadow: "0 0 30px rgba(0, 255, 255, 0.3), 0 0 15px rgba(0, 255, 255, 0.2)",
              opacity: (isLoadingState || isLoadingFurnaceStatus || isStatusUnknown) ? 0.7 : 1,
              cursor: (isLoadingState || isLoadingFurnaceStatus || isStatusUnknown) ? 'wait' : 'pointer',
              position: 'relative'
            }}
            onClick={handleIconClick}
            onMouseDown={() => !(isLoadingState || isLoadingFurnaceStatus || isStatusUnknown) && setIsIconActive(true)}
            onMouseUp={() => !(isLoadingState || isLoadingFurnaceStatus || isStatusUnknown) && setIsIconActive(false)}
            onMouseLeave={() => !(isLoadingState || isLoadingFurnaceStatus || isStatusUnknown) && setIsIconActive(false)}
            tabIndex={(isLoadingState || isLoadingFurnaceStatus || isStatusUnknown) ? -1 : 0}
            title={
              (isLoadingState || isLoadingFurnaceStatus || isStatusUnknown) ? 'Loading furnace status...' :
              isEmpty ? 'Add Wood' :
              !isLit ? 'Ignite Furnace' :
              'Furnace is burning'
            }
          >
            {(isLoadingState || isLoadingFurnaceStatus || isStatusUnknown) ? (
              <React.Fragment>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(2px)'
                }}>
                  <div className="loading-spinner" style={{ width: '30px', height: '30px' }}></div>
                </div>
                <img src="images/rpg/furnace.png" alt="Furnace (loading)" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'none', border: 'none', boxShadow: 'none', filter: 'grayscale(0.5) blur(1px)', pointerEvents: 'none', opacity: 0.6 }} />
                <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#aaa', fontWeight: 'bold', fontSize: '12px', textShadow: '0 1px 2px #000', pointerEvents: 'none' }}>
                  {isLoadingFurnaceStatus ? 'Loading Status...' : 'Loading...'}
                </span>
              </React.Fragment>
            ) : isLit ? (
              <React.Fragment>
                <img src="images/rpg/furnace.png" alt="Furnace" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'none', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px', textShadow: '0 1px 2px #000', lineHeight: '1.1', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{timerText}</span>
              </React.Fragment>
            ) : isEmpty ? (
              <React.Fragment>
                <img src="images/rpg/furnace_empty.png" alt="Furnace (empty)" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'none', border: 'none', boxShadow: 'none', filter: 'grayscale(0.7)', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#888', fontWeight: 'bold', fontSize: '14px', pointerEvents: 'none' }}>Add Wood</span>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <img src="images/rpg/furnace.png" alt="Furnace" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'none', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px', textShadow: '0 1px 2px #000', lineHeight: '1.1', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'pointer', pointerEvents: 'none' }}>Ignite Furnace</span>
              </React.Fragment>
            )}
          </div>
        </div>
        
        {/* Добавляем модальное окно для добавления дров */}
        <AddWoodModal 
          isOpen={showAddWoodModal} 
          onClose={closeAddWoodModal} 
          onAddWood={handleAddWood} 
          woodLogCount={resources['Wood Log'] || 0} 
        />
        
        <div className="furnace-recipes" style={{ width: '90%', height: '60vh', margin: '32px auto 0 auto', position: 'relative' }}>
          <h3 style={{marginBottom: 0, marginLeft: 8, color: "white", fontWeight: 700, fontSize: 18, minHeight: 24, textShadow: "0 0 5px rgba(0, 255, 255, 0.7)" }}>Furnace Recipes:</h3>
          <div className="recipe-list" style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '18px', 
            justifyContent: 'flex-start', 
            background: "linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)",
            border: "1px solid rgba(0, 255, 255, 0.4)",
            borderTop: "2px solid #00fff7",
            borderBottom: "2px solid #00fff7",
            borderRadius: "15px",
            boxShadow: "0 0 30px rgba(0, 255, 255, 0.3), 0 0 15px rgba(0, 255, 255, 0.2)",
            padding: '40px 0 0 0', 
            marginTop: 0, 
            marginBottom: 24, 
            width: '100%', 
            height: '100%', 
            position: 'relative', 
            filter: !isLit ? 'grayscale(0.7) opacity(0.5)' : 'none', 
            pointerEvents: !isLit ? 'none' : 'auto' 
          }}>
            {getFurnaceRecipes().map(recipe => {
              const catalogItem = window.ItemCatalogModule && window.ItemCatalogModule.findCatalogItemById ? window.ItemCatalogModule.findCatalogItemById(recipe.id) : null;
              const imgSrc = catalogItem ? catalogItem.image_path : `images/rpg/${recipe.id}.png`;
              const desc = catalogItem ? catalogItem.description : recipe.description;
              const rarity = catalogItem ? catalogItem.rarity : 'Common';
              const borderColor = (window.ItemCatalogModule && window.ItemCatalogModule.getRarityColor) ? window.ItemCatalogModule.getRarityColor(rarity) : '#aaa';
              
              // Используем локальные таймеры вместо getActiveCraftTimers
              const timerInfo = localCraftTimers[recipe.id];
              const craftSeconds = timerInfo ? timerInfo.secondsLeft : 0;
              
              let craftTimerText = '';
              if (craftSeconds > 0) {
                const m = Math.floor(craftSeconds / 60);
                const s = Math.floor(craftSeconds % 60);
                craftTimerText = m > 0 ? `${m}m ${s}s` : `${s}s`;
              }
              
              return (
                <div
                  key={recipe.id}
                  className="recipe-item"
                  data-recipe-id={recipe.id}
                  style={{ width: 80, textAlign: 'center', position: 'relative', background: 'none', border: 'none', boxShadow: 'none', marginBottom: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 10, cursor: !isLit ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={isLit ? (e => handleRecipeMouseEnter(recipe, e)) : undefined}
                  onMouseLeave={isLit ? handleRecipeMouseLeave : undefined}
                  onClick={isLit ? (() => handleRecipeClick(recipe)) : undefined}
                >
                  <div
                    className="recipe-icon"
                    style={{ 
                      width: 40, 
                      height: 40, 

                      borderRadius: 8, 

                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      boxShadow: "0 0 15px rgba(0, 255, 255, 0.2)",
                      cursor: !isLit ? 'not-allowed' : 'pointer', 
                      position: 'relative', 

                    }}
                  >
                    <img src={imgSrc} alt={recipe.name} style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, border: `1px solid ${borderColor}` }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#fff', fontWeight: 600, border: 'none', background: 'none', boxShadow: 'none', padding: 0, textShadow: "0 0 5px rgba(0, 255, 255, 0.3)" }}>{recipe.name}</div>
                </div>
              );
            })}
            {!isLit && (
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                background: "rgba(0, 0, 30, 0.85)",
                backdropFilter: "blur(5px)",
                color: '#fff', 
                zIndex: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: 22, 
                fontWeight: 700, 
                borderRadius: 15, 
                pointerEvents: 'auto',
                textShadow: "0 0 10px rgba(0, 255, 255, 0.7)"
              }}>
                Light the furnace to use recipes
              </div>
            )}
          </div>
        </div>
      </div>
      {hoveredRecipe && (() => {
        const catalogItem = window.ItemCatalogModule && window.ItemCatalogModule.findCatalogItemById ? window.ItemCatalogModule.findCatalogItemById(hoveredRecipe.id) : null;
        const imgSrc = catalogItem ? catalogItem.image_path : `images/rpg/${hoveredRecipe.id}.png`;
        const desc = catalogItem ? catalogItem.description : hoveredRecipe.description;
        const rarity = catalogItem ? catalogItem.rarity : 'Common';
        const borderColor = (window.ItemCatalogModule && window.ItemCatalogModule.getRarityColor) ? window.ItemCatalogModule.getRarityColor(rarity) : '#aaa';
        
        // Логгирование для отладки
        console.log('[Furnace] Показываем тултип для рецепта:', hoveredRecipe.id);
        console.log('[Furnace] Требуемые материалы:', hoveredRecipe.materials);
        
        return (
          <div className="recipe-tooltip" style={{ 
            left: tooltipPosition.x, 
            top: tooltipPosition.y, 
            position: 'fixed', 
            zIndex: 1000, 
            background: "linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)",
            border: `1px solid ${borderColor}`,
            borderTop: `2px solid ${borderColor}`,
            borderBottom: `2px solid ${borderColor}`,
            borderRadius: "10px",
            boxShadow: `0 0 30px rgba(${borderColor.replace(/[^\d,]/g, '')}, 0.3), 0 0 15px rgba(${borderColor.replace(/[^\d,]/g, '')}, 0.2)`,
            backdropFilter: "blur(5px)",
            padding: "10px",
            maxWidth: "280px"
          }}>
            <div className="tooltip-header" style={{ 
              color: "#fff", 
              textShadow: "0 0 5px rgba(0, 255, 255, 0.7)",
              borderBottom: `1px solid ${borderColor}`,
              padding: "0 0 5px 0",
              marginBottom: "8px",
              fontWeight: "bold",
              fontSize: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              {hoveredRecipe.name}
              <span className="tooltip-rarity" style={{ 
                color: borderColor,
                fontSize: "12px",
                fontWeight: "bold"
              }}>{rarity}</span>
            </div>
            <div className="tooltip-image-container" style={{ 
              background: "rgba(0, 0, 40, 0.6)", 
              padding: "8px", 
              marginBottom: "8px", 
              borderRadius: "6px",
              display: "flex",
              justifyContent: "center"
            }}>
              <img src={imgSrc} alt={hoveredRecipe.name} className="tooltip-image" style={{ 
                border: `2px solid ${borderColor}`, 
                borderRadius: "6px",
                maxWidth: "48px",
                maxHeight: "48px"
              }} />
            </div>
            <div className="tooltip-description" style={{ 
              color: "#fff", 
              marginBottom: "10px", 
              fontSize: "13px", 
              lineHeight: "1.3"
            }}>{desc}</div>
            <div className="tooltip-title" style={{ 
              color: "#fff", 
              fontWeight: "bold",
              textShadow: "0 0 5px rgba(0, 255, 255, 0.7)",
              marginBottom: "5px"
            }}>Required Materials:</div>
            {Object.entries(hoveredRecipe.materials).map(([mat, amt]) => {
              // Получаем красивое имя ресурса из каталога
              let displayName = mat.charAt(0).toUpperCase() + mat.slice(1);
              
              // Специальная обработка для ironore -> Iron Ore
              if (mat === 'ironore') displayName = 'Iron Ore';
              
              if (window.ItemCatalogModule && window.ItemCatalogModule.findCatalogItemById) {
                const item = window.ItemCatalogModule.findCatalogItemById(mat);
                if (item && item.name) displayName = item.name;
              }
              
              // Используем универсальную функцию поиска количества ресурса
              const userHas = findResourceAmount(mat, displayName);
              console.log(`[Furnace] Материал ${mat} (${displayName}), пользователь имеет: ${userHas}, требуется: ${amt}`);
              
              const enough = userHas >= amt;
              return (
                <div className={`tooltip-material ${enough ? 'sufficient' : 'insufficient'}`} key={mat} style={{ 
                  background: "rgba(0, 0, 40, 0.4)",
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 8px",
                  marginBottom: "4px",
                  borderRadius: "4px",
                  color: "#fff"
                }}>
                  <span>{displayName}</span>
                  <span style={{ color: enough ? "#4caf50" : "#f44336" }}>{userHas}/{amt}</span>
                </div>
              );
            })}
            <div className="tooltip-craft-time" style={{ 
              background: "rgba(0, 0, 40, 0.4)",
              padding: "8px",
              marginTop: "8px",
              borderRadius: "4px"
            }}>
              <div className="tooltip-title" style={{ 
                color: "#fff", 
                fontWeight: "bold",
                marginBottom: "4px"
              }}>Crafting Time:</div>
              <div style={{ color: "#fff" }}>{hoveredRecipe.craftTime ? `${hoveredRecipe.craftTime} sec` : 'Instant'}</div>
            </div>
            <div className="tooltip-footer" style={{ 
              color: "#ddd", 
              fontSize: "12px",
              textAlign: "center",
              marginTop: "8px",
              fontStyle: "italic"
            }}>Click for details</div>
          </div>
        );
      })()}
    </div>
  );
};

// Экспортируем компонент
window.CraftingModule = window.CraftingModule || {};
window.CraftingModule.FurnaceComponent = FurnaceComponent;
