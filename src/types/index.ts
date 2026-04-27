/**
 * Типы данных для расширения JetBrains URL Redirector
 */

export interface RedirectRule {
  id: number;
  name: string;
  sourcePattern: string;
  targetPattern: string;
  enabled: boolean;
}

export interface RedirectHistoryItem {
  id: string;
  timestamp: number;
  originalUrl: string;
  redirectedUrl: string;
  ruleId: number;
}

export interface ExtensionSettings {
  enabled: boolean;
  showNotifications: boolean;
  notificationDuration: number; // ms
  maxHistoryItems: number;
  debugMode: boolean; // Режим отладки с логированием
  whitelist: string[];
  rules: RedirectRule[];
}

export interface RedirectStats {
  totalRedirects: number;
  redirectsByRule: Record<number, number>;
  lastRedirectTimestamp: number | null;
  todayRedirects: number;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  showNotifications: true,
  notificationDuration: 2000,
  maxHistoryItems: 100,
  debugMode: false, // Логирование отключено по умолчанию
  whitelist: [],
  rules: [
    {
      id: 1,
      name: 'JetBrains Plugins → Downloads Marketplace',
      sourcePattern: '^https?://plugins\\.jetbrains\\.com/files/.*',
      targetPattern: 'https://downloads.marketplace.jetbrains.com/files',
      enabled: true,
    },
    {
      id: 2,
      name: 'JetBrains Download → Download CDN',
      sourcePattern: '^https?://download\\.jetbrains\\.com/.*',
      targetPattern: 'https://download-cdn.jetbrains.com',
      enabled: true,
    },
  ],
};

export const DEFAULT_STATS: RedirectStats = {
  totalRedirects: 0,
  redirectsByRule: {},
  lastRedirectTimestamp: null,
  todayRedirects: 0,
};
