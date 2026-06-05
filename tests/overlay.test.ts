import { describe, it, expect } from 'vitest'
import { pickFittingName } from '../src/utils/fittingName'

describe('pickFittingName', () => {
  it('returns full name when it fits', () => {
    const name = pickFittingName('Франция', undefined, 200, 14, undefined)
    expect(name).toBe('Франция')
  })

  it('returns full name when it fits even if shortName exists', () => {
    const name = pickFittingName('Венеция', 'Вен.', 200, 14, undefined)
    expect(name).toBe('Венеция')
  })

  it('falls back to shortName when full name overflows', () => {
    const long = 'Священная Римская Империя'
    const short = 'С.Р.Империя'
    const name = pickFittingName(long, short, 100, 22, undefined)
    expect(name).toBe(short)
  })

  it('returns shortName if full does not fit (best effort, even if short also overflows)', () => {
    const long = 'Священная Римская Империя'
    const short = 'С.Р.Империя'
    const name = pickFittingName(long, short, 30, 22, undefined)
    expect(name).toBe(short)
  })

  it('uses shortName when shortName is shorter and fits', () => {
    const long = 'Венецианская республика'
    const short = 'Венеция'
    const name = pickFittingName(long, short, 100, 22, undefined)
    expect(name).toBe('Венеция')
  })

  it('uses shortName when full name overflows even with FIT_MARGIN', () => {
    const long = 'ААААААААААА'
    const short = 'Б'
    const name = pickFittingName(long, short, 50, 14, undefined)
    expect(name).toBe('Б')
  })

  it('handles undefined capital gracefully', () => {
    const name = pickFittingName('Тест', 'Т', 200, 14, undefined)
    expect(name).toBe('Тест')
  })
})
