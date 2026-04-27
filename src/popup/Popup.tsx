import React, { useState, useEffect } from 'react';
import { ExtensionSettings, RedirectStats, RedirectHistoryItem } from '../types';
import { Icons } from '../components/Icons';

const Popup: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [stats, setStats] = useState<RedirectStats | null>(null);
  const [history, setHistory] = useState<RedirectHistoryItem[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    loadStatus();
    const messageListener = (message: { type: string }) => {
      if (message.type === 'REDIRECT_PERFORMED') {
        loadStatus();
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      setSettings(response.settings);
      setStats(response.stats);
      setHistory(response.recentHistory || []);
      setIsEnabled(response.settings?.enabled ?? true);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const toggleEnabled = async () => {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: { enabled: !isEnabled },
    });
    setIsEnabled(!isEnabled);
  };

  const handleResetStats = async () => {
    if (!confirm('Сбросить статистику?')) return;
    await chrome.runtime.sendMessage({ type: 'RESET_STATS' });
    loadStatus();
  };

  const handleClearHistory = async () => {
    if (!confirm('Очистить историю?')) return;
    await chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' });
    loadStatus();
  };

  const formatTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}м`;
    return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const shortenUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.length > 30 ? urlObj.pathname.substring(0, 30) + '...' : urlObj.pathname;
      return urlObj.hostname + path;
    } catch {
      return url.length > 40 ? url.substring(0, 40) + '...' : url;
    }
  };

  if (!settings || !stats) {
    return (
      <div className="popup-container">
        <div className="empty-state" style={{ margin: '20px', border: 'none' }}>
          <div className="empty-state-icon">⏳</div>
          <div>Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="popup-header">
        <div className="header-title">
          <Icons.Refresh size={20} className="header-icon" />
          <span>JetBrains Redirector</span>
        </div>
        <label className="toggle-switch" title={isEnabled ? 'Включено' : 'Выключено'}>
          <input 
            type="checkbox" 
            checked={isEnabled} 
            onChange={toggleEnabled}
            aria-label="Включить расширение"
          />
          <span className="toggle-slider"></span>
        </label>
      </header>

      {/* Stats - Bento Grid */}
      <section className="stats-section">
        <div className="stat-card">
          <div className="stat-value">{stats.totalRedirects}</div>
          <div className="stat-label">Всего</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.todayRedirects}</div>
          <div className="stat-label">Сегодня</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Object.keys(stats.redirectsByRule).length}</div>
          <div className="stat-label">Правила</div>
        </div>
      </section>

      {/* History */}
      <section className="history-section">
        <div className="section-title">Последние редиректы</div>
        {history.length === 0 ? (
          <div className="empty-state">
            <Icons.Inbox size={32} className="empty-state-icon" />
            <div>История пуста</div>
          </div>
        ) : (
          <ul className="history-list">
            {history.slice(0, 5).map((item, index) => (
              <li key={item.id} className="history-item" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="history-header">
                  <span className="history-rule">
                    {settings.rules.find(r => r.id === item.ruleId)?.name.split('→')[0].trim() || `Rule #${item.ruleId}`}
                  </span>
                  <span className="history-time">{formatTime(item.timestamp)}</span>
                </div>
                <div className="history-url">
                  <div className="history-original">{shortenUrl(item.originalUrl)}</div>
                  <div className="history-redirect">{shortenUrl(item.redirectedUrl)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer */}
      <footer className="popup-footer">
        <div className="footer-actions">
          <button 
            className="btn" 
            onClick={handleResetStats}
            title="Сбросить всю статистику"
          >
            Сброс
          </button>
          <button 
            className="btn btn-danger" 
            onClick={handleClearHistory}
            title="Очистить историю редиректов"
          >
            Очистить
          </button>
        </div>
        <a 
          href="options.html" 
          className="settings-link" 
          target="_blank"
          rel="noopener noreferrer"
          title="Открыть настройки"
        >
          Настройки <Icons.Settings size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </a>
      </footer>

      {/* Copyright Footer */}
      <div className="copyright-footer">
        <span>© {new Date().getFullYear()} TM Project</span>
        <a href="mailto:tm-project@asdev.ru" className="copyright-email">tm-project@asdev.ru</a>
      </div>
    </div>
  );
};

export default Popup;
