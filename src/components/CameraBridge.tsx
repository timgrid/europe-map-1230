// Purpose: пишет текущее состояние камеры в cameraSnapshot (внутри R3F Canvas, useFrame) | позволяет DOM-оверлею читать камеру без ре-рендера React
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { cameraSnapshot } from '../state/cameraState'

export default function CameraBridge() {
  const { camera, size } = useThree()
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera
    cameraSnapshot.position.copy(cam.position)
    cameraSnapshot.fov = cam.fov
    cameraSnapshot.viewportWidth = size.width
    cameraSnapshot.viewportHeight = size.height
    cameraSnapshot.version++
  })
  return null
}
