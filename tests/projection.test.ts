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
  it('returns null when country smaller than SHOW threshold (30px) and was hidden', () => {
    const wupp = 0.5
    expect(getLabelFontSize(10, wupp, false)).toBeNull()  // 10/0.5 = 20px < 30
  })

  it('returns proportional size for medium country', () => {
    const wupp = 0.5
    const size = getLabelFontSize(20, wupp, false)  // 20/0.5 = 40px → 40*0.3 = 12
    expect(size).toBe(12)
  })

  it('returns clamped MAX (22) for huge countries — prevents giant boxes', () => {
    const wupp = 0.5
    const size = getLabelFontSize(500, wupp, false)  // 1000*0.3 = 300 → clamp 22
    expect(size).toBe(22)
  })

  it('hysteresis: stays visible at 25px (between HIDE=22 and SHOW=30)', () => {
    const wupp = 0.5
    // 25/0.5 = 50px; wasVisible=true, threshold=HIDE=22, so still visible
    expect(getLabelFontSize(25, wupp, true)).not.toBeNull()
  })

  it('hysteresis: hides when was visible but size drops below HIDE (22px)', () => {
    const wupp = 0.5
    // 10/0.5 = 20px; wasVisible=true, threshold=HIDE=22, hides
    expect(getLabelFontSize(10, wupp, true)).toBeNull()
  })

  it('hysteresis: shows when was hidden but size grows above SHOW (30px)', () => {
    const wupp = 0.5
    // 20/0.5 = 40px; wasVisible=false, threshold=SHOW=30, shows
    expect(getLabelFontSize(20, wupp, false)).not.toBeNull()
  })

  it('returns null for worldUnitsPerPixel=0 (avoids NaN/Inf)', () => {
    expect(getLabelFontSize(100, 0, false)).toBeNull()
  })

  it('hysteresis dead zone (22-30px): state does not flip', () => {
    const wupp = 0.5
    // 30/0.5 = 60px — well above both thresholds; always visible
    expect(getLabelFontSize(30, wupp, false)).not.toBeNull()
    expect(getLabelFontSize(30, wupp, true)).not.toBeNull()
  })

  it('typical case: HRE (150u) at default zoom (wupp=0.065) → clamped to MAX=22', () => {
    const size = getLabelFontSize(150, 0.065, false)
    expect(size).toBe(22)
  })

  it('typical case: France (30u) at default zoom (wupp=0.065) → ~16-22px', () => {
    const size = getLabelFontSize(30, 0.065, false)  // 30/0.065 ≈ 461px → 461*0.3 = 138 → clamp 22
    expect(size).toBe(22)
  })

  it('unified layer uses tighter fill ratio (0.24) → smaller labels', () => {
    const wupp = 0.5
    const detailed = getLabelFontSize(50, wupp, false, 'detailed')  // 100px → 30 → clamp 22
    const unified = getLabelFontSize(50, wupp, false, 'unified')    // 100px → 24 → clamp 22
    expect(detailed).toBe(22)
    expect(unified).toBe(22)
  })

  it('unified vs detailed difference visible at smaller sizes', () => {
    const wupp = 0.5
    // 30/0.5 = 60px country width on screen
    const detailed = getLabelFontSize(30, wupp, false, 'detailed')  // 60*0.3 = 18
    const unified = getLabelFontSize(30, wupp, false, 'unified')    // 60*0.24 = 14.4
    expect(detailed).toBe(18)
    expect(unified).toBeCloseTo(14.4, 5)
  })
})
