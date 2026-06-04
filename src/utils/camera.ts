// Purpose: расчёт начальной позиции камеры по размеру карты, fov, aspect ratio, padding
import type { ProcessedData } from './dataLoader'

export interface CameraFitConfig {
  mapWidth: number
  mapHeight: number
  fov: number
  aspect: number
  padding?: number
  polarAngle?: number
  minDistance?: number
  maxDistance?: number
}

export interface CameraFitResult {
  distance: number
  yOffset: number
  zOffset: number
  polarAngle: number
}

const DEFAULTS = {
  padding: 1.15,
  polarAngle: 0.2,
  minDistance: 100,
  maxDistance: 1500,
} as const

export function getMapSize(data: ProcessedData): { width: number; height: number } {
  const b = data.bounds
  return {
    width: (b.maxX - b.minX) * data.scale,
    height: (b.maxY - b.minY) * data.scale,
  }
}

export function getInitialCameraConfig(config: CameraFitConfig): CameraFitResult {
  const {
    mapWidth,
    mapHeight,
    fov,
    aspect,
    padding = DEFAULTS.padding,
    polarAngle = DEFAULTS.polarAngle,
    minDistance = DEFAULTS.minDistance,
    maxDistance = DEFAULTS.maxDistance,
  } = config

  const vFovRad = (fov * Math.PI) / 180
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect)
  const cosTilt = Math.cos(polarAngle)

  const dForWidth = (mapWidth / 2) / Math.tan(hFovRad / 2) / cosTilt * padding
  const dForHeight = (mapHeight / 2) / Math.tan(vFovRad / 2) / cosTilt * padding

  const raw = Math.max(dForWidth, dForHeight)
  const distance = Math.max(minDistance, Math.min(maxDistance, raw))

  return {
    distance,
    yOffset: distance * Math.cos(polarAngle),
    zOffset: distance * Math.sin(polarAngle),
    polarAngle,
  }
}
