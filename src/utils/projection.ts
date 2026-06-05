// Purpose: проецирование 3D-точки в screen-space + расчёт fontSize подписи с гистерезисом (как в EU4)
import * as THREE from 'three'

export interface Viewport {
  width: number
  height: number
}

export interface CameraSnapshot {
  position: THREE.Vector3
  fov: number
  viewport: Viewport
}

export interface ProjectionResult {
  x: number                  // screen X in pixels
  y: number                  // screen Y in pixels
  visible: boolean           // whether point is within camera frustum
  worldUnitsPerPixel: number // for sizing labels proportionally to country size
}

export function makeCameraSnapshot(
  position: THREE.Vector3,
  fov: number,
  viewport: Viewport,
): CameraSnapshot {
  return { position: position.clone(), fov, viewport: { ...viewport } }
}

const _v = new THREE.Vector3()

export function projectWorldToScreen(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  viewport: Viewport,
): ProjectionResult {
  const persp = camera as THREE.PerspectiveCamera
  _v.copy(worldPos).project(camera)
  const x = (_v.x * 0.5 + 0.5) * viewport.width
  const y = (-_v.y * 0.5 + 0.5) * viewport.height
  const visible = _v.z > -1 && _v.z < 1

  const distance = camera.position.distanceTo(worldPos)
  const fovRad = (persp.fov * Math.PI) / 180
  const worldHeightAtPoint = 2 * distance * Math.tan(fovRad / 2)
  const worldUnitsPerPixel = worldHeightAtPoint / Math.max(1, viewport.height)

  return { x, y, visible, worldUnitsPerPixel }
}

const SHOW_THRESHOLD_PX = 30
const HIDE_THRESHOLD_PX = 22
const MIN_FONT_PX = 11
const MAX_FONT_PX = 22        // cap → prevents giant boxes blocking neighbors
const DETAILED_FILL_RATIO = 0.30
const UNIFIED_FILL_RATIO = 0.24  // even tighter — show more countries

export function getLabelFontSize(
  countryWidthWorld: number,
  worldUnitsPerPixel: number,
  wasVisible: boolean,
  layer: 'detailed' | 'unified' = 'detailed',
): number | null {
  if (worldUnitsPerPixel <= 0) return null
  const countryWidthPx = countryWidthWorld / worldUnitsPerPixel
  const threshold = wasVisible ? HIDE_THRESHOLD_PX : SHOW_THRESHOLD_PX
  if (countryWidthPx < threshold) return null
  const ratio = layer === 'unified' ? UNIFIED_FILL_RATIO : DETAILED_FILL_RATIO
  const target = countryWidthPx * ratio
  return Math.max(MIN_FONT_PX, Math.min(MAX_FONT_PX, target))
}

// EU4-style font size for SVG textPath mode.
// Targets ~15 pixels of text per 1 pixel of font size — a 100px spine
// yields a ~6.7px font, a 150px spine ~10px, 330px spine ~22px (capped).
const TEXTPATH_FONT_DIVISOR = 15
const TEXTPATH_FONT_MIN = MIN_FONT_PX
const TEXTPATH_FONT_MAX = MAX_FONT_PX

export function getTextPathFontSize(screenSpineLengthPx: number): number | null {
  if (screenSpineLengthPx <= 0) return null
  const target = screenSpineLengthPx / TEXTPATH_FONT_DIVISOR
  return Math.max(TEXTPATH_FONT_MIN, Math.min(TEXTPATH_FONT_MAX, target))
}
