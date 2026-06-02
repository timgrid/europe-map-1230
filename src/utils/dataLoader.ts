export interface ProcessedCountry {
  id: string
  name: string
  color: string
  center: [number, number]
  polygons: { outer: number[][]; holes: number[][][] }[]
}

export interface ProcessedData {
  year: number
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
  scale: number
  offsetX: number
  offsetY: number
  countries: ProcessedCountry[]
}

const cache = new Map<number, ProcessedData>()

export async function loadYearData(year: number): Promise<ProcessedData> {
  if (cache.has(year)) return cache.get(year)!
  
  const resp = await fetch(`/data/processed/europe_${year}.json`)
  if (!resp.ok) throw new Error(`Failed to load data for year ${year}`)
  
  const data: ProcessedData = await resp.json()
  cache.set(year, data)
  return data
}
