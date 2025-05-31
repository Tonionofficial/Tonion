// Item Catalog Module for RPG App
// Comprehensive item catalog with detailed descriptions and values

// Extended list of items
const fallbackItems = [
  {
    item_id: "rock",
    name: "Rock",
    type: "Resource",
    rarity: "Common",
    description: "A common rock found while gathering. Essential for basic crafting and construction.",
    properties: "Basic crafting material for tools and structures",
    value: 1,
    image_path: "images/rpg/rock.png"
  },
  {
    item_id: "woodlog",
    name: "Wood Log",
    type: "Resource",
    rarity: "Common",
    description: "Wood gathered from the forest. Used in various crafting recipes.",
    properties: "Basic crafting material for tools, weapons and structures",
    value: 2,
    image_path: "images/rpg/woodlog.png"
  },
  {
    item_id: "berry",
    name: "Berry",
    type: "Resource",
    rarity: "Common",
    description: "Wild berries found while foraging. Can be consumed for health.",
    properties: "Consumable, +5 health when eaten",
    value: 3,
    image_path: "images/rpg/berry.png"
  },
  {
    item_id: "coin",
    name: "Coin",
    type: "Resource",
    rarity: "Rare",
    description: "A shiny golden coin.",
    properties: "Used as Dungeon pass",
    value: 10,
    image_path: "images/rpg/onion.png"
  },
  {
    item_id: "junk",
    name: "Junk",
    type: "Resource",
    rarity: "Common",
    description: "Junk metal that can be salvaged for parts or scrapped for resources.",
    properties: "Can be salvaged for metal scraps",
    value: 1,
    image_path: "images/rpg/junk.png"
  },
  {
    item_id: "herbs",
    name: "Medicinal Herbs",
    type: "Resource",
    rarity: "Common",
    description: "A rare herb with healing properties. Used in potions and remedies.",
    properties: "Crafting ingredient for healing items",
    value: 5,
    image_path: "images/rpg/herbs.png"
  },
  {
    item_id: "ironore",
    name: "Iron Ore",
    type: "Resource",
    rarity: "Common",
    description: "Raw iron ore extracted from mining. Can be refined into iron ingots.",
    properties: "Can be smelted into iron ingots",
    value: 4,
    image_path: "images/rpg/ironore.png"
  },
  // Metal Ingot removed, Iron Ingot is used instead (id: ironingot)
  {
    item_id: "leather",
    name: "Leather",
    type: "Resource",
    rarity: "Common",
    description: "Tanned animal hide. Used for crafting armor and accessories.",
    properties: "Crafting material for lightweight armor and bags",
    value: 6,
    image_path: "images/rpg/leather.png"
  },
  {
    item_id: "onion",
    name: "Onion",
    type: "Currency",
    rarity: "Rare",
    description: "A special currency used in some parts of the game world. Can also be used in cooking.",
    properties: "Alternative currency with cooking properties",
    value: 8,
    image_path: "images/rpg/onion.png"
  },
  {
    item_id: "candy",
    name: "Candy",
    type: "Consumable",
    rarity: "Rare",
    description: "Sweet treats that provide temporary energy boosts and effects.",
    properties: "Provides short-term energy boost when consumed",
    value: 6,
    image_path: "images/rpg/candy.png"
  },
  {
    item_id: "mushrooms",
    name: "Mushrooms",
    type: "Resource",
    rarity: "Common",
    description: "Edible fungi found in damp, dark areas. Used in cooking and potions.",
    properties: "Crafting ingredient for potions and food",
    value: 4,
    image_path: "images/rpg/mushrooms.png"
  },
  {
    item_id: "stick",
    name: "Stick",
    type: "Resource",
    rarity: "Common",
    description: "A simple wooden stick. Basic material for early crafting recipes.",
    properties: "Basic crafting material for simple tools",
    value: 1,
    image_path: "images/rpg/stick.png"
  },
  {
    item_id: "fiber",
    name: "Fiber",
    type: "Resource",
    rarity: "Common",
    description: "Plant fibers gathered from various plants. Used for crafting textiles and ropes.",
    properties: "Crafting material for clothing and bags",
    value: 2,
    image_path: "images/rpg/fiber.png"
  },
  {
    item_id: "rope",
    name: "Rope",
    type: "Resource",
    rarity: "Common",
    description: "Sturdy rope made from plant fibers. Essential for many crafting recipes.",
    properties: "Crafting material for weapons, tools and structures",
    value: 5,
    image_path: "images/rpg/rope.png"
  },
  {
    item_id: "crushedrock",
    name: "Crushed Rock",
    type: "Resource",
    rarity: "Common",
    description: "Rocks broken down into small pieces. Used for crafting arrowheads and tools.",
    properties: "Crafting material for arrows and primitive tools",
    value: 2,
    image_path: "images/rpg/crushedrock.png"
  },
  {
    item_id: "primarrows",
    name: "Primitive Arrows",
    type: "Ammunition",
    rarity: "Common",
    description: "Simple arrows made from sticks, rope and crushed rock. Basic ammunition for hunting.",
    properties: "Used with bows for hunting",
    value: 8,
    image_path: "images/rpg/primarrows.png"
  },
  {
    item_id: "primknife",
    name: "Primitive Knife",
    type: "Tool",
    rarity: "Common",
    description: "Basic survival tool in the wild.",
    properties: "Important tool to butcher quarry",
    value: 5,
    image_path: "images/rpg/primknife.png"
  },
  {
    item_id: "primaxe",
    name: "Primitive Axe",
    type: "Tool",
    rarity: "Common",
    description: "A crude axe for chopping wood. Not very durable but gets the job done.",
    properties: "Improves the efficiency of wood gathering",
    value: 5,
    image_path: "images/rpg/primaxe.png"
  },
  {
    item_id: "primbow",
    name: "Primitive Bow",
    type: "Tool",
    rarity: "Common",
    description: "A simple bow. Good for hunting small animals.",
    properties: "Used with arrows for hunting",
    value: 5,
    image_path: "images/rpg/primbow.png"
  },
  {
    item_id: "primpickaxe",
    name: "Primitive Pickaxe",
    type: "Tool",
    rarity: "Common",
    description: "A basic pickaxe for mining ore and stone. Simple but effective for gathering basic resources.",
    properties: "Improves the efficiency of mining resources",
    value: 18,
    image_path: "images/rpg/primpickaxe.png"
  },
  {
    item_id: "campfire",
    name: "Camp Fire",
    type: "Structure",
    rarity: "Common",
    description: "A simple campfire for cooking food and warmth. Essential in the wilderness.",
    properties: "Allows cooking food and provides protection from cold",
    value: 3,
    image_path: "images/rpg/campfire.png"
  },
  {
    item_id: 'furnace',
    name: 'Furnace',
    type: 'Structure',
    rarity: 'Uncommon',
    description: 'A primitive furnace for smelting ore into ingots',
    value: 50,
    imageSrc: 'images/rpg/furnace.png'

  },
  {
    item_id: "meat",
    name: "Raw Meat",
    type: "Resource",
    rarity: "Common",
    description: "Fresh meat from a hunted animal. Can be cooked for better nutrition.",
    properties: "Can be cooked on a campfire for more benefits",
    value: 6,
    image_path: "images/rpg/meat.png"
  },
  {
    item_id: "cookedmeat",
    name: "Cooked Meat",
    type: "Consumable",
    rarity: "Uncommon",
    description: "Meat cooked over a campfire. Restores more health than raw meat.",
    properties: "Restores a large amount of health when eaten",
    value: 15,
    image_path: "images/rpg/cookedmeat.png"
  },
  {
    item_id: "ironingot",
    name: "Iron Ingot",
    type: "Resource",
    rarity: "Uncommon",
    description: "A bar of refined iron. Used for advanced crafting.",
    properties: "Used for weapons, tools, and armor",
    value: 20,
    image_path: "images/rpg/ironingot.png"
  },
  // Примитивные предметы брони
  {
    item_id: "primhelmet",
    name: "Primitive Helmet",
    type: "Armor",
    rarity: "Common",
    description: "A basic helmet made from leather and reinforced with bone. Offers minimal protection.",
    properties: "+2 Armor, +1 Health",
    value: 15,
    image_path: "images/rpg/primhelmet.png"
  },
  {
    item_id: "primarmor",
    name: "Primitive Armor",
    type: "Armor",
    rarity: "Common",
    description: "A crude vest made of leather and plant fiber. Better than nothing against attacks.",
    properties: "+3 Armor, +2 Health",
    value: 20,
    image_path: "images/rpg/primarmor.png"
  },
  {
    item_id: "primbelt",
    name: "Primitive Belt",
    type: "Armor",
    rarity: "Common",
    description: "A simple belt made from leather straps. Offers utility more than protection.",
    properties: "+1 Armor, +1 Inventory Slot",
    value: 10,
    image_path: "images/rpg/primbelt.png"
  },
  {
    item_id: "primpants",
    name: "Primitive Pants",
    type: "Armor",
    rarity: "Common",
    description: "Rough pants crafted from leather. Provides basic protection for your legs.",
    properties: "+2 Armor, +1 Agility",
    value: 15,
    image_path: "images/rpg/primpants.png"
  },
  {
    item_id: "primboots",
    name: "Primitive Boots",
    type: "Armor",
    rarity: "Common",
    description: "Simple footwear made of leather. Protects feet from rough terrain.",
    properties: "+1 Armor, +1 Movement Speed",
    value: 12,
    image_path: "images/rpg/primboots.png"
  },
  {
    item_id: "primgloves",
    name: "Primitive Gloves",
    type: "Armor",
    rarity: "Common",
    description: "Basic hand protection made from leather. Helps with handling tools and weapons.",
    properties: "+1 Armor, +1 Tool Efficiency",
    value: 10,
    image_path: "images/rpg/primgloves.png"
  },
  {
    item_id: "primvambraces",
    name: "Primitive Vambraces",
    type: "Armor",
    rarity: "Common",
    description: "Crude arm guards crafted from leather and wood. Provides minimal protection for the forearms.",
    properties: "+1 Armor, +1 Strength",
    value: 10,
    image_path: "images/rpg/primvambraces.png"
  },
  // Кожаная броня
  {
    item_id: "leatherhelmet",
    name: "Leather Helmet",
    type: "Armor",
    rarity: "Common",
    description: "A well-crafted leather helmet. Provides better protection than primitive gear.",
    properties: "+3 Armor, +2 Health",
    value: 25,
    image_path: "images/rpg/leatherhelmet.png"
  },
  {
    item_id: "leatherarmor",
    name: "Leather Armor",
    type: "Armor",
    rarity: "Common",
    description: "A sturdy leather vest that offers good protection while maintaining mobility.",
    properties: "+4 Armor, +3 Health",
    value: 35,
    image_path: "images/rpg/leatherarmor.png"
  },
  {
    item_id: "leatherbelt",
    name: "Leather Belt",
    type: "Armor",
    rarity: "Common",
    description: "A quality leather belt with pouches for carrying gear. Increases carrying capacity.",
    properties: "+2 Armor",
    value: 20,
    image_path: "images/rpg/leatherbelt.png"
  },
  {
    item_id: "leatherpants",
    name: "Leather Pants",
    type: "Armor",
    rarity: "Common",
    description: "Durable leather pants that provide excellent leg protection and flexibility.",
    properties: "+3 Armor",
    value: 30,
    image_path: "images/rpg/leatherpants.png"
  },
  {
    item_id: "leatherboots",
    name: "Leather Boots",
    type: "Armor",
    rarity: "Common",
    description: "High-quality leather boots that protect feet and improve movement speed.",
    properties: "+2 Armor",
    value: 25,
    image_path: "images/rpg/leatherboots.png"
  },
  {
    item_id: "leathergloves",
    name: "Leather Gloves",
    type: "Armor",
    rarity: "Common",
    description: "Fine leather gloves that enhance grip and tool handling efficiency.",
    properties: "+2 Armor",
    value: 20,
    image_path: "images/rpg/leathergloves.png"
  },
  {
    item_id: "leathervambraces",
    name: "Leather Vambraces",
    type: "Armor",
    rarity: "Common",
    description: "Reinforced leather arm guards that provide excellent forearm protection.",
    properties: "+2 Armor, +2 Strength",
    value: 22,
    image_path: "images/rpg/leathervambraces.png"
  },
  // Примитивное оружие
  {
    item_id: "primclub",
    name: "Primitive Club",
    type: "Weapon",
    rarity: "Common",
    description: "A heavy wooden club. Simple but effective for close combat.",
    properties: "+4 Damage,",
    value: 12,
    image_path: "images/rpg/primclub.png"
  },
  {
    item_id: "primspear",
    name: "Primitive Spear",
    type: "Weapon",
    rarity: "Common",
    description: "A wooden spear with a sharpened tip. Good reach and moderate damage.",
    properties: "+3 Damage",
    value: 18,
    image_path: "images/rpg/primspear.png"
  }
];

// Get item by ID
const getItemFromIndexedDB = async (itemId) => {
  if (!itemId) return null;
  
  // Normalize ID for search
  const normalizedId = itemId.toLowerCase();
  
  // Special cases for handling non-standard IDs
  let searchId = normalizedId;
  
  // Processing special cases
  if (normalizedId === 'wood log' || normalizedId === 'wood_log') {
    searchId = 'woodlog';
  } else if (normalizedId === 'iron ore' || normalizedId === 'iron_ore' || normalizedId === 'Iron_Ore') {
    searchId = 'ironore';
  } else if (normalizedId === 'iron ingot' || normalizedId === 'iron_ingot') {
    searchId = 'ironingot';
  } else if (normalizedId.includes(' ')) {
    searchId = normalizedId.replace(/\s+/g, '');
  }
  
  // Поиск в нашем каталоге с учетом различных форматов ID
  const item = fallbackItems.find(item => {
    const itemIdLower = item.item_id.toLowerCase();
    return itemIdLower === normalizedId || 
           itemIdLower === searchId ||
           itemIdLower.replace(/\s+/g, '') === searchId ||
           itemIdLower.replace(/\s+/g, '_') === searchId;
  });
  
  // Если предмет найден в основном каталоге, возвращаем его
  if (item) {
    return item;
  }
  
  // Если предмет не найден в fallbackItems, ищем в CraftingRecipes
  if (window.CraftingRecipes && typeof window.CraftingRecipes.getRecipeById === 'function') {
    // Пытаемся найти по оригинальному ID
    let recipeItem = window.CraftingRecipes.getRecipeById(itemId);
    
    // Если не нашли, попробуем по нормализованному ID
    if (!recipeItem && itemId !== searchId) {
      recipeItem = window.CraftingRecipes.getRecipeById(searchId);
    }
    
    if (recipeItem) {
      // Создаем объект в формате, совместимом с форматом fallbackItems
      return {
        item_id: recipeItem.id,
        name: recipeItem.name,
        type: recipeItem.category || 'Structure',
        rarity: recipeItem.rarity || 'Common',
        description: recipeItem.description || '',
        properties: recipeItem.stats ? Object.entries(recipeItem.stats).map(([key, value]) => `${key}: ${value}`).join(', ') : '',
        value: recipeItem.value || 0,
        image_path: recipeItem.imageSrc || `images/rpg/${recipeItem.id.toLowerCase().replace(/\s+/g, '_')}.png`,
        // Добавляем специальные поля из рецепта
        craftTime: recipeItem.craftTime,
        difficulty: recipeItem.difficulty,
        unlockLevel: recipeItem.unlockLevel,
        materials: recipeItem.materials,
        stats: recipeItem.stats
      };
    }
  }
  
  return null;
};

// Преобразование объекта ресурсов в массив с данными из каталога
const resourcesObjectToArray = (resourcesObj) => {
  if (!resourcesObj) return [];
  
  return Object.entries(resourcesObj)
    .filter(([key, amount]) => 
      // Значение должно быть больше 0
      amount > 0 && 
      // Исключаем служебные поля и проблемные ресурсы
      !['telegramid', 'spinsleft', 'streak', 'spins_left', 'spins', 'telegram_id', 'id', 'telegramId', 'lastUpdated', 'egg', 'loadedFromServer'].includes(key.toLowerCase())
    )
    .map(([id, amount]) => {
      // Получаем информацию о предмете из каталога или создаем базовую информацию
      const catalogItem = findCatalogItemById(id);
      
      if (catalogItem) {
        return {
          ...catalogItem,
          id,
          qty: amount
        };
      } else {
        // Если предмет не найден в каталоге, создаем базовую информацию
        return {
          id,
          item_id: id,
          name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
          qty: amount,
          rarity: determineRarityById(id),
          type: 'Resource',
          properties: '',
          description: 'No description available'
        };
      }
    });
};

// Определение редкости предмета по ID
const determineRarityById = (itemId) => {
  if (!itemId) return 'Common';
  
  // Normalize ID for search (to lowercase)
  const normalizedId = itemId.toLowerCase();
  
  // Special cases for handling non-standard IDs
  let searchId = normalizedId;
  
  // Обработка специальных случаев
  if (normalizedId === 'wood log' || normalizedId === 'wood_log' || normalizedId === 'woodlog') {
    searchId = 'woodlog';
  } else if (normalizedId === 'iron ore' || normalizedId === 'iron_ore' || normalizedId === 'ironore' || normalizedId === 'Iron_Ore' ) {
    searchId = 'ironore';
  } else if (normalizedId === 'iron ingot' || normalizedId === 'iron_ingot' || normalizedId === 'ironingot') {
    searchId = 'ironingot';
  } else if (normalizedId.includes(' ')) {
    // Удаляем пробелы для сравнения
    searchId = normalizedId.replace(/\s+/g, '');
  }
  
  // Ищем предмет в каталоге
  const catalogItem = fallbackItems.find(item => {
    const itemIdLower = item.item_id.toLowerCase();
    return itemIdLower === normalizedId || 
           itemIdLower === searchId || 
           itemIdLower.replace(/\s+/g, '') === searchId ||
           itemIdLower.replace(/\s+/g, '_') === searchId;
  });
  
  // Возвращаем редкость если нашли, иначе Common
  if (catalogItem) {
    return catalogItem.rarity;
  }
  
  // Если не нашли, проверяем по прямому соответствию ID для особых случаев
  if (searchId === 'herbs' || normalizedId === 'herbs') {
    return 'Uncommon';
  } else if (searchId === 'mushrooms' || normalizedId === 'mushrooms') {
    return 'Uncommon';
  } else if (searchId === 'leather' || normalizedId === 'leather') {
    return 'Uncommon';
  } else if (searchId === 'ironore' || normalizedId === 'iron_ore' || normalizedId === 'iron ore' || normalizedId === 'Iron_Ore') {
    return 'Uncommon';
  } else if (searchId === 'ironingot' || normalizedId === 'iron_ingot' || normalizedId === 'iron ingot') {
    return 'Rare';
  } else if (searchId === 'gemstone' || normalizedId === 'gemstone') {
    return 'Epic';
  } else if (searchId === 'crystal' || normalizedId === 'crystal') {
    return 'Epic';
  } else if (searchId === 'ancient_artifact' || normalizedId === 'ancientartifact') {
    return 'Mythic';
  } else if (searchId === 'onion' || normalizedId === 'onion' || 
             searchId === 'candy' || normalizedId === 'candy' || 
             searchId === 'coin' || normalizedId === 'coin') {
    return 'Rare';
  }
  
  return 'Common';
};

// Получение цвета редкости
const getRarityColor = (rarity) => {
  if (!rarity) return '#aaa';
  
  switch (rarity.toLowerCase()) {
    case 'common': return '#aaa';
    case 'uncommon': return '#1eff00';
    case 'rare': return '#0070dd';
    case 'epic': return '#a335ee';
    case 'legendary': return '#ff8000';
    case 'mythic': return '#e6cc80';
    default: return '#aaa';
  }
};

// Получение цвета свечения на основе редкости
const getRarityGlowColor = (rarity) => {
  // Более яркий вариант цвета для свечения
  const baseColor = getRarityColor(rarity);
  return baseColor;
};

// Добавление временной метки к URL для предотвращения кэширования
const addTimestamp = (url) => {
  const timestamp = new Date().getTime();
  return url + (url.includes('?') ? '&' : '?') + 't=' + timestamp;
};

// Проверка готовности каталога предметов
const isItemCatalogReady = () => {
  return true; // Каталог всегда готов, т.к. использует fallbackItems
};

// Ожидание загрузки каталога предметов (для обратной совместимости)
const waitForItemCatalog = async () => {
  return true;
};

// Получение полного каталога предметов
const getItemCatalog = () => {
  // Создаем объект для быстрого доступа к предметам по их ID
  const catalog = {};
  
  fallbackItems.forEach(item => {
    // Оригинальный ID предмета с маленькой буквы
    const originalId = item.item_id;
    
    // Добавляем предмет в каталог по оригинальному ID
    catalog[originalId] = { ...item };
    
    // Создаем дополнительные варианты написания ID предмета:
    
    // 1. С большой буквы
    const capitalizedId = originalId.charAt(0).toUpperCase() + originalId.slice(1);
    if (originalId !== capitalizedId) {
      catalog[capitalizedId] = { ...item };
    }
    
    // 2. Все буквы заглавные
    const upperCaseId = originalId.toUpperCase();
    if (originalId !== upperCaseId) {
      catalog[upperCaseId] = { ...item };
    }
    
    // 3. С подчеркиваниями вместо пробелов
    if (originalId.includes(' ')) {
      const underscoreId = originalId.replace(/\s+/g, '_');
      catalog[underscoreId] = { ...item };
      
      // Также вариант с подчеркиваниями и заглавной буквой
      const capitalizedUnderscoreId = underscoreId.charAt(0).toUpperCase() + underscoreId.slice(1);
      catalog[capitalizedUnderscoreId] = { ...item };
    }
    
    // 4. Без пробелов
    if (originalId.includes(' ')) {
      const noSpacesId = originalId.replace(/\s+/g, '');
      catalog[noSpacesId] = { ...item };
      
      // Также вариант без пробелов и с заглавной буквой
      const capitalizedNoSpacesId = noSpacesId.charAt(0).toUpperCase() + noSpacesId.slice(1);
      catalog[capitalizedNoSpacesId] = { ...item };
    }
    
    // 5. Специальные случаи
    if (originalId === 'woodlog') {
      catalog['wood_log'] = { ...item };
      catalog['Wood Log'] = { ...item };
      catalog['WoodLog'] = { ...item };
    }
    
    if (originalId === 'ironore') {
      catalog['ironOre'] = { ...item };
      catalog['IronOre'] = { ...item };
    }
    
    if (originalId === 'ironingot') {
      catalog['ironIngot'] = { ...item };
      catalog['IronIngot'] = { ...item };
    }
  });
  
  return catalog;
};

// Добавим функцию для диагностики каталога предметов
const diagnoseItemCatalog = (resourcesObj) => {
  console.log('------- ItemCatalog Diagnostics -------');
  console.log(`Total catalog items: ${fallbackItems.length}`);
  
  // Получаем каталог с вариантами написания
  const catalog = getItemCatalog();
  console.log(`Total catalog entries (with variations): ${Object.keys(catalog).length}`);
  
  // Если передан объект ресурсов, проверим наличие каждого ресурса в каталоге
  if (resourcesObj && typeof resourcesObj === 'object') {
    console.log('Checking resources against catalog:');
    
    Object.entries(resourcesObj).forEach(([id, amount]) => {
      if (amount > 0 && !['telegramid', 'spinsleft', 'streak', 'spins_left', 'spins', 'telegram_id'].includes(id.toLowerCase())) {
        const catalogItem = findCatalogItemById(id);
        if (catalogItem) {
          console.log(`✅ Resource ${id} found in catalog as ${catalogItem.item_id} (${catalogItem.rarity})`);
        } else {
          console.log(`❌ Resource ${id} NOT found in catalog! Fallback rarity: ${determineRarityById(id)}`);
        }
      }
    });
  }
  
  console.log('------- End of Diagnostics -------');
  return true;
};

// Вспомогательная функция для поиска предмета в каталоге по ID
const findCatalogItemById = (id) => {
  if (!id) return null;
  
  // Получаем каталог
  const itemCatalog = getItemCatalog();
  
  // Проверяем прямое совпадение в каталоге
  if (itemCatalog[id]) {
    return itemCatalog[id];
  }
  
  // Пробуем найти по нормализованным вариантам ID
  const idLower = id.toLowerCase();
  const idNoSpaces = idLower.replace(/\s+/g, '');
  const idUnderscore = idLower.replace(/\s+/g, '_');
  
  // Проверяем все возможные варианты
  if (itemCatalog[idLower]) return itemCatalog[idLower];
  if (itemCatalog[idNoSpaces]) return itemCatalog[idNoSpaces];
  if (itemCatalog[idUnderscore]) return itemCatalog[idUnderscore];
  
  // Специальные случаи
  if (idLower === 'wood log' || idLower === 'wood_log') {
    return itemCatalog['woodlog'];
  }
  
  // Если с маленькой буквы не нашли, пробуем с большой
  const idCapitalized = id.charAt(0).toUpperCase() + id.slice(1);
  if (itemCatalog[idCapitalized]) return itemCatalog[idCapitalized];
  
  // Также проверяем капитализированные варианты
  const capitalizedNoSpaces = idNoSpaces.charAt(0).toUpperCase() + idNoSpaces.slice(1);
  if (itemCatalog[capitalizedNoSpaces]) return itemCatalog[capitalizedNoSpaces];
  
  // Если ничего не нашли, возвращаем null
  return null;
};

// Экспортируем функции модуля
window.ItemCatalogModule = {
  getItemFromIndexedDB,
  resourcesObjectToArray,
  determineRarityById,
  getRarityColor,
  getRarityGlowColor,
  isItemCatalogReady,
  waitForItemCatalog,
  getItemCatalog,
  addTimestamp,
  diagnoseItemCatalog,
  findCatalogItemById
};

// Отмечаем модуль как загруженный
window.itemCatalogLoaded = true; 