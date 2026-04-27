/**
 * Утилита для toast-уведомлений
 */

import { ToastNotification } from '../types';

const TOAST_CONTAINER_ID = 'jb-redirector-toast-container';
const DEFAULT_DURATION = 2000;

/**
 * Создаёт контейнер для toast-уведомлений если его нет
 */
function getToastContainer(): HTMLElement {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }
  
  return container;
}

/**
 * Показывает toast-уведомление
 */
export function showToast(
  message: string,
  type: ToastNotification['type'] = 'info',
  duration: number = DEFAULT_DURATION
): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const container = getToastContainer();
  
  const toast = document.createElement('div');
  toast.id = id;
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: ${getBackgroundColor(type)};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    max-width: 400px;
    pointer-events: auto;
    animation: slideIn 0.3s ease-out;
    cursor: pointer;
  `;
  
  // Иконка
  const icon = document.createElement('span');
  icon.textContent = getIcon(type);
  icon.style.fontSize = '18px';
  
  // Текст
  const text = document.createElement('span');
  text.textContent = message;
  text.style.flex = '1';
  
  toast.appendChild(icon);
  toast.appendChild(text);
  
  // Клик для закрытия
  toast.addEventListener('click', () => hideToast(id));
  
  container.appendChild(toast);
  
  // Автоматическое скрытие
  setTimeout(() => hideToast(id), duration);
  
  return id;
}

/**
 * Скрывает toast-уведомление
 */
export function hideToast(id: string): void {
  const toast = document.getElementById(id);
  if (!toast) return;
  
  toast.style.animation = 'slideOut 0.3s ease-in';
  setTimeout(() => toast.remove(), 300);
}

/**
 * Скрывает все toast-уведомления
 */
export function hideAllToasts(): void {
  const container = document.getElementById(TOAST_CONTAINER_ID);
  if (container) {
    container.innerHTML = '';
  }
}

/**
 * Цвет фона для типа уведомления
 */
function getBackgroundColor(type: ToastNotification['type']): string {
  const colors: Record<ToastNotification['type'], string> = {
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
  };
  return colors[type];
}

/**
 * Иконка для типа уведомления
 */
function getIcon(type: ToastNotification['type']): string {
  const icons: Record<ToastNotification['type'], string> = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };
  return icons[type];
}

/**
 * Добавляет CSS анимации для toast
 */
export function injectToastStyles(): void {
  if (document.getElementById('jb-redirector-toast-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'jb-redirector-toast-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
