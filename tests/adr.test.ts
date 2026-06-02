import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ADR_DIR = fileURLToPath(new URL('../docs/adr/', import.meta.url))

const REQUIRED_SECTIONS = [
  '## Статус',
  '## Контекст',
  '## Решение',
  '## Последствия',
] as const

const ALLOWED_STATUSES = new Set([
  'Proposed',
  'Accepted',
  'Deprecated',
  'Superseded',
])

const FILENAME_RE = /^(\d{4})-([a-z0-9-]+)\.md$/

interface ParsedAdr {
  number: number
  slug: string
  filename: string
  content: string
}

function listAdrs(): ParsedAdr[] {
  if (!existsSync(ADR_DIR)) {
    throw new Error(`ADR directory not found: ${ADR_DIR}`)
  }
  const files = readdirSync(ADR_DIR).filter((f) => f.endsWith('.md'))
  return files
    .map((filename) => {
      const match = FILENAME_RE.exec(filename)
      if (!match) return null
      return {
        number: Number.parseInt(match[1], 10),
        slug: match[2],
        filename,
        content: readFileSync(join(ADR_DIR, filename), 'utf8'),
      }
    })
    .filter((x): x is ParsedAdr => x !== null)
    .sort((a, b) => a.number - b.number)
}

function getStatusLine(content: string): string {
  const m = /^##\s*Статус\s*\n+([^\n]+)/m.exec(content)
  if (!m) throw new Error('No status section found')
  return m[1].trim()
}

function statusKeyword(rawLine: string): string {
  const cleaned = rawLine.replace(/[*_`]/g, '').trim()
  const firstWord = cleaned.split(/\s+/)[0]
  return firstWord
}

describe('docs/adr/', () => {
  it('contains the 0000 template', () => {
    expect(existsSync(join(ADR_DIR, '0000-template.md'))).toBe(true)
  })

  it('all non-template ADR files match NNNN-slug.md', () => {
    const all = readdirSync(ADR_DIR).filter((f) => f.endsWith('.md'))
    const offenders = all.filter(
      (f) => f !== 'README.md' && f !== '0000-template.md' && !FILENAME_RE.test(f),
    )
    expect(offenders, `Invalid filenames: ${offenders.join(', ')}`).toEqual([])
  })

  it('ADR numbering is unique and contiguous from 0001', () => {
    const adrs = listAdrs()
    const numbers = adrs.map((a) => a.number)
    const unique = new Set(numbers)
    expect(unique.size, 'Duplicate ADR numbers').toBe(numbers.length)
    const min = Math.min(...numbers)
    const max = Math.max(...numbers)
    expect(min).toBe(0)
    for (let i = 0; i <= max; i++) {
      expect(numbers, `Missing ADR number ${i}`).toContain(i)
    }
  })

  it('every ADR has all required sections', () => {
    const adrs = listAdrs()
    expect(adrs.length).toBeGreaterThan(0)
    for (const adr of adrs) {
      for (const section of REQUIRED_SECTIONS) {
        expect(
          adr.content.includes(section),
          `${adr.filename} missing section "${section}"`,
        ).toBe(true)
      }
    }
  })

  it('every ADR status is one of the allowed values', () => {
    const adrs = listAdrs()
    for (const adr of adrs) {
      const rawLine = getStatusLine(adr.content)
      const keyword = statusKeyword(rawLine)
      const rest = rawLine.toLowerCase()
      const isValid =
        ALLOWED_STATUSES.has(keyword) ||
        rest.startsWith('superseded by')
      expect(
        isValid,
        `${adr.filename} has invalid status: "${rawLine}" (keyword "${keyword}")`,
      ).toBe(true)
    }
  })

  it('Superseded ADRs reference an existing ADR', () => {
    const adrs = listAdrs()
    const numbers = new Set(adrs.map((a) => a.number))
    for (const adr of adrs) {
      const rawLine = getStatusLine(adr.content)
      const m = /Superseded\s+by\s+(?:ADR-)?(\d{4})/i.exec(rawLine)
      if (m) {
        const ref = Number.parseInt(m[1], 10)
        expect(numbers.has(ref), `${adr.filename} references missing ADR-${ref}`).toBe(
          true,
        )
      }
    }
  })

  it('ADR titles include the correct ADR number', () => {
    const adrs = listAdrs()
    for (const adr of adrs) {
      if (adr.filename === '0000-template.md') continue
      const titleMatch = /^#\s*ADR-(\d{4}):\s*(.+)\s*$/m.exec(adr.content)
      expect(titleMatch, `${adr.filename} missing or invalid H1 title`).toBeTruthy()
      const titleNumber = titleMatch![1]
      const filenameNumber = String(adr.number).padStart(4, '0')
      expect(
        titleNumber,
        `${adr.filename}: H1 number ${titleNumber} does not match filename ${filenameNumber}`,
      ).toBe(filenameNumber)
      expect((titleMatch![2] ?? '').length).toBeGreaterThan(0)
    }
  })
})
