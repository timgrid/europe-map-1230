// Purpose: пишет текущее состояние камеры в cameraSnapshot (sibling Canvas) | использует rAF, не useFrame, чтобы работать независимо от frameloop='demand'
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { cameraSnapshot } from '../state/cameraState'

export default function CameraBridge() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useEffect(() => {
    let raf = 0
    let running = true
    const update = () => {
      if (!running) return
      const cam = camera as THREE.PerspectiveCamera
      cameraSnapshot.position.copy(cam.position)
      cameraSnapshot.quaternion.copy(cam.quaternion)
      cameraSnapshot.fov = cam.fov
      cameraSnapshot.viewportWidth = size.width
      cameraSnapshot.viewportHeight = size.height
      cameraSnapshot.version++
      raf = requestAnimationFrame(update)
    }
    raf = requestAnimationFrame(update)
    return () => {
      running = false
      cancelAnimationFrame(raf)
    }
  }, [camera, size])
  return null
}
