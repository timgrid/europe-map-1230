// Purpose: выбирает имя страны (полное или short), которое помещается в доступную ширину | EU4-style shortName fallback
import { estimateLabelBox } from './labelLayout'

const FIT_MARGIN = 0.9

export function pickFittingName(
  fullName: string,
  shortName: string | undefined,
  availablePx: number,
  fontSize: number,
  capital: string | undefined,
): string {
  const fullWidth = estimateLabelBox({ id: '', displayName: fullName, capital, fontSize }).width
  if (fullWidth <= availablePx * FIT_MARGIN) return fullName
  if (shortName && shortName.length > 0) return shortName
  return fullName
}
