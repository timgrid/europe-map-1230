// Purpose: 2D HTML/SVG-оверлей для подписей стран | проецирует центры и spine через cameraSnapshot, считает fontSize (LOD с гистерезисом), решает пересечения для point-label, рендерит SVG textPath для крупных вытянутых стран (EU4-style), динамически выбирает shortName когда полное имя не помещается
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getCountryInfo } from '../data/countriesData'
import { getCountryBounds, getInteriorPoint, type CountryGeometry } from '../utils/geoParser'
import { getCountrySpine, buildScreenSpine, type SpinePoint } from '../utils/spine'
import { cameraSnapshot, getProjectionCamera } from '../state/cameraState'
import { projectWorldToScreen, getLabelFontSize, getTextPathFontSize } from '../utils/projection'
import {
  estimateLabelBox,
  resolveLabelOverlaps,
  type LabelBox,
} from '../utils/labelLayout'
import { pickFittingName } from '../utils/fittingName'
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

const TEXTPATH_MIN_SCREEN_PX = 80
const TEXTPATH_MIN_ASPECT = 1.3

interface LabelData {
  div: HTMLDivElement | null
  text: SVGTextElement | null
  textPathEl: SVGTextPathElement | null
  pathEl: SVGPathElement | null
  displayName: string
  shortName: string | undefined
  capital: string | undefined
  center: THREE.Vector3
  boundsWidth: number
  boundsHeight: number
  spineWorld: SpinePoint[]
  aspect: number
  lastRenderName: string
}

interface LabelCandidate extends LabelBox {
  _id: string
  fontSize: number
  worldUnitsPerPixel: number
}

interface MapOverlayProps {
  countries: CountryGeometry[]
}

function buildPathD(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  let d = `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i]!.x.toFixed(2)} ${points[i]!.y.toFixed(2)}`
  }
  return d
}

export default function MapOverlay({ countries }: MapOverlayProps) {
  const layer = useMapStore((s) => s.layer)
  const selectedId = useMapStore((s) => s.selectedCountry?.id ?? null)
  const whitelist = layer === 'unified' ? UNIFIED_LABEL_IDS : DETAILED_LABEL_IDS

  const visibleCountries = countries.filter((c) => whitelist.has(c.id))

  const dataRef = useRef<Map<string, LabelData>>(new Map())
  const wasVisibleRef = useRef<Map<string, boolean>>(new Map())
  const lastVersionRef = useRef(-1)
  const layerRef = useRef(layer)

  useEffect(() => {
    layerRef.current = layer
  }, [layer])

  useEffect(() => {
    for (const c of visibleCountries) {
      const data = dataRef.current.get(c.id)
      if (data) {
        const info = getCountryInfo(c.id)
        const bounds = getCountryBounds(c)
        const interior = getInteriorPoint(c)
        const spine = getCountrySpine(c, 24)
        data.displayName = info?.name ?? c.name
        data.shortName = info?.shortName
        data.capital = info?.capital
        data.center = new THREE.Vector3(interior.x, 0.5, -interior.y)
        data.boundsWidth = bounds.width
        data.boundsHeight = bounds.height
        data.spineWorld = spine
        data.aspect = bounds.height > 0 ? bounds.width / bounds.height : 1
        data.lastRenderName = data.displayName
      }
    }
    const visibleIds = new Set(visibleCountries.map((c) => c.id))
    for (const id of dataRef.current.keys()) {
      if (!visibleIds.has(id)) {
        dataRef.current.delete(id)
        wasVisibleRef.current.delete(id)
      }
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
          const fontSize = getLabelFontSize(data.boundsWidth, proj.worldUnitsPerPixel, wasVisible, layerRef.current)
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
            worldUnitsPerPixel: proj.worldUnitsPerPixel,
          })
        }
        const visibility = resolveLabelOverlaps(candidates)

        for (const [id, data] of dataRef.current) {
          const divEl = data.div
          const textEl = data.text
          const textPathEl = data.textPathEl
          const pathEl = data.pathEl
          if (!divEl) continue

          const show = visibility.get(id) ?? false
          wasVisibleRef.current.set(id, show)
          if (!show) {
            divEl.style.display = 'none'
            if (textEl) textEl.style.display = 'none'
            continue
          }

          const { readable, screenLen, visibleCount } = buildScreenSpine(data.spineWorld, camera, viewport)

          const cand = candidates.find((c) => c._id === id)
          const pointFontSize = cand?.fontSize ?? 14
          const eligible =
            visibleCount >= 2 &&
            screenLen >= TEXTPATH_MIN_SCREEN_PX &&
            data.aspect >= TEXTPATH_MIN_ASPECT

          if (eligible && textEl && textPathEl && pathEl) {
            const textPathFontSize = getTextPathFontSize(screenLen) ?? 11
            const renderName = pickFittingName(data.displayName, data.shortName, screenLen, textPathFontSize, undefined)
            if (renderName !== data.lastRenderName) {
              textPathEl.textContent = renderName
              data.lastRenderName = renderName
            }
            const d = buildPathD(readable)
            pathEl.setAttribute('d', d)
            textEl.setAttribute('font-size', String(textPathFontSize))
            textEl.style.display = ''
            divEl.style.display = 'none'
          } else {
            if (!cand) {
              divEl.style.display = 'none'
              if (textEl) textEl.style.display = 'none'
              continue
            }
            const countryScreenWidth = data.boundsWidth / cand.worldUnitsPerPixel
            const renderName = pickFittingName(
              data.displayName,
              data.shortName,
              countryScreenWidth,
              pointFontSize,
              data.capital,
            )
            if (renderName !== data.lastRenderName) {
              const nameEl = divEl.querySelector<HTMLElement>('[data-country-name]')
              if (nameEl) nameEl.textContent = renderName
              data.lastRenderName = renderName
            }
            divEl.style.display = ''
            divEl.style.left = `${cand.x}px`
            divEl.style.top = `${cand.y}px`
            divEl.style.fontSize = `${cand.fontSize}px`
            if (textEl) textEl.style.display = 'none'
          }
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
      <svg
        className="absolute inset-0"
        width="100%"
        height="100%"
        style={{ overflow: 'visible', pointerEvents: 'none' }}
      >
        {visibleCountries.map((c) => {
          const info = getCountryInfo(c.id)
          const displayName = info?.name ?? c.name
          const isSelected = selectedId === c.id
          return (
            <text
              key={c.id}
              ref={(el) => {
                if (!el) return
                const data = dataRef.current.get(c.id)
                if (data) data.text = el
              }}
              x="0"
              y="0"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontWeight={600}
              fill={isSelected ? '#fde68a' : 'rgba(255, 245, 220, 0.95)'}
              stroke="rgba(0, 0, 0, 0.85)"
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
              paintOrder="stroke fill"
              letterSpacing="0.5"
              style={{ display: 'none' }}
            >
              <textPath
                ref={(el) => {
                  if (!el) return
                  const data = dataRef.current.get(c.id)
                  if (data) data.textPathEl = el
                }}
                href={`#spine-${c.id}`}
                startOffset="50%"
                textAnchor="middle"
              >
                {displayName}
              </textPath>
            </text>
          )
        })}
        {visibleCountries.map((c) => (
          <path
            key={`path-${c.id}`}
            id={`spine-${c.id}`}
            ref={(el) => {
              if (!el) return
              const data = dataRef.current.get(c.id)
              if (data) data.pathEl = el
            }}
            d=""
            fill="none"
            stroke="none"
          />
        ))}
      </svg>

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
                const info = getCountryInfo(c.id)
                const bounds = getCountryBounds(c)
                const interior = getInteriorPoint(c)
                const spine = getCountrySpine(c, 24)
                data = {
                  div: el,
                  text: null,
                  textPathEl: null,
                  pathEl: null,
                  displayName: info?.name ?? c.name,
                  shortName: info?.shortName,
                  capital: info?.capital,
                  center: new THREE.Vector3(interior.x, 0.5, -interior.y),
                  boundsWidth: bounds.width,
                  boundsHeight: bounds.height,
                  spineWorld: spine,
                  aspect: bounds.height > 0 ? bounds.width / bounds.height : 1,
                  lastRenderName: info?.name ?? c.name,
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
            <div data-country-name style={{ fontWeight: 600 }}>{displayName}</div>
            {capital && layer === 'unified' && (
              <div style={{ fontSize: '0.65em', opacity: 0.7, fontStyle: 'italic' }}>★ {capital}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
