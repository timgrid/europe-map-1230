// Purpose: экструдированный полигон страны + обводка | ховер/выбор | dispose геометрий при смене года
import { useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useMapStore, type CountryInfo } from '../store'
import { type CountryGeometry, createExtrudedGeometry, createEdgeGeometry } from '../utils/geoParser'
import { getCountryInfo } from '../data/countriesData'

interface CountryMeshProps {
  country: CountryGeometry
  layer: 'detailed' | 'unified'
}

interface R3FEvent {
  stopPropagation: () => void
  [key: string]: any
}

export default function CountryMesh({ country, layer: _layer }: CountryMeshProps) {
  const [hovered, setHovered] = useState(false)
  
  const setHoveredCountry = useMapStore((state) => state.setHoveredCountry)
  const setSelectedCountry = useMapStore((state) => state.setSelectedCountry)
  const selectedCountry = useMapStore((state) => state.selectedCountry)

  const isSelected = selectedCountry?.id === country.id

  const geometries = useMemo(() => {
    return country.shapes.map(shape => ({
      mesh: createExtrudedGeometry(shape),
      edge: createEdgeGeometry(shape),
    }))
  }, [country.shapes])

  useEffect(() => {
    return () => {
      for (const g of geometries) {
        g.mesh.dispose()
        g.edge.dispose()
      }
    }
  }, [geometries])

  // Memoize border geometry and material per shape
  const borders = useMemo(() => {
    return geometries.map(g => {
      const mat = new THREE.LineBasicMaterial({ color: '#2c1810' })
      return new THREE.Line(g.edge, mat)
    })
  }, [geometries])

  useEffect(() => {
    return () => {
      for (const line of borders) {
        line.material.dispose()
      }
    }
  }, [borders])

  let baseColor = country.color
  let emissiveIntensity = 0
  
  if (hovered) emissiveIntensity = 0.3
  if (isSelected) emissiveIntensity = 0.5

  const handlePointerOver = (e: R3FEvent) => {
    e.stopPropagation()
    setHovered(true)
    setHoveredCountry(country.id)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = (e: R3FEvent) => {
    e.stopPropagation()
    setHovered(false)
    setHoveredCountry(null)
    document.body.style.cursor = 'default'
  }

  const handleClick = (e: R3FEvent) => {
    e.stopPropagation()
    const info: CountryInfo = getCountryInfo(country.id)
    if (info && info.id !== 'unknown') {
      setSelectedCountry(info)
    }
  }

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {geometries.map((geom, idx) => (
        <group key={idx}>
          <mesh
            geometry={geom.mesh}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={baseColor}
              emissive={baseColor}
              emissiveIntensity={emissiveIntensity}
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          <primitive object={borders[idx]!} />
        </group>
      ))}
    </group>
  )
}
