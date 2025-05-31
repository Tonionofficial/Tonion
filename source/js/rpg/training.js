// Универсальная функция для обновления отображения опыта
const updateExperienceDisplay = async (currentExperience, experienceAdded) => {
  console.log(`[updateExperienceDisplay] Обновляем опыт: текущий=${currentExperience}, добавлено=${experienceAdded}`);
  
  // 1. Проверяем уровень при получении опыта
  let levelUpResult = null;
  if (experienceAdded > 0 && window.checkLevelUp) {
    try {
      levelUpResult = await window.checkLevelUp(currentExperience);
      if (levelUpResult.success && levelUpResult.levelUp) {
        console.log(`[updateExperienceDisplay] Повышение уровня! ${levelUpResult.oldLevel} -> ${levelUpResult.newLevel}`);
        
        // Проверяем критическое изменение уровня с 5 на 6
        if (levelUpResult.oldLevel === 5 && levelUpResult.newLevel === 6) {
          console.log('[updateExperienceDisplay] Критическое изменение уровня: 5 -> 6. Обновляем доступность тренировок.');
          
          // Отправляем событие для обновления доступности тренировок
          window.dispatchEvent(new CustomEvent('levelCriticalChange', { 
            detail: { 
              oldLevel: 5,
              newLevel: 6,
              shouldBlockNovice: true,
              shouldUnlockExperienced: true
            } 
          }));
          
          // Также обновляем userData в localStorage если есть
          const storedUserData = localStorage.getItem('rpg_userData');
          if (storedUserData) {
            try {
              const userData = JSON.parse(storedUserData);
              userData.level = 6;
              localStorage.setItem('rpg_userData', JSON.stringify(userData));
            } catch (e) {
              console.error('[updateExperienceDisplay] Ошибка обновления userData в localStorage:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('[updateExperienceDisplay] Ошибка проверки уровня:', error);
    }
  }
  
  // 2. Получаем актуальный уровень для расчета прогресса
  let currentLevel = 1;
  if (window.getLevelByExp) {
    currentLevel = window.getLevelByExp(currentExperience);
  } else {
    // Fallback - получаем из DOM
    const levelElement = document.querySelector('.character-level.futuristic');
    currentLevel = levelElement ? parseInt(levelElement.textContent) || 1 : 1;
  }
  
  // 3. Рассчитываем прогресс до следующего уровня
  let expCurrent = 0;
  let expTotal = 100;
  
  if (window.LevelingModule) {
    const progress = window.LevelingModule.getLevelProgress(currentExperience, currentLevel);
    expCurrent = progress.current;
    expTotal = progress.needed;
  } else {
    // Fallback - старая логика
    expTotal = currentLevel * 100;
    expCurrent = currentExperience % expTotal;
  }
  
  const expPercentage = Math.min(100, (expCurrent / expTotal) * 100);
  
  // 4. Прямое обновление элементов DOM на странице персонажа
  const experienceBar = document.querySelector('.experience-bar.futuristic');
  const experienceText = document.querySelector('.experience-text');
  
  if (experienceBar && experienceText) {
    experienceBar.style.width = `${expPercentage}%`;
    experienceText.textContent = `${window.formatLargeNumber ? window.formatLargeNumber(expCurrent) : expCurrent}/${window.formatLargeNumber ? window.formatLargeNumber(expTotal) : expTotal}`;
    
    console.log(`[updateExperienceDisplay] DOM на странице персонажа обновлен: ${expCurrent}/${expTotal} (${expPercentage.toFixed(1)}%)`);
  } else {
    console.log('[updateExperienceDisplay] Элементы опыта на странице персонажа не найдены');
  }
  
  // 5. Обновляем опыт на главной странице через ExperienceModule
  if (window.ExperienceModule) {
    // Обновляем кэш модуля опыта
    const experienceData = window.ExperienceModule.get();
    if (experienceData) {
      experienceData.currentExperience = currentExperience;
      experienceData.level = currentLevel;
      
      // Перерисовываем бар опыта на главной странице
      const mainContainer = document.getElementById('main-experience-container');
      if (mainContainer) {
        window.ExperienceModule.renderBar('main-experience-container');
        console.log(`[updateExperienceDisplay] Опыт на главной странице обновлен: ${currentExperience} (уровень ${currentLevel})`);
      }
    }
  }
  
  // 6. Отправляем событие для React компонентов
  window.dispatchEvent(new CustomEvent('experienceUpdated', { 
    detail: { 
      experienceAdded: experienceAdded || 0,
      newExperience: currentExperience,
      currentLevel: currentLevel
    } 
  }));
  
  // Примечание: не вызываем StatsModule.updateExperienceDisplay во избежание рекурсии
  // StatsModule будет обновляться через React событие если нужно
};

// Делаем функцию доступной глобально
window.updateExperienceDisplay = updateExperienceDisplay;

// Создаем глобальную функцию updateCharacterExperience для обратной совместимости
window.updateCharacterExperience = (currentExperience) => {
  // Прямое обновление DOM без вызова updateExperienceDisplay чтобы избежать рекурсии
  const experienceBar = document.querySelector('.experience-bar.futuristic');
  const experienceText = document.querySelector('.experience-text');
  
  if (experienceBar && experienceText) {
    const levelElement = document.querySelector('.character-level.futuristic');
    const level = levelElement ? parseInt(levelElement.textContent) || 1 : 1;
    const expTotal = level * 100;
    const expPercentage = Math.min(100, (currentExperience / expTotal) * 100);
    
    experienceBar.style.width = `${expPercentage}%`;
    experienceText.textContent = `${window.formatLargeNumber ? window.formatLargeNumber(currentExperience) : currentExperience}/${window.formatLargeNumber ? window.formatLargeNumber(expTotal) : expTotal}`;
    
    console.log(`[updateCharacterExperience] DOM обновлен: ${currentExperience}/${expTotal}`);
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

// Компонент для тренировки (Training)
const Training = ({ onBack, trainingType = 'novice' }) => {
  const [trainingState, setTrainingState] = React.useState("idle");
  const [countdown, setCountdown] = React.useState(0);
  const [experience, setExperience] = React.useState({});
  const [totalTrained, setTotalTrained] = React.useState({});
  const [lastClaimTime, setLastClaimTime] = React.useState(0);
  const [nextExperienceTime, setNextExperienceTime] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sessionCreatedAt, setSessionCreatedAt] = React.useState(0);
  const [experienceClaimed, setExperienceClaimed] = React.useState(0);
  const [bonusExperienceAdded, setBonusExperienceAdded] = React.useState(0);
  const [isProcessingAction, setIsProcessingAction] = React.useState(false);
  
  // Инициализируем стили интерактивной тренировки при загрузке компонента
  React.useEffect(() => {
    if (window.InteractiveTrainingModule) {
      window.InteractiveTrainingModule.addStyles();
    }
  }, []);

  // Настройки для разных типов тренировок
  const TRAINING_CONFIGS = {
    novice: {
      duration: 8 * 60 * 60, // 8 часов
      experienceTypes: {
        'Experience': 200
      },
      experiencePerInterval: 12.5, // 6.25 опыта за 30 минут
      maxExperience: 200, // 8 часов * 2 интервала в час * 6.25 опыта = 100
      intervalMinutes: 30,
      background: 'novicetrainingbg.png',
      label: 'Novice Training'
    },
    experienced: {
      duration: 8 * 60 * 60, // 8 часов
      experienceTypes: {
        'Experience': 200
      },
      experiencePerInterval: 25, // 12.5 опыта за 30 минут
      maxExperience: 400, // 8 часов * 2 интервала в час * 12.5 опыта = 200
      intervalMinutes: 30,
      background: 'experiencedtrainingbg.png',
      label: 'Experienced Training'
    }
  };

  const currentConfig = TRAINING_CONFIGS[trainingType];
  const telegramId = localStorage.getItem('telegramId');

  React.useEffect(() => {
    loadTrainingSession();
    const handleVisibilityChange = () => {
      if (!document.hidden) loadTrainingSession();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [trainingType]);

  const loadTrainingSession = async () => {
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
    if (data.success && data.session && 
        ((trainingType === 'novice' && data.session.type === 'train_n') || 
         (trainingType === 'experienced' && data.session.type === 'train_e') ||
         data.session.type === 'training_novice' || data.session.type === 'training_experienced')) {
      const currentTime = Math.floor(Date.now() / 1000);
      const sessionStartTime = data.session.start_time || data.session.created_at;
      if (sessionStartTime) setSessionCreatedAt(sessionStartTime);
               setExperienceClaimed(data.session.resources_claimed || 0);
      
      if (data.session.end_time <= currentTime) {
        console.log(`Тренировка завершена: текущее время ${new Date(currentTime * 1000).toLocaleString()} > конечное время ${new Date(data.session.end_time * 1000).toLocaleString()}`);
        
                   // Проверяем, есть ли недополученный опыт
           const sessionExperienceClaimed = parseInt(data.session.resources_claimed, 10) || 0;
        if (sessionExperienceClaimed < currentConfig.maxExperience) {
          const remainingExperience = currentConfig.maxExperience - sessionExperienceClaimed;
          console.log(`Обнаружен недополученный опыт: ${remainingExperience} (experience_claimed: ${sessionExperienceClaimed})`);
          
          const sessionExperience = data.session.resources || {};
          const sessionTotalTrained = data.session.total_gathered || {};
          
          const newExperience = { ...sessionExperience };
          const newTotalTrained = { ...sessionTotalTrained };
          
                     let bonusExperienceAddedCount = 0;
           console.log(`Начисляем ${remainingExperience} недополученного опыта...`);
           const missedIntervals = Math.floor(remainingExperience / currentConfig.experiencePerInterval);
           const experienceToAdd = missedIntervals * currentConfig.experiencePerInterval;
           
           if (experienceToAdd > 0) {
             newExperience['Experience'] = (newExperience['Experience'] || 0) + experienceToAdd;
             newTotalTrained['Experience'] = (newTotalTrained['Experience'] || 0) + experienceToAdd;
             bonusExperienceAddedCount = experienceToAdd;
           }
          const newExperienceClaimed = sessionExperienceClaimed + bonusExperienceAddedCount;
          setBonusExperienceAdded(bonusExperienceAddedCount);
          setTrainingState('completed');
          setExperience(newExperience);
          setTotalTrained(newTotalTrained);
          setExperienceClaimed(newExperienceClaimed);
          setTimeout(() => {
            saveTrainingData('completed', data.session.end_time, newExperience, newTotalTrained, data.session.last_claim_time, data.session.next_resource_time, newExperienceClaimed);
          }, 100);
        } else {
          setTrainingState('completed');
          setExperience(data.session.resources || {});
          setTotalTrained(data.session.total_gathered || {});
          if (data.session.state === 'active') {
            setTimeout(() => {
              saveTrainingData('completed', data.session.end_time, data.session.resources || {}, data.session.total_gathered || {}, data.session.last_claim_time, data.session.next_resource_time, data.session.resources_claimed || 0);
            }, 100);
          }
        }
      } else if (data.session.state === 'active') {
        setTrainingState('active');
        const remainingTime = data.session.end_time - currentTime;
        setCountdown(remainingTime);
        const sessionExperience = data.session.resources || {};
        const sessionTotalTrained = data.session.total_gathered || {};
        const lastLoginTime = data.session.last_login || currentTime;
        const timeDifference = lastLoginTime - sessionStartTime;
        const maxExperienceAdditions = Math.floor(timeDifference / (currentConfig.intervalMinutes * 60));
        const lastClaimTimeValue = data.session.last_claim_time || sessionStartTime;
        const alreadyAddedExperience = Math.floor((lastClaimTimeValue - sessionStartTime) / (currentConfig.intervalMinutes * 60));
        const experienceNeedToAdd = Math.max(0, maxExperienceAdditions - alreadyAddedExperience);
        
                 if (experienceNeedToAdd > 0) {
           const newExperience = { ...sessionExperience };
           const newTotalTrained = { ...sessionTotalTrained };
           const experienceToAdd = experienceNeedToAdd * currentConfig.experiencePerInterval;
           
           newExperience['Experience'] = (newExperience['Experience'] || 0) + experienceToAdd;
           newTotalTrained['Experience'] = (newTotalTrained['Experience'] || 0) + experienceToAdd;
           const experienceAddedCount = experienceToAdd;
          setExperience(newExperience);
          setTotalTrained(newTotalTrained);
          setExperienceClaimed(prev => {
            const base = Math.max(parseInt(prev, 10) || 0, parseInt(data.session.resources_claimed, 10) || 0);
            const newVal = base + experienceAddedCount;
            const newLastClaimTime = sessionStartTime + (alreadyAddedExperience + experienceNeedToAdd) * (currentConfig.intervalMinutes * 60);
            setLastClaimTime(newLastClaimTime);
            const newNextExperienceTime = newLastClaimTime + (currentConfig.intervalMinutes * 60);
            setNextExperienceTime(newNextExperienceTime);
            setTimeout(() => {
              saveTrainingData('active', data.session.end_time, newExperience, newTotalTrained, newLastClaimTime, newNextExperienceTime, newVal);
            }, 100);
            return newVal;
          });
        } else {
          setExperience(sessionExperience);
          setTotalTrained(sessionTotalTrained);
          setLastClaimTime(lastClaimTimeValue);
          const newNextExperienceTime = lastClaimTimeValue + (currentConfig.intervalMinutes * 60);
          setNextExperienceTime(newNextExperienceTime);
          setTimeout(() => {
            saveTrainingData('active', data.session.end_time, sessionExperience, sessionTotalTrained, lastClaimTimeValue, newNextExperienceTime, data.session.resources_claimed || 0);
          }, 100);
        }
      } else if (data.session.state === 'completed' || (data.session.resources && Object.keys(data.session.resources).length > 0)) {
        setTrainingState('completed');
        setExperience(data.session.resources || {});
        setTotalTrained(data.session.total_gathered || {});
      } else {
        setTrainingState('idle');
        setExperience({});
        setTotalTrained({});
        setExperienceClaimed(0);
      }
    } else {
      setTrainingState('idle');
      setExperience({});
      setTotalTrained({});
      setExperienceClaimed(0);
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    let timer;
    if (trainingState === "active" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setTrainingState("completed");
            saveTrainingData('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [trainingState, countdown]);

  React.useEffect(() => {
    const checkExperienceTimer = setInterval(() => {
      if (trainingState === 'active') {
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= nextExperienceTime) addRandomExperience();
      }
    }, 60000); // Проверка каждую минуту
    return () => clearInterval(checkExperienceTimer);
  }, [trainingState, nextExperienceTime]);

  const addRandomExperience = () => {
    if (experienceClaimed >= currentConfig.maxExperience) {
      console.log(`Достигнут лимит опыта (${experienceClaimed}/${currentConfig.maxExperience}), больше получить нельзя`);
      return;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    console.log(`[addRandomExperience] Запущен в: ${new Date(currentTime * 1000).toLocaleString()}`);
    console.log(`[addRandomExperience] Последнее начисление было в: ${new Date(lastClaimTime * 1000).toLocaleString()}`);
    console.log(`[addRandomExperience] Ожидаемое время начисления: ${new Date(nextExperienceTime * 1000).toLocaleString()}`);
    
    const newExperience = { ...experience };
    const newTotalTrained = { ...totalTrained };
    const experienceToAdd = currentConfig.experiencePerInterval;
    
    newExperience['Experience'] = (newExperience['Experience'] || 0) + experienceToAdd;
    newTotalTrained['Experience'] = (newTotalTrained['Experience'] || 0) + experienceToAdd;
    const nextTime = currentTime + (currentConfig.intervalMinutes * 60);
    setExperience(newExperience);
    setTotalTrained(newTotalTrained);
    setLastClaimTime(currentTime);
    setNextExperienceTime(nextTime);
    setExperienceClaimed(prev => {
      const newValue = (parseInt(prev, 10) || 0) + experienceToAdd;
      console.log(`Счетчик полученного опыта: ${newValue}/${currentConfig.maxExperience}`);
      setTimeout(() => {
        saveTrainingData('active', null, newExperience, newTotalTrained, currentTime, nextTime, newValue);
      }, 100);
      return newValue;
    });
    
    console.log(`Получен новый опыт: +${experienceToAdd} Experience`);
  };

  const saveTrainingData = async (state = trainingState, existingEndTime = null, currentExperience = experience, currentTotalTrained = totalTrained, currentLastClaimTime = lastClaimTime, currentNextExperienceTime = nextExperienceTime, currentExperienceClaimed = experienceClaimed) => {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const safeExperienceClaimed = parseInt(currentExperienceClaimed, 10) || 0;
      let endTime;
      if (state === 'active') {
        if (existingEndTime) {
          endTime = existingEndTime;
        } else {
          const startTime = sessionCreatedAt || currentTime;
          endTime = startTime + currentConfig.duration;
        }
        if (currentTime >= endTime) state = 'completed';
      } else {
        endTime = existingEndTime || currentTime;
      }
      
      const trainingData = {
        telegramId,
        state,
        resources: currentExperience,
        totalGathered: currentTotalTrained,
        lastClaimTime: currentLastClaimTime,
        nextResourceTime: currentNextExperienceTime,
        resourcesClaimed: safeExperienceClaimed,
        createdAt: currentTime,
        endTime: endTime,
        startTime: sessionCreatedAt || currentTime
      };
      
      const typeValue = trainingType === 'novice' ? 'train_n' : 'train_e';
      const requestData = {
        ...trainingData,
        type: typeValue
      };
      
      console.log(`[Training] Сохранение сессии тренировки. Тип: ${typeValue}, Данные:`, requestData);
      
      const response = await fetch(addTimestamp(`rpg.php?action=saveGatheringSession`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(requestData)
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Ошибка при сохранении данных тренировки:', data.message);
      } else {
        if (state === 'completed' && trainingState !== 'completed') {
          setTrainingState('completed');
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении данных тренировки:', error);
    }
  };

  const startTraining = () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const duration = currentConfig.duration;
    setBonusExperienceAdded(0);
    const startTime = currentTime;
    const endTime = startTime + duration;
    const nextTime = startTime + (currentConfig.intervalMinutes * 60);
    const emptyExperience = {};
    const emptyTotalTrained = {};
    setSessionCreatedAt(startTime);
    setTrainingState("active");
    setCountdown(duration);
    setExperience(emptyExperience);
    setTotalTrained(emptyTotalTrained);
    setLastClaimTime(startTime);
    setNextExperienceTime(nextTime);
    const initialExperienceClaimed = 0;
    setExperienceClaimed(initialExperienceClaimed);
    setTimeout(() => {
      saveTrainingData('active', endTime, emptyExperience, emptyTotalTrained, startTime, nextTime, initialExperienceClaimed);
    }, 100);
  };

  const cancelTraining = async () => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSpent = currentTime - sessionCreatedAt;
    setBonusExperienceAdded(0);
    await logTrainingSession('Canceled', timeSpent);
    
    if (Object.keys(experience).length > 0) {
      await saveTrainingExperienceInDatabase();
      
      if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
        console.log('Синхронизация ресурсов с IndexedDB после отмены тренировки...');
        await window.ModalModule.syncResourcesWithIndexedDB();
      } else if (window.syncResourcesWithIndexedDB) {
        console.log('Синхронизация ресурсов через глобальную функцию...');
        await window.syncResourcesWithIndexedDB();
      }
      
      window.dispatchEvent(new CustomEvent('resourcesUpdated', { 
        detail: { timestamp: Date.now() } 
      }));
      window.dispatchEvent(new CustomEvent('inventory-update', { 
        detail: { timestamp: Date.now() } 
      }));
      
      if (window.InventoryModule && typeof window.InventoryModule.refreshInventoryDisplay === 'function') {
        console.log('Обновление отображения инвентаря после отмены тренировки...');
        await window.InventoryModule.refreshInventoryDisplay();
      }
    }
    
    setTrainingState("idle");
    setCountdown(0);
    setExperience({});
    setTotalTrained({});
    setSessionCreatedAt(0);
    try {
      const response = await fetch(addTimestamp(`rpg.php?action=deleteGatheringSession`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ 
          telegramId,
          timestamp: Date.now()
        })
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Ошибка при удалении сессии тренировки:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при удалении сессии тренировки:', error);
    }
    setIsProcessingAction(false);
  };

  const claimTraining = async () => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSpent = currentTime - sessionCreatedAt;
    setBonusExperienceAdded(0);
    await logTrainingSession('Claimed', timeSpent);
    
    await saveTrainingExperienceInDatabase();
    
    if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
      console.log('Синхронизация ресурсов с IndexedDB после тренировки...');
      await window.ModalModule.syncResourcesWithIndexedDB();
    } else if (window.syncResourcesWithIndexedDB) {
      console.log('Синхронизация ресурсов через глобальную функцию...');
      await window.syncResourcesWithIndexedDB();
    }
    
    window.dispatchEvent(new CustomEvent('resourcesUpdated', { 
      detail: { timestamp: Date.now() } 
    }));
    window.dispatchEvent(new CustomEvent('inventory-update', { 
      detail: { timestamp: Date.now() } 
    }));
    
    if (window.InventoryModule && typeof window.InventoryModule.refreshInventoryDisplay === 'function') {
      console.log('Обновление отображения инвентаря после тренировки...');
      await window.InventoryModule.refreshInventoryDisplay();
    }
    
    setTrainingState("idle");
    setCountdown(0);
    setExperience({});
    setTotalTrained({});
    setSessionCreatedAt(0);
    try {
      const response = await fetch(addTimestamp(`rpg.php?action=deleteGatheringSession`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ 
          telegramId,
          timestamp: Date.now()
        })
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Ошибка при удалении сессии тренировки:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при удалении сессии тренировки:', error);
    }
    setIsProcessingAction(false);
  };

  const logTrainingSession = async (endMethod, timeSpent) => {
    try {
      const hours = Math.floor(timeSpent / 3600);
      const minutes = Math.floor((timeSpent % 3600) / 60);
      const seconds = Math.floor(timeSpent % 60);
      const formattedTimeSpent = `${hours}h ${minutes}m ${seconds}s`;
      const logData = {
        telegramId,
        startTime: new Date(sessionCreatedAt * 1000).toISOString(),
        endTime: new Date(Math.floor(Date.now() / 1000) * 1000).toISOString(),
        resources: experience,
        endMethod: `Training ${trainingType} - ${endMethod} (${formattedTimeSpent})`
      };
      const response = await fetch(addTimestamp(`rpg.php?action=logGatheringSession`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      const data = await response.json();
      if (data.success) {
        console.log('Информация о сессии тренировки успешно записана в лог');
      } else {
        console.error('Ошибка при записи информации о сессии тренировки в лог:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при логировании сессии тренировки:', error);
    }
  };

  const saveTrainingExperienceInDatabase = async () => {
    try {
      if (!telegramId) return;
      
      // Получаем общее количество опыта из объекта experience
      const totalExperience = experience['Experience'] || 0;
      
      const response = await fetch(addTimestamp(`rpg.php?action=updateUserExperience`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telegramId, 
          experience: totalExperience
        })
      });
      const data = await response.json();
      if (data.success) {
        console.log(`Опыт тренировки успешно сохранен в базе данных! Добавлено: ${totalExperience} опыта`);
        
        const currentExperience = data.experience || 0;
        
        // Обновляем отображение опыта немедленно через универсальную функцию
        await updateExperienceDisplay(currentExperience, totalExperience);
        
        console.log(`Опыт автоматической тренировки получен: +${totalExperience}, новый общий опыт: ${currentExperience}`);
      } else {
        console.error('Ошибка при сохранении опыта тренировки:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при отправке запроса на сохранение опыта тренировки:', error);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getExperienceImagePath = (experienceType) => {
    return 'images/rpg/xp.png';
  };

  // Интерактивная тренировка
  const startInteractiveTraining = async () => {
    // Запрашиваем актуальную стамину с сервера перед запуском
    if (window.StaminaModule) {
      console.log('[Interactive Training Button] Обновляем стамину с сервера');
      try {
        await window.StaminaModule.update();
        console.log('[Interactive Training Button] Стамина обновлена');
      } catch (error) {
        console.error('[Interactive Training Button] Ошибка обновления стамины:', error);
      }
    }
    
    // Скрываем контейнер gathering-page
    const gatheringPage = document.querySelector('.gathering-page.futuristic-gathering');
    if (gatheringPage) {
      gatheringPage.style.display = 'none';
    }
    
    const container = document.createElement('div');
    container.id = 'interactive-training-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    
    // Запускаем нашу новую интерактивную тренировку
    if (window.InteractiveTrainingModule) {
      window.InteractiveTrainingModule.init(container, trainingType);
    }
  };

  if (isLoading) {
    return (
      <div className="rpg-main-screen">
        <BackButton onClick={onBack} position="left" />
        <div className="rpg-content-area">
          <div className="rpg-loading futuristic">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading training data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rpg-main-screen" style={{position: 'relative', minHeight: '100vh', overflow: 'hidden'}}>
      {/* Фон на всю страницу */}
      <div className="page-background" style={{
        backgroundImage: `url('images/rpg/backgrounds/${currentConfig.background}')`
      }}></div>
      <BackButton onClick={onBack} position="left" />
      <div className="bottom-aligned-content">
        <div className="gathering-page futuristic-gathering">
          <div className="gathering-controls">
            {trainingState === "idle" && (
              <div className="action-button-container">
                <button className="gathering-button futuristic" onClick={startTraining}>Auto</button>
                <button 
                  className="gathering-button futuristic interactive"
                  onClick={() => startInteractiveTraining()}
                >
                  Interactive
                </button>
              </div>
            )}
            {trainingState === "active" && (
              <React.Fragment>
                <div className="gathering-progress">
                  <div className="progress-bar-container futuristic">
                    <div className="timer">Remaining: {formatTime(countdown)}</div>
                    <div 
                      className="progress-bar futuristic" 
                      style={{ width: `${(countdown / currentConfig.duration) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <button 
                  className={`gathering-button futuristic cancel ${isProcessingAction ? 'disabled' : ''}`}
                  onClick={cancelTraining}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Processing...' : 'Cancel'}
                </button>
              </React.Fragment>
            )}
            {trainingState === "completed" && (
              <div>
                <button 
                  className={`gathering-button futuristic claim ${isProcessingAction ? 'disabled' : ''}`}
                  onClick={claimTraining}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Processing...' : 'Claim Experience'}
                </button>
              </div>
            )}
          </div>
          {(trainingState === "active" || trainingState === "completed") && (
            <div className="gathered-resources">
              <h3>{currentConfig.label} Progress:</h3>
              <div className="resources-list">
                {Object.keys(experience).length > 0 ? (
                  Object.entries(experience).map(([experienceType, amount]) => (
                    <div key={experienceType} className="resource-item">
                      <div className="resource-name">{experienceType}</div>
                      <div className="resource-icon futuristic">
                        <img src={getExperienceImagePath(experienceType)} 
                             onError={(e) => { e.target.src = "images/rpg/unknown.png"; }} 
                             alt={experienceType} />
                        <span className="resource-amount">x{amount}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No experience gained yet. Check back soon!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Модуль интерактивной тренировки
const InteractiveTrainingModule = (() => {
  // Константы игры
  const GAME_DURATION = 22; // 30 секунд
  const STAMINA_COST_INTERVAL = 2; // каждые 2 кликов
  const POINTS_FOR_EXPERIENCE = 3; // 3 очков = 1 опыт
  
  // Состояние игры
  let gameState = {
    isActive: false,
    seconds: GAME_DURATION,
    points: 0,
    combo: 1,
    maxCombo: 1,
    hits: 0,
    misses: 0,
    stamina: 0,
    clicks: 0,
    targetHits: 0, // Счетчик попаданий по крестикам для комбо
    targetElements: [],
    gameTimer: null,
    targetSpawnTimer: null,
    hasActiveTarget: false,
    trainingType: 'novice',
    container: null
  };

  // Инициализация модуля
  const init = (container, trainingType) => {
    gameState.container = container;
    gameState.trainingType = trainingType;
    createGameUI();
  };

  // Создание интерфейса игры
  const createGameUI = () => {
    const { container } = gameState;
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Создаем затемненный фон (полностью как в manualgather)
    const overlay = document.createElement('div');
    overlay.className = 'manual-gather-overlay';
    
    // Установим явные стили для полного заполнения контейнера
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.zIndex = '10000';
    
    // Создаем информационное окно (полностью как в manualgather)
    const infoPanel = document.createElement('div');
    infoPanel.className = 'info-panel futuristic';
    infoPanel.id = 'info-panel';
    infoPanel.style.background = 'linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)';
    infoPanel.style.border = '2px solid rgba(0, 255, 255, 0.7)';
    infoPanel.style.borderTop = '3px solid #00fff7';
    infoPanel.style.borderBottom = '3px solid #00fff7';
    infoPanel.style.borderRadius = '15px';
    infoPanel.style.padding = '20px';
    infoPanel.style.margin = '250px';
    infoPanel.style.width = '80%';
    infoPanel.style.top = '35%';
    infoPanel.style.maxWidth = '400px';
    infoPanel.style.textAlign = 'center';
    infoPanel.style.color = '#ffffff';
    infoPanel.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.4), 0 0 15px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.1)';
    infoPanel.style.backdropFilter = 'blur(10px)';
    infoPanel.style.WebkitBackdropFilter = 'blur(10px)';
    infoPanel.style.position = 'relative';
    infoPanel.style.zIndex = '10001';
    infoPanel.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.7)';
    
    // Создаем контейнер для отображения стамины в ряд на инфопанели
    const staminaRow = document.createElement('div');
    staminaRow.style.display = 'flex';
    staminaRow.style.alignItems = 'center';
    staminaRow.style.justifyContent = 'center';
    staminaRow.style.margin = '15px 0';
    staminaRow.style.gap = '10px';
    
    // Создаем текст "Stamina"
    const staminaLabel = document.createElement('div');
    staminaLabel.innerText = 'Stamina';
    staminaLabel.style.color = '#00fff7';
    staminaLabel.style.fontSize = '16px';
    staminaLabel.style.fontWeight = 'bold';
    staminaLabel.style.textShadow = '0 0 5px rgba(0, 255, 255, 0.7)';
    
    // Создаем индикатор стамины для инфопанели
    const staminaElement = document.createElement('div');
    staminaElement.className = 'stamina-display';
    staminaElement.id = 'stamina-container';

    // Создаем текст для отображения числового значения стамины
    const staminaValue = document.createElement('div');
    staminaValue.id = 'info-stamina-value';
    staminaValue.style.color = '#ffffff';
    staminaValue.style.fontSize = '16px';
    staminaValue.style.fontWeight = 'bold';
    staminaValue.style.display = 'none'; // Скрываем цифры снаружи стамина-бара
    
    // Собираем строку стамины
    staminaRow.appendChild(staminaLabel);
    staminaRow.appendChild(staminaElement);
    staminaRow.appendChild(staminaValue);
    
    // Создаем кнопку отмены с улучшенной стилизацией
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'gathering-button futuristic cancel';
    cancelBtn.innerText = 'Cancel';
    cancelBtn.style.margin = '10px auto';
    cancelBtn.style.padding = '10px 20px';
    cancelBtn.style.fontSize = '16px';
    cancelBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    cancelBtn.style.border = '1px solid #ff3333';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.color = '#ff3333';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.display = 'block';
    cancelBtn.style.textTransform = 'uppercase';
    cancelBtn.style.letterSpacing = '1px';
    cancelBtn.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.3)';
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeGame();
    });
    
    // Создаем игровую область
    const gameArea = document.createElement('div');
    gameArea.className = 'game-area';
    gameArea.id = 'game-area';
    gameArea.style.width = '100%';
    gameArea.style.height = '70vh';
    gameArea.style.position = 'relative';
    gameArea.style.overflow = 'hidden';
    gameArea.style.borderRadius = '8px';
    gameArea.style.marginTop = '65px';
    gameArea.style.backgroundSize = '300px';
    gameArea.style.backgroundRepeat = 'no-repeat';
    gameArea.style.backgroundPosition = 'center';
    // Скрываем чучело до начала игры
    gameArea.style.backgroundImage = 'none';
    gameArea.style.minHeight = '300px';
    
    // Создаем верхнюю панель для игры (будет видна только во время игры)
    const gameTopPanel = document.createElement('div');
    gameTopPanel.id = 'game-top-panel';
    gameTopPanel.className = 'game-top-panel';
    gameTopPanel.style.display = 'none';
    gameTopPanel.style.position = 'fixed';
    gameTopPanel.style.top = '0';
    gameTopPanel.style.left = '0';
    gameTopPanel.style.width = '100%';
    gameTopPanel.style.zIndex = '10001';
    gameTopPanel.style.textAlign = 'center';
    gameTopPanel.style.display = 'flex';
    gameTopPanel.style.justifyContent = 'center';
    gameTopPanel.style.flexDirection = 'column';
    gameTopPanel.style.alignItems = 'center';
    
    // Создаем контейнер для таймера и стамины (в одной строке)
    const gameTimerStaminaContainer = document.createElement('div');
    gameTimerStaminaContainer.style.display = 'flex';
    gameTimerStaminaContainer.style.width = '100%';
    gameTimerStaminaContainer.style.height = '40px';
    gameTimerStaminaContainer.style.justifyContent = 'center';
    gameTimerStaminaContainer.style.alignItems = 'center';
    gameTimerStaminaContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameTimerStaminaContainer.style.borderBottom = '1px solid rgba(0, 255, 255, 0.4)';
    gameTimerStaminaContainer.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';

    // Создаем элементы для верхней панели - таймер
    const gameTimerElement = document.createElement('div');
    gameTimerElement.id = 'game-timer';
    gameTimerElement.className = 'game-timer';
    gameTimerElement.innerText = formatTime(GAME_DURATION);
    gameTimerElement.style.fontSize = '32px';
    gameTimerElement.style.fontWeight = 'bold';
    gameTimerElement.style.color = '#00fff7';
    gameTimerElement.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.7)';
    gameTimerElement.style.margin = '0';
    gameTimerElement.style.padding = '0';
    gameTimerElement.style.fontFamily = 'monospace';
    gameTimerElement.style.minWidth = '120px';
    gameTimerElement.style.textAlign = 'center';
    
    // Создаем контейнер для стамины (будет справа от таймера)
    const gameStaminaWrap = document.createElement('div');
    gameStaminaWrap.style.display = 'flex';
    gameStaminaWrap.style.alignItems = 'center';
    gameStaminaWrap.style.marginLeft = '20px';
    
    // Создаем элемент для отображения стамины в игре
    const gameStaminaElement = document.createElement('div');
    gameStaminaElement.id = 'game-stamina-container';
    gameStaminaElement.className = 'game-stamina-container';
    
    // Создаем элемент для отображения числового значения стамины
    const gameStaminaValue = document.createElement('div');
    gameStaminaValue.id = 'game-stamina-value';
    gameStaminaValue.className = 'game-stamina-value';
    gameStaminaValue.style.color = '#ffffff';
    gameStaminaValue.style.fontSize = '18px';
    gameStaminaValue.style.marginLeft = '5px';
    gameStaminaValue.style.display = 'none'; // Скрываем цифры снаружи стамина-бара
    
    // Создаем контейнер для очков и статистики, который будет под таймером
    const gameStatsContainer = document.createElement('div');
    gameStatsContainer.style.display = 'flex';
    gameStatsContainer.style.justifyContent = 'center';
    gameStatsContainer.style.alignItems = 'center';
    gameStatsContainer.style.gap = '20px';
    gameStatsContainer.style.flexWrap = 'wrap';
    gameStatsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    gameStatsContainer.style.padding = '8px 15px';
    gameStatsContainer.style.width = '100%';
    gameStatsContainer.style.minHeight = '40px';
    gameStatsContainer.style.borderBottom = '1px solid rgba(0, 255, 255, 0.4)';
    gameStatsContainer.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
    
    // Создаем элементы статистики
    const gamePointsElement = document.createElement('div');
    gamePointsElement.id = 'game-points';
    gamePointsElement.className = 'game-points';
    gamePointsElement.innerText = 'Points: 0';
    gamePointsElement.style.fontSize = '16px';
    gamePointsElement.style.color = 'rgb(255, 255, 0)';
    gamePointsElement.style.textShadow = '0 0 3px rgba(0, 0, 0, 0.9)';
    gamePointsElement.style.margin = '0';
    gamePointsElement.style.zIndex = '1000';
    gamePointsElement.style.whiteSpace = 'nowrap';
    
    const gameHitsElement = document.createElement('div');
    gameHitsElement.id = 'game-hits';
    gameHitsElement.innerText = 'Hits: 0';
    gameHitsElement.style.fontSize = '16px';
    gameHitsElement.style.color = '#00ff00';
    gameHitsElement.style.textShadow = '0 0 3px rgba(255, 255, 0)';
    gameHitsElement.style.whiteSpace = 'nowrap';
    
    const gameMissesElement = document.createElement('div');
    gameMissesElement.id = 'game-misses';
    gameMissesElement.innerText = 'Misses: 0';
    gameMissesElement.style.fontSize = '16px';
    gameMissesElement.style.color = '#ff0000';
    gameMissesElement.style.textShadow = '0 0 3px rgba(255, 0, 0, 0.7)';
    gameMissesElement.style.whiteSpace = 'nowrap';
    
    const gameComboElement = document.createElement('div');
    gameComboElement.id = 'game-combo';
    gameComboElement.innerText = 'Combo: x1';
    gameComboElement.style.fontSize = '16px';
    gameComboElement.style.color = '#ff8800';
    gameComboElement.style.textShadow = '0 0 3px rgba(255, 136, 0, 0.7)';
    gameComboElement.style.whiteSpace = 'nowrap';
    
    // Собираем статистику
    gameStatsContainer.appendChild(gameHitsElement);
    gameStatsContainer.appendChild(gameMissesElement);
    gameStatsContainer.appendChild(gamePointsElement);
    gameStatsContainer.appendChild(gameComboElement);
    
    // Собираем верхнюю панель
    gameStaminaWrap.appendChild(gameStaminaElement);
    gameStaminaWrap.appendChild(gameStaminaValue);
    
    gameTimerStaminaContainer.appendChild(gameTimerElement);
    gameTimerStaminaContainer.appendChild(gameStaminaWrap);
    
    gameTopPanel.appendChild(gameTimerStaminaContainer);
    gameTopPanel.appendChild(gameStatsContainer);

    // Добавляем кнопку Start прямо в info panel
    const startButton = document.createElement('button');
    startButton.className = 'gathering-button futuristic';
    startButton.innerText = 'Start Training';
    startButton.style.marginTop = '20px';
    startButton.style.padding = '10px 20px';
    startButton.style.fontSize = '18px';
    startButton.style.cursor = 'pointer';
    startButton.addEventListener('click', (e) => {
      e.stopPropagation();
      startGame();
    });

    // Объединяем элементы основной инфопанели
    infoPanel.appendChild(staminaRow);
    infoPanel.appendChild(cancelBtn);
    infoPanel.appendChild(startButton);
    
    overlay.appendChild(infoPanel);
    overlay.appendChild(gameArea);
    overlay.appendChild(gameTopPanel);
    container.appendChild(overlay);

    // Инициализируем отображение стамины в инфопанели
    if (window.StaminaModule) {
      // Сначала обновляем стамину с сервера, потом отрисовываем
      window.StaminaModule.update().then(() => {
        window.StaminaModule.renderBar('stamina-container');
        updateInfoStaminaValue();
      }).catch(error => {
        console.error('Ошибка при инициализации стамины:', error);
        // Все равно пытаемся отрисовать с кэшированными данными
        window.StaminaModule.renderBar('stamina-container');
        updateInfoStaminaValue();
      });
    }
    
    // Добавляем обработчик клика на game-area для промахов
    gameArea.addEventListener('click', async (e) => {
      // Если игра активна и клик прошел мимо цели
      if (gameState.isActive && e.target === gameArea) {
        // Получаем координаты клика относительно game-area
        const rect = gameArea.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        miss(clickX, clickY);
      }
    });
  };



  // Начало игры
  const startGame = async () => {
    // Проверяем, активна ли уже игра
    if (gameState.isActive) {
      console.warn('Training game already active');
      return;
    }

    // Проверяем стамину
    if (window.StaminaModule && !window.StaminaModule.hasEnough(1)) {
      showInfoMessage('Not enough stamina to start training!');
      return;
    }

    // Устанавливаем начальное состояние
    gameState.isActive = true;
    gameState.seconds = GAME_DURATION;
    gameState.points = 0;
    gameState.combo = 1;
    gameState.maxCombo = 1;
    gameState.hits = 0;
    gameState.misses = 0;
    gameState.clicks = 0;
    gameState.targetHits = 0;
    gameState.hasActiveTarget = false;

    // Скрываем info-panel и делаем фон прозрачным
    const infoPanel = document.getElementById('info-panel');
    const overlay = document.querySelector('.manual-gather-overlay');
    const gameArea = document.getElementById('game-area');
    const gameTopPanel = document.getElementById('game-top-panel');
    
    if (infoPanel) {
      infoPanel.style.display = 'none';
    }
    
    if (overlay) {
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    }
    
    if (gameArea) {
      gameArea.style.height = '100%';
      gameArea.style.marginTop = '65px';
      // Показываем чучело при начале игры
      gameArea.style.backgroundImage = `url('images/rpg/${gameState.trainingType === 'novice' ? 'novicedummy' : 'dummy'}.png')`;
    }
    
    if (gameTopPanel) {
      gameTopPanel.style.display = 'block';
    }

    // Инициализируем стамину для игрового интерфейса
    if (window.StaminaModule) {
      // Обновляем стамину с сервера перед началом игры
      await window.StaminaModule.update();
      window.StaminaModule.renderBar('game-stamina-container');
      updateStaminaValue();
    }

    // Обновляем UI в игровом режиме
    updateUI();

    // Запускаем таймер
    gameState.gameTimer = setInterval(() => {
      gameState.seconds--;
      updateUI();
      
      if (gameState.seconds <= 0) {
        endGame();
      }
    }, 1000);
    
    // Запускаем постоянный спавн целей каждые 1 секунду (только если нет активной цели)
    gameState.targetSpawnTimer = setInterval(() => {
      if (gameState.isActive && !gameState.hasActiveTarget) {
        createTarget();
      }
    }, 500); // 1 секунда
    
    // Создаем первую цель сразу
    createTarget();
  };

  // Создание цели (крестика)
  const createTarget = () => {
    if (!gameState.isActive || gameState.hasActiveTarget) return;
    
    gameState.hasActiveTarget = true;
    
    const gameArea = document.getElementById('game-area');
    const target = document.createElement('div');
    target.className = 'training-target';
    
    // Случайная позиция в пределах области чучела
    const areaWidth = gameArea.offsetWidth;
    const areaHeight = gameArea.offsetHeight;
    const centerX = areaWidth / 2;
    const centerY = areaHeight / 2;
    
    // Размеры области спавна крестиков (уменьшены для лучшего геймплея)
    const spawnAreaWidth = 300; // Уменьшено с 300 до 220
    const spawnAreaHeight = 600; // Уменьшено с 300 до 220
    
    // Крестики появляются в центральной области чучела
    const maxOffsetX = spawnAreaWidth / 2 - 50; // -20 чтобы крестик не выходил за края
    const maxOffsetY = spawnAreaHeight / 2 - 50;
    
    const randomX = centerX + (Math.random() - 0.5) * maxOffsetX;
    const randomY = centerY + (Math.random() - 0.5) * maxOffsetY;
    
    target.style.cssText = `
      position: absolute;
      left: ${randomX}px;
      top: ${randomY}px;
      width: 40px;
      height: 40px;
      background: #ff0000;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      cursor: pointer;
      border-radius: 50%;
      border: 3px solid #ffffff;
      animation: targetPulse 0.5s infinite alternate;
      z-index: 1001;
    `;
    target.textContent = '✗';
    
    // Обработчик клика по цели
    target.addEventListener('click', async (e) => {
      e.stopPropagation();
      await hitTarget(target);
    });
    
    // Автоудаление цели через 0.6 секунды
    setTimeout(() => {
      if (target.parentNode) {
        target.remove();
        gameState.hasActiveTarget = false;
      }
    }, 1000);
    
    gameArea.appendChild(target);
    gameState.targetElements.push(target);
  };

  // Создание анимации удара
  const createHitAnimation = (x, y) => {
    const gameArea = document.getElementById('game-area');
    if (!gameArea) return;
    
    // Создаем контейнер для эффекта удара
    const hitEffect = document.createElement('div');
    hitEffect.className = 'hit-animation';
    hitEffect.style.cssText = `
      position: absolute;
      left: ${x - 30}px;
      top: ${y - 30}px;
      width: 60px;
      height: 60px;
      pointer-events: none;
      z-index: 10002;
    `;
    
    // Создаем основной эффект вспышки
    const flash = document.createElement('div');
    flash.style.cssText = `
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, rgba(255, 255, 0, 0.9) 0%, rgba(255, 165, 0, 0.8) 30%, rgba(255, 0, 0, 0.6) 60%, transparent 100%);
      border-radius: 50%;
      animation: hitFlash 0.3s ease-out forwards;
    `;
    
    // Создаем искры
    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('div');
      const angle = (i * 45) * Math.PI / 180;
      const distance = 25 + Math.random() * 15;
      
      spark.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        width: 3px;
        height: 3px;
        background: #ffff00;
        border-radius: 50%;
        animation: sparkFly${i} 0.4s ease-out forwards;
        --angle: ${angle}rad;
        --distance: ${distance}px;
      `;
      
      hitEffect.appendChild(spark);
    }
    
    // Создаем текст урона
    const damageText = document.createElement('div');
    damageText.textContent = 'HIT!';
    damageText.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: #00ff00;
      font-size: 16px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      animation: damageFloat 0.6s ease-out forwards;
    `;
    
    hitEffect.appendChild(flash);
    hitEffect.appendChild(damageText);
    gameArea.appendChild(hitEffect);
    
    // Удаляем эффект через 600мс
    setTimeout(() => {
      if (hitEffect.parentNode) {
        hitEffect.remove();
      }
    }, 600);
  };

  // Создание анимации комбо
  const createComboAnimation = (x, y, combo) => {
    const gameArea = document.getElementById('game-area');
    if (!gameArea) return;
    
    // Создаем контейнер для эффекта комбо (правее от HIT)
    const comboEffect = document.createElement('div');
    comboEffect.className = 'combo-animation';
    comboEffect.style.cssText = `
      position: absolute;
      left: ${x + 40}px;
      top: ${y - 20}px;
      width: 80px;
      height: 40px;
      pointer-events: none;
      z-index: 10003;
    `;
    
    // Создаем светящийся фон для комбо
    const comboGlow = document.createElement('div');
    comboGlow.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      background: radial-gradient(ellipse, rgba(255, 165, 0, 0.6) 0%, rgba(255, 69, 0, 0.4) 50%, transparent 100%);
      border-radius: 50%;
      animation: comboGlow 0.7s ease-out forwards;
    `;
    
    // Создаем текст комбо
    const comboText = document.createElement('div');
    comboText.textContent = `COMBO x${combo}!`;
    comboText.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: #ff8800;
      font-size: 14px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 136, 0, 0.8);
      animation: comboTextFloat 0.7s ease-out forwards;
      white-space: nowrap;
    `;
    
    // Создаем звездочки вокруг комбо
    for (let i = 0; i < 4; i++) {
      const star = document.createElement('div');
      const angle = (i * 90) * Math.PI / 180;
      const distance = 20;
      
      star.textContent = '★';
      star.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        color: #ffaa00;
        font-size: 12px;
        animation: comboStar${i} 0.7s ease-out forwards;
        --star-angle: ${angle}rad;
        --star-distance: ${distance}px;
        text-shadow: 0 0 5px rgba(255, 170, 0, 0.8);
      `;
      
      comboEffect.appendChild(star);
    }
    
    comboEffect.appendChild(comboGlow);
    comboEffect.appendChild(comboText);
    gameArea.appendChild(comboEffect);
    
    // Удаляем эффект через 700мс
    setTimeout(() => {
      if (comboEffect.parentNode) {
        comboEffect.remove();
      }
    }, 700);
  };

  // Создание анимации промаха
  const createMissAnimation = (x, y) => {
    const gameArea = document.getElementById('game-area');
    if (!gameArea) return;
    
    // Создаем контейнер для эффекта промаха
    const missEffect = document.createElement('div');
    missEffect.className = 'miss-animation';
    missEffect.style.cssText = `
      position: absolute;
      left: ${x - 30}px;
      top: ${y - 30}px;
      width: 60px;
      height: 60px;
      pointer-events: none;
      z-index: 10002;
    `;
    
    // Создаем эффект дыма/пыли
    const smokeEffect = document.createElement('div');
    smokeEffect.style.cssText = `
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, rgba(128, 128, 128, 0.6) 0%, rgba(64, 64, 64, 0.4) 40%, transparent 70%);
      border-radius: 50%;
      animation: missSmoke 0.5s ease-out forwards;
    `;
    
    // Создаем частицы пыли
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      const angle = (i * 60) * Math.PI / 180;
      const distance = 15 + Math.random() * 10;
      
      particle.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        width: 2px;
        height: 2px;
        background: #888888;
        border-radius: 50%;
        animation: missParticle${i} 0.5s ease-out forwards;
        --particle-angle: ${angle}rad;
        --particle-distance: ${distance}px;
      `;
      
      missEffect.appendChild(particle);
    }
    
    // Создаем текст промаха
    const missText = document.createElement('div');
    missText.textContent = 'MISS!';
    missText.style.cssText = `
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: #ff4444;
      font-size: 16px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 68, 68, 0.6);
      animation: missTextFloat 0.5s ease-out forwards;
    `;
    
    missEffect.appendChild(smokeEffect);
    missEffect.appendChild(missText);
    gameArea.appendChild(missEffect);
    
    // Удаляем эффект через 500мс
    setTimeout(() => {
      if (missEffect.parentNode) {
        missEffect.remove();
      }
    }, 500);
  };

  // Попадание по цели
  const hitTarget = async (target) => {
    // Проверяем стамину
    if (window.StaminaModule && !window.StaminaModule.hasEnough(1)) {
      endGame('No stamina left!');
      return;
    }

    // Получаем позицию цели для анимации
    const targetRect = target.getBoundingClientRect();
    const gameArea = document.getElementById('game-area');
    const gameAreaRect = gameArea.getBoundingClientRect();
    
    const hitX = targetRect.left + targetRect.width / 2 - gameAreaRect.left;
    const hitY = targetRect.top + targetRect.height / 2 - gameAreaRect.top;
    
    // Создаем анимацию удара
    createHitAnimation(hitX, hitY);
    
    // Убираем цель
    target.remove();
    gameState.hasActiveTarget = false;
    
    // Увеличиваем счетчики
    gameState.hits++;
    gameState.clicks++;
    gameState.targetHits++;
    
    // Увеличиваем комбо каждые 3 попаданий по крестикам
    if (gameState.targetHits % 3 === 0) {
      gameState.combo++;
      
      // Создаем анимацию комбо
      createComboAnimation(hitX, hitY, gameState.combo);
      
      // Обновляем максимальное комбо
      if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
      }
    }
    
    // Добавляем очки с учетом комбо (максимум x5)
    const comboMultiplier = Math.min(5, gameState.combo);
    const pointsToAdd = 1 * comboMultiplier;
    gameState.points += pointsToAdd;
    
    // Тратим стамину каждые 10 кликов
    if (gameState.clicks % STAMINA_COST_INTERVAL === 0) {
      if (window.StaminaModule) {
        try {
          const result = await window.StaminaModule.decrease(1);
          
          if (result.success) {
            // Обновляем отображение
            window.StaminaModule.renderBar('game-stamina-container');
            updateStaminaValue();
            
            // Проверяем стамину из результата сервера
            const currentStamina = result.currentStamina;
            
            if (currentStamina <= 0) {
              endGame('No stamina left!');
              return;
            }
          } else {
            if (result.error && result.error.includes('Insufficient stamina')) {
              endGame('No stamina left!');
              return;
            }
          }
        } catch (error) {
          console.error('Ошибка при трате стамины:', error);
        }
      }
    }
    
    updateUI();
  };

  // Промах (клик мимо цели)
  const miss = async (x = 0, y = 0) => {
    // Проверяем стамину
    if (window.StaminaModule && !window.StaminaModule.hasEnough(1)) {
      endGame('No stamina left!');
      return;
    }

    // Создаем анимацию промаха
    createMissAnimation(x, y);

    // Сбрасываем комбо на 1 при промахе
    gameState.combo = 1;
    // Сбрасываем счетчик попаданий по крестикам - пользователь должен начинать отсчет заново
    gameState.targetHits = 0;
    gameState.misses++;
    gameState.clicks++;
    
    // Тратим стамину каждые 10 кликов
    if (gameState.clicks % STAMINA_COST_INTERVAL === 0) {
      if (window.StaminaModule) {
        try {
          const result = await window.StaminaModule.decrease(1);
          
          if (result.success) {
            // Обновляем отображение
            window.StaminaModule.renderBar('game-stamina-container');
            updateStaminaValue();
            
            // Проверяем стамину из результата сервера
            const currentStamina = result.currentStamina;
            
            if (currentStamina <= 0) {
              endGame('No stamina left!');
              return;
            }
          } else {
            if (result.error && result.error.includes('Insufficient stamina')) {
              endGame('No stamina left!');
              return;
            }
          }
        } catch (error) {
          console.error('Ошибка при трате стамины:', error);
        }
      }
    }
    
    updateUI();
  };



  // Обновление интерфейса
  const updateUI = () => {
    // Обновляем таймер
    const gameTimer = document.getElementById('game-timer');
    if (gameTimer) {
      gameTimer.innerText = formatTime(gameState.seconds);
    }
    
    // Обновляем счетчики
    const gamePoints = document.getElementById('game-points');
    if (gamePoints) {
      gamePoints.innerText = `Points: ${gameState.points}`;
    }
    
    const gameHits = document.getElementById('game-hits');
    if (gameHits) {
      gameHits.innerText = `Hits: ${gameState.hits}`;
    }
    
    const gameMisses = document.getElementById('game-misses');
    if (gameMisses) {
      gameMisses.innerText = `Misses: ${gameState.misses}`;
    }
    
    const gameCombo = document.getElementById('game-combo');
    if (gameCombo) {
      gameCombo.innerText = `Combo: x${gameState.combo}`;
    }
    
    // Обновляем стамину
    updateStaminaValue();
  };

  // Показать информационное сообщение
  const showInfoMessage = (message) => {
    const infoPanel = document.getElementById('info-panel');
    if (!infoPanel) {
      return;
    }

    const messageElement = document.createElement('div');
    messageElement.className = 'info-message';
    messageElement.innerText = message;
    messageElement.style.margin = '15px 0';
    messageElement.style.padding = '15px 20px';
    messageElement.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.8) 100%)';
    messageElement.style.border = '2px solid rgba(0, 255, 255, 0.6)';
    messageElement.style.borderRadius = '12px';
    messageElement.style.color = '#ffffff';
    messageElement.style.fontSize = '18px';
    messageElement.style.fontWeight = 'bold';
    messageElement.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4)';
    
    infoPanel.insertBefore(messageElement, infoPanel.firstChild);
  };

  // Обновление значения стамины в игре
  const updateStaminaValue = () => {
    const gameStaminaValue = document.getElementById('game-stamina-value');
    if (gameStaminaValue && window.StaminaModule) {
      const staminaData = window.StaminaModule.get();
      gameStaminaValue.innerText = `${staminaData.currentStamina}/${staminaData.maxStamina}`;
    }
  };

  // Обновление значения стамины в инфопанели
  const updateInfoStaminaValue = () => {
    const infoStaminaValue = document.getElementById('info-stamina-value');
    if (infoStaminaValue && window.StaminaModule) {
      const staminaData = window.StaminaModule.get();
      infoStaminaValue.innerText = `${staminaData.currentStamina}/${staminaData.maxStamina}`;
    }
  };

  // Форматирование времени
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Завершение игры
  const endGame = (message = null) => {
    gameState.isActive = false;
    
    // Очищаем таймеры
    if (gameState.gameTimer) {
      clearInterval(gameState.gameTimer);
      gameState.gameTimer = null;
    }
    
    if (gameState.targetSpawnTimer) {
      clearInterval(gameState.targetSpawnTimer);
      gameState.targetSpawnTimer = null;
    }
    
    // Удаляем все цели
    gameState.targetElements.forEach(target => {
      if (target.parentNode) target.remove();
    });
    gameState.targetElements = [];
    gameState.hasActiveTarget = false;
    
    // Восстанавливаем info-panel и затемнение
    const infoPanel = document.getElementById('info-panel');
    const overlay = document.querySelector('.manual-gather-overlay');
    const gameArea = document.getElementById('game-area');
    const gameTopPanel = document.getElementById('game-top-panel');
    
    if (gameTopPanel) {
      gameTopPanel.style.display = 'none';
    }
    
    if (overlay) {
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    }
    
    if (gameArea) {
      gameArea.style.height = '70vh';
      gameArea.style.marginTop = '65px';
      // Скрываем чучело при завершении игры
      gameArea.style.backgroundImage = 'none';
    }
    
    if (infoPanel) {
      infoPanel.style.display = 'block';
    }
    
    // Показываем результаты
    showResults(message);
  };

  // Показ результатов
  const showResults = (message = null) => {
    // Для продвинутой тренировки 2 опыта за 10 очков, для новичковой 1 опыт за 10 очков
    const experienceMultiplier = gameState.trainingType === 'experienced' ? 2 : 1;
    const experience = Math.floor(gameState.points / POINTS_FOR_EXPERIENCE) * experienceMultiplier;
    
    const infoPanel = document.getElementById('info-panel');
    if (!infoPanel) return;
    
    // Очищаем предыдущее содержимое
    infoPanel.innerHTML = '';
    
    // Показываем сообщение если есть
    if (message) {
      showInfoMessage(message);
    }
    
    // Создаем результаты в стиле info-message
    const resultsMessage = document.createElement('div');
    resultsMessage.className = 'info-message';
    resultsMessage.style.margin = '10px 0';
    resultsMessage.style.padding = '8px 12px';
    resultsMessage.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.8) 100%)';
    resultsMessage.style.border = '2px solid rgba(0, 255, 255, 0.6)';
    resultsMessage.style.borderRadius = '12px';
    resultsMessage.style.color = '#ffffff';
    resultsMessage.style.fontSize = '16px';
    resultsMessage.style.fontWeight = 'bold';
    resultsMessage.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4)';
    resultsMessage.style.textAlign = 'center';
    resultsMessage.style.lineHeight = '0.8';
    
    // Формируем содержимое результатов
    let resultsHTML = `
      <div style="color: #00fff7; font-size: 20px;">Training Complete!</div>
      <div>
        <div>Points: <span style="color: #ffff00;">${gameState.points}</span></div>
        <div>Hits: <span style="color: #00ff00;">${gameState.hits}</span></div>
        <div>Misses: <span style="color: #ff0000;">${gameState.misses}</span></div>
        <div>Max Combo: <span style="color: #ff8800;">x${gameState.maxCombo}</span></div>
      </div>
    `;
    
    // Добавляем опыт с иконкой если есть
    if (experience > 0) {
      resultsHTML += `
        <div style="display: flex; align-items: center; justify-content: center;">
          <div class="resource-icon futuristic" style="width: 40px; height: 40px; background: rgba(0, 0, 0); border: 2px solid #388E3C; border-radius: 6px; display: flex; align-items: center; justify-content: center; position: relative;">
            <img src="images/rpg/xp.png" 
                 style="width: 100%; height: 65%;"
                 onerror="this.src='images/rpg/unknown.png';" 
                 alt="Experience" />
            <span class="resource-amount" style="position: absolute; bottom: -3px; right: -3px; 
                  background: rgba(0, 0, 0, 0.8); color: white; font-size: 10px; 
                  padding: 1px 4px; border-radius: 3px; font-weight: bold; 
                  border: 1px solid #333;">x${experience}</span>
          </div>
        </div>
      `;
    }
    
    resultsMessage.innerHTML = resultsHTML;
    infoPanel.appendChild(resultsMessage);
    
    // Добавляем кнопку Claim Experience если есть опыт, иначе кнопку Close
    if (experience > 0) {
      const claimBtn = document.createElement('button');
      claimBtn.className = 'gathering-button futuristic';
      claimBtn.innerText = 'Claim Experience';
      claimBtn.style.margin = '10px auto';
      claimBtn.style.padding = '10px 20px';
      claimBtn.style.fontSize = '16px';
      claimBtn.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
      claimBtn.style.border = '1px solid #00ff00';
      claimBtn.style.borderRadius = '4px';
      claimBtn.style.color = '#00ff00';
      claimBtn.style.cursor = 'pointer';
      claimBtn.style.display = 'block';
      claimBtn.style.textTransform = 'uppercase';
      claimBtn.style.letterSpacing = '1px';
      claimBtn.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.3)';
      claimBtn.addEventListener('click', () => claimExperience(experience));
      infoPanel.appendChild(claimBtn);
    } else {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'gathering-button futuristic cancel';
      closeBtn.innerText = 'Close';
      closeBtn.style.margin = '10px auto';
      closeBtn.style.padding = '10px 20px';
      closeBtn.style.fontSize = '16px';
      closeBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
      closeBtn.style.border = '1px solid #ff3333';
      closeBtn.style.borderRadius = '4px';
      closeBtn.style.color = '#ff3333';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.display = 'block';
      closeBtn.style.textTransform = 'uppercase';
      closeBtn.style.letterSpacing = '1px';
      closeBtn.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.3)';
      closeBtn.addEventListener('click', closeGame);
      infoPanel.appendChild(closeBtn);
    }
  };

  // Показ модального окна с успехом
  const showSuccessModal = (message) => {
    // Создаем overlay для модального окна
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 20000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Создаем само модальное окно
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, rgba(0,0,50,0.95) 0%, rgba(0,50,0,0.95) 100%);
      border: 2px solid #00ff00;
      border-radius: 15px;
      padding: 30px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 0 30px rgba(0, 255, 0, 0.6);
      animation: modalFadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
      <div style="color: #ffffff; font-size: 20px; margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 15px;">✓</div>
        <div style="color: #00ff00; font-weight: bold; text-shadow: 0 0 10px rgba(0, 255, 0, 0.7);">
          ${message}
        </div>
      </div>
    `;
    
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    // Автоматически убираем модальное окно через 2 секунды
    setTimeout(() => {
      if (modalOverlay.parentNode) {
        modalOverlay.remove();
      }
    }, 2000);
    
    // Убираем по клику
    modalOverlay.addEventListener('click', () => {
      if (modalOverlay.parentNode) {
        modalOverlay.remove();
      }
    });
  };

  // Получение опыта
  const claimExperience = async (experience) => {
    try {
      const telegramId = localStorage.getItem('telegramId');
      if (!telegramId) return;
      
      const response = await fetch(`rpg.php?action=updateUserExperience&t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, experience })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log(`Опыт интерактивной тренировки получен: +${experience}`);
        
        const currentExperience = data.experience || 0;
        
        // Обновляем отображение опыта немедленно через универсальную функцию
        await updateExperienceDisplay(currentExperience, experience);
        
        console.log(`Опыт интерактивной тренировки получен: +${experience}, новый общий опыт: ${currentExperience}`);
        
        // Сразу закрываем игру без модального окна
        closeGame();
      } else {
        alert('Ошибка при получении опыта: ' + data.message);
      }
    } catch (error) {
      console.error('Ошибка при получении опыта:', error);
      alert('Ошибка при получении опыта');
    }
  };

  // Закрытие игры
  const closeGame = () => {
    gameState.isActive = false;
    
    if (gameState.gameTimer) {
      clearInterval(gameState.gameTimer);
      gameState.gameTimer = null;
    }
    
    if (gameState.targetSpawnTimer) {
      clearInterval(gameState.targetSpawnTimer);
      gameState.targetSpawnTimer = null;
    }
    
    // Удаляем контейнер
    const container = document.getElementById('interactive-training-container');
    if (container) {
      container.remove();
    }
    
    // Восстанавливаем страницу тренировки
    const gatheringPage = document.querySelector('.gathering-page.futuristic-gathering');
    if (gatheringPage) {
      gatheringPage.style.display = '';
    }
  };

  // Добавляем стили
  const addStyles = () => {
    if (document.getElementById('interactive-training-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'interactive-training-styles';
    style.textContent = `
      .manual-gather-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        transition: background-color 0.3s ease;
      }
      
      .info-panel {
        background: linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%);
        border: 2px solid rgba(0, 255, 255, 0.7);
        border-top: 3px solid #00fff7;
        border-bottom: 3px solid #00fff7;
        border-radius: 15px;
        padding: 20px;
        margin: 20px;
        width: 80%;
        max-width: 400px;
        text-align: center;
        color: #ffffff;
        font-family: 'Arial', sans-serif;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.4), 0 0 15px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        position: relative;
        z-index: 10000;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
      }
      
      .game-top-panel {
        
      }
      
      .game-timer {
        font-size: 32px;
        font-weight: bold;
        color: #00fff7;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
      }
      
      .game-points {
        font-size: 22px;
        color:rgb(255, 255, 0);
        position: relative;
        z-index: 1000;
      }
      
      .game-stamina-container {
        display: inline-flex;
        margin: 0 5px;
      }
      
      .timer-display {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
      }
      
      .points-display {
        font-size: 18px;
        margin-bottom: 10px;
      }
      
      .stamina-display {
        display: flex;
        justify-content: center;
        margin: 10px 0;
      }
      
      .game-area {
        width: 100%;
        height: 100%;
        position: relative;
        transition: height 0.3s ease, margin-top 0.3s ease;
      }
      
      .training-target {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 0, 0, 0.8);
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 0 15px rgba(255, 0, 0, 0.6);
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        animation: pulse 1s infinite alternate;
        z-index: 10001;
        position: absolute;
        color: white;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
      }
      
      .training-target:hover {
        transform: scale(1.1);
        box-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
      }
      
      .info-message {
        margin: 15px 0;
        padding: 15px 20px;
        background: linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.8) 100%);
        border: 2px solid rgba(0, 255, 255, 0.6);
        border-radius: 12px;
        color: #ffffff;
        font-size: 18px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4);
        line-height: 1.6;
        white-space: pre-line;
        box-shadow: 0 0 25px rgba(0, 255, 255, 0.3), inset 0 0 15px rgba(0, 255, 255, 0.1);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: messageGlow 2s ease-in-out infinite alternate;
        position: relative;
        z-index: 1;
        overflow: hidden;
      }
      
      .info-message::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, transparent, rgba(0, 255, 255, 0.3), transparent);
        border-radius: 12px;
        z-index: -1;
        animation: borderShine 3s linear infinite;
        pointer-events: none;
      }
      
      @keyframes messageGlow {
        0% { 
          box-shadow: 0 0 25px rgba(0, 255, 255, 0.3), inset 0 0 15px rgba(0, 255, 255, 0.1);
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4);
        }
        100% { 
          box-shadow: 0 0 35px rgba(0, 255, 255, 0.5), inset 0 0 20px rgba(0, 255, 255, 0.2);
          text-shadow: 0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.6);
        }
      }
      
      @keyframes borderShine {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      .button-container {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 15px;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        100% { transform: scale(1.05); }
      }
      
      @keyframes modalFadeIn {
        0% { 
          opacity: 0; 
          transform: scale(0.8) translateY(-20px); 
        }
        100% { 
          opacity: 1; 
          transform: scale(1) translateY(0); 
        }
      }
      
      /* Адаптивные стили для игрового интерфейса */
      @media (max-width: 768px) {
        .game-top-panel {
          font-size: 14px;
        }
        
        .game-timer {
          font-size: 24px !important;
        }
        
        .game-points {
          font-size: 14px;
        }
        
        .game-stats-container {
          gap: 10px !important;
          padding: 5px 10px !important;
        }
        
        .game-stats-container > div {
          font-size: 12px !important;
        }
      }
      
      @media (max-width: 480px) {
        .game-timer {
          font-size: 20px !important;
        }
        
        .game-points {
          font-size: 12px;
        }
        
        .game-stats-container > div {
          font-size: 10px !important;
        }
      }
      
      /* Анимации эффекта удара */
      .hit-animation {
        pointer-events: none;
      }
      
      @keyframes hitFlash {
        0% { 
          transform: scale(0.5);
          opacity: 1;
        }
        50% { 
          transform: scale(1.2);
          opacity: 0.8;
        }
        100% { 
          transform: scale(1.5);
          opacity: 0;
        }
      }
      
      @keyframes damageFloat {
        0% { 
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 1;
        }
        50% { 
          transform: translate(-50%, -70%) scale(1.2);
          opacity: 1;
        }
        100% { 
          transform: translate(-50%, -90%) scale(1.5);
          opacity: 0;
        }
      }
      
      /* Динамические анимации искр */
      @keyframes sparkFly0 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(0deg) * var(--distance)), calc(-50% + sin(0deg) * var(--distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes sparkFly1 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(45deg) * var(--distance)), calc(-50% + sin(45deg) * var(--distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes sparkFly2 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(90deg) * var(--distance)), calc(-50% + sin(90deg) * var(--distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes sparkFly3 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(135deg) * var(--distance)), calc(-50% + sin(135deg) * var(--distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes sparkFly4 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(180deg) * var(--distance)), calc(-50% + sin(180deg) * var(--distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes sparkFly5 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(225deg) * var(--distance)), calc(-50% + sin(225deg) * var(--distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes sparkFly6 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(270deg) * var(--distance)), calc(-50% + sin(270deg) * var(--distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes sparkFly7 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(315deg) * var(--distance)), calc(-50% + sin(315deg) * var(--distance))) scale(0);
          opacity: 0;
        }
      }
      
      /* Анимации комбо */
      @keyframes comboGlow {
        0% { 
          transform: scale(0.8);
          opacity: 0.8;
        }
        50% { 
          transform: scale(1.2);
          opacity: 1;
        }
        100% { 
          transform: scale(1.5);
          opacity: 0;
        }
      }
      
      @keyframes comboTextFloat {
        0% { 
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 1;
        }
        50% { 
          transform: translate(-50%, -60%) scale(1.1);
          opacity: 1;
        }
        100% { 
          transform: translate(-50%, -80%) scale(1.3);
          opacity: 0;
        }
      }
      
      @keyframes comboStar0 {
        0% { 
          transform: translate(-50%, -50%) scale(0.5);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(0deg) * var(--star-distance)), calc(-50% + sin(0deg) * var(--star-distance))) scale(1.5);
          opacity: 0;
        }
      }
      
      @keyframes comboStar1 {
        0% { 
          transform: translate(-50%, -50%) scale(0.5);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(90deg) * var(--star-distance)), calc(-50% + sin(90deg) * var(--star-distance))) scale(1.5);
          opacity: 0;
        }
      }
      
      @keyframes comboStar2 {
        0% { 
          transform: translate(-50%, -50%) scale(0.5);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(180deg) * var(--star-distance)), calc(-50% + sin(180deg) * var(--star-distance))) scale(1.5);
          opacity: 0;
        }
      }
      
      @keyframes comboStar3 {
        0% { 
          transform: translate(-50%, -50%) scale(0.5);
          opacity: 1;
        }
        100% { 
          transform: translate(calc(-50% + cos(270deg) * var(--star-distance)), calc(-50% + sin(270deg) * var(--star-distance))) scale(1.5);
          opacity: 0;
        }
      }
      
      /* Анимации промаха */
      @keyframes missSmoke {
        0% { 
          transform: scale(0.5);
          opacity: 0.6;
        }
        50% { 
          transform: scale(1.1);
          opacity: 0.4;
        }
        100% { 
          transform: scale(1.5);
          opacity: 0;
        }
      }
      
      @keyframes missTextFloat {
        0% { 
          transform: translate(-50%, -50%) scale(0.9);
          opacity: 1;
        }
        30% { 
          transform: translate(-50%, -55%) scale(1.1);
          opacity: 1;
        }
        100% { 
          transform: translate(-50%, -70%) scale(1.2);
          opacity: 0;
        }
      }
      
      @keyframes missParticle0 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 0.8;
        }
        100% { 
          transform: translate(calc(-50% + cos(0deg) * var(--particle-distance)), calc(-50% + sin(0deg) * var(--particle-distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes missParticle1 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 0.8;
        }
        100% { 
          transform: translate(calc(-50% + cos(60deg) * var(--particle-distance)), calc(-50% + sin(60deg) * var(--particle-distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes missParticle2 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 0.8;
        }
        100% { 
          transform: translate(calc(-50% + cos(120deg) * var(--particle-distance)), calc(-50% + sin(120deg) * var(--particle-distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes missParticle3 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 0.8;
        }
        100% { 
          transform: translate(calc(-50% + cos(180deg) * var(--particle-distance)), calc(-50% + sin(180deg) * var(--particle-distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes missParticle4 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 0.8;
        }
        100% { 
          transform: translate(calc(-50% + cos(240deg) * var(--particle-distance)), calc(-50% + sin(240deg) * var(--particle-distance))) scale(0);
          opacity: 0;
        }
      }
      
      @keyframes missParticle5 {
        0% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 0.8;
        }
        100% { 
          transform: translate(calc(-50% + cos(300deg) * var(--particle-distance)), calc(-50% + sin(300deg) * var(--particle-distance))) scale(0);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  };

  // Обработчик кликов мимо целей
  document.addEventListener('click', (e) => {
    if (gameState.isActive && e.target.closest('.training-game-area') && !e.target.closest('.training-target')) {
      miss();
    }
  });

  return {
    init,
    closeGame,
    addStyles
  };
})();

// Экспортируем модули
window.CraftingModule = window.CraftingModule || {};
window.CraftingModule.Training = Training;
window.InteractiveTrainingModule = InteractiveTrainingModule;

// Инициализируем стили интерактивной тренировки при загрузке модуля
if (window.InteractiveTrainingModule) {
  window.InteractiveTrainingModule.addStyles();
} 