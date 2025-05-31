// InventoryModule компоненты RPG игры
// Содержит компоненты для отображения инвентаря, без модальных окон

const { useState, useEffect, useRef, createPortal } = React;

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

// Флаг для блокировки одновременных обновлений инвентаря
let isInventoryUpdating = false;
let lastInventoryUpdateTimestamp = 0;

// Helper function to determine rarity by item ID if ItemCatalogModule is not available - deprecated
const determineRarityById = (itemId) => {
  // Функционал перенесен в ItemCatalogModule
  return 'Common';
};

// InventoryItem Component
const InventoryItem = ({ 
  resource, 
  onClick = () => {},
  showTooltip = true,
  className = '',
  size = 50,
  style = {}
}) => {
  const [itemDetails, setItemDetails] = useState(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const itemRef = useRef(null);
  
  // Применение стилей в компоненте
  useEffect(() => {
    // Добавляем стили для hover-эффекта и тултипа
    if (!document.getElementById('inventory-item-animations')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'inventory-item-animations';
      styleElement.textContent = `
        .inventory-item:hover {
          transform: scale(1.1) !important;
          z-index: 2 !important;
          border-color: #00fff7 !important;
          box-shadow: 0 0 16px rgba(0,255,255,0.53), 0 0 2px #fff !important;
        }
        
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .inventory-tooltip.futuristic {
          position: fixed;
          background: linear-gradient(135deg, rgba(0,255,255,0.18) 0%, rgba(0,0,40,0.8) 100%);
          border: 2px solid rgba(0,255,255,0.35);
          border-top: 2.5px solid #00fff7;
          border-bottom: 2.5px solid #00fff7;
          border-radius: 8px;
          padding: 10px;
          box-shadow: 0 8px 32px 0 rgba(31,38,135,0.37);
          z-index: 1000;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          pointer-events: none;
          animation: tooltipFadeIn 0.15s ease-out;
          color: #ffffff;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }, []);
  
  // Функция загрузки данных предмета из ItemCatalog
  useEffect(() => {
    setIsTooltipVisible(true);
    
    const loadItemDetails = async () => {
      let itemData = null;
      const itemId = resource.id || resource.item_id;
      
      // Попытка получить данные из ItemCatalog
      if (window.ItemCatalogModule && typeof window.ItemCatalogModule.findCatalogItemById === 'function') {
        try {
          // Используем функцию findCatalogItemById из ItemCatalogModule
          itemData = window.ItemCatalogModule.findCatalogItemById(itemId);
          
          if (!itemData && typeof window.ItemCatalogModule.getItemFromIndexedDB === 'function') {
            // Если не нашли через findCatalogItemById, пробуем getItemFromIndexedDB
            itemData = await window.ItemCatalogModule.getItemFromIndexedDB(itemId);
          }
        } catch (error) {
          console.error('[InventoryItem] Error loading item details from ItemCatalog:', error);
        }
      }
      
      // Если не удалось получить данные из ItemCatalog, используем данные из item
      if (!itemData) {
        itemData = {
          name: resource.name || itemId || 'Предмет',
          rarity: resource.rarity || 'Common',
          description: resource.description || 'Этот предмет не имеет описания',
          type: resource.type || 'Resource',
          properties: resource.properties || '',
          item_id: itemId || 'unknown'
        };
      }
      
      setItemDetails(itemData);
      setIsTooltipVisible(false);
    };
    
    loadItemDetails();
  }, [resource]);
  
  // Function to get item border color based on rarity
  const getBorderColor = () => {
    // Use catalog item details if available
    const rarity = resource.rarity || 'Common';
    
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
  
  // Get image path with fallbacks
  const getImagePath = () => {
    let itemId = (resource.id || resource.item_id || '').toLowerCase();
    if (itemId === 'wood log' || itemId === 'wood_log') {
      itemId = 'woodlog';
    }
    return `images/rpg/${itemId.replace(/\s+/g, '_')}.png`;
  };
  
  const getFallbackImagePath = () => {
    let itemId = (resource.id || resource.item_id || '').toLowerCase();
    if (itemId === 'wood log' || itemId === 'wood_log') {
      itemId = 'woodlog';
    }
    return `images/rpg/${itemId.replace(/\s+/g, '')}.png`;
  };
  
  // Функция для определения подходящего слота для предмета
  const getItemSlot = (itemId) => {
    if (!itemId) return null;
    
    const id = itemId.toLowerCase();
    
    // Получаем информацию о предмете из каталога для проверки его типа
    let itemType = null;
    if (window.ItemCatalogModule && typeof window.ItemCatalogModule.findCatalogItemById === 'function') {
      const catalogItem = window.ItemCatalogModule.findCatalogItemById(itemId);
      if (catalogItem) {
        itemType = catalogItem.type;
      }
    }
    
    // Если это лук, он всегда занимает первый слот оружия
    if (id.includes('bow')) { 
      return 'weapon1'; // Луки всегда в слот weapon1
    }
    
    // Проверка на наличие лука в weapon1
    const hasEquippedBow = window.equippedItems && window.equippedItems.weapon1 && 
                            window.equippedItems.weapon1.toLowerCase().includes('bow');
    
    // Если второе оружие/щит и уже есть лук, предотвращаем экипировку
    if ((id.includes('shield') || id.includes('offhand') || id.includes('book') || id.includes('orb')) && hasEquippedBow) {
      console.log('Невозможно экипировать предмет во второй слот, пока экипирован лук');
      return null; // Нельзя экипировать во второй слот, если есть лук
    }
    
    // Убираем возможность экипировать стрелы
    if (id.includes('arrow') || id.includes('bolt') || id.includes('ammo') || id.includes('ammunition')) {
      // Стрелы больше нельзя экипировать
      return null;
    }
    
    // Проверяем, является ли предмет оружием или инструментом по типу из каталога
    if (itemType === 'Weapon' || itemType === 'Tool') {
      return 'weapon1'; // Оружие и инструменты идут в слот weapon1
    }
    
    // Определяем тип предмета по ID (резервная логика)
    if (id.includes('sword') || id.includes('axe') || id.includes('dagger') || id.includes('staff') || 
        id.includes('club') || id.includes('spear') || id.includes('knife') || id.includes('pickaxe')) {
      return 'weapon1';
    } else if (id.includes('shield') || id.includes('offhand') || id.includes('book') || id.includes('orb')) {
      return 'weapon2';
    } else if (id.includes('helmet') || id.includes('crown') || id.includes('hat') || id.includes('mask')) {
      return 'helmet';
    } else if (id.includes('armor') || id.includes('robe') || id.includes('chest')) {
      return 'armor';
    } else if (id.includes('belt') || id.includes('sash')) {
      return 'belt';
    } else if (id.includes('pants') || id.includes('leggings') || id.includes('trousers')) {
      return 'pants';
    } else if (id.includes('boots') || id.includes('shoes') || id.includes('greaves')) {
      return 'boots';
    } else if (id.includes('gloves') || id.includes('gauntlets')) {
      return 'gloves';
    } else if (id.includes('bracers') || id.includes('vambrace')) {
      return 'bracers';
    } else if (id.includes('earring')) {
      return 'earring';
    } else if (id.includes('amulet') || id.includes('necklace') || id.includes('pendant')) {
      return 'amulet';
    } else if (id.includes('ring')) {
      return 'ring1';
    } else if (id.includes('potion') || id.includes('elixir') || id.includes('flask')) {
      return 'potion1';
    }
    
    return null;
  };
  
  // Проверяет, есть ли у игрока экипированный лук
  const checkEquippedBow = () => {
    if (window.equippedItems) {
      const weapon1 = window.equippedItems.weapon1;
      if (weapon1 && weapon1.toLowerCase().includes('bow')) {
        return true;
      }
    }
    return false;
  };
  
  // Подсветка слота экипировки при наведении
  const highlightEquipmentSlot = () => {
    if (!itemDetails) return;
    
    const itemId = itemDetails.item_id;
    const slot = getItemSlot(itemId);
    
    if (!slot) return;
    
    // Подсвечиваем слот
    const slotElement = document.querySelector(`.equipment-slot.${slot}`);
    if (slotElement) {
      slotElement.classList.add('highlighted-slot');
      
      // Проверяем, занят ли слот
      if (window.equippedItems && window.equippedItems[slot]) {
        const equippedItemId = window.equippedItems[slot];
        console.log(`Slot ${slot} already has item: ${equippedItemId}`);
        
        // Пытаемся получить название предмета из ItemCatalogModule
        let equippedItemName = equippedItemId;
        let equippedItemRarity = 'Common';
        if (window.ItemCatalogModule && typeof window.ItemCatalogModule.findCatalogItemById === 'function') {
          const catalogItem = window.ItemCatalogModule.findCatalogItemById(equippedItemId);
          if (catalogItem) {
            if (catalogItem.name) equippedItemName = catalogItem.name;
            if (catalogItem.rarity) equippedItemRarity = catalogItem.rarity;
          }
        }
        
        // Получаем информацию о текущем предмете в инвентаре
        const currentItemName = itemDetails.name || itemId;
        const currentItemRarity = itemDetails.rarity || 'Common';
        
        // Создаем или обновляем всплывающее сообщение
        let slotMessage = slotElement.querySelector('.slot-occupied-message');
        if (!slotMessage) {
          slotMessage = document.createElement('div');
          slotMessage.className = 'slot-occupied-message';
          slotElement.appendChild(slotMessage);
        }
        
        // Определяем цвета редкости для обоих предметов
        const getColor = (rarity) => {
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
        
        const equippedColor = getColor(equippedItemRarity);
        const currentColor = getColor(currentItemRarity);
        
        slotMessage.innerHTML = `
          <div>Replace:</div>
          <div style="color: ${equippedColor}; font-weight: bold;">${equippedItemName}</div>
          <div>with:</div>
          <div style="color: ${currentColor}; font-weight: bold;">${currentItemName}</div>
        `;
        slotMessage.style.display = 'block';
      }
    }
  };
  
  // Убираем подсветку при отведении курсора
  const removeHighlight = () => {
    document.querySelectorAll('.equipment-slot.highlighted-slot').forEach(el => {
      el.classList.remove('highlighted-slot');
      
      // Скрываем сообщение о занятом слоте
      const slotMessage = el.querySelector('.slot-occupied-message');
      if (slotMessage) {
        slotMessage.style.display = 'none';
      }
    });
  };
  
  // Handle tooltip positioning
  const handleMouseEnter = (e) => {
    setIsTooltipVisible(true);
    highlightEquipmentSlot();
  };
  
  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
    removeHighlight();
  };
  
  // Render tooltip content
  const renderTooltip = () => {
    // Если нет данных из ItemCatalogModule, не показываем тултип
    if (!itemDetails) return null;
    
    // Get reference to item element for positioning
    const itemElement = itemRef.current;
    if (!itemElement) return null;
    
    const rect = itemElement.getBoundingClientRect();
    const tooltipWidth = 220; // Увеличиваем ширину с 200 до 220 как в крафтинге
    
    // Получаем ширину окна
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Проверяем позицию элемента относительно краев экрана
    const isNearLeftEdge = rect.left < tooltipWidth / 2;
    const isNearRightEdge = windowWidth - rect.right < tooltipWidth / 2;
    
    // Расчет горизонтальной позиции
    let posX = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (isNearLeftEdge) {
      posX = 10;
    } else if (isNearRightEdge) {
      posX = windowWidth - tooltipWidth - 10;
    }
    
    // Расчет вертикальной позиции
    let posY = 0;
    const tooltipHeight = 220; // Примерная высота тултипа
    
    // Всегда размещаем тултип СТРОГО над элементом, независимо от доступного пространства
    // Добавляем дополнительный отступ, чтобы тултип не перекрывал элемент
    posY = rect.top - tooltipHeight - 15;
    
    // Финальная проверка на выход за верхнюю границу экрана
    // Если тултип выходит за верхнюю границу, просто прижимаем его к верхней границе
    if (posY < 10) {
      posY = 10;
    }
    
    const borderColor = getBorderColor();
    
    return (
      <div className="inventory-tooltip futuristic" style={{
        position: 'fixed',
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${tooltipWidth}px`,
        zIndex: 1000,
        pointerEvents: 'none',
        animation: 'tooltipFadeIn 0.15s ease-out'
      }}>
        <div className="tooltip-header" style={{ 
          color: "#ffffff",
          fontWeight: "bold",
          borderBottom: `1px solid ${borderColor}50`,
          padding: "0 0 8px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          textShadow: "0 0 5px rgba(0, 255, 255, 0.5)"
        }}>
          {itemDetails.name}
          <span className="tooltip-rarity" style={{ 
            backgroundColor: `${borderColor}20`,
            border: `1px solid ${borderColor}80`,
            color: borderColor,
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "bold"
          }}>
            {itemDetails.rarity || 'Common'}
          </span>
        </div>
        
        <div className="tooltip-image-container" style={{
          background: "rgba(0, 0, 40, 0.6)",
          borderRadius: "8px", 
          padding: "10px",
          display: "flex",
          justifyContent: "center",
          marginBottom: "10px"
        }}>
          <div style={{ position: 'relative' }}>
            <img 
              src={getImagePath()}
              onError={(e) => {
                e.target.src = getFallbackImagePath();
                e.target.onerror = () => e.target.src = "images/rpg/unknown.png";
              }}
              alt={itemDetails.name}
              className="tooltip-image" 
              style={{ 
                border: `2px solid ${borderColor}`, 
                borderRadius: "6px",
                maxWidth: "80px",
                maxHeight: "80px"
              }}
            />
            {resource.qty > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                fontSize: '12px',
                padding: '2px 5px',
                borderRadius: '3px',
                border: '1px solid rgba(0, 255, 255, 0.4)',
                fontWeight: 'bold'
              }}>
                {resource.qty}
              </div>
            )}
          </div>
        </div>
        
        <div className="tooltip-description" style={{
          color: "#ffffff",
          fontSize: "13px",
          lineHeight: "1.4",
          marginBottom: "12px"
        }}>
          {itemDetails.description || 'No description available.'}
        </div>
        
        <div className="tooltip-stats">
          {itemDetails.properties && (
            <div style={{ 
              marginTop: "8px",
              padding: "8px 10px",
              background: "rgba(0, 0, 40, 0.4)",
              borderRadius: "6px",
              border: "1px solid rgba(0, 255, 255, 0.2)"
            }}>
              <div style={{ 
                color: "#ffffff", 
                fontWeight: "bold",
                marginBottom: "4px",
                textShadow: "0 0 5px rgba(0, 255, 255, 0.5)"
              }}>
                Properties:
              </div>
              <div style={{color: "#8aff8a"}}>{itemDetails.properties}</div>
            </div>
          )}
        </div>
        
        <div className="tooltip-footer" style={{ 
          borderTop: `1px solid ${borderColor}30`,
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
    );
  };
  
  // Если данные загружаются или не могут быть получены, показываем placeholder
  if (isTooltipVisible) {
    return (
      <div 
        ref={itemRef}
        className={`inventory-item ${className}`}
        style={{ 
          position: 'relative',
          width: `${size}px`,
          height: `${size}px`,
          background: 'rgba(0, 0, 0)',
          border: `2px solid rgba(0, 255, 255, 0.35)`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
          boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
          ...style
        }}
        onClick={() => onClick && onClick((resource.id || resource.item_id), resource)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ 
          fontSize: '10px', 
          color: '#aaa',
          textAlign: 'center' 
        }}>
          {isTooltipVisible ? '...' : '?'}
        </div>
        
        {resource.qty > 1 && (
          <div style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: '10px',
            padding: '1px 3px',
            borderTopLeftRadius: '3px'
          }}>
            {resource.qty}
          </div>
        )}
        
        {/* Render tooltip inside a portal to prevent z-index issues */}
        {isTooltipVisible && createPortal(
          renderTooltip(),
          document.body
        )}
      </div>
    );
  }
  
  return (
    <div 
      ref={itemRef}
      className={`inventory-item ${className}`}
      style={{ 
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        background: 'rgba(0, 0, 0)',
        border: `2px solid rgba(0, 255, 255, 0.35)`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
        boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
        ...style
      }}
      onClick={() => onClick && onClick((resource.id || resource.item_id), resource)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img 
        src={getImagePath()}
        onError={(e) => {
          e.target.src = getFallbackImagePath();
          e.target.onerror = () => e.target.src = "images/rpg/unknown.png";
        }}
        alt={itemDetails ? itemDetails.name : (resource.name || 'Item')}
        style={{ maxWidth: '32px', maxHeight: '32px' }}
      />
      
      {resource.qty > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          right: '0',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          fontSize: '10px',
          padding: '1px 3px',
          borderTopLeftRadius: '3px'
        }}>
          {resource.qty}
        </div>
      )}
    </div>
  );
};

// Main Inventory Grid Component
const InventoryGrid = ({ 
  resources = [], 
  onItemClick, 
  title = "Inventory",
  emptyMessage = "No items found",
  maxHeight = null,
  containerStyle = {},
  gridStyle = {},
  gridClassName = '',
  itemClassName = ''
}) => {
  return (
    <div className="inventory-container" style={containerStyle}>
      {title && gridClassName === 'futuristic' ? (
        <h3 style={{
          textShadow: "0 0 10px rgba(0, 255, 255, 0.7)",
          fontSize: "20px",
          marginBottom: "10px",
          fontWeight: "bold"
        }}>{title}</h3>
      ) : title && (
        <h3>{title}</h3>
      )}
      
      <div className={`inventory-grid ${gridClassName}`} style={{
        display: 'grid',
        gap: '10px',
        padding: '10px',
        justifyContent: 'space-between',
        maxHeight: maxHeight,
        overflowY: maxHeight ? 'auto' : 'visible',
        ...(gridClassName === 'futuristic' ? {
          background: "linear-gradient(135deg, rgba(0,255,255,0.18) 0%, rgba(0,0,40,0.8) 100%)",
          boxShadow: "0 8px 32px 0 rgba(31,38,135,0.37)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "24px",
          border: "2px solid rgba(0,255,255,0.35)",
          borderTop: "2.5px solid #00fff7",
          borderBottom: "2.5px solid #00fff7",
          padding: "16px",
          maxHeight: "300px",
          overflowY: "auto"
        } : {}),
        ...gridStyle
      }}>
        {Array.isArray(resources) && resources.length > 0 ? (
          resources.map((resource, index) => (
            <InventoryItem 
              key={`resource-${index}`}
              resource={resource}
              onClick={onItemClick}
              className={itemClassName}
              size={40}
            />
          ))
        ) : (
          <div className="empty-slot" style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '20px',
            color: '#888',
            fontStyle: 'italic'
          }}>
            {emptyMessage}
          </div>
        )}
      </div>
      
      <style>{`
        .inventory-item:hover {
          transform: scale(1.1);
          box-shadow: 0 0 16px rgba(0,255,255,0.53), 0 0 2px #fff;
          z-index: 2;
          border-color: #00fff7;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .inventory-tooltip {
          animation: fadeIn 0.1s ease-in-out;
        }
        
        .equipment-slot.highlighted-slot {
          background-color: rgba(106, 13, 173, 0.5) !important;
          border-color: #ffd700 !important;
          box-shadow: 0 0 10px #ffd700, inset 0 0 5px rgba(255, 215, 0, 0.5) !important;
          transform: scale(1.1) !important;
          z-index: 20 !important;
          transition: all 0.3s ease !important;
        }
      `}</style>
    </div>
  );
};

// Helper function to sort items by rarity
const sortItemsByRarity = (items) => {
  // Rarity order from highest to lowest
  const rarityOrder = {
    'legendary': 1,
    'mythic': 2,
    'epic': 3,
    'rare': 4,
    'uncommon': 5,
    'common': 6,
    'default': 7 // for items without rarity
  };
  
  return [...items].sort((a, b) => {
    const rarityA = a.rarity ? a.rarity.toLowerCase() : 'default';
    const rarityB = b.rarity ? b.rarity.toLowerCase() : 'default';
    
    return (rarityOrder[rarityA] || rarityOrder['default']) - (rarityOrder[rarityB] || rarityOrder['default']);
  });
};

// Универсальная функция для загрузки всех ресурсов и управления инвентарем
const loadAllResources = async (telegramId = null) => {
  console.log('[InventoryModule] Начало загрузки ресурсов');
  
  // 1. Определяем Telegram ID
  if (!telegramId) {
    // Используем нашу универсальную функцию getTelegramId
    telegramId = getTelegramId();
  }
  
  // Начальный пустой объект ресурсов
  let allResources = {};
  
  // Проверяем наличие ModalModule для получения ресурсов
  if (window.ModalModule && typeof window.ModalModule.loadUserResources === 'function') {
    console.log('[InventoryModule] Получаем ресурсы из ModalModule');
    
    try {
      // Используем функцию loadUserResources из ModalModule
      allResources = await window.ModalModule.loadUserResources();
      console.log('[InventoryModule] Ресурсы успешно получены из ModalModule:', 
        Object.keys(allResources).length + ' элементов');
      
      // Загружаем специальные ресурсы из IndexedDB
      try {
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
              const resources = request.result || {};
              if (resources && Object.keys(resources).length > 0) {
                // Фильтруем служебные поля из результата
                const filteredResources = {};
                Object.keys(resources).forEach(key => {
                  // Исключаем поля id, telegramId, lastUpdated и другие служебные
                  if (!['id', 'telegramId', 'lastUpdated'].includes(key)) {
                    filteredResources[key] = resources[key];
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
          console.error('[InventoryModule] Ошибка при получении специальных ресурсов:', error);
          return {};
        });
        
        // Объединяем с основными ресурсами
        allResources = { ...allResources, ...specialResources };
        console.log('[InventoryModule] Специальные ресурсы из IndexedDB:', Object.keys(specialResources).join(', '));
        console.log('[InventoryModule] Объединенные ресурсы:', Object.keys(allResources).length + ' элементов');
      } catch (error) {
        console.error('[InventoryModule] Ошибка при загрузке ресурсов из IndexedDB:', error.message);
      }
      
      // Сохраняем только в глобальной переменной для доступа из других модулей
      window.globalUserResources = allResources;
    } catch (error) {
      console.error('[InventoryModule] Ошибка при получении ресурсов из ModalModule:', error.message);
      // Падаем до резервного варианта
    }
  } else {
    console.log('[InventoryModule] ModalModule недоступен, используем стандартный метод загрузки');
    
    // 2. Загружаем специальные ресурсы из IndexedDB
    try {
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
            const resources = request.result || {};
            if (resources && Object.keys(resources).length > 0) {
              // Фильтруем служебные поля из результата
              const filteredResources = {};
              Object.keys(resources).forEach(key => {
                // Исключаем поля id, telegramId, lastUpdated и другие служебные
                if (!['id', 'telegramId', 'lastUpdated'].includes(key)) {
                  filteredResources[key] = resources[key];
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
        console.error('[InventoryModule] Ошибка при получении специальных ресурсов:', error);
        return {};
      });
      
      // Добавляем специальные ресурсы
      allResources = { ...specialResources };
      
      // Диагностический вывод для проверки специальных ресурсов
      console.log('[InventoryModule] Специальные ресурсы из IndexedDB:', specialResources);
    } catch (error) {
      console.error('[InventoryModule] Ошибка при загрузке ресурсов из IndexedDB:', error.message);
    }
    
    // 3. Загружаем основные ресурсы из БД game_users
    try {
      const response = await fetch(`rpg.php?action=getUserData`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ telegramId: telegramId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("JSON parse error");
      }
      
      if (!data.success) {
        throw new Error(data.message || 'Неизвестная ошибка');
      }
      
      let dbResources = {};
      
      // Проверяем статус костра и печи
      if (data.userData) {
        if (data.userData.campfire === 1 || data.userData.campfire === "1") {
          dbResources.campfire = 1;
        }
        
        if (data.userData.furnace === 1 || data.userData.furnace === "1") {
          dbResources.furnace = 1;
        }
        
        // Обрабатываем ресурсы из базы данных
        if (data.userData.resources) {
          // Проверяем, является ли resources строкой JSON или объектом
          if (typeof data.userData.resources === 'string') {
            const parsedResources = JSON.parse(data.userData.resources);
            dbResources = { ...dbResources, ...parsedResources };
          } else {
            dbResources = { ...dbResources, ...data.userData.resources };
          }
        }
      }
      
      // Нормализуем ключи ресурсов для совместимости с рецептами
      const normalizedResources = {};
      for (const [key, value] of Object.entries(dbResources)) {
        // Нормализуем ключ - приводим к нижнему регистру и удаляем пробелы
        let normalizedKey = key.toLowerCase();
        
        // Обрабатываем специальные случаи
        if (normalizedKey === 'wood log' || normalizedKey === 'wood_log') {
          normalizedKey = 'woodlog';
        } else if (normalizedKey.includes(' ')) {
          // Удаляем пробелы из всех ключей
          normalizedKey = normalizedKey.replace(/\s+/g, '');
        }
        
        normalizedResources[normalizedKey] = value;
      }
      
      // Добавляем основные ресурсы к специальным (если они уже были в allResources, не перезаписываем)
      Object.entries(normalizedResources).forEach(([key, value]) => {
        if (!allResources[key] || allResources[key] < value) {
          allResources[key] = value;
        }
      });
      
      // Диагностический вывод для проверки объединенных ресурсов
      console.log('[InventoryModule] Объединенные ресурсы после загрузки из БД:', 
        Object.keys(allResources).length + ' элементов', 
        Object.keys(allResources).slice(0, 5).join(', ') + '...');
    } catch (error) {
      console.error('[InventoryModule] Ошибка при загрузке ресурсов из БД:', error.message);
    }
    
    // 4. Сохраняем объединенные ресурсы в IndexedDB для использования другими компонентами
    try {
      const dbRequest = indexedDB.open('UserResourcesDB', 10);
      
      await new Promise((resolve, reject) => {
        dbRequest.onerror = (event) => {
          reject(event.target.error);
        };
        
        dbRequest.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Создаем хранилища, если их нет
          if (!db.objectStoreNames.contains('resources')) {
            const resourcesStore = db.createObjectStore('resources', { keyPath: 'id' });
            resourcesStore.createIndex('telegramId', 'telegramId', { unique: false });
          }
          
          if (!db.objectStoreNames.contains('resourcesLog')) {
            const logStore = db.createObjectStore('resourcesLog', { keyPath: 'id', autoIncrement: true });
            logStore.createIndex('telegramId', 'telegramId', { unique: false });
            logStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        
        dbRequest.onsuccess = (event) => {
          const db = event.target.result;
          
          if (!db.objectStoreNames.contains('resources')) {
            db.close();
            reject(new Error('Хранилище "resources" не найдено'));
            return;
          }
          
          const resourceId = `user_${telegramId}`;
          const transaction = db.transaction('resources', 'readwrite');
          const resourcesStore = transaction.objectStore('resources');
          
          const resourceObject = {
            id: resourceId,
            telegramId: telegramId,
            ...allResources,
            lastUpdated: new Date().toISOString()
          };
          
          const request = resourcesStore.put(resourceObject);
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
          
          transaction.oncomplete = () => {
            db.close();
          };
        };
      }).catch(error => {
      });
      
      // Сохраняем только в глобальной переменной для доступа из других модулей
      window.globalUserResources = allResources;
    } catch (error) {
      console.error('[InventoryModule] Ошибка при сохранении ресурсов:', error.message);
    }
  }
  
  // 5. Преобразуем и возвращаем ресурсы как массив для отображения
  try {
    // Проверяем наличие ItemCatalogModule для получения информации о редкости
    let itemCatalog = {};
    if (window.ItemCatalogModule && typeof window.ItemCatalogModule.getItemCatalog === 'function') {
      itemCatalog = window.ItemCatalogModule.getItemCatalog();
      console.log('[InventoryModule] Каталог предметов загружен:', Object.keys(itemCatalog).length + ' предметов');
    }
    
    const resourceItems = Object.entries(allResources)
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
        // Пытаемся найти предмет в каталоге ItemCatalogModule
        const catalogItem = itemCatalog[id];
        
        if (catalogItem) {
          // Если предмет найден в каталоге, используем его данные
          return {
            id: id,
            item_id: catalogItem.item_id || id,
            name: catalogItem.name || id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
            qty: amount,
            description: catalogItem.description || 'Resource',
            rarity: catalogItem.rarity || 'Common',
            type: catalogItem.type || 'Resource',
            properties: catalogItem.properties || '',
            image_path: catalogItem.image_path || `images/rpg/${id.toLowerCase().replace(/\s+/g, '_')}.png`
          };
        }
        
        // Если предмета нет в каталоге, но есть функция resourcesObjectToArray
        if (window.ItemCatalogModule && typeof window.ItemCatalogModule.resourcesObjectToArray === 'function') {
          const items = window.ItemCatalogModule.resourcesObjectToArray({ [id]: amount });
          if (items && items.length > 0) {
            return items[0];
          }
        }
        
        // Запасной вариант без ItemCatalogModule
        let rarity = 'Common';
        
        // Определяем редкость по ID предмета
        if (window.ItemCatalogModule && typeof window.ItemCatalogModule.determineRarityById === 'function') {
          rarity = window.ItemCatalogModule.determineRarityById(id);
        } else {
          // Простая эвристика редкости по ID
          if (id === 'onion' || id === 'candy' || id === 'coin' || id === 'ironingot') {
            rarity = 'Rare';
          } else if (id === 'gemstone' || id === 'crystal') {
            rarity = 'Epic';
          } else if (id === 'ancient_artifact') {
            rarity = 'Mythic';
          } else if (id === 'leather' || id === 'ironore' || id === 'herbs') {
            rarity = 'Uncommon';
          }
        }
        
        return {
          id: id,
          item_id: id,
          name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
          qty: amount,
          description: key === 'ironore' ? 'Raw iron ore extracted from mining' : 
                    key === 'ironingot' ? 'A bar of refined iron used for advanced crafting' :
                    key === 'rope' ? 'Sturdy rope made from plant fibers' :
                    key === 'crushedrock' ? 'Rocks broken down into small pieces' :
                    key === 'primarrows' ? 'Simple arrows made from sticks, rope and crushed rock' :
                    'A resource used for crafting',
          rarity: rarity,
          type: id === 'onion' || id === 'coin' ? 'Currency' : 'Resource',
          properties: ''
        };
      });
    
    // Сортируем ресурсы по редкости
    const sortedItems = sortItemsByRarity(resourceItems);
    
    // Добавляем больше диагностики для проверки результатов
    console.log('[InventoryModule] Общее количество ресурсов:', Object.keys(allResources).length);
    console.log('[InventoryModule] Количество отфильтрованных ресурсов для отображения:', resourceItems.length);
    
    return {
      resources: allResources,
      items: sortedItems
    };
  } catch (error) {
    console.error('[InventoryModule] Ошибка при преобразовании ресурсов в массив:', error.message);
    return {
      resources: allResources,
      items: []
    };
  }
};

// Character Inventory Component
const CharacterInventory = ({ userData, getUserResourcesFromIndexedDB }) => {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(0); // Добавляем счетчик обновлений
  
  // Функция для загрузки ресурсов
  const loadResources = async () => {
    try {
      setIsLoading(true);
      
      // Проверяем наличие ModalModule для получения ресурсов
      if (window.ModalModule && typeof window.ModalModule.loadUserResources === 'function') {
        console.log('[CharacterInventory] Получение ресурсов из ModalModule');
        
        const modalResources = await window.ModalModule.loadUserResources();
        
        // Преобразуем ресурсы в формат для отображения
        const resourceItems = Object.entries(modalResources)
          .filter(([key, value]) => 
            value > 0 && 
            !['telegramid', 'spinsleft', 'streak', 'spins_left', 'spins', 'telegram_id', 'id', 'telegramId', 'lastUpdated', 'egg', 'campfire_burn', 'furnace_burn'].includes(key.toLowerCase())
          )
          .map(([id, amount]) => ({
            id: id,
            item_id: id,
            name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
            qty: amount,
            rarity: 'Common'
          }));
        
        // Применяем каталог предметов, если доступен
        if (window.ItemCatalogModule && typeof window.ItemCatalogModule.getItemCatalog === 'function') {
          const catalog = window.ItemCatalogModule.getItemCatalog();
          resourceItems.forEach(item => {
            if (catalog[item.id]) {
              item.name = catalog[item.id].name || item.name;
              item.rarity = catalog[item.id].rarity || item.rarity;
              item.description = catalog[item.id].description || 'Resource';
              item.type = catalog[item.id].type || 'Resource';
            }
          });
        }
        
        // Сортируем ресурсы по редкости
        const sortedItems = sortItemsByRarity(resourceItems);
        setResources(sortedItems);
      } else {
        // Используем общую функцию загрузки ресурсов как резервный вариант
        console.log('[CharacterInventory] ModalModule недоступен, используем loadAllResources');
        const result = await loadAllResources();
        setResources(result.items);
      }
    } catch (error) {
      console.error('[CharacterInventory] Ошибка при загрузке ресурсов:', error.message);
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Загрузка всех ресурсов при инициализации
  useEffect(() => {
    loadResources();
    
    // Для защиты от слишком частых обновлений
    let lastUpdateTimestamp = 0;
    let updateTimeout = null;
    
    // Подписываемся на глобальные события обновления инвентаря
    const handleInventoryUpdate = (event) => {
      // Защита от слишком частых обновлений
      const now = Date.now();
      if (now - lastUpdateTimestamp < 500) {
        // Если прошло менее 500 мс с последнего обновления, 
        // откладываем обновление
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          setLastUpdate(now);
          loadResources();
        }, 500);
        return;
      }
      
      // Запоминаем время обновления
      lastUpdateTimestamp = now;
      
      // Обновляем счетчик, чтобы спровоцировать ре-рендер
      setLastUpdate(now);
      // Перезагружаем ресурсы
      loadResources();
    };
    
    // Регистрируем обработчики для обоих типов событий
    window.addEventListener('inventory-update', handleInventoryUpdate);
    window.addEventListener('refresh-inventory', handleInventoryUpdate);
    window.addEventListener('resourcesUpdated', handleInventoryUpdate);
    
    // Функция очистки при размонтировании компонента
    return () => {
      window.removeEventListener('inventory-update', handleInventoryUpdate);
      window.removeEventListener('refresh-inventory', handleInventoryUpdate);
      window.removeEventListener('resourcesUpdated', handleInventoryUpdate);
      clearTimeout(updateTimeout);
    };
  }, []); // Пустой массив зависимостей для выполнения только при монтировании
  
  // Также добавляем эффект для принудительного обновления при изменении lastUpdate
  useEffect(() => {
    if (lastUpdate > 0) {
      loadResources();
    }
  }, [lastUpdate]);
  
  // Обработчик клика по предмету
  const handleItemClick = (itemId) => {
    // Устанавливаем источник вызова модального окна как 'inventory'
    window.lastModalSource = 'inventory';
    
    // Проверяем наличие ModalModule для отображения детальной информации
    if (window.ModalModule && typeof window.ModalModule.showItemDetailsModal === 'function') {
      // Явно указываем false для fromRecipe и дополнительную информацию о источнике
      window.ModalModule.showItemDetailsModal(itemId, false, null, {
        source: 'inventory',
        isRecipe: false
      });
    } else {
      alert(`Предмет: ${itemId}`);
    }
  };
  
  // Если ресурсы загружаются, показываем индикатор загрузки
  if (isLoading) {
    return (
      <div style={{ 
        background: "linear-gradient(135deg, rgba(0,255,255,0.18) 0%, rgba(0,0,40,0.8) 100%)",
        boxShadow: "0 8px 32px 0 rgba(31,38,135,0.37)",
        backdropFilter: "blur(12px)",
        borderRadius: "24px",
        border: "2px solid rgba(0,255,255,0.35)",
        borderTop: "2.5px solid #00fff7",
        borderBottom: "2.5px solid #00fff7",
        padding: "24px 18px",
        marginTop: "15px",
        textAlign: "center",
        color: "#fff"
      }}>
        <h3 style={{
          color: "#00fff7", 
          textShadow: "0 0 10px rgba(0, 255, 255, 0.7)",
          fontSize: "20px",
          marginBottom: "10px",
          fontWeight: "bold"
        }}>Inventory</h3>
        <div className="rpg-loading futuristic" style={{ padding: "20px", minHeight: "auto", height: "auto" }}>
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading resources...</div>
        </div>
      </div>
    );
  }
  
  return (
    <React.Fragment>
      <InventoryGrid
        resources={resources}
        onItemClick={handleItemClick}
        title="Inventory"
        emptyMessage="No items found"

        gridClassName="futuristic"
        itemClassName="futuristic"
      />
    </React.Fragment>
  );
};

// Alias for resourcesObjectToArray for backward compatibility
const convertSpecialResources = (resourcesObj) => {
  // Используем функцию из ItemCatalogModule если она доступна
  if (window.ItemCatalogModule && typeof window.ItemCatalogModule.resourcesObjectToArray === 'function') {
    return window.ItemCatalogModule.resourcesObjectToArray(resourcesObj);
  }
  
  // Запасной вариант если модуль недоступен
  if (!resourcesObj) return [];
  
  return Object.entries(resourcesObj)
    .filter(([key]) => 
      // Исключаем служебные поля и проблемные ресурсы
      key !== 'id' && 
      key !== 'telegramId' && 
      key !== 'lastUpdated' && 
      key.toLowerCase() !== 'egg' && 
      key.toLowerCase() !== 'spinsleft' && 
      key.toLowerCase() !== 'streak'
    )
    .map(([key, value]) => ({
      id: key,
      item_id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      qty: value,
      rarity: 'Common',
      type: 'Resource'
    }));
};

// Function to combine multiple resource arrays and sort by rarity
const combineAndSortResources = (...resourceArrays) => {
  // Объединяем все массивы ресурсов
  const combinedResources = resourceArrays.flat().filter(item => item);
  
  // Сортируем по редкости
  return sortItemsByRarity(combinedResources);
};

// Function to process user resources data
const processUserResources = (userData) => {
  if (!userData || !userData.resources) {
    return [];
  }
  
  // Преобразуем объект ресурсов в массив
  let resourceItems = [];
  try {
    // Проверяем, является ли resources строкой JSON или объектом
    if (typeof userData.resources === 'string') {
      const parsedResources = JSON.parse(userData.resources);
      resourceItems = convertSpecialResources(parsedResources);
    } else {
      resourceItems = convertSpecialResources(userData.resources);
    }
    
    // Сортируем ресурсы по редкости
    return sortItemsByRarity(resourceItems);
  } catch (error) {
    return [];
  }
};

// Helper to check if ItemCatalogModule exists and get the catalog
const getItemCatalog = () => {
  if (window.ItemCatalogModule && typeof window.ItemCatalogModule.getItemCatalog === 'function') {
    return window.ItemCatalogModule.getItemCatalog();
  }
  return {};
};

// Function to filter items by rarity
const filterInventoryByRarity = (items, rarities = []) => {
  // Если редкости не указаны, возвращаем все предметы
  if (!rarities || rarities.length === 0) {
    return items;
  }
  
  // Приводим все редкости к нижнему регистру для сравнения без учета регистра
  const normalizedRarities = rarities.map(r => r.toLowerCase());
  
  // Фильтруем предметы по указанным редкостям
  return items.filter(item => {
    const itemRarity = item.rarity ? item.rarity.toLowerCase() : 'common';
    return normalizedRarities.includes(itemRarity);
  });
};

// Function to get rarity color - используем из ItemCatalogModule
const getRarityColor = (rarity) => {
  if (window.ItemCatalogModule && typeof window.ItemCatalogModule.getRarityColor === 'function') {
    return window.ItemCatalogModule.getRarityColor(rarity);
  }
  
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

// Function to get rarity glow color - используем из ItemCatalogModule
const getRarityGlowColor = (rarity) => {
  if (window.ItemCatalogModule && typeof window.ItemCatalogModule.getRarityGlowColor === 'function') {
    return window.ItemCatalogModule.getRarityGlowColor(rarity);
  }
  
  const baseColor = getRarityColor(rarity);
  // Возвращаем базовый цвет с прозрачностью
  if (baseColor.startsWith('#')) {
    // Конвертируем HEX в RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  }
  
  return baseColor.replace(')', ', 0.5)').replace('rgb', 'rgba');
};

// resourcesObjectToArray - используем из ItemCatalogModule
const resourcesObjectToArray = (resourcesObj, itemCatalog = {}) => {
  if (!resourcesObj || typeof resourcesObj !== 'object') return [];
  
  // Пытаемся получить каталог предметов из ItemCatalogModule
  if (Object.keys(itemCatalog).length === 0 && window.ItemCatalogModule && 
      typeof window.ItemCatalogModule.getItemCatalog === 'function') {
    itemCatalog = window.ItemCatalogModule.getItemCatalog();
  }
  
  return Object.entries(resourcesObj)
    .filter(([key]) => 
      // Исключаем служебные поля и проблемные ресурсы
      key !== 'campfire_burn' && 
      key !== 'furnace_burn' && 
      key !== 'id' && 
      key !== 'telegramId' && 
      key !== 'lastUpdated' && 
      key !== 'loadedFromServer' && 
      key.toLowerCase() !== 'egg' && 
      key.toLowerCase() !== 'spinsleft' && 
      key.toLowerCase() !== 'streak'
    )
    .map(([key, value]) => {
      const quantity = typeof value === 'object' ? value.quantity || 0 : parseInt(value) || 0;
      
      // Проверяем наличие предмета в каталоге
      const catalogItem = itemCatalog[key];
      
      if (catalogItem) {
        return {
          id: key,
          item_id: catalogItem.item_id || key,
          name: catalogItem.name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          qty: quantity,
          description: catalogItem.description || '',
          rarity: catalogItem.rarity || 'Common',
          type: catalogItem.type || 'Resource',
          properties: catalogItem.properties || '',
          image_path: catalogItem.image_path || `images/rpg/${key.toLowerCase().replace(/\s+/g, '_')}.png`
        };
      }
      
      // Если предмет не найден в каталоге, пробуем использовать findCatalogItemById
      let fallbackItem = null;
      
      if (window.ItemCatalogModule && typeof window.ItemCatalogModule.findCatalogItemById === 'function') {
        fallbackItem = window.ItemCatalogModule.findCatalogItemById(key);
      }
      
      if (fallbackItem) {
        return {
          id: key,
          item_id: fallbackItem.item_id || key,
          name: fallbackItem.name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          qty: quantity,
          description: fallbackItem.description || '',
          rarity: fallbackItem.rarity || 'Common',
          type: fallbackItem.type || 'Resource',
          properties: fallbackItem.properties || '',
          image_path: fallbackItem.image_path || `images/rpg/${key.toLowerCase().replace(/\s+/g, '_')}.png`
        };
      }
      
      // Если всё ещё не нашли, используем базовую информацию
      const name = typeof value === 'object' && value.name ? value.name : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Определяем редкость по ID
      let rarity = 'Common';
      if (window.ItemCatalogModule && typeof window.ItemCatalogModule.determineRarityById === 'function') {
        rarity = window.ItemCatalogModule.determineRarityById(key);
      }
      
      return {
        id: key,
        item_id: key,
        name: name,
        qty: quantity,
        rarity: rarity,
        type: key === 'onion' || key === 'coin' ? 'Currency' : 'Resource',
        properties: '',
        description: key === 'ironore' ? 'Raw iron ore extracted from mining' : 
                    key === 'ironingot' ? 'A bar of refined iron used for advanced crafting' :
                    key === 'rope' ? 'Sturdy rope made from plant fibers' :
                    key === 'crushedrock' ? 'Rocks broken down into small pieces' :
                    key === 'primarrows' ? 'Simple arrows made from sticks, rope and crushed rock' :
                    'A resource used for crafting'
      };
    });
};

/**
 * Принудительно обновляет React-компоненты инвентаря
 * @returns {Promise<boolean>} - Результат операции
 */
const refreshReactComponents = async () => {
  // Предотвращаем повторные обновления, если флаг уже установлен
  if (isInventoryUpdating) {
    return false;
  }
  
  try {
    // Получаем актуальные данные из IndexedDB
    let inventoryItems = [];
    if (window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
      try {
        inventoryItems = await window.IndexedDBModule.getInventoryItems();
      } catch (error) {
      }
    }
    
    let updated = false;
    
    // Находим все корневые React-компоненты инвентаря
    const reactRoots = document.querySelectorAll('#inventory-root, #crafting-inventory, .inventory-container, .inventory-grid');
    
    if (reactRoots.length === 0) {
      return false;
    }
    
    // Пытаемся найти и вызвать setState у React-компонентов
    reactRoots.forEach(root => {
      try {
        // Ищем ключи React Fiber
        const reactKey = Object.keys(root).find(key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'));
        
        if (reactKey) {
          // Пытаемся получить компонент и обновить его
          let fiber = root[reactKey];
          let instance = null;
          
          // Проходим вверх по дереву волокон, пока не найдем экземпляр компонента
          while (fiber && !instance) {
            if (fiber.stateNode && typeof fiber.stateNode.setState === 'function') {
              instance = fiber.stateNode;
            } else {
              fiber = fiber.return;
            }
          }
          
          if (instance && typeof instance.setState === 'function' && typeof instance.forceUpdate === 'function') {
            // Устанавливаем новое состояние и принудительно обновляем
            instance.setState({
              inventoryNeedsUpdate: true,
              lastUpdate: Date.now(),
              inventoryItems: inventoryItems
            }, () => {
              instance.forceUpdate();
            });
            
            updated = true;
          } else {
            // Если не можем найти компонент, пробуем использовать React Event API
            // Создаем и отправляем пользовательское событие для обновления инвентаря
            const event = new CustomEvent('inventory-update', { 
              detail: { items: inventoryItems, timestamp: Date.now() }
            });
            root.dispatchEvent(event);
            
            // Также отправляем глобальное событие
            window.dispatchEvent(new CustomEvent('refresh-inventory', {
              detail: { items: inventoryItems, timestamp: Date.now() }
            }));
            
            updated = true;
          }
        }
      } catch (error) {
      }
    });
    
    return updated;
  } catch (error) {
    console.error('[InventoryModule] Ошибка при обновлении React-компонентов:', error.message);
    return false;
  }
};

/**
 * Обновляет отображение инвентаря в интерфейсе
 * @returns {Promise<boolean>} - Результат операции
 */
const refreshInventoryDisplay = async () => {
  // Предотвращаем повторные обновления, если прошло менее 1000 мс с прошлого обновления
  const currentTime = Date.now();
  if (isInventoryUpdating || (currentTime - lastInventoryUpdateTimestamp < 1000)) {
    return false;
  }

  try {
    isInventoryUpdating = true;
    lastInventoryUpdateTimestamp = currentTime;

    // Получаем инвентарь из различных источников
    let inventoryItems = [];
    
    // Пытаемся получить из IndexedDB
    if (window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
      try {
        inventoryItems = await window.IndexedDBModule.getInventoryItems();
        console.log('[InventoryModule] Получены данные инвентаря из IndexedDB:', 
          inventoryItems ? inventoryItems.length : 0, 'предметов');
      } catch (error) {
        console.error('[InventoryModule] Ошибка при получении данных из IndexedDB:', error);
      }
    }
    
    // Если предметов нет в IndexedDB, используем общую функцию загрузки
    if (!inventoryItems || inventoryItems.length === 0) {
      try {
        console.log('[InventoryModule] Предметы не найдены в IndexedDB, используем loadAllResources');
        const result = await loadAllResources();
        if (result && result.items && result.items.length > 0) {
          // Преобразуем формат предметов
          inventoryItems = result.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.qty || 0,
                rarity: item.rarity || 'Common'
          }));
          console.log('[InventoryModule] Получены данные из loadAllResources:', inventoryItems.length, 'предметов');
        }
      } catch (error) {
        console.error('[InventoryModule] Ошибка при использовании loadAllResources:', error);
      }
    }
    
    // Сначала пробуем обновить React компоненты
    let reactUpdated = false;
    try {
      reactUpdated = await refreshReactComponents();
    } catch (reactError) {
      console.error('[InventoryModule] Ошибка при обновлении React-компонентов:', reactError.message);
    }
    
    // Находим все контейнеры для отображения инвентаря (не React)
    const inventoryContainers = document.querySelectorAll('.inventory-container:not([data-react]), .inventory-grid:not([data-react]), #inventory-items-container:not([data-react])');
    if (inventoryContainers.length === 0 && !reactUpdated) {
      // Если нет обычных контейнеров, но есть React-компоненты, считаем обновление успешным
      if (reactUpdated) {
        return true;
      }
      return false;
    }
    
    // Обновляем каждый найденный контейнер
    let updated = false;
    inventoryContainers.forEach(container => {
      // Проверяем компонент React
      const reactKey = Object.keys(container).find(key => key.startsWith('__reactFiber$'));
      
      if (reactKey) {
        // Это React-компонент, пропускаем
      } else {
        // Обычный DOM-контейнер, обновляем его содержимое
        try {
          // Сортируем предметы по редкости
          const sortedItems = sortItemsByRarity(inventoryItems);
          
          // Очищаем контейнер
          container.innerHTML = '';
          
          // Если предметов нет, показываем сообщение
          if (!sortedItems || sortedItems.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'inventory-empty-message';
            emptyMessage.textContent = 'Your inventory is empty';
            container.appendChild(emptyMessage);
          } else {
            // Создаем элементы для каждого предмета
            sortedItems.forEach(item => {
              if (!item || !item.id || item.quantity <= 0) return;
              
              const itemElement = document.createElement('div');
              itemElement.className = 'inventory-item';
              itemElement.setAttribute('data-item-id', item.id);
              
              // Определяем цвет рамки в зависимости от редкости
              const rarityColor = getRarityColor(item.rarity || 'Common');
              
              // Подготавливаем путь к изображению
              const itemImageSrc = `images/rpg/${item.id.toLowerCase().replace(/\s+/g, '_')}.png`;
              
              // Создаем HTML для элемента инвентаря
              itemElement.innerHTML = `
                <div class="inventory-item-image" style="border: 2px solid ${rarityColor};">
                  <img src="${itemImageSrc}" onerror="this.onerror=null; this.src='images/rpg/unknown.png';" alt="${item.name}">
                  <span class="inventory-item-quantity">${item.quantity}</span>
                </div>
                <div class="inventory-item-name">${item.name}</div>
              `;
              
              // Добавляем обработчик клика для отображения деталей предмета
              itemElement.addEventListener('click', () => {
                if (window.ModalModule && typeof window.ModalModule.showItemDetailsModal === 'function') {
                  // Устанавливаем источник вызова модального окна как 'inventory'
                  window.lastModalSource = 'inventory';
                  window.ModalModule.showItemDetailsModal(item.id, false, null, {
                    source: 'inventory',
                    isRecipe: false
                  });
                }
              });
              
              container.appendChild(itemElement);
            });
          }
          
          updated = true;
        } catch (error) {
        }
      }
    });
    
    // Обновляем счетчики ресурсов
    try {
      // Получаем ресурсы
      let resources = {};
      try {
        const result = await loadAllResources();
        resources = result.resources || {};
      } catch (e) {
        // Пытаемся получить из IndexedDB напрямую
        if (window.IndexedDBModule && typeof window.IndexedDBModule.getUserResources === 'function') {
          try {
            resources = await window.IndexedDBModule.getUserResources() || {};
          } catch (dbError) {
          }
        }
      }
      
      // Находим счетчики ресурсов
      const resourceCounters = document.querySelectorAll('[data-resource-counter]');
      
      if (resourceCounters.length > 0) {
        resourceCounters.forEach(counter => {
          const resourceId = counter.getAttribute('data-resource-counter');
          if (!resourceId) return;
          
          // Пытаемся найти ресурс в разных вариантах написания
          const resourceLower = resourceId.toLowerCase();
          const resourceNoSpaces = resourceLower.replace(/\s+/g, '');
          const resourceWithUnderscore = resourceLower.replace(/\s+/g, '_');
          
          let quantity = 0;
          
          if (resources[resourceId] !== undefined) quantity = resources[resourceId];
          else if (resources[resourceLower] !== undefined) quantity = resources[resourceLower];
          else if (resources[resourceNoSpaces] !== undefined) quantity = resources[resourceNoSpaces];
          else if (resources[resourceWithUnderscore] !== undefined) quantity = resources[resourceWithUnderscore];
          
          // Обновляем текст счетчика
          counter.textContent = quantity;
        });
        
        updated = true;
      }
    } catch (error) {
      console.error('[InventoryModule] Ошибка при обновлении счетчиков ресурсов:', error.message);
    }
    
    return updated || reactUpdated;
  } catch (error) {
    console.error('[InventoryModule] Ошибка при обновлении отображения инвентаря:', error.message);
    return false;
  } finally {
    // Разрешаем следующее обновление через некоторое время
    setTimeout(() => {
      isInventoryUpdating = false;
    }, 200);
  }
};

/**
 * Функция для крафта предмета, закрытия модального окна и обновления инвентаря
 * @param {string} itemId - ID предмета для крафта
 * @param {number} quantity - Количество для крафта (по умолчанию 1)
 * @returns {Promise<boolean>} - Результат операции
 */
const craftItemAndCloseModal = async (itemId, quantity = 1) => {
  try {
    console.log(`[InventoryModule] Запуск крафта предмета и закрытие модального окна: itemId=${itemId}, quantity=${quantity}`);
    // Проверяем наличие функции крафта в ModalModule
    if (!window.craftItemFromModal) {
      console.error('[InventoryModule] Функция craftItemFromModal не найдена');
      return false;
    }
    // Вызываем крафт предмета
    console.log(`[InventoryModule] Вызов window.craftItemFromModal(${itemId}, ${quantity})`);
    const craftResult = await window.craftItemFromModal(itemId, quantity);
    console.log('[InventoryModule] Результат craftItemFromModal:', craftResult);
    if (!craftResult || !craftResult.success) {
      console.warn(`[InventoryModule] Не удалось скрафтить предмет: ${itemId}, количество: ${quantity}`);
      if (craftResult && craftResult.error) {
        console.warn(`[InventoryModule] Ошибка: ${craftResult.error}`);
      }
      return false;
    }
    // При успешном крафте закрываем модальное окно с небольшой задержкой,
    // чтобы пользователь увидел сообщение об успехе
    setTimeout(() => {
      // Закрываем модальное окно
      if (window.ModalModule && typeof window.ModalModule.closeModal === 'function') {
        console.log('[InventoryModule] Закрытие модального окна после крафта');
        window.ModalModule.closeModal();
      }
      // Обновляем отображение инвентаря
      setTimeout(async () => {
        // Используем принудительное обновление, если оно доступно
        if (window.CraftingModule && typeof window.CraftingModule.forceUpdateUI === 'function') {
          console.log('[InventoryModule] Принудительное обновление интерфейса через CraftingModule.forceUpdateUI');
          await window.CraftingModule.forceUpdateUI();
          return;
        }
        // Запасной вариант, если forceUpdateUI недоступен
        console.log('[InventoryModule] Запасной вариант обновления интерфейса');
        if (window.CraftingModule) {
          if (typeof window.CraftingModule.loadResources === 'function') {
            console.log('[InventoryModule] Обновление ресурсов через CraftingModule.loadResources');
            await window.CraftingModule.loadResources();
          }
          if (typeof window.CraftingModule.refreshInventory === 'function') {
            console.log('[InventoryModule] Обновление инвентаря через CraftingModule.refreshInventory');
            await window.CraftingModule.refreshInventory();
          }
          if (typeof window.CraftingModule.globalRefreshInventoryDisplay === 'function') {
            console.log('[InventoryModule] Обновление отображения через CraftingModule.globalRefreshInventoryDisplay');
            await window.CraftingModule.globalRefreshInventoryDisplay();
          }
        }
        // Затем обновляем через InventoryModule
        console.log('[InventoryModule] Обновление отображения через refreshInventoryDisplay');
        await refreshInventoryDisplay();
        // Отправляем события обновления инвентаря
        console.log('[InventoryModule] Отправка событий обновления инвентаря');
        window.dispatchEvent(new CustomEvent('inventory-update', { 
          detail: { timestamp: Date.now() } 
        }));
        window.dispatchEvent(new CustomEvent('refresh-inventory', { 
          detail: { timestamp: Date.now() } 
        }));
        // Показываем уведомление об успешном крафте если доступно
        if (window.showNotification) {
          window.showNotification(`Успешно скрафчено: ${quantity} шт.`, 'success');
        }
      }, 300);
    }, 800); // Задержка перед закрытием окна после успешного крафта
    return true;
  } catch (error) {
    console.error(`[InventoryModule] Ошибка при крафте предмета и закрытии модального окна: ${error.message}`);
    return false;
  }
};

// Export inventory components and utilities
window.InventoryModule = {
  InventoryItem,
  InventoryGrid,
  sortItemsByRarity,
  resourcesObjectToArray,
  convertSpecialResources,
  combineAndSortResources,
  processUserResources,
  CharacterInventory,
  getItemCatalog,
  filterInventoryByRarity,
  getRarityColor,
  getRarityGlowColor,
  loadAllResources,
  refreshInventoryDisplay,
  refreshReactComponents,
  forceUpdate: refreshReactComponents,
  craftItemAndCloseModal,
  // Добавляем новый метод для обновления отображения ресурсов
  refreshResourcesDisplay: async () => {
    console.log('[InventoryModule] Запуск refreshResourcesDisplay');
    
    // Сначала обновляем стандартное отображение инвентаря
    await refreshInventoryDisplay();
    
    // Затем отправляем событие для обновления React-компонентов
    window.dispatchEvent(new CustomEvent('resourcesUpdated', {
      detail: { timestamp: Date.now() }
    }));
    
    // Также вызываем принудительное обновление React-компонентов
    await refreshReactComponents();
    
    return true;
  },
  // Добавляем метод для сохранения ресурсов с синхронизацией на сервере
  saveResourcesWithSync: async (resources, options = {}) => {
    // Используем улучшенную функцию из ModalModule, если она доступна
    if (window.ModalModule && typeof window.ModalModule.enhancedSaveResourcesWithSync === 'function') {
      // Передаем опции для контроля событий и избежания циклических вызовов
      return await window.ModalModule.enhancedSaveResourcesWithSync(resources, options);
    }
    
    // Иначе используем старый метод
    try {
      // Получаем telegramId через нашу универсальную функцию
      const telegramId = getTelegramId();
      
      // Сохраняем в IndexedDB
      const dbRequest = indexedDB.open('UserResourcesDB', 10);
      
      await new Promise((resolve, reject) => {
        dbRequest.onerror = (event) => {
          reject(event.target.error);
        };
        
        dbRequest.onsuccess = (event) => {
          const db = event.target.result;
          
          if (!db.objectStoreNames.contains('resources')) {
            db.close();
            reject(new Error('Хранилище "resources" не найдено'));
            return;
          }
          
          const resourceId = `user_${telegramId}`;
          const transaction = db.transaction('resources', 'readwrite');
          const resourcesStore = transaction.objectStore('resources');
          
          const resourceObject = {
            id: resourceId,
            telegramId: telegramId,
            ...resources,
            lastUpdated: new Date().toISOString()
          };
          
          const request = resourcesStore.put(resourceObject);
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
          
          transaction.oncomplete = () => {
            db.close();
          };
        };
      });
      
      // Сохраняем только в глобальной переменной
      window.globalUserResources = resources;
      
      // Отправляем событие только если это разрешено опциями
      if (options.dispatchEvent !== false) {
        window.dispatchEvent(new CustomEvent('resourcesUpdated', { 
          detail: { resources: resources, timestamp: Date.now() } 
        }));
      }
      
      return true;
    } catch (error) {
      console.error('[InventoryModule] Ошибка при сохранении ресурсов:', error.message);
      return false;
    }
  }
}; 

// Универсальная функция для проверки и исправления telegramId
const getTelegramId = () => {
  // Пытаемся получить из Telegram WebApp
  if (window.Telegram && window.Telegram.WebApp && 
      window.Telegram.WebApp.initDataUnsafe && 
      window.Telegram.WebApp.initDataUnsafe.user && 
      window.Telegram.WebApp.initDataUnsafe.user.id) {
    return window.Telegram.WebApp.initDataUnsafe.user.id;
  } 
  // Пытаемся получить из localStorage - это единственное место, где мы сохраняем telegramId
  else if (localStorage.getItem('telegramId')) {
    return localStorage.getItem('telegramId');
  }
  // Возвращаем тестовый ID если ничего не найдено
  else {
    return 'test_user';
  }
}; 
