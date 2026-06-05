import { describe, it, expect } from 'vitest'
import {
  convexHull,
  rotatingCalipersDiameter,
  getCountrySpine,
  ensureReadableDirection,
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
