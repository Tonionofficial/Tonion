// Recipes for Crafting Module
// This file contains all crafting recipes used in the game

// Crafting recipes organized by categories
const craftingRecipes = {
  // Structures - buildings and functional stations
  structures: [
    {
      id: 'campfire',
      name: 'Campfire',
      description: 'A basic campfire for cooking food and providing warmth',
      materials: {
        rock: 5,
        woodlog: 8
      },
      difficulty: 'Easy',
      craftTime: 7200, // seconds
      icon: '🔥',
      imageSrc: 'images/rpg/campfire.png',
      category: 'structures',
      rarity: 'Common',
      unlockLevel: 1,
      value: 25
    },
    {
      id: 'furnace',
      name: 'Furnace',
      description: 'A primitive furnace for smelting ore into ingots',
      materials: {
        rock: 20,
        woodlog: 8,
        fiber: 10
      },
      difficulty: 'Medium',
      craftTime: 7200, // seconds
      icon: '⚒️',
      imageSrc: 'images/rpg/furnace.png',
      category: 'structures',
      rarity: 'Uncommon',
      unlockLevel: 8,
      value: 50
    }
  ],
  
  // Tools - utility items for gathering and crafting
  tools: [
    {
      id: 'primknife',
      name: 'Primitive Knife',
      description: 'A simple knife made from stone and wood. Useful for skinning animals and cutting materials.',
      materials: {
        woodlog: 3,
        rock: 3,
        rope: 1
      },
      difficulty: 'Easy',
      craftTime: 1800, // seconds
      stats: {
        damage: 2,
        durability: 30,
        skinningBonus: 1.2
      },
      icon: '🔪',
      imageSrc: 'images/rpg/primknife.png',
      category: 'tools',
      rarity: 'Common',
      unlockLevel: 1,
      value: 10
    },
    {
      id: 'primaxe',
      name: 'Primitive Axe',
      description: 'A crude axe for chopping wood. Not very durable but gets the job done.',
      materials: {
        woodlog: 5,
        rock: 5,
        rope: 2
      },
      difficulty: 'Easy',
      craftTime: 3600, // seconds
      stats: {
        durability: 40,
        woodGatherBonus: 1.5
      },
      icon: '🪓',
      imageSrc: 'images/rpg/primaxe.png',
      category: 'tools',
      rarity: 'Common',
      unlockLevel: 1,
      value: 15
    },
    {
      id: 'primpickaxe',
      name: 'Primitive Pickaxe',
      description: 'A basic pickaxe for mining ore and stone. Simple but effective for gathering basic resources.',
      materials: {
        woodlog: 5,
        rock: 5,
        rope: 2
      },
      difficulty: 'Medium',
      craftTime: 3600, // seconds
      icon: '⛏️',
      imageSrc: 'images/rpg/primpickaxe.png',
      category: 'tools',
      rarity: 'Common',
      unlockLevel: 8,
      value: 18
    }
  ],
  
  // Weapons - items used for combat
  weapons: [
    {
      id: 'primbow',
      name: 'Primitive Bow',
      description: 'A simple bow crafted from wood and fiber. Good for hunting small animals.',
      materials: {
        woodlog: 8,
        rope: 5
      },
      difficulty: 'Medium',
      craftTime: 3600, // seconds
      stats: {
        damage: 5,
        durability: 35,
        range: 8
      },
      icon: '🏹',
      imageSrc: 'images/rpg/primbow.png',
      category: 'tools',
      rarity: 'Common',
      unlockLevel: 1,
      value: 25
    },
    {
      id: 'primarrows',
      name: 'Primitive Arrows',
      description: 'Simple arrows made from sticks, rope and crushed rock. Basic ammunition for hunting.',
      materials: {
        stick: 1,
        rope: 1,
        crushedrock: 1
      },
      result: { primarrows: 1 },
      difficulty: 'Easy',
      craftTime: 300, // seconds
      stats: {
        damage: 3,
        accuracy: 2
      },
      icon: '🏹',
      imageSrc: 'images/rpg/primarrows.png',
      category: 'tools',
      rarity: 'Common',
      unlockLevel: 1,
      value: 8
    },
    {
      id: 'primclub',
      name: 'Primitive Club',
      description: 'A heavy wooden club. Simple but effective for close combat.',
      materials: {
        woodlog: 12,
        rope: 5
      },
      difficulty: 'Easy',
      craftTime: 2400, // seconds
      stats: {
        damage: 4
      },
      icon: '🏏',
      imageSrc: 'images/rpg/primclub.png',
      category: 'weapons',
      rarity: 'Common',
      unlockLevel: 1,
      value: 12
    },
    {
      id: 'primspear',
      name: 'Primitive Spear',
      description: 'A wooden spear with a sharpened tip. Good reach and moderate damage.',
      materials: {
        woodlog: 10,
        rock: 6,
        rope: 6
      },
      difficulty: 'Medium',
      craftTime: 3600, // seconds
      stats: {
        damage: 15
        
        
      },
      icon: '🔱',
      imageSrc: 'images/rpg/primspear.png',
      category: 'weapons',
      rarity: 'Common',
      unlockLevel: 10,
      value: 18
    }
  ],
  
  // Armor - protective gear
  armor: [
    {
      id: 'primhelmet',
      name: 'Primitive Helmet',
      description: 'A basic helmet made from leather and reinforced with bone. Offers minimal protection.',
      materials: {
        leather: 4,
        rope: 2
      },
      difficulty: 'Medium',
      craftTime: 3600, // seconds
      stats: {
        armor: 2,
        health: 1
      },
      icon: '🪖',
      imageSrc: 'images/rpg/primhelmet.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 1,
      value: 15
    },
    {
      id: 'primarmor',
      name: 'Primitive Armor',
      description: 'A crude vest made of leather and plant fiber. Better than nothing against attacks.',
      materials: {
        leather: 6,
        rope: 4
      },
      difficulty: 'Medium',
      craftTime: 3600, // seconds
      stats: {
        armor: 3,
        health: 2
      },
      icon: '👕',
      imageSrc: 'images/rpg/primarmor.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 1,
      value: 20
    },
    {
      id: 'primbelt',
      name: 'Primitive Belt',
      description: 'A simple belt made from leather straps. Offers utility more than protection.',
      materials: {
        leather: 3,
        rope: 1
      },
      difficulty: 'Easy',
      craftTime: 1800, // seconds
      stats: {
        armor: 1,
        inventorySlots: 1
      },
      icon: '🥋',
      imageSrc: 'images/rpg/primbelt.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 1,
      value: 10
    },
    {
      id: 'primpants',
      name: 'Primitive Pants',
      description: 'Rough pants crafted from leather. Provides basic protection for your legs.',
      materials: {
        leather: 5,
        rope: 3
      },
      difficulty: 'Medium',
      craftTime: 3600, // seconds
      stats: {
        armor: 2,
        agility: 1
      },
      icon: '👖',
      imageSrc: 'images/rpg/primpants.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 1,
      value: 15
    },
    {
      id: 'primboots',
      name: 'Primitive Boots',
      description: 'Simple footwear made of leather. Protects feet from rough terrain.',
      materials: {
        leather: 4,
        rope: 2
      },
      difficulty: 'Medium',
      craftTime: 3600, // seconds
      stats: {
        armor: 1,
        movementSpeed: 1
      },
      icon: '👢',
      imageSrc: 'images/rpg/primboots.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 1,
      value: 12
    },
    {
      id: 'primgloves',
      name: 'Primitive Gloves',
      description: 'Basic hand protection made from leather. Helps with handling tools and weapons.',
      materials: {
        leather: 3,
        rope: 2
      },
      difficulty: 'Easy',
      craftTime: 1800, // seconds
      stats: {
        armor: 1,
        toolEfficiency: 1
      },
      icon: '🧤',
      imageSrc: 'images/rpg/primgloves.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 1,
      value: 10
    },
    {
      id: 'primvambraces',
      name: 'Primitive Vambraces',
      description: 'Crude arm guards crafted from leather and wood. Provides minimal protection for the forearms.',
      materials: {
        leather: 3,
        rope: 1
      },
      difficulty: 'Medium',
      craftTime: 3600, // seconds
      stats: {
        armor: 1,
        strength: 1
      },
      icon: '💪',
      imageSrc: 'images/rpg/primvambraces.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 1,
      value: 10
    },
    // Кожаная броня - улучшенная версия примитивной
    {
      id: 'leatherhelmet',
      name: 'Leather Helmet',
      description: 'A well-crafted leather helmet. Provides better protection than primitive gear.',
      materials: {
        leather: 10,
        rope: 6,
        ironingot: 2
      },
      difficulty: 'Medium',
      craftTime: 5400, // seconds
      stats: {
        armor: 12,
        health: 20
      },
      icon: '🪖',
      imageSrc: 'images/rpg/leatherhelmet.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 10,
      value: 25
    },
    {
      id: 'leatherarmor',
      name: 'Leather Armor',
      description: 'A sturdy leather vest that offers good protection while maintaining mobility.',
      materials: {
        leather: 12,
        rope: 8,
        ironingot: 2
      },
      difficulty: 'Medium',
      craftTime: 7200, // seconds
      stats: {
        armor: 15,
        health: 30
      },
      icon: '👕',
      imageSrc: 'images/rpg/leatherarmor.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 10,
      value: 35
    },
    {
      id: 'leatherbelt',
      name: 'Leather Belt',
      description: 'A quality leather belt with pouches for carrying gear. Increases carrying capacity.',
      materials: {
        leather: 8,
        rope: 5,
        ironingot: 1
      },
      difficulty: 'Easy',
      craftTime: 3600, // seconds
      stats: {
        armor: 20,
        
      },
      icon: '🥋',
      imageSrc: 'images/rpg/leatherbelt.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 10,
      value: 20
    },
    {
      id: 'leatherpants',
      name: 'Leather Pants',
      description: 'Durable leather pants that provide excellent leg protection and flexibility.',
      materials: {
        leather: 10,
        rope: 6,
        ironingot: 2
      },
      difficulty: 'Medium',
      craftTime: 5400, // seconds
      stats: {
        armor: 30,
        agility: 6
      },
      icon: '👖',
      imageSrc: 'images/rpg/leatherpants.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 10,
      value: 30
    },
    {
      id: 'leatherboots',
      name: 'Leather Boots',
      description: 'High-quality leather boots that protect feet and improve movement speed.',
      materials: {
        leather: 10,
        rope: 6,
        ironingot: 2
      },
      difficulty: 'Medium',
      craftTime: 5400, // seconds
      stats: {
        armor: 20,
        
      },
      icon: '👢',
      imageSrc: 'images/rpg/leatherboots.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 10,
      value: 25
    },
    {
      id: 'leathergloves',
      name: 'Leather Gloves',
      description: 'Fine leather gloves that enhance grip and tool handling efficiency.',
      materials: {
        leather: 10,
        rope: 6,
        ironingot: 2
      },
      difficulty: 'Easy',
      craftTime: 3600, // seconds
      stats: {
        armor: 20,
        
      },
      icon: '🧤',
      imageSrc: 'images/rpg/leathergloves.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 10,
      value: 20
    },
    {
      id: 'leathervambraces',
      name: 'Leather Vambraces',
      description: 'Reinforced leather arm guards that provide excellent forearm protection.',
      materials: {
        leather: 10,
        rope: 6,
        ironingot: 2
      },
      difficulty: 'Medium',
      craftTime: 5400, // seconds
      stats: {
        armor: 20,
        strength: 6
      },
      icon: '💪',
      imageSrc: 'images/rpg/leathervambraces.png',
      category: 'armor',
      rarity: 'Common',
      unlockLevel: 10,
      value: 22
    }
  ],
  
  // Metals - smelted items and refined materials
  // metals: [
  //   {
  //     id: 'ironingot',
  //     name: 'Iron Ingot',
  //     description: 'A bar of refined iron. Used for advanced crafting.',
  //     category: 'metal',
  //     materials: { 'Iron Ore': 2 },
  //     result: { ironingot: 1 },
  //     craftTime: 1800, 
  //     unlockLevel: 8,
  //     rarity: 'Uncommon',
  //     value: 20,
  //     icon: '🧱',
  //     imageSrc: 'images/rpg/ironingot.png',
  //     type: 'recipe'
  //   }
  // ],
  
  // Resources - crafted basic resources
  resources: [
    {
      id: 'stick',
      name: 'Stick',
      description: 'x5 Simple wooden sticks made from log. Essential for crafting arrows and tools.',
      materials: {
        woodlog: 1
      },
      result: { stick: 5 },
      difficulty: 'Easy',
      craftTime: 300, // seconds
      icon: '🪵',
      imageSrc: 'images/rpg/stick.png',
      category: 'resources',
      rarity: 'Common',
      unlockLevel: 1,
      value: 1
    },
    {
      id: 'rope',
      name: 'Rope',
      description: 'Sturdy rope made from plant fibers. Essential for many crafting recipes.',
      materials: {
        fiber: 1
      },
      difficulty: 'Easy',
      craftTime: 300, // seconds
      icon: '➰',
      imageSrc: 'images/rpg/rope.png',
      category: 'resources',
      rarity: 'Common',
      unlockLevel: 1,
      value: 5
    },
    {
      id: 'crushedrock',
      name: 'Crushed Rock',
      description: 'Rocks broken down into x5 small pieces. Used for crafting arrowheads and tools.',
      materials: {
        rock: 1
      },
      result: { crushedrock: 5 },
      difficulty: 'Easy',
      craftTime: 300, // seconds
      icon: '🪨',
      imageSrc: 'images/rpg/crushedrock.png',
      category: 'resources',
      rarity: 'Common',
      unlockLevel: 1,
      value: 2
    }
  ]
};

// Function to get recipes by category
const getRecipesByCategory = (category) => {
  return craftingRecipes[category] || [];
};

// Function to get a specific recipe by ID
const getRecipeById = (recipeId) => {
  for (const category in craftingRecipes) {
    const found = craftingRecipes[category].find(recipe => recipe.id === recipeId);
    if (found) return found;
  }
  return null;
};

// Function to get all recipes
const getAllRecipes = () => {
  let allRecipes = [];
  for (const category in craftingRecipes) {
    allRecipes = allRecipes.concat(craftingRecipes[category]);
  }
  return allRecipes;
};

// Function to get recipes available at a certain level
const getRecipesByLevel = (level) => {
  let availableRecipes = [];
  for (const category in craftingRecipes) {
    const categoryRecipes = craftingRecipes[category].filter(recipe => recipe.unlockLevel <= level);
    availableRecipes = availableRecipes.concat(categoryRecipes);
  }
  return availableRecipes;
};

// Function to check if a recipe is unlocked at a certain level
const isRecipeUnlocked = (recipeId, level) => {
  const recipe = getRecipeById(recipeId);
  return recipe ? recipe.unlockLevel <= level : false;
};

// Функция для обновления рецептов при получении уведомления от сервис-воркера
const handleRecipesUpdate = async (version) => {
  console.log(`Обновление рецептов до версии ${version}`);
  
  try {
    // Очищаем кеш рецептов в локальном хранилище
    if (localStorage.getItem('craftingRecipes')) {
      localStorage.removeItem('craftingRecipes');
      console.log('Кеш рецептов в localStorage очищен');
    }
    
    // Загружаем обновленные рецепты с сервера с добавлением версии и временной метки
    const timestamp = Date.now();
    const recipesUrl = `js/rpg/crafting/recipes.js?v=${version}&t=${timestamp}`;
    
    console.log(`Загрузка обновленных рецептов из: ${recipesUrl}`);
    
    // Создаем новый элемент script для загрузки обновленных рецептов
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/babel';
    scriptElement.src = recipesUrl;
    
    // Добавляем обработчик загрузки
    scriptElement.onload = () => {
      console.log('Рецепты успешно обновлены');
      
      // Обновляем глобальные переменные
      if (window.CraftingRecipes) {
        // Перезагружаем все рецепты из модуля
        const allRecipesData = [];
        
        // Получаем все категории рецептов
        Object.keys(window.CraftingRecipes.recipes).forEach(category => {
          const categoryRecipes = window.CraftingRecipes.recipes[category] || [];
          allRecipesData.push(...categoryRecipes);
        });
        
        // Обновляем глобальную переменную для доступа из других модулей
        window.allCraftingRecipes = allRecipesData;
        
        // Создаем и диспетчеризуем событие обновления рецептов
        const recipesUpdatedEvent = new CustomEvent('recipesUpdated', { 
          detail: { version, timestamp } 
        });
        window.dispatchEvent(recipesUpdatedEvent);
        
        console.log('Событие recipesUpdated отправлено');
      } else {
        console.error('window.CraftingRecipes не найден после обновления');
      }
    };
    
    // Добавляем обработчик ошибки
    scriptElement.onerror = (error) => {
      console.error('Ошибка при загрузке обновленных рецептов:', error);
    };
    
    // Добавляем скрипт в DOM
    document.head.appendChild(scriptElement);
    
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении рецептов:', error);
    return false;
  }
};

// Функция для очистки кеша изображений рецептов
const clearRecipeImageCache = () => {
  console.log('Очистка кеша изображений рецептов');
  
  try {
    // Предзагружаем все изображения с новым временным штампом
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
      
      console.log('Кеш изображений рецептов очищен');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка при очистке кеша изображений рецептов:', error);
    return false;
  }
};

// Export the recipes and utility functions as properties of a global object
window.CraftingRecipes = {
  recipes: craftingRecipes,
  getRecipesByCategory,
  getRecipeById,
  getAllRecipes,
  getRecipesByLevel,
  isRecipeUnlocked,
  handleRecipesUpdate,
  clearRecipeImageCache
};

// Добавляем обработчик сообщений от сервис-воркера
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'RECIPES_UPDATED') {
      console.log(`Получено сообщение об обновлении рецептов от сервис-воркера, версия: ${event.data.version}`);
      
      // Обновляем рецепты
      window.CraftingRecipes.handleRecipesUpdate(event.data.version)
        .then(success => {
          if (success) {
            // Очищаем кеш изображений
            window.CraftingRecipes.clearRecipeImageCache();
          }
        });
    }
  });
  
  console.log('Обработчик сообщений от сервис-воркера установлен в recipes.js');
} 