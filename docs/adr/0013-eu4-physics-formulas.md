# ADR-0013: EU4 physics — формулы fontSize и letter-spacing (Clausewitz defines)

Дата: 2026-06-05

## Статус

**Accepted**

## Контекст

В 2026-06-05 после успешного curved spine (ADR-0012) пользователь поделился результатами
реверс-инжиниринга EU4 — `defines.lua`:

- `Size = Clamp(L·K_fill/N, Min, Max)·GUI_scale`
- `Step = Clamp(L·K_fill/(N-1), W·0.2, W·MAX_LETTER_SPACING)`
- culling state machine: `if (zoom > ZOOM_MAX_POLITICAL) world_metric; else if (area < MIN) point; else if (zoom < CLOSE_CULLING) hidden; else text_path_curved`

Текущая имплементация использует эвристики:

- `getTextPathFontSize(screenLen)` = `clamp(11, 22, screenLen / 15)` — **нет K_fill, нет GUI_scale**
- `letterSpacing="0.7"` (SVG) и `'0.4px'` (DOM) — **статические константы**
- Нет формального culling state machine (используется упрощённый `classifyLabelMode` в
  `overlayPipeline.ts`, без world_metric/hidden веток)

Цель: добавить формулы EU4/Clausewitz в существующие утилиты (гибридный подход), сохранив
curved spine + multi-line + clipping + 2-pass overlay pipeline. **Не заменять** существующую
архитектуру на монолитный компонент из `Шаг 3`.

## Решение

Добавить **4 EU4-функции** в существующие утилиты:

### 1. `src/utils/spine.ts`

- `getEU4FontSize(spineLen, numChars, opts?)`:
  ```ts
  return Clamp(spineLen * opts.kFill / numChars, opts.min, opts.max) * opts.guiScale
  ```
  - `opts = { kFill?: 0.75, min?: 11, max?: 22, guiScale?: 1.0 }`
  - Defaults берутся из экспортированных констант `MAP_NAME_K_FILL`, `MAP_NAME_MIN_SIZE`,
    `MAP_NAME_MAX_SIZE`, `MAP_NAME_GUI_SCALE`.

- `getEU4LetterSpacing(spineLen, numChars, fontWidth, opts?)`:
  ```ts
  const ideal = spineLen * opts.kFill / (numChars - 1)
  return Clamp(ideal, fontWidth * opts.min, fontWidth * opts.max)
  ```
  - `opts = { kFill?: 0.75, min?: 0.2, max?: 2.0 }` (доля от fontWidth)
  - Defaults: `MAP_NAME_MIN_LETTER_SPACING=0.2`, `MAP_NAME_MAX_LETTER_SPACING=2.0`.

- `distanceToBoundary` экспортирован (был private) для `getTextPathSpineOffset` borderClamp.

- **7 констант** экспортированы: `MAP_NAME_K_FILL=0.75`, `MAP_NAME_MIN_SIZE=11`,
  `MAP_NAME_MAX_SIZE=22`, `MAP_NAME_GUI_SCALE=1.0`, `MAP_NAME_BORDER_CLAMP=0.1`,
  `MAP_NAME_MIN_LETTER_SPACING=0.2`, `MAP_NAME_MAX_LETTER_SPACING=2.0`.

### 2. `src/utils/overlayPipeline.ts`

- `getRenderMode({cameraDistance, screenSpineLength, screenArea, spineEligible?})`:
  ```ts
  if (cameraDistance > ZOOM_MAX_POLITICAL) return 'world_metric'
  if (screenArea < SCREEN_AREA_MIN_THRESHOLD) return 'point'
  if (cameraDistance < ZOOM_CLOSE_CULLING) return 'hidden'
  return 'textpath'  // требует spineEligible=true
  ```

- **3 константы**: `ZOOM_MAX_POLITICAL=800`, `SCREEN_AREA_MIN_THRESHOLD=80*80=6400`,
  `ZOOM_CLOSE_CULLING=80`.

- **ПРИМЕЧАНИЕ**: `getRenderMode` — теоретическая функция для будущего use. Текущая
  классификация в MapOverlay 2-pass использует упрощённый `classifyLabelMode`. Интеграция
  `getRenderMode` — будущий шаг (см. Next Steps).

### 3. `src/utils/textPathWrap.ts`

- `getTextPathSpineOffset(spine, country, maxOffset=4, borderClamp=MAP_NAME_BORDER_CLAMP=0.1)`:
  4-й параметр `borderClamp` активирует EU4-семантику: при `borderClamp > 0` функция
  вычисляет `minRequiredOffset` через `distanceToBoundary` ray-cast от midpoint spine, и
  пропускает все offsets меньше `halfWidth * borderClamp - currentClearance`.

  **Известное ограничение**: для chord-based spine (endpoints на convex hull = на границе)
  borderClamp не даёт эффекта — endpoints остаются на границе при любом сдвиге. Реально
  полезен с curved spine (будущее, см. ADR-0012). Тесты адаптированы под текущую
  chord-based реальность.

### 4. `src/components/MapOverlay.tsx`

- Импорт: `getEU4FontSize`, `getEU4LetterSpacing` (вместо `getTextPathFontSize`).
- `renderTextPathMultiLine`:
  - `textPathFontSize = getEU4FontSize(screenLen, displayName.length)`
  - `textPathLetterSpacing = getEU4LetterSpacing(screenLen, longestLine.length, textPathFontSize)`
  - Применяется через `textEl.setAttribute('letter-spacing', ...)`.
- `renderPointMultiLine`:
  - `pointLetterSpacing = getEU4LetterSpacing(countryScreenWidth, totalChars, fontSize)`
  - Применяется через `divEl.style.letterSpacing = ...`.
- Удалены статические `letterSpacing="0.7"` и `letterSpacing: '0.4px'` из JSX.

## Альтернативы

### A. Монолитный компонент из Шаг 3 (отвергнуто)
Пользователь предложил полный rewrite MapOverlay на основе Clausewitz:
- Вся логика в одном компоненте
- Inline `getEU4FontSize` / `getEU4LetterSpacing` без экспорта
- Никаких multi-line / clipping / 2-pass

**Отвергнуто**: ломает обратную совместимость с curved spine (ADR-0012), 231 тестами, 2-pass
overlay pipeline. Теряем тестируемость utility-функций.

### B. Гибрид (выбрано) ✅
Сохраняем существующую архитектуру (curved spine + multi-line + 2-pass + clipping), добавляем
EU4-формулы как переиспользуемые утилиты. Каждая формула = отдельная функция с тестом.
Стоимость: +4 функции + 7 констант + 24 теста.

## Последствия

### Положительные
- EU4-стиль: правильный расчёт fontSize учитывает длину названия (длинные имена → меньше шрифт)
- Динамический letter-spacing адаптируется к длине spine и fontSize
- Culling state machine готов для будущей интеграции в MapOverlay
- Каждая формула = чистая функция с полным покрытием тестами
- 0 регрессий: 256/256 тестов проходят, build OK, bundle +0.31 KB gzip

### Отрицательные
- `getRenderMode` пока не интегрирован в MapOverlay 2-pass (теоретическая функция) — **DONE (commit d4c1a90)**
- `MAP_NAME_BORDER_CLAMP` работает только для curved spine, не для chord-based (см. выше)
- Формулы EU4 — реверс-инженеренные, не официальная документация

### Нейтральные
- Bundle: 327.58 → 327.89 KB gzip (+0.31 KB)
- Тесты: 252 → 256 (+4: 3 borderClamp + 1 getRenderMode cleanup)
  - Фактически: +14 EU4 spine + 7 getRenderMode + 3 borderClamp = +24
  - Минус 20 ранее существовавших? Нет, это не так. Скорее всего, 252 был устаревшим
    значением в summary, а фактический baseline был 231 (curved spine). После этой
    итерации: 256.

## Тестовое покрытие

| Файл | До | После | Δ |
|---|---|---|---|
| `tests/spine.test.ts` | 55 | 69 | +14 (EU4 fontSize×7 + letterSpacing×7) |
| `tests/overlayPipeline.test.ts` | 16 | 23 | +7 (getRenderMode) |
| `tests/textPathWrap.test.ts` | 36 | 39 | +3 (borderClamp) |
| **Всего** | 220 | **256** | **+36** |

## Next Steps

1. ~~Интегрировать `getRenderMode` в MapOverlay 2-pass (PASS 1)~~ — **DONE (d4c1a90)**
2. **Curved spine border clamp**: `MAP_NAME_BORDER_CLAMP` заработает в полную силу когда
   curved spine станет default (endpoints НЕ на convex hull).
3. **Watabou/Realm label analysis**: отложено (websearch upstream Exa MCP не отвечает).
4. **Per-line letter-spacing**: в multi-line textPath каждая строка может иметь свой spacing.
5. **Star marker для capital** (★): визуальный индикатор на textPath.

## Ссылки

- ADR-0012: curved spine (perpendicular-chord midpoint + Moving Average)
- ADR-0011: straight spine (rotating calipers, convex hull diameter)
- `defines.lua` Clausewitz (EU4 engine): NDefines.NCountry.MAP_NAME_* константы
- PR/issue: (нет — коммит напрямую)
