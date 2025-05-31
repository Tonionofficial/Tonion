// Функция для сброса блокировки

// Если у вас возникают проблемы с началом сбора ресурсов:
// 1. Откройте консоль браузера (F12)
// 2. Вставьте и выполните следующий код:

function resetGatheringProcessingLock() {
  try {
    var gatheringComponent = document.getElementById('rpg-app-root');
    
    if (gatheringComponent) {
      // Создаем и запускаем событие для сброса блокировки
      var event;
      if (typeof(Event) === 'function') {
        // Современные браузеры
        event = new CustomEvent('resetLock');
      } else {
        // IE и старые браузеры
        event = document.createEvent('Event');
        event.initEvent('resetLock', true, true);
      }
      
      gatheringComponent.dispatchEvent(event);
      
      // Попытаемся напрямую сбросить флаг блокировки
      if (typeof window.forceResetGatheringLock === 'function') {
        window.forceResetGatheringLock();
      }
      
      return 'Блокировка сброшена. Попробуйте нажать кнопку "Gather" снова.';
    } else {
      return 'Компонент не найден. Попробуйте перезагрузить страницу.';
    }
  } catch (error) {
    console.error('Ошибка при сбросе блокировки:', error);
    return 'Произошла ошибка: ' + error;
  }
}

// Также можно просто перезагрузить страницу
function reloadPage() {
  window.location.reload(true);
  return 'Перезагрузка страницы...';
}

// Для выполнения скопируйте и вставьте всю функцию,
// а затем вызовите ее командой:
// resetGatheringProcessingLock();
