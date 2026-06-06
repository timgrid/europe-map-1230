// Purpose: spine (главная ось) полигона страны для рендера подписей в стиле EU4 (text-along-path) | convex hull + rotating calipers + sample
import * as THREE from 'three'
import { projectWorldToScreen, type Viewport } from './projection'
import { largestPolygon, pointInPolygonWithHoles, type CountryGeometry } from './geoParser'

export interface SpinePoint {
  x: number
  y: number
  tangentX: number
  tangentY: number
}

function cross2D(o: number[], a: number[], b: number[]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

function distSq(a: number[], b: number[]): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

export function convexHull(points: number[][]): number[][] {
  const pts = points.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
  const n = pts.length
  if (n <= 1) return pts.map((p) => [p[0], p[1]])

  pts.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]))

  const lower: number[][] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross2D(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper: number[][] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!
    while (upper.length >= 2 && cross2D(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

export function rotatingCalipersDiameter(hull: number[][]): {
  p1: [number, number]
  p2: [number, number]
  length: number
} {
  const n = hull.length
  if (n === 0) return { p1: [0, 0], p2: [0, 0], length: 0 }
  if (n === 1) return { p1: [hull[0]![0], hull[0]![1]], p2: [hull[0]![0], hull[0]![1]], length: 0 }
  if (n === 2) {
    return { p1: [hull[0]![0], hull[0]![1]], p2: [hull[1]![0], hull[1]![1]], length: Math.sqrt(distSq(hull[0]!, hull[1]!)) }
  }

  let maxDist = 0
  let bestA = 0
  let bestB = 0

  for (let i = 0, j = 1; i < n; i++) {
    const ni = (i + 1) % n
    const a = hull[i]!
    const b = hull[ni]!
    const edgeX = b[0] - a[0]
    const edgeY = b[1] - a[1]

    while (true) {
      const nj = (j + 1) % n
      const c = hull[j]!
      const d = hull[nj]!
      const cross = (d[0] - c[0]) * edgeX - (d[1] - c[1]) * edgeY
      if (cross <= 0) break
      j = nj
    }

    const d1 = distSq(a, hull[j]!)
    if (d1 > maxDist) { maxDist = d1; bestA = i; bestB = j }
    const d2 = distSq(b, hull[j]!)
    if (d2 > maxDist) { maxDist = d2; bestA = ni; bestB = j }
  }

  const p1 = hull[bestA]!
  const p2 = hull[bestB]!
  return {
    p1: [p1[0], p1[1]],
    p2: [p2[0], p2[1]],
    length: Math.sqrt(maxDist),
  }
}

function smoothPoints(points: SpinePoint[], window = 3): SpinePoint[] {
  if (points.length <= 2 || window < 3) return points
  const out: SpinePoint[] = []
  const half = Math.floor(window / 2)
  for (let i = 0; i < points.length; i++) {
    let sx = 0, sy = 0, count = 0
    for (let k = -half; k <= half; k++) {
      const idx = i + k
      if (idx < 0 || idx >= points.length) continue
      sx += points[idx]!.x
      sy += points[idx]!.y
      count++
    }
    const p = points[i]!
    out.push({
      x: sx / count,
      y: sy / count,
      tangentX: p.tangentX,
      tangentY: p.tangentY,
    })
  }
  return out
}

export { smoothPoints }

export function spineScreenLength(screenPoints: Array<{ x: number; y: number }>): number {
  let total = 0
  for (let i = 1; i < screenPoints.length; i++) {
    total += Math.hypot(screenPoints[i]!.x - screenPoints[i - 1]!.x, screenPoints[i]!.y - screenPoints[i - 1]!.y)
  }
  return total
}

/**
 * Максимальный угол поворота между соседними сегментами spine, при превышении
 * которого textPath отбраковывается (fallback на point-label). Соответствует
 * `text-max-angle` в Mapbox/MapLibre style spec.
 *
 * Слишком резкие повороты делают подпись нечитаемой: символы наслаиваются
 * друг на друга или выходят за пределы страны.
 *
 * С прямой spine (rotating calipers) этот параметр был неактивен — прямая
 * всегда даёт 0° поворотов. С curved spine (perpendicular-chord midpoint)
 * per-sample turn для длинных S-shape стран достигает 30-45° — нужно
 * ослабить порог до 60°, чтобы кривая была видна на Норвегии, Италии,
 * Шотландии. 60° всё ещё не позволяет «петли» (U-turn), но разрешает
 * естественные изгибы длинных стран.
 */
export const SPINE_MAX_TURN_DEG = 60

/**
 * Проверяет, есть ли в screen-space spine хотя бы один «острый» поворот —
 * угол между соседними сегментами превышает `maxDeg`.
 *
 * @param screenPoints — проекция spine на экран (длина ≥ 3)
 * @param maxDeg       — порог угла поворота в градусах (по умолчанию 30°)
 * @returns true если найден хоть один резкий поворот
 *
 * Угол = 180° означает прямую линию. Угол 0° — разворот на 180° (u-turn).
 * При maxDeg=30° spine с разворотом > 150° между сегментами отбраковывается.
 *
 * Защитная утилита: текущая `getCountrySpine` всегда возвращает прямую
 * (diameter of convex hull), поэтому в проде функция возвращает false.
 * Реальная польза появится при переходе на curved spine (straight skeleton,
 * medial axis) — резкие изгибы (f-образные страны, Греция, Норвегия) будут
 * автоматически fallback-нуты на point-label.
 */
export function hasSharpSpineTurn(
  screenPoints: Array<{ x: number; y: number }>,
  maxDeg: number = SPINE_MAX_TURN_DEG,
): boolean {
  if (screenPoints.length < 3) return false
  const maxTurn = (maxDeg * Math.PI) / 180
  const minCos = Math.cos(maxTurn)
  for (let i = 1; i < screenPoints.length - 1; i++) {
    const a = screenPoints[i - 1]!
    const b = screenPoints[i]!
    const c = screenPoints[i + 1]!
    const v1x = b.x - a.x
    const v1y = b.y - a.y
    const v2x = c.x - b.x
    const v2y = c.y - b.y
    const len1 = Math.hypot(v1x, v1y)
    const len2 = Math.hypot(v2x, v2y)
    if (len1 < 1e-6 || len2 < 1e-6) continue
    const cos = (v1x * v2x + v1y * v2y) / (len1 * len2)
    const clamped = Math.max(-1, Math.min(1, cos))
    // cos(0°) = 1 (прямая) → НЕ sharp; cos(180°) = -1 (U-turn) → sharp.
    // Порог: если cos < minCos(maxTurn) → turn > maxDeg → sharp.
    if (clamped < minCos) return true
  }
  return false
}

/**
 * Reverses screen-space path so text reads left-to-right at midpoint.
 * SVG textPath follows path direction — if tangent.x at midpoint < 0,
 * the text would render upside down. Returns the same points (or reversed).
 */
export function ensureReadableDirection<T extends { x: number; y: number }>(points: T[]): T[] {
  if (points.length < 2) return points
  const mid = Math.floor(points.length / 2)
  const a = points[mid - 1] ?? points[0]!
  const b = points[mid + 1] ?? points[points.length - 1]!
  const tx = b.x - a.x
  if (tx < 0) return points.slice().reverse()
  return points
}

export function getCountrySpine(country: CountryGeometry, samples = 24): SpinePoint[] {
  const poly = largestPolygon(country)
  if (!poly || poly.outer.length < 3) {
    const c = country.center
    return [{ x: c.x, y: c.y, tangentX: 1, tangentY: 0 }]
  }

  const hull = convexHull(poly.outer)
  if (hull.length < 2) {
    const c = country.center
    return [{ x: c.x, y: c.y, tangentX: 1, tangentY: 0 }]
  }

  const { p1, p2, length } = rotatingCalipersDiameter(hull)
  if (length < 1e-6) {
    return [{ x: p1[0], y: p1[1], tangentX: 1, tangentY: 0 }]
  }

  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const tx = dx / length
  const ty = dy / length

  const n = Math.max(2, Math.floor(samples))
  const result: SpinePoint[] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    result.push({
      x: p1[0] + dx * t,
      y: p1[1] + dy * t,
      tangentX: tx,
      tangentY: ty,
    })
  }
  return result
}

/**
 * Ширина «полосы» вершин (доля от длины длинной оси), используемой
 * `getCurvedSpine` для вычисления центроидов локального сечения.
 *
 * 0.3 = 30% от длины оси. Достаточно, чтобы захватить все вершины основной
 * массы полигона, но не настолько много, чтобы полосы «сливались» в одну
 * на вытянутых странах.
 */
export const SPINE_BAND_FRACTION = 0.3

/**
 * K_fill — коэффициент заполнения оси текстом, аналог `K_fill` из
 * `common/defines.lua` (раздел NGraphics) движка Clausewitz. Определяет,
 * какую долю длины экранной оси (`screenSpineLength`) должен занимать текст.
 *
 * 0.75 — компромисс между EU4 (0.7-0.85) и читаемостью на маленьких экранах.
 * При K_fill=0.7 текст «сжимается» (много пустого места), при 0.85 — буквы
 * могут задевать соседние страны на крупном zoom.
 */
export const MAP_NAME_K_FILL = 0.75

/**
 * Минимальный размер шрифта в пикселях. Аналог `MAP_NAME_MIN_SIZE` из
 * defines.lua (10-12 в EU4). Ниже этого порога:
 * - textPath: fallback на point-label
 * - point-label: скрыть (HIDDEN)
 */
export const MAP_NAME_MIN_SIZE = 11

/**
 * Максимальный размер шрифта в пикселях. Аналог `MAP_NAME_MAX_SIZE` из
 * defines.lua (60-72 в EU4 — там можно показывать «РОССИЯ» во весь экран).
 *
 * У нас 22 потому что:
 * 1. Bundle budget: bundle ~328 KB, на 22px текст всё ещё читаем
 * 2. Мобильный TG viewport: 22px достаточно для типичной карты
 * 3. На больших экранах (4K) масштабирует CSS-ом через `font-size: 0.65em`
 *
 * Для мира целиком (WORLD_METRIC mode) можно поднять до 60+ через
 * отдельный getWorldMetricFontSize (если потребуется).
 */
export const MAP_NAME_MAX_SIZE = 22

/**
 * Глобальный множитель интерфейса, аналог `GUI_scale` из settings.txt.
 * 1.0 = стандартный масштаб. 1.2 / 1.5 = крупный UI.
 *
 * Используется в `getEU4FontSize` для финального умножения размера.
 */
export const MAP_NAME_GUI_SCALE = 1.0

/**
 * MAP_NAME_BORDER_CLAMP — минимальный отступ текста от границы полигона
 * (аналог `MAP_NAME_BORDER_CLAMP = 0.1` из defines.lua EU4).
 *
 * Используется в `getTextPathSpineOffset`: если spine находится на границе
 * (т.е. дистанция до границы < clamp * halfWidth), алгоритм ищет
 * смещение по нормали чтобы отодвинуть spine внутрь полигона.
 *
 * 0.1 = 10% от halfWidth — стандартный EU4-порог, обеспечивающий что
 * буквы не «прилипают» к границе страны.
 */
export const MAP_NAME_BORDER_CLAMP = 0.1

/**
 * MAP_NAME_MAX_LETTER_SPACING — ограничитель шага разрядки из defines.lua
 * (обычно 2.0-2.5 в EU4). Если расчётный шаг между буквами превышает
 * W_font_max * MAX, буквы перестают раздвигаться — текст просто
 * центрируется. Защищает от «рассыпания» слова на отдельные буквы.
 */
export const MAP_NAME_MAX_LETTER_SPACING = 2.0

/**
 * Минимальная допустимая ширина символа для letter-spacing (нижняя граница
 * `Clamp` в формуле Step). Аналог `W_font_max * 0.2` в EU4 (20% от
 * ширины самой широкой буквы). При W<W_max*0.2 буквы сливаются.
 */
export const MAP_NAME_MIN_LETTER_SPACING = 0.2

export interface EU4FontSizeOptions {
  /** Коэффициент заполнения оси (default 0.75) */
  kFill?: number
  /** Минимальный размер в px (default 11) */
  minSize?: number
  /** Максимальный размер в px (default 22) */
  maxSize?: number
  /** Множитель интерфейса (default 1.0) */
  guiScale?: number
}

/**
 * EU4-формула расчёта размера шрифта из defines.lua (раздел NGraphics):
 *
 *   Size = Clamp(L_spine * K_fill / N_chars, MinSize, MaxSize) * GUI_scale
 *
 * Где:
 * - L_spine     — длина экранной оси (пиксели)
 * - K_fill      — доля оси, занимаемая текстом (0.7-0.85 в EU4, у нас 0.75)
 * - N_chars     — количество символов в названии (включая пробелы)
 * - MinSize     — MAP_NAME_MIN_SIZE (10-12 в EU4, у нас 11)
 * - MaxSize     — MAP_NAME_MAX_SIZE (60-72 в EU4, у нас 22)
 * - GUI_scale   — глобальный множитель UI (default 1.0)
 *
 * Семантика: текст пытается занять 75% длины оси, делённые поровну между
 * символами. Чем длиннее название — тем мельче буквы. Для коротких имён
 * (например, «Перу») на длинной оси получается крупный шрифт.
 *
 * Защитные проверки:
 * - numChars <= 0 → fallback на minSize
 * - spineLen <= 0 → fallback на minSize
 * - K_fill зажат в (0, 1]
 * - guiScale зажат в (0, 4]
 *
 * @param spineLen — длина экранной оси в пикселях
 * @param numChars — длина строки (включая пробелы)
 * @param opts     — опции (см. EU4FontSizeOptions)
 * @returns размер шрифта в пикселях, зажат в [minSize, maxSize] * guiScale
 */
export function getEU4FontSize(
  spineLen: number,
  numChars: number,
  opts: EU4FontSizeOptions = {},
): number {
  const kFill = Math.max(0.01, Math.min(1, opts.kFill ?? MAP_NAME_K_FILL))
  const minSize = opts.minSize ?? MAP_NAME_MIN_SIZE
  const maxSize = opts.maxSize ?? MAP_NAME_MAX_SIZE
  const guiScale = Math.max(0.01, Math.min(4, opts.guiScale ?? MAP_NAME_GUI_SCALE))

  if (spineLen <= 0 || numChars <= 0) return minSize * guiScale

  const ideal = (spineLen * kFill) / numChars
  return Math.max(minSize, Math.min(maxSize, ideal)) * guiScale
}

export interface EU4LetterSpacingOptions {
  /** Коэффициент заполнения (default 0.75) */
  kFill?: number
  /** Множитель минимального шага (default 0.2) */
  minStepMul?: number
  /** Множитель максимального шага (default 2.0) */
  maxStepMul?: number
}

/**
 * EU4-формула трекинга/разрядки из .font-файлов:
 *
 *   Step = Clamp(L_spine * K_fill / (N_chars - 1), W_font_max * 0.2,
 *                W_font_max * MAP_NAME_MAX_LETTER_SPACING)
 *
 * Где:
 * - L_spine     — длина экранной оси
 * - K_fill      — доля заполнения (default 0.75)
 * - N_chars-1   — количество ПРОМЕЖУТКОВ между символами
 * - W_font_max  — номинальная ширина самой широкой буквы (≈ fontSize * 0.7)
 * - 0.2         — нижняя граница: 20% от ширины буквы (буквы не сливаются)
 * - 2.0         — верхняя граница: 2x ширины буквы (слово не «рассыпается»)
 *
 * Возвращает шаг в пикселях. Применяется как `letter-spacing` для SVG textPath
 * и DOM div. При numChars <= 1 возвращает 0 (промежутков нет).
 *
 * @param spineLen    — длина экранной оси в пикселях
 * @param numChars    — длина строки (>= 1)
 * @param fontWidth   — ширина самой широкой буквы (обычно fontSize * 0.7)
 * @param opts        — опции (см. EU4LetterSpacingOptions)
 * @returns шаг в пикселях, зажат в [fontWidth*0.2, fontWidth*2.0]
 */
export function getEU4LetterSpacing(
  spineLen: number,
  numChars: number,
  fontWidth: number,
  opts: EU4LetterSpacingOptions = {},
): number {
  const kFill = Math.max(0.01, Math.min(1, opts.kFill ?? MAP_NAME_K_FILL))
  const minMul = Math.max(0.05, Math.min(1, opts.minStepMul ?? MAP_NAME_MIN_LETTER_SPACING))
  const maxMul = Math.max(minMul, Math.min(5, opts.maxStepMul ?? MAP_NAME_MAX_LETTER_SPACING))

  if (numChars <= 1 || spineLen <= 0 || fontWidth <= 0) return 0

  const ideal = (spineLen * kFill) / (numChars - 1)
  const min = fontWidth * minMul
  const max = fontWidth * maxMul
  return Math.max(min, Math.min(max, ideal))
}

/**
 * Размер окна Moving Average (в точках) для сглаживания curved spine.
 * Должен быть нечётным, ≥ 3. Окно 5 — компромисс между агрессивным
 * сглаживанием (съедает повороты) и лёгким (не убирает шум вершин).
 * С окном 3 per-sample turn для длинных S-shape стран (Норвегия, Италия)
 * превышает `SPINE_MAX_TURN_DEG` и spine отбраковывается — нужно
 * более сильное сглаживание.
 */
export const SPINE_SMOOTH_WINDOW = 5

/**
 * Расстояние от точки `start` до границы полигона в направлении `dir`
 * (единичный вектор). Использует `pointInPolygonWithHoles` + бинарный поиск
 * для точного нахождения границы. Требует, чтобы `start` был ВНУТРИ
 * полигона (иначе возвращает 0).
 *
 * Экспортируется, потому что используется и в `getCurvedSpine`, и в
 * `getTextPathSpineOffset` (textPathWrap.ts) для вычисления
 * `MAP_NAME_BORDER_CLAMP * halfWidth`.
 *
 * @param start    — точка старта (должна быть внутри полигона)
 * @param dir      — единичный вектор направления
 * @param outer    — внешнее кольцо полигона
 * @param holes    — массив дыр
 * @param maxProbe — начальный максимальный радиус поиска (default 1000)
 * @returns расстояние до границы в указанном направлении
 */
export function distanceToBoundary(
  start: { x: number; y: number },
  dir: { x: number; y: number },
  outer: number[][],
  holes: number[][][],
  maxProbe = 1000,
): number {
  // Linear probe to find upper bound (doubling)
  let upper = 1
  let probeX = start.x + dir.x * upper
  let probeY = start.y + dir.y * upper
  while (pointInPolygonWithHoles(probeX, probeY, outer, holes) && upper < maxProbe) {
    upper *= 2
    probeX = start.x + dir.x * upper
    probeY = start.y + dir.y * upper
  }
  if (upper >= maxProbe) return maxProbe

  // Binary search between (upper/2) and upper
  let lo = upper / 2
  let hi = upper
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    probeX = start.x + dir.x * mid
    probeY = start.y + dir.y * mid
    if (pointInPolygonWithHoles(probeX, probeY, outer, holes)) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

/**
 * Curved spine (упрощённая аппроксимация straight skeleton / medial axis).

/**
 * Curved spine (упрощённая аппроксимация straight skeleton / medial axis).
 *
 * Алгоритм (perpendicular-chord midpoint):
 * 1. Берём длинную ось (rotating calipers на convex hull) — это прямая
 *    ось `getCountrySpine`.
 * 2. Для каждой sample-точки вдоль оси кастуем луч перпендикулярно оси
 *    в ОБЕ стороны (+n и -n) и находим расстояние до границы полигона
 *    (бинарный поиск + `pointInPolygonWithHoles`).
 * 3. Середина chord = axis_point + ((distMinus - distPlus) / 2) * n.
 *    Для симметричного сечения полигона обе дистанции равны → spine
 *    на оси. Для асимметричного (Италия, Норвегия) spine смещается
 *    в сторону «узкой» части — в сторону медиальной оси.
 * 4. Сглаживаем Moving Average (окно = `smoothWindow`).
 * 5. Пересчитываем per-sample тангенс по соседним точкам сглаженной
 *    кривой — иначе буквы textPath поедут по старому прямому тангенсу.
 *
 * Для выпуклых стран результат ≈ прямая (визуально неотличимо). Для
 * вытянутых несимметричных — плавная кривая через «жирную» середину.
 *
 * Полный straight skeleton (Aichholzer 1995, O(n^3) Voronoi) для нашего
 * бюджета (~1 KB gzip) — overkill. Эта функция — компромисс: ~1 KB,
 * O(n_samples × log(distance) × pointInPolygon) на полигон, читаемая
 * кривизна.
 *
 * Fallback: если полигон < 3 вершин ИЛИ convex hull < 2 точек ИЛИ длина
 * оси < 1e-6 — возвращаем `getCountrySpine` (прямая). Гарантирует, что
 * функция никогда не вернёт мусор для вырожденных данных.
 *
 * @param country       — геометрия страны
 * @param samples       — количество точек на spine (по умолчанию 24)
 * @param _bandFraction — зарезервировано (не используется в ray-cast версии)
 * @param smoothWindow  — окно Moving Average (default 3, должно быть ≥ 3)
 * @returns массив SpinePoint с плавной кривой и per-sample тангенсами
 *
 * @see ADR-0012-curved-spine
 */
export function getCurvedSpine(
  country: CountryGeometry,
  samples = 24,
  smoothWindow = SPINE_SMOOTH_WINDOW,
): SpinePoint[] {
  const poly = largestPolygon(country)
  if (!poly || poly.outer.length < 3) {
    return getCountrySpine(country, samples)
  }

  const hull = convexHull(poly.outer)
  if (hull.length < 2) {
    return getCountrySpine(country, samples)
  }

  const { p1, p2, length } = rotatingCalipersDiameter(hull)
  if (length < 1e-6) {
    return getCountrySpine(country, samples)
  }

  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const tx = dx / length
  const ty = dy / length
  // Perpendicular (90° CCW rotation of tangent)
  const nx = -ty
  const ny = tx

  const clampedWindow = Math.max(3, smoothWindow | 0 || 3)
  const half = Math.floor(clampedWindow / 2)
  const n = Math.max(2, Math.floor(samples))

  // For each sample, compute perpendicular-chord midpoint via ray-cast
  const raw: Array<{ x: number; y: number }> = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    const ax = p1[0] + dx * t
    const ay = p1[1] + dy * t
    const start = { x: ax, y: ay }

    // Cast rays in both perpendicular directions
    const distPlus = distanceToBoundary(start, { x: nx, y: ny }, poly.outer, poly.holes)
    const distMinus = distanceToBoundary(start, { x: -nx, y: -ny }, poly.outer, poly.holes)

    // If both rays escape immediately (axis point is outside polygon),
    // fall back to axis point
    if (distPlus < 1e-3 && distMinus < 1e-3) {
      raw.push({ x: ax, y: ay })
      continue
    }

    // Midpoint shift: positive shift means axis is closer to -n side
    // (poly is "thinner" in +n direction). Move spine point in -n direction
    // by half the asymmetry.
    const shift = (distMinus - distPlus) / 2
    raw.push({ x: ax + nx * shift, y: ay + ny * shift })
  }

  // Moving Average smoothing
  const smoothed: Array<{ x: number; y: number }> = []
  for (let i = 0; i < n; i++) {
    let sx = 0
    let sy = 0
    let count = 0
    for (let k = -half; k <= half; k++) {
      const idx = i + k
      if (idx < 0 || idx >= n) continue
      sx += raw[idx]!.x
      sy += raw[idx]!.y
      count++
    }
    smoothed.push({ x: sx / count, y: sy / count })
  }

  // Build SpinePoint[] with per-sample tangent from neighbors
  const result: SpinePoint[] = []
  for (let i = 0; i < n; i++) {
    const prev = smoothed[Math.max(0, i - 1)]!
    const next = smoothed[Math.min(n - 1, i + 1)]!
    const tdx = next.x - prev.x
    const tdy = next.y - prev.y
    const tlen = Math.hypot(tdx, tdy)
    let tnx = tx
    let tny = ty
    if (tlen > 1e-6) {
      tnx = tdx / tlen
      tny = tdy / tlen
    }
    result.push({ x: smoothed[i]!.x, y: smoothed[i]!.y, tangentX: tnx, tangentY: tny })
  }
  return result
}

const _spineWp = new THREE.Vector3()

export interface ScreenSpineResult {
  readable: Array<{ x: number; y: number }>
  screenLen: number
  visibleCount: number
}

/**
 * Проецирует мировые точки spine на экран, отбрасывая невидимые (за камерой),
 * выпрямляет направление (LTR для SVG textPath) и считает screen-length.
 *
 * Невидимые точки отбрасываются ДО ensureReadableDirection, чтобы spine за
 * краем экрана не «утаскивал» направление в неверную сторону и не делал
 * screenLen мусорным.
 *
 * @returns readable  — массив видимых screen-точек в читаемом направлении
 * @returns screenLen — суммарная длина в пикселях (0 если readable.length < 2)
 * @returns visibleCount — количество видимых точек до ensureReadableDirection
 */
export function buildScreenSpine(
  spineWorld: SpinePoint[],
  camera: THREE.Camera,
  viewport: Viewport,
): ScreenSpineResult {
  const screen: Array<{ x: number; y: number }> = []
  for (const sp of spineWorld) {
    _spineWp.set(sp.x, 0.5, -sp.y)
    const p = projectWorldToScreen(_spineWp, camera, viewport)
    if (!p.visible) continue
    screen.push({ x: p.x, y: p.y })
  }
  const visibleCount = screen.length
  const readable = ensureReadableDirection(screen)
  const screenLen = readable.length >= 2 ? spineScreenLength(readable) : 0
  return { readable, screenLen, visibleCount }
}
