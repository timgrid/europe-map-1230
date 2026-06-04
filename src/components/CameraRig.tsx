// Purpose: императивное обновление камеры при смене года/aspect — Canvas camera prop применяется только на mount
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CameraRigProps {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

export default function CameraRig({ position, target, fov }: CameraRigProps) {
  // R3F's useThree() returns the live three.js camera object; mutating it
  // (fov, position, lookAt) is the standard R3F pattern for camera updates.
  /* eslint-disable react-hooks/immutability */
  const { camera } = useThree()

  useEffect(() => {
    const vFovRad = (fov * Math.PI) / 180
    if (camera instanceof THREE.PerspectiveCamera) {
      if (Math.abs(camera.fov - vFovRad) > 0.001) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }
    }
    camera.position.set(position[0], position[1], position[2])
    camera.lookAt(target[0], target[1], target[2])
    camera.updateMatrixWorld()
  }, [camera, position, target, fov])

  return null
  /* eslint-enable react-hooks/immutability */
}
