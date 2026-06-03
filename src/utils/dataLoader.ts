// Purpose: загрузка processed JSON + валидация через Zod | кеш по году
import { validateProcessedData, type ProcessedData } from '../data/schema'

const cache = new Map<number, ProcessedData>()

export type { ProcessedData, ProcessedCountry } from '../data/schema'

export async function loadYearData(year: number): Promise<ProcessedData> {
  if (cache.has(year)) return cache.get(year)!
  
  const baseUrl = import.meta.env.BASE_URL || '/'
  const resp = await fetch(`${baseUrl}data/processed/europe_${year}.json`)
  if (!resp.ok) throw new Error(`Failed to load data for year ${year} (${resp.status})`)
  
  const raw: unknown = await resp.json()
  const data = validateProcessedData(raw)
  cache.set(year, data)
  return data
}
