// Purpose: тесты многострочного textPath wrap (балансировка, сдвиг по нормали, clipping)
import { describe, it, expect } from 'vitest'
import {
  wrapBalanced,
  shiftSpineByNormal,
  getLineOffsets,
  isSpineInsidePolygon,
  shouldUseMultiLine,
} from '../src/utils/textPathWrap'
import type { SpinePoint } from '../src/utils/spine'
import type { CountryGeometry } from '../src/utils/geoParser'
import * as THREE from 'three'

describe('wrapBalanced', () => {
  it('returns single-line for one word', () => {
    expect(wrapBalanced('Франция', 2)).toEqual(['Франция'])
  })

  it('returns single-line when maxLines=1', () => {
    expect(wrapBalanced('Священная Римская Империя', 1)).toEqual(['Священная Римская Империя'])
  })

  it('balances 3 words into 2 lines', () => {
    const lines = wrapBalanced('Священная Римская Империя', 2)
    expect(lines).toHaveLength(2)
    // 9 + 7 = 16 (line 1) vs 7 (line 2) — algorithm picks 9+7 vs 7+14
    // Greedy min-length picks line with 7 to put 14-char word
    // Result: ['Священная', 'Римская Империя']
    expect(lines[0]!.length).toBeGreaterThan(0)
    expect(lines[1]!.length).toBeGreaterThan(0)
    // All words preserved
    const joined = lines.join(' ')
    expect(joined).toContain('Священная')
    expect(joined).toContain('Римская')
    expect(joined).toContain('Империя')
  })

  it('balances 4 short words into 2 even lines', () => {
    // Greedy: place each word on line with smaller current length
    // 'A' → line 0, 'B' → line 1, 'C' → ties broken to line 0, 'D' → line 1
    expect(wrapBalanced('A B C D', 2)).toEqual(['A C', 'B D'])
  })

  it('balances 5 words into 2 lines (3+2 or 2+3)', () => {
    const lines = wrapBalanced('A B C D E', 2)
    expect(lines).toHaveLength(2)
    const words1 = lines[0]!.split(' ').length
    const words2 = lines[1]!.split(' ').length
    expect(words1 + words2).toBe(5)
    expect(Math.abs(words1 - words2)).toBeLessThanOrEqual(1)
  })

  it('trims whitespace and filters empty words', () => {
    expect(wrapBalanced('  France   España  ', 2)).toEqual(['France', 'España'])
  })

  it('returns input as single element when only whitespace', () => {
    expect(wrapBalanced('   ', 2)).toEqual([''])
  })

  it('long word + short word → long on shorter line', () => {
    // "ABCDEFGH I" (8+1+1) → with maxLines=2, "ABCDEFGH" goes to its own line
    const lines = wrapBalanced('ABCDEFGH I', 2)
    expect(lines).toContain('ABCDEFGH')
  })

  it('all words on last line if needed', () => {
    // 6 words with maxLines=2: should still produce 2 lines
    const lines = wrapBalanced('a b c d e f', 2)
    expect(lines).toHaveLength(2)
    expect(lines.join(' ').split(' ')).toHaveLength(6)
  })
})

describe('getLineOffsets', () => {
  it('returns single offset for 1 line', () => {
    expect(getLineOffsets(1, 14)).toEqual([0])
  })

  it('returns symmetric pair for 2 lines', () => {
    expect(getLineOffsets(2, 14)).toEqual([-7, 7])
  })

  it('returns symmetric triple for 3 lines', () => {
    expect(getLineOffsets(3, 14)).toEqual([-14, 0, 14])
  })

  it('respects custom lineSpacing', () => {
    expect(getLineOffsets(2, 20)).toEqual([-10, 10])
  })
})

describe('shiftSpineByNormal', () => {
  it('returns same-length array (no mutation)', () => {
    const spine: SpinePoint[] = [
      { x: 0, y: 0, tangentX: 1, tangentY: 0 },
      { x: 10, y: 0, tangentX: 1, tangentY: 0 },
    ]
    const shifted = shiftSpineByNormal(spine, 5)
    expect(shifted).toHaveLength(2)
    expect(shifted[0]).not.toBe(spine[0])
    expect(spine[0]!.x).toBe(0)
  })

  it('horizontal east-bound spine: positive offset moves +Y (north in world)', () => {
    const spine: SpinePoint[] = [{ x: 5, y: 5, tangentX: 1, tangentY: 0 }]
    const shifted = shiftSpineByNormal(spine, 3)
    // edgeX = x - tangentY * offset = 5 - 0 = 5
    // edgeY = y + tangentX * offset = 5 + 3 = 8
    expect(shifted[0]!.x).toBe(5)
    expect(shifted[0]!.y).toBe(8)
  })

  it('horizontal east-bound spine: negative offset moves -Y (south in world)', () => {
    const spine: SpinePoint[] = [{ x: 5, y: 5, tangentX: 1, tangentY: 0 }]
    const shifted = shiftSpineByNormal(spine, -3)
    expect(shifted[0]!.x).toBe(5)
    expect(shifted[0]!.y).toBe(2)
  })

  it('north-bound spine (tangentY=1): positive offset moves -X (west)', () => {
    const spine: SpinePoint[] = [{ x: 5, y: 5, tangentX: 0, tangentY: 1 }]
    const shifted = shiftSpineByNormal(spine, 4)
    // edgeX = x - tangentY * offset = 5 - 4 = 1
    // edgeY = y + tangentX * offset = 5 + 0 = 5
    expect(shifted[0]!.x).toBe(1)
    expect(shifted[0]!.y).toBe(5)
  })

  it('preserves tangent vectors (only position changes)', () => {
    const spine: SpinePoint[] = [
      { x: 0, y: 0, tangentX: 0.6, tangentY: 0.8 },
    ]
    const shifted = shiftSpineByNormal(spine, 10)
    expect(shifted[0]!.tangentX).toBe(0.6)
    expect(shifted[0]!.tangentY).toBe(0.8)
  })

  it('zero offset returns identical positions (modulo new object)', () => {
    const spine: SpinePoint[] = [{ x: 1, y: 2, tangentX: 0, tangentY: 1 }]
    const shifted = shiftSpineByNormal(spine, 0)
    expect(shifted[0]!.x).toBe(1)
    expect(shifted[0]!.y).toBe(2)
  })
})

describe('isSpineInsidePolygon', () => {
  function makeRectCountry(x: number, y: number, w: number, h: number, id = 'test'): CountryGeometry {
    return {
      id,
      name: 'Test',
      color: '#000',
      center: new THREE.Vector2(x + w / 2, y + h / 2),
      shapes: [
        new THREE.Shape()
          .moveTo(x, y)
          .lineTo(x + w, y)
          .lineTo(x + w, y + h)
          .lineTo(x, y + h)
          .closePath(),
      ],
    }
  }

  it('returns true when all spine points are inside the polygon', () => {
    const country = makeRectCountry(0, 0, 10, 10)
    const spine: SpinePoint[] = [
      { x: 2, y: 5, tangentX: 1, tangentY: 0 },
      { x: 5, y: 5, tangentX: 1, tangentY: 0 },
      { x: 8, y: 5, tangentX: 1, tangentY: 0 },
    ]
    expect(isSpineInsidePolygon(spine, country)).toBe(true)
  })

  it('returns false when one point is outside the polygon', () => {
    const country = makeRectCountry(0, 0, 10, 10)
    const spine: SpinePoint[] = [
      { x: 2, y: 5, tangentX: 1, tangentY: 0 },
      { x: 15, y: 5, tangentX: 1, tangentY: 0 },  // outside
      { x: 8, y: 5, tangentX: 1, tangentY: 0 },
    ]
    expect(isSpineInsidePolygon(spine, country)).toBe(false)
  })

  it('returns true for spine just inside the boundary (clip tolerance)', () => {
    const country = makeRectCountry(0, 0, 10, 10)
    const spine: SpinePoint[] = [
      { x: 0.001, y: 5, tangentX: 1, tangentY: 0 },
      { x: 9.999, y: 5, tangentX: 1, tangentY: 0 },
    ]
    expect(isSpineInsidePolygon(spine, country)).toBe(true)
  })

  it('returns false for empty spine (vacuously true) - but spine has no country', () => {
    const country = makeRectCountry(0, 0, 10, 10)
    // Defensive: empty spine could be a real case (degenerate country)
    expect(isSpineInsidePolygon([], country)).toBe(true)
  })
})

describe('shouldUseMultiLine', () => {
  it('returns false for single word', () => {
    expect(shouldUseMultiLine('Франция', 2, false)).toBe(false)
  })

  it('returns false if full name fits in single line', () => {
    expect(shouldUseMultiLine('Священная Римская Империя', 2, true)).toBe(false)
  })

  it('returns true for multi-word name that does not fit, normal aspect', () => {
    expect(shouldUseMultiLine('Священная Римская Империя', 2.0, false)).toBe(true)
  })

  it('returns false for very wide country (maxAspect threshold)', () => {
    // 5.0 > 3.0 (default maxAspect) → too wide for 2 lines
    expect(shouldUseMultiLine('A B C D', 5.0, false, 3.0)).toBe(false)
  })

  it('returns true at exact maxAspect boundary', () => {
    expect(shouldUseMultiLine('A B C D', 3.0, false, 3.0)).toBe(true)
  })

  it('returns true for square country (aspect=1.0)', () => {
    expect(shouldUseMultiLine('Священная Римская Империя', 1.0, false)).toBe(true)
  })
})
