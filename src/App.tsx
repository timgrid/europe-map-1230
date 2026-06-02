import { useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import MapScene from './components/MapScene'
import SidePanel from './components/UI/SidePanel'
import Tooltip from './components/UI/Tooltip'
import LayerToggle from './components/UI/LayerToggle'
import YearToggle from './components/UI/YearToggle'
import LoadingScreen from './components/UI/LoadingScreen'
import { useMapStore } from './store'
import { loadYearData, type ProcessedData } from './utils/dataLoader'
import { parseEuropeGeoJSON, getMapCenter, type CountryGeometry } from './utils/geoParser'
import './index.css'

function App() {
  const [countries, setCountries] = useState<CountryGeometry[]>([])
  const [mapCenter, setMapCenter] = useState({ x: 0, y: 0 })

  const currentYear = useMapStore((state) => state.currentYear)
  const isLoading = useMapStore((state) => state.isLoading)
  const setLoading = useMapStore((state) => state.setLoading)
  const setSelectedCountry = useMapStore((state) => state.setSelectedCountry)

  // Load data when year changes
  useEffect(() => {
    let cancelled = false
    loadYearData(currentYear).then((data: ProcessedData) => {
      if (cancelled) return
      setCountries(parseEuropeGeoJSON(data))
      const center = getMapCenter(data)
      setMapCenter({ x: center.x, y: center.y })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [currentYear, setLoading])

  const handlePointerMissed = useCallback(() => {
    setSelectedCountry(null)
  }, [setSelectedCountry])

  const worldCenter: [number, number, number] = [mapCenter.x, 0, -mapCenter.y]
  const cameraPosition: [number, number, number] = [mapCenter.x, 180, -mapCenter.y + 25]

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900">
      {isLoading && <LoadingScreen />}

      <Canvas
        camera={{ position: cameraPosition, fov: 18, near: 0.1, far: 800 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a1628' }}
        onPointerMissed={handlePointerMissed}
      >
        <fog attach="fog" args={['#0a1628', 300, 600]} />

        <ambientLight intensity={0.5} color="#ffd4a3" />
        <directionalLight
          position={[mapCenter.x - 40, 100, -mapCenter.y + 40]}
          intensity={1.2}
          color="#ffecd1"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={400}
          shadow-camera-left={-150}
          shadow-camera-right={150}
          shadow-camera-top={150}
          shadow-camera-bottom={-150}
        />
        <hemisphereLight args={['#87CEEB', '#8B4513', 0.3]} />

        {countries.length > 0 && <MapScene countries={countries} />}

        <OrbitControls
          mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 0 }}
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

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <YearToggle />
          <LayerToggle />
        </div>
        <Tooltip />
        <SidePanel />

        {/* Title */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <h1 className="text-3xl font-bold text-amber-100 drop-shadow-lg" style={{ fontFamily: 'Georgia, serif' }}>
            Европа в {currentYear} году
          </h1>
          <p className="text-sm text-amber-200/70 mt-1 tracking-wide">Интерактивная политическая карта</p>
        </div>

        {/* Reset button */}
        <button
          onClick={() => setSelectedCountry(null)}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-slate-800/80 text-slate-300 border-slate-600 hover:border-amber-200/50 pointer-events-auto"
        >
          Сбросить выбор
        </button>

        {/* Controls hint */}
        <div className="absolute bottom-4 left-4 text-xs text-slate-400/80 pointer-events-auto bg-slate-900/50 px-3 py-2 rounded-lg backdrop-blur-sm">
          <p>ЛКМ + движение — сдвиг карты</p>
          <p>ПКМ + движение — вращение камеры</p>
          <p>Прокрутка — масштаб</p>
          <p>Клик по стране — информация</p>
        </div>

        {/* Scale */}
        <div className="absolute bottom-4 right-4 text-xs text-slate-400/80 pointer-events-auto">
          <div className="flex items-end gap-1">
            <div className="w-24 h-0.5 bg-amber-200/60 relative">
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
