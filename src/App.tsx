// Purpose: корневой компонент приложения | App root — canvas R3F, UI-оверлей, загрузка данных
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SidePanel from './components/UI/SidePanel'
import Tooltip from './components/UI/Tooltip'
import LayerToggle from './components/UI/LayerToggle'
import YearToggle from './components/UI/YearToggle'
import LoadingScreen from './components/UI/LoadingScreen'
import ControlsHint from './components/UI/ControlsHint'
import FullscreenButton from './components/UI/FullscreenButton'
import MapOverlay from './components/MapOverlay'
import CanvasFallback from './components/CanvasFallback'

const MapCanvas = lazy(() => import('./components/MapCanvas'))
import { useMapStore } from './store'
import { loadYearData, type ProcessedData } from './utils/dataLoader'
import { parseEuropeGeoJSON, getMapCenter, type CountryGeometry } from './utils/geoParser'
import { getMapSize, getInitialCameraConfig } from './utils/camera'
import { useIsMobile } from './hooks/useDeviceType'
import { useTelegram } from './hooks/useTelegram'
import { useCloudStorageSync } from './hooks/useCloudStorageSync'
import TelegramBackButton from './components/TelegramBackButton'
import { isFullscreenSupported, getTelegram } from './utils/telegram'
import './index.css'

const CAMERA_FOV = 20
const CAMERA_POLAR = 0.2
const CAMERA_PADDING = 1.15
const CAMERA_MIN_DIST = 200
const CAMERA_MAX_DIST = 1500

function App() {
  const [countries, setCountries] = useState<CountryGeometry[]>([])
  const [mapCenter, setMapCenter] = useState({ x: 0, y: 0 })
  const [mapSize, setMapSize] = useState({ width: 300, height: 222 })
  const [aspect, setAspect] = useState(() => window.innerWidth / window.innerHeight)

  const currentYear = useMapStore((state) => state.currentYear)
  const isLoading = useMapStore((state) => state.isLoading)
  const setLoading = useMapStore((state) => state.setLoading)
  const reloadKey = useMapStore((state) => state.reloadKey)
  const setSelectedCountry = useMapStore((state) => state.setSelectedCountry)
  const isMobile = useIsMobile()
  const { isTG, theme, tg, viewportStableHeight, safeAreaInset, isActive, expand } = useTelegram()
  useCloudStorageSync()

  // Auto-expand + auto-fullscreen on first user gesture
  // (Telegram WebApp SDK requires both expand() and requestFullscreen()
  //  to be called from a user gesture handler; we attach once.)
  const expandTriedRef = useRef(false)
  useEffect(() => {
    if (!isTG || expandTriedRef.current) return
    const onFirstGesture = () => {
      if (expandTriedRef.current) return
      expandTriedRef.current = true
      expand()
      if (isFullscreenSupported()) {
        try { getTelegram()?.requestFullscreen?.() } catch { /* noop */ }
      }
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
    }
    window.addEventListener('pointerdown', onFirstGesture, { once: true })
    window.addEventListener('keydown', onFirstGesture, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
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
        setMapSize(getMapSize(data))
      })
      .catch((err) => {
        console.error(`Failed to load year ${currentYear}:`, err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [currentYear, reloadKey, setLoading])

  // Track viewport aspect for camera fit
  // In Telegram, use viewportStableHeight (real usable area) instead of
  // window.innerHeight — before expand()/fullscreen, the browser window is
  // tiny and aspect → ∞, pushing the camera past maxDistance (black screen).
  useEffect(() => {
    const computeAspect = () => {
      if (isTG && viewportStableHeight > 0) {
        return window.innerWidth / viewportStableHeight
      }
      return window.innerWidth / window.innerHeight
    }
    const onResize = () => setAspect(computeAspect())
    setAspect(computeAspect())
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [isTG, viewportStableHeight])

  // Compute camera position to fit the current map size on screen
  const cameraFit = useMemo(
    () => getInitialCameraConfig({
      mapWidth: mapSize.width,
      mapHeight: mapSize.height,
      fov: CAMERA_FOV,
      aspect,
      padding: CAMERA_PADDING,
      polarAngle: CAMERA_POLAR,
      minDistance: CAMERA_MIN_DIST,
      maxDistance: CAMERA_MAX_DIST,
    }),
    [mapSize.width, mapSize.height, aspect],
  )

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
  const cameraPosition: [number, number, number] = [
    mapCenter.x,
    cameraFit.yOffset,
    -mapCenter.y + cameraFit.zOffset,
  ]

  return (
    <div className={`relative w-screen overflow-hidden tg-ui ${isTG ? '' : 'bg-slate-900'}`}
      style={{
        ...(isTG
          ? {
              backgroundColor: theme.bg_color,
              height: `${viewportStableHeight}px`,
              paddingTop: `${safeAreaInset.top}px`,
              paddingBottom: `${safeAreaInset.bottom}px`,
              paddingLeft: `${safeAreaInset.left}px`,
              paddingRight: `${safeAreaInset.right}px`,
            }
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

      <CanvasFallback />

      <Suspense fallback={null}>
        <MapCanvas
          countries={countries}
          cameraPosition={cameraPosition}
          worldCenter={worldCenter}
          fov={CAMERA_FOV}
          minDistance={CAMERA_MIN_DIST}
          maxDistance={CAMERA_MAX_DIST}
          isMobile={isMobile}
          isTG={isTG}
          isActive={isActive}
          mapCenterX={mapCenter.x}
          mapCenterY={mapCenter.y}
          onPointerMissed={handlePointerMissed}
        />
      </Suspense>

      {countries.length > 0 && <MapOverlay countries={countries} />}

      <TelegramBackButton />
      <FullscreenButton />

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

        {/* Reset button — hidden in TG (BackButton handles this) */}
        {!isTG && (
          <button
            onClick={() => setSelectedCountry(null)}
            className={`touch-target absolute top-1/2 -translate-y-1/2 z-30 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-slate-800/80 text-slate-300 border-slate-600 hover:border-amber-200/50 pointer-events-auto ${isMobile ? 'right-2' : 'top-4 left-1/2 -translate-x-1/2'}`}
          >
            ✕
          </button>
        )}

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
