# ADR Index

Записи об архитектурных решениях проекта.

| # | Название | Статус |
|---|----------|--------|
| [0000](./0000-template.md) | Шаблон ADR | — |
| [0001](./0001-vite-react-typescript.md) | Vite + React + TypeScript как основной стек | Accepted |
| [0002](./0002-react-three-fiber.md) | React Three Fiber для 3D-рендера | Accepted |
| [0003](./0003-natural-earth-projection.md) | Проекция Natural Earth I | Accepted |
| [0004](./0004-historical-basemaps-data-source.md) | Источник данных aourednik/historical-basemaps | Accepted |
| [0005](./0005-build-time-geojson-preprocessing.md) | Препроцессинг GeoJSON на build-time | Accepted |
| [0006](./0006-minify-and-round-processed-json.md) | Минификация JSON и округление координат | Accepted |
| [0007](./0007-russian-language-ui.md) | Русский язык интерфейса | Accepted |
| [0008](./0008-conventional-commits-and-adr.md) | Conventional Commits + ADR + тесты | Accepted |
| [0009](./0009-zustand-for-state.md) | Zustand для глобального состояния | Accepted |
| [0010](./0010-camera-initial-view.md) | Динамический fit-to-view камеры по размеру карты | Accepted |

## Формат

Стандартный Nygard-формат: **Status** / **Context** / **Decision** / **Consequences**.

## Соглашения

- Файлы именуются `NNNN-kebab-case-slug.md`;
- `NNNN` сквозной, четырёхзначный, без пропусков;
- одна запись = одно решение (атомарно);
- ретроспективные ADR допустимы, но должны явно отражать «когда» было принято решение;
- при замене решения — статус `Superseded by ADR-NNNN` (не удалять старый ADR).

Автотесты: `tests/adr.test.ts` проверяет структуру, статус, нумерацию.
