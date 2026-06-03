// Purpose: корневой компонент приложения | App root — canvas R3F, UI-оверлей, загрузка данных
import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import MapScene from './components/MapScene'
import SidePanel from './components/UI/SidePanel'
import Tooltip from './components/UI/Tooltip'
import LayerToggle from './components/UI/LayerToggle'
import YearToggle from './components/UI/YearToggle'
import LoadingScreen from './components/UI/LoadingScreen'
import ControlsHint from './components/UI/ControlsHint'
import ExpandButton from './components/UI/ExpandButton'
import { useMapStore } from './store'
import { loadYearData, type ProcessedData } from './utils/dataLoader'
import { parseEuropeGeoJSON, getMapCenter, type CountryGeometry } from './utils/geoParser'
import { useIsMobile } from './hooks/useDeviceType'
import { useTelegram } from './hooks/useTelegram'
import TelegramBackButton from './components/TelegramBackButton'
import './index.css'

const PAN = 1
const DOLLY_ROTATE = 3

function App() {
  const [countries, setCountries] = useState<CountryGeometry[]>([])
  const [mapCenter, setMapCenter] = useState({ x: 0, y: 0 })

  const currentYear = useMapStore((state) => state.currentYear)
  const isLoading = useMapStore((state) => state.isLoading)
  const setLoading = useMapStore((state) => state.setLoading)
  const reloadKey = useMapStore((state) => state.reloadKey)
  const setSelectedCountry = useMapStore((state) => state.setSelectedCountry)
  const isMobile = useIsMobile()
  const { isTG, theme, tg, viewportStableHeight, expand } = useTelegram()

  // Auto-expand on first user gesture (Telegram allows expand() only after user gesture)
  const expandTriedRef = useRef(false)
  useEffect(() => {
    if (!isTG || expandTriedRef.current) return
    const tryExpand = () => {
      if (expandTriedRef.current) return
      expandTriedRef.current = true
      expand()
      window.removeEventListener('pointerdown', tryExpand)
      window.removeEventListener('keydown', tryExpand)
    }
    window.addEventListener('pointerdown', tryExpand, { once: true })
    window.addEventListener('keydown', tryExpand, { once: true })
    return () => {
      window.removeEventListener('pointerdown', tryExpand)
      window.removeEventListener('keydown', tryExpand)
    }
  }, [isTG, expand])

  // Set Telegram header/bg/bottom bar color on init
  useEffect(() => {
    if (isTG && tg) {
      tg.setHeaderColor(theme.bg_color)
      tg.setBackgroundColor('#0a1628')
      if (typeof tg.setBottomBarColor === 'function') {
        tg.setBottomBarColor(theme.bg_color)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTG])

  // A4: discard pointermissed after drag
  const pointerDown = useRef<{ x: number; y: number } | null>(null)

  // Load data when year changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadYearData(currentYear)
      .then((data: ProcessedData) => {
        if (cancelled) return
        setCountries(parseEuropeGeoJSON(data))
        const center = getMapCenter(data)
        setMapCenter({ x: center.x, y: center.y })
      })
      .catch((err) => {
        console.error(`Failed to load year ${currentYear}:`, err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [currentYear, reloadKey, setLoading])

  const handlePointerMissed = useCallback((event: MouseEvent) => {
    if (pointerDown.current) {
      const dx = event.clientX - pointerDown.current.x
      const dy = event.clientY - pointerDown.current.y
      if (Math.hypot(dx, dy) > 5) return
      pointerDown.current = null
    }
    setSelectedCountry(null)
  }, [setSelectedCountry])

  const worldCenter: [number, number, number] = [mapCenter.x, 0, -mapCenter.y]
  const cameraPosition: [number, number, number] = [mapCenter.x, 180, -mapCenter.y + 25]

  return (
    <div className={`relative w-screen overflow-hidden tg-ui ${isTG ? '' : 'bg-slate-900'}`}
      style={{
        ...(isTG
          ? { backgroundColor: theme.bg_color, height: `${viewportStableHeight}px` }
          : { height: '100vh' }),
        '--tg-bg': theme.bg_color,
        '--tg-text': theme.text_color,
        '--tg-hint': theme.hint_color,
        '--tg-link': theme.link_color,
        '--tg-button': theme.button_color,
        '--tg-button-text': theme.button_text_color,
        '--tg-secondary-bg': theme.secondary_bg_color,
      } as unknown as React.CSSProperties}
      onPointerDown={(e) => { pointerDown.current = { x: e.clientX, y: e.clientY } }}
    >
      {isLoading && <LoadingScreen />}

      <Canvas
        camera={{ position: cameraPosition, fov: 18, near: 0.1, far: 800 }}
        shadows={!isMobile}
        dpr={isMobile ? [1, 1.25] : [1, 1.75]}
        gl={{ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' }}
        style={{ background: '#0a1628' }}
        onPointerMissed={handlePointerMissed}
        frameloop="demand"
      >
        <fog attach="fog" args={['#0a1628', 300, 600]} />

        <ambientLight intensity={0.5} color="#ffd4a3" />
        <directionalLight
          position={[mapCenter.x - 40, 100, -mapCenter.y + 40]}
          intensity={1.2}
          color="#ffecd1"
          {...(isMobile
            ? { castShadow: false }
            : {
                castShadow: true,
                'shadow-mapSize-width': 2048,
                'shadow-mapSize-height': 2048,
                'shadow-camera-far': 400,
                'shadow-camera-left': -150,
                'shadow-camera-right': 150,
                'shadow-camera-top': 150,
                'shadow-camera-bottom': -150,
              })}
        />
        <hemisphereLight args={['#87CEEB', '#8B4513', 0.3]} />

        {countries.length > 0 && <MapScene countries={countries} />}

        <OrbitControls
          mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 0 }}
          touches={{ ONE: PAN, TWO: DOLLY_ROTATE }}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minPolarAngle={0.1}
          maxPolarAngle={0.6}
          minDistance={80}
          maxDistance={400}
          rotateSpeed={0.25}
          zoomSpeed={0.6}
          panSpeed={0.8}
          enableDamping={true}
          dampingFactor={0.05}
          screenSpacePanning={true}
          target={worldCenter}
          makeDefault
        />
      </Canvas>

      <TelegramBackButton />
      <ExpandButton />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }}>
        {/* Top-right controls */}
        <div className={`absolute ${isMobile ? 'top-2 right-2 left-2' : 'top-4 right-4'} flex flex-col gap-2 items-end`}>
          <div className={isMobile ? 'w-full' : ''}>
            <YearToggle />
          </div>
          <LayerToggle />
        </div>

        <Tooltip />
        <SidePanel />

        {/* Title */}
        <div className={`absolute ${isMobile ? 'top-16 left-2' : 'top-4 left-4'} pointer-events-auto`}>
          <h1 className={`font-bold drop-shadow-lg ${isMobile ? 'text-lg' : 'text-3xl'}`} style={{ fontFamily: 'Georgia, serif', color: isTG ? theme.text_color : '#fef3c7' }}>
            Европа в {currentYear} году
          </h1>
          {!isMobile && (
            <p className="text-sm mt-1 tracking-wide" style={{ color: isTG ? theme.hint_color : 'rgba(253,230,138,0.7)' }}>Интерактивная политическая карта</p>
          )}
        </div>

        {/* Reset button */}
        <button
          onClick={() => setSelectedCountry(null)}
          className={`touch-target absolute top-1/2 -translate-y-1/2 z-30 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-slate-800/80 text-slate-300 border-slate-600 hover:border-amber-200/50 pointer-events-auto ${isMobile ? 'right-2' : 'top-4 left-1/2 -translate-x-1/2'}`}
        >
          ✕
        </button>

        <ControlsHint />

        {/* Scale */}
        <div className="absolute bottom-4 right-4 text-xs pointer-events-auto" style={{ color: isTG ? theme.hint_color : 'rgba(148,163,184,0.8)' }}>
          <div className="flex items-end gap-1">
            <div className="w-20 sm:w-24 h-0.5 bg-amber-200/60 relative">
              <div className="absolute -top-1 left-0 w-0.5 h-2 bg-amber-200/60" />
              <div className="absolute -top-1 right-0 w-0.5 h-2 bg-amber-200/60" />
            </div>
            <span className="mb-2">500 км</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
