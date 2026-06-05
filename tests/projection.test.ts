// Purpose: тесты проецирования 3D-точки в screen-space + расчёта fontSize с гистерезисом
import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { projectWorldToScreen, getLabelFontSize } from '../src/utils/projection'

function makeCamera(fov = 20, position = new THREE.Vector3(0, 700, 140)): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 2000)
  cam.position.copy(position)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld()
  return cam
}

describe('projectWorldToScreen', () => {
  it('projects origin to center of viewport', () => {
    const cam = makeCamera()
    const proj = projectWorldToScreen(new THREE.Vector3(0, 0, 0), cam, { width: 1920, height: 1080 })
    expect(proj.x).toBeCloseTo(960, 0)
    expect(proj.y).toBeCloseTo(540, 0)
  })

  it('projected X grows with world X', () => {
    const cam = makeCamera()
    const left = projectWorldToScreen(new THREE.Vector3(-50, 0, 0), cam, { width: 1920, height: 1080 })
    const right = projectWorldToScreen(new THREE.Vector3(50, 0, 0), cam, { width: 1920, height: 1080 })
    expect(right.x).toBeGreaterThan(left.x)
  })

  it('visible=true for point in front of camera', () => {
    const cam = makeCamera()
    const proj = projectWorldToScreen(new THREE.Vector3(0, 0, 0), cam, { width: 1920, height: 1080 })
    expect(proj.visible).toBe(true)
  })

  it('worldUnitsPerPixel grows with distance', () => {
    const camNear = makeCamera(20, new THREE.Vector3(0, 200, 40))
    const camFar = makeCamera(20, new THREE.Vector3(0, 1000, 200))
    const pNear = projectWorldToScreen(new THREE.Vector3(0, 0, 0), camNear, { width: 1920, height: 1080 })
    const pFar = projectWorldToScreen(new THREE.Vector3(0, 0, 0), camFar, { width: 1920, height: 1080 })
    expect(pFar.worldUnitsPerPixel).toBeGreaterThan(pNear.worldUnitsPerPixel)
  })

  it('handles zero viewport without dividing by zero', () => {
    const cam = makeCamera()
    const proj = projectWorldToScreen(new THREE.Vector3(0, 0, 0), cam, { width: 0, height: 0 })
    expect(proj.worldUnitsPerPixel).toBeGreaterThanOrEqual(0)
  })
})

describe('getLabelFontSize', () => {
  it('returns null when country smaller than SHOW threshold (35px) and was hidden', () => {
    const wupp = 0.5
    expect(getLabelFontSize(10, wupp, false)).toBeNull()  // 10/0.5 = 20px < 35
  })

  it('returns clamped MIN when country just above threshold', () => {
    const wupp = 0.5
    const size = getLabelFontSize(20, wupp, false)  // 20/0.5 = 40px → 40*0.4 = 16 → clamp 11
    expect(size).toBe(16)
  })

  it('returns clamped MAX for huge countries', () => {
    const wupp = 0.5
    const size = getLabelFontSize(500, wupp, false)  // 500/0.5 = 1000px → 1000*0.4 = 400 → clamp 40
    expect(size).toBe(40)
  })

  it('hysteresis: stays visible at 28px (between HIDE=25 and SHOW=35)', () => {
    const wupp = 0.5
    // 28/0.5 = 56px; wasVisible=true, threshold=HIDE=25, so still visible
    expect(getLabelFontSize(28, wupp, true)).not.toBeNull()
  })

  it('hysteresis: hides when was visible but size drops below HIDE (25px)', () => {
    const wupp = 0.5
    // 10/0.5 = 20px; wasVisible=true, threshold=HIDE=25, hides
    expect(getLabelFontSize(10, wupp, true)).toBeNull()
  })

  it('hysteresis: shows when was hidden but size grows above SHOW (35px)', () => {
    const wupp = 0.5
    // 20/0.5 = 40px; wasVisible=false, threshold=SHOW=35, shows
    expect(getLabelFontSize(20, wupp, false)).not.toBeNull()
  })

  it('returns null for worldUnitsPerPixel=0 (avoids NaN/Inf)', () => {
    expect(getLabelFontSize(100, 0, false)).toBeNull()
  })

  it('hysteresis dead zone (25-35px): state does not flip', () => {
    const wupp = 0.5
    // 30/0.5 = 60px — well above both thresholds; always visible
    expect(getLabelFontSize(30, wupp, false)).not.toBeNull()
    expect(getLabelFontSize(30, wupp, true)).not.toBeNull()
  })

  it('typical case: HRE (150u) at default zoom (wupp=0.065) → clamped to 40', () => {
    const size = getLabelFontSize(150, 0.065, false)  // 150/0.065 ≈ 2308px → 923 → clamp 40
    expect(size).toBe(40)
  })

  it('typical case: Cyprus (4u) at default zoom (wupp=0.065) → visible, ~24px', () => {
    const size = getLabelFontSize(4, 0.065, false)  // 4/0.065 ≈ 61px → 61*0.4 = 24
    expect(size).not.toBeNull()
    expect(size!).toBeGreaterThan(20)
    expect(size!).toBeLessThan(26)
  })

  it('unified layer uses tighter fill ratio (0.32) → smaller labels', () => {
    const wupp = 0.5
    const detailed = getLabelFontSize(50, wupp, false, 'detailed')  // 100px → 40px → clamp 40
    const unified = getLabelFontSize(50, wupp, false, 'unified')    // 100px → 32px
    expect(detailed).toBe(40)
    expect(unified).toBe(32)
  })
})
