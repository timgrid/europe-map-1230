// Purpose: Zod-схемы для runtime-валидации ProcessedData | источники типов ProcessedData / ProcessedCountry
import { z } from 'zod'

const PolygonSchema = z.object({
  outer: z.array(z.array(z.number())),
  holes: z.array(z.array(z.array(z.number()))),
})

const ProcessedCountrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  center: z.tuple([z.number(), z.number()]),
  polygons: z.array(PolygonSchema).min(1),
})

export const ProcessedDataSchema = z.object({
  year: z.number().int().positive(),
  bounds: z.object({
    minX: z.number(),
    maxX: z.number(),
    minY: z.number(),
    maxY: z.number(),
  }),
  scale: z.number().positive(),
  offsetX: z.number(),
  offsetY: z.number(),
  countries: z.array(ProcessedCountrySchema),
})

export type ProcessedData = z.infer<typeof ProcessedDataSchema>
export type ProcessedCountry = z.infer<typeof ProcessedCountrySchema>

export function validateProcessedData(data: unknown): ProcessedData {
  return ProcessedDataSchema.parse(data)
}
