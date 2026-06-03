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
