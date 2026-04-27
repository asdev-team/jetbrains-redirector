import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExtensionSettings, DEFAULT_SETTINGS } from '../types';
import { Icons } from '../components/Icons';
import { debounce } from '../utils/helpers';

const Options: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [newWhitelistItem, setNewWhitelistItem] = useState('');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);
  const [notificationDuration, setNotificationDuration] = useState<number>(2000);
  const [activeTab, setActiveTab] = useState<string>('general');
  
  // Ref для debounced функции сохранения
  const debouncedSaveRef = useRef<((duration: number) => void) | null>(null);
  
  useEffect(() => {
    debouncedSaveRef.current = debounce((duration: number) => {
      if (settings) {
        saveSettings({ ...settings, notificationDuration: duration });
      }
    }, 500); // 500ms debounce
  }, [settings]);

  useEffect(() => {
    loadSettings();
  }, []);

  // Обновляем локальное состояние длительности при загрузке настроек
  useEffect(() => {
    if (settings) {
      setNotificationDuration(settings.notificationDuration);
    }
  }, [settings]);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      setSettings(response.settings);
    } catch (error) {
      showToast('Не удалось загрузить настройки', 'error');
    }
  };

  const saveSettings = async (newSettings: ExtensionSettings) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: newSettings,
      });
      setSettings(newSettings);
      showToast('Сохранено', 'success');
    } catch (error) {
      showToast('Ошибка сохранения', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const handleToggleChange = (key: keyof ExtensionSettings, value: unknown) => {
    if (!settings) return;
    saveSettings({ ...settings, [key]: value });
  };

  const handleAddWhitelistItem = () => {
    if (!settings || !newWhitelistItem.trim()) return;
    const domain = newWhitelistItem.trim().toLowerCase();
    if (settings.whitelist.includes(domain)) {
      showToast('Уже в списке', 'error');
      return;
    }
    saveSettings({ ...settings, whitelist: [...settings.whitelist, domain] });
    setNewWhitelistItem('');
  };

  const handleRemoveWhitelistItem = (domain: string) => {
    if (!settings) return;
    saveSettings({ ...settings, whitelist: settings.whitelist.filter((d) => d !== domain) });
  };

  const handleToggleRule = (ruleId: number) => {
    if (!settings) return;
    saveSettings({
      ...settings,
      rules: settings.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      ),
    });
  };

  const handleExportSettings = () => {
    if (!settings) return;
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jb-redirector-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Экспортировано', 'success');
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as ExtensionSettings;
        if (!imported.rules || !Array.isArray(imported.whitelist)) throw new Error('Invalid');
        saveSettings(imported);
      } catch {
        showToast('Неверный формат', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleResetToDefaults = () => {
    if (!confirm('Сбросить настройки?')) return;
    saveSettings(DEFAULT_SETTINGS);
  };

  if (!settings) {
    return (
      <div className="options-container">
        <div className="empty-state">Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="options-header">
        <div className="header-icon">
          <Icons.Settings size={24} />
        </div>
        <div>
          <h1 className="header-title">Настройки</h1>
          <p className="header-subtitle">JetBrains URL Redirector</p>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="tabs-navigation">
        <button 
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <Icons.Tools size={18} />
          <span>Общие</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'whitelist' ? 'active' : ''}`}
          onClick={() => setActiveTab('whitelist')}
        >
          <Icons.Check size={18} />
          <span>White List</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <Icons.Scroll size={18} />
          <span>Правила</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          <Icons.Database size={18} />
          <span>Данные</span>
        </button>
      </nav>

      {/* Tab Content */}
      <div className="tab-content">
        {/* General Tab */}
        {activeTab === 'general' && (
          <section className="section">
            <div className="section-header">
              <Icons.Tools size={18} className="section-icon" />
              <h2 className="section-title">Общие настройки</h2>
            </div>

        <div className="toggle-row">
          <div className="toggle-label">
            <div className="toggle-title">Включить расширение</div>
            <div className="toggle-description">Глобальное включение/выключение всех редиректов</div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleToggleChange('enabled', e.target.checked)}
              aria-label="Включить расширение"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="toggle-row">
          <div className="toggle-label">
            <div className="toggle-title">Уведомления</div>
            <div className="toggle-description">Всплывающие уведомления при выполнении редиректа</div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.showNotifications}
              onChange={(e) => handleToggleChange('showNotifications', e.target.checked)}
              aria-label="Показывать уведомления"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.showNotifications && (
          <div className="toggle-row">
            <div className="toggle-label">
              <div className="toggle-title">Длительность уведомлений</div>
              <div className="toggle-description">Время отображения уведомления</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="range-container">
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={notificationDuration}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setNotificationDuration(value);
                    if (debouncedSaveRef.current) {
                      debouncedSaveRef.current(value);
                    }
                  }}
                  className="range-slider"
                  aria-label="Длительность уведомлений"
                />
                <span className="range-value">{(notificationDuration / 1000).toFixed(1)}с</span>
              </div>
            </div>
          </div>
        )}
      </section>
        )}

        {/* Whitelist Tab */}
        {activeTab === 'whitelist' && (
          <section className="section">
            <div className="section-header">
              <Icons.Check size={18} className="section-icon" />
              <h2 className="section-title">White List</h2>
            </div>

        <div className="whitelist-container">
          <div className="whitelist-input-row">
            <input
              type="text"
              value={newWhitelistItem}
              onChange={(e) => setNewWhitelistItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddWhitelistItem()}
              placeholder="example.com или *.domain.com"
              className="text-input"
              aria-label="Домен для white list"
            />
            <button className="btn btn-primary" onClick={handleAddWhitelistItem}>
              Добавить
            </button>
          </div>

          {settings.whitelist.length === 0 ? (
            <div className="empty-state">White list пуст</div>
          ) : (
            <div className="whitelist-items">
              {settings.whitelist.map((domain) => (
                <div key={domain} className="whitelist-item">
                  <span className="whitelist-domain">{domain}</span>
                  <button 
                    className="btn-remove" 
                    onClick={() => handleRemoveWhitelistItem(domain)}
                    aria-label={`Удалить ${domain}`}
                  >
                    <Icons.X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <section className="section">
            <div className="section-header">
              <Icons.Scroll size={18} className="section-icon" />
              <h2 className="section-title">Правила редиректа</h2>
            </div>

        <div className="rules-list">
          {settings.rules.map((rule) => (
            <div key={rule.id} className="rule-card">
              <div className="rule-header">
                <span className="rule-name">{rule.name}</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggleRule(rule.id)}
                    aria-label={`Включить правило ${rule.name}`}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="rule-patterns">
                <div className="rule-pattern">
                  <span className="pattern-label">→</span>
                  <span className="pattern-value">{rule.sourcePattern.replace('^https?://', '').replace('/.*', '')}</span>
                </div>
                <div className="rule-pattern">
                  <span className="pattern-label">⇒</span>
                  <span className="pattern-value">{rule.targetPattern}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <section className="section">
            <div className="section-header">
              <Icons.Database size={18} className="section-icon" />
              <h2 className="section-title">Управление данными</h2>
            </div>

        <div className="data-section">
          <div className="data-card">
            <h4>Экспорт</h4>
            <p>Сохраните настройки в файл</p>
            <button className="btn btn-primary" onClick={handleExportSettings}>
              <Icons.Download size={16} /> Экспорт
            </button>
          </div>
          <div className="data-card">
            <h4>Импорт</h4>
            <p>Загрузите настройки из файла</p>
            <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: '0 auto' }}>
              <Icons.Upload size={16} /> Импорт
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportSettings} 
                style={{ display: 'none' }}
                aria-label="Импорт настроек из файла"
              />
            </label>
          </div>
        </div>

        <div className="actions-bar">
          <button className="btn btn-danger" onClick={handleResetToDefaults}>
            <Icons.Trash size={16} /> Сброс к умолчанию
          </button>
        </div>
      </section>
        )}
      </div>

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? (
              <Icons.CheckCircle size={18} />
            ) : (
              <Icons.XCircle size={18} />
            )}
            {toast.message}
          </div>
        ))}
      </div>

      {/* Copyright Footer */}
      <footer className="options-copyright">
        <span>© {new Date().getFullYear()} TM Project</span>
        <a href="mailto:tm-project@asdev.ru" className="copyright-email">tm-project@asdev.ru</a>
      </footer>
    </div>
  );
};

export default Options;
