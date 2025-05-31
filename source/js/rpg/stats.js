// Модуль управления стаминой (серверная версия)
const StaminaModule = (() => {
    // Константы
    const MAX_STAMINA = 10;
    const REGEN_RATE = 1; // 1 очко стамины в минуту
    
    // Кэш для данных стамины
    let staminaCache = {
        currentStamina: MAX_STAMINA,
        maxStamina: MAX_STAMINA,
        lastUpdate: Math.floor(Date.now() / 1000) // Храним в секундах
    };

    // Получение telegramId
    const getTelegramId = () => {
        return localStorage.getItem('telegramId');
    };

    // Получение стамины с сервера
    const fetchStaminaFromServer = async () => {
        const telegramId = getTelegramId();
        if (!telegramId) {
            console.error('[StaminaModule] telegramId не найден');
            return null;
        }

        try {
            const response = await fetch(`rpg.php?action=getStamina&t=${Date.now()}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                body: JSON.stringify({ telegramId })
            });

            const data = await response.json();
            
            if (data.success) {
                staminaCache = {
                    currentStamina: data.stamina,
                    maxStamina: data.maxStamina,
                    // ИСПРАВЛЕНО: используем время с сервера в секундах, если оно есть, иначе текущее время в секундах
                    lastUpdate: data.lastUpdate || Math.floor(Date.now() / 1000)
                };
                console.log('[StaminaModule] Стамина получена с сервера:', staminaCache);
                return staminaCache;
            } else {
                console.error('[StaminaModule] Ошибка получения стамины:', data.message);
                return null;
            }
        } catch (error) {
            console.error('[StaminaModule] Ошибка запроса стамины:', error);
            return null;
        }
    };

    // Уменьшение стамины на сервере
    const decreaseStaminaOnServer = async (amount = 1) => {
        const telegramId = getTelegramId();
        if (!telegramId) {
            console.error('[StaminaModule] telegramId не найден для уменьшения стамины');
            return { success: false, error: 'telegramId не найден' };
        }

        try {
            const response = await fetch(`rpg.php?action=decreaseStamina&t=${Date.now()}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                body: JSON.stringify({ telegramId, amount })
            });

            const data = await response.json();
            
            if (data.success) {
                staminaCache = {
                    currentStamina: data.stamina,
                    maxStamina: data.maxStamina,
                    // ИСПРАВЛЕНО: используем время с сервера в секундах, если оно есть, иначе текущее время в секундах
                    lastUpdate: data.lastUpdate || Math.floor(Date.now() / 1000)
                };
                console.log('[StaminaModule] Стамина уменьшена на сервере:', staminaCache);
                return { success: true, ...staminaCache };
            } else {
                console.error('[StaminaModule] Ошибка уменьшения стамины:', data.message);
                return { success: false, error: data.message, ...data };
            }
        } catch (error) {
            console.error('[StaminaModule] Ошибка запроса уменьшения стамины:', error);
            return { success: false, error: error.message };
        }
    };
            
    // Инициализация стамины
    const initStamina = async () => {
        console.log('[StaminaModule] Инициализация стамины...');
        const result = await fetchStaminaFromServer();
        return result || staminaCache;
    };

    // Обновление стамины (получение актуальных данных с сервера)
    const updateStamina = async () => {
        return await fetchStaminaFromServer() || staminaCache;
    };

    // Уменьшение стамины
    const decreaseStamina = async (amount = 1) => {
        return await decreaseStaminaOnServer(amount);
    };

    // Проверка, достаточно ли стамины (синхронная версия на основе кэша)
    const hasEnoughStamina = (amount = 1) => {
        return staminaCache.currentStamina >= amount;
    };

    // Получение текущего значения стамины (синхронная версия на основе кэша)
    const getStamina = () => {
        return staminaCache;
    };

    // Вычисление времени до полного восстановления
    const getTimeToFullRegeneration = () => {
        const { currentStamina, maxStamina, lastUpdate } = staminaCache;
        
        if (currentStamina >= maxStamina) {
            return { minutes: 0, seconds: 0 };
        }
        
        const staminaNeeded = maxStamina - currentStamina;
        const minutesNeeded = staminaNeeded / REGEN_RATE;
        
        const now = Math.floor(Date.now() / 1000); // Текущее время в секундах
        // ИСПРАВЛЕНО: lastUpdate теперь в секундах, как и now
        const elapsedMinutes = (now - lastUpdate) / 60; // Переводим в минуты
        const totalMinutesNeeded = minutesNeeded;
        const remainingMinutes = Math.max(0, totalMinutesNeeded - elapsedMinutes);
        
        const remainingSeconds = remainingMinutes * 60;
        
        return {
            minutes: Math.floor(remainingSeconds / 60),
            seconds: Math.floor(remainingSeconds % 60)
        };
    };

    // Отрисовка прогресс-бара стамины
    const renderStaminaBar = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('[StaminaModule] Контейнер не найден:', containerId);
            return;
        }

        const { currentStamina, maxStamina } = staminaCache;
        const percentage = (currentStamina / maxStamina) * 100;

        // Создаем HTML для прогресс-бара
        const html = `
            <div class="stamina-bar-container futuristic" style="width: 100px; height: 20px; position: relative;">
                <div class="stamina-bar futuristic" style="width: ${percentage}%; height: 100%;"></div>
                <div class="stamina-text">${currentStamina}/${maxStamina}</div>
            </div>
        `;

        container.innerHTML = html;
        console.log('[StaminaModule] Прогресс-бар стамины отрисован:', { containerId, currentStamina, maxStamina });
    };

    // Старт таймера обновления стамины
    const startStaminaTimer = (containerId, interval = 30000) => {
        console.log('[StaminaModule] Запуск таймера обновления стамины:', { containerId, interval });
        
        // Первичная отрисовка
        renderStaminaBar(containerId);
        
        // Запуск таймера с обновлением с сервера
        return setInterval(async () => {
            await updateStamina();
            renderStaminaBar(containerId);
        }, interval);
    };

    // Публичный API
    return {
        init: initStamina,
        update: updateStamina,
        decrease: decreaseStamina,
        hasEnough: hasEnoughStamina,
        get: getStamina,
        getTimeToFullRegeneration,
        renderBar: renderStaminaBar,
        startTimer: startStaminaTimer
    };
})();

// Функция для форматирования больших чисел
const formatLargeNumber = (num) => {
  if (num >= 1000000000000000) { // Квадриллион
    return (num / 1000000000000000).toFixed(1).replace(/\.0$/, '') + 'Q';
  } else if (num >= 1000000000000) { // Триллион
    return (num / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
  } else if (num >= 1000000000) { // Миллиард
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  } else if (num >= 1000000) { // Миллион
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (num >= 1000) { // Тысяча (уменьшил порог с 10000 до 1000)
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
};

// Делаем функцию доступной глобально
window.formatLargeNumber = formatLargeNumber;

// Добавление стилей для прогресс-баров стамины и опыта
const addStaminaStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        .stamina-bar-container.futuristic {
            background: rgba(0,255,255,0.08);
            border-radius: 2px;
            border: 1px solid #00fff7;
            box-shadow: 0 0 8px rgba(0,255,255,0.33);
            overflow: hidden;
            margin: 4px 0;
            position: relative;
        }

        .stamina-bar.futuristic {
            height: 100%;
            background: linear-gradient(90deg, #00fff7 0%, #00bfff 100%);
            box-shadow: 0 0 16px rgba(0,255,255,0.8), 0 0 2px #fff;
            border-radius: 2px;
            transition: width 0.5s cubic-bezier(.4,2,.6,1);
            filter: blur(0.5px);
            position: relative;
            overflow: hidden;
        }

        .stamina-bar.futuristic::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
            animation: staminaBarShine 2s linear infinite;
            transform: skewX(-20deg);
            pointer-events: none;
        }

        .stamina-text {
            position: absolute;

            width: 100%;
            text-align: center;
            font-size: 20px;
            color:rgb(255, 255, 255);
            text-shadow: 0 0 2px rgba(0, 0, 0, 0.9);
        }

        /* Стили для прогресс-бара опыта */
        .experience-bar-container.futuristic {
            background: rgba(138, 43, 226, 0.08);
            border-radius: 2px;
            border: 1px solid #8A2BE2;
            box-shadow: 0 0 8px rgba(138, 43, 226, 0.33);
            overflow: hidden;
            margin: 4px 0;
            position: relative;
        }

        .experience-bar.futuristic {
            height: 100%;
            background: linear-gradient(90deg, #8A2BE2 0%, #9932CC 100%);
            box-shadow: 0 0 16px rgba(138, 43, 226, 0.8), 0 0 2px #fff;
            border-radius: 2px;
            transition: width 0.5s cubic-bezier(.4,2,.6,1);
            filter: blur(0.5px);
            position: relative;
            overflow: hidden;
        }

        .experience-bar.futuristic::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
            animation: experienceBarShine 2s linear infinite;
            transform: skewX(-20deg);
            pointer-events: none;
        }

        .experience-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            text-align: center;
            font-size: 20px;
            color: rgb(255, 255, 255);
            text-shadow: 0 0 2px rgba(0, 0, 0, 0.9);
            font-weight: bold;
            z-index: 15;
            pointer-events: none;
            white-space: nowrap;
        }

        @keyframes staminaBarShine {
            0% { transform: translateX(-100%) skewX(-20deg); }
            100% { transform: translateX(200%) skewX(-20deg); }
        }

        @keyframes experienceBarShine {
            0% { transform: translateX(-100%) skewX(-20deg); }
            100% { transform: translateX(200%) skewX(-20deg); }
        }
    `;
    document.head.appendChild(style);
};

// Выполняем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    addStaminaStyles();
    
    // Инициализация стамины
    StaminaModule.init();
    
    // Инициализация опыта
    ExperienceModule.init();
    
    // Инициализация модуля статистики
    StatsModule.init();
    
    // Если есть контейнер для отображения стамины на странице, запускаем таймер обновления
    if (document.getElementById('stamina-container')) {
        StaminaModule.startTimer('stamina-container');
    }
});

// StatsModule для управления статистикой персонажа
const StatsModule = (() => {
  // Инициализация модуля
  const init = () => {
    console.log('[StatsModule] Инициализация модуля статистики');
  };
  
  // Обновление отображения опыта
  const updateExperienceDisplay = (currentExperience) => {
    console.log('[StatsModule] Обновляем отображение опыта:', currentExperience);
    
    // Прямое обновление элементов DOM (без рекурсивного вызова глобальной функции)
    const experienceBar = document.querySelector('.experience-bar.futuristic');
    const experienceText = document.querySelector('.experience-text');
    
    if (experienceBar && experienceText) {
      const levelElement = document.querySelector('.character-level.futuristic');
      const level = levelElement ? parseInt(levelElement.textContent) || 1 : 1;
      const expTotal = level * 100;
      const expPercentage = Math.min(100, (currentExperience / expTotal) * 100);
      
      experienceBar.style.width = `${expPercentage}%`;
      experienceText.textContent = `${currentExperience}/${expTotal}`;
      
      console.log('[StatsModule] DOM обновлен:', currentExperience, '/', expTotal);
    } else {
      console.log('[StatsModule] Элементы опыта не найдены - возможно страница персонажа не активна');
    }
  };
  
  // Публичный API
  return {
    init,
    updateExperienceDisplay
  };
})();

// ExperienceModule для управления отображением опыта на главной странице
const ExperienceModule = (() => {
  // Кэш для данных опыта
  let experienceCache = {
    currentExperience: 0,
    level: 1
  };

  // Получение telegramId
  const getTelegramId = () => {
    return localStorage.getItem('telegramId');
  };

  // Получение опыта с сервера
  const fetchExperienceFromServer = async () => {
    const telegramId = getTelegramId();
    if (!telegramId) {
      console.error('[ExperienceModule] telegramId не найден');
      return null;
    }

    try {
      const response = await fetch(`rpg.php?action=getUserData&t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ telegramId })
      });

      const data = await response.json();
      
      if (data.success && data.userData) {
        experienceCache = {
          currentExperience: data.userData.experience || data.userData.exp || 0,
          level: data.userData.level || 1
        };
        console.log('[ExperienceModule] Опыт и уровень получены с сервера:', experienceCache);
        
        // Обновляем отображение уровня на всех страницах
        const levelElements = document.querySelectorAll('.character-level.futuristic');
        levelElements.forEach(element => {
          element.textContent = `Level ${experienceCache.level}`;
        });
        
        return experienceCache;
      } else {
        console.error('[ExperienceModule] Ошибка получения опыта:', data.message);
        return null;
      }
    } catch (error) {
      console.error('[ExperienceModule] Ошибка запроса опыта:', error);
      return null;
    }
  };

  // Инициализация опыта
  const initExperience = async () => {
    console.log('[ExperienceModule] Инициализация опыта...');
    const result = await fetchExperienceFromServer();
    return result || experienceCache;
  };

  // Обновление опыта (получение актуальных данных с сервера)
  const updateExperience = async () => {
    return await fetchExperienceFromServer() || experienceCache;
  };

  // Получение текущего значения опыта (синхронная версия на основе кэша)
  const getExperience = () => {
    return experienceCache;
  };

  // Отрисовка прогресс-бара опыта
  const renderExperienceBar = (containerId) => {
    const container = document.getElementById(containerId);
    
    const { currentExperience, level } = experienceCache;
    
    // Используем новую систему уровней если доступна
    let expCurrent = 0;
    let expTotal = 100;
    let actualLevel = level;
    
    if (window.LevelingModule) {
      actualLevel = window.LevelingModule.getLevelByExperience(currentExperience);
      const progress = window.LevelingModule.getLevelProgress(currentExperience, actualLevel);
      expCurrent = progress.current;
      expTotal = progress.needed;
    } else {
      // Fallback - старая логика
      expTotal = level * 100;
      expCurrent = currentExperience % expTotal;
    }
    
    const percentage = Math.min(100, (expCurrent / expTotal) * 100);
    
    // Обновляем отображение уровня на всех страницах
    const levelElements = document.querySelectorAll('.character-level.futuristic');
    levelElements.forEach(element => {
      element.textContent = `Level ${actualLevel}`;
    });
    
    if (container) {
      // Обновляем главную страницу
      const html = `
        <div class="experience-bar-container futuristic" style="width: 120px; height: 24px; position: relative;">
          <div class="experience-bar futuristic" style="width: ${percentage}%; height: 100%;"></div>
          <div class="experience-text">${formatLargeNumber(Math.floor(expCurrent))}/${formatLargeNumber(expTotal)}</div>
        </div>
      `;

      container.innerHTML = html;
      console.log('[ExperienceModule] Прогресс-бар опыта отрисован на главной странице:', { containerId, expCurrent, expTotal, level: actualLevel });
    } else {
      console.warn('[ExperienceModule] Контейнер не найден:', containerId);
    }
    
    // Дополнительно обновляем страницу персонажа, если она активна
    const experienceBar = document.querySelector('.experience-bar.futuristic');
    const experienceText = document.querySelector('.experience-text');
    
    if (experienceBar && experienceText) {
      experienceBar.style.width = `${percentage}%`;
      experienceText.textContent = `${formatLargeNumber(Math.floor(expCurrent))}/${formatLargeNumber(expTotal)}`;
      console.log('[ExperienceModule] Обновлен опыт на странице персонажа:', { expCurrent, expTotal, level: actualLevel });
    }
  };

  // Старт таймера обновления опыта
  const startExperienceTimer = (containerId, interval = 30000) => {
    console.log('[ExperienceModule] Запуск таймера обновления опыта:', { containerId, interval });
    
    // Первичная отрисовка
    renderExperienceBar(containerId);
    
    // Запуск таймера с обновлением с сервера
    return setInterval(async () => {
      await updateExperience();
      renderExperienceBar(containerId);
    }, interval);
  };

  // Публичный API
  return {
    init: initExperience,
    update: updateExperience,
    get: getExperience,
    renderBar: renderExperienceBar,
    startTimer: startExperienceTimer
  };
})();

// Глобальная система повышения уровня
const LevelingModule = (() => {
  // Функция для расчета требуемого опыта для достижения уровня
  const getExperienceRequiredForLevel = (level) => {
    if (level <= 1) return 0;
    
    // Вычисляем общий опыт, необходимый для достижения уровня
    let totalExp = 0;
    let currentLevelExp = 150; // Опыт для перехода с 1 на 2 уровень
    
    for (let i = 2; i <= level; i++) {
      totalExp += currentLevelExp;
      currentLevelExp = Math.floor(currentLevelExp * 1.6); // Каждый следующий уровень требует на 60% больше опыта
    }
    
    return totalExp;
  };

  // Функция для определения уровня по текущему опыту
  const getLevelByExperience = (experience) => {
    let level = 1;
    while (getExperienceRequiredForLevel(level + 1) <= experience) {
      level++;
    }
    return level;
  };

  // Функция для получения прогресса до следующего уровня
  const getLevelProgress = (experience, currentLevel) => {
    const currentLevelExp = getExperienceRequiredForLevel(currentLevel);
    const nextLevelExp = getExperienceRequiredForLevel(currentLevel + 1);
    const progressExp = experience - currentLevelExp;
    const neededExp = nextLevelExp - currentLevelExp;
    
    return {
      current: progressExp,
      needed: neededExp,
      percentage: Math.min(100, (progressExp / neededExp) * 100)
    };
  };

  // Основная функция проверки и повышения уровня
  const checkAndUpdateLevel = async (currentExperience) => {
    try {
      const telegramId = localStorage.getItem('telegramId');
      if (!telegramId) {
        console.error('[LevelingModule] telegramId не найден');
        return { success: false, error: 'telegramId не найден' };
      }

      // Определяем новый уровень на основе опыта
      const newLevel = getLevelByExperience(currentExperience);
      
      // Получаем текущий уровень с сервера
      const response = await fetch(`rpg.php?action=getUserData&t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ telegramId })
      });

      const data = await response.json();
      if (!data.success) {
        console.error('[LevelingModule] Ошибка получения данных пользователя:', data.message);
        return { success: false, error: data.message };
      }

      const currentLevel = data.userData.level || 1;
      
      // Если уровень изменился, обновляем на сервере
      if (newLevel > currentLevel) {
        console.log(`[LevelingModule] Повышение уровня! ${currentLevel} -> ${newLevel}`);
        
        const updateResponse = await fetch(`rpg.php?action=updateUserLevel&t=${Date.now()}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          body: JSON.stringify({ telegramId, level: newLevel })
        });

        const updateData = await updateResponse.json();
        if (updateData.success) {
          console.log(`[LevelingModule] Уровень успешно обновлен до ${newLevel}`);
          
          // Обновляем отображение уровня
          updateLevelDisplay(newLevel);
          
          // Показываем уведомление о повышении уровня
          showLevelUpNotification(currentLevel, newLevel);
          
          // Отправляем событие критического изменения уровня если нужно
          if (currentLevel === 5 && newLevel === 6) {
            window.dispatchEvent(new CustomEvent('levelCriticalChange', {
              detail: {
                oldLevel: currentLevel,
                newLevel: newLevel,
                shouldBlockNovice: true,
                shouldUnlockExperienced: true
              }
            }));
            console.log('[LevelingModule] Отправлено событие критического изменения уровня 5->6');
          }
          
          return { 
            success: true, 
            levelUp: true, 
            oldLevel: currentLevel, 
            newLevel: newLevel,
            experienceForNext: getExperienceRequiredForLevel(newLevel + 1)
          };
        } else {
          console.error('[LevelingModule] Ошибка обновления уровня:', updateData.message);
          return { success: false, error: updateData.message };
        }
      }
      
      return { 
        success: true, 
        levelUp: false, 
        level: currentLevel,
        experienceForNext: getExperienceRequiredForLevel(currentLevel + 1)
      };
      
    } catch (error) {
      console.error('[LevelingModule] Ошибка проверки уровня:', error);
      return { success: false, error: error.message };
    }
  };

  // Обновление отображения уровня на странице
  const updateLevelDisplay = (level) => {
    const levelElements = document.querySelectorAll('.character-level.futuristic');
    levelElements.forEach(element => {
      element.textContent = `Level ${level}`;
    });
    
    // Обновляем отображение опыта с новым уровнем
    if (window.ExperienceModule) {
      const experienceData = window.ExperienceModule.get();
      experienceData.level = level;
      
      // Перерисовываем бары опыта
      const mainContainer = document.getElementById('main-experience-container');
      if (mainContainer) {
        window.ExperienceModule.renderBar('main-experience-container');
      }
    }
    
    // Обновляем через глобальную функцию если она доступна
    if (window.updateExperienceDisplay) {
      const experienceData = window.ExperienceModule ? window.ExperienceModule.get() : { currentExperience: 0 };
      window.updateExperienceDisplay(experienceData.currentExperience, 0);
    }
  };

  // Показ уведомления о повышении уровня
  const showLevelUpNotification = (oldLevel, newLevel) => {
    // Добавляем статы в локальное хранилище нераспределенных статов
    const statsToAdd = 5 * (newLevel - oldLevel);
    console.log(`[LevelingModule] Показываем уведомление о повышении уровня: ${oldLevel} -> ${newLevel}, статов будет добавлено: ${statsToAdd}`);
    
    // Добавляем статы в модуль нераспределенных статов
    if (window.UnallocatedStatsModule) {
      window.UnallocatedStatsModule.add(statsToAdd);
      console.log(`[LevelingModule] Добавлено ${statsToAdd} нераспределенных статов`);
    }
    
    // Дополнительно вызываем обновление индикатора с задержкой
    setTimeout(() => {
      if (window.UnallocatedStatsModule) {
        window.UnallocatedStatsModule.updateIndicator();
      }
    }, 1000);
    
    // Создаем красивое уведомление с эффектами
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 15%;
      left: 50%;
      transform: translateX(-50%);
      width: 180px;
      height: 80px;
      background: linear-gradient(135deg, 
        rgba(0, 255, 247, 0.95) 0%, 
        rgba(0, 191, 255, 0.95) 50%, 
        rgba(0, 150, 255, 0.95) 100%);
      border: 3px solid #00fff7;
      border-radius: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 30000;
      box-shadow: 
        0 0 30px rgba(0, 255, 247, 0.8),
        0 0 60px rgba(0, 255, 247, 0.4),
        inset 0 0 20px rgba(255, 255, 255, 0.3);
      animation: levelUpEpicEntry 1s ease-out;
      overflow: hidden;
    `;
    
    notification.innerHTML = `
      <div style="
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        gap: 4px;
        position: relative;
        z-index: 2;
        padding: 5px;
      ">
        <div style="
          display: flex; 
          align-items: center; 
          gap: 8px;
        ">
          <span style="
            color: #FFFFFF; 
            font-weight: bold; 
            font-size: 18px; 
            text-shadow: 
              0 0 8px rgba(0, 255, 247, 0.9),
              2px 2px 4px rgba(0, 0, 0, 0.7);
            letter-spacing: 1px;
          ">LEVEL UP!</span>
          <span style="
            color: #00ff00; 
            font-size: 18px; 
            font-weight: 900;
            text-shadow: 
              0 0 10px rgba(0, 255, 0, 0.9),
              0 0 20px rgba(0, 255, 0, 0.6);
            animation: levelUpArrowBounce 0.6s ease-in-out infinite alternate;
            filter: drop-shadow(0 0 5px #00ff00);
            line-height: 1;
          ">▲</span>
        </div>
        <div style="
          color: #FFFFFF; 
          font-size: 16px; 
          font-weight: bold;
          text-shadow: 0 0 5px rgba(0, 255, 247, 0.8);
          opacity: 0.9;
        ">${oldLevel} → ${newLevel}</div>
        <div style="
          color: #00ff00; 
          font-size: 13px; 
          font-weight: bold;
          text-shadow: 0 0 5px rgba(0, 255, 0, 0.8);
        ">+${statsToAdd} Stat Points!</div>
      </div>
      
      <!-- Частицы блеска -->

      
      <!-- Анимированный блик -->
      <div style="
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent 0%, 
          rgba(255, 255, 255, 0.4) 50%, 
          transparent 100%);
        animation: levelUpShine 2s ease-out;
        transform: skewX(-20deg);
      "></div>
    `;
    
    document.body.appendChild(notification);
    

    
    // Добавляем анимации
    const style = document.createElement('style');
    style.textContent = `
      @keyframes levelUpEpicEntry {
                 0% { 
           transform: translateX(-50%) translateY(-30px) scale(0.3);
           opacity: 0;
           box-shadow: 0 0 5px rgba(0, 255, 247, 0.4);
         }
         50% { 
           transform: translateX(-50%) translateY(-5px) scale(1.1);
           opacity: 1;
           box-shadow: 
             0 0 40px rgba(0, 255, 247, 0.9),
             0 0 80px rgba(0, 255, 247, 0.5);
         }
         100% { 
           transform: translateX(-50%) translateY(0) scale(1);
           opacity: 1;
           box-shadow: 
             0 0 30px rgba(0, 255, 247, 0.8),
             0 0 60px rgba(0, 255, 247, 0.4);
         }
      }
      
      @keyframes levelUpArrowBounce {
        0% { transform: translateY(0px); }
        100% { transform: translateY(-3px); }
      }
      
      @keyframes levelUpShine {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      
      @keyframes levelUpFadeOut {
        0% { 
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
        }
        100% { 
          opacity: 0;
          transform: translateX(-50%) translateY(-20px) scale(0.8);
        }
      }
      

    `;
    document.head.appendChild(style);
    
    // Убираем через 3 секунды с анимацией исчезновения
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'levelUpFadeOut 0.7s ease-out forwards';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
          if (style.parentNode) {
            style.remove();
          }
        }, 700);
      }
    }, 3000);
  };
  


  // Публичный API
  return {
    getExperienceRequiredForLevel,
    getLevelByExperience,
    getLevelProgress,
    checkAndUpdateLevel,
    updateLevelDisplay,
    showLevelUpNotification
  };
})();

// Глобальная функция для проверки уровня при получении опыта
window.checkLevelUp = async (currentExperience) => {
  if (window.LevelingModule) {
    return await window.LevelingModule.checkAndUpdateLevel(currentExperience);
  }
  return { success: false, error: 'LevelingModule не найден' };
};

// Глобальная функция для получения требуемого опыта для уровня
window.getExpForLevel = (level) => {
  if (window.LevelingModule) {
    return window.LevelingModule.getExperienceRequiredForLevel(level);
  }
  return 0;
};

// Глобальная функция для получения уровня по опыту
window.getLevelByExp = (experience) => {
  if (window.LevelingModule) {
    return window.LevelingModule.getLevelByExperience(experience);
  }
  return 1;
};

// Экспортируем модули
window.StaminaModule = StaminaModule; 
window.StatsModule = StatsModule;
window.ExperienceModule = ExperienceModule;
window.LevelingModule = LevelingModule;

// Модуль для управления нераспределенными статами
const UnallocatedStatsModule = (() => {
  // Функция для получения Telegram ID из localStorage
  const getTelegramId = () => {
    return localStorage.getItem('telegramId');
  };

  // Загрузка нераспределенных статов с сервера
  const fetchUnallocatedStatsFromServer = async () => {
    const telegramId = getTelegramId();
    if (!telegramId) {
      console.error('[UnallocatedStatsModule] telegramId не найден для загрузки статов');
      return null;
    }

    try {
      const response = await fetch(`rpg.php?action=getUserData&t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ telegramId })
      });

      const data = await response.json();
      
      if (data.success && data.userData) {
        const serverStats = data.userData.stats_avb || 0;
        console.log('[UnallocatedStatsModule] Статы получены с сервера:', serverStats);
        
        // Обновляем локальное хранилище данными с сервера
        localStorage.setItem(`unallocatedStats_${telegramId}`, serverStats.toString());
        
        // Отправляем событие об изменении нераспределенных статов
        window.dispatchEvent(new CustomEvent('unallocatedStatsChanged', {
          detail: { unallocatedStats: serverStats }
        }));
        
        return serverStats;
      } else {
        console.error('[UnallocatedStatsModule] Ошибка получения статов с сервера:', data.message);
        return null;
      }
    } catch (error) {
      console.error('[UnallocatedStatsModule] Ошибка запроса статов с сервера:', error);
      return null;
    }
  };

  // Получение количества нераспределенных статов
  const getUnallocatedStats = () => {
    const telegramId = getTelegramId();
    if (!telegramId) return 0;
    
    const key = `unallocatedStats_${telegramId}`;
    return parseInt(localStorage.getItem(key)) || 0;
  };

  // Добавление нераспределенных статов
  const addUnallocatedStats = (amount) => {
    const telegramId = getTelegramId();
    if (!telegramId) return;
    
    const currentStats = getUnallocatedStats();
    const newStats = currentStats + amount;
    
    // Сохраняем в localStorage
    localStorage.setItem(`unallocatedStats_${telegramId}`, newStats.toString());
    
    // Отправляем событие об изменении нераспределенных статов
    window.dispatchEvent(new CustomEvent('unallocatedStatsChanged', {
      detail: { unallocatedStats: newStats }
    }));
    
    // Сразу обновляем индикатор на кнопке персонажа
    updateCharacterIconIndicator();
    
    return newStats;
  };

  // Использование нераспределенных статов
  const useUnallocatedStats = (amount) => {
    const telegramId = getTelegramId();
    if (!telegramId) return false;
    
    const currentStats = getUnallocatedStats();
    if (currentStats < amount) {
      console.log(`[UnallocatedStatsModule] Недостаточно статов. Есть: ${currentStats}, нужно: ${amount}`);
      return false;
    }
    
    const newStats = currentStats - amount;
    localStorage.setItem(`unallocatedStats_${telegramId}`, newStats.toString());
    
    // Отправляем событие об изменении нераспределенных статов
    window.dispatchEvent(new CustomEvent('unallocatedStatsChanged', {
      detail: { unallocatedStats: newStats }
    }));
    
    // Сразу обновляем индикатор на кнопке персонажа
    updateCharacterIconIndicator();
    
    console.log(`[UnallocatedStatsModule] Использовано ${amount} статов. Осталось: ${newStats}`);
    return true;
  };

  // Обновление индикатора на иконке персонажа
  const updateCharacterIconIndicator = () => {
    // Проверяем, что мы на главной странице RPG
    const isOnRPGMainPage = document.querySelector('.rpg-main-screen') || 
                           document.querySelector('.rpg-layout') ||
                           document.querySelector('#rpg-app-root .rpg-sidebar');
    
    if (!isOnRPGMainPage) {
      console.log('[UnallocatedStatsModule] Не на главной странице RPG, пропускаем обновление индикатора');
      return;
    }
    
    const unallocatedStats = getUnallocatedStats();
    console.log(`[UnallocatedStatsModule] Обновление индикатора. Статов: ${unallocatedStats}`);
    
    // Множественные способы поиска кнопки персонажа
    let characterButton = null;
    
    // Способ 1: По ID
    characterButton = document.getElementById('character-button');
    if (characterButton) {
      console.log('[UnallocatedStatsModule] Кнопка найдена по ID character-button');
    }
    
    // Способ 2: По GameButton компоненту с изображением Character
    if (!characterButton) {
      const gameButtons = document.querySelectorAll('.game-button');
      console.log(`[UnallocatedStatsModule] Поиск среди ${gameButtons.length} game-button элементов`);
      
      for (let button of gameButtons) {
        const img = button.querySelector('img[alt="Character"]');
        if (img) {
          characterButton = button;
          console.log('[UnallocatedStatsModule] Кнопка найдена по img alt="Character"');
          break;
        }
      }
    }
    
    // Способ 3: Поиск по тексту "Character"
    if (!characterButton) {
      const gameButtons = document.querySelectorAll('.game-button');
      for (let button of gameButtons) {
        const span = button.querySelector('span');
        if (span && span.textContent.includes('Character')) {
          characterButton = button;
          console.log('[UnallocatedStatsModule] Кнопка найдена по тексту "Character"');
          break;
        }
      }
    }
    
    // Способ 4: Поиск кнопки с иконкой пользователя
    if (!characterButton) {
      const buttons = document.querySelectorAll('button');
      for (let button of buttons) {
        const img = button.querySelector('img');
        if (img && (img.src.includes('character') || img.alt === 'Character')) {
          characterButton = button.closest('.game-button') || button;
          console.log('[UnallocatedStatsModule] Кнопка найдена по src с "character"');
          break;
        }
      }
    }
    
    if (!characterButton) {
      console.log('[UnallocatedStatsModule] Кнопка персонажа не найдена на RPG странице');
      return; // Убираем повторные попытки
    }
    
    // Удаляем старый индикатор
    const oldIndicator = characterButton.querySelector('.stats-indicator');
    if (oldIndicator) {
      oldIndicator.remove();
      console.log('[UnallocatedStatsModule] Старый индикатор удален');
    }
    
    // Добавляем новый индикатор если есть нераспределенные статы
    if (unallocatedStats > 0) {
      const indicator = document.createElement('div');
      indicator.className = 'stats-indicator';
      indicator.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle at 30% 30%, #00fff7 0%, #00ccf7 30%, #0099cc 70%, #006699 100%);
        border: 2px solid rgba(0, 255, 247, 0.8);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 900;
        color: #ffffff;
        text-shadow: 0 0 6px rgba(0, 255, 247, 0.9), 0 0 12px rgba(0, 255, 247, 0.6);
        box-shadow: 
          0 0 15px rgba(0, 255, 247, 0.7),
          0 0 25px rgba(0, 255, 247, 0.4),
          inset 0 0 8px rgba(255, 255, 255, 0.3);
        z-index: 15;
        animation: statsIndicatorAdvanced 3s ease-in-out infinite;
        backdrop-filter: blur(2px);
        overflow: hidden;
      `;
      
      // Создаем внутренний элемент с символом
      const symbol = document.createElement('div');
      symbol.style.cssText = `
        position: relative;
        z-index: 2;
        filter: drop-shadow(0 0 3px rgba(0, 255, 247, 0.8));
        animation: statsSymbolFloat 2s ease-in-out infinite alternate;
      `;
      symbol.innerHTML = '◆';
      
      // Добавляем блик
      const shine = document.createElement('div');
      shine.style.cssText = `
        position: absolute;
        top: -100%;
        left: -100%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.6) 50%, transparent 70%);
        animation: statsIndicatorShine 4s ease-in-out infinite;
        transform: rotate(45deg);
        pointer-events: none;
      `;
      
      indicator.appendChild(symbol);
      indicator.appendChild(shine);
      
      characterButton.style.position = 'relative';
      characterButton.appendChild(indicator);
      
      console.log(`[UnallocatedStatsModule] Индикатор добавлен. Статов: ${unallocatedStats}`);
      
      // Добавляем CSS анимацию если её нет
      if (!document.getElementById('stats-indicator-styles')) {
        const style = document.createElement('style');
        style.id = 'stats-indicator-styles';
        style.textContent = `
          @keyframes statsIndicatorAdvanced {
            0%, 100% { 
              transform: scale(1) rotate(0deg);
              box-shadow: 
                0 0 15px rgba(0, 255, 247, 0.7),
                0 0 25px rgba(0, 255, 247, 0.4),
                inset 0 0 8px rgba(255, 255, 255, 0.3);
              border-color: rgba(0, 255, 247, 0.8);
            }
            25% { 
              transform: scale(1.05) rotate(5deg);
              box-shadow: 
                0 0 20px rgba(0, 255, 247, 0.9),
                0 0 35px rgba(0, 255, 247, 0.6),
                inset 0 0 12px rgba(255, 255, 255, 0.4);
              border-color: rgba(0, 255, 247, 1);
            }
            50% { 
              transform: scale(1.1) rotate(0deg);
              box-shadow: 
                0 0 25px rgba(0, 255, 247, 1),
                0 0 45px rgba(0, 255, 247, 0.8),
                inset 0 0 15px rgba(255, 255, 255, 0.5);
              border-color: rgba(255, 255, 255, 0.9);
            }
            75% { 
              transform: scale(1.05) rotate(-5deg);
              box-shadow: 
                0 0 20px rgba(0, 255, 247, 0.9),
                0 0 35px rgba(0, 255, 247, 0.6),
                inset 0 0 12px rgba(255, 255, 255, 0.4);
              border-color: rgba(0, 255, 247, 1);
            }
          }
          
          @keyframes statsSymbolFloat {
            0% { transform: translateY(0px) scale(1); }
            100% { transform: translateY(-1px) scale(1.05); }
          }
          
          @keyframes statsIndicatorShine {
            0% { 
              transform: translateX(-150%) translateY(-150%) rotate(45deg);
              opacity: 0;
            }
            50% { 
              transform: translateX(0%) translateY(0%) rotate(45deg);
              opacity: 1;
            }
            100% { 
              transform: translateX(150%) translateY(150%) rotate(45deg);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      console.log('[UnallocatedStatsModule] Нет нераспределенных статов, индикатор не нужен');
    }
  };

  // Инициализация модуля
  const init = async () => {
    console.log('[UnallocatedStatsModule] Инициализация модуля нераспределенных статов');
    
    // Загружаем статы с сервера при инициализации
    try {
      await fetchUnallocatedStatsFromServer();
      console.log('[UnallocatedStatsModule] Статы загружены с сервера при инициализации');
    } catch (error) {
      console.error('[UnallocatedStatsModule] Ошибка загрузки статов при инициализации:', error);
    }
    
    // Первичная установка индикатора (после загрузки с сервера)
    setTimeout(() => updateCharacterIconIndicator(), 500);
    
    // Отслеживаем изменения DOM для повторной установки индикатора
    const observer = new MutationObserver((mutations) => {
      // Проверяем, что мы на RPG странице
      const isOnRPGMainPage = document.querySelector('.rpg-main-screen') || 
                             document.querySelector('.rpg-layout') ||
                             document.querySelector('#rpg-app-root .rpg-sidebar');
      
      if (!isOnRPGMainPage) {
        return; // Не обрабатываем изменения если не на RPG странице
      }
      
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Проверяем, добавились ли новые .game-button элементы
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              if (node.classList?.contains('game-button') || 
                  node.querySelector?.('.game-button') ||
                  node.classList?.contains('rpg-sidebar')) {
                shouldUpdate = true;
              }
            }
          });
        }
      });
      
      if (shouldUpdate) {
        console.log('[UnallocatedStatsModule] RPG DOM изменился, обновляем индикатор');
        setTimeout(() => updateCharacterIconIndicator(), 100);
      }
    });
    
    // Начинаем наблюдение за изменениями в DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Слушаем событие изменения статов
    window.addEventListener('unallocatedStatsChanged', (event) => {
      console.log('[UnallocatedStatsModule] Получено событие изменения статов:', event.detail);
      setTimeout(() => updateCharacterIconIndicator(), 100);
    });
  };

  // Публичный API
  return {
    get: getUnallocatedStats,
    add: addUnallocatedStats,
    use: useUnallocatedStats,
    updateIndicator: updateCharacterIconIndicator,
    init,
    fetchFromServer: fetchUnallocatedStatsFromServer
  };
})();

// Глобальная функция для добавления нераспределенных статов
window.addUnallocatedStats = (amount) => {
  if (window.UnallocatedStatsModule) {
    window.UnallocatedStatsModule.add(amount);
  }
};

// Экспортируем модуль
window.UnallocatedStatsModule = UnallocatedStatsModule; 

// Автоматическая инициализация модуля
document.addEventListener('DOMContentLoaded', async () => {
  await UnallocatedStatsModule.init();
});

// Если DOM уже загружен
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await UnallocatedStatsModule.init();
  });
} else {
  UnallocatedStatsModule.init();
}

// Глобальная функция для принудительного обновления индикатора
window.updateStatsIndicator = () => {
  if (window.UnallocatedStatsModule) {
    window.UnallocatedStatsModule.updateIndicator();
  }
};

// Дополнительные слушатели для отслеживания изменений состояния приложения
window.addEventListener('hashchange', () => {
  // Проверяем, что мы на RPG странице
  const isOnRPGMainPage = document.querySelector('.rpg-main-screen') || 
                         document.querySelector('.rpg-layout') ||
                         document.querySelector('#rpg-app-root .rpg-sidebar');
  
  if (isOnRPGMainPage) {
    setTimeout(() => {
      if (window.UnallocatedStatsModule) {
        window.UnallocatedStatsModule.updateIndicator();
      }
    }, 500);
  }
});

window.addEventListener('popstate', () => {
  // Проверяем, что мы на RPG странице
  const isOnRPGMainPage = document.querySelector('.rpg-main-screen') || 
                         document.querySelector('.rpg-layout') ||
                         document.querySelector('#rpg-app-root .rpg-sidebar');
  
  if (isOnRPGMainPage) {
    setTimeout(() => {
      if (window.UnallocatedStatsModule) {
        window.UnallocatedStatsModule.updateIndicator();
      }
    }, 500);
  }
});

// Отслеживание кликов для обновления индикатора при переходах
document.addEventListener('click', (event) => {
  const target = event.target.closest('.game-button');
  if (target) {
    // Проверяем, что мы на RPG странице
    const isOnRPGMainPage = document.querySelector('.rpg-main-screen') || 
                           document.querySelector('.rpg-layout') ||
                           document.querySelector('#rpg-app-root .rpg-sidebar');
    
    if (isOnRPGMainPage) {
      setTimeout(() => {
        if (window.UnallocatedStatsModule) {
          window.UnallocatedStatsModule.updateIndicator();
        }
      }, 200);
    }
  }
}); 