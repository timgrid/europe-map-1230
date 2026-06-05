// Purpose: детекция пересечений 2D-прямоугольников подписей + greedy-разрешение по приоритету (площадь страны)
export interface LabelBox {
  x: number                  // центр (px)
  y: number                  // центр (px)
  width: number              // полная ширина (px)
  height: number             // полная высота (px)
  priority: number           // чем больше — тем важнее (площадь страны)
  wasVisible: boolean        // был ли виден в прошлом кадре (бонус стабильности)
}

export interface LabelEstimate {
  id: string
  displayName: string
  capital: string | undefined
  fontSize: number
}

const CHAR_WIDTH_RATIO = 0.55
const LINE_HEIGHT = 1.15
const CAPITAL_RATIO = 0.65
const STAR_GLYPH_WIDTH = 16
const STABILITY_BONUS = 0.35

export function estimateLabelBox(est: LabelEstimate): LabelBox {
  const nameWidth = est.displayName.length * est.fontSize * CHAR_WIDTH_RATIO
  const isTwoLine = !!est.capital
  let capitalWidth = 0
  if (est.capital) {
    capitalWidth = (est.capital.length + 1) * est.fontSize * CAPITAL_RATIO * CHAR_WIDTH_RATIO + STAR_GLYPH_WIDTH
  }
  const width = Math.max(nameWidth, capitalWidth)
  const height = est.fontSize * LINE_HEIGHT * (isTwoLine ? 2.1 : 1)
  return { x: 0, y: 0, width, height, priority: 0, wasVisible: false }
}

export function boxesIntersect(a: LabelBox, b: LabelBox): boolean {
  const ax1 = a.x - a.width / 2
  const ay1 = a.y - a.height / 2
  const ax2 = a.x + a.width / 2
  const ay2 = a.y + a.height / 2
  const bx1 = b.x - b.width / 2
  const by1 = b.y - b.height / 2
  const bx2 = b.x + b.width / 2
  const by2 = b.y + b.height / 2
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1
}

export function resolveLabelOverlaps(
  candidates: Array<LabelBox & { _id: string }>,
): Map<string, boolean> {
  const out = new Map<string, boolean>()
  const order = candidates
    .map((_, i) => i)
    .sort((a, b) => effectivePriority(candidates[b]) - effectivePriority(candidates[a]))
  for (const i of order) {
    const cand = candidates[i]
    let collides = false
    for (const j of order) {
      if (j === i) continue
      const other = candidates[j]
      if (!out.get(other._id)) continue
      if (boxesIntersect(cand, other)) {
        collides = true
        break
      }
    }
    out.set(cand._id, !collides)
  }
  return out
}

function effectivePriority(box: LabelBox): number {
  return box.priority * (1 + (box.wasVisible ? STABILITY_BONUS : 0))
}

export function estimateCountryInfo(
  info: { name?: string; capital?: string } | null | undefined,
  fallbackName: string,
): { displayName: string; capital: string | undefined } {
  return {
    displayName: info?.name ?? fallbackName,
    capital: info?.capital,
  }
}
