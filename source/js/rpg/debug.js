// Модуль для управления отладочными логами
let _isDebugEnabled = true; // По умолчанию логирование включено

// Оригинальные методы консоли
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Переопределяем методы консоли
console.log = function(...args) {
  if (_isDebugEnabled) {
    originalConsole.log.apply(console, args);
  }
};

console.error = function(...args) {
  if (_isDebugEnabled) {
    originalConsole.error.apply(console, args);
  }
};

console.warn = function(...args) {
  if (_isDebugEnabled) {
    originalConsole.warn.apply(console, args);
  }
};

console.info = function(...args) {
  if (_isDebugEnabled) {
    originalConsole.info.apply(console, args);
  }
};

console.debug = function(...args) {
  if (_isDebugEnabled) {
    originalConsole.debug.apply(console, args);
  }
};

// Модуль для экспорта
window.DebugModule = {
  // Включить/выключить отладочные логи
  setDebugMode: function(enabled) {
    _isDebugEnabled = !!enabled;
    console.log(`[Debug] Режим отладки ${_isDebugEnabled ? 'включен' : 'выключен'}`);
    return _isDebugEnabled;
  },
  
  // Получить текущее состояние режима отладки
  isDebugEnabled: function() {
    return _isDebugEnabled;
  },
  
  // Сокращенная функция для установки режима true/false
  test: function(enabled) {
    return this.setDebugMode(enabled);
  }
}; 