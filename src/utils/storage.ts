/**
 * Утилиты для работы с chrome.storage
 */

import { ExtensionSettings, RedirectStats, RedirectHistoryItem, DEFAULT_SETTINGS, DEFAULT_STATS } from '../types';

const SETTINGS_KEY = 'settings';
const STATS_KEY = 'stats';
const HISTORY_KEY = 'history';

/**
 * Загружает настройки расширения
 */
export async function loadSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([SETTINGS_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[Storage] Failed to load settings:', chrome.runtime.lastError);
        resolve(DEFAULT_SETTINGS);
        return;
      }
      const settings = result[SETTINGS_KEY] as ExtensionSettings | undefined;
      resolve(settings ? mergeWithDefaults(settings) : DEFAULT_SETTINGS);
    });
  });
}

/**
 * Сохраняет настройки расширения
 */
export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [SETTINGS_KEY]: settings }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Storage] Failed to save settings:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

/**
 * Загружает статистику редиректов
 */
export async function loadStats(): Promise<RedirectStats> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STATS_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[Storage] Failed to load stats:', chrome.runtime.lastError);
        resolve(DEFAULT_STATS);
        return;
      }
      const stats = result[STATS_KEY] as RedirectStats | undefined;

      // Проверяем, новый ли день для сброса daily счётчика
      if (stats && stats.lastRedirectTimestamp) {
        const lastDate = new Date(stats.lastRedirectTimestamp);
        const today = new Date();

        if (lastDate.toDateString() !== today.toDateString()) {
          stats.todayRedirects = 0;
        }
      }

      resolve(stats || DEFAULT_STATS);
    });
  });
}

/**
 * Сохраняет статистику редиректов
 */
export async function saveStats(stats: RedirectStats): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STATS_KEY]: stats }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Storage] Failed to save stats:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

/**
 * Обновляет статистику после редиректа
 */
export async function incrementRedirectStats(ruleId: number): Promise<RedirectStats> {
  const stats = await loadStats();
  const today = new Date().toDateString();
  const lastRedirectDate = stats.lastRedirectTimestamp 
    ? new Date(stats.lastRedirectTimestamp).toDateString() 
    : null;
  
  stats.totalRedirects++;
  stats.redirectsByRule[ruleId] = (stats.redirectsByRule[ruleId] || 0) + 1;
  stats.lastRedirectTimestamp = Date.now();
  
  // Сбрасываем счётчик сегодня если новый день
  if (today !== lastRedirectDate) {
    stats.todayRedirects = 1;
  } else {
    stats.todayRedirects++;
  }
  
  await saveStats(stats);
  return stats;
}

/**
 * Загружает историю редиректов
 */
export async function loadHistory(limit?: number): Promise<RedirectHistoryItem[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([HISTORY_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[Storage] Failed to load history:', chrome.runtime.lastError);
        resolve([]);
        return;
      }
      let history = result[HISTORY_KEY] as RedirectHistoryItem[] | undefined;
      history = history || [];

      if (limit !== undefined && history.length > limit) {
        history = history.slice(0, limit);
      }

      resolve(history);
    });
  });
}

/**
 * Добавляет запись в историю редиректов
 */
export async function addToHistory(
  originalUrl: string,
  redirectedUrl: string,
  ruleId: number
): Promise<void> {
  const settings = await loadSettings();
  const history = await loadHistory();

  const newItem: RedirectHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    originalUrl,
    redirectedUrl,
    ruleId,
  };

  // Добавляем в начало и ограничиваем размер
  history.unshift(newItem);
  if (history.length > settings.maxHistoryItems) {
    history.pop();
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [HISTORY_KEY]: history }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Storage] Failed to add to history:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

/**
 * Очищает историю редиректов
 */
export async function clearHistory(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([HISTORY_KEY], () => {
      if (chrome.runtime.lastError) {
        console.error('[Storage] Failed to clear history:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

/**
 * Сбрасывает статистику
 */
export async function resetStats(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STATS_KEY]: DEFAULT_STATS }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Storage] Failed to reset stats:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

/**
 * Объединяет загруженные настройки с дефолтными (для миграции)
 */
function mergeWithDefaults(settings: Partial<ExtensionSettings>): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    rules: settings.rules?.length ? settings.rules : DEFAULT_SETTINGS.rules,
  };
}

/**
 * Подписывается на изменения настроек
 */
export function onSettingsChanged(
  callback: (settings: ExtensionSettings) => void
): void {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes[SETTINGS_KEY]) {
      const newSettings = changes[SETTINGS_KEY].newValue as ExtensionSettings;
      callback(mergeWithDefaults(newSettings));
    }
  });
}
