// Purpose: spine (главная ось) полигона страны для рендера подписей в стиле EU4 (text-along-path) | convex hull + rotating calipers + sample
import * as THREE from 'three'
import { projectWorldToScreen, type Viewport } from './projection'
import { largestPolygon, type CountryGeometry } from './geoParser'

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
 */
export const SPINE_MAX_TURN_DEG = 30

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
