# Публикация Europe Map 1230 в Telegram Mini App

## 1. Требования

- Приложение уже задеплоено на GitHub Pages: `https://timgrid.github.io/europe-map-1230/`
- Telegram-бот (через @BotFather) — нужен только для привязки Mini App (бот не обязан быть функциональным)
- Всё работает через `window.Telegram.WebApp` API — код уже в проекте

## 2. Регистрация бота и Mini App

1. Открой @BotFather в Telegram.
2. `/newbot` → следуй инструкциям, получи токен бота.
3. `/mybots` → выбери созданного бота → **Bot Settings** → **Menu Button** → **Configure mini app button** → введи URL:
   ```
   https://timgrid.github.io/europe-map-1230/
   ```
4. Либо (рекомендуется для Mini App с кнопкой Launch):
   - `/newapp` → выбери бота → введи название `Europe Map 1230` → краткое описание → загрузи иконку (256×256) → введи URL:
     ```
     https://timgrid.github.io/europe-map-1230/
     ```
   - Укажи короткое имя (short name) для ссылки вида `https://t.me/yourappname`.
   - Выбери категорию **Education** или **Entertainment**.

## 3. Режимы запуска

После регистрации пользователи откроют карту одним из способов:

- **Через кнопку Menu** бота — Mini App открывается в Telegram WebView.
- **Через inline-ссылку** `https://t.me/your_bot/your_app` — работает как обычная ссылка.
- **Через сслыку прикрепления** — бот может отправлять кнопку `Launch` с URL Mini App.

## 4. Что поддерживается

- **Авто-определение Telegram** — приложение само определяет, что оно внутри Telegram WebView.
- **Тема Telegram** — UI автоматически подстраивается под светлую/тёмную тему Telegram (через `themeParams`).
- **Back Button** — при выборе страны в Telegram появляется кнопка «Назад» для снятия выделения.
- **Haptic Feedback** — тактильный отклик при переключении годов (если будет добавлен).
- **Expand** — приложение автоматически разворачивается на весь экран.

## 5. Ограничения Telegram Mini App

| Особенность | Влияние |
|---|---|
| **WebView** — не все Web API работают (например, некоторые storage API) | Наш проект не использует локальное хранилище — OK |
| **URL** — должен быть HTTPS | ✅ GitHub Pages |
| **CSP** — Telegram добавляет Content-Security-Policy | Нужно проверить, не блокирует ли загрузку JSON с того же origin |
| **Safe areas** — Telegram имеет свой header (зависит от платформы) | Код уже использует `env(safe-area-inset-*)` |
| **Размер** — Telegram Mini App не имеет строгого лимита, но тяжёлые страницы грузятся дольше | Bundle ~370KB gzip — приемлемо |

## 6. Проверка в Telegram

Перед публикацией:

```
https://t.me/your_bot/your_app
```

Открой на iOS и Android — проверь:
- Загрузка и отображение карты
- Панорамирование/зум
- Выбор страны → Back Button
- Переключение годов
- Светлая и тёмная тема Telegram
- Закрытие Mini App (кнопка закрытия в Telegram)

## 7. Обновление

Любой push в `master` → GitHub Actions деплоит новую версию на GitHub Pages. Telegram Mini App подхватывает изменения автоматически (без переустановки).

## 8. Полезные ссылки

- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [@BotFather](https://t.me/BotFather)
- [Telegram Web App Example](https://core.telegram.org/bots/webapps#testing-a-web-app)
