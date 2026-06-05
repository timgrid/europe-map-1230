// Purpose: 3D-канвас (R3F + three.js) — вынесен в отдельный модуль для React.lazy code-split
// Один импорт three.js + drei ~280 KB gzip не нужен до первого рендера карты
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import MapScene from './MapScene'
import CameraRig from './CameraRig'
import CameraBridge from './CameraBridge'
import type { CountryGeometry } from '../utils/geoParser'

const PAN = 1
const DOLLY_ROTATE = 3

interface MapCanvasProps {
  countries: CountryGeometry[]
  cameraPosition: [number, number, number]
  worldCenter: [number, number, number]
  fov: number
  minDistance: number
  maxDistance: number
  isMobile: boolean
  isActive: boolean
  mapCenterX: number
  mapCenterY: number
  onPointerMissed: (event: MouseEvent) => void
}

export default function MapCanvas({
  countries,
  cameraPosition,
  worldCenter,
  fov,
  minDistance,
  maxDistance,
  isMobile,
  isActive,
  mapCenterX,
  mapCenterY,
  onPointerMissed,
}: MapCanvasProps) {
  return (
    <Canvas
      camera={{ position: cameraPosition, fov, near: 0.1, far: 2000 }}
      shadows={!isMobile}
      dpr={isMobile ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: '#0a1628' }}
      onPointerMissed={onPointerMissed}
      frameloop={isActive ? 'demand' : 'never'}
    >
      <CameraRig position={cameraPosition} target={worldCenter} fov={fov} />
      <CameraBridge />

      <fog attach="fog" args={['#0a1628', 500, 1200]} />

      <ambientLight intensity={0.5} color="#ffd4a3" />
      <directionalLight
        position={[mapCenterX - 40, 100, -mapCenterY + 40]}
        intensity={1.2}
        color="#ffecd1"
        {...(isMobile
          ? { castShadow: false }
          : {
              castShadow: true,
              'shadow-mapSize-width': 2048,
              'shadow-mapSize-height': 2048,
              'shadow-camera-far': 500,
              'shadow-camera-left': -180,
              'shadow-camera-right': 180,
              'shadow-camera-top': 180,
              'shadow-camera-bottom': -180,
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
        minDistance={minDistance}
        maxDistance={maxDistance}
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
  )
}
