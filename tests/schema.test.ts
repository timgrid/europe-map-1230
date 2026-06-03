// Purpose: тесты для Zod-валидации ProcessedData
import { describe, it, expect } from 'vitest'
import { validateProcessedData } from '../src/data/schema'

function validData() {
  return {
    year: 1200,
    bounds: { minX: -10, maxX: 10, minY: -10, maxY: 10 },
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    countries: [
      {
        id: 'england',
        name: 'England',
        color: '#ff0000',
        center: [0, 0],
        polygons: [
          {
            outer: [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
            holes: [],
          },
        ],
      },
    ],
  }
}

describe('validateProcessedData', () => {
  it('accepts valid data', () => {
    const result = validateProcessedData(validData())
    expect(result.year).toBe(1200)
    expect(result.countries).toHaveLength(1)
    expect(result.countries[0]!.color).toBe('#ff0000')
  })

  it('rejects missing year', () => {
    const data = validData() as Record<string, unknown>
    delete data.year
    expect(() => validateProcessedData(data)).toThrow()
  })

  it('rejects negative year', () => {
    const data = validData()
    data.year = -1
    expect(() => validateProcessedData(data)).toThrow()
  })

  it('rejects empty id', () => {
    const data = validData()
    data.countries[0]!.id = ''
    expect(() => validateProcessedData(data)).toThrow()
  })

  it('rejects invalid hex color', () => {
    const data = validData()
    data.countries[0]!.color = 'red'
    expect(() => validateProcessedData(data)).toThrow()
  })

  it('rejects missing bounds', () => {
    const data = validData() as Record<string, unknown>
    delete data.bounds
    expect(() => validateProcessedData(data)).toThrow()
  })

  it('accepts empty countries array (no data year)', () => {
    const data = validData()
    data.countries = []
    const result = validateProcessedData(data)
    expect(result.countries).toEqual([])
  })
})
