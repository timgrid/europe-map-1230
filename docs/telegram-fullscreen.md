# Telegram Mini App: Fullscreen

Документация по fullscreen-режиму в `europe-map-1230` — что работает, какие
ограничения, как проверить.

## TL;DR

| Клиент | Fullscreen | Как проверить |
|---|---|---|
| **Telegram iOS 10.10+** | ✅ | Открыть Mini App → тап по карте |
| **Telegram Android 10.10+** | ✅ | То же |
| **Telegram macOS 10.10+** | ✅ | То же |
| **Telegram Desktop 4.0+** | ✅ | То же |
| **Web (t.me / webk)** | ✅ (SDK 8.0+) | То же |
| **Любой клиент < SDK 8.0** | ❌ | Будет надпись "Fullscreen недоступен" |

## Что произошло в Telegram (июнь 2025)

Telegram анонсировал [fullscreen для Mini Apps](https://telegram.org/blog/fullscreen-miniapps-and-more).
API стабилизировался в **WebApp SDK 8.0**:

```ts
// WebApp.requestFullscreen()   — войти в fullscreen
// WebApp.exitFullscreen()      — выйти
// WebApp.isFullscreen          — boolean, текущее состояние
// 'fullscreenChanged'          — событие
```

Подробнее: [StackOverflow ответ Konstantin Volkov](https://stackoverflow.com/a/79450675)
(хотя для простых кейсов можно обойтись без `@telegram-apps/sdk@2`).

## Требования SDK

Мы определяем минимально нужную версию константой `FULLSCREEN_MIN_SDK = 8.0`
в `src/utils/telegram.ts`. Если SDK старее — кнопка показывает
"Fullscreen недоступен" вместо активной.

Проверить версию своего клиента:
1. Открыть любую Mini App
2. В DevTools: `window.Telegram.WebApp.version`
3. Должно быть `8.0+`

## Как это работает у нас

1. **При загрузке** (`main.tsx` → `initTelegram`):
   - `tg.ready()`
   - `tg.expand()` — разворачиваем на максимальную высоту
   - `tg.enableClosingConfirmation()` — не закрывается свайпом
   - `tg.disableVerticalSwipes()` — иначе pan по 3D-карте закрывал бы Mini App

2. **При первом пользовательском жесте** (App.tsx, useEffect с `{ once: true }`):
   - `expand()` — на всякий случай
   - `requestFullscreen()` — если SDK ≥ 8.0

3. **Через кнопку** (`FullscreenButton.tsx`, `bottom-2 left-2`):
   - Если в fullscreen → `exitFullscreen()`
   - Иначе → `expand()` + `requestFullscreen()` (порядок важен!)

4. **Реактивно**:
   - Подписка на `fullscreenChanged` обновляет UI
   - Подписка на `activated` / `deactivated` ставит R3F на паузу (`frameloop="never"`)

## Важные ограничения

### 1. `requestFullscreen()` ТРЕБУЕТ user gesture
```ts
// ❌ Не сработает (вызов вне user gesture)
useEffect(() => { tg.requestFullscreen() }, [])

// ✅ Сработает (вызов из обработчика)
<button onClick={() => tg.requestFullscreen()}>
```

Поэтому у нас авто-вызов только в обработчиках
`pointerdown` / `keydown` (`{ once: true }`).

### 2. Всегда `expand()` перед `requestFullscreen()`
Если Mini App ещё не развёрнут, fullscreen работает некорректно.
Наша кнопка делает оба вызова в правильном порядке.

### 3. iOS Safari / WebKit
Telegram iOS использует WKWebView. `requestFullscreen()` для Mini Apps
работает, **но** Apple WebKit имеет свои полноэкранные жесты
(отдельный видео fullscreen через `<video controls>`).
Кнопка в TG должна работать; если нет — обновить iOS-клиент.

### 4. `disableVerticalSwipes()` обязательно для 3D-карты
Без этого pan по карте (touch gesture) интерпретируется Telegram как
свайп вниз → Mini App закрывается. Уже решено.

### 5. `enableClosingConfirmation()` для бесшовности
Если пользователь случайно свайпнёт — получит "Закрыть? Да/Отмена".
Не блокирует UX, но предотвращает потерю состояния.

## Диагностика

### В консоли браузера (DevTools):
```ts
// Проверить поддержку
const tg = window.Telegram.WebApp
console.log('SDK version:', tg.version)
console.log('isFullscreen:', tg.isFullscreen)
console.log('requestFullscreen:', typeof tg.requestFullscreen)
console.log('exitFullscreen:', typeof tg.exitFullscreen)
```

### В нашем приложении (dev mode):
В консоли сразу видно:
```
[TG] SDK 8.5 (parsed 8.5) | platform=ios | fullscreen=yes
```

### Расширенное логирование:
```ts
tg.onEvent('fullscreenChanged', () => {
  console.log('fullscreen changed →', tg.isFullscreen)
})
```

## Типичные проблемы

| Симптом | Причина | Фикс |
|---|---|---|
| Кнопка не появляется | Не в TG | Открыть через Telegram |
| Кнопка "Fullscreen недоступен" | SDK < 8.0 | Обновить Telegram |
| Тап не переводит в fullscreen | Старая версия | Обновить клиент |
| Fullscreen активируется, но канвас не меняется | viewport не resize | `tg.onEvent('viewportChanged')` → обновить R3F canvas |
| Прокрутка страницы во время pan по карте | Нет `disableVerticalSwipes` | Уже вызывается в `initTelegram` |
| Mini App закрывается при pan | То же | То же |

## Тесты

`tests/telegram.test.ts` — покрывает:
- `parseSDKVersion` — парсинг "7.10" / "8.0" / "abc" / undefined
- `isFullscreenSupported` — true для SDK 8.0+, false для 7.x, false без tg
- `isFullscreenSupported` — false если методы отсутствуют

Запуск: `npm test -- telegram`
