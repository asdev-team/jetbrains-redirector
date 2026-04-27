# JetBrains URL Redirector

Chrome Extension для автоматического обхода блокировок при загрузке плагинов и дистрибутивов JetBrains через зеркальные серверы.

| Параметр | Значение |
|----------|----------|
| **Версия** | 3.0.1 |
| **Минимальная версия Chrome** | 88+ |
| **Репозиторий** | [GitHub](https://github.com/asdev-team/jetbrains-redirector) |
| **Лицензия** | MIT |

---

## Что делает расширение

Автоматически перенаправляет ссылки с основных серверов JetBrains на зеркальные:

- `plugins.jetbrains.com/files/*` → `downloads.marketplace.jetbrains.com`
- `download.jetbrains.com/*` → `download-cdn.jetbrains.com`

Редирект происходит незаметно — пользователь продолжает работать в привычном интерфейсе JetBrains IDE и Marketplace.

---

## Возможности

- **Автоматические редиректы** — перенаправление без вмешательства пользователя
- **Статистика** — панель с количеством редиректов и историей
- **White List** — исключения для выбранных доменов
- **Гибкие правила** — управление правилами редиректа через страницу настроек
- **Уведомления** — всплывающие уведомления при выполнении редиректа (можно отключить)
- **Экспорт/импорт** — сохранение и восстановление настроек
- **Автообновление** — автоматическое обновление до последней версии

---

## Установка

### Из GitHub Releases (рекомендуется)

1. Скачайте файл `.crx` с [последнего релиза](https://github.com/asdev-team/jetbrains-redirector/releases/latest)
2. Откройте `chrome://extensions/`
3. Включите **«Режим разработчика»**
4. Перетащите `.crx` файл в окно браузера

### Из исходного кода

1. Скачайте `.zip` с [последнего релиза](https://github.com/asdev-team/jetbrains-redirector/releases/latest) и распакуйте
2. Откройте `chrome://extensions/`
3. Включите **«Режим разработчика»**
4. Нажмите **«Загрузить распакованное расширение»** и выберите папку `dist/`

---

## Структура проекта

```
jetbrains-redirector/
├── .github/workflows/       # CI/CD: сборка и релизы
├── docs/                    # Промо-страница и updates.xml
├── public/
│   ├── manifest.json        # Manifest V3 конфигурация
│   └── icons/
├── scripts/                 # Скрипты сборки и упаковки
├── src/
│   ├── background/          # Service Worker (логика редиректов)
│   ├── content/             # Content Script
│   ├── options/             # Страница настроек (React)
│   ├── popup/               # Popup окно (React)
│   ├── types/               # TypeScript типы
│   └── utils/               # Утилиты: storage, url-matcher, helpers
├── Makefile
└── package.json
```

---

## Troubleshooting

**Расширение не работает**
Откройте `chrome://extensions/`, найдите JetBrains Redirector и убедитесь, что toggle включён.

**Редиректы перестали работать после простоя**
Это нормальное поведение MV3 Service Worker — он перезапускается автоматически. Достаточно снова открыть ссылку.

**Уведомления не отображаются**
Проверьте, что уведомления включены в настройках расширения (иконка → Настройки → Общие).

**Редиректы не сохраняются в историю**
Перезагрузите расширение через `chrome://extensions/` → кнопка обновления.

---

## Вклад в проект

1. Сделайте **Fork** репозитория
2. Создайте ветку для фичи: `git checkout -b feature/my-feature`
3. Закоммитьте изменения: `git commit -m 'feat: описание'`
4. Запушьте ветку: `git push origin feature/my-feature`
5. Откройте **Pull Request**

Используем [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

---

## Лицензия

**MIT License** © 2026 TM Project

---

## Контакты

- **GitHub:** [asdev-team/jetbrains-redirector](https://github.com/asdev-team/jetbrains-redirector)
- **Issues:** [GitHub Issues](https://github.com/asdev-team/jetbrains-redirector/issues)
- **Промо-страница:** [asdev-team.github.io/jetbrains-redirector](https://asdev-team.github.io/jetbrains-redirector/)
- **Email:** tm-project@asdev.ru

---

*Не является официальным продуктом JetBrains s.r.o.*
