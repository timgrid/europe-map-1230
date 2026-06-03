# Data Pipeline

## Purpose

Преобразование исходных GeoJSON (`world_{year}.geojson`) в обработанные JSON
(`europe_{year}.json`), готовые для браузерного рендера.

## Stage 1: Source

- **Источник**: `aourednik/historical-basemaps` (MIT)
- **Формат**: `world_{year}.geojson` (FeatureCollection, EPSG:4326)
- **Cелектор полей**: `features[].properties.name` — название страны
- **Размер**: 1-4 МБ на год (глобальный) → после bbox Европы ~800-2000 объектов

## Stage 2: Preprocessing (Node script `scripts/process-geojson.cjs`)

1. **Фильтрация по bbox** — `[-30, 20, 50, 70]` (Европа + СВ Африка + Бл. Восток)
2. **Нормализация имён** через `commonAliases` (30+ записей для 5 языков)
3. **Объединение стран** через `configs[year].mergeInto` (например,
   русские княжества → Kievan Rus для 1200 года)
4. **Проекция через d3.geoNaturalEarth1()** → плоские координаты X/Y
   с инверсией Y-оси (d3 → Three.js)
5. **Вычисление bbox, масштаба, центрирования**
6. **Назначение цвета из colorMap** (40+ записей; default `#888` для неизвестных)
7. **Расчёт центра каждого полигона** (d3.geoPath().centroid)
8. **Генерация ID** из canonical name: `canonical.replace(/[\s-]+/g, '_').toLowerCase()`
9. **handleRouteUnnamed**: мелкие острова (Hebrides → Scotland, Crimea → Kievan Rus/Golden Horde)

## Stage 3: Output

- **Файлы**: `public/data/processed/europe_{year}.json`
- **Формат**: minified JSON (без отступов)
- **Координаты**: округлены до 2+ знаков после запятой (.toFixed(2))
- **Размер**: ~100-145 КБ на год (все 7 годов ~858 КБ после minify:round)

## Stage 4: Client Load (`src/utils/dataLoader.ts`)

1. `fetch(`${baseUrl}data/processed/europe_{year}.json`)`
2. `JSON.parse` → Zod‑валидация (`src/data/schema.ts`)
3. Кеширование в `Map<year, ProcessedData>`

## Dependencies

- `d3-geo` (projection)
- `zod` (runtime validation)
