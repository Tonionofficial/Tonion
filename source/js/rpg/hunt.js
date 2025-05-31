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

// Копия Gathering для охоты (Hunting)
const Hunting = ({ onBack }) => {
  const [huntState, setHuntState] = React.useState("idle");
  const [countdown, setCountdown] = React.useState(0);
  const [resources, setResources] = React.useState({});
  const [totalHunted, setTotalHunted] = React.useState({});
  const [lastClaimTime, setLastClaimTime] = React.useState(0);
  const [nextResourceTime, setNextResourceTime] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sessionCreatedAt, setSessionCreatedAt] = React.useState(0);
  const [resourcesClaimed, setResourcesClaimed] = React.useState(0);
  const [bonusResourcesAdded, setBonusResourcesAdded] = React.useState(0);
  const [arrowsAvailable, setArrowsAvailable] = React.useState(0);
  const [noArrowsMessage, setNoArrowsMessage] = React.useState('');
  const [usedArrows, setUsedArrows] = React.useState({});
  const [showNoArrowsModal, setShowNoArrowsModal] = React.useState(false);
  // Добавляем состояние для модального окна предупреждения о недостатке стрел
  const [showArrowWarningModal, setShowArrowWarningModal] = React.useState(false);
  const [arrowWarningMessage, setArrowWarningMessage] = React.useState('');
  const [isProcessingAction, setIsProcessingAction] = React.useState(false);
  const [initialArrowCount, setInitialArrowCount] = React.useState(0); // Начальное количество стрел

  // Meat и Leather
  const RESOURCE_CHANCES = {
    'Meat': 60,
    'Leather': 40
  };

  const telegramId = localStorage.getItem('telegramId');

  React.useEffect(() => {
    loadHuntSession();
    const handleVisibilityChange = () => {
      if (!document.hidden) loadHuntSession();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Инициализируем стили модуля ручного сбора при загрузке компонента
  React.useEffect(() => {
    if (window.ManualGatherModule) {
      window.ManualGatherModule.addStyles();
    }
  }, []);

  // Функция для проверки наличия стрел в инвентаре
  const checkArrowsAvailability = async () => {
    try {
      // Проверяем стрелы в IndexedDB
      let arrowCount = 0;
      let primArrowCount = 0;
      
      // Проверяем экипированные предметы
      if (window.equippedItems && window.equippedItems.weapon2) {
        console.log('Экипированные стрелы:', window.equippedItems.weapon2);
        if (window.equippedItems.weapon2 === 'primarrows' || window.equippedItems.weapon2 === 'primarrow' || window.equippedItems.weapon2 === 'PrimArrow') {
          primArrowCount += 20; // Добавляем хотя бы минимальное количество стрел для начала охоты
          console.log('Найдены экипированные примитивные стрелы');
        } else if (window.equippedItems.weapon2 === 'arrow' || window.equippedItems.weapon2 === 'Arrow') {
          arrowCount += 20; // Добавляем хотя бы минимальное количество стрел для начала охоты
          console.log('Найдены экипированные обычные стрелы');
        }
      }
      
      if (window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
        const inventory = await window.IndexedDBModule.getInventoryItems();
        console.log('Инвентарь из IndexedDB:', inventory);
        
        const arrow = inventory.find(i => i.id === 'Arrow' || i.id === 'arrow');
        const primArrow = inventory.find(i => i.id === 'PrimArrow' || i.id === 'primarrow' || i.id === 'primarrows');
        
        if (arrow) arrowCount = parseInt(arrow.quantity || arrow.qty || 0);
        if (primArrow) primArrowCount = parseInt(primArrow.quantity || primArrow.qty || 0);
      }
      
      // Проверяем также глобальные ресурсы
      if (window.globalUserResources) {
        console.log('Глобальные ресурсы:', window.globalUserResources);
        
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
      
      console.log('Проверка стрел:', {arrowCount, primArrowCount});
      
      // Если ничего не найдено, но в логе есть упоминание о наличии стрел, добавляем минимальное количество
      if (arrowCount === 0 && primArrowCount === 0) {
        // Проверка на наличие в LocalStorage
        try {
          const storedInventory = localStorage.getItem(`inventory_${telegramId}`);
          if (storedInventory) {
            const inventory = JSON.parse(storedInventory);
            console.log('Инвентарь из localStorage:', inventory);
            
            if (inventory.primarrows || inventory.primarrow || inventory.PrimArrow) {
              primArrowCount = 20;
              console.log('Найдены примитивные стрелы в localStorage');
            } else if (inventory.arrow || inventory.Arrow) {
              arrowCount = 20;
              console.log('Найдены обычные стрелы в localStorage');
            }
          }
        } catch (e) {
          console.error('Ошибка при чтении localStorage:', e);
        }
      }
      
      const totalArrows = arrowCount + primArrowCount;
      setArrowsAvailable(totalArrows);
      return totalArrows;
    } catch (error) {
      console.error('Ошибка при проверке стрел:', error);
      return 0;
    }
  };

  // Функция для проверки наличия ножа в инвентаре
  const checkKnifeAvailability = async () => {
    try {
      console.log('Проверяем наличие ножа в инвентаре...');
      
      // Возможные идентификаторы ножа
      const knifeIds = ['knife', 'Knife', 'huntingknife', 'HuntingKnife', 'hunting_knife'];
      
      // Проверяем экипированные предметы (нож может быть экипирован в слот оружия или инструмента)
      if (window.equippedItems) {
        const equippedItemValues = Object.values(window.equippedItems);
        for (const itemId of equippedItemValues) {
          if (itemId && typeof itemId === 'string' && 
              knifeIds.some(knife => itemId.toLowerCase().includes(knife.toLowerCase()))) {
            console.log('Найден экипированный нож:', itemId);
            return true;
          }
        }
      }
      
      // Проверяем инвентарь через IndexedDB
      if (window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
        const inventory = await window.IndexedDBModule.getInventoryItems();
        console.log('Проверка ножа в инвентаре:', inventory);
        
        // Проверяем по всем возможным идентификаторам ножа
        for (const knifeId of knifeIds) {
          const knife = inventory.find(item => 
            item.id && item.id.toLowerCase().includes(knifeId.toLowerCase()) && 
            (item.quantity > 0 || item.qty > 0)
          );
          
          if (knife) {
            console.log('Найден нож в инвентаре:', knife.id);
            return true;
          }
        }
      }
      
      // Проверяем глобальные ресурсы
      if (window.globalUserResources) {
        for (const key in window.globalUserResources) {
          if (knifeIds.some(knife => key.toLowerCase().includes(knife.toLowerCase())) && 
              window.globalUserResources[key] > 0) {
            console.log('Найден нож в глобальных ресурсах:', key);
            return true;
          }
        }
      }
      
      // Проверяем localStorage как запасной вариант
      try {
        const storedInventory = localStorage.getItem(`inventory_${telegramId}`);
        if (storedInventory) {
          const inventory = JSON.parse(storedInventory);
          
          for (const key in inventory) {
            if (knifeIds.some(knife => key.toLowerCase().includes(knife.toLowerCase())) && 
                inventory[key] > 0) {
              console.log('Найден нож в localStorage:', key);
              return true;
            }
          }
        }
      } catch (e) {
        console.error('Ошибка при чтении localStorage для проверки ножа:', e);
      }
      
      console.log('Нож не найден в инвентаре');
      return false;
    } catch (error) {
      console.error('Ошибка при проверке наличия ножа:', error);
      return false;
    }
  };
  
  // Функция для использования стрелы
  const useArrow = async () => {
    try {
      // Сначала пытаемся использовать обычную стрелу
      let arrowUsed = false;
      let arrowType = '';
      
      // Определяем тип используемой стрелы из экипировки
      if (window.equippedItems && window.equippedItems.weapon2) {
        if (window.equippedItems.weapon2 === 'primarrows' || window.equippedItems.weapon2 === 'primarrow' || window.equippedItems.weapon2 === 'PrimArrow') {
          arrowType = 'primarrows'; // Стандартизируем название стрел
          arrowUsed = true;
          console.log('Используем экипированную стрелу:', arrowType);
        } else if (window.equippedItems.weapon2 === 'arrow' || window.equippedItems.weapon2 === 'Arrow') {
          arrowType = 'arrow'; // Стандартизируем название стрел
          arrowUsed = true;
          console.log('Используем экипированную стрелу:', arrowType);
        }
      }
      
      // Проверяем в IndexedDB, если не нашли в экипировке
      if (!arrowUsed && window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
        const inventory = await window.IndexedDBModule.getInventoryItems();
        
        // Сначала пытаемся использовать обычную стрелу
        const arrowIndex = inventory.findIndex(i => (i.id === 'Arrow' || i.id === 'arrow') && (i.quantity > 0 || i.qty > 0));
        if (arrowIndex !== -1) {
          arrowType = 'arrow'; // Стандартизируем название стрел
          arrowUsed = true;
          console.log('Используем стрелу из IndexedDB:', arrowType);
        } else {
          // Если нет обычной стрелы, используем примитивную
          const primArrowIndex = inventory.findIndex(i => (i.id === 'PrimArrow' || i.id === 'primarrow' || i.id === 'primarrows') && (i.quantity > 0 || i.qty > 0));
          if (primArrowIndex !== -1) {
            arrowType = 'primarrows'; // Стандартизируем название стрел
            arrowUsed = true;
            console.log('Используем примитивную стрелу из IndexedDB:', arrowType);
          }
        }
      }
      
      // Если не получилось использовать через IndexedDB, обновляем глобальные ресурсы
      if (!arrowUsed && window.globalUserResources) {
        if (window.globalUserResources.Arrow && window.globalUserResources.Arrow > 0) {
          arrowType = 'arrow'; // Стандартизируем название стрел
          arrowUsed = true;
        } else if (window.globalUserResources.arrow && window.globalUserResources.arrow > 0) {
          arrowType = 'arrow'; // Стандартизируем название стрел
          arrowUsed = true;
        } else if (window.globalUserResources.PrimArrow && window.globalUserResources.PrimArrow > 0) {
          arrowType = 'primarrows'; // Стандартизируем название стрел
          arrowUsed = true;
        } else if (window.globalUserResources.primarrow && window.globalUserResources.primarrow > 0) {
          arrowType = 'primarrows'; // Стандартизируем название стрел
          arrowUsed = true;
        } else if (window.globalUserResources.primarrows && window.globalUserResources.primarrows > 0) {
          arrowType = 'primarrows'; // Стандартизируем название стрел
          arrowUsed = true;
        }
        
        if (arrowUsed) {
          console.log('Используем стрелу из глобальных ресурсов:', arrowType);
        }
      }
      
      // Если предыдущие методы не сработали, но стрелы есть в экипировке, используем их как запасной вариант
      if (!arrowUsed && window.equippedItems && window.equippedItems.weapon2) {
        if (window.equippedItems.weapon2 === 'primarrows' || window.equippedItems.weapon2 === 'primarrow' || window.equippedItems.weapon2 === 'PrimArrow') {
          arrowType = 'primarrows'; // Стандартизируем название стрел
          arrowUsed = true;
          console.log('Используем экипированную стрелу как запасной вариант:', arrowType);
        } else if (window.equippedItems.weapon2 === 'arrow' || window.equippedItems.weapon2 === 'Arrow') {
          arrowType = 'arrow'; // Стандартизируем название стрел
          arrowUsed = true;
          console.log('Используем экипированную стрелу как запасной вариант:', arrowType);
        }
      }
      
      // Обновляем счетчик доступных стрел и отслеживаем использованные стрелы
      if (arrowUsed) {
        // Обновляем счетчик доступных стрел
        setArrowsAvailable(prev => {
          const newValue = Math.max(0, prev - 1);
          
          // Если это была последняя стрела, немедленно останавливаем охоту
          if (newValue === 0 && huntState === 'active') {
            console.log('Последняя стрела использована, останавливаем охоту');
            setTimeout(() => {
              setHuntState('completed');
              // Подсчитываем общее количество использованных стрел
              const totalUsed = Object.values(usedArrows).reduce((sum, count) => sum + count, 0) + 1; // +1 для текущей стрелы
              setNoArrowsMessage(`Hunting aborted, no more arrows left!`);
              saveHuntData('completed');
            }, 0);
          }
          
          return newValue;
        });
        
        // Если не удалось определить тип стрелы, используем primarrows по умолчанию
        if (!arrowType) {
          arrowType = 'primarrows';
        }
        
        // Отслеживаем количество использованных стрел каждого типа
        setUsedArrows(prev => {
          const newUsedArrows = {...prev};
          if (newUsedArrows[arrowType]) {
            newUsedArrows[arrowType]++;
          } else {
            newUsedArrows[arrowType] = 1;
          }
          console.log('Отслеживаем использованные стрелы:', newUsedArrows);
          return newUsedArrows;
        });
      }
      
      return arrowUsed;
    } catch (error) {
      console.error('Ошибка при использовании стрелы:', error);
      return false;
    }
  };

  const loadHuntSession = async () => {
    setIsLoading(true);
    
    // Проверяем наличие стрел
    const arrows = await checkArrowsAvailability();
    setArrowsAvailable(arrows);
    
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
      
      // Восстанавливаем информацию об использованных стрелах, если она доступна
      if (data.session.usedArrows) {
        setUsedArrows(data.session.usedArrows);
      } else {
        // Если информации нет, создаем ее на основе количества ресурсов
        const sessionResourcesClaimed = parseInt(data.session.resources_claimed, 10) || 0;
        if (sessionResourcesClaimed > 0) {
          // По умолчанию, считаем все использованные стрелы как primarrows
          setUsedArrows({ primarrows: sessionResourcesClaimed });
        }
      }
      
      // Определяем максимальное количество ресурсов для этой сессии
      // Если в сессии уже сохранено maxResources, используем его, иначе минимум между 16 и количеством стрел
      const maxSessionResources = data.session.maxResources || Math.min(16, arrows);
      
      if (data.session.end_time <= currentTime) {
        const sessionResourcesClaimed = parseInt(data.session.resources_claimed, 10) || 0;
        if (sessionResourcesClaimed < maxSessionResources) {
          // Если стрелы закончились, не добавляем бонусные ресурсы
          if (arrows <= 0) {
            setHuntState('completed');
            setResources(data.session.resources || {});
            setTotalHunted(data.session.total_gathered || {});
            setNoArrowsMessage('Hunting aborted, no more arrows left!');
            setTimeout(() => {
              saveHuntData('completed', data.session.end_time, data.session.resources || {}, data.session.total_gathered || {}, data.session.last_claim_time, data.session.next_resource_time, data.session.resources_claimed || 0, maxSessionResources);
            }, 100);
          } else {
            // Проверяем, хватит ли стрел на оставшиеся ресурсы
            const remainingResources = maxSessionResources - sessionResourcesClaimed;
            const availableArrows = Math.min(remainingResources, arrows);
            
            const sessionResources = data.session.resources || {};
            const sessionTotalHunted = data.session.total_gathered || {};
            const newResources = { ...sessionResources };
            const newTotalHunted = { ...sessionTotalHunted };
            let bonusResourcesAddedCount = 0;
            
            for (let i = 0; i < availableArrows; i++) {
              const random = Math.floor(Math.random() * 100) + 1;
              let accumulatedChance = 0;
              let selectedResource = null;
              for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
                accumulatedChance += chance;
                if (random <= accumulatedChance) {
                  selectedResource = resource;
                  break;
                }
              }
              if (selectedResource) {
                newResources[selectedResource] = (newResources[selectedResource] || 0) + 1;
                newTotalHunted[selectedResource] = (newTotalHunted[selectedResource] || 0) + 1;
                bonusResourcesAddedCount++;
                await useArrow(); // Используем стрелу без обновления в БД
              }
            }
            
            const newResourcesClaimed = sessionResourcesClaimed + bonusResourcesAddedCount;
            setBonusResourcesAdded(bonusResourcesAddedCount);
            
            // Если добавили не все возможные ресурсы из-за нехватки стрел
            if (availableArrows < remainingResources) {
              setNoArrowsMessage('Hunting aborted, no more arrows left!');
            }
            
            // Если достигли максимального количества ресурсов для этой сессии
            if (newResourcesClaimed >= maxSessionResources) {
              // Подсчитываем общее количество использованных стрел
              const totalUsed = Object.values(usedArrows).reduce((sum, count) => sum + count, 0);
              setNoArrowsMessage('Hunting completed!');
            }
            
            setHuntState('completed');
            setResources(newResources);
            setTotalHunted(newTotalHunted);
            setResourcesClaimed(newResourcesClaimed);
            setTimeout(() => {
              saveHuntData('completed', data.session.end_time, newResources, newTotalHunted, data.session.last_claim_time, data.session.next_resource_time, newResourcesClaimed, maxSessionResources);
            }, 100);
          }
        } else {
          setHuntState('completed');
          setResources(data.session.resources || {});
          setTotalHunted(data.session.total_gathered || {});
          if (data.session.state === 'active') {
            setTimeout(() => {
              saveHuntData('completed', data.session.end_time, data.session.resources || {}, data.session.total_gathered || {}, data.session.last_claim_time, data.session.next_resource_time, data.session.resources_claimed || 0, maxSessionResources);
            }, 100);
          }
        }
      } else if (data.session.state === 'active') {
        setHuntState('active');
        const remainingTime = data.session.end_time - currentTime;
        setCountdown(remainingTime);
        const sessionResources = data.session.resources || {};
        const sessionTotalHunted = data.session.total_gathered || {};
        const lastLoginTime = data.session.last_login || currentTime;
        const timeDifference = lastLoginTime - sessionStartTime;
        const maxResourceAdditions = Math.floor(timeDifference / (29 * 60));
        const lastClaimTimeValue = data.session.last_claim_time || sessionStartTime;
        const alreadyAddedResources = Math.floor((lastClaimTimeValue - sessionStartTime) / (29 * 60));
        
        // Проверяем, если стрелы кончились или их недостаточно
        let resourcesNeedToAdd = Math.max(0, maxResourceAdditions - alreadyAddedResources);
        
        // Показываем сообщение о максимальном количестве ресурсов
        if (maxSessionResources < 8) {
          setNoArrowsMessage(`You have only ${maxSessionResources} arrows. Maximum resources you can get: ${maxSessionResources}`);
        }
        
        if (arrows <= 0 && resourcesNeedToAdd > 0) {
          // Стрелы закончились, завершаем охоту
          setHuntState('completed');
          setResources(sessionResources);
          setTotalHunted(sessionTotalHunted);
          setNoArrowsMessage('Hunting aborted, no more arrows left!');
          setTimeout(() => {
            saveHuntData('completed', currentTime, sessionResources, sessionTotalHunted, lastClaimTimeValue, lastClaimTimeValue, data.session.resources_claimed || 0, maxSessionResources);
          }, 100);
        } else if (resourcesNeedToAdd > 0) {
          // Проверяем, хватит ли стрел на все ресурсы
          resourcesNeedToAdd = Math.min(resourcesNeedToAdd, arrows);
          
          const newResources = { ...sessionResources };
          const newTotalHunted = { ...sessionTotalHunted };
          let resourcesAddedCount = 0;
          
          for (let i = 0; i < resourcesNeedToAdd; i++) {
            const random = Math.floor(Math.random() * 100) + 1;
            let accumulatedChance = 0;
            let selectedResource = null;
            for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
              accumulatedChance += chance;
              if (random <= accumulatedChance) {
                selectedResource = resource;
                break;
              }
            }
            if (selectedResource) {
              newResources[selectedResource] = (newResources[selectedResource] || 0) + 1;
              newTotalHunted[selectedResource] = (newTotalHunted[selectedResource] || 0) + 1;
              resourcesAddedCount++;
              await useArrow(); // Используем стрелу без обновления в БД
            }
          }
          
          // Если стрелы закончились и были добавлены не все ресурсы
          if (resourcesNeedToAdd < Math.max(0, maxResourceAdditions - alreadyAddedResources)) {
            setNoArrowsMessage('Hunting aborted, no more arrows left!');
            setHuntState('completed');
            setTimeout(() => {
              saveHuntData('completed', currentTime, newResources, newTotalHunted, currentTime, currentTime, 
                          parseInt(data.session.resources_claimed || 0) + resourcesAddedCount, maxSessionResources);
            }, 100);
          } else {
            setResources(newResources);
            setTotalHunted(newTotalHunted);
            setResourcesClaimed(prev => {
              const base = Math.max(parseInt(prev, 10) || 0, parseInt(data.session.resources_claimed, 10) || 0);
              const newVal = base + resourcesAddedCount;
              const newLastClaimTime = sessionStartTime + (alreadyAddedResources + resourcesAddedCount) * (29 * 60);
              setLastClaimTime(newLastClaimTime);
              const newNextResourceTime = newLastClaimTime + (29 * 60);
              setNextResourceTime(newNextResourceTime);
              
              // Если достигли максимального количества ресурсов, завершаем охоту
              if (newVal >= maxSessionResources) {
                // Подсчитываем общее количество использованных стрел
                const totalUsed = Object.values(usedArrows).reduce((sum, count) => sum + count, 0);
                setNoArrowsMessage('Hunting completed!');
                setHuntState('completed');
                setTimeout(() => {
                  saveHuntData('completed', currentTime, newResources, newTotalHunted, newLastClaimTime, newNextResourceTime, newVal, maxSessionResources);
                }, 100);
              } else {
                setTimeout(() => {
                  saveHuntData('active', data.session.end_time, newResources, newTotalHunted, newLastClaimTime, newNextResourceTime, newVal, maxSessionResources);
                }, 100);
              }
              
              console.log(`Счетчик полученных ресурсов: ${newVal}/16`);
              return newVal;
            });
          }
        } else {
          setResources(sessionResources);
          setTotalHunted(sessionTotalHunted);
          setLastClaimTime(lastClaimTimeValue);
          const newNextResourceTime = lastClaimTimeValue + (29 * 60);
          setNextResourceTime(newNextResourceTime);
          
          // Если уже достигли максимального количества ресурсов, показываем сообщение
          const currentClaimed = parseInt(data.session.resources_claimed, 10) || 0;
          if (currentClaimed >= maxSessionResources) {
            // Подсчитываем общее количество использованных стрел
            const totalUsed = Object.values(usedArrows).reduce((sum, count) => sum + count, 0);
            setNoArrowsMessage('Hunting completed!');
            setHuntState('completed');
            setTimeout(() => {
              saveHuntData('completed', currentTime, sessionResources, sessionTotalHunted, lastClaimTimeValue, lastClaimTimeValue, currentClaimed, maxSessionResources);
            }, 100);
          } else {
            setTimeout(() => {
              saveHuntData('active', data.session.end_time, sessionResources, sessionTotalHunted, lastClaimTimeValue, newNextResourceTime, data.session.resources_claimed || 0, maxSessionResources);
            }, 100);
          }
        }
      } else if (data.session.state === 'completed' || (data.session.resources && Object.keys(data.session.resources).length > 0)) {
        setHuntState('completed');
        setResources(data.session.resources || {});
        setTotalHunted(data.session.total_gathered || {});
      } else {
        setHuntState('idle');
        setResources({});
        setTotalHunted({});
        setResourcesClaimed(0);
      }
    } else {
      setHuntState('idle');
      setResources({});
      setTotalHunted({});
      setResourcesClaimed(0);
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    let timer;
    if (huntState === "active" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setHuntState("completed");
            saveHuntData('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [huntState, countdown]);

  React.useEffect(() => {
    // Добавляем флаг для предотвращения немедленного добавления ресурса при загрузке страницы
    let isInitialLoad = true;
    
    // Первая проверка произойдет через 3 секунды после монтирования компонента
    const initialDelay = setTimeout(() => {
      isInitialLoad = false;
    }, 3000);
    
    // Основной таймер для периодической проверки
    const checkResourceTimer = setInterval(() => {
      if (huntState === 'active') {
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Проверяем, нужно ли добавить ресурс, но только если прошла начальная задержка
        if (currentTime >= nextResourceTime && arrowsAvailable > 0 && !isInitialLoad) {
          console.log('Добавляем ресурс по таймеру, текущее время:', new Date(currentTime * 1000));
          console.log('Следующий ресурс был запланирован на:', new Date(nextResourceTime * 1000));
          addRandomHunt();
        }
        else if (currentTime >= nextResourceTime && arrowsAvailable <= 0) {
          // Если стрелы закончились, переводим сессию в состояние завершения
          if (huntState !== 'completed') {
            setHuntState('completed');
            setNoArrowsMessage('Hunting aborted, no more arrows left!');
            saveHuntData('completed');
          }
        }
      }
    }, 1000);
    
    // Очищаем оба таймера при размонтировании
    return () => { 
      clearInterval(checkResourceTimer);
      clearTimeout(initialDelay);
    };
  }, [huntState, nextResourceTime, arrowsAvailable]);

  const addRandomHunt = async () => {
    // Проверяем наличие стрел перед добавлением ресурса
    if (arrowsAvailable <= 0) {
      setHuntState('completed');
      setNoArrowsMessage('Hunting aborted, no more arrows left!');
      saveHuntData('completed');
      return;
    }
    
    // Получаем данные сессии, чтобы проверить максимальное количество ресурсов
    try {
      const response = await fetch(addTimestamp(`rpg.php?action=getGatheringSession`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      const data = await response.json();
      
      if (data.success && data.session) {
        const maxSessionResources = data.session.maxResources || 16;
        const currentResourcesClaimed = parseInt(data.session.resources_claimed || 0, 10);
        
        // Если уже достигли максимального количества ресурсов, завершаем охоту
        if (currentResourcesClaimed >= maxSessionResources) {
          setHuntState('completed');
          // Подсчитываем общее количество использованных стрел
          const totalUsed = Object.values(usedArrows).reduce((sum, count) => sum + count, 0);
          setNoArrowsMessage('Hunting completed!');
          saveHuntData('completed', null, resources, totalHunted, lastClaimTime, nextResourceTime, currentResourcesClaimed, maxSessionResources);
          return;
        }
      }
    } catch (error) {
      console.error('Ошибка при получении данных сессии:', error);
    }
    
    // Используем стрелу - результат проверяем сразу же
    const arrowUsed = await useArrow();
    if (!arrowUsed || arrowsAvailable <= 0) {
      // Если не удалось использовать стрелу, немедленно останавливаем охоту
      if (huntState !== 'completed') {
        setHuntState('completed');
        // Проверяем, были ли использованы стрелы вообще
        const totalUsed = Object.values(usedArrows).reduce((sum, count) => sum + count, 0);
        if (totalUsed > 0) {
          setNoArrowsMessage('Hunting completed!');
        } else {
          setNoArrowsMessage('Hunting aborted, no more arrows left!');
        }
        saveHuntData('completed');
      }
      return;
    }
    
    // Продолжаем только если стрела была успешно использована
    const random = Math.floor(Math.random() * 100) + 1;
    let accumulatedChance = 0;
    let selectedResource = null;
    for (const [resource, chance] of Object.entries(RESOURCE_CHANCES)) {
      accumulatedChance += chance;
      if (random <= accumulatedChance) {
        selectedResource = resource;
        break;
      }
    }
    if (selectedResource) {
      const currentTime = Math.floor(Date.now() / 1000);
      const newResources = { ...resources };
      const newTotalHunted = { ...totalHunted };
      newResources[selectedResource] = (newResources[selectedResource] || 0) + 1;
      newTotalHunted[selectedResource] = (newTotalHunted[selectedResource] || 0) + 1;
      const nextTime = currentTime + (29 * 60);
      setResources(newResources);
      setTotalHunted(newTotalHunted);
      setLastClaimTime(currentTime);
      setNextResourceTime(nextTime);
      setResourcesClaimed(prev => {
        const newValue = (parseInt(prev, 10) || 0) + 1;
        setTimeout(() => {
          saveHuntData('active', null, newResources, newTotalHunted, currentTime, nextTime, newValue);
        }, 100);
        return newValue;
      });
    }
  };

  const saveHuntData = async (state = huntState, existingEndTime = null, currentResources = resources, currentTotalHunted = totalHunted, currentLastClaimTime = lastClaimTime, currentNextResourceTime = nextResourceTime, currentResourcesClaimed = resourcesClaimed, maxResources = 16) => {
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
      const gatheringType = 'hunt';
      const gatheringData = {
        telegramId,
        state,
        resources: currentResources,
        totalGathered: currentTotalHunted,
        lastClaimTime: currentLastClaimTime,
        nextResourceTime: currentNextResourceTime,
        resourcesClaimed: safeResourcesClaimed,
        createdAt: currentTime,
        endTime: endTime,
        startTime: sessionCreatedAt || currentTime,
        usedArrows: usedArrows,
        maxResources: maxResources
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
        console.error('Ошибка при сохранении данных охоты:', data.message);
      } else {
        if (state === 'completed' && huntState !== 'completed') {
          setHuntState('completed');
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении данных охоты:', error);
    }
  };

  // Вспомогательная функция для инициализации сессии охоты 
  // (вынесена отдельно, чтобы можно было вызвать её после проверок и предупреждений)
  const initHuntSession = (effectiveArrows) => {
    console.log('Инициализация сессии охоты с', effectiveArrows, 'стрелами');
    const currentTime = Math.floor(Date.now() / 1000);
    const duration = 8 * 60 * 60;
    setBonusResourcesAdded(0);
    setNoArrowsMessage('');
    
    // Сохраняем начальное количество стрел для логирования
    setInitialArrowCount(effectiveArrows);
    
    const startTime = currentTime;
    const endTime = startTime + duration;
    const nextTime = startTime + (29 * 60);
    const emptyResources = {};
    const emptyTotalHunted = {};
    setSessionCreatedAt(startTime);
    setHuntState("active");
    setCountdown(duration);
    setResources(emptyResources);
    setTotalHunted(emptyTotalHunted);
    setLastClaimTime(startTime);
    setNextResourceTime(nextTime);
    const initialResourcesClaimed = 0;
    setResourcesClaimed(initialResourcesClaimed);
    
    // Ограничиваем максимальное количество ресурсов, которое можно получить
    const maxResources = Math.min(16, effectiveArrows);
    
    // Создаем сессию на сервере
    setTimeout(() => {
      saveHuntData('active', endTime, emptyResources, emptyTotalHunted, startTime, nextTime, initialResourcesClaimed, maxResources);
    }, 100);
    
    // Если у пользователя мало стрел, выводим уведомление
    if (effectiveArrows < 16) {
      setNoArrowsMessage(`You have only ${effectiveArrows} arrows. Maximum resources you can get: ${effectiveArrows}`);
    }
  };

  const startHunt = async () => {
    // Проверяем наличие стрел перед началом охоты
    const arrows = await checkArrowsAvailability();
    setArrowsAvailable(arrows);
    
    if (arrows <= 0 && !(window.equippedItems && window.equippedItems.weapon2 && 
        (window.equippedItems.weapon2 === 'primarrows' || window.equippedItems.weapon2 === 'arrow'))) {
      console.log('Стрелы не найдены. Проверяем экипировку:', window.equippedItems);
      setNoArrowsMessage('You need arrows to hunt! Please equip arrows or add them to your inventory.');
      setShowNoArrowsModal(true);
      return;
    }
    
    // Проверяем наличие ножа в инвентаре
    const hasKnife = await checkKnifeAvailability();
    if (!hasKnife) {
      console.log('Нож не найден в инвентаре. Охота невозможна.');
      setNoArrowsMessage('You need a Knife in your inventory to hunt! Please craft or find one first.');
      setShowNoArrowsModal(true);
      return;
    }
    
    // Если стрел нет, но есть экипированные стрелы, устанавливаем минимальное количество
    let effectiveArrows = arrows;
    if (arrows <= 0 && window.equippedItems && window.equippedItems.weapon2) {
      if (window.equippedItems.weapon2 === 'primarrows' || window.equippedItems.weapon2 === 'primarrow' || window.equippedItems.weapon2 === 'PrimArrow') {
        effectiveArrows = 20;
        setArrowsAvailable(20);
        console.log('Используем экипированные примитивные стрелы для охоты');
      } else if (window.equippedItems.weapon2 === 'arrow' || window.equippedItems.weapon2 === 'Arrow') {
        effectiveArrows = 20;
        setArrowsAvailable(20);
        console.log('Используем экипированные обычные стрелы для охоты');
      }
    }
    
    // Предупреждение о недостатке стрел - ВАЖНО: показываем его ДО создания сессии
    if (effectiveArrows < 16) {
      // Устанавливаем флаг для отслеживания подтверждения пользователя
      window.confirmHuntWithLessArrows = false;
      
      // Создаем обработчик события, который будет вызываться после закрытия модального окна
      window.continueHuntWithLessArrows = () => {
        console.log('Пользователь подтвердил начало охоты с меньшим количеством стрел:', effectiveArrows);
        window.confirmHuntWithLessArrows = true;
        // Инициализируем сессию охоты
        initHuntSession(effectiveArrows);
      };
      
      // Показываем модальное окно предупреждения
      setArrowWarningMessage(`You only have ${effectiveArrows} arrows. Your hunting session may end early when you run out of arrows!`);
      setShowArrowWarningModal(true);
      return; // Прерываем выполнение функции до получения ответа от пользователя
    }
    
    // Если стрел достаточно, сразу инициализируем сессию
    initHuntSession(effectiveArrows);
  };

  const cancelHunt = async () => {
    // Блокируем кнопку, чтобы предотвратить множественные нажатия
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSpent = currentTime - sessionCreatedAt;
    setBonusResourcesAdded(0);
    await logHuntSession('Canceled', timeSpent);
    
    if (Object.keys(resources).length > 0) {
      // Есть ресурсы для сохранения, отправляем их на сервер
      await saveHuntResourcesInDatabase();
      
      // Добавляем вызов функции синхронизации ресурсов после сохранения в БД
      if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
        console.log('Синхронизация ресурсов с IndexedDB после отмены охоты...');
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
        console.log('Обновление отображения инвентаря после отмены охоты...');
        await window.InventoryModule.refreshInventoryDisplay();
      }
    }
    
    // Отправляем информацию об использованных стрелах на сервер, только если были использованы стрелы
    if (Object.keys(usedArrows).length > 0) {
      await updateArrowsInDatabase();
    }
    
    setHuntState("idle");
    setCountdown(0);
    setResources({});
    setTotalHunted({});
    setSessionCreatedAt(0);
    setUsedArrows({});
    setInitialArrowCount(0);
    
    try {
      const response = await fetch(addTimestamp(`rpg.php?action=deleteGatheringSession`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Ошибка при удалении сессии охоты:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при удалении сессии охоты:', error);
    }
  };

  const claimHunt = async () => {
    // Блокируем кнопку, чтобы предотвратить множественные нажатия
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeSpent = currentTime - sessionCreatedAt;
    setBonusResourcesAdded(0);
    await logHuntSession('Claimed', timeSpent);
    
    // Сохраняем полученные ресурсы
    await saveHuntResourcesInDatabase();
    
    // Добавляем вызов функции синхронизации ресурсов после сохранения в БД
    if (window.ModalModule && typeof window.ModalModule.syncResourcesWithIndexedDB === 'function') {
      console.log('Синхронизация ресурсов с IndexedDB после охоты...');
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
      console.log('Обновление отображения инвентаря после охоты...');
      await window.InventoryModule.refreshInventoryDisplay();
    }
    
    // Отправляем информацию об использованных стрелах на сервер
    // updateArrowsInDatabase вызывает внутри себя updateLocalArrows, поэтому не нужно вызывать его отдельно
    await updateArrowsInDatabase();
    
    setHuntState("idle");
    setCountdown(0);
    setResources({});
    setTotalHunted({});
    setSessionCreatedAt(0);
    setUsedArrows({});
    setInitialArrowCount(0);
    
    try {
      const response = await fetch(addTimestamp(`rpg.php?action=deleteGatheringSession`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Ошибка при удалении сессии охоты:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при удалении сессии охоты:', error);
    }
    
    // Для обеспечения синхронизации, перезагружаем инвентарь после всех операций
    try {
      if (window.IndexedDBModule && typeof window.IndexedDBModule.loadInventory === 'function') {
        await window.IndexedDBModule.loadInventory();
        console.log('Инвентарь перезагружен для синхронизации данных');
      }
    } catch (error) {
      console.error('Ошибка при перезагрузке инвентаря:', error);
    }
  };

  // Функция для обновления стрел в БД
  const updateArrowsInDatabase = async () => {
    try {
      console.log('Обновляем использованные стрелы в БД:', usedArrows);
      
      // Используем updateUserInventoryItem API вместо updateInventory
      for (const [arrowType, count] of Object.entries(usedArrows)) {
        if (count > 0) {
          console.log(`Отправляем запрос на обновление ${count} стрел типа ${arrowType}`);
          
          // Исправленный формат запроса в соответствии с документацией
          try {
            const response = await fetch(addTimestamp(`rpg.php?action=updateUserInventoryItem`), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                telegramId,
                itemId: arrowType,
                quantity: -count,
                operation: 'add' // 'add' для инкремента/декремента, 'set' для установки значения
              })
            });
            
            if (!response.ok) {
              console.error(`Ошибка при обновлении стрел ${arrowType} в БД через updateUserInventoryItem: ${response.status}`);
              
              // Попробуем альтернативный формат через updateUserInventory
              try {
                const alternativeResponse = await fetch(addTimestamp(`rpg.php?action=updateUserInventory`), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    telegramId,
                    inventory: {
                      [arrowType]: -count
                    }
                  })
                });
                
                if (alternativeResponse.ok) {
                  const data = await alternativeResponse.json();
                  console.log(`Результат обновления стрел ${arrowType} через updateUserInventory:`, data);
                } else {
                  throw new Error(`Альтернативный API также вернул ошибку: ${alternativeResponse.status}`);
                }
              } catch (altError) {
                console.error(`Ошибка при использовании updateUserInventory:`, altError);
                
                // Последняя попытка через updateResources
                try {
                  const resourcesResponse = await fetch(addTimestamp(`rpg.php?action=updateResources`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      telegramId,
                      resources: {
                        [arrowType]: -count
                      }
                    })
                  });
                  
                  if (resourcesResponse.ok) {
                    const data = await resourcesResponse.json();
                    console.log(`Результат обновления стрел ${arrowType} через updateResources:`, data);
                  } else {
                    console.error(`Ошибка при использовании updateResources: ${resourcesResponse.status}`);
                  }
                } catch (resourcesError) {
                  console.error(`Все попытки обновления стрел в БД завершились неудачей:`, resourcesError);
                }
              }
            } else {
              const data = await response.json();
              console.log(`Результат обновления стрел ${arrowType}:`, data);
            }
          } catch (error) {
            console.error(`Ошибка при отправке запроса на обновление стрел ${arrowType}:`, error);
          }
        }
      }
      
      // Обновляем стрелы в локальных хранилищах независимо от результата запросов
      await updateLocalArrows();
      
    } catch (error) {
      console.error('Ошибка при обновлении стрел в БД:', error);
    }
  };
  
  // Обновляем стрелы в локальных хранилищах
  const updateLocalArrows = async () => {
    try {
      // Обновляем в IndexedDB
      if (window.IndexedDBModule && typeof window.IndexedDBModule.getInventoryItems === 'function') {
        const inventory = await window.IndexedDBModule.getInventoryItems();
        let updatedInventory = [...inventory];
        
        for (const [arrowType, count] of Object.entries(usedArrows)) {
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
            
            const remainingQuantity = updatedInventory[arrowIndex] && updatedInventory[arrowIndex].quantity ? updatedInventory[arrowIndex].quantity : 0;
            console.log(`Обновлено количество стрел ${arrowType} в IndexedDB: -${count}, осталось ${remainingQuantity}`);
            
            if (updatedInventory[arrowIndex].quantity === 0) {
              updatedInventory.splice(arrowIndex, 1);
            }
          }
        }
        
        // Обновляем IndexedDB напрямую
        if (window.IndexedDBModule.updateUserInventory) {
          await window.IndexedDBModule.updateUserInventory(updatedInventory);
          console.log('Обновлен инвентарь в IndexedDB');
        }
        
        // Дополнительно обновляем через IndexedDB API, если доступно
        try {
          const dbName = 'rpgDatabase';
          const storeName = 'inventory';
          
          if (window.indexedDB) {
            // Открываем базу данных
            const openRequest = indexedDB.open(dbName);
            
            openRequest.onsuccess = function(event) {
              const db = event.target.result;
              
              // Проверяем существование хранилища
              if (db.objectStoreNames && Array.from(db.objectStoreNames).includes(storeName)) {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // Очищаем хранилище и добавляем обновленные данные
                const clearRequest = store.clear();
                clearRequest.onsuccess = function() {
                  for (let i = 0; i < updatedInventory.length; i++) {
                    store.add(updatedInventory[i]);
                  }
                  console.log('Обновлено хранилище IndexedDB напрямую');
                };
                
                transaction.oncomplete = function() {
                  db.close();
                };
              }
            };
          }
        } catch (dbError) {
          console.error('Ошибка при прямом обновлении IndexedDB:', dbError);
        }
      }
      
      // Обновляем глобальные ресурсы
      if (window.globalUserResources) {
        // Создаем копию глобальных ресурсов
        const updatedResources = {};
        for (const key in window.globalUserResources) {
          if (window.globalUserResources.hasOwnProperty(key)) {
            updatedResources[key] = window.globalUserResources[key];
          }
        }
        
        for (const [arrowType, count] of Object.entries(usedArrows)) {
          // Проверяем все возможные варианты названий стрел
          const arrowVariants = ['arrow', 'Arrow', 'primarrows', 'primarrow', 'PrimArrow'];
          
          for (const variant of arrowVariants) {
            if (updatedResources[variant] && 
               ((arrowType === 'arrow' && (variant === 'arrow' || variant === 'Arrow')) || 
                (arrowType === 'primarrows' && (variant === 'primarrows' || variant === 'primarrow' || variant === 'PrimArrow')))) {
              
              updatedResources[variant] = Math.max(0, parseInt(updatedResources[variant]) - count);
              console.log(`Обновлено количество стрел ${variant} в глобальных ресурсах: -${count}, осталось ${updatedResources[variant]}`);
            }
          }
        }
        
        // Обновляем глобальные ресурсы
        for (const key in updatedResources) {
          if (updatedResources.hasOwnProperty(key)) {
            window.globalUserResources[key] = updatedResources[key];
          }
        }
        
        // Обновляем только глобальные переменные
          console.log('Обновлены глобальные ресурсы');
        
        // Обновляем UI, если есть функция обновления
        if (typeof window.updateResourcesUI === 'function') {
          try {
            window.updateResourcesUI();
          } catch (uiError) {
            console.error('Ошибка при обновлении UI:', uiError);
          }
        }
      }
      
      // Обновляем данные в localStorage для инвентаря
      try {
        const inventoryKey = `inventory_${telegramId}`;
        const storedInventory = localStorage.getItem(inventoryKey);
        
        if (storedInventory) {
          let inventory;
          try {
            inventory = JSON.parse(storedInventory);
          } catch (parseError) {
            console.error('Ошибка при парсинге инвентаря:', parseError);
            return; // Прерываем выполнение функции
          }
          
          for (const [arrowType, count] of Object.entries(usedArrows)) {
            // Обновляем все варианты стрел
            if (arrowType === 'arrow') {
              if (inventory.Arrow) inventory.Arrow = Math.max(0, parseInt(inventory.Arrow) - count);
              if (inventory.arrow) inventory.arrow = Math.max(0, parseInt(inventory.arrow) - count);
            } else if (arrowType === 'primarrows') {
              if (inventory.PrimArrow) inventory.PrimArrow = Math.max(0, parseInt(inventory.PrimArrow) - count);
              if (inventory.primarrow) inventory.primarrow = Math.max(0, parseInt(inventory.primarrow) - count);
              if (inventory.primarrows) inventory.primarrows = Math.max(0, parseInt(inventory.primarrows) - count);
            }
          }
          
          try {
            localStorage.setItem(inventoryKey, JSON.stringify(inventory));
            console.log('Обновлен инвентарь в localStorage');
          } catch (setError) {
            console.error('Ошибка при сохранении инвентаря в localStorage:', setError);
          }
        }
      } catch (localError) {
        console.error('Ошибка при обновлении инвентаря в localStorage:', localError);
      }
      
    } catch (error) {
      console.error('Ошибка при обновлении локальных стрел:', error);
    }
  };

  const logHuntSession = async (endMethod, timeSpent) => {
    try {
      const hours = Math.floor(timeSpent / 3600);
      const minutes = Math.floor((timeSpent % 3600) / 60);
      const seconds = Math.floor(timeSpent % 60);
      const formattedTimeSpent = `${hours}h ${minutes}m ${seconds}s`;
      
      // Подсчитываем общее количество использованных стрел
      const totalArrowsUsed = Object.values(usedArrows).reduce((sum, count) => sum + count, 0);
      const arrowsInfo = Object.entries(usedArrows)
        .map(([arrowType, count]) => `${arrowType}: ${count}`)
        .join(', ');
      
      // Получаем текущее количество стрел для подсчета оставшихся
      const currentArrows = await checkArrowsAvailability();
      
      // Используем сохраненное начальное количество стрел или подсчитываем как fallback
      const initialArrows = initialArrowCount > 0 ? initialArrowCount : (currentArrows + totalArrowsUsed);
      
      // Правильно вычисляем количество оставшихся стрел (текущее - использованное)
      // поскольку логирование происходит ДО обновления стрел в БД
      const remainingArrows = Math.max(0, currentArrows - totalArrowsUsed);
      
      // Формируем детальную информацию о стрелах
      let arrowsDetails = '';
      if (totalArrowsUsed > 0) {
        arrowsDetails = `Arrows: ${initialArrows} initial → ${totalArrowsUsed} used (${arrowsInfo}) → ${remainingArrows} remaining`;
      } else {
        arrowsDetails = `Arrows: ${initialArrows} initial → 0 used → ${remainingArrows} remaining`;
      }
      
      const logData = {
        telegramId,
        startTime: new Date(sessionCreatedAt * 1000).toISOString(),
        endTime: new Date(Math.floor(Date.now() / 1000) * 1000).toISOString(),
        resources: JSON.stringify(resources),
        endMethod: `${endMethod} (${formattedTimeSpent}) | ${arrowsDetails}`,
        arrowsUsed: arrowsDetails
      };
      
      console.log('[Hunt] Отправляем данные для логирования:', logData);
      
      const response = await fetch(addTimestamp(`rpg.php?action=logGatheringSession`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      const data = await response.json();
      if (data.success) {
        console.log('Информация о сессии охоты успешно записана в лог');
      } else {
        console.error('Ошибка при записи информации о сессии охоты в лог:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при логировании сессии охоты:', error);
    }
  };

  const saveHuntResourcesInDatabase = async () => {
    try {
      if (!telegramId) return;
      const response = await fetch(addTimestamp(`rpg.php?action=updateResources`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, resources, resourcesClaimed })
      });
      const data = await response.json();
      if (data.success) {
        console.log('Ресурсы охоты успешно сохранены в базе данных!');
      } else {
        console.error('Ошибка при сохранении ресурсов охоты:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при отправке запроса на сохранение ресурсов охоты:', error);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Компонент модального окна для сообщения об отсутствии стрел
  const NoArrowsModal = ({ onClose }) => {
    return (
      <div className="modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 10, 40, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}>
        <div className="modal-content" style={{
          background: 'linear-gradient(135deg, rgba(0,255,255,0.18) 0%, rgba(0,0,40,0.8) 100%)',
          boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '24px',
          border: '2px solid rgba(0,255,255,0.35)',
          borderTop: '2.5px solid #00fff7',
          borderBottom: '2.5px solid #00fff7',
          padding: '24px 18px 18px 18px',
          width: '330px',
          maxWidth: '80%',
          textAlign: 'center',
          color: '#fff',
          position: 'relative'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            color: '#00fff7',
            textShadow: '0 0 8px #00fff7, 0 0 2px #fff',
            fontSize: '20px'
          }}>Hunting Requirements</h3>
          <p style={{
            margin: '0 0 15px 0',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            {noArrowsMessage || 'You need arrows to hunt! Please craft or equip arrows to continue.'}
          </p>
          
          {/* Дополнительная информация о требованиях для охоты */}
          <div style={{
            margin: '15px 0',
            padding: '10px',
            borderTop: '1px solid rgba(0,255,255,0.2)',
            borderBottom: '1px solid rgba(0,255,255,0.2)',
            fontSize: '14px',
            background: 'rgba(0,0,60,0.3)',
            borderRadius: '8px'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#00fff7' }}>
              Hunting Requirements:
            </p>
            <ul style={{ 
              textAlign: 'left', 
              padding: '0 0 0 20px', 
              margin: '0',
              listStyleType: 'square'
            }}>
              <li>Bow equipped (Primary weapon)</li>
              <li>Arrows in inventory or equipped</li>
              <li>Knife in inventory or equipped</li>
              <li>Note: If you have less than 16 arrows, hunting may end early</li>
            </ul>
          </div>
          
          <div className="modal-buttons" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '15px'
          }}>
            <button className="modal-btn" onClick={onClose} style={{
              background: 'linear-gradient(90deg, rgba(0,255,255,0.25) 0%, rgba(0,255,255,0.12) 100%)',
              color: '#00fff7',
              border: '2px solid #00fff7',
              borderRadius: '16px',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              letterSpacing: '1px',
              boxShadow: '0 0 16px 2px rgba(0,255,255,0.53), 0 0 2px 0 #fff',
              textShadow: '0 0 8px #00fff7, 0 0 2px #fff',
              padding: '12px 32px',
              margin: '8px 0',
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
              outline: 'none',
              backdropFilter: 'blur(2px)'
            }}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="rpg-main-screen">
        <BackButton onClick={onBack} position="left" />
        <div className="rpg-content-area">
          <div className="rpg-loading futuristic">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading hunting data...</div>
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
        backgroundImage: `url('images/rpg/backgrounds/huntbg.png')`
      }}></div>
      <BackButton onClick={onBack} position="left" />
      <div className="bottom-aligned-content">
        <div className="gathering-page futuristic-gathering">
          <div className="gathering-controls">
            {huntState === "idle" && (
              <div className="action-button-container">
                <button className="gathering-button futuristic" onClick={startHunt}>Auto</button>
                <button 
                  className="gathering-button futuristic interactive"
                  onClick={async () => {
                    // Запрашиваем актуальную стамину с сервера перед запуском
                    if (window.StaminaModule) {
                      console.log('[Interactive Hunt Button] Обновляем стамину с сервера');
                      try {
                        await window.StaminaModule.update();
                        console.log('[Interactive Hunt Button] Стамина обновлена');
                      } catch (error) {
                        console.error('[Interactive Hunt Button] Ошибка обновления стамины:', error);
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
                      window.ManualGatherModule.init(container, 'hunt');
                    }
                  }}
                >
                  Interactive
                </button>
              </div>
            )}
            {huntState === "active" && (
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
                <div className="arrows-info" style={{marginBottom: '10px', color: '#00fff7', textShadow: '0 0 5px #00fff7', display: 'flex', alignItems: 'center'}}>
                  {/* Добавляем изображение стрелы в зависимости от типа стрелы */}
                  {(() => {
                    // Определяем тип стрелы на основе usedArrows
                    let arrowType = 'primarrows'; // По умолчанию примитивные стрелы
                    
                    if (Object.keys(usedArrows).length > 0) {
                      // Если есть продвинутые стрелы, показываем их
                      if (usedArrows.advancedarrows) {
                        arrowType = 'advancedarrows';
                      }
                      // Если есть обычные стрелы, показываем их
                      else if (usedArrows.arrow) {
                        arrowType = 'arrow';
                      }
                      // В противном случае оставляем примитивные стрелы
                    }
                    
                    // Возвращаем изображение стрелы
                    return (
                      <img 
                        src={`images/rpg/${arrowType}.png`}
                        alt={arrowType}
                        style={{width: '24px', height: '24px', marginRight: '8px'}}
                        onError={(e) => { e.target.src = "images/rpg/unknown.png"; }} 
                      />
                    );
                  })()}
                  Arrows available: {arrowsAvailable}
                </div>
                <button 
                  className={`gathering-button futuristic cancel ${isProcessingAction ? 'disabled' : ''}`}
                  onClick={cancelHunt}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Processing...' : 'Cancel'}
                </button>
              </React.Fragment>
            )}
            {huntState === "completed" && (
              <div>
                {noArrowsMessage && <div className="no-arrows-message" style={{color: '#ff5555', marginBottom: '10px', textShadow: '0 0 5px rgba(255,0,0,0.5)'}}>{noArrowsMessage}</div>}
                <button 
                  className={`gathering-button futuristic claim ${isProcessingAction ? 'disabled' : ''}`}
                  onClick={claimHunt}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Processing...' : 'Claim Hunt'}
                </button>
              </div>
            )}
          </div>
          {(huntState === "active" || huntState === "completed") && (
            <div className="gathered-resources">
              <h3>Hunted total:</h3>
              <div className="resources-list">
                {Object.keys(resources).length > 0 ? (
                  Object.entries(resources).map(([resource, amount]) => (
                    <div key={resource} className="resource-item">
                      <div className="resource-name">{resource}</div>
                      <div className="resource-icon futuristic">
                        <img src={`images/rpg/${resource.toLowerCase().replace(/\s+/g, '')}.png`} onError={(e) => { e.target.src = "images/rpg/unknown.png"; }} alt={resource} />
                        <span className="resource-amount">x{amount}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No hunt results yet. Check back soon!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Модальное окно для отображения сообщения об отсутствии стрел */}
      {showNoArrowsModal && <NoArrowsModal onClose={() => setShowNoArrowsModal(false)} />}
      
      {/* Модальное окно для предупреждения о недостатке стрел */}
      {showArrowWarningModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 10, 40, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content" style={{
            background: 'linear-gradient(135deg, rgba(0,255,255,0.18) 0%, rgba(0,0,40,0.8) 100%)',
            boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '24px',
            border: '2px solid rgba(0,255,255,0.35)',
            borderTop: '2.5px solid #ffa500', // Оранжевый для предупреждения
            borderBottom: '2.5px solid #ffa500',
            padding: '24px 18px 18px 18px',
            width: '330px',
            maxWidth: '80%',
            textAlign: 'center',
            color: '#fff',
            position: 'relative'
          }}>
            <h3 style={{
              margin: '0 0 15px 0',
              color: '#ffa500', // Оранжевый для предупреждения
              textShadow: '0 0 8px #ffa500, 0 0 2px #fff',
              fontSize: '20px'
            }}>Warning</h3>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <img 
                src="images/rpg/arrow.png" 
                alt="Arrow" 
                style={{
                  width: '32px',
                  height: '32px',
                  marginRight: '10px'
                }}
                onError={(e) => {
                  e.target.src = "images/rpg/primarrows.png";
                  e.target.onerror = (e2) => {
                    e2.target.src = "images/rpg/unknown.png";
                    e2.target.onerror = null;
                  };
                }}
              />
              <p style={{
                margin: '0',
                fontSize: '16px',
                lineHeight: '1.5'
              }}>
                {arrowWarningMessage}
              </p>
            </div>
            
            <div className="modal-buttons" style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '15px'
            }}>
              <button 
                className="modal-btn" 
                onClick={() => {
                  setShowArrowWarningModal(false);
                  // Отменяем начало охоты и очищаем обработчики
                  window.confirmHuntWithLessArrows = false;
                  window.continueHuntWithLessArrows = null;
                  
                  console.log('Пользователь отменил начало охоты с недостаточным количеством стрел');
                  
                  // Сбрасываем все состояния, хотя большинство из них еще не установлены
                  setHuntState("idle");
                  setCountdown(0);
                  setResources({});
                  setTotalHunted({});
                  setSessionCreatedAt(0);
                  setUsedArrows({});
                  setBonusResourcesAdded(0);
                }}
                style={{
                  background: 'linear-gradient(90deg, rgba(255,50,50,0.25) 0%, rgba(255,50,50,0.12) 100%)',
                  color: '#ff5050',
                  border: '2px solid #ff5050',
                  borderRadius: '16px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  letterSpacing: '1px',
                  boxShadow: '0 0 16px 2px rgba(255,50,50,0.53), 0 0 2px 0 #fff',
                  textShadow: '0 0 8px #ff5050, 0 0 2px #fff',
                  padding: '12px 32px',
                  margin: '8px 0',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                  outline: 'none',
                  backdropFilter: 'blur(2px)'
                }}
              >
                Cancel
              </button>
              <button 
                className="modal-btn" 
                onClick={() => {
                  // Скрываем модальное окно
                  setShowArrowWarningModal(false);
                  // Вызываем функцию продолжения охоты
                  if (typeof window.continueHuntWithLessArrows === 'function') {
                    window.continueHuntWithLessArrows();
                  }
                }} 
                style={{
                  background: 'linear-gradient(90deg, rgba(255,165,0,0.25) 0%, rgba(255,165,0,0.12) 100%)',
                  color: '#ffa500',
                  border: '2px solid #ffa500',
                  borderRadius: '16px',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  letterSpacing: '1px',
                  boxShadow: '0 0 16px 2px rgba(255,165,0,0.53), 0 0 2px 0 #fff',
                  textShadow: '0 0 8px #ffa500, 0 0 2px #fff',
                  padding: '12px 32px',
                  margin: '8px 0',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                  outline: 'none',
                  backdropFilter: 'blur(2px)'
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Экспортируем компонент
window.CraftingModule = window.CraftingModule || {};
window.CraftingModule.Hunting = Hunting; 