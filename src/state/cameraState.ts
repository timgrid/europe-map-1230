// Purpose: shared camera snapshot written by CameraBridge (inside Canvas) and read by MapOverlay (sibling DOM tree) | mutable ref to avoid Zustand re-render churn on every frame
import * as THREE from 'three'

export interface CameraSnapshot {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  fov: number
  viewportWidth: number
  viewportHeight: number
  version: number
}

export const cameraSnapshot: CameraSnapshot = {
  position: new THREE.Vector3(0, 0, 0),
  quaternion: new THREE.Quaternion(),
  fov: 20,
  viewportWidth: 0,
  viewportHeight: 0,
  version: 0,
}

const _camera = new THREE.PerspectiveCamera(20, 1, 0.1, 2000)

export function getProjectionCamera(): THREE.PerspectiveCamera {
  _camera.position.copy(cameraSnapshot.position)
  _camera.quaternion.copy(cameraSnapshot.quaternion)
  _camera.fov = cameraSnapshot.fov
  _camera.aspect = cameraSnapshot.viewportWidth / Math.max(1, cameraSnapshot.viewportHeight)
  _camera.updateProjectionMatrix()
  _camera.updateMatrixWorld()
  return _camera
}
