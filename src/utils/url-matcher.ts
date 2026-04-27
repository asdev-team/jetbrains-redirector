/**
 * Утилиты для работы с URL и проверки соответствия правилам редиректа
 */

import { RedirectRule } from '../types';

/**
 * Проверяет, соответствует ли URL шаблону правила
 */
export function matchesPattern(url: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern);
    return regex.test(url);
  } catch (error) {
    console.error(`Invalid pattern "${pattern}":`, error);
    return false;
  }
}

/**
 * Преобразует URL согласно правилу редиректа
 * @param url Исходный URL
 * @param rule Правило редиректа
 * @returns Преобразованный URL или null если не подходит
 */
export function transformUrl(url: string, rule: RedirectRule): string | null {
  if (!rule.enabled) return null;

  try {
    const urlObj = new URL(url);
    
    // Проверяем соответствие шаблону
    if (!matchesPattern(url, rule.sourcePattern)) {
      return null;
    }

    // БЕЗОПАСНОЕ преобразование через URL API вместо конкатенации строк
    // Извлекаем базовый URL из targetPattern (до первого вхождения паттерна пути)
    const targetBaseUrl = rule.targetPattern.split('(')[0].replace(/\\$/, '');
    const targetUrlObj = new URL(targetBaseUrl);
    
    // Копируем путь, параметры и фрагмент из исходного URL
    targetUrlObj.pathname = urlObj.pathname;
    targetUrlObj.search = urlObj.search;
    targetUrlObj.hash = urlObj.hash;
    
    return targetUrlObj.href;
  } catch (error) {
    console.error(`Failed to transform URL "${url}":`, error);
    return null;
  }
}

/**
 * Проверяет, является ли URL уже редирекнутым (защита от цикла)
 */
export function isAlreadyRedirected(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Проверяем целевые домены (все возможные)
    const targetDomains = [
      'downloads.marketplace.jetbrains.com',
      'download-cdn.jetbrains.com',
      'download.jetbrains.com',  // Добавлено для защиты от цикла
    ];
    
    return targetDomains.some(domain => hostname === domain);
  } catch {
    return false;
  }
}

/**
 * Проверяет, находится ли URL в whitelist
 */
export function isWhitelisted(url: string, whitelist: string[]): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return whitelist.some(pattern => {
      // Точное совпадение
      if (pattern === hostname) return true;
      
      // Wildcard паттерн (*.example.com)
      if (pattern.startsWith('*.')) {
        const domainSuffix = pattern.slice(1);
        return hostname.endsWith(domainSuffix);
      }
      
      // Regex паттерн
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        try {
          const regex = new RegExp(pattern.slice(1, -1));
          return regex.test(hostname);
        } catch {
          return false;
        }
      }
      
      return false;
    });
  } catch {
    return false;
  }
}

/**
 * Находит первое подходящее правило для URL
 */
export function findMatchingRule(
  url: string,
  rules: RedirectRule[]
): RedirectRule | null {
  for (const rule of rules) {
    if (rule.enabled && matchesPattern(url, rule.sourcePattern)) {
      return rule;
    }
  }
  return null;
}

/**
 * Извлекает домен из URL
 */
export function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Нормализует URL (удаляет лишние слеши, пробелы и т.д.)
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url.trim());
    return urlObj.href;
  } catch {
    return url;
  }
}
