/**
 * Content Script для перехвата кликов по ссылкам
 * Опционально: может использоваться для обработки динамических ссылок
 */

import { isAlreadyRedirected } from '@utils/url-matcher';

// Помечаем обработанные ссылки
const PROCESSED_ATTR = 'data-jb-redirector-processed';

/**
 * Инициализация content script
 */
function init(): void {
  console.log('[JB Redirector] Content script loaded');
  
  // Наблюдаем за изменениями DOM для обработки динамических ссылок
  observeDomChanges();
  
  // Обрабатываем существующие ссылки
  processExistingLinks();
}

/**
 * Обработка существующих ссылок на странице
 */
function processExistingLinks(): void {
  const links = document.querySelectorAll('a[href*="plugins.jetbrains.com/files"]');
  links.forEach((link) => processLink(link as HTMLAnchorElement));
}

/**
 * Обработка отдельной ссылки
 */
function processLink(link: HTMLAnchorElement): void {
  if (link.hasAttribute(PROCESSED_ATTR)) return;
  const href = link.href;
  if (!href || isAlreadyRedirected(href)) return;
  link.setAttribute(PROCESSED_ATTR, 'true');
}

/**
 * Наблюдение за изменениями DOM
 */
function observeDomChanges(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Обрабатываем добавленные ссылки
            if (node.tagName === 'A') {
              processLink(node as HTMLAnchorElement);
            }
            // Ищем ссылки внутри добавленных элементов
            const links = node.querySelectorAll('a[href*="plugins.jetbrains.com/files"]');
            links.forEach((link) => processLink(link as HTMLAnchorElement));
          }
        });
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
