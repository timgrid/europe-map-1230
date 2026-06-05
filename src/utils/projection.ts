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
  _v.copy(worldPos).project(camera)
  const x = (_v.x * 0.5 + 0.5) * viewport.width
  const y = (-_v.y * 0.5 + 0.5) * viewport.height
  const visible = _v.z > -1 && _v.z < 1

  const distance = camera.position.distanceTo(worldPos)
  const fovRad = (camera.fov * Math.PI) / 180
  const worldHeightAtPoint = 2 * distance * Math.tan(fovRad / 2)
  const worldUnitsPerPixel = worldHeightAtPoint / Math.max(1, viewport.height)

  return { x, y, visible, worldUnitsPerPixel }
}

const SHOW_THRESHOLD_PX = 35
const HIDE_THRESHOLD_PX = 25
const MIN_FONT_PX = 11
const MAX_FONT_PX = 40
const COUNTRY_FILL_RATIO = 0.40

export function getLabelFontSize(
  countryWidthWorld: number,
  worldUnitsPerPixel: number,
  wasVisible: boolean,
): number | null {
  if (worldUnitsPerPixel <= 0) return null
  const countryWidthPx = countryWidthWorld / worldUnitsPerPixel
  const threshold = wasVisible ? HIDE_THRESHOLD_PX : SHOW_THRESHOLD_PX
  if (countryWidthPx < threshold) return null
  const target = countryWidthPx * COUNTRY_FILL_RATIO
  return Math.max(MIN_FONT_PX, Math.min(MAX_FONT_PX, target))
}
