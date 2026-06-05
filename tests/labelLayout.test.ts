// Purpose: тесты для labelLayout — размер подписи + разрешение пересечений с приоритетом
import { describe, it, expect } from 'vitest'
import { boxesIntersect, estimateLabelBox, resolveLabelOverlaps, type LabelBox } from '../src/utils/labelLayout'

describe('estimateLabelBox', () => {
  it('computes single-line width from text length and font size', () => {
    const box = estimateLabelBox({ id: 'x', displayName: 'Франция', capital: undefined, fontSize: 16 })
    expect(box.width).toBeCloseTo('Франция'.length * 16 * 0.55, 5)
    expect(box.height).toBeCloseTo(16 * 1.05, 5)
  })

  it('uses two-line height when capital is present', () => {
    const withCapital = estimateLabelBox({ id: 'x', displayName: 'Франция', capital: 'Париж', fontSize: 16 })
    const without = estimateLabelBox({ id: 'x', displayName: 'Франция', capital: undefined, fontSize: 16 })
    expect(withCapital.height).toBeGreaterThan(without.height * 2 - 0.1)
  })

  it('width includes the star glyph + capital row when capital present', () => {
    const withCapital = estimateLabelBox({ id: 'x', displayName: 'Москва', capital: 'Москва', fontSize: 16 })
    const without = estimateLabelBox({ id: 'x', displayName: 'Москва', capital: undefined, fontSize: 16 })
    expect(withCapital.width).toBeGreaterThan(without.width)
  })

  it('zero-length name yields zero width', () => {
    const box = estimateLabelBox({ id: 'x', displayName: '', capital: undefined, fontSize: 12 })
    expect(box.width).toBe(0)
    expect(box.height).toBeGreaterThan(0)
  })
})

describe('boxesIntersect', () => {
  function boxAt(x: number, y: number, w: number, h: number): LabelBox {
    return { x, y, width: w, height: h, priority: 0, wasVisible: false }
  }

  it('overlapping boxes (AABB) intersect', () => {
    expect(boxesIntersect(boxAt(0, 0, 100, 20), boxAt(50, 0, 100, 20))).toBe(true)
    expect(boxesIntersect(boxAt(0, 0, 100, 20), boxAt(0, 0, 100, 20))).toBe(true)  // identical
  })

  it('non-overlapping boxes do not intersect (gap on X)', () => {
    expect(boxesIntersect(boxAt(0, 0, 100, 20), boxAt(150, 0, 100, 20))).toBe(false)
  })

  it('non-overlapping boxes do not intersect (gap on Y)', () => {
    expect(boxesIntersect(boxAt(0, 0, 100, 20), boxAt(0, 100, 100, 20))).toBe(false)
  })

  it('touching edges do not intersect (half-open)', () => {
    expect(boxesIntersect(boxAt(0, 0, 100, 20), boxAt(100, 0, 100, 20))).toBe(false)
  })
})

describe('resolveLabelOverlaps', () => {
  function candidate(id: string, x: number, y: number, w: number, h: number, priority: number, wasVisible = false) {
    return { _id: id, x, y, width: w, height: h, priority, wasVisible }
  }

  it('single candidate is always visible', () => {
    const out = resolveLabelOverlaps([candidate('a', 0, 0, 100, 20, 1)])
    expect(out.get('a')).toBe(true)
  })

  it('two non-overlapping candidates are both visible', () => {
    const out = resolveLabelOverlaps([
      candidate('a', 0, 0, 100, 20, 1),
      candidate('b', 200, 0, 100, 20, 1),
    ])
    expect(out.get('a')).toBe(true)
    expect(out.get('b')).toBe(true)
  })

  it('overlapping: higher-priority label wins', () => {
    const out = resolveLabelOverlaps([
      candidate('big', 0, 0, 100, 20, 10),
      candidate('small', 10, 5, 60, 12, 1),
    ])
    expect(out.get('big')).toBe(true)
    expect(out.get('small')).toBe(false)
  })

  it('stability bonus: wasVisible=true helps keep label visible', () => {
    // Both equal priority, but A was visible before — should win
    const out = resolveLabelOverlaps([
      candidate('a', 0, 0, 100, 20, 1, true),
      candidate('b', 0, 0, 100, 20, 1, false),
    ])
    expect(out.get('a')).toBe(true)
    expect(out.get('b')).toBe(false)
  })

  it('priority beats stability when both overlap', () => {
    // big has 10x priority, small was visible before — big still wins
    const out = resolveLabelOverlaps([
      candidate('big', 0, 0, 100, 20, 100, false),
      candidate('small', 0, 0, 100, 20, 1, true),
    ])
    expect(out.get('big')).toBe(true)
    expect(out.get('small')).toBe(false)
  })

  it('three overlapping: top-priority wins, others hide', () => {
    const out = resolveLabelOverlaps([
      candidate('a', 0, 0, 100, 20, 1),
      candidate('b', 0, 0, 100, 20, 10),
      candidate('c', 0, 0, 100, 20, 5),
    ])
    expect(out.get('a')).toBe(false)
    expect(out.get('b')).toBe(true)
    expect(out.get('c')).toBe(false)
  })

  it('mixed overlap: non-colliding label stays visible', () => {
    const out = resolveLabelOverlaps([
      candidate('a', 0, 0, 100, 20, 10),
      candidate('b', 10, 5, 60, 12, 1),     // collides with a
      candidate('c', 300, 0, 100, 20, 1),    // far away
    ])
    expect(out.get('a')).toBe(true)
    expect(out.get('b')).toBe(false)
    expect(out.get('c')).toBe(true)
  })

  it('empty array returns empty map', () => {
    const out = resolveLabelOverlaps([])
    expect(out.size).toBe(0)
  })
})
