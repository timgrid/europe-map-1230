// Purpose: парсинг ProcessedData → CountryGeometry (THREE.Shape[]), вычисление центра, создание Extrude/Edge геометрии
import * as THREE from 'three'
import type { ProcessedData } from './dataLoader'

export interface CountryGeometry {
  id: string
  name: string
  color: string
  center: THREE.Vector2
  shapes: THREE.Shape[]
}

export interface GeoPoint {
  x: number
  y: number
}

function createShapeFromPolygon(outer: number[][], holes: number[][][]): THREE.Shape {
  const shape = new THREE.Shape()
  if (outer.length > 0) {
    shape.moveTo(outer[0][0], outer[0][1])
    for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i][0], outer[i][1])
    shape.closePath()
  }
  for (const hole of holes) {
    if (hole.length === 0) continue
    const path = new THREE.Path()
    path.moveTo(hole[0][0], hole[0][1])
    for (let i = 1; i < hole.length; i++) path.lineTo(hole[i][0], hole[i][1])
    path.closePath()
    shape.holes.push(path)
  }
  return shape
}

export function parseEuropeGeoJSON(data: ProcessedData): CountryGeometry[] {
  const geometries: CountryGeometry[] = []
  for (const country of data.countries) {
    const shapes: THREE.Shape[] = []
    for (const polygon of country.polygons) {
      const shape = createShapeFromPolygon(polygon.outer, polygon.holes)
      shapes.push(shape)
    }
    geometries.push({
      id: country.id,
      name: country.name,
      color: country.color,
      center: new THREE.Vector2(country.center[0], country.center[1]),
      shapes,
    })
  }
  return geometries
}

export function getMapCenter(data: ProcessedData): THREE.Vector3 {
  const b = data.bounds
  const cx = ((b.minX + b.maxX) / 2 + data.offsetX) * data.scale
  const cy = ((b.minY + b.maxY) / 2 + data.offsetY) * data.scale
  return new THREE.Vector3(cx, cy, 0)
}

export function createExtrudedGeometry(shape: THREE.Shape): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
  })
}

export function createEdgeGeometry(shape: THREE.Shape): THREE.BufferGeometry {
  const points = shape.getPoints()
  const vectors: THREE.Vector3[] = []
  for (let i = 0; i < points.length; i++) {
    vectors.push(new THREE.Vector3(points[i].x, points[i].y, 0.55))
  }
  if (points.length > 0) {
    vectors.push(new THREE.Vector3(points[0].x, points[0].y, 0.55))
  }
  return new THREE.BufferGeometry().setFromPoints(vectors)
}

export function getCountryBounds(country: CountryGeometry): { width: number; height: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const shape of country.shapes) {
    const pts = shape.getPoints(1)
    for (const p of pts) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
  }
  if (!Number.isFinite(minX)) return { width: 0, height: 0 }
  return { width: maxX - minX, height: maxY - minY }
}

function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function distToSegmentPx(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

function pointInPolygonWithHoles(x: number, y: number, outer: number[][], holes: number[][][]): boolean {
  if (!pointInRing(x, y, outer)) return false
  for (const hole of holes) {
    if (pointInRing(x, y, hole)) return false
  }
  return true
}

function ringArea(ring: number[][]): number {
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  }
  return Math.abs(a) / 2
}

function largestPolygon(country: CountryGeometry): { outer: number[][]; holes: number[][][] } | null {
  let best: { outer: number[][]; holes: number[][][] } | null = null
  let bestArea = 0
  for (const shape of country.shapes) {
    const pts = shape.getPoints(1)
    if (pts.length < 3) continue
    const outer: number[][] = pts.map((p) => [p.x, p.y])
    const holes: number[][][] = []
    for (const path of shape.holes) {
      const hp = path.getPoints(1)
      if (hp.length >= 3) holes.push(hp.map((p) => [p.x, p.y]))
    }
    const a = ringArea(outer)
    if (a > bestArea) {
      bestArea = a
      best = { outer, holes }
    }
  }
  return best
}

export function getInteriorPoint(country: CountryGeometry): { x: number; y: number } {
  const poly = largestPolygon(country)
  if (!poly || poly.outer.length < 3) {
    return { x: country.center.x, y: country.center.y }
  }
  const { outer, holes } = poly

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of outer) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  const w = maxX - minX
  const h = maxY - minY
  if (w === 0 || h === 0) return { x: outer[0][0], y: outer[0][1] }

  const n = outer.length
  const isClosed = n > 1 && outer[0][0] === outer[n - 1][0] && outer[0][1] === outer[n - 1][1]
  const count = isClosed ? n - 1 : n
  let sx = 0, sy = 0
  for (let i = 0; i < count; i++) { sx += outer[i][0]; sy += outer[i][1] }
  const centroidX = sx / count
  const centroidY = sy / count
  if (pointInPolygonWithHoles(centroidX, centroidY, outer, holes)) {
    return { x: centroidX, y: centroidY }
  }

  const bboxCx = (minX + maxX) / 2
  const bboxCy = (minY + maxY) / 2
  if (pointInPolygonWithHoles(bboxCx, bboxCy, outer, holes)) {
    return { x: bboxCx, y: bboxCy }
  }

  const cellSize = Math.min(w, h) / 12
  let bestX = outer[0][0]
  let bestY = outer[0][1]
  let bestDist = -1
  for (let x = minX; x <= maxX; x += cellSize) {
    for (let y = minY; y <= maxY; y += cellSize) {
      if (!pointInPolygonWithHoles(x, y, outer, holes)) continue
      let minDist = Infinity
      for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
        const d = distToSegmentPx(x, y, outer[i][0], outer[i][1], outer[j][0], outer[j][1])
        if (d < minDist) minDist = d
      }
      for (const hole of holes) {
        for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
          const d = distToSegmentPx(x, y, hole[i][0], hole[i][1], hole[j][0], hole[j][1])
          if (d < minDist) minDist = d
        }
      }
      if (minDist > bestDist) {
        bestDist = minDist
        bestX = x
        bestY = y
      }
    }
  }
  return { x: bestX, y: bestY }
}
