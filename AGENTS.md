# AGENTS.md

> Контекст для AI-агентов (opencode, Cursor, Aider, Copilot, Continue) и людей-контрибьюторов.
> Читай первым. Если ты — AI, ты уже прочитал. Не переспрашивай то, что здесь есть.

## Проект

**europe-map-1230** — интерактивная 3D-карта Европы для веба в стиле EU4/EU5. Показывает политические
границы за годы **800, 900, 1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600**. React + Three.js, русский UI, деплой на
GitHub Pages + Telegram Mini App.

- Live: https://timgrid.github.io/europe-map-1230/
- Репо: https://github.com/timgrid/europe-map-1230
- Автор: TimGrid (solo + AI pair-programming)

## Стек

| Слой | Технология |
|---|---|
| Сборка | Vite 8 |
| UI | React 19 + TypeScript 6 (strict) |
| 3D | three.js 0.184 + @react-three/fiber 9 + @react-three/drei 10 |
| Стейт | Zustand 5 |
| Стили | Tailwind CSS 4 |
| Анимации | Framer Motion 12 |
| Карта | d3-geo (проекция Natural Earth I) |
| Данные | aourednik/historical-basemaps (MIT) |
| Тесты | Vitest 3 |
| CI | GitHub Actions (Pages + Tests) |
| Хуки | Husky 9 + commitlint 19 |

## Команды

```bash
npm ci              # установка зависимостей (запускает husky init)
npm run dev         # dev-сервер с HMR
npm run build       # tsc -b && vite build → dist/
npm test            # vitest run (256 тестов, ~1.0s)
npm run test:watch  # vitest в режиме watch
npm run test:coverage
npm run lint        # eslint
npm run preview     # vite preview для dist/

# Ручной препроцессинг данных (после добавления нового года):
node scripts/process-geojson.cjs 1500
```

## Структура

```
europe-map-1230/
├── docs/
│   ├── adr/               # Architecture Decision Records (см. ADR index)
│   └── telegram-deploy.md # Инструкция по публикации в Telegram Mini App
├── public/
│   ├── data/processed/    # готовые europe_<year>.json (minified, ~100-145KB каждый)
│   └── world_*.geojson    # исходные GeoJSON (GITIGNORED, скачивать руками)
├── scripts/
│   └── process-geojson.cjs  # build-time препроцессинг
├── src/
│   ├── components/        # React-компоненты (UI/, MapScene, MapCanvas [lazy R3F], MapOverlay, CameraBridge, CameraRig, CountryMesh, TelegramBackButton)
│   ├── data/              # статические словари (countryMetadata.ts)
│   ├── hooks/             # useDeviceType, useTelegram
│   ├── state/             # shared mutable refs (cameraState.ts — мост между Canvas и DOM-оверлеем)
│   ├── store.ts           # Zustand state
│   ├── utils/             # dataLoader, geoParser, camera, projection, telegram
│   ├── App.tsx            # корневой компонент
│   └── main.tsx
├── tests/                 # vitest (adr, commits, geoParser)
├── .github/workflows/     # deploy.yml, test.yml
├── .husky/                # commit-msg, pre-commit hooks
├── commitlint.config.cjs  # Conventional Commits rules
├── vitest.config.ts
├── vite.config.ts
└── package.json
```

## Конвенции

### Коммиты — Conventional Commits
Формат: `type(scope): subject`. Типы: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, `revert`. Header ≤100 символов. `commit-msg` хук блокирует
нарушения. Старые коммиты (до `9f7ca3d`) predate policy — не трогай.

### ADR — для каждого значимого решения
Файл `docs/adr/NNNN-kebab-slug.md` по шаблону `0000-template.md`. Нумерация сквозная.
Тест `tests/adr.test.ts` валидирует структуру, статус (Proposed/Accepted/Deprecated/Superseded),
нумерацию и ссылки. **Перед нетривиальным изменением — открой существующие ADR.**

### Тесты — обязательны
Каждый нетривиальный код должен иметь unit-тест. Тесты в `tests/*.test.ts`. `pre-commit` хук
запускает `npm test`. CI блокирует merge при падении.

### UI — русский
Все пользовательские строки, тултипы, метаданные — на русском. ID стран — английские slug
(`england`, `ottoman_empire`). Не транслитерируй кириллицу в коде.

### Данные — обработанные JSON
Браузер НЕ парсит сырой GeoJSON. `dataLoader.ts` грузит `europe_<year>.json` (уже спроецированный,
центрированный, с алиасами и цветами). Все манипуляции с данными — в `scripts/process-geojson.cjs`.

## Частые задачи

### Добавить новый год (например, 1450)

1. **Скачай** `world_1450.geojson` из
   https://github.com/aourednik/historical-basemaps в `public/world_1450.geojson`
   (этот файл — gitignored).
2. **Добавь год** в `scripts/process-geojson.cjs`:
   - секция `configs[1450] = { bbox, mergeInto }`;
   - `colorMap[entityName]` для новых сущностей;
   - `commonAliases[oldName] = newName` для нормализации имён.
3. **Добавь в `YearToggle.tsx`**: `const years = [..., 1450]`.
4. **Добавь в `MapScene.tsx labelCountries`** — если нужна подпись.
5. **Добавь в `src/data/countryMetadata.ts`** — русские описания.
6. **Запусти**: `node scripts/process-geojson.cjs 1450`. Должно быть «0 default-color countries».
7. **Запусти тесты**: `npm test`.
8. **Коммит**: `feat: add year 1450`.

### Добавить новую страну / переименовать

1. `process-geojson.cjs` → `colorMap[newName] = '#hex'`
2. `process-geojson.cjs` → `commonAliases[originalName] = newName`
3. `src/data/countryMetadata.ts` → `countryMetadata[id] = { name, description }`
4. Перегенерируй данные: `node scripts/process-geojson.cjs <year>`
5. `npm test && git commit -m "feat(data): add Country"`

### Исправить баг

1. Найди существующие тесты — там примеры входных/выходных данных.
2. Сначала напиши падающий тест, потом фикс.
3. Коммит: `fix(scope): краткое описание`.

## Что НЕ делать

- **Не редактируй файлы в `public/data/processed/` вручную** — они генерируются скриптом.
- **Не коммить `public/world_*.geojson`** — они в .gitignore. Скачиваются руками при добавлении года.
- **Не используй `useEffect` без deps array** или с лишними deps.
- **Не поднимай fov камеры выше 30** — текущий fov 20 даёт правильную перспективу для
  политической карты. Слишком широкий fov исказит масштаб Скандинавии vs Средиземноморья.
  **Камера управляется утилитой `getInitialCameraConfig()`** в `src/utils/camera.ts` —
  не задавай позицию камеры вручную, передавай `mapSize` + aspect ratio.
- **Не добавляй console.log в production-сборку** — используй debug-флаг если нужно.
- **Не игнорируй commit-msg хук** через `--no-verify` без причины. Если хук неправ — фиксни хук.
- **Не дублируй код конвертации HEX↔RGB** — посмотри в `MapScene.tsx` и `CountryMesh.tsx`,
  используй существующие хелперы.

## Performance-бюджет

- Размер JSON-данных: ≤150 КБ на год (текущее: 100-145 КБ).
- Время `JSON.parse` + `THREE.Shape` конструктор: ≤500мс на десктопе.
- FCP (First Contentful Paint): ≤2с на 3G.
- Bundle size: initial 1.20 МБ (328 КБ gzip) + lazy 175 КБ (55 КБ gzip) для R3F-сцены.
  Three.js + drei вынесены в `MapCanvas` через `React.lazy` + `<Suspense>` —
  initial bundle уменьшился на ~54 КБ gzip. FCP улучшен.

## Тестовая инфраструктура

- `tests/adr.test.ts` — 7 тестов структуры ADR
- `tests/commits.test.ts` — 3 теста (commitlint config + hook + история с cutoff `9f7ca3d`)
- `tests/geoParser.test.ts` — 23 теста (геометрия + getCountryBounds + getInteriorPoint)
- `tests/spine.test.ts` — 69 тестов (convex hull, rotating calipers, getCountrySpine, getCurvedSpine, ensureReadableDirection, spineScreenLength, buildScreenSpine, hasSharpSpineTurn, getEU4FontSize, getEU4LetterSpacing)
- `tests/camera.test.ts` — 15 тестов расчёта камеры (getMapSize, getInitialCameraConfig)
- `tests/projection.test.ts` — 29 тестов (projectWorldToScreen + getLabelFontSize)
- `tests/labelLayout.test.ts` — 16 тестов (estimateLabelBox, boxesIntersect, resolveLabelOverlaps с бонусом стабильности)
- `tests/overlay.test.ts` — 7 тестов (pickFittingName)
- `tests/overlayPipeline.test.ts` — 23 теста (classifyLabelMode, isSpineEligible, setAttrIfChanged, getRenderMode)
- `tests/textPathWrap.test.ts` — 39 тестов (wrapBalanced, getLineOffsets, shiftSpineByNormal, isSpineInsidePolygon, shouldUseMultiLine, getTextPathSpineOffset с borderClamp)
- `tests/schema.test.ts` — 7 тестов Zod-валидации
- `tests/telegram.test.ts` — 17 тестов TG-утилит (parseSDKVersion, isFullscreenSupported, etc.)
- `vitest.config.ts` — Node environment, coverage на `src/utils/**` и `src/data/**`
- Husky `pre-commit` запускает `npm test` (~0.7s, 220 тестов)

## Где что искать

| Хочу... | Файл |
|---|---|
| Список годов | `src/components/UI/YearToggle.tsx` |
| Цвета и алиасы стран | `scripts/process-geojson.cjs` (colorMap, commonAliases) |
| Русские описания стран | `src/data/countryMetadata.ts` |
| Подписи на карте (2D HTML) | `src/components/MapOverlay.tsx` (whitelist + RAF-loop + LOD + overlap) |
| Layout подписей | `src/utils/labelLayout.ts` (estimateLabelBox, boxesIntersect, resolveLabelOverlaps) |
| Камера / свет | `src/App.tsx` (lazy MapCanvas) + `src/utils/camera.ts` (getInitialCameraConfig) + `src/components/CameraRig.tsx` |
| Мост Canvas → DOM (camera state) | `src/components/CameraBridge.tsx` + `src/state/cameraState.ts` |
| Данные конкретного года | `public/data/processed/europe_<year>.json` |
| Исходник (gitignored) | `public/world_<year>.geojson` |
| Почему так, а не иначе | `docs/adr/` |

## Контекст для opencode

- **Skills**: `.opencode/skill/<name>.md` — загружай через `skill` tool когда задача
  подходит под описание.
- **Скилл `add-a-year`**: используй когда просят «добавь год 1450», «новый год», «historical year».
- **Memory budget**: проект маленький. Читай файлы целиком, не делай избыточных `grep`.
  Если нужна конкретная секция — используй `read` с `offset`/`limit`.
