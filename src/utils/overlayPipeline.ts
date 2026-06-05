// Purpose: чистые helpers для MapOverlay pipeline (без React/DOM зависимостей) | classifyMode, isSpineEligible, setAttrIfChanged
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
