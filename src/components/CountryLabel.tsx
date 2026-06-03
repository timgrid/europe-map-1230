// Purpose: подпись страны на карте — русское название + столица | скрывается для маленьких стран
import { Html } from '@react-three/drei'
import type { CountryGeometry } from '../utils/geoParser'
import { getCountryInfo } from '../data/countriesData'
import { useMapStore } from '../store'

interface CountryLabelProps {
  country: CountryGeometry
  layer: 'detailed' | 'unified'
}

const DETAILED_LABEL_IDS = new Set([
  'england', 'france', 'holy_roman_empire', 'poland', 'hungary', 'castile', 'aragon', 'portugal', 'spain',
  'denmark', 'sweden', 'norway', 'denmark_norway', 'kalmar_union', 'byzantine_empire', 'bulgaria', 'kievan_rus',
  'rum', 'georgia', 'lithuania', 'teutonic_order', 'poland_lithuania',
  'cyprus', 'latin_empire', 'achaea', 'epirus',
  'cumania', 'croatia', 'bosnia', 'bohemia', 'papal_states', 'venice', 'genoa', 'milan', 'florence',
  'sicily', 'naples', 'sardinia', 'corsica', 'savoy',
  'golden_horde', 'novgorod', 'ilkhanate', 'mamluke_sultanate', 'granada',
  'ottoman_empire', 'grand_duchy_of_moscow', 'tsardom_of_muscovy', 'crimean_khanate',
  'safavid_empire', 'hafsid_caliphate', 'swiss_confederation', 'habsburg_netherlands',
  'moldova', 'serbia', 'morocco',
  // Early medieval (800–1100)
  'carolingian_empire', 'east_francia', 'west_francia',
  'rus_khaganate', 'khazars', 'avars', 'lombard_duchies', 'magyars', 'great_moravia',
  'slavonic_tribes', 'celtic_kingdoms', 'asturias', 'seljuk_empire', 'samanid_empire',
  'mongols', 'icelandic_commonwealth', 'swedes_and_goths', 'pomerania', 'ests', 'finns',
  'karakalpaks', 'oasis', 'almoravid_dynasty',
  // 1600
  'dutch_republic', 'japan_warring_states', 'vijayanagara', 'bengal',
  'ahmadnagar', 'bidar', 'bijapur', 'golkonda', 'nogai_horde', 'khanate_of_kazan',
])

const UNIFIED_LABEL_IDS = new Set([
  'england', 'france', 'holy_roman_empire', 'poland', 'hungary', 'castile', 'aragon', 'portugal', 'spain',
  'denmark', 'sweden', 'norway', 'byzantine_empire', 'bulgaria', 'kievan_rus',
  'golden_horde', 'ilkhanate', 'mamluke_sultanate', 'granada', 'ottoman_empire',
  'grand_duchy_of_moscow', 'tsardom_of_muscovy', 'papal_states', 'venice',
  'carolingian_empire', 'seljuk_empire', 'mongols', 'dutch_republic', 'japan_warring_states',
  'vijayanagara', 'mongol_empire',
])

export default function CountryLabel({ country, layer }: CountryLabelProps) {
  const selectedCountry = useMapStore((s) => s.selectedCountry)
  const whitelist = layer === 'unified' ? UNIFIED_LABEL_IDS : DETAILED_LABEL_IDS
  if (!whitelist.has(country.id)) return null

  const info = getCountryInfo(country.id)
  const displayName = info?.name ?? country.name
  const capital = info?.capital
  const isSelected = selectedCountry?.id === country.id

  return (
    <Html
      position={[country.center.x, 0.8, -country.center.y]}
      center
      distanceFactor={120}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        className="font-medium whitespace-nowrap text-center"
        style={{
          fontFamily: 'Georgia, serif',
          textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.7)',
          fontSize: layer === 'unified' ? '15px' : '12px',
          color: isSelected ? '#fde68a' : 'rgba(255, 245, 220, 0.95)',
          letterSpacing: '0.3px',
          lineHeight: 1.15,
        }}
      >
        <div style={{ fontWeight: 600 }}>{displayName}</div>
        {capital && layer === 'unified' && (
          <div style={{ fontSize: '10px', opacity: 0.7, fontStyle: 'italic' }}>★ {capital}</div>
        )}
      </div>
    </Html>
  )
}
