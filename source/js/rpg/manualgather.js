// Модуль для ручного сбора ресурсов
const ManualGatherModule = (() => {
    // Константы
    const GAME_DURATION = 15; // Длительность игры в секундах (было 60)
    const RESOURCE_DURATION = 0.65; // Сколько секунд показывается ресурс (было 1.0)
    const MIN_REWARD_POINTS = 5; // Минимальное количество очков для получения награды
    const STAMINA_COST = 1; // Стоимость стамины за клик

    // Переменные состояния
    let gameState = {
        isActive: false,
        seconds: GAME_DURATION,
        points: 0,
        gameTimer: null,
        resourceTimer: null,
        resourceIntervalTimer: null, // Новый интервальный таймер
        resourceElement: null,
        gatherType: 'gather', // gather, chop, mine, hunt по умолчанию
        gatheringPageContainer: null,
        startTime: null, // Время начала сессии для логирования
        collectedResources: [], // Собранные ресурсы для логирования
        initialArrowCount: 0, // Начальное количество стрел для логирования
        usedArrows: 0, // Количество использованных стрел
        isCreatingResource: false, // Флаг блокировки создания ресурсов
        currentResourceId: null // Уникальный ID текущего ресурса
    };

    // Ресурсы для различных типов сбора
    const resourcesByType = {
        gather: ['Stick', 'Berry', 'Mushrooms', 'Herbs', 'Fiber', 'WoodLog'],
        mine: ['Rock', 'IronOre'],
        chop: ['WoodLog', 'Stick'],
        hunt: ['Meat', 'Leather']
    };

    // Шансы ресурсов для различных типов добычи (как в автоматическом сборе)
    const resourceChancesByType = {
        gather: {
            'Rock': 8,
            'WoodLog': 8,
            'Berry': 16,
            'Herbs': 16,
            'Stick': 16,
            'Mushrooms': 16,
            'Fiber': 21
        },
        mine: {
            'IronOre': 40,
            'Rock': 60
        },
        chop: {
            'WoodLog': 40,
            'Stick': 60
        },
        hunt: {
            'Meat': 60,
            'Leather': 40
        }
    };

    // Вспомогательные функции для цветового форматирования текста
    const formatStaminaText = (text) => `<span class="stamina-text">${text}</span>`;
    const formatArrowsText = (text) => `<span class="arrows-text">${text}</span>`;
    const formatResourcesText = (text) => `<span class="resources-text">${text}</span>`;
    const formatPointsText = (text) => `<span class="points-text">${text}</span>`;

    // Инициализация игры
    const init = (containerElement, type = 'gather') => {
        console.log('[ManualGather] init called', { containerElement, type });
        if (!containerElement) {
            console.error('[ManualGather] Container element is required');
            return;
        }

        // Сохраняем тип сбора
        gameState.gatherType = type;
        console.log('[ManualGather] gatherType set:', gameState.gatherType);
        
        // Больше не скрываем gathering-page, так как контейнер теперь создается вне него
        // и использует fixed-позиционирование поверх всего содержимого

        // Создаем структуру игрового интерфейса
        createGameUI(containerElement);
        console.log('[ManualGather] createGameUI вызван');

        // Показываем начальное сообщение
        showInfoMessage('Collect as many resources as possible. Click to start!');
        console.log('[ManualGather] showInfoMessage вызван');
    };

    // Создание интерфейса игры
    const createGameUI = (container) => {
        console.log('[ManualGather] createGameUI старт', { container });
        // Очищаем контейнер
        container.innerHTML = '';

        // Создаем затемненный фон
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
        
        // Добавим отладочные атрибуты, чтобы видеть элемент в DevTools
        overlay.setAttribute('data-debug', 'manual-gather-overlay');
        
        // Создаем информационное окно
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
        
        // Создаем счетчик очков, который будет под таймером
        const gamePointsElement = document.createElement('div');
        gamePointsElement.id = 'game-points';
        gamePointsElement.className = 'game-points';
        gamePointsElement.innerText = 'Points: 0';
        gamePointsElement.style.fontSize = '22px';
        gamePointsElement.style.color = 'rgb(255, 255, 0)';
        gamePointsElement.style.textShadow = '0 0 3px rgba(0, 0, 0, 0.9)';
        gamePointsElement.style.margin = '0';
        gamePointsElement.style.zIndex = '1000'; // Низкий z-index, чтобы быть ниже ресурсов (10001)
        
        // Собираем верхнюю панель
        gameStaminaWrap.appendChild(gameStaminaElement);
        gameStaminaWrap.appendChild(gameStaminaValue);
        
        gameTimerStaminaContainer.appendChild(gameTimerElement);
        gameTimerStaminaContainer.appendChild(gameStaminaWrap);
        
        gameTopPanel.appendChild(gameTimerStaminaContainer);
        gameTopPanel.appendChild(gamePointsElement);

        // Объединяем элементы основной инфопанели
        infoPanel.appendChild(staminaRow);
        infoPanel.appendChild(cancelBtn);
        
        overlay.appendChild(infoPanel);
        overlay.appendChild(gameArea);
        overlay.appendChild(gameTopPanel);
        container.appendChild(overlay);

        // Инициализируем отображение стамины в инфопанели
        if (window.StaminaModule) {
            window.StaminaModule.renderBar('stamina-container');
            updateInfoStaminaValue();
        }
        
        // Добавляем обработчик клика на game-area для уменьшения стамины
        gameArea.addEventListener('click', async (e) => {
            // Если игра активна и клик прошел мимо ресурса
            if (gameState.isActive && e.target === gameArea) {
                // Проверяем стамину
                if (window.StaminaModule && !window.StaminaModule.hasEnough(STAMINA_COST)) {
                    endGame('No stamina left!');
                    return;
                }
                
                // Уменьшаем стамину
                if (window.StaminaModule) {
                    try {
                        console.log('[ManualGather] Попытка уменьшить стамину на', STAMINA_COST);
                        const result = await window.StaminaModule.decrease(STAMINA_COST);
                        console.log('[ManualGather] Результат уменьшения стамины:', result);
                        
                        if (result.success) {
                            // Обновляем отображение
                            window.StaminaModule.renderBar('game-stamina-container');
                            updateStaminaValue();
                            
                            // Проверяем стамину из результата сервера, а не из кэша
                            const currentStamina = result.currentStamina;
                            console.log('[ManualGather] Текущая стамина после уменьшения:', currentStamina);
                            
                            if (currentStamina <= 0) {
                                console.warn('[ManualGather] Стамина закончилась, завершаем игру');
                                endGame('No stamina left!');
                                return;
                            }
                            
                            console.log('[ManualGather] Клик мимо ресурса, стамина -1, осталось:', currentStamina);
                        } else {
                            console.error('[ManualGather] Ошибка уменьшения стамины:', result.error);
                            if (result.error && result.error.includes('Insufficient stamina')) {
                                endGame('No stamina left!');
                                return;
                            }
                        }
                    } catch (error) {
                        console.error('[ManualGather] Ошибка при уменьшении стамины:', error);
                    }
                }
            }
        });
        
        // Также добавим прямую кнопку Start
        const startButton = document.createElement('button');
        startButton.className = 'gathering-button futuristic';
        startButton.innerText = 'Start Game';
        startButton.style.marginTop = '20px';
        startButton.style.padding = '10px 20px';
        startButton.style.fontSize = '18px';
        startButton.style.cursor = 'pointer';
        startButton.addEventListener('click', (e) => {
            console.log('[ManualGather] Клик на кнопку Start зарегистрирован', e);
            e.stopPropagation();
            startGame();
        });
        
        infoPanel.appendChild(startButton);
        
        console.log('[ManualGather] overlay создан и обработчики клика добавлены');
    };

    // Показать информационное сообщение
    const showInfoMessage = (message) => {
        console.log('[ManualGather] showInfoMessage:', message);
        const infoPanel = document.getElementById('info-panel');
        if (!infoPanel) {
            console.error('[ManualGather] info-panel не найден');
            return;
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'info-message';
        messageElement.innerHTML = message;
        
        // Устанавливаем стили для сообщения
        messageElement.style.margin = '15px 0';
        messageElement.style.padding = '12px';
        messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageElement.style.border = '1px solid rgba(0, 255, 255, 0.4)';
        messageElement.style.borderRadius = '8px';
        messageElement.style.color = '#ffffff';
        messageElement.style.fontSize = '18px';
        messageElement.style.fontWeight = 'bold';
        messageElement.style.textShadow = '0 0 5px rgba(0, 255, 255, 0.5)';
        messageElement.style.lineHeight = '1.5';
        messageElement.style.whiteSpace = 'pre-line';

        // Удаляем предыдущее сообщение, если оно есть
        const oldMessage = infoPanel.querySelector('.info-message');
        if (oldMessage) {
            infoPanel.removeChild(oldMessage);
        }

        infoPanel.appendChild(messageElement);
    };

    // Функция для создания модального окна предупреждения о стрелах
    const showArrowWarningModal = (arrowCount) => {
        // Удаляем предыдущее модальное окно, если есть
        const existingModal = document.querySelector('.arrow-warning-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'arrow-warning-modal';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 10, 40, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: linear-gradient(135deg, rgba(0,255,255,0.18) 0%, rgba(0,0,40,0.8) 100%);
            box-shadow: 0 8px 32px 0 rgba(31,38,135,0.37);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 24px;
            border: 2px solid rgba(0,255,255,0.35);
            border-top: 2.5px solid #ffa500;
            border-bottom: 2.5px solid #ffa500;
            padding: 24px 18px 18px 18px;
            width: 330px;
            max-width: 80%;
            text-align: center;
            color: #fff;
            position: relative;
        `;

        const title = document.createElement('h3');
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #ffa500;
            text-shadow: 0 0 8px #ffa500, 0 0 2px #fff;
            font-size: 20px;
        `;
        title.textContent = 'Insufficient Arrows';

        const message = document.createElement('p');
        message.style.cssText = `
            margin: 0 0 15px 0;
            font-size: 16px;
            line-height: 1.5;
        `;
        message.textContent = arrowCount === 0 
            ? 'You need at least 2 arrows to start interactive hunting! Please craft or equip arrows first.'
            : `You only have ${arrowCount} arrow${arrowCount === 1 ? '' : 's'}. You need at least 2 arrows to start interactive hunting! Please craft more arrows or check your inventory.`;

        const closeButton = document.createElement('button');
        closeButton.className = 'modal-btn';
        closeButton.style.cssText = `
            background: linear-gradient(90deg, rgba(255,165,0,0.25) 0%, rgba(255,165,0,0.12) 100%);
            color: #ffa500;
            border: 2px solid #ffa500;
            border-radius: 16px;
            font-weight: bold;
            font-size: 1.1rem;
            letter-spacing: 1px;
            box-shadow: 0 0 16px 2px rgba(255,165,0,0.53), 0 0 2px 0 #fff;
            text-shadow: 0 0 8px #ffa500, 0 0 2px #fff;
            padding: 12px 32px;
            margin: 8px 0;
            cursor: pointer;
            transition: background 0.2s, color 0.2s;
            outline: none;
            backdrop-filter: blur(2px);
        `;
        closeButton.textContent = 'Close';

        closeButton.addEventListener('click', () => {
            modalOverlay.remove();
        });

        modalContent.appendChild(title);
        modalContent.appendChild(message);
        modalContent.appendChild(closeButton);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);

        // Автозакрытие через 5 секунд
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.remove();
            }
        }, 5000);
    };

    // Функция для проверки наличия стрел (только для охоты)
    const checkArrowsForHunt = async () => {
        if (gameState.gatherType !== 'hunt') {
            return { hasEnough: true, count: 0 }; // Для других типов сбора стрелы не нужны
        }
        
        try {
            let arrowCount = 0;
            let primArrowCount = 0;
            
            // Проверяем в IndexedDB
            if (window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
                const inventory = await window.IndexedDBModule.getInventoryItems();
                console.log('[ManualGather] Инвентарь из IndexedDB:', inventory);
                
                const arrow = inventory.find(i => i.id === 'Arrow' || i.id === 'arrow');
                const primArrow = inventory.find(i => i.id === 'PrimArrow' || i.id === 'primarrow' || i.id === 'primarrows');
                
                if (arrow) arrowCount = parseInt(arrow.quantity || arrow.qty || 0);
                if (primArrow) primArrowCount = parseInt(primArrow.quantity || primArrow.qty || 0);
            }
            
            // Проверяем глобальные ресурсы
            if (window.globalUserResources) {
                console.log('[ManualGather] Глобальные ресурсы:', window.globalUserResources);
                
                if (window.globalUserResources.Arrow) 
                    arrowCount = Math.max(arrowCount, parseInt(window.globalUserResources.Arrow));
                if (window.globalUserResources.arrow) 
                    arrowCount = Math.max(arrowCount, parseInt(window.globalUserResources.arrow));
                if (window.globalUserResources.PrimArrow) 
                    primArrowCount = Math.max(primArrowCount, parseInt(window.globalUserResources.PrimArrow));
                if (window.globalUserResources.primarrow) 
                    primArrowCount = Math.max(primArrowCount, parseInt(window.globalUserResources.primarrow));
                if (window.globalUserResources.primarrows) 
                    primArrowCount = Math.max(primArrowCount, parseInt(window.globalUserResources.primarrows));
            }
            
            // Проверяем экипированные стрелы (НЕ переопределяем количество, только проверяем наличие)
            let hasEquippedArrows = false;
            if (window.equippedItems && window.equippedItems.weapon2) {
                if (window.equippedItems.weapon2 === 'primarrows' || window.equippedItems.weapon2 === 'primarrow' || window.equippedItems.weapon2 === 'PrimArrow' ||
                    window.equippedItems.weapon2 === 'arrow' || window.equippedItems.weapon2 === 'Arrow') {
                    hasEquippedArrows = true;
                    console.log('[ManualGather] Найдены экипированные стрелы:', window.equippedItems.weapon2);
                }
            }
            
            console.log('[ManualGather] Проверка стрел:', {arrowCount, primArrowCount});
            
            const totalArrows = arrowCount + primArrowCount;
            console.log('[ManualGather] Проверка стрел для охоты - в инвентаре:', totalArrows, 'экипированы стрелы:', hasEquippedArrows);
            
            // Если нет стрел в инвентаре, но есть экипированные стрелы, считаем что есть минимум 2 стрелы
            // (но только если действительно экипированы стрелы)
            const effectiveArrowCount = totalArrows === 0 && hasEquippedArrows ? 2 : totalArrows;
            
            console.log('[ManualGather] Эффективное количество стрел:', effectiveArrowCount);
            return { hasEnough: effectiveArrowCount >= 2, count: effectiveArrowCount }; // Требуется минимум 2 стрелы
        } catch (error) {
            console.error('[ManualGather] Ошибка при проверке стрел:', error);
            return { hasEnough: false, count: 0 };
        }
    };

    // Функция для выбора ресурса на основе взвешенных шансов
    const selectResourceByChance = (gatherType) => {
        const chances = resourceChancesByType[gatherType] || resourceChancesByType.gather;
        const random = Math.floor(Math.random() * 100) + 1;
        let accumulatedChance = 0;
        
        for (const [resource, chance] of Object.entries(chances)) {
            accumulatedChance += chance;
            if (random <= accumulatedChance) {
                return resource;
            }
        }
        
        // Если ресурс не выбран (не должно случиться), возвращаем первый доступный
        const resources = resourcesByType[gatherType] || resourcesByType.gather;
        return resources[0];
    };

    // Начало игры
    const startGame = async () => {
        console.log('[ManualGather] startGame вызван');
        // Проверяем, активна ли уже игра
        if (gameState.isActive) {
            console.warn('[ManualGather] Игра уже активна');
            return;
        }

        // Проверяем стамину
        if (window.StaminaModule && !window.StaminaModule.hasEnough(1)) {
            showInfoMessage('Not enough stamina to start the game!');
            return;
        }
        
        // Для охоты проверяем наличие стрел
        if (gameState.gatherType === 'hunt') {
            const arrowCheck = await checkArrowsForHunt();
            console.log('[ManualGather] Результат проверки стрел в startGame:', arrowCheck);
            
            if (!arrowCheck.hasEnough) {
                console.log('[ManualGather] Недостаточно стрел для начала игры, показываем модальное окно');
                showArrowWarningModal(arrowCheck.count);
                return;
            }
            // Сохраняем начальное количество стрел для логирования
            gameState.initialArrowCount = arrowCheck.count;
            console.log('[ManualGather] Стрел достаточно, начальное количество:', gameState.initialArrowCount);
        }

        // Устанавливаем начальное состояние
        gameState.isActive = true;
        gameState.seconds = GAME_DURATION;
        gameState.points = 0;
        gameState.startTime = Date.now(); // Записываем время начала для логирования
        gameState.collectedResources = []; // Очищаем собранные ресурсы
        gameState.usedArrows = 0; // Очищаем счетчик использованных стрел
        console.log('[ManualGather] Игра запущена, таймер:', GAME_DURATION);

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
        updateGameUI();

        // Запускаем таймер
        gameState.gameTimer = setInterval(() => {
            gameState.seconds--;
            updateGameUI();
            console.log('[ManualGather] Таймер:', gameState.seconds);
            if (gameState.seconds <= 0) {
                endGame();
            }
        }, 1000);

        // Запускаем интервальную систему создания ресурсов
        startResourceInterval();
        console.log('[ManualGather] Интервальная система ресурсов запущена');
    };

    // Сбор ресурса (клик по ресурсу)
    const collectResource = async (resourceElement) => {
        console.log('[ManualGather] collectResource вызван');
        
        // Проверяем, не был ли уже собран этот ресурс
        if (!resourceElement || !resourceElement.parentNode || resourceElement.dataset.collected === 'true') {
            console.log('[ManualGather] Ресурс уже был собран или удален, пропускаем');
            return;
        }
        
        // Проверяем ID ресурса
        const resourceId = resourceElement.getAttribute('data-resource-id');
        if (!resourceId || resourceId !== gameState.currentResourceId) {
            console.log('[ManualGather] Неправильный ID ресурса, пропускаем');
            return;
        }
        
        // Помечаем ресурс как собранный чтобы предотвратить повторные клики
        resourceElement.dataset.collected = 'true';
        
        // Проверяем стамину
        if (window.StaminaModule && !window.StaminaModule.hasEnough(STAMINA_COST)) {
            console.warn('[ManualGather] Нет стамины для сбора');
            endGame('No stamina left!');
            return;
        }

        // Получаем тип собранного ресурса и добавляем в список
        const resourceType = resourceElement.getAttribute('data-resource-type');
        if (resourceType) {
            gameState.collectedResources.push(resourceType);
            console.log('[ManualGather] Собран ресурс:', resourceType);
        }

        // Увеличиваем очки ПЕРЕД уменьшением стамины
        gameState.points++;
        updateGameUI();
        console.log('[ManualGather] Очки:', gameState.points);

        // Уменьшаем стамину
        if (window.StaminaModule) {
            try {
                console.log('[ManualGather] Попытка уменьшить стамину на', STAMINA_COST);
                const result = await window.StaminaModule.decrease(STAMINA_COST);
                console.log('[ManualGather] Результат уменьшения стамины:', result);
                
                if (result.success) {
                    // Обновляем отображение
                    window.StaminaModule.renderBar('game-stamina-container');
                    updateStaminaValue();
                    
                    // Проверяем стамину из результата сервера, а не из кэша
                    const currentStamina = result.currentStamina;
                    console.log('[ManualGather] Текущая стамина после уменьшения:', currentStamina);
                    
                    if (currentStamina <= 0) {
                        console.warn('[ManualGather] Стамина закончилась, завершаем игру');
                        endGame('No stamina left!');
                        return;
                    }
                    
                    console.log('[ManualGather] Ресурс собран, стамина -1, осталось:', currentStamina);
                } else {
                    console.error('[ManualGather] Ошибка уменьшения стамины:', result.error);
                    if (result.error && result.error.includes('Insufficient stamina')) {
                        endGame('No stamina left!');
                        return;
                    }
                }
            } catch (error) {
                console.error('[ManualGather] Ошибка при уменьшении стамины:', error);
            }
        }

        // Удаляем собранный ресурс и обнуляем состояние
        if (resourceElement) {
            resourceElement.remove();
        }
        gameState.resourceElement = null;
        gameState.currentResourceId = null;
        
        // Снимаем блокировку создания ресурсов
        gameState.isCreatingResource = false;

        // Очищаем предыдущий таймер ресурса (если есть)
        if (gameState.resourceTimer) {
            clearTimeout(gameState.resourceTimer);
            gameState.resourceTimer = null;
        }

        // Следующий ресурс будет создан автоматически интервальным таймером
        console.log('[ManualGather] Ресурс собран, следующий будет создан интервальным таймером');
    };

    // Обновление игрового интерфейса
    const updateGameUI = () => {
        // Обновляем таймер
        const gameTimer = document.getElementById('game-timer');
        if (gameTimer) {
            gameTimer.innerText = formatTime(gameState.seconds);
        }
        
        // Обновляем очки
        const gamePoints = document.getElementById('game-points');
        if (gamePoints) {
            gamePoints.innerText = `Points: ${gameState.points}`;
        }
        
        // Обновляем стандартные элементы (для совместимости)
        updatePointsDisplay();
        updateTimerDisplay();
        updateStaminaValue();
    };

    // Обновление отображения таймера
    const updateTimerDisplay = () => {
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            timerDisplay.innerText = formatTime(gameState.seconds);
        }
    };

    // Обновление отображения очков
    const updatePointsDisplay = () => {
        const pointsDisplay = document.getElementById('points-display');
        if (pointsDisplay) {
            pointsDisplay.innerText = `Points: ${gameState.points}`;
        }
    };

    // Обновление значения стамины
    const updateStaminaValue = () => {
        const staminaValue = document.getElementById('game-stamina-value');
        if (staminaValue && window.StaminaModule) {
            const { currentStamina, maxStamina } = window.StaminaModule.get();
            staminaValue.innerText = `${currentStamina}/${maxStamina}`;
        }
    };

    // Добавляем функцию для обновления числового значения стамины на инфопанели
    const updateInfoStaminaValue = () => {
        const staminaValueElement = document.getElementById('info-stamina-value');
        if (staminaValueElement && window.StaminaModule) {
            const { currentStamina, maxStamina } = window.StaminaModule.get();
            staminaValueElement.innerText = `${currentStamina}/${maxStamina}`;
        }
    };

    // Форматирование времени (секунды -> MM:SS)
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Закрытие игры
    const closeGame = () => {
        console.log('[ManualGather] closeGame вызван');
        
        // Логируем отмену сессии, если игра была активна
        if (gameState.isActive && gameState.startTime) {
            const timeSpent = Math.floor((Date.now() - gameState.startTime) / 1000);
            // Асинхронный вызов логирования, но не ждем его завершения
            logInteractiveSession('Canceled', timeSpent, gameState.collectedResources)
                .catch(error => console.error('[ManualGather] Ошибка при логировании отмены:', error));
        }
        
        // Останавливаем игру и очищаем таймеры
        gameState.isActive = false;
        gameState.isCreatingResource = false; // Сбрасываем флаг блокировки
        if (gameState.gameTimer) {
            clearInterval(gameState.gameTimer);
            gameState.gameTimer = null;
        }
        if (gameState.resourceTimer) {
            clearTimeout(gameState.resourceTimer);
            gameState.resourceTimer = null;
        }
        
        // Останавливаем интервальный таймер ресурсов
        stopResourceInterval();
        
        // Находим и удаляем контейнер игры
        const container = document.getElementById('manual-gather-container');
        if (container) {
            container.remove();
            console.log('[ManualGather] контейнер удален');
        } else {
            console.warn('[ManualGather] контейнер manual-gather-container не найден');
        }
        
        // Восстанавливаем отображение контейнера gathering-page
        const gatheringPage = document.querySelector('.gathering-page.futuristic-gathering');
        if (gatheringPage) {
            gatheringPage.style.display = '';
            console.log('[ManualGather] gathering-page восстановлен');
        } else {
            console.warn('[ManualGather] gathering-page не найден для восстановления');
        }
    };

    // Завершение игры
    const endGame = (message = null) => {
        console.log('[ManualGather] endGame вызван', message);
        // Останавливаем игру
        gameState.isActive = false;
        gameState.isCreatingResource = false; // Сбрасываем флаг блокировки

        // Очищаем таймеры
        if (gameState.gameTimer) {
            clearInterval(gameState.gameTimer);
            gameState.gameTimer = null;
        }

        if (gameState.resourceTimer) {
            clearTimeout(gameState.resourceTimer);
            gameState.resourceTimer = null;
        }
        
        // Останавливаем интервальный таймер ресурсов
        stopResourceInterval();

        // Удаляем ресурс, если он есть
        if (gameState.resourceElement) {
            gameState.resourceElement.remove();
            gameState.resourceElement = null;
        }

        // Восстанавливаем отображение info-panel и затемненный фон
        const infoPanel = document.getElementById('info-panel');
        const overlay = document.querySelector('.manual-gather-overlay');
        const gameTopPanel = document.getElementById('game-top-panel');
        
        if (infoPanel) {
            // Очищаем все содержимое панели перед добавлением новых элементов
            infoPanel.innerHTML = '';
            infoPanel.style.display = 'block';
        }
        
        if (overlay) {
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        }
        
        if (gameTopPanel) {
            gameTopPanel.style.display = 'none';
        }

        // Показываем результат
        let resultMessage = '';
        let reward = [];

        if (message && message.includes('No stamina left')) {
            resultMessage = `Game over! No <span class="stamina-text">stamina</span> left. You collected <span class="points-text">${gameState.points} points</span>.`;
            
            // Определяем награду в зависимости от количества очков, даже если стамина закончилась
            if (gameState.points >= MIN_REWARD_POINTS) {
                if (gameState.points >= 10) {
                    // Две награды для 10+ очков
                    reward.push(selectResourceByChance(gameState.gatherType));
                    reward.push(selectResourceByChance(gameState.gatherType));
                    resultMessage += `\nYou earned <span class="resources-text">2 resources</span>: <span class="resources-text">${reward.join(', ')}</span>!`;
                } else {
                    // Одна награда для 5-9 очков
                    reward.push(selectResourceByChance(gameState.gatherType));
                    resultMessage += `\nYou earned <span class="resources-text">1 resource</span>: <span class="resources-text">${reward[0]}</span>!`;
                }
            } else {
                resultMessage += `\nYou need at least <span class="points-text">${MIN_REWARD_POINTS} points</span> to earn resources.`;
            }
        } else if (message) {
            resultMessage = message;
        } else {
            resultMessage = `Game over! You collected <span class="points-text">${gameState.points} points</span>.`;
            
            // Определяем награду в зависимости от количества очков
            if (gameState.points >= MIN_REWARD_POINTS) {
                
                if (gameState.points >= 10) {
                    // Две награды для 10+ очков
                    reward.push(selectResourceByChance(gameState.gatherType));
                    reward.push(selectResourceByChance(gameState.gatherType));
                    resultMessage += `\nYou earned <span class="resources-text">2 resources</span>: <span class="resources-text">${reward.join(', ')}</span>!`;
                } else {
                    // Одна награда для 5-9 очков
                    reward.push(selectResourceByChance(gameState.gatherType));
                    resultMessage += `\nYou earned <span class="resources-text">1 resource</span>: <span class="resources-text">${reward[0]}</span>!`;
                }
            } else {
                resultMessage += `\nYou need at least <span class="points-text">${MIN_REWARD_POINTS} points</span> to earn resources.`;
            }
        }

        // Создаем сообщение напрямую вместо использования showInfoMessage
        const messageElement = document.createElement('div');
        messageElement.className = 'info-message';
        messageElement.innerHTML = resultMessage;
        messageElement.style.margin = '15px 0';
        messageElement.style.padding = '12px';
        messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageElement.style.border = '1px solid rgba(0, 255, 255, 0.4)';
        messageElement.style.borderRadius = '8px';
        messageElement.style.color = '#ffffff';
        messageElement.style.fontSize = '18px';
        messageElement.style.fontWeight = 'bold';
        messageElement.style.textShadow = '0 0 5px rgba(0, 255, 255, 0.5)';
        messageElement.style.lineHeight = '1.5';
        messageElement.style.whiteSpace = 'pre-line';
        
        if (infoPanel) {
            infoPanel.appendChild(messageElement);
        }
        
        console.log('[ManualGather] Сообщение о конце игры добавлено');

        // Добавляем кнопки для конца игры
        if (infoPanel) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';
            
            // Кнопка Claim для получения награды (показываем только её, если есть награды)
            if (reward.length > 0) {
                const claimBtn = document.createElement('button');
                claimBtn.className = 'gathering-button futuristic';
                claimBtn.innerText = 'Claim';
                claimBtn.style.margin = '5px';
                claimBtn.style.padding = '10px 20px';
                claimBtn.style.fontSize = '16px';
                claimBtn.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                claimBtn.style.border = '1px solid #00fff7';
                claimBtn.style.borderRadius = '4px';
                claimBtn.style.color = '#00fff7';
                claimBtn.style.cursor = 'pointer';
                claimBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    
                    // Блокируем кнопку во время обработки
                    claimBtn.disabled = true;
                    claimBtn.innerText = 'Processing...';
                    
                    try {
                        // Добавляем ресурсы в инвентарь
                        await addResourcesToInventory(reward);
                        
                        // Если это охота, списываем стрелы
                        if (gameState.gatherType === 'hunt' && reward.length > 0) {
                            console.log(`[ManualGather] Интерактивная охота: списываем ${reward.length} стрел за ${reward.length} ресурсов`);
                            console.log('[ManualGather] Тип сбора:', gameState.gatherType, 'Награды:', reward);
                            
                            // Обновляем счетчик использованных стрел
                            gameState.usedArrows += reward.length;
                            
                            await updateArrowsInDatabase(reward.length);
                            
                            // Отправляем события обновления инвентаря после обновления стрел
                            window.dispatchEvent(new CustomEvent('resourcesUpdated', { 
                                detail: { timestamp: Date.now() } 
                            }));
                            window.dispatchEvent(new CustomEvent('inventory-update', { 
                                detail: { timestamp: Date.now() } 
                            }));
                        }
                        
                        // Логируем успешную сессию с полученными наградами
                        if (gameState.startTime) {
                            const timeSpent = Math.floor((Date.now() - gameState.startTime) / 1000);
                            // Для охоты добавляем информацию о стрелах в лог
                            if (gameState.gatherType === 'hunt' && reward.length > 0) {
                                await logInteractiveSession(`Claimed (${reward.length} arrows used)`, timeSpent, reward);
                            } else {
                                await logInteractiveSession('Claimed', timeSpent, reward);
                            }
                        }
                        
                        // Сообщаем пользователю об успешном сохранении
                        if (gameState.gatherType === 'hunt' && reward.length > 0) {
                            messageElement.innerHTML = `Resources successfully added to your inventory! <span class="arrows-text">${reward.length} arrows</span> were used.`;
                        } else {
                            messageElement.innerText = 'Resources successfully added to your inventory!';
                        }
                        
                        // Удаляем всю кнопочную панель после успешного сохранения
                        buttonContainer.remove();
                        
                        // Добавляем кнопку Close для закрытия модального окна
                        const closeBtn = document.createElement('button');
                        closeBtn.className = 'gathering-button futuristic';
                        closeBtn.innerText = 'Close';
                        closeBtn.style.margin = '15px auto 5px auto';
                        closeBtn.style.padding = '10px 20px';
                        closeBtn.style.fontSize = '16px';
                        closeBtn.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                        closeBtn.style.border = '1px solid #00fff7';
                        closeBtn.style.borderRadius = '4px';
                        closeBtn.style.color = '#00fff7';
                        closeBtn.style.cursor = 'pointer';
                        closeBtn.style.display = 'block';
                        closeBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            closeGame();
                        });
                        
                        // Добавляем кнопку Close в infoPanel
                        if (infoPanel) {
                            infoPanel.appendChild(closeBtn);
                        }
                    } catch (error) {
                        console.error('[ManualGather] Ошибка при сохранении ресурсов:', error);
                        messageElement.innerText = 'Error saving resources. Please try again.';
                        
                        // Разблокируем кнопку в случае ошибки
                        claimBtn.disabled = false;
                        claimBtn.innerText = 'Claim';
                    }
                });
                
                buttonContainer.appendChild(claimBtn);
                
                // Добавляем контейнер с кнопкой Claim в панель
                infoPanel.appendChild(buttonContainer);
                
                console.log('[ManualGather] Добавлена только кнопка Claim');
            } else {
                // Если нет наград, показываем кнопки Play Again и Back
                
                // Кнопка "Играть снова"
                const playAgainBtn = document.createElement('button');
                playAgainBtn.className = 'gathering-button futuristic';
                playAgainBtn.innerText = 'Play Again';
                playAgainBtn.style.margin = '5px';
                playAgainBtn.style.padding = '10px 20px';
                playAgainBtn.style.fontSize = '16px';
                playAgainBtn.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                playAgainBtn.style.border = '1px solid #00fff7';
                playAgainBtn.style.borderRadius = '4px';
                playAgainBtn.style.color = '#00fff7';
                playAgainBtn.style.cursor = 'pointer';
                playAgainBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    
                    // Проверяем стамину
                    if (window.StaminaModule && !window.StaminaModule.hasEnough(1)) {
                        // Создаем сообщение о недостатке стамины
                        messageElement.innerHTML = `Not enough <span class="stamina-text">stamina</span> to start the game!`;
                        return;
                    }
                    
                    // Для охоты проверяем наличие стрел
                    if (gameState.gatherType === 'hunt') {
                        const arrowCheck = await checkArrowsForHunt();
                        console.log('[ManualGather] Результат проверки стрел в Play Again:', arrowCheck);
                        
                        if (!arrowCheck.hasEnough) {
                            console.log('[ManualGather] Недостаточно стрел для перезапуска игры');
                            showArrowWarningModal(arrowCheck.count);
                            return;
                        }
                        // Сохраняем начальное количество стрел для логирования
                        gameState.initialArrowCount = arrowCheck.count;
                    }
                    
                    // Удаляем контейнер с кнопками
                    buttonContainer.remove();
                    // Перезапускаем игру
                    await startGame();
                });
                
                // Добавляем кнопку возврата на основную страницу
                const backBtn = document.createElement('button');
                backBtn.className = 'gathering-button futuristic cancel';
                backBtn.innerText = 'Back';
                backBtn.style.margin = '5px';
                backBtn.style.padding = '10px 20px';
                backBtn.style.fontSize = '16px';
                backBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
                backBtn.style.border = '1px solid #ff3333';
                backBtn.style.borderRadius = '4px';
                backBtn.style.color = '#ff3333';
                backBtn.style.cursor = 'pointer';
                backBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    
                    // Логируем сессию, если не было клейма ресурсов
                    if (gameState.startTime && reward.length === 0) {
                        const timeSpent = Math.floor((Date.now() - gameState.startTime) / 1000);
                        await logInteractiveSession('Completed without claim', timeSpent, gameState.collectedResources);
                    }
                    
                    // Закрываем игру (удаляем контейнер и восстанавливаем интерфейс)
                    closeGame();
                });
                
                // Добавляем кнопки в контейнер в правильном порядке
                buttonContainer.appendChild(playAgainBtn);
                buttonContainer.appendChild(backBtn);
                
                // Добавляем контейнер с кнопками в панель
                infoPanel.appendChild(buttonContainer);
                
                console.log('[ManualGather] Кнопки добавлены: Play Again, Back');
            }
        }
    };

    // Функция логирования интерактивной сессии сбора
    const logInteractiveSession = async (endMethod, timeSpent, collectedResources) => {
        try {
            const telegramId = localStorage.getItem('telegramId');
            if (!telegramId) {
                console.warn('[ManualGather] telegramId не найден для логирования');
                return;
            }
            
            const hours = Math.floor(timeSpent / 3600);
            const minutes = Math.floor((timeSpent % 3600) / 60);
            const seconds = Math.floor(timeSpent % 60);
            const formattedTimeSpent = `${hours}h ${minutes}m ${seconds}s`;
            
            // Подготавливаем ресурсы для логирования
            const resourcesToLog = {};
            collectedResources.forEach(resource => {
                if (resourcesToLog[resource]) {
                    resourcesToLog[resource]++;
                } else {
                    resourcesToLog[resource] = 1;
                }
            });
            
            // Формируем детальную информацию о стрелах (только для охоты)
            let arrowsDetails = '';
            if (gameState.gatherType === 'hunt') {
                const currentArrows = gameState.initialArrowCount - gameState.usedArrows;
                arrowsDetails = ` | Arrows: ${gameState.initialArrowCount} initial → ${gameState.usedArrows} used → ${Math.max(0, currentArrows)} remaining`;
            }
            
            const logData = {
                telegramId,
                startTime: new Date((Date.now() - timeSpent * 1000)).toISOString(),
                endTime: new Date().toISOString(),
                resources: JSON.stringify(resourcesToLog),
                endMethod: `[INTERACTIVE] ${endMethod} (${formattedTimeSpent})${arrowsDetails}`
            };
            
            console.log('[ManualGather] Отправляем данные для логирования:', logData);
            
            const response = await fetch(`rpg.php?action=logGatheringSession&t=${Date.now()}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                body: JSON.stringify(logData)
            });
            
            const data = await response.json();
            if (data.success) {
                console.log('[ManualGather] Информация об интерактивной сессии успешно записана в лог');
            } else {
                console.error('[ManualGather] Ошибка при записи информации об интерактивной сессии в лог:', data.message);
            }
        } catch (error) {
            console.error('[ManualGather] Ошибка при логировании интерактивной сессии:', error);
        }
    };

    // Функция для обновления стрел в БД (аналогично hunt.js)
    const updateArrowsInDatabase = async (arrowsToRemove) => {
        try {
            const telegramId = localStorage.getItem('telegramId');
            if (!telegramId) {
                console.warn('[ManualGather] telegramId не найден для обновления стрел');
                return;
            }
            
            console.log('[ManualGather] Обновляем стрелы в БД, списываем:', arrowsToRemove);
            
            // Определяем тип стрел для списания (приоритет: обычные стрелы, затем примитивные)
            let arrowType = 'arrow'; // По умолчанию обычные стрелы
            
            // Проверяем, какие стрелы доступны
            if (window.globalUserResources) {
                if (window.globalUserResources.Arrow > 0 || window.globalUserResources.arrow > 0) {
                    arrowType = 'arrow';
                } else if (window.globalUserResources.PrimArrow > 0 || window.globalUserResources.primarrow > 0 || window.globalUserResources.primarrows > 0) {
                    arrowType = 'primarrows';
                }
            }
            
            // Проверяем экипированные стрелы
            if (window.equippedItems && window.equippedItems.weapon2) {
                if (window.equippedItems.weapon2 === 'arrow' || window.equippedItems.weapon2 === 'Arrow') {
                    arrowType = 'arrow';
                } else if (window.equippedItems.weapon2 === 'primarrows' || window.equippedItems.weapon2 === 'primarrow' || window.equippedItems.weapon2 === 'PrimArrow') {
                    arrowType = 'primarrows';
                }
            }
            
            console.log(`[ManualGather] Списываем ${arrowsToRemove} стрел типа ${arrowType}`);
            
            // Отправляем запрос на обновление стрел
            try {
                const response = await fetch(`rpg.php?action=updateUserInventoryItem&t=${Date.now()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        telegramId,
                        itemId: arrowType,
                        quantity: -arrowsToRemove,
                        operation: 'add'
                    })
                });
                
                if (!response.ok) {
                    console.error(`[ManualGather] Ошибка при обновлении стрел ${arrowType} в БД: ${response.status}`);
                    
                    // Попробуем альтернативный формат через updateUserInventory
                    try {
                        const alternativeResponse = await fetch(`rpg.php?action=updateUserInventory&t=${Date.now()}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                telegramId,
                                inventory: {
                                    [arrowType]: -arrowsToRemove
                                }
                            })
                        });
                        
                        if (alternativeResponse.ok) {
                            const data = await alternativeResponse.json();
                            console.log(`[ManualGather] Результат обновления стрел ${arrowType} через updateUserInventory:`, data);
                        } else {
                            throw new Error(`Альтернативный API также вернул ошибку: ${alternativeResponse.status}`);
                        }
                    } catch (altError) {
                        console.error(`[ManualGather] Ошибка при использовании updateUserInventory:`, altError);
                        
                        // Последняя попытка через updateResources
                        try {
                            const resourcesResponse = await fetch(`rpg.php?action=updateResources&t=${Date.now()}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    telegramId,
                                    resources: {
                                        [arrowType]: -arrowsToRemove
                                    }
                                })
                            });
                            
                            if (resourcesResponse.ok) {
                                const data = await resourcesResponse.json();
                                console.log(`[ManualGather] Результат обновления стрел ${arrowType} через updateResources:`, data);
                            } else {
                                console.error(`[ManualGather] Ошибка при использовании updateResources: ${resourcesResponse.status}`);
                            }
                        } catch (resourcesError) {
                            console.error(`[ManualGather] Все попытки обновления стрел в БД завершились неудачей:`, resourcesError);
                        }
                    }
                } else {
                    const data = await response.json();
                    console.log(`[ManualGather] Результат обновления стрел ${arrowType}:`, data);
                }
            } catch (error) {
                console.error(`[ManualGather] Ошибка при отправке запроса на обновление стрел ${arrowType}:`, error);
            }
            
            // Обновляем стрелы в локальных хранилищах
            await updateLocalArrows(arrowType, arrowsToRemove);
            
            // Дополнительные события для обновления UI
            window.dispatchEvent(new CustomEvent('resourcesUpdated', { 
                detail: { timestamp: Date.now() } 
            }));
            window.dispatchEvent(new CustomEvent('inventory-update', { 
                detail: { timestamp: Date.now() } 
            }));
            
            // Обновляем отображение инвентаря
            if (window.InventoryModule && typeof window.InventoryModule.refreshInventoryDisplay === 'function') {
                await window.InventoryModule.refreshInventoryDisplay();
                console.log('[ManualGather] Обновлено отображение инвентаря после списания стрел');
            }
            
        } catch (error) {
            console.error('[ManualGather] Ошибка при обновлении стрел в БД:', error);
        }
    };
    
    // Обновляем стрелы в локальных хранилищах (аналогично hunt.js)
    const updateLocalArrows = async (arrowType, count) => {
        try {
            // Обновляем в IndexedDB
            if (window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
                const inventory = await window.IndexedDBModule.getInventoryItems();
                let updatedInventory = [...inventory];
                
                const arrowIndex = updatedInventory.findIndex(i => 
                    i.id.toLowerCase() === arrowType.toLowerCase() || 
                    (arrowType === 'primarrows' && (i.id === 'PrimArrow' || i.id === 'primarrow')) ||
                    (arrowType === 'arrow' && i.id === 'Arrow')
                );
                
                if (arrowIndex !== -1) {
                    const currentQuantity = parseInt(updatedInventory[arrowIndex].quantity || updatedInventory[arrowIndex].qty || 0);
                    updatedInventory[arrowIndex].quantity = Math.max(0, currentQuantity - count);
                    
                    // Обновляем также поле qty для совместимости
                    if ('qty' in updatedInventory[arrowIndex]) {
                        updatedInventory[arrowIndex].qty = updatedInventory[arrowIndex].quantity;
                    }
                    
                    console.log(`[ManualGather] Обновлено количество стрел ${arrowType} в IndexedDB: -${count}, осталось ${updatedInventory[arrowIndex].quantity}`);
                    
                    if (updatedInventory[arrowIndex].quantity === 0) {
                        updatedInventory.splice(arrowIndex, 1);
                    }
                }
                
                // Обновляем IndexedDB через updateInventoryItem
                if (window.IndexedDBModule && typeof window.IndexedDBModule.updateInventoryItem === 'function') {
                    // Обновляем конкретный предмет
                    if (arrowIndex !== -1) {
                        await window.IndexedDBModule.updateInventoryItem(updatedInventory[arrowIndex].id, updatedInventory[arrowIndex].quantity);
                        console.log(`[ManualGather] Обновлен предмет ${updatedInventory[arrowIndex].id} в IndexedDB`);
                    }
                } else if (window.IndexedDBModule && typeof window.IndexedDBModule.updateUserInventory === 'function') {
                    // Обновляем весь инвентарь
                    await window.IndexedDBModule.updateUserInventory(updatedInventory);
                    console.log('[ManualGather] Обновлен инвентарь в IndexedDB');
                } else {
                    console.warn('[ManualGather] Нет доступных методов для обновления IndexedDB');
                }
                
                // Дополнительная попытка обновления через прямое обращение к IndexedDB
                try {
                    const dbName = 'rpgDatabase';
                    const storeName = 'inventory';
                    
                    if (window.indexedDB && arrowIndex !== -1) {
                        const openRequest = indexedDB.open(dbName);
                        
                        openRequest.onsuccess = function(event) {
                            const db = event.target.result;
                            
                            if (db.objectStoreNames && Array.from(db.objectStoreNames).includes(storeName)) {
                                const transaction = db.transaction([storeName], 'readwrite');
                                const store = transaction.objectStore(storeName);
                                
                                // Обновляем конкретный предмет
                                const item = updatedInventory[arrowIndex];
                                if (item.quantity > 0) {
                                    store.put(item);
                                    console.log(`[ManualGather] Прямое обновление IndexedDB для ${item.id}, количество: ${item.quantity}`);
                                } else {
                                    // Удаляем предмет, если количество 0
                                    store.delete(item.id);
                                    console.log(`[ManualGather] Прямое удаление ${item.id} из IndexedDB`);
                                }
                                
                                transaction.oncomplete = function() {
                                    db.close();
                                    console.log('[ManualGather] Прямое обновление IndexedDB завершено');
                                };
                            }
                        };
                    }
                } catch (dbError) {
                    console.error('[ManualGather] Ошибка при прямом обновлении IndexedDB:', dbError);
                }
            }
            
            // Обновляем глобальные ресурсы
            if (window.globalUserResources) {
                // Обновляем все варианты названий стрел
                const arrowVariants = ['arrow', 'Arrow', 'primarrows', 'primarrow', 'PrimArrow'];
                
                for (const variant of arrowVariants) {
                    if (window.globalUserResources[variant] && 
                       ((arrowType === 'arrow' && (variant === 'arrow' || variant === 'Arrow')) || 
                        (arrowType === 'primarrows' && (variant === 'primarrows' || variant === 'primarrow' || variant === 'PrimArrow')))) {
                        
                        window.globalUserResources[variant] = Math.max(0, parseInt(window.globalUserResources[variant]) - count);
                        console.log(`[ManualGather] Обновлено количество стрел ${variant} в глобальных ресурсах: -${count}, осталось ${window.globalUserResources[variant]}`);
                    }
                }
                
                // Обновляем UI, если есть функция обновления
                if (typeof window.updateResourcesUI === 'function') {
                    try {
                        window.updateResourcesUI();
                    } catch (uiError) {
                        console.error('[ManualGather] Ошибка при обновлении UI:', uiError);
                    }
                }
            }
            
            // Обновляем данные в localStorage для инвентаря
            try {
                const telegramId = localStorage.getItem('telegramId');
                const inventoryKey = `inventory_${telegramId}`;
                const storedInventory = localStorage.getItem(inventoryKey);
                
                if (storedInventory) {
                    let inventory;
                    try {
                        inventory = JSON.parse(storedInventory);
                    } catch (parseError) {
                        console.error('[ManualGather] Ошибка при парсинге инвентаря:', parseError);
                        return;
                    }
                    
                    // Обновляем все варианты стрел
                    if (arrowType === 'arrow') {
                        if (inventory.Arrow) inventory.Arrow = Math.max(0, parseInt(inventory.Arrow) - count);
                        if (inventory.arrow) inventory.arrow = Math.max(0, parseInt(inventory.arrow) - count);
                    } else if (arrowType === 'primarrows') {
                        if (inventory.PrimArrow) inventory.PrimArrow = Math.max(0, parseInt(inventory.PrimArrow) - count);
                        if (inventory.primarrow) inventory.primarrow = Math.max(0, parseInt(inventory.primarrow) - count);
                        if (inventory.primarrows) inventory.primarrows = Math.max(0, parseInt(inventory.primarrows) - count);
                    }
                    
                    try {
                        localStorage.setItem(inventoryKey, JSON.stringify(inventory));
                        console.log('[ManualGather] Обновлен инвентарь в localStorage');
                    } catch (setError) {
                        console.error('[ManualGather] Ошибка при сохранении инвентаря в localStorage:', setError);
                    }
                }
            } catch (localError) {
                console.error('[ManualGather] Ошибка при обновлении инвентаря в localStorage:', localError);
            }
            
        } catch (error) {
            console.error('[ManualGather] Ошибка при обновлении локальных стрел:', error);
        }
    };

    // Добавление ресурсов в инвентарь с использованием логики автоматического сбора
    const addResourcesToInventory = async (resources) => {
        try {
            console.log('[ManualGather] Начинаем сохранение ресурсов:', resources);
            
            // Получаем telegramId
            const telegramId = localStorage.getItem('telegramId');
            if (!telegramId) {
                console.error('[ManualGather] telegramId не найден!');
                return;
            }
            
            // Подготавливаем ресурсы в правильном формате
            const resourcesToSave = {};
            resources.forEach(resource => {
                if (resourcesToSave[resource]) {
                    resourcesToSave[resource]++;
                } else {
                    resourcesToSave[resource] = 1;
                }
            });
            
            console.log('[ManualGather] Подготовленные ресурсы для сохранения:', resourcesToSave);
            
            // Обновляем глобальные ресурсы
            if (window.globalUserResources) {
                Object.entries(resourcesToSave).forEach(([resource, amount]) => {
                    if (window.globalUserResources[resource]) {
                        window.globalUserResources[resource] += amount;
                    } else {
                        window.globalUserResources[resource] = amount;
                    }
                });
            }
            
            // Сохраняем ресурсы на сервер (как в автоматическом сборе)
            const response = await fetch(`rpg.php?action=updateResources&t=${Date.now()}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                body: JSON.stringify({ 
                    telegramId,
                    resources: resourcesToSave,
                    resourcesClaimed: Object.values(resourcesToSave).reduce((sum, val) => sum + val, 0)
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('[ManualGather] Ресурсы успешно сохранены на сервер!');
                
                // Синхронизируем с IndexedDB (как в автоматическом сборе)
                if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
                    await window.ModalModule.syncResourcesWithIndexedDB();
                } else if (window.syncResourcesWithIndexedDB) {
                    await window.syncResourcesWithIndexedDB();
                }
                
                // Отправляем события обновления инвентаря (как в автоматическом сборе)
                window.dispatchEvent(new CustomEvent('resourcesUpdated', { 
                    detail: { timestamp: Date.now() } 
                }));
                window.dispatchEvent(new CustomEvent('inventory-update', { 
                    detail: { timestamp: Date.now() } 
                }));
                
                // Обновляем отображение инвентаря (как в автоматическом сборе)
                if (window.InventoryModule && typeof window.InventoryModule.refreshInventoryDisplay === 'function') {
                    await window.InventoryModule.refreshInventoryDisplay();
                }
                
                console.log('[ManualGather] Ресурсы успешно добавлены в инвентарь!');
            } else {
                console.error('[ManualGather] Ошибка при сохранении ресурсов на сервер:', data.message);
            }
            
        } catch (error) {
            console.error('[ManualGather] Ошибка при сохранении ресурсов:', error);
        }
    };

    // Добавление стилей для игры
    const addStyles = () => {
        const style = document.createElement('style');
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
                color: #ffffff;
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
            
            .resource-item.clickable {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.5);
                border-radius: 50%;
                border: 2px solid #00fff7;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                animation: pulse 1s infinite alternate;
                z-index: 10001;
                position: absolute;
            }
            
            .resource-item.clickable:hover {
                transform: scale(1.1);
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
            }
            
            .resource-item.clickable img {
                max-width: 100%;
                max-height: 100%;
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
            
            .stamina-text {
                display: inline !important;
                color: #00bfff !important;
                font-weight: bold !important;
                font-size: inherit !important;
                line-height: inherit !important;
                vertical-align: baseline !important;
            }
            
            .arrows-text {
                display: inline !important;
                color: #ffa500 !important;
                text-shadow: 0 0 8px rgba(255, 165, 0, 0.8) !important;
                font-weight: bold !important;
                font-size: inherit !important;
                line-height: inherit !important;
                vertical-align: baseline !important;
            }
            
            .resources-text {
                display: inline !important;
                color: #32cd32 !important;
                text-shadow: 0 0 8px rgba(50, 205, 50, 0.8) !important;
                font-weight: bold !important;
                font-size: inherit !important;
                line-height: inherit !important;
                vertical-align: baseline !important;
            }
            
            .points-text {
                display: inline !important;
                color: #ffff00 !important;
                text-shadow: 0 0 8px rgba(255, 255, 0, 0.8) !important;
                font-weight: bold !important;
                font-size: inherit !important;
                line-height: inherit !important;
                vertical-align: baseline !important;
            }
            
            .info-message .stamina-text {
                display: inline !important;
                position: static !important;
                float: none !important;
                transform: none !important;
                color: #00bfff !important;
                font-weight: bold !important;
                font-size: inherit !important;
                line-height: inherit !important;
                vertical-align: baseline !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                background: transparent !important;
                z-index: auto !important;
            }
            
            .info-message .arrows-text {
                display: inline !important;
                position: static !important;
                float: none !important;
                transform: none !important;
                color: #ffa500 !important;
                text-shadow: 0 0 8px rgba(255, 165, 0, 0.8) !important;
                font-weight: bold !important;
                font-size: inherit !important;
                line-height: inherit !important;
                vertical-align: baseline !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                background: transparent !important;
                z-index: auto !important;
            }
            
            .info-message .resources-text {
                display: inline !important;
                position: static !important;
                float: none !important;
                transform: none !important;
                color: #32cd32 !important;
                text-shadow: 0 0 8px rgba(50, 205, 50, 0.8) !important;
                font-weight: bold !important;
                font-size: inherit !important;
                line-height: inherit !important;
                vertical-align: baseline !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                background: transparent !important;
                z-index: auto !important;
            }
            
            .info-message .points-text {
                display: inline !important;
                position: static !important;
                float: none !important;
                transform: none !important;
                color: #ffff00 !important;
                text-shadow: 0 0 8px rgba(255, 255, 0, 0.8) !important;
                font-weight: bold !important;
                font-size: inherit !important;
                line-height: inherit !important;
                vertical-align: baseline !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                background: transparent !important;
                z-index: auto !important;
            }
        `;
        document.head.appendChild(style);
    };

    // Функция отладки для проверки состояния игры
    const debugGameState = () => {
        // Проверяем флаг isDebugging, чтобы можно было контролировать вывод
        if (!window.manualGatherDebugging) {
            return;
        }
        
        console.log('===== DEBUG GAME STATE =====');
        console.log('gameState:', JSON.stringify(gameState));
        console.log('overlay:', document.querySelector('.manual-gather-overlay'));
        console.log('info-panel:', document.getElementById('info-panel'));
        console.log('game-area:', document.getElementById('game-area'));
        console.log('resource-element:', gameState.resourceElement);
        console.log('===========================');
    };
    
    // Вместо постоянного интервала, делаем проверку при старте и завершении игры
    let debugInterval = null;
    
    // Включение/выключение отладки
    const toggleDebug = (enable) => {
        if (enable) {
            window.manualGatherDebugging = true;
            // Запускаем интервал только когда нужно
            if (!debugInterval) {
                debugInterval = setInterval(debugGameState, 3000);
                console.log('[ManualGather] Отладка включена');
            }
        } else {
            window.manualGatherDebugging = false;
            // Очищаем интервал когда отладка не нужна
            if (debugInterval) {
                clearInterval(debugInterval);
                debugInterval = null;
                console.log('[ManualGather] Отладка отключена');
            }
        }
    };
    
    // Создаем обёртки для функций с поддержкой отладки
    const wrappedStartGame = function() {
        startGame.apply(this, arguments);
        toggleDebug(true); // Включаем отладку при старте игры
    };
    
    const wrappedEndGame = function() {
        endGame.apply(this, arguments);
        toggleDebug(false); // Отключаем отладку при окончании игры
    };
    
    const wrappedCloseGame = function() {
        closeGame.apply(this, arguments);
        toggleDebug(false); // Отключаем отладку при закрытии игры
    };
    
    // Глобальная функция для немедленного запуска игры (можно вызвать из консоли)
    window.startManualGame = () => {
        console.log('[ManualGather] startManualGame вызван из консоли');
        startGame();
    };
    
    // Запуск интервального таймера для создания ресурсов
    const startResourceInterval = () => {
        console.log('[ManualGather] Запуск интервального таймера ресурсов');
        
        // Создаем первый ресурс сразу
        showNextResource();
        
        // Запускаем интервальный таймер для следующих ресурсов
        gameState.resourceIntervalTimer = setInterval(() => {
            if (gameState.isActive) {
                console.log('[ManualGather] Интервальный таймер: создание нового ресурса');
                showNextResource();
            }
        }, RESOURCE_DURATION * 1000);
    };

    // Остановка интервального таймера
    const stopResourceInterval = () => {
        if (gameState.resourceIntervalTimer) {
            clearInterval(gameState.resourceIntervalTimer);
            gameState.resourceIntervalTimer = null;
            console.log('[ManualGather] Интервальный таймер остановлен');
        }
    };
    
    // Централизованная функция для безопасного показа следующего ресурса
    // УДАЛЕНА - теперь используется интервальная система startResourceInterval()

    // Показ следующего ресурса
    const showNextResource = () => {
        if (!gameState.isActive) {
            console.warn('[ManualGather] showNextResource: игра не активна');
            return;
        }
        
        // Проверяем флаг блокировки создания ресурсов
        if (gameState.isCreatingResource) {
            console.log('[ManualGather] Уже идет создание ресурса, пропускаем');
            return;
        }
        
        // Проверяем, нет ли уже ресурса на экране
        if (gameState.resourceElement && gameState.resourceElement.parentNode) {
            console.log('[ManualGather] Ресурс уже есть на экране, удаляем старый');
            gameState.resourceElement.remove();
            gameState.resourceElement = null;
            gameState.currentResourceId = null;
        }
        
        // Дополнительная проверка - ищем любые существующие ресурсы на экране
        let gameArea = document.getElementById('game-area');
        if (gameArea) {
            const existingResources = gameArea.querySelectorAll('.resource-item');
            if (existingResources.length > 0) {
                console.log('[ManualGather] Найдены существующие ресурсы на экране:', existingResources.length);
                // Удаляем все найденные ресурсы
                existingResources.forEach(resource => resource.remove());
            }
        }
        
        // Устанавливаем флаг блокировки
        gameState.isCreatingResource = true;
        
        // Генерируем уникальный ID для ресурса
        const resourceId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        gameState.currentResourceId = resourceId;
        
        // Получаем игровую область (переиспользуем уже полученную)
        gameArea = gameArea || document.getElementById('game-area');
        
        // Выбираем ресурс на основе шансов для текущего типа сбора
        const randomResource = selectResourceByChance(gameState.gatherType);
        const resourceFileName = randomResource.toLowerCase().replace(/\s+/g, '');
        
        // Создаем новый элемент ресурса
        const resourceElement = document.createElement('div');
        resourceElement.className = 'resource-item clickable';
        resourceElement.style.position = 'absolute';
        resourceElement.style.width = '50px';
        resourceElement.style.height = '50px';
        resourceElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        resourceElement.style.borderRadius = '50%';
        resourceElement.style.display = 'flex';
        resourceElement.style.alignItems = 'center';
        resourceElement.style.justifyContent = 'center';
        resourceElement.style.border = '2px solid #00fff7';
        resourceElement.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.6)';
        resourceElement.style.cursor = 'pointer';
        resourceElement.style.zIndex = '10001';
        resourceElement.setAttribute('data-debug', 'resource-item');
        
        // Сохраняем тип ресурса в элементе для дальнейшего использования
        resourceElement.setAttribute('data-resource-type', randomResource);
        resourceElement.setAttribute('data-resource-id', resourceId);
        
        console.log(`[ManualGather] Интервальный ресурс: ${randomResource}, файл: ${resourceFileName}.png, ID: ${resourceId}, время: ${Date.now()}`);
        
        // Задаем изображение ресурса
        const resourceImage = document.createElement('img');
        resourceImage.src = `images/rpg/${resourceFileName}.png`; // Убираем source/ из пути
        resourceImage.alt = randomResource;
        resourceImage.style.maxWidth = '100%';
        resourceImage.style.maxHeight = '100%';
        resourceImage.onerror = (e) => {
            console.error(`[ManualGather] Ошибка загрузки изображения: ${e.target.src}`);
            resourceImage.src = 'images/rpg/unknown.png'; // Убираем source/ из пути
        };
        
        // Добавляем изображение в контейнер ресурса
        resourceElement.appendChild(resourceImage);
        
        // Устанавливаем случайную позицию для ресурса
        const maxX = gameArea.clientWidth - 60;
        const maxY = gameArea.clientHeight - 60;
        const randomX = Math.max(10, Math.floor(Math.random() * maxX));
        const randomY = Math.max(10, Math.floor(Math.random() * maxY));
        
        resourceElement.style.left = `${randomX}px`;
        resourceElement.style.top = `${randomY}px`;
        
        // Добавляем анимацию пульсации
        resourceElement.style.animation = 'pulse 1s infinite alternate';
        
        // Добавляем обработчики клика и касания
        const resourceClickHandler = async (e) => {
            console.log('[ManualGather] Клик по ресурсу', randomResource);
            e.stopPropagation();
            await collectResource(resourceElement);
        };
        
        resourceElement.addEventListener('click', resourceClickHandler);
        resourceElement.addEventListener('touchstart', resourceClickHandler);
        
        // Добавляем ресурс на игровую область
        gameArea.appendChild(resourceElement);
        gameState.resourceElement = resourceElement;
        
        console.log('[ManualGather] Интервальный ресурс создан и добавлен в игровую область', {
            resourceType: randomResource,
            position: { x: randomX, y: randomY }
        });
        
        // Снимаем блокировку создания ресурсов
        gameState.isCreatingResource = false;
    };
    
    // Публичный API
    return {
        init,
        startGame: wrappedStartGame,
        endGame: wrappedEndGame,
        addStyles,
        closeGame: wrappedCloseGame,
        debugGameState,
        toggleDebug,
        startResourceInterval,
        stopResourceInterval
    };
})();

// Добавляем стили для игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    ManualGatherModule.addStyles();
});

// Глобальная функция для инициализации модуля сбора с нужными параметрами
window.initManualGather = (containerId, type = 'gather') => {
    console.log('[ManualGather] Инициализация из window.initManualGather');
    
    // Добавляем стили, если они еще не добавлены
    ManualGatherModule.addStyles();

    // Находим контейнер для игры
    const container = document.getElementById(containerId);
    
    if (container) {
        // Инициализируем игру
        ManualGatherModule.init(container, type);
        return true;
    } else {
        console.error(`[ManualGather] Container with id "${containerId}" not found`);
        return false;
    }
};

// Экспортируем модуль
window.ManualGatherModule = ManualGatherModule; 
