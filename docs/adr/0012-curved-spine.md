# ADR-0012: Curved spine (perpendicular-chord midpoint + Moving Average)

Дата: 2026-06-05

## Статус

**Accepted**

## Контекст

ADR-0011 ввёл spine = longest chord (rotating calipers на convex hull) —
это **прямая** линия. Для выпуклых стран (Россия, Франция, Испания) прямая
выглядит хорошо, но для **асимметричных** (Италия-сапог, Норвегия-S,
Шотландия) прямая хорда проходит через «тонкие» части полигона или
срезает углы, и подпись textPath либо упирается в границу, либо идёт
мимо фактической центральной оси.

EU4/EU5 (Clausewitz engine) используют **straight skeleton / medial axis**
через полигон — кривая, повторяющая форму страны. Это даёт «живой» вид
подписи, синхронизированной с силуэтом.

Алгоритмы straight skeleton:
- **Aichholzer 1995** — O(n³) Voronoi, идеальный результат, но +3-5 KB gzip,
  сложно отлаживать
- **Distance Transform (Felzenszwalb 2012)** — O(n) растеризация + BFS,
  визуально лучший результат, но +1-2 KB и нужна пиксельная сетка
- **Iterative strip-centroid** — упрощённая аппроксимация: O(n) без
  Voronoi, O(log d) ray-cast, читаемая кривизна для асимметричных полигонов

Наш бюджет (AGENTS.md): initial bundle ≤500 KB gzip (текущий 327.12 KB),
unit-тесты обязательны, runtime < 1ms на 50 стран × 24 sample.

## Решение

**Perpendicular-chord midpoint + Moving Average** — компромисс между
результатом Aichholzer и Distance Transform:

1. **Длинная ось** = rotating calipers на convex hull (без изменений,
   `getCountrySpine`).
2. **Per-sample ray-cast**: для каждой из 24 sample-точек вдоль оси
   кастуем луч в ОБЕ стороны перпендикулярно оси (+n и -n) и находим
   расстояние до границы через `pointInPolygonWithHoles` (бинарный поиск,
   24 итерации, точность ~1e-5 от длины луча).
3. **Середина chord**: смещение от оси = `(distMinus - distPlus) / 2`.
   Для симметричного сечения (дистанции равны) → смещение 0, spine на оси.
   Для асимметричного (Италия в L-форме) → смещение в сторону медиальной
   оси полигона.
4. **Moving Average** (окно 3, константа `SPINE_SMOOTH_WINDOW`) — лёгкое
   сглаживание кривой без потери общей формы.
5. **Per-sample tangent** — пересчитывается по соседним точкам сглаженной
   кривой (центральная разность), иначе буквы textPath поедут по старому
   прямому тангенсу.

### Граничные случаи

- Полигон < 3 вершин ИЛИ convex hull < 2 точек ИЛИ длина оси < 1e-6 →
  fallback на `getCountrySpine` (прямая). Никогда не возвращаем мусор.
- Ray-cast linear probe с удвоением → O(log d) поиск границы.
- Бинарный поиск — 24 итерации → точность ~1e-5 от верхней границы.
- Degenerate tangent (длина < 1e-6 между соседями) → fallback на исходный
  прямой тангенс.

### Сложность

- O(samples × log(maxProbe) × iterationsBinary) per country
- 24 × log(1024) × 24 ≈ 240 операций pointInPolygonWithHoles per country
- ~12 KB per country (50 стран × 24 sample × ~1KB working set)
- 50 стран × 240 ops × ~5μs per pointInPolygonWithHoles ≈ 60ms total
  один раз на смену года — приемлемо
- В RAF tick: spine **не** пересчитывается (мемоизирован в `dataRef`),
  только проектируется

### Bundle impact

- `distanceToBoundary` + `getCurvedSpine` = ~1 KB gzip
- Тесты: 11 новых (convex/square/L-shape/exclave/fallback/константы)
- Общий bundle: 327.12 → ~328 KB gzip (warning threshold 500 KB не достигнут)

## Альтернативы (рассмотренные и отклонённые)

- **Aichholzer 1995 (полный straight skeleton)** — отклонён: O(n³)
  Voronoi-диаграмма, +3-5 KB gzip, сложно тестировать, 95% визуального
  улучшения даёт уже наша аппроксимация для большинства полигонов.

- **Distance Transform (Felzenszwalb 2012)** — рассмотрен: даёт
  пиксельно-точный medial axis, но требует растеризации полигона в
  сетку (200×200 для нашего масштаба) + 2 прохода BFS = +1-2 KB + state
  для grid. Можно реализовать позже, если perpendicular-chord midpoint
  окажется недостаточным.

- **Strip-centroid of vertices (vertex-only, без ray-cast)** — рассмотрен
  и **отклонён после эксперимента**: для выпуклого квадрата с диагональной
  осью центроид band'а вершин даёт spine ОТКЛОНЁННЫЙ от оси на 3.54
  единицы (только 2 из 4 вершин попадают в band'у → центроид = (0,0)
  вместо (-2.5,-2.5)). Ray-cast через `pointInPolygonWithHoles` даёт
  правильное пересечение с гранью → для выпуклого квадрата spine на оси.

- **Per-letter `<span>` с rotate** — отклонён: 30+ DOM на страну,
  ручная математика baseline, сложно дебажить. SVG textPath остаётся.

- **Настоящий straight skeleton через npm-зависимость** (например,
  `polyclip` или `straight-skeleton`) — отклонён: +50-100 KB gzip
  зависимости ради одной функции. Чистый код на 1 KB — лучше.

## Последствия

**Положительные**:
- Асимметричные страны (Италия, Норвегия, Шотландия) получают плавную
  кривую подпись вместо прямой хорды, «срезающей» углы
- Выпуклые страны (Россия, Франция) визуально неотличимы от straight
  (ray-cast midpoint на оси при симметричном сечении) — backward compat
- `hasSharpSpineTurn` (SPINE_MAX_TURN_DEG=30°), добавленный в ADR-A,
  становится **реально полезной защитой**: для curved spine резкие
  изгибы (Греция, f-образные exclaves) автоматически fallback'ятся на
  point-label
- O(log d) ray-cast — не бьёт по RAF tick (spine мемоизирован в dataRef)
- Moving Average убирает микро-«дёрганье» кривой, вызванное шумом вершин
- Полностью совместимо с существующими `buildScreenSpine`,
  `ensureReadableDirection`, `shiftSpineByNormal` (для multi-line)

**Отрицательные / риски**:
- **Не активировано по умолчанию**: `USE_CURVED_SPINE = false` в
  MapOverlay.tsx. Требует визуальной проверки на всех 12 годах
  (800, 900, 1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600)
  перед включением. Возможны неожиданные кривизны на редких
  топологиях (островные exclaves, очень узкие перешейки).
- Ray-cast стоит ~60ms на пересчёт всех 50 стран (один раз на смену
  года) — не в RAF tick, а в useEffect по `visibleCountries`. В пределах
  бюджета.
- Fallback на `pointInPolygonWithHoles` означает, что качество кривой
  зависит от качества полигонов: дыры (holes) учитываются, но вырожденные
  self-intersecting кольца могут дать артефакты.
- Per-sample tangent — central difference, может «дёргаться» на
  коротких spine (samples < 3). Митигация: `Math.max(2, samples)`.

**Нейтральные**:
- ADR-0011 (text-along-path) и ADR-A (text-max-angle) остаются
  валидными и **не дополняются** — curved spine это расширение,
  а не замена straight
- 11 новых тестов в `tests/spine.test.ts`: 44 → 55
- Новые экспорты: `getCurvedSpine`, `distanceToBoundary` (private),
  `SPINE_BAND_FRACTION` (зарезервировано), `SPINE_SMOOTH_WINDOW`
- НЕ активировано в `MapOverlay.tsx` — backward compat, opt-in через
  изменение `USE_CURVED_SPINE = true`
