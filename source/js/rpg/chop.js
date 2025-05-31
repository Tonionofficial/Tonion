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

// Копия Gathering для добычи дерева (ChopWood)
const ChopWood = ({ onBack }) => {
  const [chopState, setChopState] = React.useState("idle");
  const [countdown, setCountdown] = React.useState(0);
  const [resources, setResources] = React.useState({});
  const [totalChopped, setTotalChopped] = React.useState({});
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

  // Шанс 40% на дерево (Wood Log) и 60% на ветку (Stick)
  const RESOURCE_CHANCES = {
    'Wood Log': 40,
    'Stick': 60
  };

  const telegramId = localStorage.getItem('telegramId');

  React.useEffect(() => {
    loadChopSession();
    const handleVisibilityChange = () => {
      if (!document.hidden) loadChopSession();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadChopSession = async () => {
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
        
        const sessionResourcesClaimed = parseInt(data.session.resources_claimed, 10) || 0;
        if (sessionResourcesClaimed < 16) {
          const remainingResources = 16 - sessionResourcesClaimed;
          console.log(`Обнаружены недополученные ресурсы: ${remainingResources} (resources_claimed: ${sessionResourcesClaimed})`);
          
          const sessionResources = data.session.resources || {};
          const sessionTotalChopped = data.session.total_gathered || {};
          
          const newResources = { ...sessionResources };
          const newTotalChopped = { ...sessionTotalChopped };
          let bonusResourcesAddedCount = 0;
          for (let i = 0; i < remainingResources; i++) {
            // Выбираем случайный ресурс на основе шансов
            const randomNum = Math.random() * 100;
            let chosenResource = 'Wood Log'; // По умолчанию
            let chanceSum = 0;
            
            for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
              chanceSum += chance;
              if (randomNum <= chanceSum) {
                chosenResource = resource;
                break;
              }
            }
            
            newResources[chosenResource] = (newResources[chosenResource] || 0) + 1;
            newTotalChopped[chosenResource] = (newTotalChopped[chosenResource] || 0) + 1;
            bonusResourcesAddedCount++;
          }
          const newResourcesClaimed = sessionResourcesClaimed + bonusResourcesAddedCount;
          setBonusResourcesAdded(bonusResourcesAddedCount);
          setChopState('completed');
          setResources(newResources);
          setTotalChopped(newTotalChopped);
          setResourcesClaimed(newResourcesClaimed);
          setTimeout(() => {
            saveChopData('completed', data.session.end_time, newResources, newTotalChopped, data.session.last_claim_time, data.session.next_resource_time, newResourcesClaimed);
          }, 100);
        } else {
          setChopState('completed');
          setResources(data.session.resources || {});
          setTotalChopped(data.session.total_gathered || {});
          if (data.session.state === 'active') {
            setTimeout(() => {
              saveChopData('completed', data.session.end_time, data.session.resources || {}, data.session.total_gathered || {}, data.session.last_claim_time, data.session.next_resource_time, data.session.resources_claimed || 0);
            }, 100);
          }
        }
      } else if (data.session.state === 'active') {
        setChopState('active');
        const remainingTime = data.session.end_time - currentTime;
        setCountdown(remainingTime);
        const sessionResources = data.session.resources || {};
        const sessionTotalChopped = data.session.total_gathered || {};
        const lastLoginTime = data.session.last_login || currentTime;
        const timeDifference = lastLoginTime - sessionStartTime;
        const maxResourceAdditions = Math.floor(timeDifference / (29 * 60));
        const lastClaimTimeValue = data.session.last_claim_time || sessionStartTime;
        const alreadyAddedResources = Math.floor((lastClaimTimeValue - sessionStartTime) / (29 * 60));
        const resourcesNeedToAdd = Math.max(0, maxResourceAdditions - alreadyAddedResources);
        if (resourcesNeedToAdd > 0) {
          const newResources = { ...sessionResources };
          const newTotalChopped = { ...sessionTotalChopped };
          let resourcesAddedCount = 0;
          for (let i = 0; i < resourcesNeedToAdd; i++) {
            // Выбираем случайный ресурс на основе шансов
            const randomNum = Math.random() * 100;
            let chosenResource = 'Wood Log'; // По умолчанию
            let chanceSum = 0;
            
            for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
              chanceSum += chance;
              if (randomNum <= chanceSum) {
                chosenResource = resource;
                break;
              }
            }
            
            newResources[chosenResource] = (newResources[chosenResource] || 0) + 1;
            newTotalChopped[chosenResource] = (newTotalChopped[chosenResource] || 0) + 1;
            resourcesAddedCount++;
          }
          setResources(newResources);
          setTotalChopped(newTotalChopped);
          setResourcesClaimed(prev => {
            const base = Math.max(parseInt(prev, 10) || 0, parseInt(data.session.resources_claimed, 10) || 0);
            const newVal = base + resourcesAddedCount;
            const newLastClaimTime = sessionStartTime + (alreadyAddedResources + resourcesNeedToAdd) * (29 * 60);
            setLastClaimTime(newLastClaimTime);
            const newNextResourceTime = newLastClaimTime + (29 * 60);
            setNextResourceTime(newNextResourceTime);
            setTimeout(() => {
              saveChopData('active', data.session.end_time, newResources, newTotalChopped, newLastClaimTime, newNextResourceTime, newVal);
            }, 100);
            return newVal;
          });
        } else {
          setResources(sessionResources);
          setTotalChopped(sessionTotalChopped);
          setLastClaimTime(lastClaimTimeValue);
          const newNextResourceTime = lastClaimTimeValue + (29 * 60);
          setNextResourceTime(newNextResourceTime);
          setTimeout(() => {
            saveChopData('active', data.session.end_time, sessionResources, sessionTotalChopped, lastClaimTimeValue, newNextResourceTime, data.session.resources_claimed || 0);
          }, 100);
        }
      } else if (data.session.state === 'completed' || (data.session.resources && Object.keys(data.session.resources).length > 0)) {
        setChopState('completed');
        setResources(data.session.resources || {});
        setTotalChopped(data.session.total_gathered || {});
      } else {
        setChopState('idle');
        setResources({});
        setTotalChopped({});
        setResourcesClaimed(0);
      }
    } else {
      setChopState('idle');
      setResources({});
      setTotalChopped({});
      setResourcesClaimed(0);
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    let timer;
    if (chopState === "active" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setChopState("completed");
            saveChopData('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [chopState, countdown]);

  React.useEffect(() => {
    const checkResourceTimer = setInterval(() => {
      if (chopState === 'active') {
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= nextResourceTime) addRandomChop();
      }
    }, 60000); // Проверка каждую минуту
    return () => clearInterval(checkResourceTimer);
  }, [chopState, nextResourceTime]);

  const addRandomChop = () => {
    if (resourcesClaimed >= 16) {
      console.log(`Достигнут лимит ресурсов (${resourcesClaimed}/16), больше получить нельзя`);
      return;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    console.log(`[addRandomChop] Запущен в: ${new Date(currentTime * 1000).toLocaleString()}`);
    console.log(`[addRandomChop] Последнее начисление было в: ${new Date(lastClaimTime * 1000).toLocaleString()}`);
    console.log(`[addRandomChop] Ожидаемое время начисления: ${new Date(nextResourceTime * 1000).toLocaleString()}`);
    
    // Выбираем случайный ресурс на основе шансов
    const randomNum = Math.random() * 100;
    let chosenResource = 'Wood Log'; // По умолчанию
    let chanceSum = 0;
    
    for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
      chanceSum += chance;
      if (randomNum <= chanceSum) {
        chosenResource = resource;
        break;
      }
    }
    
    const newResources = { ...resources };
    const newTotalChopped = { ...totalChopped };
    newResources[chosenResource] = (newResources[chosenResource] || 0) + 1;
    newTotalChopped[chosenResource] = (newTotalChopped[chosenResource] || 0) + 1;
    const nextTime = currentTime + (29 * 60);
    setResources(newResources);
    setTotalChopped(newTotalChopped);
    setLastClaimTime(currentTime);
    setNextResourceTime(nextTime);
    setResourcesClaimed(prev => {
      const newValue = (parseInt(prev, 10) || 0) + 1;
      console.log(`Счетчик полученных ресурсов: ${newValue}/16`);
      setTimeout(() => {
        saveChopData('active', null, newResources, newTotalChopped, currentTime, nextTime, newValue);
      }, 100);
      return newValue;
    });
    
    console.log(`Получен новый ресурс: ${chosenResource}`);
    console.log(`- Текущее время: ${new Date(currentTime * 1000).toLocaleString()}`);
    console.log(`- Следующий ресурс в: ${new Date(nextTime * 1000).toLocaleString()} (через 29 минут)`);
  };

  const saveChopData = async (state = chopState, existingEndTime = null, currentResources = resources, currentTotalChopped = totalChopped, currentLastClaimTime = lastClaimTime, currentNextResourceTime = nextResourceTime, currentResourcesClaimed = resourcesClaimed) => {
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
      const gatheringType = 'chop';
      const gatheringData = {
        telegramId,
        state,
        resources: currentResources,
        totalGathered: currentTotalChopped,
        lastClaimTime: currentLastClaimTime,
        nextResourceTime: currentNextResourceTime,
        resourcesClaimed: safeResourcesClaimed,
        createdAt: currentTime,
        endTime: endTime,
        startTime: sessionCreatedAt || currentTime
      };
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
        console.error('Ошибка при сохранении данных добычи дерева:', data.message);
      } else {
        if (state === 'completed' && chopState !== 'completed') {
          setChopState('completed');
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении данных добычи дерева:', error);
    }
  };

  const startChop = () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const duration = 8 * 60 * 60; // 8 часов в секундах
    setBonusResourcesAdded(0);
    const startTime = currentTime;
    const endTime = startTime + duration;
    const nextTime = startTime + (29 * 60); // 29 минут в секундах
    const emptyResources = {};
    const emptyTotalChopped = {};
    setSessionCreatedAt(startTime);
    setChopState("active");
    setCountdown(duration);
    setResources(emptyResources);
    setTotalChopped(emptyTotalChopped);
    setLastClaimTime(startTime);
    setNextResourceTime(nextTime);
    const initialResourcesClaimed = 0;
    setResourcesClaimed(initialResourcesClaimed);
    setTimeout(() => {
      saveChopData('active', endTime, emptyResources, emptyTotalChopped, startTime, nextTime, initialResourcesClaimed);
    }, 100);
    
    console.log(`- Следующий ресурс в: ${new Date(nextTime * 1000).toLocaleString()} (через 29 минут)`);
  };

  const cancelChop = async () => {
    // Блокируем кнопку, чтобы предотвратить множественные нажатия
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSpent = currentTime - sessionCreatedAt;
    setBonusResourcesAdded(0);
    await logChopSession('Canceled', timeSpent);
    
    if (Object.keys(resources).length > 0) {
      // Есть ресурсы для сохранения, отправляем их на сервер
      await saveChopResourcesInDatabase();
      
      // Добавляем вызов функции синхронизации ресурсов после сохранения в БД
      if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
        console.log('Синхронизация ресурсов с IndexedDB после отмены рубки дерева...');
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
        console.log('Обновление отображения инвентаря после отмены рубки дерева...');
        await window.InventoryModule.refreshInventoryDisplay();
      }
    }
    
    setChopState("idle");
    setCountdown(0);
    setResources({});
    setTotalChopped({});
    setSessionCreatedAt(0);
    try {
      const response = await fetch(addTimestamp(`rpg.php?action=deleteGatheringSession`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Ошибка при удалении сессии добычи дерева:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при удалении сессии добычи дерева:', error);
    }
  };

  const claimChop = async () => {
    // Блокируем кнопку, чтобы предотвратить множественные нажатия
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSpent = currentTime - sessionCreatedAt;
    setBonusResourcesAdded(0);
    await logChopSession('Claimed', timeSpent);
    
    await saveChopResourcesInDatabase();
    
    // Добавляем вызов функции синхронизации ресурсов после сохранения в БД
    if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
      console.log('Синхронизация ресурсов с IndexedDB после сбора дерева...');
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
      console.log('Обновление отображения инвентаря после сбора дерева...');
      await window.InventoryModule.refreshInventoryDisplay();
    }
    
    setChopState("idle");
    setCountdown(0);
    setResources({});
    setTotalChopped({});
    setSessionCreatedAt(0);
    try {
      const response = await fetch(addTimestamp(`rpg.php?action=deleteGatheringSession`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Ошибка при удалении сессии добычи дерева:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при удалении сессии добычи дерева:', error);
    }
  };

  const logChopSession = async (endMethod, timeSpent) => {
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
        console.log('Информация о сессии добычи дерева успешно записана в лог');
      } else {
        console.error('Ошибка при записи информации о сессии добычи дерева в лог:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при логировании сессии добычи дерева:', error);
    }
  };

  const saveChopResourcesInDatabase = async () => {
    try {
      if (!telegramId) return;
      const response = await fetch(addTimestamp(`rpg.php?action=updateResources`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, resources, resourcesClaimed })
      });
      const data = await response.json();
      if (data.success) {
        console.log('Ресурсы добычи дерева успешно сохранены в базе данных!');
      } else {
        console.error('Ошибка при сохранении ресурсов добычи дерева:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при отправке запроса на сохранение ресурсов добычи дерева:', error);
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
    // Для всех ресурсов используем стандартное преобразование
    return `images/rpg/${resource.toLowerCase().replace(/\s+/g, '')}.png`;
  };

  if (isLoading) {
    return (
      <div className="rpg-main-screen">
        <BackButton onClick={onBack} position="left" />
        <div className="rpg-content-area">
          <div className="rpg-loading futuristic">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading lumbering data...</div>
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
        backgroundImage: `url('images/rpg/backgrounds/chopbg.png')`
      }}></div>
      <BackButton onClick={onBack} position="left" />
      <div className="bottom-aligned-content">
        <div className="gathering-page futuristic-gathering">
          <div className="gathering-controls">
            {chopState === "idle" && (
              <div className="action-button-container">
                <button className="gathering-button futuristic" onClick={startChop}>Auto</button>
                <button 
                  className="gathering-button futuristic interactive"
                  onClick={async () => {
                    // Запрашиваем актуальную стамину с сервера перед запуском
                    if (window.StaminaModule) {
                      console.log('[Interactive Chop Button] Обновляем стамину с сервера');
                      try {
                        await window.StaminaModule.update();
                        console.log('[Interactive Chop Button] Стамина обновлена');
                      } catch (error) {
                        console.error('[Interactive Chop Button] Ошибка обновления стамины:', error);
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
                      window.ManualGatherModule.init(container, 'chop');
                    }
                  }}
                >
                  Interactive
                </button>
              </div>
            )}
            {chopState === "active" && (
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
                  onClick={cancelChop}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Processing...' : 'Cancel'}
                </button>
              </React.Fragment>
            )}
            {chopState === "completed" && (
              <div>
                <button 
                  className={`gathering-button futuristic claim ${isProcessingAction ? 'disabled' : ''}`}
                  onClick={claimChop}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Processing...' : 'Claim Wood'}
                </button>
              </div>
            )}
          </div>
          {(chopState === "active" || chopState === "completed") && (
            <div className="gathered-resources">
              <h3>Chopped total:</h3>
              <div className="resources-list">
                {Object.keys(resources).length > 0 ? (
                  Object.entries(resources).map(([resource, amount]) => (
                    <div key={resource} className="resource-item">
                      <div className="resource-name">{resource}</div>
                      <div className="resource-icon futuristic">
                        <img src={getResourceImagePath(resource)} onError={(e) => { e.target.src = "images/rpg/unknown.png"; }} alt={resource} />
                        <span className="resource-amount">x{amount}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No wood chopped yet. Check back soon!</p>
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
window.CraftingModule.ChopWood = ChopWood; 