// Purpose: 3D-сцена — водная плоскость, страны (CountryMesh), текстовые подписи (Html)
import { Html } from '@react-three/drei'
import type { CountryGeometry } from '../utils/geoParser'
import CountryMesh from './CountryMesh'
import { useMapStore } from '../store'

interface MapSceneProps {
  countries: CountryGeometry[]
}

const labelCountries = [
  'england', 'france', 'holy_roman_empire', 'poland', 'hungary', 'castile', 'aragon', 'portugal', 'spain',
  'denmark', 'sweden', 'norway', 'denmark_norway', 'kalmar_union', 'byzantine_empire', 'bulgaria', 'kievan_rus',
  'rum', 'georgia', 'lithuania', 'teutonic_order', 'poland_lithuania',
  'cyprus', 'latin_empire', 'achaea', 'epirus',
  'cumania', 'croatia', 'bosnia', 'bohemia', 'papal_states', 'venice', 'genoa', 'milan', 'florence',
  'sicily', 'naples', 'sardinia', 'corsica', 'savoy',
  'golden_horde', 'novgorod', 'ilkhanate', 'mamluke_sultanate', 'granada',
  'ottoman_empire', 'grand_duchy_of_moscow', 'tsardom_of_muscovy', 'crimean_khanate', 'khanate_of_sibir',
  'safavid_empire', 'hafsid_caliphate', 'mughal_empire',
  'swiss_confederation', 'republic_of_the_seven_zenden', 'habsburg_netherlands',
  'moldova', 'serbia', 'wallachia', 'morocco',
]

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

      {/* Labels */}
      {countries
        .filter((c) => labelCountries.includes(c.id))
        .map((country) => (
          <Html
            key={`label-${country.id}`}
            position={[country.center.x, 0.8, -country.center.y]}
            center
            distanceFactor={80}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <div
              className="font-medium whitespace-nowrap drop-shadow-md text-center"
              style={{
                fontFamily: 'Georgia, serif',
                textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)',
                fontSize: layer === 'unified' ? '14px' : '11px',
                color: 'rgba(255, 245, 220, 0.95)',
                letterSpacing: '0.5px',
              }}
            >
              {country.name}
            </div>
          </Html>
        ))}
    </group>
  )
}
