/**
 * Утилиты для расширения
 */

/**
 * Логирование с поддержкой DEBUG режима
 */
export function debugLog(...args: unknown[]): void {
  // Проверяем наличие флага DEBUG в localStorage (для popup/options)
  // или в chrome.storage (для service worker)
  const isDebug = typeof window !== 'undefined'
    ? localStorage.getItem('jb_redirector_debug') === 'true'
    : true; // В service worker проверяем через settings

  if (isDebug) {
    console.log('[JB Redirector]', ...args);
  }
}

/**
 * Сокращает URL для отображения
 */
export function shortenUrl(url: string, maxLength: number = 50): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.length > 30
      ? urlObj.pathname.substring(0, 30) + '...'
      : urlObj.pathname;
    const full = urlObj.origin + path + urlObj.search;
    return full.length > maxLength ? full.substring(0, maxLength) + '...' : full;
  } catch {
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  }
}

/**
 * Форматирует дату в относительном формате
 */
export function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Только что';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Debounce функция - задерживает вызов пока не пройдёт указанное время
 * @param func Функция для вызова
 * @param wait Время задержки в мс
 * @returns Обёрнутая функция
 */
export function debounce<T extends (...args: Parameters<T>) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle функция - ограничивает вызовы до раза в указанное время
 * @param func Функция для вызова
 * @param limit Минимальный интервал между вызовами в мс
 * @returns Обёрнутая функция
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
