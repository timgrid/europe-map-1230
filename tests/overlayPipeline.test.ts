// Purpose: тесты overlay pipeline helpers (classifyLabelMode, isSpineEligible, setAttrIfChanged, getRenderMode)
import { describe, it, expect, vi } from 'vitest'
import {
  classifyLabelMode,
  isSpineEligible,
  setAttrIfChanged,
  getRenderMode,
  ZOOM_MAX_POLITICAL,
  ZOOM_CLOSE_CULLING,
  SCREEN_AREA_MIN_THRESHOLD,
  TEXTPATH_MIN_SCREEN_PX,
  TEXTPATH_MIN_ASPECT,
} from '../src/utils/overlayPipeline'

describe('classifyLabelMode', () => {
  it('returns hidden when center not visible', () => {
    expect(classifyLabelMode(false, false)).toBe('hidden')
    expect(classifyLabelMode(false, true)).toBe('hidden')
  })

  it('returns point when center visible but spine not eligible', () => {
    expect(classifyLabelMode(true, false)).toBe('point')
  })

  it('returns textpath when center visible and spine eligible', () => {
    expect(classifyLabelMode(true, true)).toBe('textpath')
  })

  it('center visibility is the primary gate (never textpath/point if hidden)', () => {
    expect(classifyLabelMode(false, true)).toBe('hidden')
    expect(classifyLabelMode(false, false)).toBe('hidden')
  })
})

describe('isSpineEligible', () => {
  it('returns true when all three thresholds met', () => {
    expect(isSpineEligible({ visibleCount: 24, screenLen: 250, aspect: 2.0 })).toBe(true)
  })

  it('returns false when visibleCount < 2 (need at least 2 visible points)', () => {
    expect(isSpineEligible({ visibleCount: 1, screenLen: 500, aspect: 5 })).toBe(false)
    expect(isSpineEligible({ visibleCount: 0, screenLen: 500, aspect: 5 })).toBe(false)
  })

  it('returns false when screenLen < TEXTPATH_MIN_SCREEN_PX (80)', () => {
    expect(isSpineEligible({ visibleCount: 24, screenLen: 79, aspect: 5 })).toBe(false)
    expect(isSpineEligible({ visibleCount: 24, screenLen: TEXTPATH_MIN_SCREEN_PX - 1, aspect: 5 })).toBe(false)
  })

  it('returns true at exact screenLen boundary', () => {
    expect(isSpineEligible({ visibleCount: 24, screenLen: TEXTPATH_MIN_SCREEN_PX, aspect: 5 })).toBe(true)
  })

  it('returns false when aspect < TEXTPATH_MIN_ASPECT (1.3)', () => {
    expect(isSpineEligible({ visibleCount: 24, screenLen: 500, aspect: 1.29 })).toBe(false)
    expect(isSpineEligible({ visibleCount: 24, screenLen: 500, aspect: 1 })).toBe(false)
  })

  it('returns true at exact aspect boundary', () => {
    expect(isSpineEligible({ visibleCount: 24, screenLen: 500, aspect: TEXTPATH_MIN_ASPECT })).toBe(true)
  })

  it('exports the documented threshold constants', () => {
    expect(TEXTPATH_MIN_SCREEN_PX).toBe(80)
    expect(TEXTPATH_MIN_ASPECT).toBe(1.3)
  })
})

describe('setAttrIfChanged', () => {
  it('calls setAttribute when value differs from cached', () => {
    const el = { setAttribute: vi.fn() } as unknown as Element
    const cache = { value: 'old' }
    setAttrIfChanged(el, 'data-mode', 'new', cache)
    expect(el.setAttribute).toHaveBeenCalledWith('data-mode', 'new')
    expect(cache.value).toBe('new')
  })

  it('skips setAttribute when value matches cached', () => {
    const el = { setAttribute: vi.fn() } as unknown as Element
    const cache = { value: 'same' }
    setAttrIfChanged(el, 'data-mode', 'same', cache)
    expect(el.setAttribute).not.toHaveBeenCalled()
    expect(cache.value).toBe('same')
  })

  it('updates cache on first call (empty -> value)', () => {
    const el = { setAttribute: vi.fn() } as unknown as Element
    const cache = { value: '' }
    setAttrIfChanged(el, 'data-foo', 'bar', cache)
    expect(el.setAttribute).toHaveBeenCalledWith('data-foo', 'bar')
    expect(cache.value).toBe('bar')
  })

  it('returns true on change, false on no-op', () => {
    const el = { setAttribute: vi.fn() } as unknown as Element
    expect(setAttrIfChanged(el, 'a', '1', { value: '' })).toBe(true)
    expect(setAttrIfChanged(el, 'a', '1', { value: '1' })).toBe(false)
    expect(setAttrIfChanged(el, 'a', '2', { value: '1' })).toBe(true)
  })
})

describe('overlayPipeline pipeline integration', () => {
  it('classifyLabelMode outcome matches isSpineEligible outcome for the same inputs', () => {
    // If spine eligible + center visible → textpath. If not eligible + center visible → point.
    // The two helpers must agree on what "eligible" means (single source of truth).
    const samples: Array<{ visibleCount: number; screenLen: number; aspect: number; centerVisible: boolean }> = [
      { visibleCount: 24, screenLen: 500, aspect: 3, centerVisible: true },   // textpath
      { visibleCount: 24, screenLen: 50, aspect: 3, centerVisible: true },    // point
      { visibleCount: 1, screenLen: 500, aspect: 3, centerVisible: true },    // point
      { visibleCount: 24, screenLen: 500, aspect: 1, centerVisible: true },   // point
      { visibleCount: 24, screenLen: 500, aspect: 3, centerVisible: false },  // hidden
    ]
    for (const s of samples) {
      const eligible = isSpineEligible(s)
      const mode = classifyLabelMode(s.centerVisible, eligible)
      if (mode === 'textpath') {
        expect(eligible).toBe(true)
        expect(s.centerVisible).toBe(true)
      } else if (mode === 'point') {
        expect(eligible).toBe(false)
        expect(s.centerVisible).toBe(true)
      } else {
        expect(s.centerVisible).toBe(false)
      }
    }
  })
})

describe('getRenderMode (Clausewitz culling state machine)', () => {
  // Constants from defines.lua equivalents
  const POLITICAL_LOW = ZOOM_CLOSE_CULLING + 100  // 180

  it('returns world_metric when camera farther than ZOOM_MAX_POLITICAL', () => {
    expect(getRenderMode({
      cameraDistance: ZOOM_MAX_POLITICAL + 1,
      screenSpineLength: 500,
      screenArea: 10000,
    })).toBe('world_metric')
    expect(getRenderMode({
      cameraDistance: 2000,
      screenSpineLength: 100,
      screenArea: 5000,
    })).toBe('world_metric')
  })

  it('returns point when screenArea below SCREEN_AREA_MIN_THRESHOLD', () => {
    expect(getRenderMode({
      cameraDistance: POLITICAL_LOW,
      screenSpineLength: 500,
      screenArea: SCREEN_AREA_MIN_THRESHOLD - 1,
    })).toBe('point')
    // Edge: tiny country, mid zoom
    expect(getRenderMode({
      cameraDistance: 300,
      screenSpineLength: 30,  // spine too short too
      screenArea: 100,
    })).toBe('point')
  })

  it('returns hidden when camera closer than ZOOM_CLOSE_CULLING', () => {
    expect(getRenderMode({
      cameraDistance: ZOOM_CLOSE_CULLING - 1,
      screenSpineLength: 500,
      screenArea: 10000,
    })).toBe('hidden')
    expect(getRenderMode({
      cameraDistance: 0,
      screenSpineLength: 1000,
      screenArea: 100000,
    })).toBe('hidden')
  })

  it('returns textpath when in political range AND spine eligible', () => {
    expect(getRenderMode({
      cameraDistance: POLITICAL_LOW,
      screenSpineLength: TEXTPATH_MIN_SCREEN_PX + 10,
      screenArea: SCREEN_AREA_MIN_THRESHOLD * 4,
      spineEligible: true,
    })).toBe('textpath')
    // auto-detect eligibility from screenSpineLength when not provided
    expect(getRenderMode({
      cameraDistance: 300,
      screenSpineLength: 200,
      screenArea: 10000,
    })).toBe('textpath')
  })

  it('returns point when in political range but spine not eligible', () => {
    expect(getRenderMode({
      cameraDistance: POLITICAL_LOW,
      screenSpineLength: 50,
      screenArea: 10000,
      spineEligible: false,
    })).toBe('point')
    // spineEligible=undefined but screenSpineLength < threshold
    expect(getRenderMode({
      cameraDistance: 300,
      screenSpineLength: 30,
      screenArea: 10000,
    })).toBe('point')
  })

  it('priority order: world_metric > point > hidden > textpath', () => {
    // world_metric wins even if other conditions also true
    expect(getRenderMode({
      cameraDistance: 2000,           // > ZOOM_MAX_POLITICAL
      screenSpineLength: 1000,
      screenArea: 100,                // < THRESHOLD
    })).toBe('world_metric')

    // point wins over hidden when both true
    expect(getRenderMode({
      cameraDistance: 0,              // < ZOOM_CLOSE_CULLING
      screenSpineLength: 1000,
      screenArea: 100,                // < THRESHOLD
    })).toBe('point')

    // hidden wins over textpath at very close zoom
    expect(getRenderMode({
      cameraDistance: 0,              // < ZOOM_CLOSE_CULLING
      screenSpineLength: 500,
      screenArea: 100000,
      spineEligible: true,
    })).toBe('hidden')
  })

  it('exports Clausewitz-equivalent constants', () => {
    expect(ZOOM_MAX_POLITICAL).toBe(800)
    expect(ZOOM_CLOSE_CULLING).toBe(80)
    expect(SCREEN_AREA_MIN_THRESHOLD).toBe(80 * 80)
  })
})
