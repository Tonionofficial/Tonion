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

// Копия Gathering для добычи руды (Mining)
const Mining = ({ onBack }) => {
  const [mineState, setMineState] = React.useState("idle");
  const [countdown, setCountdown] = React.useState(0);
  const [resources, setResources] = React.useState({});
  const [totalMined, setTotalMined] = React.useState({});
  const [lastClaimTime, setLastClaimTime] = React.useState(0);
  const [nextResourceTime, setNextResourceTime] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sessionCreatedAt, setSessionCreatedAt] = React.useState(0);
  const [resourcesClaimed, setResourcesClaimed] = React.useState(0);
  const [bonusResourcesAdded, setBonusResourcesAdded] = React.useState(0);
  const [isProcessingAction, setIsProcessingAction] = React.useState(false);
  
  // Инициализируем стили модуля ручного сбора при загрузке компонента
  React.useEffect(() => {
    if (window.ManualGatherModule) {
      window.ManualGatherModule.addStyles();
    }
  }, []);
  
  // Инициализируем стили модуля ручного сбора при загрузке компонента
  React.useEffect(() => {
    if (window.ManualGatherModule) {
      window.ManualGatherModule.addStyles();
    }
  }, []);

  // Шанс 40% на железо (Iron Ore) и 60% на камень (Rock)
  const RESOURCE_CHANCES = {
    'Iron Ore': 40,
    'Rock': 60
  };

  const telegramId = localStorage.getItem('telegramId');

  React.useEffect(() => {
    loadMineSession();
    const handleVisibilityChange = () => {
      if (!document.hidden) loadMineSession();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadMineSession = async () => {
    setIsLoading(true);
    const response = await fetch(addTimestamp(`rpg.php?action=getGatheringSession`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId })
    });
    const data = await response.json();
    if (data.success && data.session) {
      const currentTime = Math.floor(Date.now() / 1000);
      const sessionStartTime = data.session.start_time || data.session.created_at;
      if (sessionStartTime) setSessionCreatedAt(sessionStartTime);
      setResourcesClaimed(data.session.resources_claimed || 0);
      if (data.session.end_time <= currentTime) {
        console.log(`Сессия истекла: текущее время ${new Date(currentTime * 1000).toLocaleString()} > конечное время ${new Date(data.session.end_time * 1000).toLocaleString()}`);
        
        // Проверяем, есть ли недополученные ресурсы (если resources_claimed < 16)
        const sessionResourcesClaimed = parseInt(data.session.resources_claimed, 10) || 0;
        if (sessionResourcesClaimed < 16) {
          const remainingResources = 16 - sessionResourcesClaimed;
          console.log(`Обнаружены недополученные ресурсы: ${remainingResources} (resources_claimed: ${sessionResourcesClaimed})`);
          
          // Получаем текущее состояние ресурсов из сессии
          const sessionResources = data.session.resources || {};
          const sessionTotalMined = data.session.total_gathered || {};
          
          // Создаем копии состояний для обновления
          const newResources = { ...sessionResources };
          const newTotalMined = { ...sessionTotalMined };
          
          // Добавляем недополученные ресурсы (максимум remainingResources, минимум 0)
          let bonusResourcesAddedCount = 0;
          console.log(`Начисляем ${remainingResources} недополученных ресурсов...`);
          for (let i = 0; i < remainingResources; i++) {
            // Выбираем случайный ресурс на основе шансов
            const randomNum = Math.random() * 100;
            let chosenResource = 'Iron Ore'; // По умолчанию
            let chanceSum = 0;
            
            for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
              chanceSum += chance;
              if (randomNum <= chanceSum) {
                chosenResource = resource;
                break;
              }
            }
            
            newResources[chosenResource] = (newResources[chosenResource] || 0) + 1;
            newTotalMined[chosenResource] = (newTotalMined[chosenResource] || 0) + 1;
            bonusResourcesAddedCount++;
          }
          const newResourcesClaimed = sessionResourcesClaimed + bonusResourcesAddedCount;
          setBonusResourcesAdded(bonusResourcesAddedCount);
          setMineState('completed');
          setResources(newResources);
          setTotalMined(newTotalMined);
          setResourcesClaimed(newResourcesClaimed);
          setTimeout(() => {
            saveMineData('completed', data.session.end_time, newResources, newTotalMined, data.session.last_claim_time, data.session.next_resource_time, newResourcesClaimed);
          }, 100);
        } else {
          setMineState('completed');
          setResources(data.session.resources || {});
          setTotalMined(data.session.total_gathered || {});
          if (data.session.state === 'active') {
            setTimeout(() => {
              saveMineData('completed', data.session.end_time, data.session.resources || {}, data.session.total_gathered || {}, data.session.last_claim_time, data.session.next_resource_time, data.session.resources_claimed || 0);
            }, 100);
          }
        }
      } else if (data.session.state === 'active') {
        setMineState('active');
        const remainingTime = data.session.end_time - currentTime;
        setCountdown(remainingTime);
        const sessionResources = data.session.resources || {};
        const sessionTotalMined = data.session.total_gathered || {};
        const lastLoginTime = data.session.last_login || currentTime;
        const timeDifference = lastLoginTime - sessionStartTime;
        const maxResourceAdditions = Math.floor(timeDifference / (29 * 60));
        const lastClaimTimeValue = data.session.last_claim_time || sessionStartTime;
        const alreadyAddedResources = Math.floor((lastClaimTimeValue - sessionStartTime) / (29 * 60));
        const resourcesNeedToAdd = Math.max(0, maxResourceAdditions - alreadyAddedResources);
        if (resourcesNeedToAdd > 0) {
          const newResources = { ...sessionResources };
          const newTotalMined = { ...sessionTotalMined };
          let resourcesAddedCount = 0;
          for (let i = 0; i < resourcesNeedToAdd; i++) {
            // Выбираем случайный ресурс на основе шансов
            const randomNum = Math.random() * 100;
            let chosenResource = 'Iron Ore'; // По умолчанию
            let chanceSum = 0;
            
            for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
              chanceSum += chance;
              if (randomNum <= chanceSum) {
                chosenResource = resource;
                break;
              }
            }
            
            newResources[chosenResource] = (newResources[chosenResource] || 0) + 1;
            newTotalMined[chosenResource] = (newTotalMined[chosenResource] || 0) + 1;
            resourcesAddedCount++;
          }
          setResources(newResources);
          setTotalMined(newTotalMined);
          setResourcesClaimed(prev => {
            const base = Math.max(parseInt(prev, 10) || 0, parseInt(data.session.resources_claimed, 10) || 0);
            const newVal = base + resourcesAddedCount;
            const newLastClaimTime = sessionStartTime + (alreadyAddedResources + resourcesNeedToAdd) * (29 * 60);
            setLastClaimTime(newLastClaimTime);
            const newNextResourceTime = newLastClaimTime + (29 * 60);
            setNextResourceTime(newNextResourceTime);
            setTimeout(() => {
              saveMineData('active', data.session.end_time, newResources, newTotalMined, newLastClaimTime, newNextResourceTime, newVal);
            }, 100);
            return newVal;
          });
        } else {
          setResources(sessionResources);
          setTotalMined(sessionTotalMined);
          setLastClaimTime(lastClaimTimeValue);
          const newNextResourceTime = lastClaimTimeValue + (29 * 60);
          setNextResourceTime(newNextResourceTime);
          setTimeout(() => {
            saveMineData('active', data.session.end_time, sessionResources, sessionTotalMined, lastClaimTimeValue, newNextResourceTime, data.session.resources_claimed || 0);
          }, 100);
        }
      } else if (data.session.state === 'completed' || (data.session.resources && Object.keys(data.session.resources).length > 0)) {
        setMineState('completed');
        setResources(data.session.resources || {});
        setTotalMined(data.session.total_gathered || {});
      } else {
        setMineState('idle');
        setResources({});
        setTotalMined({});
        setResourcesClaimed(0);
      }
    } else {
      setMineState('idle');
      setResources({});
      setTotalMined({});
      setResourcesClaimed(0);
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    let timer;
    if (mineState === "active" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setMineState("completed");
            saveMineData('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [mineState, countdown]);

  React.useEffect(() => {
    const checkResourceTimer = setInterval(() => {
      if (mineState === 'active') {
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= nextResourceTime) addRandomMine();
      }
    }, 60000); // Проверка каждую минуту
    return () => clearInterval(checkResourceTimer);
  }, [mineState, nextResourceTime]);

  const addRandomMine = () => {
    if (resourcesClaimed >= 16) {
      console.log(`Достигнут лимит ресурсов (${resourcesClaimed}/16), больше получить нельзя`);
      return;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    console.log(`[addRandomMine] Запущен в: ${new Date(currentTime * 1000).toLocaleString()}`);
    console.log(`[addRandomMine] Последнее начисление было в: ${new Date(lastClaimTime * 1000).toLocaleString()}`);
    console.log(`[addRandomMine] Ожидаемое время начисления: ${new Date(nextResourceTime * 1000).toLocaleString()}`);
    
    // Выбираем случайный ресурс на основе шансов
    const randomNum = Math.random() * 100;
    let chosenResource = 'Iron Ore'; // По умолчанию
    let chanceSum = 0;
    
    for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
      chanceSum += chance;
      if (randomNum <= chanceSum) {
        chosenResource = resource;
        break;
      }
    }
    
    const newResources = { ...resources };
    const newTotalMined = { ...totalMined };
    newResources[chosenResource] = (newResources[chosenResource] || 0) + 1;
    newTotalMined[chosenResource] = (newTotalMined[chosenResource] || 0) + 1;
    const nextTime = currentTime + (29 * 60);
    setResources(newResources);
    setTotalMined(newTotalMined);
    setLastClaimTime(currentTime);
    setNextResourceTime(nextTime);
    setResourcesClaimed(prev => {
      const newValue = (parseInt(prev, 10) || 0) + 1;
      console.log(`Счетчик полученных ресурсов: ${newValue}/16`);
      setTimeout(() => {
        saveMineData('active', null, newResources, newTotalMined, currentTime, nextTime, newValue);
      }, 100);
      return newValue;
    });
    
    console.log(`Получен новый ресурс: ${chosenResource}`);
  };

  const saveMineData = async (state = mineState, existingEndTime = null, currentResources = resources, currentTotalMined = totalMined, currentLastClaimTime = lastClaimTime, currentNextResourceTime = nextResourceTime, currentResourcesClaimed = resourcesClaimed) => {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const safeResourcesClaimed = parseInt(currentResourcesClaimed, 10) || 0;
      let endTime;
      if (state === 'active') {
        if (existingEndTime) {
          endTime = existingEndTime;
        } else {
          const startTime = sessionCreatedAt || currentTime;
          endTime = startTime + (8 * 60 * 60);
        }
        if (currentTime >= endTime) state = 'completed';
      } else {
        endTime = existingEndTime || currentTime;
      }
      const gatheringType = 'mine';
      const mineData = {
        telegramId,
        state,
        resources: currentResources,
        totalGathered: currentTotalMined,
        lastClaimTime: currentLastClaimTime,
        nextResourceTime: currentNextResourceTime,
        resourcesClaimed: safeResourcesClaimed,
        createdAt: currentTime,
        endTime: endTime,
        startTime: sessionCreatedAt || currentTime,
        type: gatheringType
      };
      const response = await fetch(addTimestamp(`rpg.php?action=saveGatheringSession`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(mineData)
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Ошибка при сохранении данных добычи руды:', data.message);
      } else {
        if (state === 'completed' && mineState !== 'completed') {
          setMineState('completed');
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении данных добычи руды:', error);
    }
  };

  const startMine = () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const duration = 8 * 60 * 60; // 8 часов в секундах
    setBonusResourcesAdded(0);
    const startTime = currentTime;
    const endTime = startTime + duration;
    const nextTime = startTime + (29 * 60); // 29 минут в секундах
    const emptyResources = {};
    const emptyTotalMined = {};
    setSessionCreatedAt(startTime);
    setMineState("active");
    setCountdown(duration);
    setResources(emptyResources);
    setTotalMined(emptyTotalMined);
    setLastClaimTime(startTime);
    setNextResourceTime(nextTime);
    const initialResourcesClaimed = 0;
    setResourcesClaimed(initialResourcesClaimed);
    setTimeout(() => {
      saveMineData('active', endTime, emptyResources, emptyTotalMined, startTime, nextTime, initialResourcesClaimed);
    }, 100);
  };

  const cancelMine = async () => {
    // Блокируем кнопку, чтобы предотвратить множественные нажатия
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSpent = currentTime - sessionCreatedAt;
    setBonusResourcesAdded(0);
    await logMineSession('Canceled', timeSpent);
    
    if (Object.keys(resources).length > 0) {
      // Есть ресурсы для сохранения, отправляем их на сервер
      await saveMineResourcesInDatabase();
      
      // Добавляем вызов функции синхронизации ресурсов после сохранения в БД
      if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
        console.log('Синхронизация ресурсов с IndexedDB после отмены добычи руды...');
        await window.ModalModule.syncResourcesWithIndexedDB();
      } else if (window.syncResourcesWithIndexedDB) {
        console.log('Синхронизация ресурсов через глобальную функцию...');
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
        console.log('Обновление отображения инвентаря после отмены добычи руды...');
        await window.InventoryModule.refreshInventoryDisplay();
      }
    }
    
    setMineState("idle");
    setCountdown(0);
    setResources({});
    setTotalMined({});
    setSessionCreatedAt(0);
    try {
      const response = await fetch(addTimestamp(`rpg.php?action=deleteGatheringSession`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Ошибка при удалении сессии добычи руды:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при удалении сессии добычи руды:', error);
    }
  };

  const claimMine = async () => {
    // Блокируем кнопку, чтобы предотвратить множественные нажатия
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSpent = currentTime - sessionCreatedAt;
    setBonusResourcesAdded(0);
    await logMineSession('Claimed', timeSpent);
    
    await saveMineResourcesInDatabase();
    
    // Добавляем вызов функции синхронизации ресурсов после сохранения в БД
    if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
      console.log('Синхронизация ресурсов с IndexedDB после добычи руды...');
      await window.ModalModule.syncResourcesWithIndexedDB();
    } else if (window.syncResourcesWithIndexedDB) {
      console.log('Синхронизация ресурсов через глобальную функцию...');
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
      console.log('Обновление отображения инвентаря после добычи руды...');
      await window.InventoryModule.refreshInventoryDisplay();
    }
    
    setMineState("idle");
    setCountdown(0);
    setResources({});
    setTotalMined({});
    setSessionCreatedAt(0);
    try {
      const response = await fetch(addTimestamp(`rpg.php?action=deleteGatheringSession`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Ошибка при удалении сессии добычи руды:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при удалении сессии добычи руды:', error);
    }
  };

  const logMineSession = async (endMethod, timeSpent) => {
    try {
      const hours = Math.floor(timeSpent / 3600);
      const minutes = Math.floor((timeSpent % 3600) / 60);
      const seconds = Math.floor(timeSpent % 60);
      const formattedTimeSpent = `${hours}h ${minutes}m ${seconds}s`;
      const logData = {
        telegramId,
        startTime: new Date(sessionCreatedAt * 1000).toISOString(),
        endTime: new Date(Math.floor(Date.now() / 1000) * 1000).toISOString(),
        resources: JSON.stringify(resources),
        endMethod: `${endMethod} (${formattedTimeSpent})`
      };
      const response = await fetch(addTimestamp(`rpg.php?action=logGatheringSession`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      const data = await response.json();
      if (data.success) {
        console.log('Информация о сессии добычи руды успешно записана в лог');
      } else {
        console.error('Ошибка при записи информации о сессии добычи руды в лог:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при логировании сессии добычи руды:', error);
    }
  };

  const saveMineResourcesInDatabase = async () => {
    try {
      if (!telegramId) return;
      const response = await fetch(addTimestamp(`rpg.php?action=updateResources`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, resources, resourcesClaimed })
      });
      const data = await response.json();
      if (data.success) {
        console.log('Ресурсы добычи руды успешно сохранены в базе данных!');
      } else {
        console.error('Ошибка при сохранении ресурсов добычи руды:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при отправке запроса на сохранение ресурсов добычи руды:', error);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Добавляем функцию для определения пути к изображению ресурса
  const getResourceImagePath = (resource) => {
    // Специальная обработка для Iron Ore
    if (resource === 'Iron Ore') {
      return 'images/rpg/ironore.png';
    }
    // Для всех остальных ресурсов используем стандартное преобразование
    return `images/rpg/${resource.toLowerCase().replace(/\s+/g, '')}.png`;
  };

  if (isLoading) {
    return (
      <div className="rpg-main-screen">
        <BackButton onClick={onBack} position="left" />
        <div className="rpg-content-area">
          <div className="rpg-loading futuristic">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading mining data...</div>
          </div>
        </div>
      </div>
    );
  }

  const pulseKeyframes = `@keyframes pulse {0% { opacity: 1; }50% { opacity: 0.7; }100% { opacity: 1; }}`;

  return (
    <div className="rpg-main-screen" style={{position: 'relative', minHeight: '100vh', overflow: 'hidden'}}>
      {/* Фон на всю страницу */}
      <div className="page-background" style={{
        backgroundImage: `url('images/rpg/backgrounds/minebg.png')`
      }}></div>
      <BackButton onClick={onBack} position="left" />
      <div className="bottom-aligned-content">
        <div className="gathering-page futuristic-gathering">
          <div className="gathering-controls">
            {mineState === "idle" && (
              <div className="action-button-container">
                <button className="gathering-button futuristic" onClick={startMine}>Auto</button>
                <button 
                  className="gathering-button futuristic interactive"
                  onClick={async () => {
                    // Запрашиваем актуальную стамину с сервера перед запуском
                    if (window.StaminaModule) {
                      console.log('[Interactive Mine Button] Обновляем стамину с сервера');
                      try {
                        await window.StaminaModule.update();
                        console.log('[Interactive Mine Button] Стамина обновлена');
                      } catch (error) {
                        console.error('[Interactive Mine Button] Ошибка обновления стамины:', error);
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
                      window.ManualGatherModule.init(container, 'mine');
                    }
                  }}
                >
                  Interactive
                </button>
              </div>
            )}
            {mineState === "active" && (
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
                  onClick={cancelMine}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Processing...' : 'Cancel'}
                </button>
              </React.Fragment>
            )}
            {mineState === "completed" && (
              <div>
                <button 
                  className={`gathering-button futuristic claim ${isProcessingAction ? 'disabled' : ''}`}
                  onClick={claimMine}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Processing...' : 'Claim Ore'}
                </button>
              </div>
            )}
          </div>
          {(mineState === "active" || mineState === "completed") && (
            <div className="gathered-resources">
              <h3>Mined total:</h3>
              <div className="resources-list">
                {Object.keys(resources).length > 0 ? (
                  Object.entries(resources).map(([resource, amount]) => (
                    <div key={resource} className="resource-item">
                      <div className="resource-name">{resource}</div>
                      <div className="resource-icon futuristic">
                        <img src={getResourceImagePath(resource)} 
                             onError={(e) => { e.target.src = "images/rpg/unknown.png"; }} 
                             alt={resource} />
                        <span className="resource-amount">x{amount}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No ore mined yet. Check back soon!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Экспортируем компонент
window.CraftingModule = window.CraftingModule || {};
window.CraftingModule.Mining = Mining; 