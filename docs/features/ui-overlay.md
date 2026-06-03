# UI Overlay

## Purpose

React-компоненты поверх 3D-сцены: навигация (селектор года, слои),
информация (тултип, боковая панель), статус (загрузка).

## Layout

```
┌────────────────────────────────────────┐
│ Title (top-left)       YearToggle      │
│                        LayerToggle     │
│                                         │
│             3D Canvas                   │
│                                         │
│           Tooltip (follows cursor)      │
│           SidePanel (right, collapsible)│
│                                         │
│ ControlsHint (bottom-left)              │
│              Scale (bottom-right)       │
│              ResetBtn (top-center)      │
└────────────────────────────────────────┘
```

## Components

### YearToggle

- **File**: `src/components/UI/YearToggle.tsx`
- **Position**: absolute, top-right, вертикальный список
- **Стиль**: dark glass (bg-slate-900/70 + backdrop-blur), border-slate-700
- **Данные**: `const years = [1200, 1279, 1300, 1400, 1492, 1500, 1530]`
- **Активный год**: amber-300 highlight
- **Ховер**: amber-200/50
- **Action**: `useMapStore.setYear(n)`

### LayerToggle

- **File**: `src/components/UI/LayerToggle.tsx`
- **Position**: top-right, под YearToggle
- **Кнопки**: `Unified` / `Principalities`
- **Стиль**: toggle-group с active/inactive
- **Action**: `useMapStore.setLayer('unified'|'principalities')`

### Tooltip

- **File**: `src/components/UI/Tooltip.tsx`
- **Position**: absolute, следует за курсором (clientX+15, clientY-20)
- **Показывается**: когда `hoveredCountry !== null`
- **Содержимое**: название страны (из countryMetadata), цвет-индикатор
- **Стиль**: bg-slate-900/90, border, текст amber-100
- **Анимация**: Framer Motion fade+scale

### SidePanel

- **File**: `src/components/UI/SidePanel.tsx`
- **Position**: fixed right, slide in/out
- **Показывается**: когда `selectedCountry !== null`
- **Содержимое**: герб/иконка (future), название, историческое описание
- **Данные**: `countryMetadata[id]`
- **Стиль**: bg-slate-900/90, backdrop-blur, border-l
- **Анимация**: Framer Motion slide from right (width 300px)
- **Кнопка закрыть**: ✕ в правом верхнем углу

### LoadingScreen

- **File**: `src/components/UI/LoadingScreen.tsx`
- **Показывается**: когда `isLoading === true`
- **Содержимое**: spinner (CSS animation) + "Загрузка данных..."
- **Timeout**: 15s → показывается кнопка «Повторить» (вызывает `store.reload()`)
- **Стиль**: full screen overlay, bg-slate-900/90, backdrop-blur
