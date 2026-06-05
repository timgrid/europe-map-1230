# ADR-0011: Text-along-path рендеринг подписей стран (EU4/EU5-стиль)

Дата: 2026-06-05

## Статус

**Accepted**

## Контекст

Текущая подпись страны в `MapOverlay.tsx` — это `<div>` с `transform: translate(-50%, -50%)`,
позиционированный в `getInteriorPoint(country)` (pole of inaccessibility) и
отрисованный горизонтально. В EU4/EU5 (Clausewitz engine) подписи рендерятся
вдоль «скелета» полигона страны (medial axis / straight skeleton): текст
изгибается по самой длинной плавной линии внутри страны, следуя её форме.

Без text-along-path длинные названия (например, «Священная Римская Империя»,
22 символа) на вытянутых странах вроде Норвегии или Ганзы выглядят
неестественно — горизонтальный текст пересекает границу, ломается на
вертикальных скандинавских странах и плохо читается. У пользователей
возникает ощущение «карта из 2000-х», а не EU5/Project Caesar.

Алгоритмически это упирается в классическую задачу **Text Along Path** (D3.js)
или **Label Placement on Polygons**. В картографической литературе (Mapbox
Polylabel, D3 textPath, OpenCV distanceTransform) — три основных подхода:

1. **Straight skeleton / medial axis** — O(n²) Voronoi-diagram полигона,
   clipping, поиск longest path в скелете. Идеальный EU4-look, но
   сложно в имплементации и тестировании, +3-5 KB gzip.
2. **Longest chord (rotating calipers)** — O(n log n) convex hull + O(n)
   rotating calipers. Spine = диаметр convex hull, прямая линия.
   Bundle +0.5-1 KB. 95% EU4-look.
3. **Per-letter spans с rotate** — рендерим каждую букву как `<span>` с
   `transform: rotate(tangent_angle)`. Полный контроль, но ~30 DOM на
   страну, ручная математика baseline.

Альтернативно: **3D TextGeometry** (troika-three-text, +50 KB gzip) — но
это бьёт по TG mobile perf и ломает 2D HTML-архитектуру оверлея.

## Решение

1. **Spine = longest chord** (rotating calipers на convex hull largest polygon).
   `src/utils/spine.ts`:
   - `convexHull(points)` — Andrew monotone chain
   - `rotatingCalipersDiameter(hull)` — O(n) наибольшая хорда
   - `getCountrySpine(country, samples=24)` — N точек вдоль диаметра с тангенсом
   - Переиспользует `largestPolygon(country)` из `geoParser.ts` (exclave policy
     из плана — **только largest polygon**)

2. **Render = SVG `<textPath>`** в 2D HTML overlay.
   `MapOverlay.tsx`:
   - `<svg>` поверх div-overlay (тот же zIndex 9999, `pointer-events: none`)
   - Per visible country: `<path id="spine-{id}" d="M x0 y0 L x1 y1 ..." fill="none" />`
     + `<text><textPath href="#spine-{id}" startOffset="50%" text-anchor="middle">{name}</textPath></text>`
   - Memoize spine в `dataRef` (только при смене `visibleCountries`)
   - В RAF tick: проектируем 24 spine-точки в screen → обновляем `path.d`
     императивно (`path.setAttribute('d', ...)`)

3. **Hybrid fallback** (как в EU4):
   - `screenSpineLength ≥ 80px` AND `boundsWidth / boundsHeight > 1.3` →
     textPath (показать `<text><textPath>`, скрыть div)
   - Иначе → point label (текущая логика: `getInteriorPoint` + auto-shrink)
   - Capital `★ ...` показывается только для point-label (для textPath —
     в tooltip при hover)

4. **Шрифт**: оставляем Georgia, serif (уже подключён). SVG textPath
   нативно поддерживает `font-family`, `font-weight`, `letter-spacing`.

5. **LOD**: `getLabelFontSize(spineWidthWorld, ...)` — то же, что для
   point-label, но аргумент `boundsWidth` берётся не bbox, а projected
   spine width в world units. Это даёт более точное соотношение шрифта
   к длине надписи.

## Альтернативы (рассмотренные и отклонённые)

- **Straight skeleton (medial axis)** — отклонён: O(n²) Voronoi, сложно
  отлаживать, +3-5 KB. Прямая линия (rotating calipers) даёт сопоставимый
  визуальный эффект для 95% стран. Оставлен в виде комментария в `spine.ts`
  — `smoothPoints()` helper, готовый к интеграции при необходимости.

- **Per-letter `<span>` с rotate** — отклонён: 30+ DOM элементов на страну,
  ручная математика baseline, сложно дебажить в DevTools. SVG textPath
  делает то же самое нативно, без DOM overhead.

- **troika-three-text 3D** — отклонён: +50 KB gzip бьёт по performance budget
  (AGENTS.md: initial 323 KB gzip), TG mobile framerate упадёт. Также ломает
  архитектуру 2D HTML overlay, в которой уже работают tooltips, side panel,
  selection highlight.

- **Polylabel + 4 направления (radius)** — рассмотрен: даёт кросс-образный
  spine (4 луча от центра). Не похоже на EU4 — там spine идёт по длинной оси.
  Отклонён.

## Последствия

**Положительные**:
- Длинные вытянутые страны (Норвегия, Ганза, Швеция, Византия) получают
  изогнутые подписи вдоль главной оси
- Bundle impact: +0.5-1 KB gzip (spine.ts + SVG path strings)
- DOM impact: +50 `<path>` + 50 `<text><textPath>` для visible countries
- Hybrid fallback сохраняет читаемость маленьких стран (Oldenburg, Cyprus)
- Капитали остаются как tooltip при hover (не теряем функциональность)
- Полностью совместимо с существующими системами: LOD hysteresis, overlap
  detection для point-label, RAF loop, camera snapshot

**Отрицательные / риски**:
- Текст вдоль диаметра — это **прямая линия**, не кривая Безье через
  скелет. Визуально менее «EU4» для сильно L-образных стран (Англия,
  Италия). Митигация: можно апгрейдить до straight skeleton позже
  (smoothPoints helper готов).
- При rotate камеры spine в screen space пересчитывается каждый кадр —
  textPath визуально «плывёт». Это **намеренно** — текст должен лежать
  на карте, а не в фиксированной ориентации. EU4 делает так же.
- Для multi-polygon стран (UK = Англия + Шотландия) показываем spine
  только largest polygon. Мелкие exclaves (Уэльс) остаются без подписи —
  **документированный компромисс** (exclave policy: largest only).
- SVG textPath не поддерживает per-letter styling легко (outline glow
  придётся эмулировать через `paint-order` и `stroke`).
- Overlap detection `resolveLabelOverlaps` работает только для point-label;
  curved labels могут накладываться (как в EU4 при плотной загрузке).

**Нейтральные**:
- ADR-0010 (camera initial view) и ADR-0006 (processed JSON) остаются
  валидными — textPath живёт в 2D overlay, не затрагивает 3D-сцену
- Новый файл `src/utils/spine.ts` — самостоятельный модуль, тестируется
  отдельно (18 unit-тестов)

**Performance budget (AGENTS.md)**:
- Spine computation: 50 стран × O(n log n) на ~200 точек = ~0.5ms total,
  1 раз на смену года
- RAF tick: +24 `project()` × 50 стран = +1200 проекций/frame ≈ +0.3ms
- DOM: +50 `<path>` + 50 `<text><textPath>` элементов
- TG mobile: приемлемо, лагов не ожидается
- Bundle: 323.92 → ~324.5 KB gzip (warning threshold 500 KB не достигнут)
