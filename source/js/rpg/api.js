// RPG API Service for database interactions
const RPGApi = {
  // Static endpoint URL
  endpoint: 'rpg.php',
  
  /**
   * Log message with timestamp for debugging
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   * @param {string} level - Log level (log, error, warn)
   */
  log(message, data = null, level = 'log') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] RPGApi: `;
    
    if (level === 'error') {
      console.error(prefix + message, data || '');
    } else if (level === 'warn') {
      console.warn(prefix + message, data || '');
    } else {
      console.log(prefix + message, data || '');
    }
  },
  
  /**
   * Log error message with timestamp for debugging
   * @param {string} message - Error message
   * @param {any} error - Error object
   */
  logError(message, error) {
    const timestamp = new Date().toLocaleTimeString();
    console.error(`[${timestamp}] RPGApi ERROR: ${message}`, error);
  },
  
  /**
   * Функция logTelegramId заменена на заглушку, так как телеграм ID берется из IndexedDB и локального хранилища
   * @param {string} telegramId - Telegram ID of the user
   * @param {string} nickname - Optional nickname
   * @returns {Promise<boolean>} Success status
   */
  async logTelegramId(telegramId, nickname = '') {
    // Функционал логирования отключен
    this.log(`📝 Telegram ID logging disabled: ${telegramId}`);
    return true;
  },
  
  /**
   * Check if user exists in the game database
   * @param {string} telegramId - Telegram ID of the user
   * @returns {Promise<Object>} User data if exists
   */
  async checkUser(telegramId) {
    this.log(`📤 checkUser() - Checking if user exists: ${telegramId}`);
    console.log(`ПРОВЕРКА СУЩЕСТВОВАНИЯ ПОЛЬЗОВАТЕЛЯ - Telegram ID: "${telegramId}"`);
    
    try {
      // Create the request URL
      const url = `${this.endpoint}?action=checkUser`;
      this.log(`📤 Making request to: ${url}`);
      console.log(`ОТПРАВКА ЗАПРОСА НА URL: ${url}`);
      
      // Log the payload being sent
      const payload = { telegramId };
      this.log(`📤 Request payload:`, JSON.stringify(payload, null, 2));
      console.log(`ДАННЫЕ ЗАПРОСА ПРОВЕРКИ:`, JSON.stringify(payload, null, 2));
      
      // Send the request
      console.log(`НАЧАЛО ОТПРАВКИ ЗАПРОСА ПРОВЕРКИ ПОЛЬЗОВАТЕЛЯ...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      this.log(`📥 Response status: ${response.status} ${response.statusText}`);
      console.log(`ПОЛУЧЕН ОТВЕТ ПРОВЕРКИ - Статус: ${response.status} ${response.statusText}`);
      
      // Get the raw response text first for logging
      const responseText = await response.text();
      this.log(`📥 Raw response text:`, responseText);
      console.log(`СЫРОЙ ТЕКСТ ОТВЕТА ПРОВЕРКИ:`, responseText);
      
      // Try to parse the response text as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        this.log(`📥 Parsed response data:`, data);
        console.log(`РАЗОБРАННЫЕ ДАННЫЕ ОТВЕТА ПРОВЕРКИ:`, data);
      } catch (parseError) {
        this.logError(`Failed to parse JSON response from checkUser`, parseError);
        this.logError(`Raw text that failed to parse:`, responseText);
        console.error(`ОШИБКА РАЗБОРА JSON ОТВЕТА ПРОВЕРКИ:`, parseError);
        console.error(`ТЕКСТ, КОТОРЫЙ НЕ УДАЛОСЬ РАЗОБРАТЬ:`, responseText);
        throw new Error(`Failed to parse server response: ${parseError.message}`);
      }
      
      if (!data.success) {
        this.logError(`Server returned error:`, data.message || 'Unknown error');
        console.error(`СЕРВЕР ВЕРНУЛ ОШИБКУ ПРИ ПРОВЕРКЕ:`, data.message || 'Неизвестная ошибка');
        throw new Error(data.message || 'Server error');
      }
      
      console.log(`РЕЗУЛЬТАТ ПРОВЕРКИ ПОЛЬЗОВАТЕЛЯ:`, data.data);
      console.log(`ПОЛЬЗОВАТЕЛЬ ${data.data.exists ? 'НАЙДЕН' : 'НЕ НАЙДЕН'} В БАЗЕ ДАННЫХ`);
      
      return data.data;
    } catch (error) {
      this.logError(`checkUser() failed`, error);
      console.error(`❌ ОШИБКА ПРОВЕРКИ ПОЛЬЗОВАТЕЛЯ:`, error.message);
      throw error;
    }
  },
  
  /**
   * Create a new character for the user
   * @param {string} telegramId - Telegram ID of the user
   * @param {string} nickname - Character nickname
   * @returns {Promise<Object>} Created user data
   */
  async createCharacter(telegramId, nickname) {
    this.log(`📤 createCharacter() - Creating character: ${nickname} for ID: ${telegramId}`);
    console.log(`СОЗДАНИЕ ПЕРСОНАЖА - Никнейм: "${nickname}", Telegram ID: "${telegramId}"`);
    
    try {
      // Validate input parameters
      if (!telegramId || !nickname) {
        const error = new Error("Missing required parameters");
        this.logError("Invalid parameters for createCharacter", { telegramId, nickname, error });
        console.error("ОШИБКА: Отсутствуют обязательные параметры", { telegramId, nickname });
        throw error;
      }
      
      // Create the request URL with a cache-busting parameter
      const timestamp = new Date().getTime();
      const url = `${this.endpoint}?action=createCharacter&t=${timestamp}`;
      this.log(`📤 Making request to: ${url}`);
      console.log(`ОТПРАВКА ЗАПРОСА НА URL: ${url}`);
      
      // Log the payload being sent
      const payload = { telegramId, nickname };
      this.log(`📤 Request payload:`, JSON.stringify(payload, null, 2));
      console.log(`ДАННЫЕ ЗАПРОСА:`, JSON.stringify(payload, null, 2));
      
      // Send the request
      this.log(`📤 Starting fetch request to server...`);
      console.log(`НАЧАЛО ОТПРАВКИ FETCH-ЗАПРОСА НА СЕРВЕР...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      this.log(`📥 Response received - Status: ${response.status} ${response.statusText}`);
      console.log(`ПОЛУЧЕН ОТВЕТ - Статус: ${response.status} ${response.statusText}`);
      
      // Get the raw response text first for logging
      const responseText = await response.text();
      this.log(`📥 Raw response text:`, responseText);
      console.log(`СЫРОЙ ТЕКСТ ОТВЕТА:`, responseText);
      
      // Try to parse the response text as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        this.log(`📥 Parsed response data:`, data);
        console.log(`РАЗОБРАННЫЕ ДАННЫЕ ОТВЕТА:`, data);
      } catch (parseError) {
        this.logError(`Failed to parse JSON response from createCharacter`, parseError);
        this.logError(`Raw text that failed to parse:`, responseText);
        console.error(`ОШИБКА РАЗБОРА JSON ОТВЕТА:`, parseError);
        console.error(`ТЕКСТ, КОТОРЫЙ НЕ УДАЛОСЬ РАЗОБРАТЬ:`, responseText);
        throw new Error(`Failed to parse server response: ${parseError.message}`);
      }
      
      if (!data.success) {
        this.logError(`Server returned error:`, data.message || 'Unknown error');
        console.error(`СЕРВЕР ВЕРНУЛ ОШИБКУ:`, data.message || 'Неизвестная ошибка');
        throw new Error(data.message || 'Server error');
      }
      
      this.log(`✅ Character created successfully! Server responded with:`, data);
      console.log(`✅ ПЕРСОНАЖ УСПЕШНО СОЗДАН! Ответ сервера:`, data);
      return data.data;
    } catch (error) {
      this.logError(`createCharacter() failed`, error);
      console.error(`❌ ОШИБКА СОЗДАНИЯ ПЕРСОНАЖА:`, error.message);
      throw error;
    }
  },
  
  /**
   * Get user data from the database
   * @param {string} telegramId - Telegram ID of the user
   * @returns {Promise<Object>} User data
   */
  async getUserData(telegramId) {
    this.log(`📤 getUserData() - Getting user data for: ${telegramId}`);
    
    try {
      // Добавляем дополнительную проверку telegramId
      if (!telegramId) {
        this.log('Error: telegramId is missing or invalid', null, 'error');
        throw new Error('Telegram ID is required');
      }
      
      const response = await fetch('rpg.php?action=getUserData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      this.log('User data response', data);
      
      // Проверка ответа сервера на наличие данных пользователя
      if (!data.success && data.message) {
        throw new Error(data.message);
      }
      
      return data.userData || null;
    } catch (error) {
      this.log(`Error getting user data: ${error.message}`, error, 'error');
      // Записываем подробную информацию об ошибке в консоль для отладки
      console.error('Detailed error in getUserData:', error);
      throw error;
    }
  },
  
  /**
   * Get user's inventory
   * @param {string} telegramId - Telegram ID of the user
   * @returns {Promise<Array>} Inventory items
   */
  async getInventory(telegramId) {
    this.log(`📤 getInventory() - Getting inventory for user: ${telegramId}`);
    
    try {
      const response = await fetch('rpg.php?action=getInventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      this.log('Inventory data response', data);
      
      return data.inventory || [];
    } catch (error) {
      this.log(`Error getting inventory: ${error.message}`, error, 'error');
      throw error;
    }
  },
  
  /**
   * Get user's equipped items
   * @param {string} telegramId - Telegram ID of the user
   * @returns {Promise<Object>} Equipped items
   */
  async getEquipped(telegramId) {
    this.log(`📤 getEquipped() - Getting equipped items for user: ${telegramId}`);
    
    try {
      const response = await fetch('rpg.php?action=getEquipped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      this.log('Equipped items fetch response', data);
      
      return data.equipped || {};
    } catch (error) {
      this.log(`Error fetching equipped items: ${error.message}`, error, 'error');
      throw error;
    }
  },
  
  /**
   * Update user's stats
   * @param {string} telegramId - Telegram ID of the user
   * @param {object} stats - Stats to update
   * @returns {Promise<Object>} Updated stats
   */
  async updateUserStats(telegramId, stats) {
    this.log(`📤 updateUserStats() - Updating stats for user: ${telegramId}`, stats);
    
    try {
      const response = await fetch('rpg.php?action=updateUserStats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, stats })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      this.log('Stats update response', data);
      
      return data;
    } catch (error) {
      this.log(`Error updating stats: ${error.message}`, error, 'error');
      throw error;
    }
  },
  
  /**
   * Start gathering resources
   * @param {string} telegramId - Telegram ID of the user
   * @param {string} gatheringType - Type of gathering
   * @returns {Promise<Object>} Gathering session data
   */
  async startGathering(telegramId, gatheringType) {
    this.log(`📤 startGathering() - Starting gathering for user: ${telegramId}, type: ${gatheringType}`);
    
    try {
      const response = await fetch('rpg.php?action=startGathering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, gatheringType })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      this.log('Gathering start response', data);
      
      return data;
    } catch (error) {
      this.log(`Error starting gathering: ${error.message}`, error, 'error');
      throw error;
    }
  },
  
  /**
   * Check gathering status
   * @param {string} telegramId - Telegram ID of the user
   * @returns {Promise<Object>} Gathering status and resources
   */
  async checkGathering(telegramId) {
    this.log(`📤 checkGathering() - Checking gathering for user: ${telegramId}`);
    
    try {
      const response = await fetch('rpg.php?action=checkGathering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      this.log('Gathering status response', data);
      
      return data;
    } catch (error) {
      this.log(`Error checking gathering: ${error.message}`, error, 'error');
      throw error;
    }
  },
  
  /**
   * Claim gathered resources
   * @param {string} telegramId - Telegram ID of the user
   * @returns {Promise<Object>} Claimed resources
   */
  async claimGathering(telegramId) {
    this.log(`📤 claimGathering() - Claiming gathering rewards for user: ${telegramId}`);
    
    try {
      const response = await fetch('rpg.php?action=claimGathering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      this.log('Resources claim response', data);
      
      return data;
    } catch (error) {
      this.log(`Error claiming resources: ${error.message}`, error, 'error');
      throw error;
    }
  },
  
  /**
   * Cancel gathering session
   * @param {string} telegramId - Telegram ID of the user
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelGathering(telegramId) {
    this.log(`📤 cancelGathering() - Canceling gathering for user: ${telegramId}`);
    
    try {
      const response = await fetch('rpg.php?action=cancelGathering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      this.log('Gathering cancellation response', data);
      
      return data;
    } catch (error) {
      this.log(`Error cancelling gathering: ${error.message}`, error, 'error');
      throw error;
    }
  }
};

// Export the API service
window.RPGApi = RPGApi;