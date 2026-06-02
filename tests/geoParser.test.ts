import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  parseEuropeGeoJSON,
  getMapCenter,
  createExtrudedGeometry,
  createEdgeGeometry,
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
