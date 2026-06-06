// Purpose: чистые helpers для MapOverlay pipeline (без React/DOM зависимостей) | classifyMode, isSpineEligible, setAttrIfChanged, getRenderMode (Clausewitz culling state machine)
export type LabelMode = 'textpath' | 'point' | 'hidden'

export const TEXTPATH_MIN_SCREEN_PX = 80
export const TEXTPATH_MIN_ASPECT = 1.3

/**
 * Определяет render-режим страны на основе видимости центра и eligibility spine.
 *  - hidden  : центр не виден (за камерой) → не рисуем ни textPath, ни point
 *  - textpath: центр виден И spine хватает (length + aspect)
 *  - point   : центр виден, но spine не хватает → fallback на point-label
 *
 * Visibility центра — основной gate. Eligibility spine — переключатель mode.
 */
export function classifyLabelMode(
  centerVisible: boolean,
  spineEligible: boolean,
): LabelMode {
  if (!centerVisible) return 'hidden'
  return spineEligible ? 'textpath' : 'point'
}

export interface SpineEligibilityInput {
  visibleCount: number
  screenLen: number
  aspect: number
}

/**
 * Spine-eligible = есть минимум 2 видимые точки И длина >= 80px И aspect >= 1.3.
 * Проверяется на основе screen-space проекции; world-space размеры не учитываются.
 */
export function isSpineEligible({
  visibleCount,
  screenLen,
  aspect,
}: SpineEligibilityInput): boolean {
  return (
    visibleCount >= 2 &&
    screenLen >= TEXTPATH_MIN_SCREEN_PX &&
    aspect >= TEXTPATH_MIN_ASPECT
  )
}

// ============================================================
// CULLING STATE MACHINE (Clausewitz defines.lua parity)
// ============================================================

/**
 * Полный набор режимов рендера по Clausewitz (defines.lua NGraphics):
 *  - world_metric: очень крупная страна при сильном отдалении (ZOOM_MAX_POLITICAL)
 *                  → подпись рисуется «над картой» крупным шрифтом
 *  - textpath:    стандартный EU4 — изогнутый текст вдоль spine
 *  - point:       fallback — горизонтальный точечный label (центр страны)
 *  - hidden:      текст плавно исчезает (zoom-in cull)
 *
 * Раньше у нас был только `textpath | point | hidden` (3 режима). Теперь
 * добавлен `world_metric` для случая, когда камера отдалена настолько,
 * что обычный textPath становится слишком мелким, и нужно показать
 * подпись «мирового» масштаба.
 */
export type RenderMode = 'world_metric' | 'textpath' | 'point' | 'hidden'

/** Камера отдалена сильнее этого порога → world_metric mode. */
export const ZOOM_MAX_POLITICAL = 800

/**
 * Площадь страны на экране (px²) ниже этого порога → point-label fallback.
 * Аналог `SCREEN_AREA_MIN_THRESHOLD` из псевдокода Clausewitz.
 */
export const SCREEN_AREA_MIN_THRESHOLD = 80 * 80 // 6400 px² ≈ 80×80 label box

/**
 * Камера приближена ближе этого порога → текст начинает fade out (HIDDEN).
 * Аналог `ZOOM_CLOSE_CULLING` из псевдокода Clausewitz.
 */
export const ZOOM_CLOSE_CULLING = 80

export interface RenderModeInput {
  /** Дистанция камеры до плоскости карты (world units). Больше = дальше. */
  cameraDistance: number
  /** Длина экранной проекции spine в пикселях. */
  screenSpineLength: number
  /** Площадь bounding box страны в пикселях на экране. */
  screenArea: number
  /** Spine-eligible результат из isSpineEligible (опционально, иначе считается). */
  spineEligible?: boolean
}

/**
 * Определяет render-режим страны по Clausewitz state machine:
 *
 * ```
 * if (cameraDistance > ZOOM_MAX_POLITICAL)         → WORLD_METRIC
 * else if (screenArea < SCREEN_AREA_MIN_THRESHOLD) → POINT_LABEL_FALLBACK
 * else if (cameraDistance < ZOOM_CLOSE_CULLING)    → HIDDEN
 * else                                             → TEXT_PATH_CURVED
 * ```
 *
 * WORLD_METRIC пока что используется редко (наш MAP_NAME_MAX_SIZE=22
 * достаточно для всех 12 годов при текущих zoom levels), но константа
 * и тип готовы — если потребуется отдалить камеру дальше, можно
 * просто снять ограничение в MapOverlay.
 *
 * @returns один из 'world_metric' | 'textpath' | 'point' | 'hidden'
 */
export function getRenderMode({
  cameraDistance,
  screenSpineLength,
  screenArea,
  spineEligible,
}: RenderModeInput): RenderMode {
  if (cameraDistance > ZOOM_MAX_POLITICAL) return 'world_metric'
  if (screenArea < SCREEN_AREA_MIN_THRESHOLD) return 'point'
  if (cameraDistance < ZOOM_CLOSE_CULLING) return 'hidden'
  // Внутри "политического" zoom-диапазона выбираем textPath если хватает
  // spine, иначе fallback на point label.
  if (spineEligible === undefined ? screenSpineLength >= TEXTPATH_MIN_SCREEN_PX : spineEligible) {
    return 'textpath'
  }
  return 'point'
}

/**
 * Wrapper вокруг setAttribute, который не дёргает DOM при неизменном значении.
 * Используется для data-* атрибутов на оверлее, чтобы не вызывать
 * MutationObserver / attributeChangedCallback на каждом кадре.
 *
 * @returns true если значение изменилось и атрибут был записан
 */
export function setAttrIfChanged(
  el: Element,
  name: string,
  value: string,
  cache: { value: string },
): boolean {
  if (cache.value === value) return false
  el.setAttribute(name, value)
  cache.value = value
  return true
}
