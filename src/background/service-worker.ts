/**
 * Background Service Worker для JetBrains URL Redirector
 * Обрабатывает перехват и редирект URL через declarativeNetRequest и webNavigation
 */

import { loadSettings, saveSettings, incrementRedirectStats, addToHistory, loadStats, loadHistory, resetStats, clearHistory } from '../utils/storage';
import { transformUrl, isAlreadyRedirected, isWhitelisted, findMatchingRule } from '../utils/url-matcher';
import { ExtensionSettings, RedirectRule } from '../types';

let currentSettings: ExtensionSettings | null = null;

function swDebug(...args: unknown[]): void {
  if (currentSettings?.debugMode) {
    console.log('[JB Redirector]', ...args);
  }
}

/**
 * Инициализация расширения при установке/обновлении
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  currentSettings = await loadSettings();
  await updateDeclarativeRules(currentSettings.rules);
  swDebug('Extension installed/updated:', details.reason);
});

/**
 * Обновление правил declarativeNetRequest
 */
async function updateDeclarativeRules(rules: RedirectRule[]): Promise<void> {
  const activeRules = rules.filter(r => r.enabled);
  
  // Упрощённая реализация через regexFilter
  const redirectRules = activeRules.map((rule) => {
    // Преобразуем паттерн для regexFilter
    const regexFilter = rule.sourcePattern
      .replace('^https?://', '^https?://[^/]+')
      .replace(/\\\./g, '\\.')
      .replace(/\*/g, '.*') + '(.*)';
    
    return {
      id: rule.id,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT as const,
        redirect: {
          regexSubstitution: rule.targetPattern + '\\1',
        },
      },
      condition: {
        regexFilter,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          chrome.declarativeNetRequest.ResourceType.OTHER,
        ],
      },
    };
  });

  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRules.map(r => r.id),
      addRules: redirectRules,
    });
    swDebug('Declarative rules updated:', redirectRules.length);
  } catch (error) {
    console.error('[JB Redirector] Failed to update declarative rules:', error);
  }
}

/**
 * Обработка навигации через webNavigation
 */
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Обрабатываем только основные фреймы
  if (details.frameId !== 0) return;

  // Проверяем что навигация ещё не была обработана через webRequest
  const tabPending = pendingRedirects.get(details.tabId);
  if (tabPending?.has(details.url)) {
    swDebug('Navigation already handled via webRequest:', details.url);
    return;
  }

  await processRequest(details.url, details.tabId);
});

/**
 * Обработка навигации через webRequest (более надёжный способ)
 */
chrome.webRequest?.onBeforeRequest?.addListener((details) => {
  if (currentSettings !== null && !currentSettings.enabled) return { cancel: false };

  // Запускаем обработку в фоне
  processRequest(details.url, details.tabId).then((redirected) => {
    if (redirected) {
      // Запоминаем что этот URL был обработан
      if (!pendingRedirects.has(details.tabId)) {
        pendingRedirects.set(details.tabId, new Set());
      }
      pendingRedirects.get(details.tabId)!.add(details.url);
      
      // Очищаем через 2 секунды
      setTimeout(() => {
        pendingRedirects.get(details.tabId)?.delete(details.url);
      }, 2000);
    }
  });

  // Не блокируем запрос - редирект выполняется через tabs.update
  return { cancel: false };
}, {
  urls: [
    'https://plugins.jetbrains.com/files/*',
    'https://download.jetbrains.com/*',
  ],
  types: ['main_frame', 'sub_frame'],
});

/**
 * Обработка запроса через webRequest
 * Возвращает true если редирект был выполнен
 */
async function processRequest(url: string, tabId: number): Promise<boolean> {
  if (!currentSettings) {
    currentSettings = await loadSettings();
  }
  if (!currentSettings.enabled) return false;

  if (isAlreadyRedirected(url)) {
    swDebug('URL already redirected:', url);
    return false;
  }

  if (isWhitelisted(url, currentSettings.whitelist)) {
    swDebug('URL whitelisted:', url);
    return false;
  }

  const rule = findMatchingRule(url, currentSettings.rules);
  if (!rule) return false;

  const redirectedUrl = transformUrl(url, rule);
  if (!redirectedUrl) return false;

  swDebug('Redirecting:', url, '->', redirectedUrl);

  // Выполняем редирект через tabs.update
  try {
    await chrome.tabs.update(tabId, { url: redirectedUrl });

    // Обновляем статистику и историю
    await incrementRedirectStats(rule.id);
    await addToHistory(url, redirectedUrl, rule.id);

    // Показываем уведомление
    if (currentSettings.showNotifications) {
      await showRedirectNotification(url, redirectedUrl, rule.name);
    }

    // Отправляем сообщение в popup
    chrome.runtime.sendMessage({
      type: 'REDIRECT_PERFORMED',
      payload: {
        originalUrl: url,
        redirectedUrl,
        ruleName: rule.name,
        timestamp: Date.now(),
      },
    }).catch(() => {});

    return true;
  } catch (error) {
    console.error('[JB Redirector] Redirect failed:', error);
    return false;
  }
}

// Отслеживание pending редиректов для предотвращения дублирования
const pendingRedirects = new Map<number, Set<string>>();

/**
 * Показ уведомления о редиректе
 */
async function showRedirectNotification(
  originalUrl: string,
  redirectedUrl: string,
  ruleName: string
): Promise<void> {
  const notificationId = `redirect-${Date.now()}`;
  
  try {
    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'JetBrains Redirector',
      message: `URL редирект через: ${ruleName}`,
      contextMessage: shortenUrl(originalUrl) + ' → ' + shortenUrl(redirectedUrl),
      requireInteraction: false,
    });

    // Автоматически закрываем через 2 секунды
    setTimeout(() => {
      chrome.notifications.clear(notificationId, () => {});
    }, currentSettings?.notificationDuration || 2000);
  } catch (error) {
    console.error('[JB Redirector] Notification failed:', error);
  }
}

/**
 * Сокращает URL для отображения
 */
function shortenUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.length > 30 
      ? urlObj.pathname.substring(0, 30) + '...' 
      : urlObj.pathname;
    return urlObj.origin + path + urlObj.search;
  } catch {
    return url.length > 50 ? url.substring(0, 50) + '...' : url;
  }
}

/**
 * Обработка сообщений от popup/options
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  swDebug('Message received:', message.type);
  
  switch (message.type) {
    case 'GET_STATUS':
      loadStatus().then(sendResponse);
      return true; // Асинхронный ответ
    
    case 'RESET_STATS':
      resetAllStats().then(() => sendResponse({ success: true }));
      return true;
    
    case 'CLEAR_HISTORY':
      clearAllHistory().then(() => sendResponse({ success: true }));
      return true;
    
    case 'UPDATE_SETTINGS':
      updateRuntimeSettings(message.payload).then(sendResponse);
      return true;
    
    default:
      console.warn('[JB Redirector] Unknown message type:', message.type);
  }
});

/**
 * Загружает полный статус расширения
 */
async function loadStatus() {
  const [settings, stats, history] = await Promise.all([
    loadSettings(),
    loadStats(),
    loadHistory(10),
  ]);

  return { settings, stats, recentHistory: history };
}

/**
 * Сброс всей статистики
 */
async function resetAllStats(): Promise<void> {
  await resetStats();
}

/**
 * Очистка всей истории
 */
async function clearAllHistory(): Promise<void> {
  await clearHistory();
}

/**
 * Обновление настроек во время выполнения
 */
async function updateRuntimeSettings(newSettings: Partial<ExtensionSettings>): Promise<{ success: boolean }> {
  if (!currentSettings) {
    currentSettings = await loadSettings();
  }
  
  const updatedSettings = { ...currentSettings, ...newSettings };
  await saveSettings(updatedSettings);
  currentSettings = updatedSettings;
  
  // Если изменились правила, обновляем declarativeNetRequest
  if (newSettings.rules) {
    await updateDeclarativeRules(updatedSettings.rules);
  }
  
  return { success: true };
}

swDebug('Service Worker loaded');
