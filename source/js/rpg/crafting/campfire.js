// Компонент Костра (Campfire) для крафтинга
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
          <h3 style={{ color: "#00fff7", textShadow: "0 0 5px rgba(0, 255, 255, 0.7)", marginBottom: '10px' }}>Refill Campfire</h3>
          <div style={{ fontSize: '16px', marginBottom: '15px' }}>
            Add <b>5 Wood Log</b> to refill your campfire.
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

// Компонент костра
const CampfireComponent = ({ onBack }) => {
  const [resources, setResources] = useState({});
  const [hasCampfire, setHasCampfire] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [isInstallingCampfire, setIsInstallingCampfire] = useState(false);
  const [burnEndTime, setBurnEndTime] = useState(null); // timestamp
  const [isLit, setIsLit] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false); // Изменено с true на false - состояние по умолчанию "заправлено"
  const [isStatusUnknown, setIsStatusUnknown] = useState(true); // НОВОЕ: true пока не получены реальные данные с сервера
  const [showAddWoodRecipe, setShowAddWoodRecipe] = useState(false);
  const [showAddWoodModal, setShowAddWoodModal] = useState(false); // Новое состояние для модального окна
  const [timerText, setTimerText] = useState('');
  const [isLoadingState, setIsLoadingState] = useState(true); // Новое состояние для блокировки кнопок во время загрузки
  const [isLoadingCampfireStatus, setIsLoadingCampfireStatus] = useState(true); // НОВОЕ: состояние загрузки статуса костра
  const [isIgniting, setIsIgniting] = useState(false); // НОВОЕ: состояние процесса поджигания для предотвращения повторных нажатий
  const telegramId = localStorage.getItem('telegramId');
  const [hoveredRecipe, setHoveredRecipe] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [modalRecipe, setModalRecipe] = useState(null);
  const [modalCatalogItem, setModalCatalogItem] = useState(null);
  const [modalError, setModalError] = useState('');
  const [isCrafting, setIsCrafting] = useState(false);
  
  // --- Модификация: вместо craftTimers используем forceUpdate для обновления компонента ---
  const [updateCounter, setUpdateCounter] = useState(0);
  const forceUpdate = () => setUpdateCounter(prev => prev + 1);
  
  // Метод для сохранения активных таймеров в localStorage
  const saveTimersToLocalStorage = () => {
    try {
      if (window.activeCraftTimers) {
        localStorage.setItem('activeCraftTimers', JSON.stringify(window.activeCraftTimers));
        console.log('[Campfire] Таймеры сохранены в localStorage');
      }
    } catch (e) {
      console.error('[Campfire] Ошибка при сохранении таймеров в localStorage:', e);
    }
  };

  // Метод для загрузки активных таймеров из localStorage
  const loadTimersFromLocalStorage = () => {
    try {
      const savedTimers = localStorage.getItem('activeCraftTimers');
      if (savedTimers) {
        window.activeCraftTimers = JSON.parse(savedTimers);
        console.log('[Campfire] Таймеры загружены из localStorage:', window.activeCraftTimers);
        return true;
      }
    } catch (e) {
      console.error('[Campfire] Ошибка при загрузке таймеров из localStorage:', e);
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
      console.log('[Campfire] Используем существующие таймеры из глобальной переменной:', window.activeCraftTimers);
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
          
          console.log(`[Campfire] Восстановлен таймер для ${itemId}, осталось ${secondsLeft}с`);
        }
      });
      
      // Обновляем состояние сразу всеми таймерами
      if (Object.keys(timersToAdd).length > 0) {
        console.log('[Campfire] Локальные таймеры обновлены из сохраненных данных');
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

  // --- useEffect для добавления локальных рецептов костра в глобальный массив ---
  useEffect(() => {
    if (!window.CraftingRecipes) window.CraftingRecipes = { recipes: {} };
    if (!window.CraftingRecipes.recipes) window.CraftingRecipes.recipes = {};
    if (!Array.isArray(window.CraftingRecipes.recipes.campfire)) window.CraftingRecipes.recipes.campfire = [];
    getCampfireRecipes().forEach(recipe => {
      if (!window.CraftingRecipes.recipes.campfire.find(r => r.id === recipe.id)) {
        window.CraftingRecipes.recipes.campfire.push(recipe);
      }
    });
  }, []);

  // Загрузка данных при инициализации компонента
  useEffect(() => {
    console.log('[CAMPFIRE] Компонент инициализирован');
    loadCampfireData();
    
    // Дополнительная проверка времени горения после загрузки данных
    const checkBurnTimeStatus = () => {
      if (telegramId && window.globalUserResources) {
        const now = Math.floor(Date.now() / 1000);
        // Выведем все ключи из globalUserResources для отладки
        console.log('[CAMPFIRE] Диагностика: ключи в globalUserResources:', 
                    Object.keys(window.globalUserResources).filter(k => k.includes('burn') || k.includes('campfire')));
        
        // Проверяем все возможные варианты ключей для времени горения
        const possibleKeys = ['campfire_burn', 'campfireBurn', 'campfire-burn', 'campfireBurnTime'];
        let foundKey = null;
        let burnTime = null;
        
        for (const key of possibleKeys) {
          if (window.globalUserResources[key] !== undefined) {
            foundKey = key;
            burnTime = parseInt(window.globalUserResources[key], 10);
            console.log(`[CAMPFIRE] Найден ключ времени горения: ${key}=${burnTime}`);
            break;
          }
        }
        
        // Стандартная проверка (campfire_burn)
        if (window.globalUserResources.campfire_burn) {
          burnTime = parseInt(window.globalUserResources.campfire_burn, 10);
          if (!isNaN(burnTime) && burnTime > now) {
            console.log(`[CAMPFIRE] Проверка: campfire_burn=${burnTime}, осталось ${Math.floor((burnTime-now)/60)} мин.`);
            // Устанавливаем состояние "горит"
            setIsLit(true);
            setBurnEndTime(burnTime);
            setIsEmpty(false);
            setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
            console.log(`[CAMPFIRE] Костер горит, campfire_burn=${burnTime}, осталось ${Math.floor((burnTime-now)/60)} мин.`);
            // ИСПРАВЛЕНО: Сбрасываем состояние загрузки после установки состояния
            setIsLoadingCampfireStatus(false);
            return;
          } else {
            console.log(`[CAMPFIRE] Проверка: campfire_burn=${burnTime} (неактивно)`);
          }
        } else if (foundKey) {
          // Если стандартный ключ не найден, но найден альтернативный
          if (!isNaN(burnTime) && burnTime > now) {
            console.log(`[CAMPFIRE] Используем альтернативный ключ ${foundKey}=${burnTime}, осталось ${Math.floor((burnTime-now)/60)} мин.`);
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
          console.log('[CAMPFIRE] Проверка: campfire_burn отсутствует в window.globalUserResources.');
          // Попробуем загрузить свежие данные с сервера
          if (telegramId && telegramId.trim() !== '') {
            // Проверка telegramId перед запросом
            console.log(`[CAMPFIRE] Использую telegramId для запроса: ${telegramId}`);
            
            // Используем полный путь к API
            const fetchURL = `rpg.php?action=getUserData&telegramId=${encodeURIComponent(telegramId)}`;
            console.log(`[CAMPFIRE] Пытаемся загрузить данные с сервера: ${fetchURL}`);
            
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
                  console.error(`[CAMPFIRE] Ошибка HTTP: ${response.status} ${response.statusText} при запросе ${fetchURL}`);
                  return response.text().then(text => {
                    console.error("[CAMPFIRE] Тело ответа сервера (ошибка):", text);
                    throw new Error(`HTTP error ${response.status}`); 
                  });
                }
                return response.json();
              })
              .then(data => {
                if (data.success && data.userData) {
                  console.log('[CAMPFIRE] Получены свежие данные с сервера:', 
                             Object.keys(data.userData).filter(k => k.includes('burn') || k.includes('campfire')));
                  
                  // Если нашли время горения в свежих данных
                  if (data.userData.campfire_burn) {
                    const serverBurnTime = parseInt(data.userData.campfire_burn, 10);
                    console.log(`[CAMPFIRE] Найдено время на сервере: campfire_burn=${serverBurnTime}`);
                    
                    // Обновляем глобальные данные
                    if (window.globalUserResources) {
                      window.globalUserResources.campfire_burn = serverBurnTime;
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
                    console.log('[CAMPFIRE] campfire_burn отсутствует в свежих данных с сервера.');
                  }
                } else {
                  console.log('[CAMPFIRE] Запрос успешен, но данные не получены или data.success=false. Ответ сервера:', data);
                }
              })
              .catch(error => {
                console.error('[CAMPFIRE] Ошибка получения или обработки данных с сервера:', error);
              });
          }
        }
      }
    };
    
    // Выполняем проверку через небольшую задержку, чтобы дать время загрузке данных
    const timer = setTimeout(checkBurnTimeStatus, 500);
    
    // Логируем при размонтировании компонента
    return () => {
      console.log('[CAMPFIRE] Компонент размонтирован');
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
          // Костер потух
          setIsLit(false);
          setIsEmpty(true);
          setBurnEndTime(null);
          setTimerText('');
          
          // Обновляем статус campfire=1 (потух, пустой)
          if (telegramId) {
            fetch('rpg.php?action=updateUserBoolean', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                telegramId, 
                column: 'campfire', 
                value: 1 // Потух, пустой
              })
            }).then(() => {
              // Обновляем глобальные данные
              if (window.globalUserResources) {
                window.globalUserResources.campfire = 1;
              }
              console.log('[CAMPFIRE] Время горения истекло, статус обновлен на "пустой" (1)');
            }).catch(e => {
              console.error('[CAMPFIRE] Ошибка обновления статуса костра при потухании:', e);
            });
          }
        }
      }, 1000 * 60); // обновлять каждую минуту
      
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
    if (hasCampfire && telegramId) {
      const now = Math.floor(Date.now() / 1000);
      
      console.log(`[CAMPFIRE] Проверка состояния при загрузке. Состояние globalUserResources.campfire:`, 
                  window.globalUserResources && window.globalUserResources.campfire, 
                  typeof (window.globalUserResources && window.globalUserResources.campfire));
      
      // ИСПРАВЛЕНО: Устанавливаем состояние загрузки статуса костра
      setIsLoadingCampfireStatus(true);
      
      // Проверяем время горения
      if (window.globalUserResources && window.globalUserResources.campfire_burn) {
        const end = parseInt(window.globalUserResources.campfire_burn, 10);
        // Проверяем, что значение существует и является числом
        if (!isNaN(end) && end > now) {
          // Костер горит - таймер не истек
          setIsLit(true);
          setBurnEndTime(end);
          setIsEmpty(false);
          setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
          console.log(`[CAMPFIRE] Костер горит, campfire_burn=${end}, осталось ${Math.floor((end-now)/60)} мин.`);
          // ИСПРАВЛЕНО: Сбрасываем состояние загрузки после установки состояния с задержкой
          setTimeout(() => {
            setIsLoadingCampfireStatus(false);
          }, 1500);
          return;
        } else if (!isNaN(end)) {
          // Таймер истек, нужно проверить статус campfire
          console.log(`[CAMPFIRE] Время горения костра истекло: campfire_burn=${end}, time=${now}`);
        }
      }
      
      // Проверяем статус костра - используем стандартный запрос getUserData
      console.log('[CAMPFIRE] Проверка состояния установленного костра');
      
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
            console.log('[CAMPFIRE] Получены данные пользователя:', 
                       Object.keys(data.userData).filter(k => k.includes('campfire')));
            
            // Проверяем наличие информации о костре в userData
            let campfireStatus = data.userData.campfire || null;
            let campfireBurn = data.userData.campfire_burn || null;
            
            // Если campfireStatus строка, преобразуем в число
            if (typeof campfireStatus === 'string') {
              campfireStatus = parseInt(campfireStatus, 10);
            } else if (typeof campfireStatus === 'boolean' && campfireStatus === true) {
              campfireStatus = 2; // Если boolean true, считаем, что заправлен
            }
            
            // Проверяем истекло ли время горения для статуса 3
            if (campfireStatus === 3 && campfireBurn) {
              const currentTime = Math.floor(Date.now() / 1000);
              const burnTime = parseInt(campfireBurn, 10);
              
              if (burnTime < currentTime) {
                console.log(`[CAMPFIRE] Время горения истекло: ${burnTime} < ${currentTime}, меняем статус на 1 (потух)`);
                campfireStatus = 1;
                
                // Обновляем статус на сервере
                fetch('rpg.php?action=updateUserBoolean', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    telegramId, 
                    column: 'campfire', 
                    value: 1 // Потух, пустой
                  })
                }).then(response => {
                  if (response.ok) {
                    console.log('[CAMPFIRE] Статус костра обновлен на сервере на "потух" (1)');
                    if (window.globalUserResources) {
                      window.globalUserResources.campfire = 1;
                    }
                  }
                }).catch(e => {
                  console.error('[CAMPFIRE] Ошибка обновления статуса костра:', e);
                });
              }
            }
            
            console.log(`[CAMPFIRE] Статус костра из запроса: ${campfireStatus}, тип: ${typeof campfireStatus}, время горения: ${campfireBurn}`);
            
            // Теперь проверяем по полученному значению
            if (campfireStatus === 3) {
              // Статус 3 = костер горит (новое значение)
              console.log('[CAMPFIRE] Костер имеет статус 3 - горит');
              setIsLit(true);
              setIsEmpty(false);
              setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
              
              // Если нет времени горения - устанавливаем дефолтное (текущее + 8 часов)
              if (!(window.globalUserResources && window.globalUserResources.campfire_burn) && campfireBurn) {
                setBurnEndTime(parseInt(campfireBurn, 10));
                console.log(`[CAMPFIRE] Получено время горения из запроса: ${campfireBurn}`);
              } else if (!(window.globalUserResources && window.globalUserResources.campfire_burn)) {
                const defaultEndTime = now + 8 * 3600;
                setBurnEndTime(defaultEndTime);
                console.log(`[CAMPFIRE] Установлено стандартное время горения: ${defaultEndTime}`);
              }
            } else if (campfireStatus === 2) { 
              console.log('[CAMPFIRE] Костер имеет статус 2 - заправлен');
              
              // По умолчанию костер не горит при статусе 2
              setIsLit(false);
              setBurnEndTime(null);
              setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
              
              // Проверяем, есть ли истекшее время горения
              if (campfireBurn && parseInt(campfireBurn, 10) < now) {
                // Костер потух - показываем кнопку Add Wood и меняем статус на 1
                setIsEmpty(true);
                console.log('[CAMPFIRE] Костер потух, нужно добавить дрова (campfire=2, campfire_burn < now)');
                
                // Обновляем статус на сервере на 1 (пустой)
                fetch('rpg.php?action=updateUserBoolean', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    telegramId, 
                    column: 'campfire', 
                    value: 1 // Потух, пустой
                  })
                }).then(response => {
                  if (response.ok) {
                    console.log('[CAMPFIRE] Статус костра обновлен на сервере на "пустой" (1)');
                    if (window.globalUserResources) {
                      window.globalUserResources.campfire = 1;
                    }
                  }
                }).catch(e => {
                  console.error('[CAMPFIRE] Ошибка обновления статуса костра:', e);
                });
              } else {
                // Костер заправлен и готов к поджиганию (campfire_burn=null или отсутствует)
                setIsEmpty(false);
                console.log('[CAMPFIRE] Костер заправлен и готов к поджиганию (campfire=2, campfire_burn=null)');
              }
            } else if (campfireStatus === 1) { 
              // Статус 1 - костер пуст
              setIsLit(false);
              setBurnEndTime(null);
              setIsEmpty(true);
              setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
              console.log('[CAMPFIRE] Костер пуст (campfire=1)');
            } else {
              // Костер не установлен
              setHasCampfire(false);
              setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
              console.log('[CAMPFIRE] Костер не установлен');
            }
            
            // ИСПРАВЛЕНО: Сбрасываем состояние загрузки статуса после получения данных с сервера с задержкой
            setTimeout(() => {
              setIsLoadingCampfireStatus(false);
              setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
            }, 1500);
            
          } else {
            console.log('[CAMPFIRE] Не удалось получить данные пользователя или userData пуст', data);
            // Используем резервную логику с проверкой через globalUserResources (может быть неточно)
            checkCampfireStatusFromGlobalResources();
          }
        })
        .catch(error => {
          console.error('[CAMPFIRE] Ошибка при запросе данных пользователя:', error);
          // Используем резервную логику с проверкой через globalUserResources (может быть неточно)
          checkCampfireStatusFromGlobalResources();
        });
      } else {
        // Если нет telegramId, используем резервную логику
        checkCampfireStatusFromGlobalResources();
      }
      
      // Резервная функция для проверки статуса через globalUserResources
      function checkCampfireStatusFromGlobalResources() {
        console.log('[CAMPFIRE] Используем резервный метод проверки статуса костра через globalUserResources');
        
        // Сначала проверим специальное поле, если оно есть
        if (window.globalUserResources && window.globalUserResources.campfireStatus !== undefined) {
          const status = Number(window.globalUserResources.campfireStatus);
          console.log(`[CAMPFIRE] Найдено отдельное поле campfireStatus = ${status}`);
          
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
            setHasCampfire(false);
          }
          setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
        } 
        // В противном случае пробуем проверить через globalUserResources.campfire,
        // но это может быть не точно, так как может быть количеством в инвентаре
        else if (window.craftingInstallations && window.craftingInstallations.campfire !== undefined) {
          const isInstalled = window.craftingInstallations.campfire === true;
          console.log(`[CAMPFIRE] Костер ${isInstalled ? "установлен" : "не установлен"} согласно craftingInstallations`);
          
          if (isInstalled) {
            // Костер установлен, но статус неизвестен - устанавливаем заправленным по умолчанию
            setIsLit(false);
            setBurnEndTime(null);
            setIsEmpty(false);
          } else {
            setHasCampfire(false);
          }
          setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
        } else {
          // Отсутствуют данные - по умолчанию считаем, что костер не установлен
          setHasCampfire(false);
          setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
          console.log('[CAMPFIRE] Нет данных о состоянии костра, считаем что он не установлен');
        }
        
        // ИСПРАВЛЕНО: Сбрасываем состояние загрузки статуса и в резервном методе с задержкой
        setTimeout(() => {
          setIsLoadingCampfireStatus(false);
          setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
        }, 1500);
      }
    } else {
      // ИСПРАВЛЕНО: Если костер не установлен, сразу сбрасываем состояние загрузки с задержкой
      setTimeout(() => {
        setIsLoadingCampfireStatus(false);
        setIsStatusUnknown(false); // НОВОЕ: сбрасываем неопределенность статуса
      }, 1500);
    }
  }, [hasCampfire, telegramId]);

  // --- Рецепты для campfire ---
  function getCampfireRecipes() {
    return [
      {
        id: 'cookedmeat',
        name: 'Cooked Meat',
        description: 'Meat cooked over a campfire. Restores more health than raw meat.',
        category: 'food',
        materials: { meat: 1 },
        result: { cookedmeat: 1 },
        craftTime: 600, // 1 минута
        unlockLevel: 1,
        type: 'recipe'
      }
    ];
  }

  // Функция загрузки данных о костре и ресурсах
  const loadCampfireData = async () => {
    try {
      console.log('[CAMPFIRE] Начало загрузки данных о костре и ресурсах...');
      setIsLoading(true);
      // ИСПРАВЛЕНО: Сбрасываем isLoadingState в начале загрузки
      setIsLoadingState(true);

      // Проверяем наличие глобальных ресурсов
      if (window.globalResourceLoader && typeof window.globalResourceLoader === 'function') {
        console.log('[CAMPFIRE] Вызов функции globalResourceLoader для получения ресурсов...');
        const result = await window.globalResourceLoader();
        const userResources = result.resources || {};
        setResources(userResources);
        
        // ИСПРАВЛЕНО: Проверяем статус установки костра через специальное поле userData
        let hasCampfireInstalled = false;
        if (window.checkCraftingInstallation && typeof window.checkCraftingInstallation === 'function') {
          hasCampfireInstalled = window.checkCraftingInstallation('campfire');
          console.log(`[CAMPFIRE] Проверка через checkCraftingInstallation: ${hasCampfireInstalled}`);
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
                const campfireStatus = data.userData.campfire;
                // Костер установлен, если статус 1, 2, 3 или true (любое значение кроме null/undefined/0/false)
                hasCampfireInstalled = campfireStatus !== null && campfireStatus !== undefined && campfireStatus !== 0 && campfireStatus !== false;
                console.log(`[CAMPFIRE] Статус костра из userData: ${campfireStatus}, установлен: ${hasCampfireInstalled}`);
              } else {
                console.log('[CAMPFIRE] Не удалось получить userData, считаем костер не установленным');
                hasCampfireInstalled = false;
              }
            } catch (error) {
              console.error('[CAMPFIRE] Ошибка проверки статуса костра:', error);
              hasCampfireInstalled = false;
            }
          } else {
            console.log('[CAMPFIRE] telegramId отсутствует, считаем костер не установленным');
            hasCampfireInstalled = false;
          }
        }
        setHasCampfire(hasCampfireInstalled);
      } else if (window.globalUserResources) {
        let hasCampfireInstalled = false;
        if (window.checkCraftingInstallation && typeof window.checkCraftingInstallation === 'function') {
          hasCampfireInstalled = window.checkCraftingInstallation('campfire');
          console.log(`[CAMPFIRE] Проверка через checkCraftingInstallation (ветка else): ${hasCampfireInstalled}`);
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
                const campfireStatus = data.userData.campfire;
                // Костер установлен, если статус 1, 2, 3 или true (любое значение кроме null/undefined/0/false)
                hasCampfireInstalled = campfireStatus !== null && campfireStatus !== undefined && campfireStatus !== 0 && campfireStatus !== false;
                console.log(`[CAMPFIRE] Статус костра из userData (ветка else): ${campfireStatus}, установлен: ${hasCampfireInstalled}`);
              } else {
                console.log('[CAMPFIRE] Не удалось получить userData (ветка else), считаем костер не установленным');
                hasCampfireInstalled = false;
              }
            } catch (error) {
              console.error('[CAMPFIRE] Ошибка проверки статуса костра (ветка else):', error);
              hasCampfireInstalled = false;
            }
          } else {
            console.log('[CAMPFIRE] telegramId отсутствует (ветка else), считаем костер не установленным');
            hasCampfireInstalled = false;
          }
        }
        setHasCampfire(hasCampfireInstalled);
        const userResources = window.globalUserResources || {};
        setResources(userResources);
      } else {
        setHasCampfire(false);
        setResources({});
      }
      // --- Используем только локальные рецепты ---
      setRecipes(getCampfireRecipes());
      setIsLoading(false);
      
      // ИСПРАВЛЕНО: Всегда сбрасываем isLoadingState после загрузки данных с задержкой
      setTimeout(() => {
        setIsLoadingState(false);
        console.log('[CAMPFIRE] isLoadingState сброшено после успешной загрузки данных');
      }, 1500);
      
    } catch (error) {
      console.error('[CAMPFIRE] Ошибка в loadCampfireData:', error);
      setHasCampfire(false);
      setResources({});
      setIsLoading(false);
      
      // ИСПРАВЛЕНО: Сбрасываем isLoadingState даже при ошибке с задержкой
      setTimeout(() => {
        setIsLoadingState(false);
        console.log('[CAMPFIRE] isLoadingState сброшено после ошибки загрузки данных');
      }, 1500);
    }
  };

  // --- Функция обработки готовки на костре с немедленным запуском таймера
  const handleCook = async (recipe) => {
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
          console.log('[Campfire] Локальный таймер обновлен');
        }
      } else {
        // Если ошибка - удаляем таймер
        console.log('[Campfire] Локальный таймер удален');
        
        if (window.activeCraftTimers && window.activeCraftTimers[recipe.id]) {
        delete window.activeCraftTimers[recipe.id];
        }
        
        alert(`Failed to start crafting: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      // Если ошибка - удаляем таймер
      console.log('[Campfire] Локальный таймер удален');
      
      if (window.activeCraftTimers && window.activeCraftTimers[recipe.id]) {
      delete window.activeCraftTimers[recipe.id];
      }
      
      alert(`Error: ${error.message}`);
    }
  };

  // --- Функция поджечь костёр ---
  const handleIgnite = async () => {
    // ИСПРАВЛЕНО: Блокируем повторные вызовы если уже идет поджигание или костер уже горит
    if (isIgniting) {
      console.log('[CAMPFIRE] Поджигание уже в процессе, игнорируем повторный вызов');
      return;
    }
    
    if (isLit) {
      console.log('[CAMPFIRE] Костер уже горит, игнорируем попытку поджечь снова');
      return;
    }
    
    console.log('[CAMPFIRE] Начинаем процесс поджигания костра');
    setIsIgniting(true);
    
    const now = Math.floor(Date.now() / 1000);
    const end = now + 8 * 3600; // 8 часов
    
    if (telegramId) {
      try {
        // 1. Сначала проверяем текущий статус костра на сервере для дополнительной безопасности
        const checkResponse = await fetch(`rpg.php?action=getUserData&t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId })
        });
        
        const checkData = await checkResponse.json();
        if (checkData.success && checkData.userData) {
          const currentCampfireStatus = checkData.userData.campfire;
          const currentBurnTime = checkData.userData.campfire_burn;
          
          // Проверяем, что костер не горит уже на сервере
          if (currentCampfireStatus === 3 && currentBurnTime && parseInt(currentBurnTime, 10) > now) {
            console.log('[CAMPFIRE] Костер уже горит на сервере, отменяем поджигание');
            setIsIgniting(false);
            
            // Обновляем локальное состояние согласно серверу
            setIsLit(true);
            setBurnEndTime(parseInt(currentBurnTime, 10));
            setIsEmpty(false);
            return;
          }
        }
        
        // 2. Обновляем статус костра на "горит" (значение 3)
        await fetch('rpg.php?action=updateUserBoolean', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            telegramId, 
            column: 'campfire', 
            value: 3 // Горит
          })
        }).then(response => {
          if (response.ok) {
            console.log('[CAMPFIRE] Статус костра обновлен на "горит" (3)');
            // Обновляем глобальную переменную
            if (window.globalUserResources) {
              window.globalUserResources.campfire = 3;
            }
          }
        });
        
        // 3. Отправляем запрос на обновление времени горения на сервер
        await fetch('rpg.php?action=updateBurnTime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            telegramId, 
            column: 'campfire_burn', 
            value: end 
          })
        });
        
        // 4. Обновляем локальное состояние только после успешного обновления на сервере
        setIsLit(true);
        setBurnEndTime(end);
        setIsEmpty(false);
        
        // 5. Обновляем глобальные данные, если они доступны
        if (window.globalUserResources) {
          window.globalUserResources.campfire_burn = end;
        }
        
        console.log(`[CAMPFIRE] Костер успешно зажжен, время горения до: ${new Date(end * 1000).toLocaleString()}`);
      } catch (e) {
        console.error('[CAMPFIRE] Ошибка при поджигании костра:', e);
        // При ошибке не обновляем локальное состояние
      }
    }
    
    // ИСПРАВЛЕНО: Всегда сбрасываем состояние поджигания в конце
    setIsIgniting(false);
  };

  // --- Функция добавить дрова ---
  const handleAddWood = async () => {
    setShowAddWoodModal(false);
    // Проверяем наличие 5 Wood Log
    if ((resources['Wood Log'] || 0) < 5) {
      alert('You need 5 Wood Log to refill the campfire.');
      return;
    }
    // Снимаем 5 Wood Log (через API и локально)
    if (telegramId) {
      // 1. Обновить в БД (отнимаем ресурсы)
      try {
        await fetch('rpg.php?action=updateResources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId, resources: { 'Wood Log': -5 } })
        });
      } catch (e) { console.error('[CAMPFIRE] Ошибка обновления Wood Log в БД:', e); }
      
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
      }
      if (window.globalResourceLoader && typeof window.globalResourceLoader === 'function') {
        window.globalResourceLoader().then(r => {
          if (r && r.resources) r.resources['Wood Log'] = newRes['Wood Log'];
        });
      }
      
      // 4. Обновляем статус костра на "заправлен" (значение 2)
      try {
        await fetch('rpg.php?action=updateUserBoolean', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            telegramId, 
            column: 'campfire', 
            value: 2 // Заправлен
          })
        });
        
        // Обновляем глобальные данные
        if (window.globalUserResources) {
          window.globalUserResources.campfire = 2;
        }
      } catch (e) {
        console.error('[CAMPFIRE] Ошибка обновления статуса костра на сервере:', e);
      }

      // 5. Устанавливаем campfire_burn=0 (убираем время горения)
      try {
        // Используем тот же эндпоинт updateBurnTime, что и при установке времени горения
        await fetch('rpg.php?action=updateBurnTime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            telegramId, 
            column: 'campfire_burn', 
            value: 0 // Используем 0 для сброса времени
          })
        });
        
        // Обновляем глобальные данные
        if (window.globalUserResources) {
          window.globalUserResources.campfire_burn = 0;
        }
        
        console.log('[CAMPFIRE] Успешно сброшено время горения костра');
      } catch (e) {
        console.error('[CAMPFIRE] Ошибка обновления времени горения костра на сервере:', e);
      }
    }
    
    // Обновляем UI - костер заправлен, но не горит
    setIsEmpty(false);
    setIsLit(false);
    setBurnEndTime(null);
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
  
  // Стили для иконки костра
  const campfireIconStyle = {
    ...emptyIconStyle,
    backgroundColor: '#222', // тёмный фон
  };

  // --- универсальный обработчик клика по иконке ---
  const handleIconClick = async () => {
    // ИСПРАВЛЕНО: Блокируем нажатие если идет загрузка данных, установка костра, общая загрузка компонента, загрузка статуса костра, поджигание или статус неизвестен
    if (isLoading || isInstallingCampfire || isLoadingState || isLoadingCampfireStatus || isIgniting || isStatusUnknown) {
      console.log('[CAMPFIRE] Кнопка заблокирована: идет загрузка данных, поджигание или статус неизвестен...', {
        isLoading,
        isInstallingCampfire,
        isLoadingState,
        isLoadingCampfireStatus,
        isIgniting,
        isStatusUnknown
      });
      return;
    }
    
    if (!hasCampfire) {
      await installCampfire();
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
    ];
    if (displayName && displayName !== mat) {
      variants.push(displayName);
      variants.push(displayName.toLowerCase());
      variants.push(displayName.toUpperCase());
      variants.push(displayName.replace(/_/g, ' '));
      variants.push(displayName.replace(/\s+/g, ''));
      variants.push(displayName.replace(/\s+/g, '_'));
    }
    for (const v of variants) {
      if (resources[v] !== undefined) return resources[v];
    }
    return 0;
  }

  // Открыть модальное окно крафта из модуля при клике на рецепт
  const handleRecipeClick = (recipe) => {
    if (window.ModalModule && typeof window.ModalModule.showItemDetailsModal === 'function') {
      // Устанавливаем источник вызова
      window.lastModalSource = 'campfire';
      
      // Вызываем модальное окно с дополнительной информацией о источнике
      window.ModalModule.showItemDetailsModal(recipe.id, true, null, {
        source: 'campfire-recipes'
      });
    }
  };

  // Полноценная функция установки костра (аналог installFurnace)
  const installCampfire = async () => {
    try {
      console.log('[CAMPFIRE] Attempting to install campfire...');
      setIsInstallingCampfire(true);
      const telegramId = localStorage.getItem('telegramId');
      if (!telegramId) {
        console.error('[CAMPFIRE] Telegram ID is missing in localStorage');
        setIsInstallingCampfire(false);
        return false;
      }
      
      // ИСПРАВЛЕНО: Улучшенная проверка наличия костра в инвентаре
      let hasCampfireInInventory = false;
      
      // Способ 1: Проверяем через globalResourceLoader
      if (window.globalResourceLoader && typeof window.globalResourceLoader === 'function') {
        try {
          const result = await window.globalResourceLoader();
          const userResources = result.resources || result || {};
          console.log('[CAMPFIRE] Ресурсы пользователя:', userResources);
          
          // Проверяем все возможные варианты написания костра
          const campfireVariants = ['campfire', 'Campfire', 'CAMPFIRE'];
          for (const variant of campfireVariants) {
            if (userResources[variant] && parseInt(userResources[variant], 10) > 0) {
              hasCampfireInInventory = true;
              console.log(`[CAMPFIRE] Найден костер в инвентаре: ${variant} = ${userResources[variant]}`);
              break;
            }
          }
        } catch (error) {
          console.error('[CAMPFIRE] Ошибка при проверке через globalResourceLoader:', error);
        }
      }
      
      // Способ 2: Проверяем через прямой запрос к серверу (если первый способ не сработал)
      if (!hasCampfireInInventory) {
        try {
          console.log('[CAMPFIRE] Проверяем инвентарь через прямой запрос к серверу...');
          const response = await fetch(`rpg.php?action=getUserData&t=${Date.now()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId })
          });
          const data = await response.json();
          if (data.success && data.userData && data.userData.resources) {
            const serverResources = data.userData.resources;
            console.log('[CAMPFIRE] Ресурсы с сервера:', serverResources);
            
            // Проверяем все возможные варианты написания костра
            const campfireVariants = ['campfire', 'Campfire', 'CAMPFIRE'];
            for (const variant of campfireVariants) {
              if (serverResources[variant] && parseInt(serverResources[variant], 10) > 0) {
                hasCampfireInInventory = true;
                console.log(`[CAMPFIRE] Найден костер в серверных ресурсах: ${variant} = ${serverResources[variant]}`);
                break;
              }
            }
          }
        } catch (error) {
          console.error('[CAMPFIRE] Ошибка при проверке через прямой запрос:', error);
        }
      }
      
      // Способ 3: Проверяем через IndexedDB (если предыдущие способы не сработали)
      if (!hasCampfireInInventory && window.getRPGdb) {
        try {
          console.log('[CAMPFIRE] Проверяем инвентарь через IndexedDB...');
          const db = await window.getRPGdb();
          const tx = db.transaction('inventory', 'readonly');
          const store = tx.objectStore('inventory');
          const item = await store.get('campfire');
          if (item && item.quantity > 0) {
            hasCampfireInInventory = true;
            console.log(`[CAMPFIRE] Найден костер в IndexedDB: quantity = ${item.quantity}`);
          }
          await tx.done;
        } catch (error) {
          console.error('[CAMPFIRE] Ошибка при проверке через IndexedDB:', error);
        }
      }
      
      if (!hasCampfireInInventory) {
        console.log('[CAMPFIRE] User does not have a campfire in inventory');
        setIsInstallingCampfire(false);
        alert('You need to craft a campfire first');
        return false;
      }
      
      console.log('[CAMPFIRE] Костер найден в инвентаре, продолжаем установку...');
      
      // Отправляем запрос на сервер для установки campfire
      // Значение 2 означает, что костер установлен и заправлен
      const timestamp = new Date().getTime();
      const response = await fetch(`rpg.php?action=updateUserBoolean&t=${timestamp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, column: 'campfire', value: 2 })  // Устанавливаем значение 2 (установлен и заправлен)
      });
      const data = await response.json();
      if (data.success) {
        console.log('[CAMPFIRE] Campfire successfully installed');
        // Состояние "заправленный" уже установлено на сервере (campfire = 2)
        console.log('[CAMPFIRE] Initial state set as installed and filled on server (value=2)');
        setHasCampfire(true);
        
        // Обновляем инвентарь: уменьшаем campfire на 1 в базе данных
        try {
          const inventoryUpdateResponse = await fetch('rpg.php?action=updateUserInventoryItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId,
              itemId: 'campfire',
              quantity: -1,
              operation: 'increment'
            })
          });
          if (inventoryUpdateResponse.ok) {
            console.log('[CAMPFIRE] Inventory updated: campfire set to -1');
          } else {
            console.error('[CAMPFIRE] Failed to update inventory: campfire to -1');
          }
        } catch (inventoryError) {
          console.error('[CAMPFIRE] Error updating inventory:', inventoryError);
        }
        
        // --- Update local IndexedDB inventory (if available) ---
        if (window.getRPGdb) {
          try {
            const db = await window.getRPGdb();
            const tx = db.transaction('inventory', 'readwrite');
            const store = tx.objectStore('inventory');
            const item = await store.get('campfire');
            if (item && item.quantity > 0) {
              item.quantity -= 1;
              if (item.quantity > 0) {
                await store.put(item);
                console.log('[CAMPFIRE] IndexedDB: campfire -1, осталось', item.quantity);
              } else {
                await store.delete('campfire');
                console.log('[CAMPFIRE] IndexedDB: campfire удалён (0 осталось)');
              }
            } else {
              console.log('[CAMPFIRE] IndexedDB: campfire не найден или уже 0');
            }
            await tx.done;
          } catch (e) {
            console.error('[CAMPFIRE] Ошибка при обновлении IndexedDB:', e);
          }
        }
        
        // --- Синхронизация глобальных ресурсов и UI (всегда!) ---
        let updatedResources = { ...window.globalUserResources };
        if (typeof updatedResources.campfire === 'number' && updatedResources.campfire > 0) {
          updatedResources.campfire -= 1;
          if (updatedResources.campfire < 0) updatedResources.campfire = 0;
        }
        if (window.saveResourcesForModals) {
          window.saveResourcesForModals(updatedResources);
        } else {
          window.globalUserResources = { ...updatedResources };
        }
        console.log('[CAMPFIRE] globalUserResources.campfire теперь:', updatedResources.campfire);
        if (window.forceUpdateUI) {
          await window.forceUpdateUI();
        }
        // --- END ---
        
        // Обновляем глобальную переменную craftingInstallations
        if (window.craftingInstallations) {
          window.craftingInstallations.campfire = true;
          console.log('[CAMPFIRE] Updated global variable craftingInstallations.campfire =', window.craftingInstallations.campfire);
        }
        
        // Перезагружаем данные
        await loadCampfireData();
        setIsInstallingCampfire(false);
        return true;
      } else {
        console.error('[CAMPFIRE] Error installing campfire:', data.message);
        setIsInstallingCampfire(false);
        alert(`Failed to install campfire: ${data.message || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('[CAMPFIRE] Error installing campfire:', error);
      console.error('[CAMPFIRE] Error stack:', error.stack);
      setIsInstallingCampfire(false);
      alert(`Error installing campfire: ${error.message}`);
      return false;
    }
  };

  // Функция для открытия модального окна добавления дров
  const openAddWoodModal = () => {
    setShowAddWoodModal(true);
  };

  // Функция для закрытия модального окна добавления дров
  const closeAddWoodModal = () => {
    setShowAddWoodModal(false);
  };

  // Отображение загрузки
  if (isLoading) {
    console.log('[CAMPFIRE] Рендер состояния загрузки');
    return (
      <div className="campfire-container">
        <BackButton onClick={onBack} position="left" style={{ top: "0px", left: "0px" }} />
        <div className="loading-container">
          <div className="rpg-loading futuristic">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading campfire data...</div>
          </div>
        </div>
      </div>
    );
  }

  // Отображение, если у пользователя нет костра
  if (!hasCampfire) {
    console.log('[CAMPFIRE] Рендер состояния "нет костра"');
    return (
      <div className="campfire-container">
        <BackButton onClick={onBack} position="left" style={{ top: "10px", left: "10px" }} />
        <div className="no-campfire-message">
          <h2>Campfire Not Installed</h2>
          <p>You need to install a campfire before you can use it for cooking.</p>
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
            title="Click to install campfire"
          >
            {isInstallingCampfire ? (
              <div className="loading-spinner" style={{ width: '20px', height: '20px' }}></div>
            ) : (
              <div>Install Campfire</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  console.log('[CAMPFIRE] Рендер основного состояния компонента');
  // --- UI для установленного костра ---
  return (
    <div className="campfire-container">
      <BackButton onClick={onBack} position="left" style={{ top: "0px", left: "0px" }} />
      <div className="campfire-content">
        <h2 style={{ color: "white", textShadow: "0 0 10px rgba(0, 255, 255, 0.7)" }}>Campfire</h2>
        <div className="campfire-image" style={{ position: 'relative' }}>
          <div
            style={{ 
              ...campfireIconStyle, 
              ...iconActiveStyle,
              background: "linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)",
              border: "1px solid rgba(0, 255, 255, 0.4)",
              borderRadius: "15px",
              boxShadow: "0 0 30px rgba(0, 255, 255, 0.3), 0 0 15px rgba(0, 255, 255, 0.2)",
              opacity: (isLoadingState || isLoadingCampfireStatus || isIgniting || isStatusUnknown) ? 0.7 : 1,
              cursor: (isLoadingState || isLoadingCampfireStatus || isIgniting || isStatusUnknown) ? 'wait' : 'pointer',
              position: 'relative'
            }}
            onClick={handleIconClick}
            onMouseDown={() => !(isLoadingState || isLoadingCampfireStatus || isIgniting || isStatusUnknown) && setIsIconActive(true)}
            onMouseUp={() => !(isLoadingState || isLoadingCampfireStatus || isIgniting || isStatusUnknown) && setIsIconActive(false)}
            onMouseLeave={() => !(isLoadingState || isLoadingCampfireStatus || isIgniting || isStatusUnknown) && setIsIconActive(false)}
            tabIndex={(isLoadingState || isLoadingCampfireStatus || isIgniting || isStatusUnknown) ? -1 : 0}
            title={
              (isLoadingState || isLoadingCampfireStatus || isStatusUnknown) ? 'Loading campfire status...' :
              isIgniting ? 'Igniting campfire...' :
              isEmpty ? 'Add Wood' :
              !isLit ? 'Ignite Campfire' :
              'Campfire is burning'
            }
          >
            {(isLoadingState || isLoadingCampfireStatus || isStatusUnknown) ? (
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
                <img src="images/rpg/campfire.png" alt="Campfire (loading)" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'none', border: 'none', boxShadow: 'none', filter: 'grayscale(0.5) blur(1px)', pointerEvents: 'none', opacity: 0.6 }} />
                <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#aaa', fontWeight: 'bold', fontSize: '12px', textShadow: '0 1px 2px #000', pointerEvents: 'none' }}>
                  {isLoadingCampfireStatus ? 'Loading Status...' : isStatusUnknown ? 'Loading Status...' : 'Loading...'}
                </span>
              </React.Fragment>
            ) : isIgniting ? (
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
                  backdropFilter: 'blur(1px)'
                }}>
                  <div className="loading-spinner" style={{ width: '25px', height: '25px' }}></div>
                </div>
                <img src="images/rpg/campfire.png" alt="Campfire (igniting)" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'none', border: 'none', boxShadow: 'none', filter: 'brightness(1.2) saturate(1.3)', pointerEvents: 'none', opacity: 0.8 }} />
                <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#ff6600', fontWeight: 'bold', fontSize: '12px', textShadow: '0 1px 2px #000', pointerEvents: 'none' }}>
                  Igniting...
                </span>
              </React.Fragment>
            ) : isLit ? (
              <React.Fragment>
                <img src="images/rpg/campfire.png" alt="Campfire" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'none', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px', textShadow: '0 1px 2px #000', lineHeight: '1.1', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{timerText}</span>
              </React.Fragment>
            ) : isEmpty ? (
              <React.Fragment>
                <img src="images/rpg/campfire_empty.png" alt="Campfire (empty)" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'none', border: 'none', boxShadow: 'none', filter: 'grayscale(0.7)', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#888', fontWeight: 'bold', fontSize: '14px', pointerEvents: 'none' }}>Add Wood</span>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <img src="images/rpg/campfire.png" alt="Campfire" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'none', border: 'none', boxShadow: 'none', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px', textShadow: '0 1px 2px #000', lineHeight: '1.1', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'pointer', pointerEvents: 'none' }}>Ignite Campfire</span>
              </React.Fragment>
            )}
          </div>
        </div>
        <div className="campfire-recipes" style={{ width: '90%', height: '60vh', margin: '32px auto 0 auto', position: 'relative' }}>
          <h3 style={{marginBottom: 0, marginLeft: 8, color: "white", fontWeight: 700, fontSize: 18, minHeight: 24, textShadow: "0 0 5px rgba(0, 255, 255, 0.7)" }}>Campfire Recipes:</h3>
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
            {getCampfireRecipes().map(recipe => {
              const catalogItem = window.ItemCatalogModule && window.ItemCatalogModule.findCatalogItemById ? window.ItemCatalogModule.findCatalogItemById(recipe.id) : null;
              const imgSrc = catalogItem ? catalogItem.image_path : `images/rpg/${recipe.id}.png`;
              const desc = catalogItem ? catalogItem.description : recipe.description;
              const rarity = catalogItem ? catalogItem.rarity : 'Common';
              const borderColor = (window.ItemCatalogModule && window.ItemCatalogModule.getRarityColor) ? window.ItemCatalogModule.getRarityColor(rarity) : '#aaa';
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
                Light the campfire to use recipes
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
              if (window.ItemCatalogModule && window.ItemCatalogModule.findCatalogItemById) {
                const item = window.ItemCatalogModule.findCatalogItemById(mat);
                if (item && item.name) displayName = item.name;
              }
              // Используем универсальную функцию поиска количества ресурса
              const userHas = findResourceAmount(mat, displayName);
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
      {/* Добавляем модальное окно для добавления дров */}
      <AddWoodModal 
        isOpen={showAddWoodModal} 
        onClose={closeAddWoodModal} 
        onAddWood={handleAddWood} 
        woodLogCount={resources['Wood Log'] || 0} 
      />
    </div>
  );
};

// Экспортируем компонент
window.CraftingModule = window.CraftingModule || {};
window.CraftingModule.CampfireComponent = CampfireComponent;
