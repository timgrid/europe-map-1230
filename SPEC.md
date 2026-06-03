# SPEC.md — Europe Interactive Historical Map

> Единственный источник правды о том, что делает приложение.
> Перед началом работы над фичой — прочитай. После добавления фичи — обнови.

## Product Vision

Интерактивная 3D-карта Европы в стиле EU4/EU5 на заданный исторический год.
Пользователь переключает годы, кликает по странам, видит их названия и описания.
Цель: показать политическую географию Европы за 1200-1530 годы наглядно и быстро.

## Target Audience

- Любители истории (русскоязычные)
- Игроки в Paradox Interactive (EU4, EU5)
- Преподаватели и студенты (быстрая визуализация границ)

## Core Features

### Feature 1: 3D Map Rendering

- 3D-сцена с тёмным фоном (#0a1628), водная плоскость и декаративное кольцо
- Страны — экструдированные полигоны с обводкой, **2.5D проекция** (камера смотрит под углом)
- Освещение: ambient (тёплый) + directional + hemisphere
- Fog для плавного скрытия дальних объектов

### Feature 2: Year Switching

- Пользователь переключает год через UI-селектор (YearToggle)
- Доступные года: **1200, 1279, 1300, 1400, 1492, 1500, 1530**
- При смене года: загрузка новых данных → перерисовка карты → сброс selection
- Loading screen пока данные грузятся; retry-кнопка через 15s timeout

### Feature 3: Map Interaction

- **Left drag** → панорама
- **Right drag** → вращение камеры
- **Scroll** → зум
- **Single click on country** → выбор (подсветка, side panel)
- **Click on empty** → сброс выбора
- **Tooltip on hover** → название страны
- **Reset selection** → кнопка в UI

### Feature 4: Side Panel

- При выборе страны: название (русское), историческое описание, цвет
- Данные из `countryMetadata.ts`
- Анимация появления/исчезновения (Framer Motion)
- Позиция справа

### Feature 5: Data Processing Pipeline

- Исходные данные: `aourednik/historical-basemaps` (MIT) → `world_{year}.geojson`
- Препроцессинг Node-скриптом: проекция (Natural Earth I), bbox Европы, нормализация имён,
  назначение цветов, округление координат, минификация
- Результат: `public/data/processed/europe_{year}.json` (minified, ~100-145 KB each)
- Браузер НЕ парсит исходный GeoJSON

### Feature 6: Layer Toggle (Unified / Principalities)

- Два режима показа: `unified` (крупные блоки) и `principalities` (детальный вид)
- Для 1200 года: unified → `Kievan Rus`, principalities → отдельные княжества
- Для 1279+ года: unified и principalities совпадают (временные слои для будущего)

### Feature 7: Map Labels

- Крупные страны подписаны прямо на карте (HTML via drei Html)
- Подписи центрированы по полигону страны
- Размер шрифта зависит от слоя: `unified` → 14px, `principalities` → 11px
- Тень текста для читаемости

## Data Model

```typescript
ProcessedData {
  year: number           // год (1200-1530)
  bounds: {              // bounding box после проекции
    minX, maxX, minY, maxY: number
  }
  scale: number          // масштабный коэффициент
  offsetX, offsetY: number  // смещение центрирования

  countries: ProcessedCountry[]  // список стран
}

ProcessedCountry {
  id: string          // уникальный slug (england, ottoman_empire)
  name: string        // отображаемое имя (на русском)
  color: string       // hex-цвет (#RRGGBB)
  center: [number, number]  // геометрический центр (X, Y, projected)
  polygons: {
    outer: number[][]        // внешний контур
    holes: number[][][]      // отверстия (анклавы, моря внутри)
  }[]
}
```

## UI Components Tree

```
App
├── LoadingScreen (conditional)
├── Canvas (R3F)
│   ├── fog, ambientLight, directionalLight, hemisphereLight
│   ├── MapScene
│   │   ├── Mesh (water plane)
│   │   ├── CountryMesh[x]
│   │   └── Html (label)[x]
│   └── OrbitControls
├── YearToggle
├── LayerToggle
├── Tooltip
├── SidePanel
├── Title (h1)
├── ResetSelection button
├── ControlsHint
└── Scale indicator
```

## State (Zustand store)

```typescript
MapState {
  currentYear: number           // выбранный год
  layer: 'unified' | 'principalities'
  hoveredCountry: string | null  // ID при наведении
  selectedCountry: string | null // ID при клике
  isLoading: boolean              // загрузка данных
  reloadKey: number              // при ретрае инкремент → перезагрузка

  setYear(n): void
  setLayer(s): void
  setHoveredCountry(s | null): void
  setSelectedCountry(s | null): void
  setLoading(b): void
  reload(): void
}
```

## Non-Goals (explicit)

- Не ведётся война/исторические события — только статическая карта
- Нет таймлайна/анимации границ — только переключение дискретных годов
- Нет поиска по странам
- Нет карты мира (только Европа + Ближний Восток + Северная Африка)
- Нет интерактивной легенды (цвета читаются по клику)
- Нет поддержки сенсорных жестов (только мышь)
- Нет мобильной вёрстки (десктоп-first)
