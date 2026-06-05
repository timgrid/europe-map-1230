import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  parseEuropeGeoJSON,
  getMapCenter,
  createExtrudedGeometry,
  createEdgeGeometry,
  getCountryBounds,
  getInteriorPoint,
  type CountryGeometry,
} from '../src/utils/geoParser'
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

function squarePolygon(cx: number, cy: number, size: number) {
  const s = size / 2
  return {
    outer: [
      [cx - s, cy - s],
      [cx + s, cy - s],
      [cx + s, cy + s],
      [cx - s, cy + s],
      [cx - s, cy - s],
    ],
    holes: [] as number[][][],
  }
}

describe('parseEuropeGeoJSON', () => {
  it('returns empty array for empty countries', () => {
    const data = makeData({ countries: [] })
    expect(parseEuropeGeoJSON(data)).toEqual([])
  })

  it('produces one CountryGeometry per country', () => {
    const data = makeData({
      countries: [
        {
          id: 'england',
          name: 'England',
          color: '#ff0000',
          center: [0, 0],
          polygons: [squarePolygon(0, 0, 4)],
        },
        {
          id: 'france',
          name: 'France',
          color: '#0000ff',
          center: [5, 5],
          polygons: [squarePolygon(5, 5, 4)],
        },
      ],
    })
    const result = parseEuropeGeoJSON(data)
    expect(result).toHaveLength(2)
    expect(result[0]!.id).toBe('england')
    expect(result[1]!.id).toBe('france')
  })

  it('passes through name and color', () => {
    const data = makeData({
      countries: [
        {
          id: 'ottoman_empire',
          name: 'Османская империя',
          color: '#B22222',
          center: [0, 0],
          polygons: [squarePolygon(0, 0, 1)],
        },
      ],
    })
    const result = parseEuropeGeoJSON(data) as [CountryGeometry]
    expect(result[0]!.name).toBe('Османская империя')
    expect(result[0]!.color).toBe('#B22222')
  })

  it('converts center to THREE.Vector2', () => {
    const data = makeData({
      countries: [
        {
          id: 'a',
          name: 'A',
          color: '#000',
          center: [1.5, -2.5],
          polygons: [squarePolygon(0, 0, 1)],
        },
      ],
    })
    const result = parseEuropeGeoJSON(data) as [CountryGeometry]
    expect(result[0]!.center).toBeInstanceOf(THREE.Vector2)
    expect(result[0]!.center.x).toBe(1.5)
    expect(result[0]!.center.y).toBe(-2.5)
  })

  it('creates one Shape per polygon', () => {
    const data = makeData({
      countries: [
        {
          id: 'multi',
          name: 'Multi',
          color: '#000',
          center: [0, 0],
          polygons: [
            squarePolygon(-5, 0, 2),
            squarePolygon(5, 0, 2),
            squarePolygon(0, 5, 2),
          ],
        },
      ],
    })
    const result = parseEuropeGeoJSON(data) as [CountryGeometry]
    expect(result[0]!.shapes).toHaveLength(3)
    for (const shape of result[0]!.shapes) {
      expect(shape).toBeInstanceOf(THREE.Shape)
    }
  })

  it('adds holes to shape when present', () => {
    const outer = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ]
    const hole = [
      [3, 3],
      [7, 3],
      [7, 7],
      [3, 7],
      [3, 3],
    ]
    const data = makeData({
      countries: [
        {
          id: 'hollow',
          name: 'Hollow',
          color: '#000',
          center: [5, 5],
          polygons: [{ outer, holes: [hole] }],
        },
      ],
    })
    const result = parseEuropeGeoJSON(data) as [CountryGeometry]
    expect(result[0]!.shapes[0]!.holes).toHaveLength(1)
  })

  it('handles empty outer ring without throwing', () => {
    const data = makeData({
      countries: [
        {
          id: 'empty',
          name: 'Empty',
          color: '#000',
          center: [0, 0],
          polygons: [{ outer: [], holes: [] }],
        },
      ],
    })
    expect(() => parseEuropeGeoJSON(data)).not.toThrow()
  })
})

describe('getMapCenter', () => {
  it('returns center of bounds with offset and scale applied', () => {
    const data = makeData({
      bounds: { minX: -10, maxX: 10, minY: -20, maxY: 20 },
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    })
    const c = getMapCenter(data)
    expect(c).toBeInstanceOf(THREE.Vector3)
    expect(c.x).toBe(0)
    expect(c.y).toBe(0)
  })

  it('applies scale', () => {
    const data = makeData({
      bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
      scale: 0.5,
    })
    const c = getMapCenter(data)
    expect(c.x).toBe(25)
    expect(c.y).toBe(25)
  })

  it('applies offset', () => {
    const data = makeData({
      bounds: { minX: -10, maxX: 10, minY: -10, maxY: 10 },
      offsetX: 5,
      offsetY: -3,
    })
    const c = getMapCenter(data)
    expect(c.x).toBe(5)
    expect(c.y).toBe(-3)
  })
})

describe('createExtrudedGeometry', () => {
  it('returns THREE.ExtrudeGeometry with non-empty position attribute', () => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(10, 0)
    shape.lineTo(10, 10)
    shape.lineTo(0, 10)
    shape.closePath()
    const geom = createExtrudedGeometry(shape)
    expect(geom).toBeInstanceOf(THREE.ExtrudeGeometry)
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    expect(pos.count).toBeGreaterThan(0)
    geom.dispose()
  })
})

describe('createEdgeGeometry', () => {
  it('closes the loop by repeating the first point', () => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(10, 0)
    shape.lineTo(10, 10)
    shape.lineTo(0, 10)
    shape.closePath()
    const geom = createEdgeGeometry(shape)
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    const n = pos.count
    expect(n).toBe(shape.getPoints().length + 1)
    const first = new THREE.Vector3().fromBufferAttribute(pos, 0)
    const last = new THREE.Vector3().fromBufferAttribute(pos, n - 1)
    expect(first.x).toBeCloseTo(last.x)
    expect(first.y).toBeCloseTo(last.y)
    geom.dispose()
  })
})

describe('getCountryBounds', () => {
  it('returns bounding box of all shape points', () => {
    const data = makeData({
      countries: [
        {
          id: 'box',
          name: 'Box',
          color: '#000',
          center: [0, 0],
          polygons: [squarePolygon(0, 0, 10)],  // 10x10 square
        },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const bounds = getCountryBounds(geom)
    expect(bounds.width).toBeCloseTo(10, 5)
    expect(bounds.height).toBeCloseTo(10, 5)
  })

  it('handles multi-polygon countries (uses union of points)', () => {
    const data = makeData({
      countries: [
        {
          id: 'multi',
          name: 'Multi',
          color: '#000',
          center: [0, 0],
          polygons: [
            squarePolygon(-10, -10, 4),  // 4x4 at (-10,-10)
            squarePolygon(10, 10, 4),    // 4x4 at (10,10)
          ],
        },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const bounds = getCountryBounds(geom)
    expect(bounds.width).toBeCloseTo(24, 5)  // -12 to 12
    expect(bounds.height).toBeCloseTo(24, 5)
  })

  it('returns 0x0 for country with no shapes', () => {
    const data = makeData({
      countries: [
        {
          id: 'empty',
          name: 'Empty',
          color: '#000',
          center: [0, 0],
          polygons: [{ outer: [], holes: [] }],
        },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const bounds = getCountryBounds(geom)
    expect(bounds.width).toBe(0)
    expect(bounds.height).toBe(0)
  })
})

describe('getInteriorPoint', () => {
  function ringContains(ring: number[][], x: number, y: number, holes: number[][][] = []): boolean {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1]
      const xj = ring[j][0], yj = ring[j][1]
      if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi)) {
        inside = !inside
      }
    }
    for (const h of holes) {
      let hIn = false
      for (let i = 0, j = h.length - 1; i < h.length; j = i++) {
        const xi = h[i][0], yi = h[i][1]
        const xj = h[j][0], yj = h[j][1]
        if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi)) {
          hIn = !hIn
        }
      }
      if (hIn) return false
    }
    return inside
  }

  it('returns centroid for convex square', () => {
    const data = makeData({
      countries: [
        { id: 'sq', name: 'Sq', color: '#000', center: [0, 0], polygons: [squarePolygon(0, 0, 10)] },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const p = getInteriorPoint(geom)
    expect(p.x).toBeCloseTo(0, 1)
    expect(p.y).toBeCloseTo(0, 1)
  })

  it('returns point inside convex rectangle', () => {
    const data = makeData({
      countries: [
        { id: 'r', name: 'R', color: '#000', center: [5, 0], polygons: [squarePolygon(5, 0, 20)] },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const p = getInteriorPoint(geom)
    expect(p.x).toBeCloseTo(5, 1)
    expect(p.y).toBeCloseTo(0, 1)
  })

  it('finds interior point for C-shape (centroid is outside)', () => {
    const cShape: number[][] = [
      [0, 0], [10, 0], [10, 4], [4, 4], [4, 6], [10, 6], [10, 10], [0, 10], [0, 0],
    ]
    const data = makeData({
      countries: [
        { id: 'c', name: 'C', color: '#000', center: [5, 5], polygons: [{ outer: cShape, holes: [] }] },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const p = getInteriorPoint(geom)
    expect(ringContains(cShape, p.x, p.y)).toBe(true)
    expect(p.x).toBeGreaterThan(0.5)
    expect(p.x).toBeLessThan(3.5)
  })

  it('finds interior point for L-shape (centroid outside)', () => {
    const lShape: number[][] = [
      [0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10], [0, 0],
    ]
    const data = makeData({
      countries: [
        { id: 'l', name: 'L', color: '#000', center: [5, 5], polygons: [{ outer: lShape, holes: [] }] },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const p = getInteriorPoint(geom)
    expect(ringContains(lShape, p.x, p.y)).toBe(true)
  })

  it('avoids holes when computing interior point', () => {
    const donut: number[][] = [
      [0, 0], [10, 0], [10, 10], [0, 10], [0, 0],
    ]
    const hole: number[][] = [
      [3, 3], [7, 3], [7, 7], [3, 7], [3, 3],
    ]
    const data = makeData({
      countries: [
        { id: 'd', name: 'D', color: '#000', center: [5, 5], polygons: [{ outer: donut, holes: [hole] }] },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const p = getInteriorPoint(geom)
    expect(ringContains(donut, p.x, p.y, [hole])).toBe(true)
    expect(p.x === 5 && p.y === 5).toBe(false)
  })

  it('returns point inside for non-convex England-like shape', () => {
    const england: number[][] = [
      [-3, 0], [3, 0], [4, 1], [4, 3], [2, 4], [-1, 3], [-2, 1], [-3, 0],
    ]
    const data = makeData({
      countries: [
        { id: 'england', name: 'England', color: '#000', center: [0.5, 0.5], polygons: [{ outer: england, holes: [] }] },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const p = getInteriorPoint(geom)
    expect(ringContains(england, p.x, p.y)).toBe(true)
  })

  it('uses largest polygon for multi-polygon country', () => {
    const data = makeData({
      countries: [
        {
          id: 'multi',
          name: 'Multi',
          color: '#000',
          center: [0, 0],
          polygons: [
            squarePolygon(-100, -100, 2),
            squarePolygon(0, 0, 10),
          ],
        },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const p = getInteriorPoint(geom)
    expect(p.x).toBeCloseTo(0, 1)
    expect(p.y).toBeCloseTo(0, 1)
  })

  it('falls back to country.center for empty shape', () => {
    const data = makeData({
      countries: [
        { id: 'e', name: 'E', color: '#000', center: [7, 9], polygons: [{ outer: [], holes: [] }] },
      ],
    })
    const geom = parseEuropeGeoJSON(data)[0]!
    const p = getInteriorPoint(geom)
    expect(p.x).toBe(7)
    expect(p.y).toBe(9)
  })
})
