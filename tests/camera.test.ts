// Purpose: тесты расчёта начальной позиции камеры и размера карты
import { describe, it, expect } from 'vitest'
import { getMapSize, getInitialCameraConfig } from '../src/utils/camera'
import type { ProcessedData } from '../src/utils/dataLoader'

function makeData(overrides: Partial<ProcessedData> = {}): ProcessedData {
  return {
    year: 1200,
    bounds: { minX: -10, maxX: 10, minY: -10, maxY: 10 },
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    countries: [],
    ...overrides,
  }
}

describe('getMapSize', () => {
  it('returns width and height from bounds * scale', () => {
    const data = makeData({
      bounds: { minX: 0, maxX: 100, minY: 0, maxY: 50 },
      scale: 2,
    })
    const s = getMapSize(data)
    expect(s.width).toBe(200)
    expect(s.height).toBe(100)
  })

  it('handles negative bounds (lat/lon ranges)', () => {
    const data = makeData({
      bounds: { minX: -30, maxX: 50, minY: -10, maxY: 40 },
      scale: 1,
    })
    const s = getMapSize(data)
    expect(s.width).toBe(80)
    expect(s.height).toBe(50)
  })

  it('returns zero for degenerate bounds', () => {
    const data = makeData({
      bounds: { minX: 5, maxX: 5, minY: 5, maxY: 5 },
      scale: 1,
    })
    const s = getMapSize(data)
    expect(s.width).toBe(0)
    expect(s.height).toBe(0)
  })
})

describe('getInitialCameraConfig', () => {
  it('returns positive distance, yOffset, zOffset', () => {
    const r = getInitialCameraConfig({ mapWidth: 300, mapHeight: 222, fov: 20, aspect: 16 / 9 })
    expect(r.distance).toBeGreaterThan(0)
    expect(r.yOffset).toBeGreaterThan(0)
    expect(r.zOffset).toBeGreaterThan(0)
  })

  it('yOffset² + zOffset² ≈ distance² (right triangle)', () => {
    const r = getInitialCameraConfig({ mapWidth: 300, mapHeight: 222, fov: 20, aspect: 16 / 9 })
    const reconstructed = Math.sqrt(r.yOffset ** 2 + r.zOffset ** 2)
    expect(reconstructed).toBeCloseTo(r.distance, 5)
  })

  it('preserves polarAngle', () => {
    const r = getInitialCameraConfig({
      mapWidth: 300, mapHeight: 222, fov: 20, aspect: 16 / 9, polarAngle: 0.3,
    })
    expect(r.polarAngle).toBe(0.3)
  })

  it('portrait aspect requires more distance than landscape', () => {
    const landscape = getInitialCameraConfig({ mapWidth: 300, mapHeight: 222, fov: 20, aspect: 16 / 9 })
    const portrait = getInitialCameraConfig({ mapWidth: 300, mapHeight: 222, fov: 20, aspect: 9 / 16 })
    expect(portrait.distance).toBeGreaterThan(landscape.distance)
  })

  it('taller map requires more distance (height-limited case)', () => {
    const short = getInitialCameraConfig({ mapWidth: 300, mapHeight: 100, fov: 20, aspect: 16 / 9 })
    const tall = getInitialCameraConfig({ mapWidth: 300, mapHeight: 400, fov: 20, aspect: 16 / 9 })
    expect(tall.distance).toBeGreaterThan(short.distance)
  })

  it('wider map requires more distance (width-limited case)', () => {
    const narrow = getInitialCameraConfig({ mapWidth: 100, mapHeight: 222, fov: 20, aspect: 16 / 9 })
    const wide = getInitialCameraConfig({ mapWidth: 500, mapHeight: 222, fov: 20, aspect: 16 / 9 })
    expect(wide.distance).toBeGreaterThan(narrow.distance)
  })

  it('padding multiplier scales distance linearly', () => {
    const tight = getInitialCameraConfig({ mapWidth: 300, mapHeight: 222, fov: 20, aspect: 16 / 9, padding: 1.0 })
    const padded = getInitialCameraConfig({ mapWidth: 300, mapHeight: 222, fov: 20, aspect: 16 / 9, padding: 1.5 })
    expect(padded.distance / tight.distance).toBeCloseTo(1.5, 2)
  })

  it('larger fov allows smaller distance (more visible per unit)', () => {
    const narrowFov = getInitialCameraConfig({ mapWidth: 300, mapHeight: 222, fov: 18, aspect: 16 / 9 })
    const wideFov = getInitialCameraConfig({ mapWidth: 300, mapHeight: 222, fov: 30, aspect: 16 / 9 })
    expect(wideFov.distance).toBeLessThan(narrowFov.distance)
  })

  it('clamps distance to maxDistance on extreme portrait', () => {
    const r = getInitialCameraConfig({
      mapWidth: 300, mapHeight: 222, fov: 20, aspect: 9 / 16, maxDistance: 1000,
    })
    expect(r.distance).toBeLessThanOrEqual(1000)
  })

  it('clamps distance to minDistance for tiny maps', () => {
    const r = getInitialCameraConfig({
      mapWidth: 1, mapHeight: 1, fov: 20, aspect: 16 / 9, minDistance: 500,
    })
    expect(r.distance).toBeGreaterThanOrEqual(500)
  })

  it('realistic 1200 map (300x222) on 16:9 desktop yields distance 700-800', () => {
    const r = getInitialCameraConfig({
      mapWidth: 300, mapHeight: 222, fov: 20, aspect: 16 / 9, padding: 1.15, polarAngle: 0.2,
    })
    expect(r.distance).toBeGreaterThan(700)
    expect(r.distance).toBeLessThan(800)
  })

  it('1530 map (300x279, taller) needs more distance than 1300 map (300x130)', () => {
    const d1300 = getInitialCameraConfig({ mapWidth: 300, mapHeight: 130, fov: 20, aspect: 16 / 9 })
    const d1530 = getInitialCameraConfig({ mapWidth: 300, mapHeight: 279, fov: 20, aspect: 16 / 9 })
    expect(d1530.distance).toBeGreaterThan(d1300.distance)
  })
})
