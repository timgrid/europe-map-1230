// Purpose: 2D HTML/SVG-оверлей для подписей стран | проецирует центры и spine через cameraSnapshot, считает fontSize (LOD с гистерезисом), решает пересечения для point-label, рендерит SVG textPath для крупных вытянутых стран (EU4-style), динамически выбирает shortName когда полное имя не помещается, многострочный wrap для длинных имён (Clausewitz-style: балансировка слов + сдвиг spine по нормали + clipping check)
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getCountryInfo } from '../data/countriesData'
import { getCountryBounds, getInteriorPoint, type CountryGeometry } from '../utils/geoParser'
import { getCountrySpine, buildScreenSpine, ensureReadableDirection, hasSharpSpineTurn, type SpinePoint } from '../utils/spine'
import { cameraSnapshot, getProjectionCamera } from '../state/cameraState'
import { projectWorldToScreen, getLabelFontSize, getTextPathFontSize } from '../utils/projection'
import {
  estimateLabelBox,
  resolveLabelOverlaps,
  type LabelBox,
} from '../utils/labelLayout'
import { pickFittingName } from '../utils/fittingName'
import { useMapStore } from '../store'
import {
  classifyLabelMode,
  isSpineEligible,
  setAttrIfChanged,
} from '../utils/overlayPipeline'
import {
  wrapBalanced,
  shiftSpineByNormal,
  getLineOffsets,
  isSpineInsidePolygon,
  shouldUseMultiLine,
} from '../utils/textPathWrap'

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

const MAX_LABEL_LINES = 2  // up to 2 lines per label (EU4-style)
const LINE_SPACING_FACTOR = 1.15  // lineSpacing = fontSize * this

interface LabelData {
  div: HTMLDivElement | null
  capitalEl: HTMLDivElement | null
  // Multi-line arrays (size = MAX_LABEL_LINES)
  texts: (SVGTextElement | null)[]
  textPathEls: (SVGTextPathElement | null)[]
  paths: (SVGPathElement | null)[]
  // Multi-line point-label child divs (size = MAX_LABEL_LINES)
  pointLineEls: (HTMLDivElement | null)[]
  // Multi-line data (computed in tick)
  lastLines: string[]
  // Cached country reference (for clipping check)
  country: CountryGeometry | null
  displayName: string
  shortName: string | undefined
  capital: string | undefined
  center: THREE.Vector3
  boundsWidth: number
  boundsHeight: number
  spineWorld: SpinePoint[]
  aspect: number
  // last data-* attr values (to avoid DOM thrashing via setAttribute every frame)
  lastMode: string
  lastEligible: string
  lastSpineLen: string
  lastAspect: string
  lastFontSize: string
  lastRenderNameAttr: string
  lastCapitalVisible: string
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

  const whitelist = useMemo(
    () => (layer === 'unified' ? UNIFIED_LABEL_IDS : DETAILED_LABEL_IDS),
    [layer],
  )

  const visibleCountries = useMemo(
    () => countries.filter((c) => whitelist.has(c.id)),
    [countries, whitelist],
  )

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
        data.country = c
        data.displayName = info?.name ?? c.name
        data.shortName = info?.shortName
        data.capital = info?.capital
        data.center = new THREE.Vector3(interior.x, 0.5, -interior.y)
        data.boundsWidth = bounds.width
        data.boundsHeight = bounds.height
        data.spineWorld = spine
        data.aspect = bounds.height > 0 ? bounds.width / bounds.height : 1
        data.lastLines = [data.displayName]
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

  // ==== Render helpers ====

  function renderLabelHidden(data: LabelData): void {
    const divEl = data.div!
    divEl.style.display = 'none'
    for (let i = 0; i < MAX_LABEL_LINES; i++) {
      const textEl = data.texts[i]
      const textPathEl = data.textPathEls[i]
      const pathEl = data.paths[i]
      const pointLineEl = data.pointLineEls[i]
      if (textEl) textEl.style.display = 'none'
      if (textPathEl) textPathEl.textContent = ''
      if (pathEl) pathEl.setAttribute('d', '')
      if (pointLineEl) pointLineEl.style.display = 'none'
    }
    if (data.capitalEl) data.capitalEl.style.display = 'none'
    setAttrIfChanged(divEl, 'data-capital', '0', { value: data.lastCapitalVisible })
    data.lastCapitalVisible = '0'
  }

  function renderTextPathMultiLine(
    data: LabelData,
    screenSpine: ReturnType<typeof buildScreenSpine>,
    camera: THREE.Camera,
    viewport: { width: number; height: number },
  ): void {
    const divEl = data.div!
    const screenLen = screenSpine.screenLen
    const textPathFontSize = getTextPathFontSize(screenLen) ?? 11
    const lineSpacing = textPathFontSize * LINE_SPACING_FACTOR

    // Decide lines: try single → multi → shortName
    const singlePicked = pickFittingName(
      data.displayName,
      data.shortName,
      screenLen,
      textPathFontSize,
      undefined,
    )
    const isSingleFull = singlePicked === data.displayName

    let lines: string[] = [singlePicked]
    if (shouldUseMultiLine(data.displayName, data.aspect, isSingleFull)) {
      const wrapped = wrapBalanced(data.displayName, MAX_LABEL_LINES)
      // Each wrapped line must fit in screenLen
      const allFit = wrapped.every((line) => {
        const charWidth = textPathFontSize * 0.55
        return line.length * charWidth <= screenLen
      })
      if (allFit && data.country) {
        // Clipping check: each shifted spine must stay inside the country polygon
        const offsets = getLineOffsets(wrapped.length, lineSpacing)
        const allInside = offsets.every((off) => {
          const worldShifted = shiftSpineByNormal(data.spineWorld, off)
          return isSpineInsidePolygon(worldShifted, data.country!)
        })
        if (allInside) {
          lines = wrapped
        }
      }
    }

    // Render each line
    const offsets = getLineOffsets(lines.length, lineSpacing)
    for (let i = 0; i < MAX_LABEL_LINES; i++) {
      const textEl = data.texts[i]
      const textPathEl = data.textPathEls[i]
      const pathEl = data.paths[i]
      if (i < lines.length && textEl && textPathEl && pathEl) {
        const offset = offsets[i]!
        const worldShifted = shiftSpineByNormal(data.spineWorld, offset)
        const screenShifted = buildScreenSpine(worldShifted, camera, viewport)
        const readable = ensureReadableDirection(screenShifted.readable)
        const d = buildPathD(readable)
        pathEl.setAttribute('d', d)
        textEl.setAttribute('font-size', String(textPathFontSize))
        textPathEl.textContent = lines[i]!
        textEl.style.display = ''
      } else {
        if (textEl) textEl.style.display = 'none'
        if (textPathEl) textPathEl.textContent = ''
        if (pathEl) pathEl.setAttribute('d', '')
      }
    }
    divEl.style.display = 'none'
    setAttrIfChanged(divEl, 'data-fontsize', String(textPathFontSize), { value: data.lastFontSize })
    data.lastFontSize = String(textPathFontSize)
    data.lastLines = lines
  }

  function renderPointMultiLine(data: LabelData, cand: LabelCandidate): void {
    const divEl = data.div!
    const countryScreenWidth = data.boundsWidth / cand.worldUnitsPerPixel
    const fontSize = cand.fontSize

    const singlePicked = pickFittingName(
      data.displayName,
      data.shortName,
      countryScreenWidth,
      fontSize,
      data.capital,
    )
    const isSingleFull = singlePicked === data.displayName

    // For point mode, use the same line-height logic but only stack if multi-line
    // is enabled AND the country has near-square aspect.
    let lines: string[]
    if (shouldUseMultiLine(data.displayName, data.aspect, isSingleFull)) {
      const wrapped = wrapBalanced(data.displayName, MAX_LABEL_LINES)
      // For point-label, lines stack vertically — easier to fit
      const charWidth = fontSize * 0.55
      const allFit = wrapped.every((line) => line.length * charWidth <= countryScreenWidth)
      if (allFit) {
        lines = wrapped
      } else {
        lines = [singlePicked]
      }
    } else {
      lines = [singlePicked]
    }

    // Render point-label lines
    for (let i = 0; i < MAX_LABEL_LINES; i++) {
      const lineEl = data.pointLineEls[i]
      if (!lineEl) continue
      if (i < lines.length) {
        lineEl.textContent = lines[i]!
        lineEl.style.display = ''
        lineEl.style.lineHeight = String(LINE_SPACING_FACTOR)
      } else {
        lineEl.textContent = ''
        lineEl.style.display = 'none'
      }
    }
    // Capital: show only when name is 1 line (per option D — "ровно 2 строки максимум")
    const capitalVisible =
      data.capitalEl != null &&
      data.capital != null &&
      layerRef.current === 'unified' &&
      lines.length === 1
    if (data.capitalEl) {
      data.capitalEl.style.display = capitalVisible ? '' : 'none'
    }
    setAttrIfChanged(divEl, 'data-capital', capitalVisible ? '1' : '0', { value: data.lastCapitalVisible })
    data.lastCapitalVisible = capitalVisible ? '1' : '0'

    divEl.style.display = ''
    divEl.style.left = `${cand.x}px`
    divEl.style.top = `${cand.y}px`
    divEl.style.fontSize = `${fontSize}px`
    setAttrIfChanged(divEl, 'data-fontsize', String(fontSize), { value: data.lastFontSize })
    data.lastFontSize = String(fontSize)
    setAttrIfChanged(divEl, 'data-render-name', lines.join(' | '), { value: data.lastRenderNameAttr })
    data.lastRenderNameAttr = lines.join(' | ')
    data.lastLines = lines
  }

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

        // PASS 1: determine render mode for every country BEFORE overlap resolution.
        // textPath-eligible countries do NOT participate in point-label overlap
        // resolution (they sit horizontally along their spine and don't actually
        // conflict with vertical point labels of other countries).
        const modeById = new Map<string, 'textpath' | 'point' | 'hidden'>()
        const screenSpineById = new Map<string, ReturnType<typeof buildScreenSpine>>()
        for (const [id, data] of dataRef.current) {
          const screenSpine = buildScreenSpine(data.spineWorld, camera, viewport)
          screenSpineById.set(id, screenSpine)
          const baseEligible = isSpineEligible({
            visibleCount: screenSpine.visibleCount,
            screenLen: screenSpine.screenLen,
            aspect: data.aspect,
          })
          // text-max-angle guard: отбраковываем textPath со слишком резкими
          // поворотами (для будущих curved spines; текущая прямая всегда проходит).
          const eligible = baseEligible && !hasSharpSpineTurn(screenSpine.readable)
          const centerVisible = projectWorldToScreen(data.center, camera, viewport).visible
          modeById.set(id, classifyLabelMode(centerVisible, eligible))
        }

        // PASS 2: build candidates ONLY for point-mode countries and resolve overlaps.
        const pointCandidates: LabelCandidate[] = []
        for (const [id, data] of dataRef.current) {
          if (modeById.get(id) !== 'point') continue
          const wasVisible = wasVisibleRef.current.get(id) ?? false
          const proj = projectWorldToScreen(data.center, camera, viewport)
          const fontSize = getLabelFontSize(
            data.boundsWidth,
            proj.worldUnitsPerPixel,
            wasVisible,
            layerRef.current,
          )
          if (fontSize === null) continue
          const box = estimateLabelBox({
            id,
            displayName: data.displayName,
            capital: data.capital,
            fontSize,
          })
          pointCandidates.push({
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
        const visibility = resolveLabelOverlaps(pointCandidates)
        const candidateById = new Map(pointCandidates.map((c) => [c._id, c]))

        // PASS 3: render by mode + multi-line + data-* attrs.
        for (const [id, data] of dataRef.current) {
          const divEl = data.div
          if (!divEl) continue

          const mode = modeById.get(id) ?? 'hidden'
          const screenSpine = screenSpineById.get(id)!
          const cand = candidateById.get(id)
          const eligible = isSpineEligible({
            visibleCount: screenSpine.visibleCount,
            screenLen: screenSpine.screenLen,
            aspect: data.aspect,
          })
          const isTextPath = mode === 'textpath'
          const isPoint = mode === 'point'
          const show = isTextPath ? true : isPoint ? (visibility.get(id) ?? false) : false
          wasVisibleRef.current.set(id, show)

          // data-* attrs (DevTools inspection)
          setAttrIfChanged(divEl, 'data-mode', mode, { value: data.lastMode })
          data.lastMode = mode
          setAttrIfChanged(divEl, 'data-eligible', String(eligible), { value: data.lastEligible })
          data.lastEligible = String(eligible)
          setAttrIfChanged(divEl, 'data-spine-len', Math.round(screenSpine.screenLen).toString(), { value: data.lastSpineLen })
          data.lastSpineLen = Math.round(screenSpine.screenLen).toString()
          setAttrIfChanged(divEl, 'data-aspect', data.aspect.toFixed(2), { value: data.lastAspect })
          data.lastAspect = data.aspect.toFixed(2)

          if (!show) {
            renderLabelHidden(data)
            setAttrIfChanged(divEl, 'data-fontsize', '', { value: data.lastFontSize })
            data.lastFontSize = ''
            setAttrIfChanged(divEl, 'data-render-name', '', { value: data.lastRenderNameAttr })
            data.lastRenderNameAttr = ''
            continue
          }

          if (isTextPath) {
            renderTextPathMultiLine(data, screenSpine, camera, viewport)
            setAttrIfChanged(divEl, 'data-render-name', data.lastLines.join(' | '), { value: data.lastRenderNameAttr })
            data.lastRenderNameAttr = data.lastLines.join(' | ')
          } else if (isPoint && cand) {
            renderPointMultiLine(data, cand)
          } else {
            renderLabelHidden(data)
            setAttrIfChanged(divEl, 'data-fontsize', '', { value: data.lastFontSize })
            data.lastFontSize = ''
            setAttrIfChanged(divEl, 'data-render-name', '', { value: data.lastRenderNameAttr })
            data.lastRenderNameAttr = ''
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
        {visibleCountries.flatMap((c) => {
          const isSelected = selectedId === c.id
          const lines = Array.from({ length: MAX_LABEL_LINES }, (_, i) => (
            <g key={`line-${c.id}-${i}`}>
              <path
                id={`spine-${c.id}-${i}`}
                ref={(el) => {
                  if (!el) return
                  const data = dataRef.current.get(c.id)
                  if (data) data.paths[i] = el
                }}
                d=""
                fill="none"
                stroke="none"
              />
              <text
                ref={(el) => {
                  if (!el) return
                  const data = dataRef.current.get(c.id)
                  if (data) data.texts[i] = el
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
                    if (data) data.textPathEls[i] = el
                  }}
                  href={`#spine-${c.id}-${i}`}
                  startOffset="50%"
                  textAnchor="middle"
                />
              </text>
            </g>
          ))
          return lines
        })}
      </svg>

      {visibleCountries.map((c) => {
        const info = getCountryInfo(c.id)
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
                  capitalEl: null,
                  texts: Array.from({ length: MAX_LABEL_LINES }, () => null),
                  textPathEls: Array.from({ length: MAX_LABEL_LINES }, () => null),
                  paths: Array.from({ length: MAX_LABEL_LINES }, () => null),
                  pointLineEls: Array.from({ length: MAX_LABEL_LINES }, () => null),
                  lastLines: [],
                  country: c,
                  displayName: info?.name ?? c.name,
                  shortName: info?.shortName,
                  capital: info?.capital,
                  center: new THREE.Vector3(interior.x, 0.5, -interior.y),
                  boundsWidth: bounds.width,
                  boundsHeight: bounds.height,
                  spineWorld: spine,
                  aspect: bounds.height > 0 ? bounds.width / bounds.height : 1,
                  lastMode: '',
                  lastEligible: '',
                  lastSpineLen: '',
                  lastAspect: '',
                  lastFontSize: '',
                  lastRenderNameAttr: '',
                  lastCapitalVisible: '',
                }
                dataRef.current.set(c.id, data)
              } else {
                data.div = el
              }
            }}
            className="absolute font-medium text-center"
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
            <div data-country-name style={{ fontWeight: 600 }}>
              {Array.from({ length: MAX_LABEL_LINES }, (_, i) => (
                <div
                  key={`point-line-${i}`}
                  ref={(el) => {
                    if (!el) return
                    const data = dataRef.current.get(c.id)
                    if (data) data.pointLineEls[i] = el
                  }}
                  style={{ display: 'none' }}
                />
              ))}
            </div>
            {capital && layer === 'unified' && (
              <div
                data-capital
                ref={(el) => {
                  if (!el) return
                  const data = dataRef.current.get(c.id)
                  if (data) data.capitalEl = el
                }}
                style={{ fontSize: '0.65em', opacity: 0.7, fontStyle: 'italic', display: 'none' }}
              >
                ★ {capital}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
