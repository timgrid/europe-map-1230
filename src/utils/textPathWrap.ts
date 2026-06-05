// Purpose: многострочный text-along-path рендеринг (EU4/Clausewitz-style) | балансировка слов, сдвиг spine по нормали, clipping check
import { largestPolygon, pointInPolygonWithHoles, type CountryGeometry } from './geoParser'
import type { SpinePoint } from './spine'

/**
 * Жадно балансирует имя по строкам, минимизируя длину самой длинной строки.
 * Использует алгоритм: идём по словам, кладём на текущую строку если её длина
 * с новым словом не превысит длину следующей строки с этим словом.
 *
 * @param name    — входная строка (может содержать несколько слов через пробел)
 * @param maxLines — максимум строк (по умолчанию 2, как в EU4)
 * @returns массив строк длиной 1..maxLines. Пустые строки не возвращаются.
 *
 * Примеры:
 *   wrapBalanced('Священная Римская Империя', 2)
 *     → ['Священная', 'Римская Империя']   (9 vs 14 chars, balanced)
 *   wrapBalanced('Половецкие степи', 2)
 *     → ['Половецкие степи']               (single word, no split)
 *   wrapBalanced('A B C D', 2)
 *     → ['A B', 'C D']                     (balanced)
 */
export function wrapBalanced(name: string, maxLines: number = 2): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1 || maxLines <= 1) return [name.trim()]

  const lines: string[][] = Array.from({ length: maxLines }, () => [])
  const lengths = new Array<number>(maxLines).fill(0)

  for (const word of words) {
    // Найти строку с минимальной длиной (без учёта пробелов)
    let targetLine = 0
    for (let i = 1; i < maxLines; i++) {
      if (lengths[i]! < lengths[targetLine]!) targetLine = i
    }
    // Добавить с пробелом если строка не пустая
    if (lines[targetLine]!.length > 0) lengths[targetLine]! += 1
    lines[targetLine]!.push(word)
    lengths[targetLine]! += word.length
  }

  return lines
    .map((l) => l.join(' '))
    .filter((l) => l.length > 0)
}

/**
 * Сдвигает каждую точку spine вдоль вектора нормали (перпендикулярно тангенсу).
 * Формула EU4: (x, y) → (x - tangentY * offset, y + tangentX * offset).
 *
 * Используется для построения параллельных осей при многострочном textPath —
 * каждая строка текста получает свою собственную кривую, сдвинутую от базовой оси.
 *
 * Не мутирует входной массив.
 */
export function shiftSpineByNormal(spine: SpinePoint[], offsetPx: number): SpinePoint[] {
  return spine.map((pt) => {
    const tx = pt.tangentX
    const ty = pt.tangentY
    return {
      x: pt.x - ty * offsetPx,
      y: pt.y + tx * offsetPx,
      tangentX: tx,
      tangentY: ty,
    }
  })
}

/**
 * Возвращает массив смещений для каждой строки. Линии центрируются относительно
 * базовой оси: для N строк смещения симметричны (±(N-1)/2 * spacing).
 *
 * @example
 *   getLineOffsets(2, 14) → [-7, 7]
 *   getLineOffsets(3, 14) → [-14, 0, 14]
 */
export function getLineOffsets(numLines: number, lineSpacing: number): number[] {
  const offsets: number[] = []
  for (let i = 0; i < numLines; i++) {
    offsets.push((i - (numLines - 1) / 2) * lineSpacing)
  }
  return offsets
}

/**
 * Проверяет, что все точки сдвинутого spine находятся внутри полигона страны
 * (с учётом holes). Используется как clipping check при многострочном textPath:
 * если верхняя/нижняя ось вылетела за границу страны — fallback на 1 строку.
 */
export function isSpineInsidePolygon(spine: SpinePoint[], country: CountryGeometry): boolean {
  const poly = largestPolygon(country)
  if (!poly) return false
  for (const pt of spine) {
    if (!pointInPolygonWithHoles(pt.x, pt.y, poly.outer, poly.holes)) return false
  }
  return true
}

/**
 * Решает, нужен ли многострочный режим. Условия (все должны выполняться):
 *  - в имени > 1 слова (есть что разбивать)
 *  - страна не слишком вытянута (aspect ratio не очень широкий — иначе строки
 *    налезут друг на друга или выйдут за границу)
 *  - текст НЕ влезает в одну строку при данной fontSize
 *
 * @param name         — полное имя страны
 * @param aspectRatio  — boundsWidth / boundsHeight
 * @param fullFitsSingle — уместится ли full name в одну строку (из pickFittingName)
 * @param maxAspect    — порог: если aspect > maxAspect, текст рисуется 1 строкой
 *                       (для очень вытянутых стран многострочность избыточна)
 */
export function shouldUseMultiLine(
  name: string,
  aspectRatio: number,
  fullFitsSingle: boolean,
  maxAspect: number = 3.0,
): boolean {
  const wordCount = name.trim().split(/\s+/).filter(Boolean).length
  if (wordCount <= 1) return false
  if (fullFitsSingle) return false
  if (aspectRatio > maxAspect) return false
  return true
}
