// Purpose: 3D-сцена — водная плоскость + страны (CountryMesh) | подписи вынесены в 2D MapOverlay (sibling Canvas)
import type { CountryGeometry } from '../utils/geoParser'
import CountryMesh from './CountryMesh'
import { useMapStore } from '../store'

interface MapSceneProps {
  countries: CountryGeometry[]
}

export default function MapScene({ countries }: MapSceneProps) {
  const layer = useMapStore((state) => state.layer)

  return (
    <group>
      {/* Water plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
        <planeGeometry args={[600, 400]} />
        <meshPhysicalMaterial
          color="#0d2137"
          transparent opacity={0.9}
          roughness={0.15} metalness={0.2}
          clearcoat={0.5} clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Decorative ocean ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <planeGeometry args={[700, 500]} />
        <meshBasicMaterial color="#081220" transparent opacity={0.6} />
      </mesh>

      {/* Countries */}
      {countries.map((country) => (
        <CountryMesh key={country.id} country={country} layer={layer} />
      ))}
    </group>
  )
}
