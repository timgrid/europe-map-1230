import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  convexHull,
  rotatingCalipersDiameter,
  getCountrySpine,
  ensureReadableDirection,
  buildScreenSpine,
  spineScreenLength,
  type SpinePoint,
} from '../src/utils/spine'
import { parseEuropeGeoJSON, type CountryGeometry } from '../src/utils/geoParser'
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

function polyFromOuter(outer: number[][]) {
  return { outer, holes: [] as number[][][] }
}

function squarePolygon(cx: number, cy: number, size: number) {
  const s = size / 2
  return polyFromOuter([
    [cx - s, cy - s],
    [cx + s, cy - s],
    [cx + s, cy + s],
    [cx - s, cy + s],
    [cx - s, cy - s],
  ])
}

function makeGeom(polygons: { outer: number[][]; holes: number[][][] }[]): CountryGeometry {
  const data = makeData({
    countries: [
      { id: 'x', name: 'X', color: '#000', center: [0, 0], polygons },
    ],
  })
  return parseEuropeGeoJSON(data)[0]!
}

describe('convexHull', () => {
  it('returns empty for empty input', () => {
    expect(convexHull([])).toEqual([])
  })

  it('returns single point for single point', () => {
    const h = convexHull([[5, 5]])
    expect(h).toEqual([[5, 5]])
  })

  it('returns two points for two points', () => {
    const h = convexHull([[1, 1], [3, 3]])
    expect(h).toHaveLength(2)
  })

  it('returns 4 corners of a square (no duplicates)', () => {
    const h = convexHull([
      [0, 0], [10, 0], [10, 10], [0, 10],
    ])
    expect(h).toHaveLength(4)
    const sorted = h.map((p) => p[0] + ',' + p[1]).sort()
    expect(sorted).toEqual(['0,0', '0,10', '10,0', '10,10'])
  })

  it('ignores interior points', () => {
    const h = convexHull([
      [0, 0], [10, 0], [10, 10], [0, 10],
      [5, 5], [3, 7], [7, 3],
    ])
    expect(h).toHaveLength(4)
  })

  it('handles collinear points (degenerate but stable)', () => {
    const h = convexHull([
      [0, 0], [5, 0], [10, 0],
    ])
    expect(h.length).toBeGreaterThanOrEqual(2)
  })
})

describe('rotatingCalipersDiameter', () => {
  it('returns 0 for single point', () => {
    const d = rotatingCalipersDiameter([[5, 5]])
    expect(d.length).toBe(0)
  })

  it('returns the only edge for two points', () => {
    const d = rotatingCalipersDiameter([[0, 0], [3, 4]])
    expect(d.length).toBeCloseTo(5, 5)
    expect(d.p1).toEqual([0, 0])
    expect(d.p2).toEqual([3, 4])
  })

  it('returns diagonal of a square (longer than side)', () => {
    const d = rotatingCalipersDiameter([
      [0, 0], [10, 0], [10, 10], [0, 10],
    ])
    expect(d.length).toBeCloseTo(Math.sqrt(200), 5)
  })

  it('returns diagonal of elongated rectangle (longest chord)', () => {
    const hull = convexHull([
      [0, 0], [100, 0], [100, 5], [0, 5],
    ])
    const d = rotatingCalipersDiameter(hull)
    expect(d.length).toBeCloseTo(Math.sqrt(100 * 100 + 5 * 5), 5)
  })

  it('returns side of equilateral triangle (max chord = side)', () => {
    const hull = convexHull([
      [0, 0], [10, 0], [5, 5 * Math.sqrt(3)],
    ])
    const d = rotatingCalipersDiameter(hull)
    expect(d.length).toBeCloseTo(10, 5)
  })
})

describe('getCountrySpine', () => {
  it('returns single point for empty shape', () => {
    const geom = makeGeom([polyFromOuter([])])
    const spine = getCountrySpine(geom)
    expect(spine).toHaveLength(1)
  })

  it('returns requested number of samples for a square', () => {
    const geom = makeGeom([squarePolygon(0, 0, 10)])
    const spine = getCountrySpine(geom, 24)
    expect(spine).toHaveLength(24)
  })

  it('spine is a straight line (tangent constant) for a square', () => {
    const geom = makeGeom([squarePolygon(0, 0, 10)])
    const spine = getCountrySpine(geom, 24)
    const t0 = spine[0]!
    for (let i = 1; i < spine.length; i++) {
      expect(spine[i]!.tangentX).toBeCloseTo(t0.tangentX, 5)
      expect(spine[i]!.tangentY).toBeCloseTo(t0.tangentY, 5)
    }
  })

  it('spine fits within bounding box', () => {
    const geom = makeGeom([squarePolygon(0, 0, 10)])
    const spine = getCountrySpine(geom, 24)
    for (const p of spine) {
      expect(p.x).toBeGreaterThanOrEqual(-5.5)
      expect(p.x).toBeLessThanOrEqual(5.5)
      expect(p.y).toBeGreaterThanOrEqual(-5.5)
      expect(p.y).toBeLessThanOrEqual(5.5)
    }
  })

  it('spine length matches diameter for a square', () => {
    const geom = makeGeom([squarePolygon(0, 0, 10)])
    const spine = getCountrySpine(geom, 100)
    let totalLen = 0
    for (let i = 1; i < spine.length; i++) {
      totalLen += Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y)
    }
    expect(totalLen).toBeCloseTo(Math.sqrt(200), 1)
  })

  it('uses largest polygon for multi-polygon country', () => {
    const geom = makeGeom([
      squarePolygon(-100, -100, 2),
      squarePolygon(0, 0, 10),
    ])
    const spine = getCountrySpine(geom, 24)
    let totalLen = 0
    for (let i = 1; i < spine.length; i++) {
      totalLen += Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y)
    }
    expect(totalLen).toBeCloseTo(Math.sqrt(200), 1)
  })

  it('tangent is unit length for any polygon', () => {
    const geom = makeGeom([squarePolygon(0, 0, 10)])
    const spine = getCountrySpine(geom, 24)
    for (const p of spine) {
      const len = Math.hypot(p.tangentX, p.tangentY)
      expect(len).toBeCloseTo(1, 5)
    }
  })
})

describe('ensureReadableDirection', () => {
  it('returns single point unchanged', () => {
    const p = [{ x: 5, y: 5 }]
    expect(ensureReadableDirection(p)).toBe(p)
  })

  it('keeps left-to-right path unchanged', () => {
    const pts = [
      { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 },
    ]
    const result = ensureReadableDirection(pts)
    expect(result).toBe(pts)
    expect(result[0]?.x).toBe(0)
    expect(result[2]?.x).toBe(10)
  })

  it('reverses right-to-left path so text reads left-to-right', () => {
    const pts = [
      { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 0 },
    ]
    const result = ensureReadableDirection(pts)
    expect(result[0]?.x).toBe(0)
    expect(result[2]?.x).toBe(10)
  })

  it('keeps steeply-upward (left-to-right tilted) path unchanged', () => {
    const pts = [
      { x: 0, y: 100 }, { x: 5, y: 50 }, { x: 10, y: 0 },
    ]
    const result = ensureReadableDirection(pts)
    expect(result).toBe(pts)
  })

  it('reverses steeply-upward (right-to-left tilted) path', () => {
    const pts = [
      { x: 10, y: 0 }, { x: 5, y: 50 }, { x: 0, y: 100 },
    ]
    const result = ensureReadableDirection(pts)
    expect(result[0]?.x).toBe(0)
    expect(result[0]?.y).toBe(100)
  })

  it('keeps pure vertical path (tangent.x = 0) unchanged', () => {
    const pts = [
      { x: 5, y: 0 }, { x: 5, y: 5 }, { x: 5, y: 10 },
    ]
    const result = ensureReadableDirection(pts)
    expect(result).toBe(pts)
  })

  it('does not mutate input array', () => {
    const pts = [
      { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 0 },
    ]
    const original = pts.slice()
    ensureReadableDirection(pts)
    expect(pts).toEqual(original)
  })
})

describe('spineScreenLength', () => {
  it('returns 0 for empty array', () => {
    expect(spineScreenLength([])).toBe(0)
  })

  it('returns 0 for single point', () => {
    expect(spineScreenLength([{ x: 0, y: 0 }])).toBe(0)
  })

  it('sums euclidean distance between consecutive points', () => {
    // 3+4+5 = 12 (3-4-5 triangle across 3 segments)
    expect(spineScreenLength([
      { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 9 },
    ])).toBeCloseTo(12, 5)
  })

  it('returns positive length for horizontal path', () => {
    expect(spineScreenLength([{ x: 0, y: 5 }, { x: 100, y: 5 }])).toBe(100)
  })
})

describe('buildScreenSpine', () => {
  function makeCam(z = 100): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(20, 16 / 9, 0.1, 2000)
    cam.position.set(0, 0, z)
    cam.lookAt(0, 0, 0)
    cam.updateMatrixWorld()
    return cam
  }

  const viewport = { width: 1920, height: 1080 }

  function makeSpine(n: number, xRange: [number, number] = [-50, 50]): SpinePoint[] {
    const out: SpinePoint[] = []
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1)
      out.push({
        x: xRange[0] + (xRange[1] - xRange[0]) * t,
        y: 0,
        tangentX: 1,
        tangentY: 0,
      })
    }
    return out
  }

  it('returns all visible points for a country in front of camera', () => {
    const cam = makeCam(100)
    const spine = makeSpine(10, [-30, 30])
    const result = buildScreenSpine(spine, cam, viewport)
    expect(result.visibleCount).toBe(10)
    expect(result.readable.length).toBe(10)
    expect(result.screenLen).toBeGreaterThan(0)
  })

  it('drops all points when camera is behind the country', () => {
    // Country at z=0, camera at z=+100 looking at +z means country is "behind" camera (in world)
    // But our convention: map is on XZ plane, world Y in our spine helper is negated (y -> -y becomes z=0.5)
    // The function projects (x, 0.5, -y) to screen. If -y is large positive (z behind camera), points are invisible.
    const cam = new THREE.PerspectiveCamera(20, 16 / 9, 0.1, 2000)
    cam.position.set(0, 0, 100)
    cam.lookAt(0, 0, 500)  // look away from country
    cam.updateMatrixWorld()
    const spine = makeSpine(5, [-10, 10])
    const result = buildScreenSpine(spine, cam, viewport)
    expect(result.visibleCount).toBe(0)
    expect(result.readable.length).toBe(0)
    expect(result.screenLen).toBe(0)
  })

  it('returns 0 screenLen for a single visible point (need >= 2)', () => {
    // Country way off to the side, almost no points visible
    const cam = makeCam(100)
    const spine: SpinePoint[] = [{ x: 0, y: 0, tangentX: 1, tangentY: 0 }]
    const result = buildScreenSpine(spine, cam, viewport)
    expect(result.visibleCount).toBe(1)
    expect(result.screenLen).toBe(0)
  })

  it('returns readable points in left-to-right order', () => {
    const cam = makeCam(100)
    const spine = makeSpine(5, [-50, 50])
    const result = buildScreenSpine(spine, cam, viewport)
    for (let i = 1; i < result.readable.length; i++) {
      expect(result.readable[i]!.x).toBeGreaterThan(result.readable[i - 1]!.x)
    }
  })

  it('screenLen scales with country size (larger xRange = longer screenLen)', () => {
    const cam = makeCam(100)
    const small = buildScreenSpine(makeSpine(5, [-10, 10]), cam, viewport)
    const large = buildScreenSpine(makeSpine(5, [-50, 50]), cam, viewport)
    expect(large.screenLen).toBeGreaterThan(small.screenLen)
  })

  it('screenLen matches spineScreenLength of readable points', () => {
    const cam = makeCam(100)
    const result = buildScreenSpine(makeSpine(8, [-40, 40]), cam, viewport)
    const manual = spineScreenLength(result.readable)
    expect(result.screenLen).toBeCloseTo(manual, 5)
  })
})
