// RPG Game Logic
const RPGGame = {
  // Player data
  player: {
    telegramId: null,
    nickname: null,
    level: 1,
    experience: 0,
    stats: {
      strength: 1,
      agility: 1,
      intelligence: 1
    },
    resources: {
      woodlog: 0,
      rock: 0,
      herbs: 0,
      ore: 0
    },
    equipment: {}
  },
  
  // Game state
  gameState: {
    isInitialized: false,
    isGathering: false,
    gatheringStartTime: null,
    currentScreen: 'login', // login, character, inventory, gathering
  },
  
  // DOM elements cache
  elements: {},
  
  /**
   * Initialize the game
   */
  async init() {
    RPGApi.log('Initializing RPG game');
    
    // Инициализируем модуль статистики, если он доступен
    if (window.StatsModule) {
      window.StatsModule.init();
    }
    
    // Проверяем параметры URL на наличие telegramId
    const urlParams = new URLSearchParams(window.location.search);
    const urlTelegramId = urlParams.get('telegramId');
    
    // Проверяем localStorage на наличие сохраненного telegramId
    const storedTelegramId = localStorage.getItem('rpg_telegram_id');
    
    // Выводим итоговый Telegram ID, который будет использоваться
    const effectiveTelegramId = urlTelegramId || storedTelegramId;
    
    // Логируем Telegram ID на сервере
    if (effectiveTelegramId) {
      try {
        const nickname = urlParams.get('nickname') || '';
        
              // Логирование отключено, так как телеграм ID берется из IndexedDB и локального хранилища
      } catch (error) {
        console.error('Ошибка при логировании Telegram ID:', error);
      }
    }
    
    // Cache DOM elements
    try {
      this.cacheElements();
    } catch (error) {
      console.error('RPG Game: Error caching DOM elements', error);
      alert('Error initializing game interface. Please check console for details.');
      return;
    }
    
    // Setup event listeners
    try {
      this.setupEventListeners();
    } catch (error) {
      console.error('RPG Game: Error setting up event listeners', error);
    }
    
    // Check if user is already logged in
    const telegramId = localStorage.getItem('rpg_telegram_id');
    
    if (telegramId) {
      RPGApi.log('Found saved telegram ID', { telegramId });
      this.player.telegramId = telegramId;
      
      try {
        await this.loadUserData();
      } catch (error) {
        console.error('RPG Game: Failed to load user data', error);
        localStorage.removeItem('rpg_telegram_id');
        this.showScreen('login');
      }
    } else {
      this.showScreen('login');
    }
    
    this.gameState.isInitialized = true;
    RPGApi.log('Game initialization complete');
  },
  
  /**
   * Cache DOM elements for quick access
   */
  cacheElements() {
    console.log('RPG Game: Caching DOM elements');
    
    // Main screens
    this.elements.screens = {
      login: document.getElementById('rpg-login-screen'),
      character: document.getElementById('rpg-character-screen'),
      inventory: document.getElementById('rpg-inventory-screen'),
      gathering: document.getElementById('rpg-gathering-screen')
    };
    
    // Log elements that couldn't be found
    Object.entries(this.elements.screens).forEach(([name, element]) => {
      if (!element) {
        console.error(`RPG Game: Screen element not found: rpg-${name}-screen`);
      }
    });
    
    // Login elements
    this.elements.loginForm = document.getElementById('rpg-login-form');
    this.elements.telegramIdInput = document.getElementById('rpg-telegram-id');
    this.elements.nicknameInput = document.getElementById('rpg-nickname');
    this.elements.loginButton = document.getElementById('rpg-login-button');
    this.elements.loginError = document.getElementById('rpg-login-error');
    
    if (!this.elements.loginForm) console.error('RPG Game: Login form not found');
    if (!this.elements.telegramIdInput) console.error('RPG Game: Telegram ID input not found');
    if (!this.elements.nicknameInput) console.error('RPG Game: Nickname input not found');
    if (!this.elements.loginButton) console.error('RPG Game: Login button not found');
    if (!this.elements.loginError) console.error('RPG Game: Login error element not found');
    
    // Character elements
    this.elements.characterInfo = document.getElementById('rpg-character-info');
    this.elements.characterName = document.getElementById('rpg-character-name');
    this.elements.characterLevel = document.getElementById('rpg-character-level');
    this.elements.characterStats = document.getElementById('rpg-character-stats');
    
    // Inventory elements
    this.elements.inventoryList = document.getElementById('rpg-inventory-list');
    this.elements.resourcesList = document.getElementById('rpg-resources-list');
    
    // Gathering elements
    this.elements.gatheringStatus = document.getElementById('rpg-gathering-status');
    this.elements.gatheringTime = document.getElementById('rpg-gathering-time');
    this.elements.gatheringResources = document.getElementById('rpg-gathering-resources');
    this.elements.startGatheringBtn = document.getElementById('rpg-start-gathering');
    this.elements.claimResourcesBtn = document.getElementById('rpg-claim-resources');
    this.elements.cancelGatheringBtn = document.getElementById('rpg-cancel-gathering');
    
    // Navigation
    this.elements.navButtons = document.querySelectorAll('.rpg-nav-button');
    
    // Добавляем кнопку очистки хранилища
    this.createClearStorageButton();
  },
  
  /**
   * Creates and adds the clear storage button to the UI
   */
  createClearStorageButton() {
    console.log('RPG Game: Creating clear storage button');
    const clearButton = document.createElement('button');
    clearButton.id = 'rpg-clear-storage';
    clearButton.textContent = 'CLEAR ALL STORAGE';
    
    // Улучшенные стили для большей заметности
    const styles = {
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      zIndex: '9999', // Очень высокий z-index, чтобы быть поверх всего
      backgroundColor: '#ff0000',
      color: 'white',
      padding: '15px 20px',
      fontSize: '16px',
      fontWeight: 'bold',
      borderRadius: '8px',
      border: '3px solid yellow',
      boxShadow: '0 0 10px rgba(0,0,0,0.5)',
      cursor: 'pointer',
      textTransform: 'uppercase'
    };
    
    // Применяем все стили к кнопке
    Object.entries(styles).forEach(([property, value]) => {
      clearButton.style[property] = value;
    });
    
    // Добавляем обработчик события
    clearButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear ALL storage? This will remove all your data.')) {
        this.clearAllStorage();
      }
    });
    
    // Добавляем кнопку в body документа
    document.body.appendChild(clearButton);
    
    // Сохраняем ссылку на кнопку
    this.elements.clearStorageBtn = clearButton;
    
    console.log('RPG Game: Clear storage button created and added to document body');
  },
  
  /**
   * Clears all local storage and IndexedDB data
   */
  async clearAllStorage() {
    console.log('Clearing all storage (localStorage and IndexedDB)');
    
    // Очищаем localStorage
    localStorage.clear();
    console.log('localStorage cleared');
    
    // Удаляем базу данных ItemCatalog
    const deleteItemCatalogDB = indexedDB.deleteDatabase('RPGItemCatalog');
    deleteItemCatalogDB.onsuccess = () => {
      console.log('RPGItemCatalog database deleted successfully');
    };
    deleteItemCatalogDB.onerror = (error) => {
      console.error('Error deleting RPGItemCatalog database:', error);
    };
    
    // Удаляем базу данных UserResources
    const deleteUserResourcesDB = indexedDB.deleteDatabase('UserResourcesDB');
    deleteUserResourcesDB.onsuccess = () => {
      console.log('UserResourcesDB database deleted successfully');
    };
    deleteUserResourcesDB.onerror = (error) => {
      console.error('Error deleting UserResourcesDB database:', error);
    };
    
    // Показываем уведомление пользователю
    alert('All storage has been cleared. Please refresh the page for changes to take effect.');
    
    // Перезагружаем страницу после небольшой задержки
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Login form submission
    this.elements.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });
    
    // Navigation buttons
    this.elements.navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetScreen = button.getAttribute('data-target');
        this.showScreen(targetScreen);
      });
    });
    
    // Gathering buttons
    this.elements.startGatheringBtn.addEventListener('click', () => this.startGathering());
    this.elements.claimResourcesBtn.addEventListener('click', () => this.claimGathering());
    this.elements.cancelGatheringBtn.addEventListener('click', () => this.cancelGathering());
  },
  
  /**
   * Show a specific screen
   * @param {string} screenName - Name of the screen to show
   */
  showScreen(screenName) {
    RPGApi.log('Showing screen', { screenName });
    
    // Hide all screens
    Object.values(this.elements.screens).forEach(screen => {
      screen.classList.add('hidden');
    });
    
    // Show requested screen
    if (this.elements.screens[screenName]) {
      this.elements.screens[screenName].classList.remove('hidden');
      this.gameState.currentScreen = screenName;
      
      // Update screen if needed
      if (screenName === 'character') {
        this.updateCharacterScreen();
      } else if (screenName === 'inventory') {
        this.updateInventoryScreen();
      } else if (screenName === 'gathering') {
        this.updateGatheringScreen();
      }
    } else {
      RPGApi.log(`Screen not found: ${screenName}`, null, 'error');
    }
  },
  
  /**
   * Handle login/character creation
   */
  async handleLogin() {
    try {
      // Получаем значения из формы (если она существует)
      let formTelegramId = null;
      let formNickname = null;
      
      if (this.elements.telegramIdInput) {
        formTelegramId = this.elements.telegramIdInput.value.trim();
      }
      
      if (this.elements.nicknameInput) {
        formNickname = this.elements.nicknameInput.value.trim();
      }
      
      // Get telegramId - from URL params, local storage, or prompt
      let telegramId = this.getUrlParam('telegramId') || localStorage.getItem('rpg_telegram_id');
      
      if (!telegramId) {
        telegramId = prompt('Enter your Telegram ID to continue:');
      }
      
      if (!telegramId) {
        console.error('RPG Game: No telegramId provided - cannot continue');
        this.showError('Telegram ID is required to play. Please refresh and try again.');
        return;
      }
      
      // Trim and validate telegramId
      telegramId = telegramId.trim();
      if (!telegramId || !/^[0-9]+$/.test(telegramId)) {
        console.error('RPG Game: Invalid telegramId format:', telegramId);
        this.showError('Invalid Telegram ID format. Please use only numbers.');
        return;
      }
      
      // Check if nickname is in URL (for new users)
      let nickname = this.getUrlParam('nickname');
      
      // If nickname not in URL, check form input (for users who entered nickname in the form)
      if (!nickname && this.elements.nicknameInput && this.elements.nicknameInput.value.trim()) {
        nickname = this.elements.nicknameInput.value.trim();
      }
      
      // Логирование отключено, так как телеграм ID берется из IndexedDB и локального хранилища
      
      // Check if user exists
      RPGApi.log(`Calling checkUser() with telegramId: ${telegramId}`);
      
      let userData;
      try {
        userData = await RPGApi.checkUser(telegramId);
      } catch (error) {
        console.error('RPG Game: checkUser API call failed:', error);
        this.showError(`Failed to check user: ${error.message}`);
        return;
      }
      
      if (userData.exists) {
        // User exists, load data
        RPGApi.log('User exists, loading data');
        this.player.telegramId = telegramId;
        localStorage.setItem('rpg_telegram_id', telegramId);
        await this.loadUserData();
      } else if (nickname) {
        // Create new character
        RPGApi.log('Creating new character with nickname: ' + nickname);
        
        try {
          // Attempt to create character with retry if needed
          let retryCount = 0;
          const maxRetries = 3;
          let success = false;
          let result;
          
          while (!success && retryCount < maxRetries) {
            try {
              // Wait a short time to ensure database is ready
              if (retryCount > 0) {
                await new Promise(resolve => setTimeout(resolve, retryCount * 500));
              }
              
              // Call the API
              result = await RPGApi.createCharacter(telegramId, nickname);
              success = true;
            } catch (error) {
              retryCount++;
              console.error(`RPG Game: Character creation attempt ${retryCount} failed:`, error);
              
              // If we've reached max retries, rethrow the error
              if (retryCount >= maxRetries) {
                throw error;
              }
            }
          }
          
          // If we got here and success is true, character was created
          if (success) {
            this.player.telegramId = telegramId;
            localStorage.setItem('rpg_telegram_id', telegramId);
            
            // Wait a moment to ensure database writes are complete before loading
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await this.loadUserData();
          }
        } catch (error) {
          console.error('RPG Game: Failed to create character:', error);
          this.showError(`Failed to create character: ${error.message}`);
        }
      } else {
        // No user and no nickname - prompt for nickname
        this.showNicknameDialog(telegramId);
      }
    } catch (error) {
      console.error('RPG Game: Error in handleLogin:', error);
      this.showError(`Login failed: ${error.message}`);
    }
  },
  
  /**
   * Show login error message
   * @param {string} message - Error message to display
   */
  showLoginError(message) {
    this.elements.loginError.textContent = message;
    this.elements.loginError.classList.remove('hidden');
    
    // Hide error after 5 seconds
    setTimeout(() => {
      this.elements.loginError.classList.add('hidden');
    }, 5000);
  },
  
  /**
   * Load user data from the server
   */
  async loadUserData() {
    try {
      RPGApi.log('Loading user data');
      
      // Get user data from server
      const userData = await RPGApi.checkUser(this.player.telegramId);
      RPGApi.log('User data loaded', userData);
      
      if (!userData.exists) {
        RPGApi.log('User does not exist in database', null, 'error');
        this.showLoginError('User not found in database. Please create a character with a nickname.');
        
        // Clear any stored ID since it's not valid
        localStorage.removeItem('rpg_telegram_id');
        this.player.telegramId = null;
        
        // Show login form with focus on nickname field
        this.showScreen('login');
        this.elements.nicknameInput.focus();
        return;
      }
      
      // Update player data
      this.player.nickname = userData.nickname;
      this.player.level = userData.level || 1;
      this.player.experience = userData.experience || 0;
      this.player.stats = userData.stats || { strength: 1, agility: 1, luck: 1, health: 10 };
      this.player.resources = userData.resources || { wood: 0, stone: 0, herbs: 0, ore: 0 };
      
      // Get equipment and inventory
      const [inventory, equipment] = await Promise.all([
        RPGApi.getInventory(this.player.telegramId),
        RPGApi.getEquipped(this.player.telegramId)
      ]);
      
      this.player.inventory = inventory;
      this.player.equipment = equipment;
      
      // Check if gathering in progress
      const gatheringStatus = await RPGApi.checkGathering(this.player.telegramId);
      
      if (gatheringStatus.inProgress) {
        this.gameState.isGathering = true;
        this.gameState.gatheringStartTime = new Date(gatheringStatus.startTime);
        this.gameState.gatheringResults = gatheringStatus.results;
      }
      
      // Show character screen
      this.showScreen('character');
      this.startGameLoop();
      
      RPGApi.log('User data loaded successfully', this.player);
    } catch (error) {
      RPGApi.log('Error loading user data', error, 'error');
      console.error('Ошибка загрузки данных пользователя:', error);
      this.showLoginError(`Failed to load game data: ${error.message}`);
    }
  },
  
  /**
   * Update character screen with player data
   */
  updateCharacterScreen() {
    this.elements.characterName.textContent = this.player.nickname;
    this.elements.characterLevel.textContent = `Level ${this.player.level}`;
    
    // Update stats
    const statsHTML = Object.entries(this.player.stats).map(([stat, value]) => {
      return `<div class="rpg-stat"><span class="stat-name">${stat.charAt(0).toUpperCase() + stat.slice(1)}</span>: <span class="stat-value">${value}</span></div>`;
    }).join('');
    
    this.elements.characterStats.innerHTML = statsHTML;
    
    // Update resources in character screen
    const resourceHTML = Object.entries(this.player.resources).map(([resource, amount]) => {
      return `<div class="rpg-resource"><span class="resource-name">${resource.charAt(0).toUpperCase() + resource.slice(1)}</span>: <span class="resource-amount">${amount}</span></div>`;
    }).join('');
    
    // If there's a resources display on character screen
    const resourcesDisplay = document.getElementById('rpg-character-resources');
    if (resourcesDisplay) {
      resourcesDisplay.innerHTML = resourceHTML;
    }
  },
  
  /**
   * Update inventory screen with player's items and resources
   */
  updateInventoryScreen() {
    // Update inventory items
    if (this.player.inventory && this.player.inventory.length > 0) {
      const inventoryHTML = this.player.inventory.map(item => {
        return `
          <div class="rpg-item" data-id="${item.id}">
            <div class="item-name">${item.name}</div>
            <div class="item-properties">
              ${item.properties ? Object.entries(item.properties).map(([prop, val]) => 
                `<div class="item-property">${prop}: ${val}</div>`
              ).join('') : ''}
            </div>
            <div class="item-actions">
              <button class="item-equip-btn" data-item-id="${item.id}">Equip</button>
            </div>
          </div>
        `;
      }).join('');
      
      this.elements.inventoryList.innerHTML = inventoryHTML;
      
      // Add event listeners to equip buttons
      document.querySelectorAll('.item-equip-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const itemId = e.target.getAttribute('data-item-id');
          this.equipItem(itemId);
        });
      });
    } else {
      this.elements.inventoryList.innerHTML = '<div class="rpg-empty-inventory">No items in inventory</div>';
    }
    
    // Update resources list
    const resourcesHTML = Object.entries(this.player.resources).map(([resource, amount]) => {
      return `<div class="rpg-resource"><span class="resource-name">${resource.charAt(0).toUpperCase() + resource.slice(1)}</span>: <span class="resource-amount">${amount}</span></div>`;
    }).join('');
    
    this.elements.resourcesList.innerHTML = resourcesHTML;
  },
  
  /**
   * Update gathering screen based on current gathering status
   */
  updateGatheringScreen() {
    if (this.gameState.isGathering) {
      // Show gathering in progress UI
      this.elements.gatheringStatus.textContent = 'Gathering in progress...';
      this.elements.startGatheringBtn.classList.add('hidden');
      this.elements.claimResourcesBtn.classList.remove('hidden');
      this.elements.cancelGatheringBtn.classList.remove('hidden');
      
      // Calculate elapsed time
      const now = new Date();
      const elapsed = Math.floor((now - this.gameState.gatheringStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      
      this.elements.gatheringTime.textContent = `Time elapsed: ${minutes}m ${seconds}s`;
      
      // Show current resources if available
      if (this.gameState.gatheringResults) {
        const resourcesHTML = Object.entries(this.gameState.gatheringResults).map(([resource, amount]) => {
          return `<div class="rpg-gathered-resource"><span class="resource-name">${resource.charAt(0).toUpperCase() + resource.slice(1)}</span>: <span class="resource-amount">${amount}</span></div>`;
        }).join('');
        
        this.elements.gatheringResources.innerHTML = resourcesHTML;
      }
    } else {
      // Show start gathering UI
      this.elements.gatheringStatus.textContent = 'Ready to gather resources';
      this.elements.startGatheringBtn.classList.remove('hidden');
      this.elements.claimResourcesBtn.classList.add('hidden');
      this.elements.cancelGatheringBtn.classList.add('hidden');
      this.elements.gatheringTime.textContent = '';
      this.elements.gatheringResources.innerHTML = '';
    }
  },
  
  /**
   * Start gathering resources
   */
  async startGathering() {
    try {
      RPGApi.log('Starting gathering session');
      
      const result = await RPGApi.startGathering(this.player.telegramId);
      
      if (result.success) {
        this.gameState.isGathering = true;
        this.gameState.gatheringStartTime = new Date();
        this.gameState.gatheringResults = {};
        
        this.updateGatheringScreen();
        RPGApi.log('Gathering started successfully');
      } else {
        RPGApi.log('Failed to start gathering', result, 'error');
        alert('Failed to start gathering: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      RPGApi.log('Error starting gathering', error, 'error');
      alert('Error starting gathering: ' + error.message);
    }
  },
  
  /**
   * Claim gathered resources
   */
  async claimGathering() {
    try {
      RPGApi.log('Claiming gathered resources');
      
      const result = await RPGApi.claimGathering(this.player.telegramId);
      
      if (result.success) {
        // Update player resources
        Object.entries(result.resources).forEach(([resource, amount]) => {
          this.player.resources[resource] = (this.player.resources[resource] || 0) + amount;
        });
        
        this.gameState.isGathering = false;
        this.gameState.gatheringStartTime = null;
        this.gameState.gatheringResults = null;
        
        // Display claimed resources
        const resourcesText = Object.entries(result.resources)
          .map(([resource, amount]) => `${amount} ${resource}`)
          .join(', ');
        
        alert(`You claimed: ${resourcesText}`);
        
        this.updateGatheringScreen();
        RPGApi.log('Resources claimed successfully', result.resources);
      } else {
        RPGApi.log('Failed to claim resources', result, 'error');
        alert('Failed to claim resources: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      RPGApi.log('Error claiming resources', error, 'error');
      alert('Error claiming resources: ' + error.message);
    }
  },
  
  /**
   * Cancel gathering session
   */
  async cancelGathering() {
    try {
      RPGApi.log('Cancelling gathering session');
      
      const result = await RPGApi.cancelGathering(this.player.telegramId);
      
      if (result.success) {
        this.gameState.isGathering = false;
        this.gameState.gatheringStartTime = null;
        this.gameState.gatheringResults = null;
        
        this.updateGatheringScreen();
        RPGApi.log('Gathering cancelled successfully');
      } else {
        RPGApi.log('Failed to cancel gathering', result, 'error');
        alert('Failed to cancel gathering: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      RPGApi.log('Error cancelling gathering', error, 'error');
      alert('Error cancelling gathering: ' + error.message);
    }
  },
  
  /**
   * Show nickname dialog for new users
   * @param {string} telegramId - Telegram ID of the user
   */
  showNicknameDialog(telegramId) {
    console.log('RPG Game: 🎮 Showing nickname dialog for new user', telegramId);
    console.log('НАСТРОЙКА ДИАЛОГА НИКНЕЙМА ДЛЯ TELEGRAM ID:', telegramId);
    
    // Store the telegramId temporarily
    this.player.telegramId = telegramId;
    console.log('СОХРАНЕНИЕ TELEGRAM ID В player.telegramId:', this.player.telegramId);
    
    // Focus on the nickname input
    this.showScreen('login');
    
    // Проверка наличия элементов формы
    console.log('ПРОВЕРКА ЭЛЕМЕНТОВ ФОРМЫ:', {
      nicknameInput: !!this.elements.nicknameInput,
      telegramIdInput: !!this.elements.telegramIdInput,
      loginButton: !!this.elements.loginButton,
      loginError: !!this.elements.loginError
    });
    
    if (!this.elements.nicknameInput) {
      console.error('ОШИБКА: Не найден элемент ввода никнейма!');
      alert('Ошибка интерфейса: не найдено поле для ввода никнейма');
      return;
    }
    
    this.elements.nicknameInput.focus();
    this.elements.nicknameInput.setAttribute('required', 'required');
    
    // Show helper message
    this.showLoginError('Пожалуйста, введите никнейм для создания персонажа');
    
    // Modify the form for nickname creation mode
    if (this.elements.telegramIdInput) {
      this.elements.telegramIdInput.value = telegramId;
      this.elements.telegramIdInput.setAttribute('readonly', 'readonly');
      console.log('УСТАНОВЛЕН TELEGRAM ID В ПОЛЕ ВВОДА:', this.elements.telegramIdInput.value);
    } else {
      console.error('ОШИБКА: Не найден элемент ввода Telegram ID!');
    }
    
    if (this.elements.loginButton) {
      this.elements.loginButton.textContent = 'Создать персонажа';
      console.log('ИЗМЕНЕНА НАДПИСЬ НА КНОПКЕ:', this.elements.loginButton.textContent);
    } else {
      console.error('ОШИБКА: Не найдена кнопка отправки формы!');
    }
    
    console.log('RPG Game: 🎮 Nickname dialog prepared, waiting for user input');
    console.log('ФОРМА ПОДГОТОВЛЕНА, ОЖИДАЕМ ВВОД НИКНЕЙМА');
  },
  
  /**
   * Get a parameter from the URL
   * @param {string} name - Name of the parameter
   * @returns {string|null} Parameter value or null if not found
   */
  getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },
  
  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    console.error('RPG Game: ❌ ERROR:', message);
    
    // Use login error display if available
    if (this.elements.loginError) {
      this.showLoginError(message);
    } else {
      // Fallback to alert if login error element isn't available
      alert('Error: ' + message);
    }
  },
  
  /**
   * Equip an item
   * @param {string} itemId - ID of the item to equip
   */
  async equipItem(itemId) {
    // This would call the API to equip the item
    alert('Equipment functionality not implemented yet');
  },
  
  /**
   * Start game loop for updating game state
   */
  startGameLoop() {
    if (this.gameLoopRunning) return;
    
    this.gameLoopRunning = true;
    RPGApi.log('Starting game loop');

    // Set up the game loop
    this.gameLoopInterval = setInterval(() => {
      // Update gathering progress if gathering is in progress
      if (this.gameState.isGathering) {
        const now = new Date();
        const startTime = this.gameState.gatheringStartTime;
        const elapsedTime = Math.floor((now - startTime) / 1000);
        const totalTime = 60; // Default gathering time in seconds
        
        const progress = Math.min(elapsedTime / totalTime, 1);
        this.updateGatheringProgress(progress);
        
        // Check if gathering is complete
        if (progress >= 1 && !this.gameState.gatheringCompleted) {
          this.gameState.gatheringCompleted = true;
          this.completeGathering();
        }
      }
      
      // Check for completed crafting tasks
      this.checkCraftingCompletion();
      
    }, 1000); // Update every second
  },
  
  /**
   * Update gathering progress
   * @param {number} progress - Gathering progress percentage
   */
  updateGatheringProgress(progress) {
    // Implementation of updateGatheringProgress method
  },
  
  /**
   * Complete gathering
   */
  completeGathering() {
    // Implementation of completeGathering method
  },
  
  /**
   * Check crafting completion
   */
  checkCraftingCompletion() {
    // Implementation of checkCraftingCompletion method
  }
};

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  RPGGame.init();
});

// Export the game object
window.RPGGame = RPGGame; 