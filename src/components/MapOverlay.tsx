// Purpose: 2D HTML-оверлей для подписей стран | проецирует центры через cameraSnapshot, считает fontSize (LOD с гистерезисом) + решает пересечения
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getCountryInfo } from '../data/countriesData'
import { getCountryBounds, type CountryGeometry } from '../utils/geoParser'
import { cameraSnapshot, getProjectionCamera } from '../state/cameraState'
import { projectWorldToScreen, getLabelFontSize } from '../utils/projection'
import {
  estimateLabelBox,
  type LabelBox,
} from '../utils/labelLayout'
import { useMapStore } from '../store'

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
  'carolingian_empire', 'east_francia', 'west_francia',
  'rus_khaganate', 'khazars', 'avars', 'lombard_duchies', 'magyars', 'great_moravia',
  'slavonic_tribes', 'celtic_kingdoms', 'asturias', 'seljuk_empire', 'samanid_empire',
  'mongols', 'icelandic_commonwealth', 'swedes_and_goths', 'pomerania', 'ests', 'finns',
  'karakalpaks', 'oasis', 'almoravid_dynasty',
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

interface LabelData {
  div: HTMLDivElement | null
  displayName: string
  capital: string | undefined
  center: THREE.Vector3
  boundsWidth: number
}

interface LabelCandidate extends LabelBox {
  _id: string
  fontSize: number
}

interface MapOverlayProps {
  countries: CountryGeometry[]
}

export default function MapOverlay({ countries }: MapOverlayProps) {
  const layer = useMapStore((s) => s.layer)
  const selectedId = useMapStore((s) => s.selectedCountry?.id ?? null)
  const whitelist = layer === 'unified' ? UNIFIED_LABEL_IDS : DETAILED_LABEL_IDS

  const visibleCountries = countries.filter((c) => whitelist.has(c.id))

  const dataRef = useRef<Map<string, LabelData>>(new Map())
  const wasVisibleRef = useRef<Map<string, boolean>>(new Map())
  const lastVersionRef = useRef(-1)

  useEffect(() => {
    // Update data for existing entries (ref callback creates entries on first mount).
    // Don't replace the Map — that would wipe the `div` refs that ref callback just set.
    for (const c of visibleCountries) {
      const data = dataRef.current.get(c.id)
      if (data) {
        const info = getCountryInfo(c.id)
        const bounds = getCountryBounds(c)
        data.displayName = info?.name ?? c.name
        data.capital = info?.capital
        data.center = new THREE.Vector3(c.center.x, 0.5, -c.center.y)
        data.boundsWidth = bounds.width
      }
    }
    // Remove entries for countries no longer visible
    const visibleIds = new Set(visibleCountries.map((c) => c.id))
    for (const id of dataRef.current.keys()) {
      if (!visibleIds.has(id)) dataRef.current.delete(id)
    }
  }, [visibleCountries])

  useEffect(() => {
    let raf = 0
    let running = true
    const tick = () => {
      if (!running) return
      if (cameraSnapshot.version !== lastVersionRef.current) {
        lastVersionRef.current = cameraSnapshot.version
        const camera = getProjectionCamera()
        const viewport = {
          width: cameraSnapshot.viewportWidth,
          height: cameraSnapshot.viewportHeight,
        }
        const candidates: LabelCandidate[] = []
        for (const [id, data] of dataRef.current) {
          const wasVisible = wasVisibleRef.current.get(id) ?? false
          const proj = projectWorldToScreen(data.center, camera, viewport)
          const fontSize = getLabelFontSize(data.boundsWidth, proj.worldUnitsPerPixel, wasVisible, layer)
          if (fontSize === null || !proj.visible) continue
          const box = estimateLabelBox({
            id,
            displayName: data.displayName,
            capital: data.capital,
            fontSize,
          })
          candidates.push({
            _id: id,
            x: proj.x,
            y: proj.y,
            width: box.width,
            height: box.height,
            priority: data.boundsWidth * data.boundsWidth,
            wasVisible,
            fontSize,
          })
        }
        const visibility = new Map<string, boolean>(candidates.map((c) => [c._id, true]))
        let visibleCount = 0
        let firstCand: LabelCandidate | null = null
        for (const [id, data] of dataRef.current) {
          const el = data.div
          if (!el) continue
          const show = visibility.get(id) ?? false
          wasVisibleRef.current.set(id, show)
          if (!show) {
            el.style.display = 'none'
            continue
          }
          const cand = candidates.find((c) => c._id === id)
          if (!cand) {
            el.style.display = 'none'
            continue
          }
          visibleCount++
          if (!firstCand) firstCand = cand
          el.style.display = ''
          el.style.left = `${cand.x}px`
          el.style.top = `${cand.y}px`
          el.style.fontSize = `${cand.fontSize}px`
        }
        const hud = document.getElementById('overlay-hud')
        if (hud) {
          const samples = candidates.slice(0, 3).map((c) =>
            `${c._id}@${c.x.toFixed(0)},${c.y.toFixed(0)} p=${c.priority.toFixed(0)} w=${c.width.toFixed(0)}`,
          ).join(' | ')
          const sample = candidates.length > 0
            ? ` | top:[${samples}]`
            : ''
          hud.textContent = `v=${cameraSnapshot.version} | data=${dataRef.current.size} | cand=${candidates.length} | vis=${visibleCount} | vp=${cameraSnapshot.viewportWidth.toFixed(0)}x${cameraSnapshot.viewportHeight.toFixed(0)} | fov=${cameraSnapshot.fov.toFixed(1)}${sample}`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {visibleCountries.map((c) => {
        const info = getCountryInfo(c.id)
        const displayName = info?.name ?? c.name
        const capital = info?.capital
        const isSelected = selectedId === c.id
        return (
          <div
            key={c.id}
            ref={(el) => {
              if (!el) return
              let data = dataRef.current.get(c.id)
              if (!data) {
                // First mount: create entry so RAF loop can use it
                const info = getCountryInfo(c.id)
                const bounds = getCountryBounds(c)
                data = {
                  div: el,
                  displayName: info?.name ?? c.name,
                  capital: info?.capital,
                  center: new THREE.Vector3(c.center.x, 0.5, -c.center.y),
                  boundsWidth: bounds.width,
                }
                dataRef.current.set(c.id, data)
              } else {
                data.div = el
              }
            }}
            className="absolute font-medium text-center whitespace-nowrap"
            style={{
              transform: 'translate(-50%, -50%)',
              fontFamily: 'Georgia, serif',
              textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.7)',
              color: isSelected ? '#fde68a' : 'rgba(255, 245, 220, 0.95)',
              letterSpacing: '0.3px',
              lineHeight: 1.15,
              display: 'none',
            }}
          >
            <div style={{ fontWeight: 600 }}>{displayName}</div>
            {capital && layer === 'unified' && (
              <div style={{ fontSize: '0.65em', opacity: 0.7, fontStyle: 'italic' }}>★ {capital}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
