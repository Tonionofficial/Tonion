// Crafting Module for RPG App
const { useState, useEffect, useRef, useMemo } = React;

// Защита от зацикливания обновлений
let lastResourceUpdateTimestamp = 0;
let isResourceUpdateInProgress = false;
let eventUpdateCount = 0;
const UPDATE_THRESHOLD = 2000; // Увеличиваем порог до 2 секунд (было 500мс)
const MAX_EVENT_COUNT = 2; // Уменьшаем до 2 (было больше)

let showItemDetailsCallback = null; // Колбэк для модальных окон

// Переменные состояния для защиты от циклических обновлений
let lastEventId = null; // Добавляем отслеживание ID последнего события

// Добавляем флаг принудительного обновления 
let forcedUpdateInProgress = false;

// Функция для крафта предмета и сохранения в БД
const craftItem = async (itemId, materials, quantity = 1) => {
  console.log('Craft started:', itemId, quantity);
  try {
    // Find the recipe data first
    if (!window.CraftingRecipes || !window.CraftingRecipes.recipes) {
      return { success: false, message: 'Recipes not loaded' };
    }
    
    // Look for the recipe in all categories
    let recipe = null;
    for (const category of Object.keys(window.CraftingRecipes.recipes)) {
      const categoryRecipes = window.CraftingRecipes.recipes[category];
      const foundRecipe = categoryRecipes.find(r => r.id === itemId);
      if (foundRecipe) {
        recipe = foundRecipe;
        break;
      }
    }
    
    if (!recipe) {
      return { success: false, message: 'Recipe not found' };
    }
    
    // Get user ID
    let userId;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
      userId = window.Telegram.WebApp.initDataUnsafe.user.id;
    } else {
      userId = localStorage.getItem('telegramId') || 'test_user';
    }
    
    // Get current resources
    let resources = Object.assign({}, window.globalUserResources);
    
    // Try to get resources using ModalModule if available
    if (window.ModalModule && typeof window.ModalModule.fetchUpdatedResources === 'function') {
      resources = await window.ModalModule.fetchUpdatedResources(userId);
    }
    // Try to use InventoryModule if available
    else if (window.InventoryModule && typeof window.InventoryModule.loadAllResources === 'function') {
      const result = await window.InventoryModule.loadAllResources(userId);
      resources = result.resources || {};
    }
    // Try to use app function
    else if (typeof getUserResourcesFromIndexedDB === 'function') {
      resources = await getUserResourcesFromIndexedDB(userId);
    }
    // Fallback to global variable
    else if (window.globalUserResources) {
      resources = {...window.globalUserResources};
    }
    
    // Check if we have required materials
    if (!materials) {
      materials = recipe.materials || [];
    }
    
    const originalResources = Object.assign({}, resources);
    let canCraft = true;
    
    for (const { material: materialId, amount: requiredAmount } of materials) {
      // Check various forms of material name
      const materialLower = materialId.toLowerCase();
      const materialNoSpaces = materialLower.replace(/\s+/g, '');
      const materialWithUnderscore = materialLower.replace(/\s+/g, '_');
      
      // Find the actual key for the resource
      let actualResourceKey = materialId;
      let userHasAmount = 0;
      
      if (resources[materialId] !== undefined) {
        userHasAmount = parseInt(resources[materialId]);
      } else if (resources[materialLower] !== undefined) {
        actualResourceKey = materialLower;
        userHasAmount = parseInt(resources[materialLower]);
      } else if (resources[materialNoSpaces] !== undefined) {
        actualResourceKey = materialNoSpaces;
        userHasAmount = parseInt(resources[materialNoSpaces]);
      } else if (resources[materialWithUnderscore] !== undefined) {
        actualResourceKey = materialWithUnderscore;
        userHasAmount = parseInt(resources[materialWithUnderscore]);
      }
      
      if (userHasAmount < requiredAmount) {
        canCraft = false;
        return {
          success: false,
          message: `Not enough ${materialId}. You have ${userHasAmount}, but need ${requiredAmount}.`
        };
      }
    }
    
    if (!canCraft) {
      return {
        success: false,
        message: 'Not enough materials for crafting'
      };
    }
    
    // Get craft time from recipe
    const craftTime = parseInt(recipe.craftTime) || 0;
    
    // For items with craft time, create a crafting session in DB
    if (craftTime > 0) {
      // Subtract materials
      for (const { material: materialId, amount: requiredAmount } of materials) {
        // Find the actual key for the resource
        const materialLower = materialId.toLowerCase();
        const materialNoSpaces = materialLower.replace(/\s+/g, '');
        const materialWithUnderscore = materialLower.replace(/\s+/g, '_');
        
        let actualResourceKey = materialId;
        
        if (resources[materialId] !== undefined) {
          actualResourceKey = materialId;
        } else if (resources[materialLower] !== undefined) {
          actualResourceKey = materialLower;
        } else if (resources[materialNoSpaces] !== undefined) {
          actualResourceKey = materialNoSpaces;
        } else if (resources[materialWithUnderscore] !== undefined) {
          actualResourceKey = materialWithUnderscore;
        }
        
        resources[actualResourceKey] = Math.max(0, parseInt(resources[actualResourceKey]) - requiredAmount);
      }
      
      // Save resources to IndexedDB
      try {
        if (window.ModalModule && typeof window.ModalModule.saveResourcesToIndexedDB === 'function') {
          await window.ModalModule.saveResourcesToIndexedDB(resources);
        } else if (window.InventoryModule && typeof window.InventoryModule.saveResources === 'function') {
          await window.InventoryModule.saveResources(resources);
        } else if (typeof saveUserResourcesToIndexedDB === 'function') {
          await saveUserResourcesToIndexedDB(resources);
        }
      } catch (error) {
        console.error('Error saving resources to IndexedDB:', error);
      }
      
      // Create crafting session through API
      let serverTime = Math.floor(Date.now() / 1000);
      let sessionId = null;
      
      try {
        // Calculate end time based on server time
        const endTime = serverTime + craftTime;
        
        // Create craft session object
        const craftSessionData = {
          telegramId: userId,
          item_id: itemId,
          item_name: recipe.name || itemId,
          quantity: quantity,
          start_time: serverTime,
          end_time: endTime,
          status: 'in_progress',
          materials: materials
        };
        
        // Send to server
        const response = await fetch('rpg.php?action=createCraftingSession', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(craftSessionData)
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        
        const responseText = await response.text();
        const responseData = JSON.parse(responseText);
        
        if (responseData.success) {
          sessionId = responseData.sessionId;
          
          // Update resources on server
          await updateResourcesOnServer(userId, resources);
          
          // Show the timer in UI if we have the function
          if (window.ModalModule && typeof window.ModalModule.updateRecipeWithCraftingTimer === 'function') {
            window.ModalModule.updateRecipeWithCraftingTimer(itemId, sessionId, endTime);
          }
          
          console.log('Craft success:', itemId, quantity);
          return {
            success: true,
            message: `Crafting ${recipe.name || itemId}... (${formatCraftTime(craftTime)})`,
            sessionId: sessionId,
            endTime: endTime
          };
        } else {
          // If failed, revert resources
          try {
            if (window.ModalModule && typeof window.ModalModule.saveResourcesToIndexedDB === 'function') {
              await window.ModalModule.saveResourcesToIndexedDB(originalResources);
            } else if (window.InventoryModule && typeof window.InventoryModule.saveResources === 'function') {
              await window.InventoryModule.saveResources(originalResources);
            } else if (typeof saveUserResourcesToIndexedDB === 'function') {
              await saveUserResourcesToIndexedDB(originalResources);
            }
          } catch (restoreError) {
            console.error('Error restoring resources:', restoreError);
          }
          
          return {
            success: false,
            message: responseData.message || 'Failed to create crafting session'
          };
        }
      } catch (error) {
        // If API call failed, revert resources
        try {
          if (window.ModalModule && typeof window.ModalModule.saveResourcesToIndexedDB === 'function') {
            await window.ModalModule.saveResourcesToIndexedDB(originalResources);
          } else if (window.InventoryModule && typeof window.InventoryModule.saveResources === 'function') {
            await window.InventoryModule.saveResources(originalResources);
          } else if (typeof saveUserResourcesToIndexedDB === 'function') {
            await saveUserResourcesToIndexedDB(originalResources);
          }
        } catch (restoreError) {
          console.error('Error restoring resources:', restoreError);
        }
        
        return {
          success: false,
          message: error.message || 'Error creating crafting session'
        };
      }
    } 
    // Instant crafting for items with no craft time
    else {
      // Subtract materials
      for (const { material: materialId, amount: requiredAmount } of materials) {
        // Find the actual key for the resource
        const materialLower = materialId.toLowerCase();
        const materialNoSpaces = materialLower.replace(/\s+/g, '');
        const materialWithUnderscore = materialLower.replace(/\s+/g, '_');
        
        let actualResourceKey = materialId;
        
        if (resources[materialId] !== undefined) {
          actualResourceKey = materialId;
        } else if (resources[materialLower] !== undefined) {
          actualResourceKey = materialLower;
        } else if (resources[materialNoSpaces] !== undefined) {
          actualResourceKey = materialNoSpaces;
        } else if (resources[materialWithUnderscore] !== undefined) {
          actualResourceKey = materialWithUnderscore;
        }
        
        resources[actualResourceKey] = Math.max(0, parseInt(resources[actualResourceKey]) - requiredAmount);
      }
      
      // Save updated resources
      try {
        if (window.ModalModule && typeof window.ModalModule.saveResourcesToIndexedDB === 'function') {
          await window.ModalModule.saveResourcesToIndexedDB(resources);
        } else if (window.InventoryModule && typeof window.InventoryModule.saveResources === 'function') {
          await window.InventoryModule.saveResources(resources);
        } else if (typeof saveUserResourcesToIndexedDB === 'function') {
          await saveUserResourcesToIndexedDB(resources);
        }
      } catch (error) {
        console.error('Error saving resources:', error);
      }
      
      // Get current inventory from DB
      let inventory = {};
      try {
        const response = await fetch(`rpg.php?action=getInventory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ telegramId: userId })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.inventory) {
            if (typeof data.inventory === 'string') {
              inventory = JSON.parse(data.inventory);
            } else {
              inventory = data.inventory;
            }
          }
        }
      } catch (error) {
        console.error('Error getting inventory:', error);
      }
      
      // Add the crafted item to inventory
      if (!inventory[itemId]) {
        inventory[itemId] = {
          id: itemId,
          name: recipe.name || itemId,
          quantity: 0,
          description: recipe.description || '',
          rarity: recipe.rarity || 'Common'
        };
      }
      
      inventory[itemId].quantity = (parseInt(inventory[itemId].quantity) || 0) + quantity;
      
      // Simplify inventory for update
      const simplifiedInventory = {};
      for (const [key, item] of Object.entries(inventory)) {
        simplifiedInventory[key] = item.quantity;
      }
      
      // Update inventory in DB
      try {
        const response = await fetch(`rpg.php?action=updateInventory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            telegramId: userId,
            inventory: simplifiedInventory
          })
        });
        
        if (response.ok) {
          const inventoryUpdateResult = await response.json();
          
          // Update inventory in IndexedDB
          if (window.InventoryModule && typeof window.InventoryModule.refreshInventoryDisplay === 'function') {
            await window.InventoryModule.refreshInventoryDisplay();
          }
          
          // Also update inventory in game_users table
          try {
            const userResponse = await fetch(`rpg.php?action=updateUserInventory`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                telegramId: userId,
                inventory: simplifiedInventory
              })
            });
            
            if (userResponse.ok) {
              await userResponse.json();
            }
          } catch (userUpdateError) {
            console.error('Error updating user inventory:', userUpdateError);
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error updating inventory'
        };
      }
      
      // Update resources on server
      await updateResourcesOnServer(userId, resources);
      
      console.log('Craft success:', itemId, quantity);
      return {
        success: true,
        message: `Successfully crafted ${quantity}x ${recipe.name || itemId}!`,
        instantCraft: true
      };
    }
  } catch (error) {
    console.error('Error in craftItem:', error.message);
    console.error('Craft error:', error);
    return { success: false, error: error.message };
  }
};

// Вспомогательная функция для обновления ресурсов на сервере
const updateResourcesOnServer = async (userId, resources) => {
  try {
    // Build the request body
    const requestBody = {
      telegramId: userId,
      resources: resources
    };
    
    const response = await fetch(`rpg.php?action=updateResources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    
    return responseData;
  } catch (error) {
    console.error('Error updating resources on server:', error.message);
    return {
      success: false,
      message: error.message || 'Error updating resources'
    };
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

// Функция для отображения иконки рецепта (с поддержкой изображений)
const RecipeIcon = ({ recipe }) => {
  // Добавляем временную метку к URL изображения для предотвращения кэширования
  const getImageUrl = (src) => {
    if (!src) return null;
    return src;
  };
  
  if (recipe.imageSrc) {
    return (
      <div className="recipe-icon-wrapper">
        <img 
          src={getImageUrl(recipe.imageSrc)} 
          alt={recipe.name} 
          className="recipe-image"
          onError={(e) => {
            console.warn(`Ошибка загрузки изображения: ${recipe.imageSrc}`);
            e.target.src = 'images/rpg/unknown.png';
          }}
        />
      </div>
    );
  } else {
    return <div className="recipe-icon">{recipe.icon}</div>;
  }
};

// Функция для очистки кэша изображений и локального хранилища
const clearImageCacheAndStorage = () => {
  try {
    // Очищаем локальное хранилище для рецептов, если такое есть
    if (localStorage.getItem('craftingRecipes')) {
      localStorage.removeItem('craftingRecipes');
    }
    
    // Загружаем все изображения с новым временным штампом для предотвращения кэширования
    if (window.CraftingRecipes) {
      const allRecipes = [];
      
      // Получаем все категории рецептов
      Object.keys(window.CraftingRecipes.recipes).forEach(category => {
        const categoryRecipes = window.CraftingRecipes.recipes[category] || [];
        allRecipes.push(...categoryRecipes);
      });
      
      // Для каждого рецепта предзагружаем изображение с новым временным штампом
      allRecipes.forEach(recipe => {
        if (recipe.imageSrc) {
          const timestamp = Date.now();
          const imgUrl = `${recipe.imageSrc}?v=${timestamp}`;
          
          // Создаем изображение и загружаем его с новым временным штампом
          const img = new Image();
          img.src = imgUrl;
          
          // Обновляем путь к изображению в рецепте
          recipe.imageSrc = imgUrl;
        }
      });
    }
    
    // Очищаем кэш службы воркеров, если они используются
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('recipe') || cacheName.includes('image')) {
            caches.delete(cacheName);
          }
        });
      });
    }
    
    // Форсируем обновление DOM для отображения новых изображений
    setTimeout(() => {
      const recipeImages = document.querySelectorAll('.recipe-image');
      recipeImages.forEach(img => {
        const originalSrc = img.getAttribute('src');
        if (originalSrc && !originalSrc.includes('?v=')) {
          img.setAttribute('src', `${originalSrc}?v=${Date.now()}`);
        }
      });
    }, 500);
    
    return true;
  } catch (error) {
    return false;
  }
};

// Компонент для крафта предметов
const Crafting = ({ onBack }) => {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loadingResources, setLoadingResources] = useState(true);
  const [userResources, setUserResources] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [craftingCategory, setCraftingCategory] = useState('all');
  const [craftingResult, setCraftingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState({});
  const [showUnavailable, setShowUnavailable] = useState(true); // Всегда показываем все рецепты
  const [hoveredRecipe, setHoveredRecipe] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [allRecipes, setAllRecipes] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const recipesPerPage = 24; // 6x4 рецептов на страницу
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingDbResources, setLoadingDbResources] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Получаем уровень игрока из модуля модальных окон
  const [playerLevel, setPlayerLevel] = useState(1);
  
  // Добавим ref для контейнера фильтров
  const filterMenuRef = useRef(null);
  
  
  // Добавляем состояние для отображения индикатора обновления кэша
  const [refreshingCache, setRefreshingCache] = useState(false);
  
  // Инициализация ModalModule и очистка кэша при монтировании компонента
  useEffect(() => {
    const initializeModules = async () => {
      try {
        console.log('[CraftingModule] Инициализация модулей...');
        
        // Генерируем событие открытия страницы крафта для проверки активных сессий
        document.dispatchEvent(new CustomEvent('crafting-page-opened'));
        console.log('[CraftingModule] Событие crafting-page-opened отправлено');
        
        // Проверяем наличие обязательных модулей
        if (!window.InventoryModule) {
          console.warn('[CraftingModule] ВАЖНО: InventoryModule не загружен! Специальные ресурсы могут не отображаться.');
        }
        
        if (!window.ItemCatalogModule) {
          console.warn('[CraftingModule] ВАЖНО: ItemCatalogModule не загружен! Редкость предметов может быть определена некорректно.');
        }
          
        const loadScript = (src) => {
          return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
              resolve();
              return;
            }
            
            const script = document.createElement('script');
            script.src = src;
          script.onload = () => {
            resolve();
          };
          script.onerror = (e) => {
            reject(e);
          };
            document.head.appendChild(script);
          });
        };
        
        // Сначала загружаем ItemCatalogModule, так как он нужен для правильного отображения редкости предметов
        if (!window.ItemCatalogModule) {
          await loadScript('source/js/rpg/itemcatalog.js');
        }
        
        // Затем загружаем другие модули
        const modulesToLoad = [
          { check: window.IndexedDBModule, path: 'source/js/rpg/indexedDB.js' },
          { check: window.ModalModule, path: 'source/js/rpg/modals.js' },
          { check: window.InventoryModule, path: 'source/js/rpg/inventory.js' }
        ];
        
        for (const module of modulesToLoad) {
          if (!module.check) {
            await loadScript(module.path);
          }
        }
        
        // Загружаем уровень персонажа из ModalModule
        if (window.ModalModule && typeof window.ModalModule.getPlayerLevel === 'function') {
          const level = window.ModalModule.getPlayerLevel();
          console.log('[CraftingModule] Получен уровень персонажа из ModalModule:', level);
          setPlayerLevel(level);
        } else {
          console.log('[CraftingModule] Не удалось получить уровень персонажа из ModalModule, используем значение по умолчанию');
        }
        
        return true;
      } catch (error) {
        console.error('[CraftingModule] Initialization failed:', error);
        return false;
      }
    };

    initializeModules();
  }, []);
  
  // Принудительная перезагрузка модуля с рецептами при монтировании компонента
  useEffect(() => {
    console.log('Принудительное обновление рецептов...');
    
    // Очищаем состояние рецептов перед загрузкой новых
    setAllRecipes([]);
    setRecipes([]);
    
    // Добавляем параметр времени для предотвращения кэширования скрипта
    const recipeScriptSrc = `source/js/rpg/crafting/recipes.js?v=${Date.now()}`;
    
    // Проверяем, есть ли старый скрипт рецептов, и удаляем его
    const oldScriptElements = document.querySelectorAll('script[src*="recipes.js"]');
    if (oldScriptElements.length > 0) {
      console.log('Удаляем старый скрипт рецептов...');
      oldScriptElements.forEach(element => element.remove());
    }
    
    // Создаем и добавляем новый скрипт
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/babel';
    scriptElement.src = recipeScriptSrc;
    document.head.appendChild(scriptElement);
    
    // Ждем загрузки скрипта и обновляем рецепты
    scriptElement.onload = () => {
      console.log('Скрипт рецептов успешно перезагружен');
      // Таймаут для уверенности, что скрипт полностью выполнился
      setTimeout(() => {
        if (window.CraftingRecipes) {
          loadRecipesFromModule();
          // После загрузки рецептов, обновляем изображения
          clearImageCacheAndStorage();
        } else {
        }
      }, 200);
    };
    
    scriptElement.onerror = (error) => {
    };
  }, []);
  
  // Функция для загрузки рецептов из модуля
  const loadRecipesFromModule = () => {
    try {
      if (window.CraftingRecipes) {
        const allRecipesData = [];
        
        // Получаем все категории рецептов
        Object.keys(window.CraftingRecipes.recipes).forEach(category => {
          const categoryRecipes = window.CraftingRecipes.recipes[category] || [];
          allRecipesData.push.apply(allRecipesData, categoryRecipes);
        });
        
        setAllRecipes(allRecipesData);
        setRecipes(allRecipesData);
      }
    } catch (error) {
      console.error('Error loading recipes from module:', error);
    }
  };
  
  // Функция для загрузки ресурсов пользователя из базы данных
  const loadResourcesFromDatabase = async () => {
    try {
      if (window.ModalModule && typeof window.ModalModule.loadUserResources === 'function') {
        // Используем функцию загрузки ресурсов из ModalModule
        const resources = await window.ModalModule.loadUserResources();
        
        if (resources) {
          // Для отладки выведем полученные ресурсы
          console.log('[CraftingModule] Resources loaded:', Object.keys(resources).join(', '));
          
          // Загружаем специальные ресурсы из IndexedDB
          try {
            // Определяем ID пользователя
            let telegramId;
            if (window.Telegram && window.Telegram.WebApp && 
                window.Telegram.WebApp.initDataUnsafe && 
                window.Telegram.WebApp.initDataUnsafe.user) {
              telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            } else {
              telegramId = localStorage.getItem('telegramId');
            }
            
            if (telegramId) {
              // Открываем базу данных
              const dbRequest = indexedDB.open('UserResourcesDB', 10);
              
              const specialResources = await new Promise((resolve, reject) => {
                dbRequest.onerror = (event) => {
                  reject(event.target.error);
                };
                
                dbRequest.onsuccess = (event) => {
                  const db = event.target.result;
                  
                  // Проверяем наличие хранилища ресурсов
                  if (!db.objectStoreNames.contains('resources')) {
                    db.close();
                    resolve({});
                    return;
                  }
                  
                  const resourceId = `user_${telegramId}`;
                  const transaction = db.transaction('resources', 'readonly');
                  const resourcesStore = transaction.objectStore('resources');
                  
                  const request = resourcesStore.get(resourceId);
                  
                  request.onsuccess = () => {
                    const userResources = request.result || {};
                    if (userResources && Object.keys(userResources).length > 0) {
                      // Фильтруем служебные поля из результата
                      const filteredResources = {};
                      Object.keys(userResources).forEach(key => {
                        // Исключаем поля id, telegramId, lastUpdated и другие служебные
                        if (!['id', 'telegramId', 'lastUpdated'].includes(key)) {
                          filteredResources[key] = userResources[key];
                        }
                      });
                      resolve(filteredResources);
                    } else {
                      resolve({});
                    }
                    db.close();
                  };
                  
                  request.onerror = (event) => {
                    db.close();
                    reject(event.target.error);
                  };
                };
              }).catch(error => {
                console.error('[CraftingModule] Ошибка при получении специальных ресурсов:', error);
                return {};
              });
              
              // Объединяем с основными ресурсами
              const combinedResources = { ...resources, ...specialResources };
              console.log('[CraftingModule] Специальные ресурсы из IndexedDB:', Object.keys(specialResources).join(', '));
              console.log('[CraftingModule] Объединенные ресурсы:', Object.keys(combinedResources).join(', '));
              
              // Обновляем состояние компонента
              setResources(combinedResources);
            } else {
              // Обновляем состояние компонента только с основными ресурсами
              setResources(resources);
            }
          } catch (dbError) {
            console.error('[CraftingModule] Ошибка при загрузке специальных ресурсов из IndexedDB:', dbError);
            // Обновляем состояние только с основными ресурсами при ошибке
            setResources(resources);
          }
          
          // Преобразуем объект ресурсов в массив предметов для отображения
          let inventoryItems = [];
          
          // Получаем каталог предметов если доступен
          let itemCatalog = {};
          if (window.ItemCatalogModule && typeof window.ItemCatalogModule.getItemCatalog === 'function') {
            itemCatalog = window.ItemCatalogModule.getItemCatalog();
          }
          
          if (window.ItemCatalogModule && typeof window.ItemCatalogModule.resourcesObjectToArray === 'function') {
            // Используем функцию преобразования из ItemCatalogModule с передачей каталога предметов
            inventoryItems = window.ItemCatalogModule.resourcesObjectToArray(resources, itemCatalog);
          } else if (window.InventoryModule && typeof window.InventoryModule.resourcesObjectToArray === 'function') {
            // Используем функцию из InventoryModule если она доступна
            inventoryItems = window.InventoryModule.resourcesObjectToArray(resources, itemCatalog);
          } else {
            // Запасной вариант, если модуль ItemCatalog недоступен
            inventoryItems = Object.entries(resources)
              .filter(([key, value]) => {
                // Изменяем фильтрацию, чтобы учесть специальные ресурсы
                return (
                  // Значение должно быть больше 0
                  value > 0 && 
                  // Исключаем служебные поля и проблемные ресурсы
                  !['telegramid', 'spinsleft', 'streak', 'spins_left', 'spins', 'telegram_id', 'id', 'telegramId', 'lastUpdated', 'egg', 'loadedFromServer'].includes(key.toLowerCase())
                );
              })
              .map(([id, amount]) => {
                // Проверяем наличие предмета в каталоге
                const catalogItem = itemCatalog[id];
                
                if (catalogItem) {
                  return {
                    id: id,
                    item_id: catalogItem.item_id || id,
                    name: catalogItem.name || id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
                    qty: amount,
                    description: catalogItem.description || 'Resource',
                    rarity: catalogItem.rarity || 'Common',
                    type: catalogItem.type || 'Resource',
                    properties: catalogItem.properties || ''
                  };
                }
                
                // Определяем редкость по ID предмета если нет в каталоге
                let rarity = 'Common';
                if (id === 'onion' || id === 'candy' || id === 'coin' || id === 'ironingot') {
                  rarity = 'Rare';
                } else if (id === 'gemstone' || id === 'crystal') {
                  rarity = 'Epic';
                } else if (id === 'ancient_artifact') {
                  rarity = 'Mythic';
                } else if (id === 'leather' || id === 'ironore' || id === 'herbs') {
                  rarity = 'Uncommon';
                }
                
                return {
                  id: id,
                  item_id: id,
                  name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
                  qty: amount,
                  rarity: rarity,
                  type: id === 'onion' || id === 'coin' ? 'Currency' : 'Resource'
                };
              });
          }
          
          // Сортируем предметы по редкости
          let sortedInventoryItems = inventoryItems;
          
          if (window.InventoryModule && typeof window.InventoryModule.sortItemsByRarity === 'function') {
            sortedInventoryItems = window.InventoryModule.sortItemsByRarity(inventoryItems);
          } else {
            // Запасной вариант сортировки, если функция недоступна
            sortedInventoryItems = inventoryItems.sort((a, b) => {
              const rarityOrder = {
                'legendary': 1,
                'mythic': 2,
                'epic': 3,
                'rare': 4,
                'uncommon': 5,
                'common': 6,
                'default': 7
              };
              const rarityA = (a.rarity ? a.rarity.toLowerCase() : 'default');
              const rarityB = (b.rarity ? b.rarity.toLowerCase() : 'default');
              return (rarityOrder[rarityA] || rarityOrder['default']) - (rarityOrder[rarityB] || rarityOrder['default']);
            });
          }
          
          setInventoryItems(sortedInventoryItems);
          
          console.log('[CraftingModule] Ресурсы загружены из ModalModule:', resources);
          return true;
        }
      }
      
      // Запасной вариант, если ModalModule недоступен
      const telegramId = getTelegramId();
      
      if (!telegramId) {
        console.error('[CraftingModule] TelegramId not available');
        return false;
      }
      
      console.log('[CraftingModule] Loading resources from database for user:', telegramId);
      
      // Пытаемся загрузить ресурсы из базы данных через API
      const response = await fetch(`rpg.php?action=getUserResources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.resources) {
        console.log('[CraftingModule] Resources loaded successfully from database');
        
        // Преобразуем и устанавливаем ресурсы
        setResources(data.resources);
        
        // Преобразуем объект ресурсов в массив предметов для отображения
        // Получаем каталог предметов если доступен
        let itemCatalog = {};
        if (window.ItemCatalogModule && typeof window.ItemCatalogModule.getItemCatalog === 'function') {
          itemCatalog = window.ItemCatalogModule.getItemCatalog();
        }
        
        const inventoryItems = Object.entries(data.resources)
          .filter(([key, value]) => {
            // Изменяем фильтрацию, чтобы учесть специальные ресурсы
            return (
              // Значение должно быть больше 0
              value > 0 && 
              // Исключаем служебные поля и проблемные ресурсы
              !['telegramid', 'spinsleft', 'streak', 'spins_left', 'spins', 'telegram_id', 'id', 'telegramId', 'lastUpdated', 'egg', 'loadedFromServer', 'campfire_burn', 'furnace_burn'].includes(key.toLowerCase())
            );
          })
          .map(([id, amount]) => {
            // Проверяем наличие предмета в каталоге
            const catalogItem = itemCatalog[id];
            
            if (catalogItem) {
              return {
                id: id,
                item_id: catalogItem.item_id || id,
                name: catalogItem.name || id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
                qty: amount,
                description: catalogItem.description || 'Resource',
                rarity: catalogItem.rarity || 'Common',
                type: catalogItem.type || 'Resource'
              };
            }
            
            // Определяем редкость по ID предмета если нет в каталоге
            let rarity = 'Common';
            if (id === 'onion' || id === 'candy' || id === 'coin' || id === 'ironingot') {
              rarity = 'Rare';
            } else if (id === 'gemstone' || id === 'crystal') {
              rarity = 'Epic';
            } else if (id === 'ancient_artifact') {
              rarity = 'Mythic';
            } else if (id === 'leather' || id === 'ironore' || id === 'herbs') {
              rarity = 'Uncommon';
            }
            
            return {
              id: id,
              item_id: id,
              name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
              qty: amount,
              rarity: rarity,
              type: id === 'onion' || id === 'coin' ? 'Currency' : 'Resource'
            };
          });
        
        // Сортируем предметы по редкости
        let sortedInventoryItems = inventoryItems;
        
        if (window.InventoryModule && typeof window.InventoryModule.sortItemsByRarity === 'function') {
          sortedInventoryItems = window.InventoryModule.sortItemsByRarity(inventoryItems);
        } else {
          // Запасной вариант сортировки, если функция недоступна
          sortedInventoryItems = inventoryItems.sort((a, b) => {
            const rarityOrder = {
              'legendary': 1,
              'mythic': 2,
              'epic': 3,
              'rare': 4,
              'uncommon': 5,
              'common': 6,
              'default': 7
            };
            const rarityA = (a.rarity ? a.rarity.toLowerCase() : 'default');
            const rarityB = (b.rarity ? b.rarity.toLowerCase() : 'default');
            return (rarityOrder[rarityA] || rarityOrder['default']) - (rarityOrder[rarityB] || rarityOrder['default']);
          });
        }
        
        setInventoryItems(sortedInventoryItems);
        return true;
      } else {
        console.error('[CraftingModule] Failed to load resources:', data.message || 'Unknown error');
      return false;
      }
    } catch (error) {
      console.error('[CraftingModule] Error loading resources:', error.message);
      return false;
    }
  };
  
  // Добавим обработчик для закрытия меню при клике вне его
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterOptions(false);
      }
    }
    
    // Добавляем слушателя события только если меню открыто
    if (showFilterOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterOptions]);
  
  // Загрузка ресурсов пользователя и всех рецептов при монтировании компонента
  useEffect(() => {
    const loadResourcesAndRecipes = async () => {
      try {
        // Функция для загрузки скриптов
        const loadScript = (src) => {
          return new Promise((resolve, reject) => {
            // Проверяем, не загружен ли уже скрипт
            if (document.querySelector(`script[src="${src}"]`)) {
              console.log(`[CraftingModule] Скрипт ${src} уже загружен`);
              resolve();
              return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => {
              console.log(`[CraftingModule] Скрипт ${src} загружен успешно`);
              resolve();
            };
            
            script.onerror = (error) => {
              console.error(`[CraftingModule] Ошибка загрузки скрипта ${src}:`, error);
              reject(new Error(`Failed to load script: ${src}`));
            };
            
            document.body.appendChild(script);
          });
        };
        
        // Убедимся, что InventoryModule загружен
        if (!window.InventoryModule) {
          console.log('[CraftingModule] InventoryModule не загружен, пытаемся загрузить...');
          
          // Пытаемся загрузить модуль инвентаря
          try {
            await loadScript('source/js/rpg/inventory.js');
            console.log('[CraftingModule] InventoryModule успешно загружен');
          } catch (err) {
            console.error('[CraftingModule] Не удалось загрузить InventoryModule:', err);
          }
        }
        
        let userResources = {};
        
        // Пытаемся загрузить ресурсы через InventoryModule, если доступен
        if (window.InventoryModule && typeof window.InventoryModule.loadAllResources === 'function') {
          console.log('[CraftingModule] Загрузка ресурсов через InventoryModule.loadAllResources');
          const result = await window.InventoryModule.loadAllResources();
          if (result && result.resources) {
            userResources = result.resources;
            // Также устанавливаем предметы инвентаря если они доступны
            if (result.items && Array.isArray(result.items)) {
              setInventoryItems(result.items);
            }
          }
        } else {
          // Запасной вариант - обычная загрузка из IndexedDB
          console.log('[CraftingModule] Загрузка ресурсов через getUserResourcesFromIndexedDB');
          userResources = await getUserResourcesFromIndexedDB();
        }
        
        if (userResources && Object.keys(userResources).length > 0) {
          setResources(userResources);
        }
        
        // Загружаем все рецепты из всех категорий
        if (window.CraftingRecipes) {
          const allRecipesData = [];
          
          // Получаем все категории рецептов
          Object.keys(window.CraftingRecipes.recipes).forEach(category => {
            const categoryRecipes = window.CraftingRecipes.recipes[category] || [];
            allRecipesData.push(...categoryRecipes);
          });
          
          setAllRecipes(allRecipesData);
          setRecipes(allRecipesData);
        } else {
        }
      } catch (error) {
      } finally {
        setLoadingResources(false);
      }
    };
    
    loadResourcesAndRecipes();
    
    // Загружаем ресурсы из базы данных
    loadResourcesFromDatabase();
    
    // Добавляем слушатель события обновления ресурсов
    const handleResourcesUpdated = (event) => {
      // Проверяем, не было ли такое событие уже обработано ранее
      const eventId = (event && event.detail && event.detail.timestamp) || Date.now();
      if (lastEventId === eventId) return;
      lastEventId = eventId;
      
      // Пропускаем, если идет принудительное обновление
      if (forcedUpdateInProgress) return;
      
      // Защита от зацикливания
      const now = Date.now();
      if (isResourceUpdateInProgress || (now - lastResourceUpdateTimestamp < UPDATE_THRESHOLD)) {
        eventUpdateCount++;
        
        // Если слишком много событий за короткий период, игнорируем
        if (eventUpdateCount > MAX_EVENT_COUNT) {
          console.warn('[CraftingModule] Слишком много событий обновления ресурсов, игнорируем');
          return;
        }
        return;
      }
      
      // Сбрасываем счетчик и устанавливаем флаг обновления
      eventUpdateCount = 0;
      isResourceUpdateInProgress = true;
      lastResourceUpdateTimestamp = now;
      
      // Обновляем ресурсы с подавлением событий
      if (window.CraftingModule && typeof window.CraftingModule.loadResourcesFromDatabase === 'function') {
        try {
          window.CraftingModule.loadResourcesFromDatabase({ suppressEvents: true });
        } catch (e) {
          window.CraftingModule.loadResourcesFromDatabase();
        }
      }
      
      // Снимаем флаг обновления после задержки
      setTimeout(() => {
        isResourceUpdateInProgress = false;
      }, 1000); // Увеличиваем задержку до 1 секунды
    };
    
    const handleCraftingRefresh = (event) => {
      // Проверяем, не было ли такое событие уже обработано ранее
      const eventId = (event && event.detail && event.detail.timestamp) || Date.now();
      if (lastEventId === eventId) return;
      lastEventId = eventId;
      
      // Пропускаем, если идет принудительное обновление
      if (forcedUpdateInProgress) return;
      
      // Защита от зацикливания
      const now = Date.now();
      if (isResourceUpdateInProgress || (now - lastResourceUpdateTimestamp < UPDATE_THRESHOLD)) {
        eventUpdateCount++;
        
        // Если слишком много событий за короткий период, игнорируем
        if (eventUpdateCount > MAX_EVENT_COUNT) {
          console.warn('[CraftingModule] Слишком много событий обновления крафта, игнорируем');
          return;
        }
        return;
      }
      
      // Сбрасываем счетчик и устанавливаем флаг обновления
      eventUpdateCount = 0;
      isResourceUpdateInProgress = true;
      lastResourceUpdateTimestamp = now;
      
      // Обновляем ресурсы, но не вызываем новые события
      if (window.CraftingModule && typeof window.CraftingModule.loadResourcesFromDatabase === 'function') {
        // Передаем параметр, указывающий не отправлять новые события
        try {
          window.CraftingModule.loadResourcesFromDatabase({ suppressEvents: true });
        } catch (e) {
          window.CraftingModule.loadResourcesFromDatabase();
        }
      }
      
      // Снимаем флаг обновления после задержки
      setTimeout(() => {
        isResourceUpdateInProgress = false;
      }, 1000); // Увеличиваем задержку до 1 секунды
    };
    
    // Регистрируем обработчики событий
    window.addEventListener('resourcesUpdated', handleResourcesUpdated);
    window.addEventListener('crafting-refresh', handleCraftingRefresh);
    window.addEventListener('inventory-update', handleResourcesUpdated);
    window.addEventListener('refresh-inventory', handleCraftingRefresh);
    
    // Добавляем обработчик для принудительного обновления
    const handleForceCraftingUpdate = (event) => {
      console.log('[CraftingModule] Получено событие принудительного обновления');
      
      // Получаем ресурсы из события или используем текущие
      let resources = {};
      if (event && event.detail && event.detail.resources) {
        resources = event.detail.resources;
      } else if (event && event.detail && event.detail.data && event.detail.data.resources) {
        resources = event.detail.data.resources;
      } else {
        // Используем текущие ресурсы
        resources = {};
      }
      
      // Если в событии переданы ресурсы, используем их
      if (Object.keys(resources).length > 0) {
        // Обновляем состояние компонента
        setResources(resources);
        
        // Преобразуем объект ресурсов в массив предметов для отображения
        let updatedInventoryItems = [];
        
        // Получаем каталог предметов если доступен
        let itemCatalog = {};
        if (window.ItemCatalogModule && typeof window.ItemCatalogModule.getItemCatalog === 'function') {
          itemCatalog = window.ItemCatalogModule.getItemCatalog();
        }
        
        if (window.ItemCatalogModule && typeof window.ItemCatalogModule.resourcesObjectToArray === 'function') {
          // Используем функцию преобразования из ItemCatalogModule с передачей каталога предметов
          updatedInventoryItems = window.ItemCatalogModule.resourcesObjectToArray(resources, itemCatalog);
        } else if (window.InventoryModule && typeof window.InventoryModule.resourcesObjectToArray === 'function') {
          // Используем функцию из InventoryModule если она доступна
          updatedInventoryItems = window.InventoryModule.resourcesObjectToArray(resources, itemCatalog);
        } else {
          // Запасной вариант, если модуль ItemCatalog недоступен
          updatedInventoryItems = Object.entries(resources)
            .filter(([key, value]) => 
              value > 0 && 
              !['telegramid', 'spinsleft', 'streak', 'spins_left', 'spins', 'telegram_id', 'loadedFromServer'].includes(key.toLowerCase())
            )
            .map(([id, amount]) => {
              // Проверяем наличие предмета в каталоге
              const catalogItem = itemCatalog[id];
              
              if (catalogItem) {
                return {
                  id: id,
                  item_id: catalogItem.item_id || id,
                  name: catalogItem.name || id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
              qty: amount,
                  description: catalogItem.description || 'Resource',
                  rarity: catalogItem.rarity || 'Common',
                  type: catalogItem.type || 'Resource',
                  properties: catalogItem.properties || ''
                };
              }
              
              // Определяем редкость по ID предмета если нет в каталоге
              let rarity = 'Common';
              if (id === 'onion' || id === 'candy' || id === 'coin' || id === 'ironingot') {
                rarity = 'Rare';
              } else if (id === 'gemstone' || id === 'crystal') {
                rarity = 'Epic';
              } else if (id === 'ancient_artifact') {
                rarity = 'Mythic';
              } else if (id === 'leather' || id === 'metal_ore' || id === 'herbs') {
                rarity = 'Uncommon';
              }
              
              return {
                id: id,
                item_id: id,
                name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
                qty: amount,
                rarity: rarity,
                type: id === 'onion' || id === 'coin' ? 'Currency' : 'Resource'
              };
            });
        }
        
        // Сортируем предметы по редкости
        let sortedInventoryItems = updatedInventoryItems;
        
        if (window.InventoryModule && typeof window.InventoryModule.sortItemsByRarity === 'function') {
          sortedInventoryItems = window.InventoryModule.sortItemsByRarity(updatedInventoryItems);
        } else {
          // Запасной вариант сортировки, если функция недоступна
          sortedInventoryItems = updatedInventoryItems.sort((a, b) => {
            const rarityOrder = {
              'legendary': 1,
              'mythic': 2,
              'epic': 3,
              'rare': 4,
              'uncommon': 5,
              'common': 6,
              'default': 7
            };
            const rarityA = (a.rarity ? a.rarity.toLowerCase() : 'default');
            const rarityB = (b.rarity ? b.rarity.toLowerCase() : 'default');
            return (rarityOrder[rarityA] || rarityOrder['default']) - (rarityOrder[rarityB] || rarityOrder['default']);
          });
        }
        
        // Обновляем массив предметов инвентаря
        setInventoryItems(sortedInventoryItems);
      } else {
        // Загружаем ресурсы из доступных источников
        loadResourcesFromDatabase();
      }
      
      // Обновляем список рецептов, если нужно
      if (event && event.detail && event.detail.refreshRecipes) {
        refreshRecipes();
      }
    };
    
    window.addEventListener('force-crafting-update', handleForceCraftingUpdate);
    
    // Очистка обработчиков событий при размонтировании
    return () => {
      window.removeEventListener('resourcesUpdated', handleResourcesUpdated);
      window.removeEventListener('crafting-refresh', handleCraftingRefresh);
      window.removeEventListener('inventory-update', handleResourcesUpdated);
      window.removeEventListener('refresh-inventory', handleCraftingRefresh);
      window.removeEventListener('force-crafting-update', handleForceCraftingUpdate);
      
      // Очищаем интервал проверки активных крафтов
      if (window.craftTimerInterval) {
        clearInterval(window.craftTimerInterval);
        window.craftTimerInterval = null;
      }
    };
  }, []);
  
  // Обновляем filteredRecipes для использования всех категорий
  const filteredRecipes = useMemo(() => {
    let recipesToFilter = allRecipes.slice();

    // Исключаем рецепты с категорией food и metal
    recipesToFilter = recipesToFilter.filter(recipe => {
      const cat = recipe.category ? recipe.category.toLowerCase() : '';
      return cat !== 'food' && cat !== 'metal';
    });
    
    // Фильтрация по категории
    if (selectedCategory !== 'All') {
      recipesToFilter = recipesToFilter.filter(recipe => 
        recipe.category && recipe.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    // Фильтрация по поисковому запросу
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      recipesToFilter = recipesToFilter.filter(recipe => 
        recipe.name.toLowerCase().includes(query) || 
        (recipe.description && recipe.description.toLowerCase().includes(query)) ||
        (recipe.category && recipe.category.toLowerCase().includes(query))
      );
    }
    
    // Сортировка: сначала доступные разблокированные, затем недоступные разблокированные, затем заблокированные
    return recipesToFilter.sort((a, b) => {
      // Проверка заблокированности
      const aLocked = a.unlockLevel > playerLevel;
      const bLocked = b.unlockLevel > playerLevel;
      
      // Проверка доступности материалов для крафта
      const aAvailable = a.materials && Object.entries(a.materials).every(([mat, amt]) => 
        (resources[mat] || 0) >= amt
      );
      const bAvailable = b.materials && Object.entries(b.materials).every(([mat, amt]) => 
        (resources[mat] || 0) >= amt
      );
      
      // Приоритет сортировки:
      // 1. Доступные разблокированные рецепты
      // 2. Недоступные разблокированные рецепты
      // 3. Заблокированные рецепты
      
      if (!aLocked && !bLocked) {
        // Оба разблокированы - сортируем по доступности материалов
        if (aAvailable && !bAvailable) return -1;
        if (!aAvailable && bAvailable) return 1;
      } else if (!aLocked && bLocked) {
        // a разблокирован, b заблокирован
        return -1;
      } else if (aLocked && !bLocked) {
        // a заблокирован, b разблокирован
        return 1;
      }
      
      // Внутри одной группы сортируем по редкости, затем по имени
      const rarityOrder = { 'legendary': 1, 'mythic': 2, 'epic': 3, 'rare': 4, 'uncommon': 5, 'common': 6 };
      const aRarity = a.rarity ? rarityOrder[a.rarity.toLowerCase()] || 999 : 999;
      const bRarity = b.rarity ? rarityOrder[b.rarity.toLowerCase()] || 999 : 999;
      
      if (aRarity !== bRarity) return aRarity - bRarity;
      
      // В конце сортировка по имени
      return a.name.localeCompare(b.name);
    });
  }, [allRecipes, selectedCategory, searchQuery, showUnavailable, resources]);

  // Теперь обновим фильтр для отображения реальных категорий из данных рецептов
  
  // Получаем уникальные категории из всех рецептов
  const uniqueCategories = useMemo(() => {
    const categories = new Set();
    allRecipes.forEach(recipe => {
      if (recipe.category) {
        // Исключаем категории Metal и Food
        const categoryLower = recipe.category.toLowerCase();
        if (categoryLower !== 'metal' && categoryLower !== 'food') {
          // Переведем первую букву категории в верхний регистр для отображения
          const formattedCategory = recipe.category.charAt(0).toUpperCase() + recipe.category.slice(1);
          categories.add(formattedCategory);
        }
      }
    });
    return Array.from(categories).sort();
  }, [allRecipes]);

  // Изменим получение категорий, чтобы отображать их в нужном порядке
  const orderedCategories = useMemo(() => {
    const order = ["Weapons", "Armor", "Potions", "Tools", "Structures"];
    
    // Создаем копию уникальных категорий
    const categories = Array.from(uniqueCategories);
    
    // Исключаем категории Metal и Food
    const filteredCategories = categories.filter(cat => 
      cat.toLowerCase() !== 'metal' && cat.toLowerCase() !== 'food'
    );
    
    // Сортируем в соответствии с порядком
    return filteredCategories.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      
      // Если обе категории есть в списке порядка
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // Если только a в списке порядка
      if (indexA !== -1) return -1;
      
      // Если только b в списке порядка
      if (indexB !== -1) return 1;
      
      // Если обеих нет в списке порядка, сортируем по алфавиту
      return a.localeCompare(b);
    });
  }, [uniqueCategories]);
  
  // Обновим JSX для выпадающего меню фильтров с использованием orderedCategories
  
  // Функция для выбора рецепта
  const handleSelectRecipe = (recipe) => {
    // Заменяем прямой вызов на использование handleCraftItemClick
    handleCraftItemClick(recipe.id);
  };
  
  // Обработка наведения на рецепт
  const handleRecipeMouseEnter = (recipe, e) => {
    // Получаем размеры и положение элемента
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Получаем размеры окна браузера
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Предполагаемые размеры тултипа
    const tooltipWidth = 220;
    const tooltipHeight = 200; // Примерная высота, может меняться в зависимости от содержимого
    
    // Расчёт позиции тултипа
    let posX = rect.left + rect.width + 5;
    let posY = rect.top;
    
    // Проверка, не выходит ли тултип за границы окна по ширине
    if (posX + tooltipWidth > windowWidth) {
      // Если выходит, размещаем слева от элемента
      posX = rect.left - tooltipWidth - 5;
      
      // Если и слева тоже не помещается, размещаем по центру окна
      if (posX < 0) {
        posX = (windowWidth - tooltipWidth) / 2;
      }
    }
    
    // Проверка, не выходит ли тултип за границы окна по высоте
    if (posY + tooltipHeight > windowHeight) {
      // Если выходит, корректируем позицию вверх
      posY = windowHeight - tooltipHeight - 10;
      
      // Если корректировка привела к отрицательной позиции, устанавливаем минимальное значение
      if (posY < 10) {
        posY = 10;
      }
    }
    
    setTooltipPosition({
      x: posX,
      y: posY
    });
    
    setHoveredRecipe(recipe);
  };
  
  const handleRecipeMouseLeave = () => {
    setHoveredRecipe(null);
  };
  
  // Функция для крафта выбранного предмета
  const handleCraft = async () => {
    try {
      // Проверяем наличие выбранного рецепта
      if (!selectedRecipe) {
        console.error('[CraftingModule] Нет выбранного рецепта для крафта');
        return;
      }
      
      // Проверяем, достаточно ли ресурсов для крафта
      if (!canCraftRecipe(selectedRecipe)) {
        console.error('[CraftingModule] Недостаточно ресурсов для крафта', selectedRecipe.id);
        
        // Показываем сообщение об ошибке
        setMessage({
          type: 'error',
          text: 'Недостаточно ресурсов для крафта'
        });
        
        return;
      }
      
      // Блокируем интерфейс на время крафта
      setIsCrafting(true);
      
      // Показываем сообщение о начале крафта
      setMessage({
        type: 'info',
        text: 'Начало крафта...'
      });
      
      // Крафтим предмет через функцию craftItem
      const result = await craftItem(selectedRecipe.id, selectedRecipe.materials, 1);
      
      if (result && result.success) {
        // Обновляем ресурсы после успешного крафта
        const updatedResources = result.resources || {};
        
        // Устанавливаем новые значения ресурсов
        setResources(updatedResources);
        
        // Преобразуем объект ресурсов в массив предметов для отображения
        let updatedInventoryItems = [];
        
        // Получаем каталог предметов если доступен
        let itemCatalog = {};
        if (window.ItemCatalogModule && typeof window.ItemCatalogModule.getItemCatalog === 'function') {
          itemCatalog = window.ItemCatalogModule.getItemCatalog();
        }
        
        // Преобразуем объект ресурсов в массив предметов
        if (window.ItemCatalogModule && typeof window.ItemCatalogModule.resourcesObjectToArray === 'function') {
          // Используем функцию преобразования из ItemCatalogModule с передачей каталога
          updatedInventoryItems = window.ItemCatalogModule.resourcesObjectToArray(updatedResources, itemCatalog);
        } else if (window.InventoryModule && typeof window.InventoryModule.resourcesObjectToArray === 'function') {
          // Используем функцию из InventoryModule если она доступна
          updatedInventoryItems = window.InventoryModule.resourcesObjectToArray(updatedResources, itemCatalog);
        } else {
          // Запасной вариант, если модуль ItemCatalog недоступен
          updatedInventoryItems = Object.entries(updatedResources)
            .filter(([key, value]) => 
              value > 0 && 
              !['telegramid', 'spinsleft', 'streak', 'spins_left', 'spins', 'telegram_id', 'loadedFromServer'].includes(key.toLowerCase())
            )
            .map(([id, amount]) => {
              // Проверяем наличие предмета в каталоге
              const catalogItem = itemCatalog[id];
              
              if (catalogItem) {
                return {
                  id: id,
                  item_id: catalogItem.item_id || id,
                  name: catalogItem.name || id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
                  qty: amount,
                  description: catalogItem.description || 'Resource',
                  rarity: catalogItem.rarity || 'Common',
                  type: catalogItem.type || 'Resource',
                  properties: catalogItem.properties || ''
                };
              }
              
              // Определяем редкость по ID предмета если нет в каталоге
              let rarity = 'Common';
              if (id === 'onion' || id === 'candy' || id === 'coin' || id === 'ironingot') {
                rarity = 'Rare';
              } else if (id === 'gemstone' || id === 'crystal') {
                rarity = 'Epic';
              } else if (id === 'ancient_artifact') {
                rarity = 'Mythic';
              } else if (id === 'leather' || id === 'metal_ore' || id === 'herbs') {
                rarity = 'Uncommon';
              }
              
              return {
                id: id,
                item_id: id,
                name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
                qty: amount,
                rarity: rarity,
                type: id === 'onion' || id === 'coin' ? 'Currency' : 'Resource'
              };
            });
        }
        
        // Сортируем предметы по редкости
        let sortedInventoryItems = updatedInventoryItems;
        
        if (window.InventoryModule && typeof window.InventoryModule.sortItemsByRarity === 'function') {
          sortedInventoryItems = window.InventoryModule.sortItemsByRarity(updatedInventoryItems);
        } else {
          // Запасной вариант сортировки, если функция недоступна
          sortedInventoryItems = updatedInventoryItems.sort((a, b) => {
            const rarityOrder = {
              'legendary': 1,
              'mythic': 2,
              'epic': 3,
              'rare': 4,
              'uncommon': 5,
              'common': 6,
              'default': 7
            };
            const rarityA = (a.rarity ? a.rarity.toLowerCase() : 'default');
            const rarityB = (b.rarity ? b.rarity.toLowerCase() : 'default');
            return (rarityOrder[rarityA] || rarityOrder['default']) - (rarityOrder[rarityB] || rarityOrder['default']);
          });
        }
        
        // Обновляем массив предметов инвентаря
        setInventoryItems(sortedInventoryItems);
        
        // Сохраняем обновленные ресурсы в глобальные переменные
        window.globalUserResources = updatedResources;
        
        // Отправляем событие об обновлении ресурсов
        window.dispatchEvent(new CustomEvent('resourcesUpdated', {
          detail: {
            resources: updatedResources,
            timestamp: Date.now()
          }
        }));
        
        // Показываем сообщение об успехе
        setMessage({
          type: 'success',
          text: `${selectedRecipe.name} успешно скрафчен!`
        });
      } else {
        // Показываем сообщение об ошибке при крафте
        setMessage({
          type: 'error',
          text: result && result.message ? result.message : 'Ошибка при крафте предмета'
        });
      }
    } catch (error) {
      console.error('[CraftingModule] Ошибка при крафте:', error);
      
      // Показываем сообщение об ошибке
      setMessage({
        type: 'error',
        text: 'Произошла ошибка при крафте'
      });
    } finally {
      // Разблокируем интерфейс
      setIsCrafting(false);
    }
  };
  
  // Проверка достаточности ресурсов для крафта
  const canCraftRecipe = (recipe) => {
    // Сначала проверяем уровень доступа
    if (recipe.unlockLevel > playerLevel) {
      return false;
    }
    
    // Проверяем, не является ли это костром или печью, которые уже скрафчены
    if ((recipe.id === 'campfire' && findResourceAmount('campfire') >= 1) || 
        (recipe.id === 'furnace' && findResourceAmount('furnace') >= 1)) {
      return false;
    }
    
    // Проверяем наличие материалов
    if (recipe.materials) {
      for (const [material, amount] of Object.entries(recipe.materials)) {
        // Используем новую функцию для поиска ресурсов
        const userHasAmount = findResourceAmount(material);
        
        if (userHasAmount < amount) {
          return false;
        }
      }
      return true;
    }
    
    return false;
  };
  
  // Получить время изготовления в удобном формате
  const formatCraftTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds} sec`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} min${remainingSeconds > 0 ? ' ' + remainingSeconds + ' sec' : ''}`;
    }
  };
  
  // Стиль для отображения редкости
  const getRarityStyle = (rarity) => {
    if (!rarity) return {};
    
    const colors = {
      'common': '#aaaaaa',
      'uncommon': '#1eff00',
      'rare': '#0070dd',
      'epic': '#a335ee',
      'legendary': '#ff8000',
      'mythic': '#e6cc80'
    };
    
    return {
      color: colors[rarity.toLowerCase()] || '#aaaaaa'
    };
  };
  
  // Получить цвет рамки в зависимости от редкости
  const getRarityBorderColor = (rarity) => {
    if (!rarity) return '#aaaaaa';
    
    const colors = {
      'common': '#aaaaaa',
      'uncommon': '#1eff00',
      'rare': '#0070dd',
      'epic': '#a335ee',
      'legendary': '#ff8000',
      'mythic': '#e6cc80'
    };
    
    return colors[rarity.toLowerCase()] || '#aaaaaa';
  };
  
  // Получаем количество страниц и текущие рецепты для отображения
  const totalPages = Math.ceil(filteredRecipes.length / recipesPerPage);
  const currentRecipes = filteredRecipes.slice(
    currentPage * recipesPerPage, 
    (currentPage + 1) * recipesPerPage
  );
  
  // Функции для переключения страниц
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Сбрасываем текущую страницу при изменении фильтров
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCategory, searchQuery, showUnavailable]);
  
  // Добавляем состояние для хранения выбранного предмета материалов
  const [selectedItem, setSelectedItem] = useState(null);

  // Обработчик клика по предмету инвентаря
  const handleInventoryItemClick = (item) => {
    try {
      // Проверка наличия ModalModule и функции showItemDetailsModal
      if (window.ModalModule && typeof window.ModalModule.showItemDetailsModal === 'function') {
        // Используем ID предмета, если у нас объект, или сам item, если это строка
        const itemId = typeof item === 'object' && item.id ? item.id : item;
        
        // Устанавливаем источник вызова модального окна как 'inventory'
        window.lastModalSource = 'inventory';
        
        window.ModalModule.showItemDetailsModal(itemId);
      } else {
      }
    } catch (error) {
    }
  };
  
  // Функция для ручного обновления кэша изображений и рецептов
  const handleForceRefresh = () => {
    setRefreshingCache(true);
    
    try {
      // Очищаем кэш изображений и рецептов
      const success = clearImageCacheAndStorage();
      
      // Перезагружаем скрипт рецептов
      const recipeScriptSrc = `source/js/rpg/crafting/recipes.js?v=${Date.now()}`;
      const scriptElement = document.createElement('script');
      scriptElement.type = 'text/babel';
      scriptElement.src = recipeScriptSrc;
      document.head.appendChild(scriptElement);
      
      scriptElement.onload = () => {
        // Таймаут для уверенности, что скрипт полностью выполнился
        setTimeout(() => {
          if (window.CraftingRecipes) {
            loadRecipesFromModule();
            // Принудительное обновление страницы
            setTimeout(() => {
              setRefreshingCache(false);
            }, 1000);
          } else {
            setRefreshingCache(false);
          }
        }, 300);
      };
      
      scriptElement.onerror = (error) => {
        setRefreshingCache(false);
      };
    } catch (error) {
      setRefreshingCache(false);
    }
  };
  
  // Добавляю функцию для проверки активных крафтов
  useEffect(() => {
    // Проверка активных крафтов при загрузке компонента
    if (window.activeCraftTimers && Object.keys(window.activeCraftTimers).length > 0) {
      // Запускаем функцию обновления таймеров
      if (typeof window.updateCraftingTimers === 'function') {
        window.updateCraftingTimers();
      }
      
      // Если нет интервала, запускаем его
      if (!window.craftTimerInterval) {
        window.craftTimerInterval = setInterval(() => {
          if (typeof window.updateCraftingTimers === 'function') {
            window.updateCraftingTimers();
          }
        }, 1000);
      }
    }
  }, []);
  
  // Добавляем стили для карточек рецептов и индикаторов крафта
  useEffect(() => {
    // Создаем элемент стиля
    if (!document.getElementById('recipe-craft-progress-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'recipe-craft-progress-styles';
      // Styles moved to source/style/rpg.css
      document.head.appendChild(styleElement);
    }
  }, []);
  
  // Обработчик клика по предмету в интерфейсе крафта
  const handleCraftItemClick = (itemId) => {
    console.log(`[CraftingModule] Клик по рецепту ${itemId}`);
    
    // Устанавливаем источник вызова модального окна как 'crafting'
    window.lastModalSource = 'crafting';
    
    // Открываем модальное окно с деталями рецепта
    if (window.ModalModule && typeof window.ModalModule.showItemDetailsModal === 'function') {
      window.ModalModule.showItemDetailsModal(itemId, true, null, {
        source: 'compact-recipes-container'
      });
    }
  };
  
  // Вспомогательная функция для поиска количества ресурсов по ID с учетом различных форматов
  const findResourceAmount = (resourceId) => {
    if (!resourceId) return 0;
    
    // Специальная обработка для woodlog / wood log
    if (resourceId === 'wood log' || resourceId === 'Wood Log' || resourceId === 'wood_log' || resourceId === 'Wood_Log') {
      const woodLogVariants = ['woodlog', 'Woodlog', 'WOODLOG', 'wood log', 'Wood Log', 'WOOD LOG', 'wood_log', 'Wood_Log', 'WOOD_LOG'];
      
      for (const variant of woodLogVariants) {
        if (resources[variant] !== undefined) {
          console.log(`[DEBUG] Found wood log as ${variant} with amount ${resources[variant]}`);
          return parseInt(resources[variant]) || 0;
        }
      }
    }
    
    // Специальная обработка для ironore / iron ore
    if (resourceId === 'iron ore' || resourceId === 'Iron Ore' || resourceId === 'iron_ore' || resourceId === 'Iron_Ore') {
      const ironOreVariants = ['ironore', 'Ironore', 'IRONORE', 'iron ore', 'Iron Ore', 'IRON ORE', 'iron_ore', 'Iron_Ore', 'IRON_ORE'];
      
      for (const variant of ironOreVariants) {
        if (resources[variant] !== undefined) {
          console.log(`[DEBUG] Found iron ore as ${variant} with amount ${resources[variant]}`);
          return parseInt(resources[variant]) || 0;
        }
      }
    }
    
    // Специальная обработка для ironingot / iron ingot
    if (resourceId === 'iron ingot' || resourceId === 'Iron Ingot' || resourceId === 'iron_ingot' || resourceId === 'Iron_Ingot') {
      const ironIngotVariants = ['ironingot', 'Ironingot', 'IRONINGOT', 'iron ingot', 'Iron Ingot', 'IRON INGOT', 'iron_ingot', 'Iron_Ingot', 'IRON_INGOT'];
      
      for (const variant of ironIngotVariants) {
        if (resources[variant] !== undefined) {
          console.log(`[DEBUG] Found iron ingot as ${variant} with amount ${resources[variant]}`);
          return parseInt(resources[variant]) || 0;
        }
      }
    }

    // Создаем различные варианты написания ID
    const variants = [
      resourceId, // Оригинальный ID
      resourceId.toLowerCase(), // ID в нижнем регистре
      resourceId.toUpperCase(), // ID в верхнем регистре
      resourceId.charAt(0).toUpperCase() + resourceId.slice(1), // ID с заглавной буквы
      resourceId.toLowerCase().replace(/\s+/g, ''), // ID без пробелов
      resourceId.toLowerCase().replace(/\s+/g, '_'), // ID с подчеркиваниями вместо пробелов
      resourceId.charAt(0).toUpperCase() + resourceId.slice(1).replace(/\s+/g, ''), // ID с заглавной буквы без пробелов
      resourceId.charAt(0).toUpperCase() + resourceId.slice(1).replace(/\s+/g, '_') // ID с заглавной буквы и подчеркиваниями
    ];
    
    // Конвертация woodlog -> wood log и наоборот
    if (resourceId === 'woodlog' || resourceId === 'Woodlog' || resourceId === 'WOODLOG') {
      variants.push('wood log', 'Wood Log', 'WOOD LOG', 'wood_log', 'Wood_Log', 'WOOD_LOG');
    }
    
    // Конвертация ironore -> iron ore и наоборот
    if (resourceId === 'ironore' || resourceId === 'Ironore' || resourceId === 'IRONORE') {
      variants.push('iron ore', 'Iron Ore', 'IRON ORE', 'iron_ore', 'Iron_Ore', 'IRON_ORE');
    }
    
    // Конвертация ironingot -> iron ingot и наоборот
    if (resourceId === 'ironingot' || resourceId === 'Ironingot' || resourceId === 'IRONINGOT') {
      variants.push('iron ingot', 'Iron Ingot', 'IRON INGOT', 'iron_ingot', 'Iron_Ingot', 'IRON_INGOT');
    }
    
    // Проверяем наличие ресурса в каждом из вариантов
    for (const variant of variants) {
      if (resources[variant] !== undefined) {
        // console.log(`[DEBUG] Found resource ${resourceId} as ${variant} with amount ${resources[variant]}`);
        return parseInt(resources[variant]) || 0;
      }
    }
    
    // Если ничего не нашли, дополнительно проверим ресурсы в нижнем регистре с подчеркиваниями
    const resourceLower = resourceId.toLowerCase().replace(/\s+/g, '_');
    if (resources[resourceLower] !== undefined) {
      return parseInt(resources[resourceLower]) || 0;
    }
    
    // console.log(`[DEBUG] Resource ${resourceId} not found in variants: ${variants.join(', ')}`);
    return 0;
  };
  
  // Получение актуального уровня игрока с fallback
  const getActualPlayerLevel = () => {
    let level = 1;
    if (window.ModalModule && typeof window.ModalModule.getPlayerLevel === 'function') {
      try {
        level = window.ModalModule.getPlayerLevel();
        if (typeof level === 'number' && level > 0) return level;
      } catch (e) {}
    }
    if (window.playerLevel && typeof window.playerLevel === 'number') {
      return window.playerLevel;
    }
    try {
      const lsLevel = parseInt(localStorage.getItem('rpg_user_level'), 10);
      if (!isNaN(lsLevel) && lsLevel > 0) return lsLevel;
    } catch (e) {}
    return 1;
  };
  
  // useEffect для инициализации уровня игрока и его обновления при событиях
  useEffect(() => {
    const updateLevel = () => {
      const actualLevel = getActualPlayerLevel();
      setPlayerLevel(prev => (prev !== actualLevel ? actualLevel : prev));
    };
    updateLevel();
    window.addEventListener('resourcesUpdated', updateLevel);
    window.addEventListener('crafting-page-opened', updateLevel);
    return () => {
      window.removeEventListener('resourcesUpdated', updateLevel);
      window.removeEventListener('crafting-page-opened', updateLevel);
    };
  }, []);
  
  // Вспомогательная функция для поиска ресурса без учета регистра
  const getResourceAmountCaseInsensitive = (resourceId) => {
    if (!resourceId) return 0;
    if (resources[resourceId] !== undefined) return resources[resourceId];
    // Пробуем разные варианты регистра
    const variants = [
      resourceId.toLowerCase(),
      resourceId.toUpperCase(),
      resourceId.charAt(0).toUpperCase() + resourceId.slice(1),
      resourceId.replace(/_/g, ' '),
      resourceId.replace(/ /g, '_'),
      resourceId.charAt(0).toUpperCase() + resourceId.slice(1).toLowerCase(),
    ];
    for (const v of variants) {
      if (resources[v] !== undefined) return resources[v];
    }
    // Пробуем найти по ключу без пробелов и с подчеркиванием
    const compact = resourceId.replace(/\s+/g, '').toLowerCase();
    for (const key of Object.keys(resources)) {
      if (key.replace(/\s+/g, '').toLowerCase() === compact) return resources[key];
    }
    return 0;
  };
  
  // Добавляем CSS-анимацию для выпадающего меню
  useEffect(() => {
    // Создаем элемент стиля, если его ещё нет
    if (!document.getElementById('crafting-filter-animations')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'crafting-filter-animations';
      styleElement.textContent = `
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .filter-dropdown {
          animation: fadeIn 0.2s ease-out;
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    return () => {
      // Удаляем стили при размонтировании компонента
      const styleElement = document.getElementById('crafting-filter-animations');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);
  
  return (
    <div className="rpg-main-screen" style={{ position: "relative" }}>
      <div className="rpg-content-area">
        <div className="crafting-container">

          
          <div className="compact-recipes-container">
            {/* <h3 style={{
              color: "white", 
              textShadow: "0 0 10px rgba(0, 255, 255, 0.7)",
              fontSize: "24px",
              marginBottom: "16px",
              textAlign: "center",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              Crafting
            </h3> */}
            
            
            <h3 style={{ 
              fontSize: "20px",
              marginBottom: "10px",
              fontWeight: "bold",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}>
              <span style={{ marginRight: "8px" }}>Crafting Recipes</span>
              <span style={{
                color: "#aaa",
                fontWeight: "normal",
                marginLeft: "8px",
                fontSize: "14px",
                opacity: "0.8"
              }}>({filteredRecipes.length} of {recipes.length})</span>
            </h3>
                <div className="filter-nav-bar" style={{
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px",
                  background: "linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)",
                  border: "1px solid rgba(0, 255, 255, 0.4)",
                  borderRadius: "10px",
                  boxShadow: "0 0 15px rgba(0, 255, 255, 0.2)",
                  position: "relative",
                  zIndex: "1000",
                  width: "100%",
                  minWidth: "357px",
                  boxSizing: "border-box",
                  overflow: "visible"
                }}>
                  <div className="search-and-pagination" style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flex: "1"
                  }}>
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Search recipes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        background: "rgba(0, 0, 40, 0.6)",
                        color: "#ffffff",
                        border: "1px solid rgba(0, 255, 255, 0.4)",
                        borderRadius: "5px",
                        padding: "5px 10px",
                        minWidth: "80px",
                        maxWidth: "80px",
                        flex: "1"
                      }}
                    />
                    
                    {filteredRecipes.length > recipesPerPage && (
                      <div className="pagination-controls-compact" style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "12px"
                      }}>
                        <button 
                          className="page-arrow prev-page"
                          onClick={goToPrevPage}
                          disabled={currentPage === 0}
                          style={{
                            background: "rgba(0, 255, 255, 0.2)",
                            border: "1px solid rgba(0, 255, 255, 0.4)",
                            borderRadius: "3px",
                            color: "#ffffff",
                            padding: "2px 6px",
                            fontSize: "10px",
                            cursor: currentPage === 0 ? "not-allowed" : "pointer",
                            opacity: currentPage === 0 ? "0.5" : "1"
                          }}
                        >
                          ◀
                        </button>
                        <span style={{
                          color: "#ffffff",
                          fontSize: "10px",
                          minWidth: "30px",
                          textAlign: "center"
                        }}>
                          {currentPage + 1}/{totalPages}
                        </span>
                        <button 
                          className="page-arrow next-page"
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages - 1}
                          style={{
                            background: "rgba(0, 255, 255, 0.2)",
                            border: "1px solid rgba(0, 255, 255, 0.4)",
                            borderRadius: "3px",
                            color: "#ffffff",
                            padding: "2px 6px",
                            fontSize: "10px",
                            cursor: currentPage === totalPages - 1 ? "not-allowed" : "pointer",
                            opacity: currentPage === totalPages - 1 ? "0.5" : "1"
                          }}
                        >
                          ▶
                        </button>
                      </div>
                    )}
                  </div>
    
                  <button
                    className={`all-btn ${selectedCategory === 'All' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('All')}
                    style={{
                      background: selectedCategory === 'All' 
                        ? "linear-gradient(90deg, rgba(0,255,255,0.3) 0%, rgba(0,127,255,0.3) 100%)" 
                        : "linear-gradient(90deg, rgba(0,255,255,0.1) 0%, rgba(0,127,255,0.1) 100%)",
                      color: "#ffffff",
                      border: "1px solid rgba(0, 255, 255, 0.4)",
                      borderRadius: "5px",
                      padding: "5px 10px",
                      minHeight: "30px",
                      textShadow: "0 0 5px rgba(0, 255, 255, 0.5)"
                    }}
                  >
                    All
                  </button>
                  
                  <div className="filter-wrapper" ref={filterMenuRef}>
                    <button
                      className="filter-toggle-btn"
                      onClick={() => setShowFilterOptions(!showFilterOptions)}
                      style={{
                        background: "linear-gradient(90deg, rgba(0,255,255,0.15) 0%, rgba(0,127,255,0.15) 100%)",
                        color: "#ffffff",
                        border: "1px solid rgba(0, 255, 255, 0.4)",
                        borderRadius: "5px",
                        padding: "5px 10px",
                        textShadow: "0 0 5px rgba(0, 255, 255, 0.5)"
                      }}
                    >
                      Filter ▼
                    </button>
                    
                    {showFilterOptions && (
                      <div className="filter-dropdown" style={{
                        position: "absolute",
                        top: "calc(100% + 5px)",
                        right: "0",
                        zIndex: "50",
                        background: "linear-gradient(135deg, rgba(0,0,50,0.95) 0%, rgba(0,0,30,0.98) 100%)",
                        border: "1px solid rgba(0, 255, 255, 0.4)",
                        borderRadius: "10px",
                        boxShadow: "0 0 15px rgba(0, 255, 255, 0.3), 0 0 30px rgba(0, 255, 255, 0.1)",
                        padding: "12px",
                        minWidth: "80px",
                        alignItems: "center",
                        maxHeight: "300px",
                        overflowY: "auto",
                        backdropFilter: "blur(5px)",
                        animation: "fadeIn 0.2s ease-out",
                        transformOrigin: "top right"
                      }}>
                        {orderedCategories.map(category => (
                          <div
                            key={category}
                            className={`filter-item ${selectedCategory === category ? 'active' : ''}`}
                            onClick={() => { setSelectedCategory(category); setShowFilterOptions(false); }}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              color: "#ffffff",
                              background: selectedCategory === category 
                                ? "rgba(0, 255, 255, 0.2)" 
                                : "transparent",
                              borderRadius: "5px",
                              marginBottom: "6px",
                              transition: "all 0.2s ease",
                              textAlign: "left",
                              fontWeight: selectedCategory === category ? "bold" : "normal",
                              boxShadow: selectedCategory === category ? "0 0 8px rgba(0, 255, 255, 0.3)" : "none"
                            }}
                          >
                            {category}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
            
            <div className="recipes-grid-container futuristic">
              {filteredRecipes.length > 0 ? (
                <div className="recipes-grid futuristic">
                  {currentRecipes.map(recipe => {
                    const isLocked = recipe.unlockLevel > playerLevel;
                    const canCraft = canCraftRecipe(recipe);
                    const borderColor = getRarityBorderColor(recipe.rarity);
                    const ownedCount = findResourceAmount(recipe.id);
                    
                    return (
                      <div 
                        key={recipe.id}
                        className={`recipe-item futuristic ${canCraft ? '' : 'insufficient'} ${isLocked ? 'locked' : ''}`}
                        onClick={() => isLocked ? null : handleSelectRecipe(recipe)}
                        onMouseEnter={(e) => handleRecipeMouseEnter(recipe, e)}
                        onMouseLeave={handleRecipeMouseLeave}
                        style={{ 
                          opacity: isLocked ? 0.5 : 1,
                          cursor: isLocked ? 'not-allowed' : 'pointer'
                        }}
                        data-recipe-id={recipe.id}
                      >
                        <RecipeIcon recipe={recipe} />
                        <div className="recipe-name" style={getRarityStyle(recipe.rarity)}>
                          {recipe.name}
                        </div>
                        {isLocked && <div className="lock-icon">🔒</div>}
                        {ownedCount > 0 && (
                          <div className="owned-count">{ownedCount}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-recipes">
                  {searchQuery 
                    ? `No matches found for "${searchQuery}"`
                    : "No recipes available in this category yet."
                  }
                </div>
              )}
              

            </div>
          </div>
          
          {/* Инвентарь пользователя */}
          <div className="inventory-section" style={{

          }}>
            <h3 style={{ 
              textShadow: "0 0 10px rgba(0, 255, 255, 0.7)",
              fontSize: "20px",
              marginBottom: "10px",
              fontWeight: "bold"
            }}>Your Inventory</h3>
            {loadingDbResources ? (
              <div className="loading-indicator">Loading inventory...</div>
            ) : (
              <React.Fragment>
                {window.InventoryModule && window.InventoryModule.InventoryGrid ? (
                  <window.InventoryModule.InventoryGrid
                    resources={inventoryItems}
                    onItemClick={handleInventoryItemClick}
                    title=""
                    emptyMessage="No items found in inventory"
                    maxHeight="300px"
                    containerStyle={{
                      marginTop: '10px',
                      width: '100%',
                      maxWidth: '100%',
                      overflowX: 'hidden'
                    }}
                    gridClassName="futuristic"
                    itemClassName="futuristic"
                    key={`inventory-grid-${inventoryItems.length}`}
                  />
                ) : (
                  <div className="inventory-fallback">
                    <p>Inventory module not available</p>
                  </div>
                )}
              </React.Fragment>
            )}
          </div>
          
          {hoveredRecipe && (
            <div 
              className="recipe-tooltip futuristic"
              style={{
                left: `${tooltipPosition.x}px`,
                top: `${tooltipPosition.y}px`
              }}
            >
              <div className="tooltip-header" style={{ 
                color: "#ffffff",
                fontWeight: "bold",
                borderBottom: `1px solid ${getRarityBorderColor(hoveredRecipe.rarity)}50`,
                padding: "0 0 8px 0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
                textShadow: "0 0 5px rgba(0, 255, 255, 0.5)"
              }}>
                {hoveredRecipe.name}
                <span className="tooltip-rarity" style={{ 
                  backgroundColor: `${getRarityBorderColor(hoveredRecipe.rarity)}20`,
                  border: `1px solid ${getRarityBorderColor(hoveredRecipe.rarity)}80`,
                  color: getRarityBorderColor(hoveredRecipe.rarity),
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "bold"
                }}>
                  {hoveredRecipe.rarity || 'Common'}
                </span>
              </div>
              
              {hoveredRecipe.imageSrc && (
                <div className="tooltip-image-container" style={{
                  background: "rgba(0, 0, 40, 0.6)",
                  borderRadius: "8px", 
                  padding: "10px",
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "10px"
                }}>
                  <img src={hoveredRecipe.imageSrc} alt={hoveredRecipe.name} className="tooltip-image" 
                       style={{ 
                         border: `2px solid ${getRarityBorderColor(hoveredRecipe.rarity)}`, 
                         borderRadius: "6px",
                         maxWidth: "80px",
                         maxHeight: "80px"
                       }} />
                </div>
              )}
              
              <div className="tooltip-description" style={{
                color: "#ffffff",
                fontSize: "13px",
                lineHeight: "1.4",
                marginBottom: "12px"
              }}>{hoveredRecipe.description}</div>
              
              <div className="tooltip-stats">
                {hoveredRecipe.unlockLevel > playerLevel ? (
                  <div className="tooltip-lock" style={{ 
                    color: '#ffffff',
                    padding: "6px 10px", 
                    background: "rgba(255, 136, 0, 0.2)",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 136, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "10px"
                  }}>
                    <span className="lock-icon-small" style={{marginRight: "6px"}}>🔒</span> Unlocks at level {hoveredRecipe.unlockLevel}
                  </div>
                ) : (
                  <div className="tooltip-materials">
                    <div className="tooltip-title" style={{ 
                      color: "#ffffff",
                      fontWeight: "bold",
                      marginBottom: "8px",
                      textShadow: "0 0 5px rgba(0, 255, 255, 0.5)"
                    }}>
                      Required Materials:
                    </div>
                    {hoveredRecipe.materials && Object.entries(hoveredRecipe.materials).map(([mat, amt]) => {
                      // Получаем красивое имя ресурса из каталога
                      let displayName = mat.charAt(0).toUpperCase() + mat.slice(1);
                      let iconPath = `images/rpg/${mat.toLowerCase().replace(/\s+/g, '_')}.png`;
                      if (window.ItemCatalogModule && window.ItemCatalogModule.findCatalogItemById) {
                        const item = window.ItemCatalogModule.findCatalogItemById(mat);
                        if (item && item.name) displayName = item.name;
                        if (item && item.image_path) iconPath = item.image_path;
                      }
                      // ...
                      const hasEnough = getResourceAmountCaseInsensitive(mat) >= amt;
                      return (
                        <div 
                          key={mat} 
                          className="tooltip-material-row" 
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "5px 8px",
                            background: hasEnough ? "rgba(92, 255, 92, 0.1)" : "rgba(255, 92, 92, 0.1)",
                            marginBottom: "5px",
                            borderRadius: "4px",
                            border: hasEnough ? "1px solid rgba(92, 255, 92, 0.3)" : "1px solid rgba(255, 92, 92, 0.3)"
                          }}
                        >
                          <img src={iconPath} alt={displayName} className="tooltip-material-icon" style={{ width: 20, height: 20, marginRight: 8 }} />
                          <span style={{color: "#ffffff"}}>{displayName}</span>
                          <span style={{ marginLeft: 'auto', color: hasEnough ? '#5cff5c' : '#ff5c5c', fontWeight: "bold" }}>{getResourceAmountCaseInsensitive(mat)}</span>
                          <span style={{color: "#ffffff", margin: "0 3px"}}>/</span>
                          <span style={{color: "#ffffff"}}>{amt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {hoveredRecipe.craftTime && (
                  <div className="tooltip-craft-time" style={{
                    marginTop: "12px",
                    padding: "8px 10px",
                    background: "rgba(0, 0, 40, 0.4)",
                    borderRadius: "6px",
                    border: "1px solid rgba(0, 255, 255, 0.2)"
                  }}>
                    <div className="tooltip-title" style={{ 
                      color: "#ffffff", 
                      fontWeight: "bold",
                      marginBottom: "4px",
                      textShadow: "0 0 5px rgba(0, 255, 255, 0.5)"
                    }}>
                      Crafting Time:
                    </div>
                    <div style={{color: "#ffffff"}}>{formatCraftTime(hoveredRecipe.craftTime)}</div>
                  </div>
                )}
              </div>
              
              <div className="tooltip-footer" style={{ 
                borderTop: `1px solid ${getRarityBorderColor(hoveredRecipe.rarity)}30`,
                marginTop: "10px",
                paddingTop: "8px",
                textAlign: "center",
                color: "#dddddd",
                fontSize: "12px",
                fontStyle: "italic"
              }}>
                Click for details
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* CSS styles have been moved to source/style/rpg.css */}
      
      {/* Отдельная кнопка "Назад" с гарантированным высоким z-index */}
      <div style={{
        position: "fixed",
        zIndex: 9999,
        pointerEvents: "auto"
      }}>
        <button 
          className="rpg-back-button left"
          onClick={onBack}
          style={{
            padding: "8px 12px",
            background: "linear-gradient(135deg, rgba(0,0,50,0.9) 0%, rgba(0,0,30,0.95) 100%)",
            border: "2px solid rgba(0, 255, 255, 0.7)",
            boxShadow: "0 0 10px rgba(0, 255, 255, 0.5)",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer"
          }}
        >
          <span className="back-icon">↩</span>
        </button>
      </div>
    </div>
  );
};

// Компонент модального окна для отображения требований крафта
const CraftRequirementModal = ({ itemName, onClose, onCraft }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Crafting Required</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>To access the <strong>{itemName}</strong> section, you need to craft this item first.</p>
          <p>Go to the Crafting section to create a {itemName}.</p>
        </div>
        <div className="modal-footer">
          <button className="rpg-button craft-btn" onClick={onCraft}>Go to Crafting</button>
          <button className="rpg-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// Проверка наличия предмета в ресурсах пользователя
const checkItemAvailability = async (itemName) => {
  try {
    const resources = await getUserResourcesFromIndexedDB();
    if (!resources) return false;
    return resources[itemName] > 0;
  } catch (error) {
    return false;
  }
};

// Глобальная версия функции для загрузки рецептов из модуля
const globalLoadRecipesFromModule = () => {
  try {
    if (window.CraftingRecipes) {
      const allRecipesData = [];
      
      // Получаем все категории рецептов
      Object.keys(window.CraftingRecipes.recipes).forEach(category => {
        const categoryRecipes = window.CraftingRecipes.recipes[category] || [];
        allRecipesData.push(...categoryRecipes);
      });
      
      // Сохраняем рецепты в глобальной переменной для доступа из других модулей
      window.allCraftingRecipes = allRecipesData;
      
      return allRecipesData;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error loading recipes globally:', error);
    return [];
  }
};

// Глобальная функция для загрузки ресурсов
const globalResourceLoader = async (options = {}) => {
  // Защита от зацикливания
  const now = Date.now();
  if (isResourceUpdateInProgress && (now - lastResourceUpdateTimestamp < UPDATE_THRESHOLD)) {
    console.warn('[CraftingModule] Попытка зацикленного обновления ресурсов, игнорируем');
    return { resources: {}, items: [] };
  }
  
  // Устанавливаем флаг обновления
  isResourceUpdateInProgress = true;
  lastResourceUpdateTimestamp = now;
  
  try {
    let resources = {};
    let resourceItems = [];
    
    // Приоритет 1: Использовать ModalModule для загрузки ресурсов
    if (window.ModalModule && typeof window.ModalModule.loadUserResources === 'function') {
      resources = await window.ModalModule.loadUserResources();
      
      // Преобразуем ресурсы в массив предметов
      if (window.ItemCatalogModule && typeof window.ItemCatalogModule.resourcesObjectToArray === 'function') {
        resourceItems = window.ItemCatalogModule.resourcesObjectToArray(resources);
      } else {
        // Запасной вариант, если модуль ItemCatalog недоступен
        resourceItems = Object.entries(resources)
          .filter(([key, value]) => {
            // Изменяем фильтрацию, чтобы учесть специальные ресурсы
            return (
              // Значение должно быть больше 0
              value > 0 && 
              // Исключаем служебные поля и проблемные ресурсы
              !['telegramid', 'spinsleft', 'streak', 'spins_left', 'spins', 'telegram_id', 'id', 'telegramId', 'lastUpdated', 'egg', 'loadedFromServer'].includes(key.toLowerCase())
            );
          })
          .map(([id, amount]) => ({
            id,
            item_id: id,
            name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
            qty: amount,
            rarity: 'Common',
            type: 'Resource'
          }));
      }
    }
    // Приоритет 2: Использовать InventoryModule как запасной вариант
    else if (window.InventoryModule && typeof window.InventoryModule.loadAllResources === 'function') {
          const result = await window.InventoryModule.loadAllResources();
          resources = result.resources || {};
      resourceItems = result.items || [];
    } else {
      console.error('[CraftingModule] Не удалось найти модуль для загрузки ресурсов');
      
      // Снимаем флаг обновления
      isResourceUpdateInProgress = false;
      return { resources: {}, items: [] };
    }
    
    // Объединяем обновление UI и отправку событий
    setTimeout(() => {
      try {
        // Обновляем глобальную переменную
        window.globalUserResources = resources;
        
        // Отправляем событие, только если это не запрещено опциями
        if (!options.suppressEvents) {
          // Отправляем только одно событие вместо нескольких
          window.dispatchEvent(new CustomEvent('force-crafting-update', { 
            detail: { 
              timestamp: Date.now(),
              forceUpdate: true,
              resources: resources
            } 
          }));
        }
        
        // Снимаем флаг обновления
        isResourceUpdateInProgress = false;
      } catch (domError) {
        console.error('[CraftingModule] Ошибка при обновлении интерфейса:', domError);
        isResourceUpdateInProgress = false;
      }
    }, 500);
    
    // Добавляем диагностику
    console.log('[CraftingModule] Загружено ресурсов: ' + Object.keys(resources).length);
    console.log('[CraftingModule] Отфильтровано для отображения: ' + resourceItems.length);
    if (resourceItems.length > 0) {
      console.log('[CraftingModule] Первые 5 ресурсов:', resourceItems.slice(0, 5).map(item => item.id));
    }
    
    return { resources, items: resourceItems };
  } catch (error) {
    console.error('[CraftingModule] Ошибка при глобальной загрузке ресурсов:', error);
    
    // Снимаем флаг обновления
    isResourceUpdateInProgress = false;
    return { resources: {}, items: [] };
  }
};

// Глобальная функция для инициализации модулей из компонента Crafting
const globalInitializeModules = async () => {
  try {
    // Проверим, загружены ли необходимые библиотеки
    if (typeof React === 'undefined') {
      console.error('[CraftingModule] React is not defined');
      return false;
    }
    
    // Используем функцию загрузки скриптов аналогичную той, что в компоненте Crafting
      const loadScript = (src) => {
        return new Promise((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }
          
          const script = document.createElement('script');
          script.src = src;
        script.onload = () => {
          resolve();
        };
        script.onerror = (e) => {
          reject(e);
        };
          document.head.appendChild(script);
        });
      };
      
    // Сначала загружаем ItemCatalogModule, так как он нужен для правильного отображения редкости предметов
    if (!window.ItemCatalogModule) {
      await loadScript('source/js/rpg/itemcatalog.js');
    }
    
    // Загружаем остальные необходимые зависимости
    await Promise.all([
      window.IndexedDBModule ? Promise.resolve() : loadScript('source/js/rpg/indexedDB.js'),
      window.ModalModule ? Promise.resolve() : loadScript('source/js/rpg/modals.js'),
      window.InventoryModule ? Promise.resolve() : loadScript('source/js/rpg/inventory.js')
    ]);
    
    return true;
      } catch (error) {
    console.error('[CraftingModule] Error initializing modules globally:', error);
    return false;
  }
};

// Глобальная функция для крафта предметов
const globalHandleCraft = async (recipeId, quantity = 1) => {
  console.log(`[CraftingModule] Global craft request: ${recipeId}, quantity: ${quantity}`);
  
  // Проверяем доступность необходимых модулей
  if (!window.ItemCatalogModule) {
    console.error('[CraftingModule] ItemCatalogModule is required for crafting');
    return { success: false, error: 'Missing dependencies' };
  }
  
  try {
    // Проверяем наличие рецепта
    const allRecipes = window.CraftingModule.recipes || [];
    const recipe = allRecipes.find(r => r.id === recipeId);
    
    if (!recipe) {
      console.error(`[CraftingModule] Recipe not found: ${recipeId}`);
      return { success: false, error: 'Recipe not found' };
    }
    
    // Проверяем доступность ресурсов
    let currentResources = {};
    
    // Приоритет 1: Использовать ModalModule для загрузки ресурсов
    if (window.ModalModule && typeof window.ModalModule.loadUserResources === 'function') {
      currentResources = await window.ModalModule.loadUserResources();
    } 
    // Приоритет 2: Использовать IndexedDBModule как запасной вариант
    else if (window.IndexedDBModule && typeof window.IndexedDBModule.getUserResources === 'function') {
      currentResources = await window.IndexedDBModule.getUserResources();
    } else {
      console.error('[CraftingModule] Cannot load user resources');
      return { success: false, error: 'Cannot load resources' };
    }
    
    // Проверяем достаточность ресурсов
    const requiredMaterials = recipe.materials || {};
    
    for (const [materialId, requiredAmount] of Object.entries(requiredMaterials)) {
      const availableAmount = currentResources[materialId] || 0;
      if (availableAmount < requiredAmount * quantity) {
        console.error(`[CraftingModule] Not enough ${materialId}: have ${availableAmount}, need ${requiredAmount * quantity}`);
        return { 
          success: false, 
          error: 'Not enough resources',
          missingResources: {
            [materialId]: {
              required: requiredAmount * quantity,
              available: availableAmount
            }
          }
        };
      }
    }
    
    // Расчет необходимых ресурсов
    const updatedResources = Object.assign({}, currentResources);
    
    // Вычитаем ресурсы
    for (const [materialId, amount] of Object.entries(requiredMaterials)) {
      updatedResources[materialId] = (updatedResources[materialId] || 0) - (amount * quantity);
      
      // Проверка отрицательных значений
      if (updatedResources[materialId] < 0) {
        console.error(`[CraftingModule] Negative resource amount for ${materialId}: ${updatedResources[materialId]}`);
        updatedResources[materialId] = 0;
      }
    }
    
    // Добавляем скрафченные предметы
    const craftedItemId = recipe.result;
    if (craftedItemId) {
      updatedResources[craftedItemId] = (updatedResources[craftedItemId] || 0) + quantity;
    }
    
    // Сохраняем обновленные ресурсы
    let saveResult = false;
    
    // Приоритет 1: Использовать ModalModule для сохранения ресурсов
    if (window.ModalModule && typeof window.ModalModule.enhancedSaveResourcesWithSync === 'function') {
      // Передаем опцию, чтобы избежать отправки событий и предотвратить зацикливание
      saveResult = await window.ModalModule.enhancedSaveResourcesWithSync(updatedResources, { 
        dispatchEvent: false,
        skipServerSync: false // Всегда синхронизируем с сервером при крафте
      });
    } 
    // Приоритет 2: Использовать IndexedDBModule как запасной вариант
    else if (window.IndexedDBModule && typeof window.IndexedDBModule.saveUserResources === 'function') {
      await window.IndexedDBModule.saveUserResources(updatedResources);
      saveResult = true;
    } else {
      console.error('[CraftingModule] Cannot save resources');
      return { success: false, error: 'Cannot save resources' };
    }
    
    // Принудительно обновляем IndexedDB напрямую
    try {
      if (window.getRPGdb) {
        const db = await window.getRPGdb();
        // Обновляем все материалы, которые были использованы
        const tx = db.transaction('inventory', 'readwrite');
        const store = tx.objectStore('inventory');
        
        // Проходим по всем ресурсам и обновляем их в IndexedDB
        for (const [resourceId, amount] of Object.entries(updatedResources)) {
          try {
            const item = await store.get(resourceId);
            if (item) {
              // Обновляем количество
              item.quantity = amount;
              if (item.quantity > 0) {
                await store.put(item);
                console.log(`[CraftingModule] IndexedDB: ${resourceId} обновлен до ${amount}`);
              } else {
                await store.delete(resourceId);
                console.log(`[CraftingModule] IndexedDB: ${resourceId} удален (количество 0)`);
              }
            } else if (amount > 0) {
              // Создаем новую запись, если ресурса нет, но он должен быть
              await store.put({
                id: resourceId,
                quantity: amount,
                updated: new Date().toISOString()
              });
              console.log(`[CraftingModule] IndexedDB: ${resourceId} добавлен, количество ${amount}`);
            }
          } catch (e) {
            console.error(`[CraftingModule] Ошибка при обновлении ${resourceId} в IndexedDB:`, e);
          }
        }
        
        // Завершаем транзакцию
        await tx.done;
        console.log('[CraftingModule] IndexedDB обновлен после крафта');
      }
    } catch (e) {
      console.error('[CraftingModule] Ошибка при обновлении IndexedDB после крафта:', e);
    }
    
    // Отправляем единственное событие об обновлении ресурсов
    window.dispatchEvent(new CustomEvent('resourcesUpdated', { 
      detail: { resources: updatedResources, timestamp: Date.now() } 
    }));
    
    // Обновляем отображение с подавлением событий
    if (window.CraftingModule && typeof window.CraftingModule.loadResourcesFromDatabase === 'function') {
      try {
        window.CraftingModule.loadResourcesFromDatabase({ suppressEvents: true });
      } catch (e) {
        window.CraftingModule.loadResourcesFromDatabase();
      }
    }
    
    return { 
      success: true, 
      item: craftedItemId,
      quantity: quantity,
      resources: updatedResources
    };
  } catch (error) {
    console.error('[CraftingModule] Error in globalHandleCraft:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

// Глобальная функция для проверки возможности крафта предмета
const globalCanCraftRecipe = async (recipeId) => {
  console.log(`[CraftingModule] Checking if recipe can be crafted: ${recipeId}`);
  
  // Проверяем доступность необходимых модулей
  if (!window.ItemCatalogModule) {
    console.error('[CraftingModule] ItemCatalogModule is required for checking craft');
    return { canCraft: false, error: 'Missing dependencies' };
  }

  try {
    // Проверяем наличие рецепта
    const allRecipes = window.CraftingModule.recipes || [];
    const recipe = allRecipes.find(r => r.id === recipeId);
    
    if (!recipe) {
      console.error(`[CraftingModule] Recipe not found: ${recipeId}`);
      return { canCraft: false, error: 'Recipe not found' };
    }
    
    // Проверяем уровень персонажа
    let playerLevel = 1;
    if (window.ModalModule && typeof window.ModalModule.getPlayerLevel === 'function') {
      playerLevel = window.ModalModule.getPlayerLevel();
      console.log(`[CraftingModule] Проверка уровня персонажа: текущий уровень ${playerLevel}, требуемый уровень ${recipe.unlockLevel || 1}`);
      
      if (recipe.unlockLevel && recipe.unlockLevel > playerLevel) {
        console.log(`[CraftingModule] Рецепт ${recipeId} недоступен - требуется уровень ${recipe.unlockLevel}`);
        return { 
          canCraft: false, 
          error: `Требуется уровень ${recipe.unlockLevel}`,
          recipe,
          playerLevel,
          requiredLevel: recipe.unlockLevel,
          isLevelLocked: true
        };
      }
    }
    
    // Проверяем доступность ресурсов
    let currentResources = {};
    
    if (window.ModalModule && typeof window.ModalModule.loadUserResources === 'function') {
      currentResources = await window.ModalModule.loadUserResources();
    } else if (window.IndexedDBModule && typeof window.IndexedDBModule.getUserResources === 'function') {
      currentResources = await window.IndexedDBModule.getUserResources();
    } else {
      console.error('[CraftingModule] Cannot load user resources');
      return { canCraft: false, error: 'Cannot load resources' };
    }
    
    // Проверяем достаточность ресурсов
    const requiredMaterials = recipe.materials || {};
    const missingResources = {};
    let canCraft = true;
    
    for (const [materialId, requiredAmount] of Object.entries(requiredMaterials)) {
      const availableAmount = currentResources[materialId] || 0;
      if (availableAmount < requiredAmount) {
        canCraft = false;
        missingResources[materialId] = {
          required: requiredAmount,
          available: availableAmount,
          missing: requiredAmount - availableAmount
        };
      }
    }
    
              return {
      canCraft,
      recipe,
      playerLevel,
      isLevelLocked: false,
      missingResources: Object.keys(missingResources).length > 0 ? missingResources : null
    };
    } catch (error) {
    console.error('[CraftingModule] Error in globalCanCraftRecipe:', error);
    return { canCraft: false, error: error.message || 'Unknown error' };
  }
};

// Глобальная функция для обновления отображения инвентаря
const globalRefreshInventoryDisplay = async () => {
  // Предотвращаем обновление если другое обновление в процессе
  if (isResourceUpdateInProgress || forcedUpdateInProgress) {
    return false;
  }
  
  try {
    // Пробуем использовать InventoryModule для обновления
    if (window.InventoryModule && typeof window.InventoryModule.refreshInventoryDisplay === 'function') {
      return await window.InventoryModule.refreshInventoryDisplay();
    }
    
    // Альтернативный вариант - отправить ОДНО событие обновления вместо трех
    window.dispatchEvent(new CustomEvent('force-crafting-update', { 
      detail: { 
        timestamp: Date.now(),
        forceUpdate: true,
        resources: window.globalUserResources || {}
      } 
    }));
    
    return true;
  } catch (error) {
    console.error('[CraftingModule] Error in globalRefreshInventoryDisplay:', error);
      return false;
    }
};

// Новая функция для принудительного обновления интерфейса крафтинга
const forceUpdateUI = async () => {
  // Если уже идет обновление, не начинаем новое
  if (forcedUpdateInProgress) {
    return false;
  }
  
  // Устанавливаем флаг для блокировки других обновлений
  forcedUpdateInProgress = true;
  
  try {
    // Сначала очищаем кэши для обеспечения свежих данных
    localStorage.removeItem('rpg_inventory');
    localStorage.removeItem('inventory');
    
    // Сохраняем текущее состояние ресурсов на случай ошибки
    const currentResources = window.globalUserResources || {};
    
    // Инициализируем переменную для хранения свежих ресурсов
    let freshResources = {};
    
    // ПОЛНОСТЬЮ ОТКЛЮЧАЕМ ЗАПРОС К СЕРВЕРУ, ТАК КАК ОН ВЫЗЫВАЕТ ОШИБКУ
    // Вместо этого используем только локальные источники данных
    console.log('[CraftingModule] Запрос к серверу отключен, используем только локальные данные');
    
    // Пробуем загрузить через ModalModule (предпочтительный способ)
    if (window.ModalModule && typeof window.ModalModule.loadUserResources === 'function') {
      console.log('[CraftingModule] Загрузка ресурсов через ModalModule');
      try {
        const modalResources = await window.ModalModule.loadUserResources();
        if (modalResources && Object.keys(modalResources).length > 0) {
          freshResources = modalResources;
          console.log('[CraftingModule] Ресурсы успешно получены через ModalModule');
        }
      } catch (modalError) {
        console.warn('[CraftingModule] Ошибка при загрузке ресурсов через ModalModule:', modalError);
      }
    }
    
    // Если ModalModule не дал результатов, используем InventoryModule
    if (Object.keys(freshResources).length === 0 && 
        window.InventoryModule && typeof window.InventoryModule.loadAllResources === 'function') {
      console.log('[CraftingModule] Загрузка ресурсов через InventoryModule');
      try {
        const result = await window.InventoryModule.loadAllResources();
        if (result && result.resources && Object.keys(result.resources).length > 0) {
          freshResources = result.resources;
          console.log('[CraftingModule] Ресурсы успешно получены через InventoryModule');
        }
      } catch (invError) {
        console.warn('[CraftingModule] Ошибка при загрузке ресурсов через InventoryModule:', invError);
      }
    }
    
    // Если ни один из методов не сработал, используем текущие ресурсы
    if (Object.keys(freshResources).length === 0) {
      console.log('[CraftingModule] Использование текущих ресурсов, так как другие методы не сработали');
      freshResources = currentResources;
    } else {
      console.log('[CraftingModule] Получены свежие ресурсы, количество элементов:', Object.keys(freshResources).length);
    }
    
    // Обновляем глобальную переменную ресурсов
    window.globalUserResources = freshResources;
    
    // Сохраняем свежие ресурсы в IndexedDB без вызова дополнительных событий
    if (window.ModalModule && typeof window.ModalModule.enhancedSaveResourcesWithSync === 'function') {
      await window.ModalModule.enhancedSaveResourcesWithSync(freshResources, {
        skipServerSync: true,  // Особенно важно пропустить синхронизацию с сервером
        dispatchEvent: false
      });
    }
    
    // Отправляем ОДНО событие обновления вместо множества
    const event = new CustomEvent('force-crafting-update', { 
      detail: {
        timestamp: Date.now(),
        forceUpdate: true,
        resources: freshResources
      } 
    });
    
    // Находим все корневые элементы React
    const reactRoots = document.querySelectorAll('#crafting-root, #crafting-container, .crafting-recipes, .inventory-container');
    
    // Обновляем первичный корневой элемент или window
    const primaryRoot = reactRoots.length > 0 ? reactRoots[0] : window;
    primaryRoot.dispatchEvent(event);
    
    // Если первичный корень не window, обновляем window тоже
    if (primaryRoot !== window) {
      window.dispatchEvent(event);
    }
    
    // Снимаем флаг принудительного обновления через задержку
    setTimeout(() => {
      forcedUpdateInProgress = false;
    }, 2000);
    
    return true;
  } catch (error) {
    console.error('[CraftingModule] Ошибка при принудительном обновлении интерфейса:', error);
    
    // В случае ошибки попробуем использовать имеющиеся ресурсы
    if (window.globalUserResources) {
      window.dispatchEvent(new CustomEvent('force-crafting-update', {
        detail: { 
          timestamp: Date.now(),
          forceUpdate: true,
          resources: window.globalUserResources
        }
      }));
    }
    
    // Снимаем флаг принудительного обновления
    setTimeout(() => {
      forcedUpdateInProgress = false;
    }, 2000);
    
    return false;
  }
};

// Add components to the global CraftingModule
const existingModule = window.CraftingModule || {};
window.CraftingModule = Object.assign({}, existingModule, {
  // React components
  Crafting,
  CraftRequirementModal,
  
  // Include existing functionality
  initialize: globalInitializeModules,
  loadRecipes: globalLoadRecipesFromModule,
  loadResources: globalResourceLoader,
  loadResourcesFromDatabase: globalResourceLoader, // Используем новую глобальную функцию
  craftItem: globalHandleCraft,
  checkItem: globalCanCraftRecipe,
  refreshInventory: globalRefreshInventoryDisplay,
  refreshResourcesDatabase: globalResourceLoader, // Дублируем под другим именем для надежности
  forceUpdateUI, // Добавляем новую функцию для принудительного обновления
  registerModalCallback: function(callback) {
    if (typeof callback === 'function') {
      showItemDetailsCallback = callback;
      return true;
    }
    return false;
  }
});
