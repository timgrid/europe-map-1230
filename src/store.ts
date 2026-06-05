// Purpose: Zustand store — глобальное состояние (currentYear, layer, selectedCountry, isLoading, reloadKey)
import { create } from 'zustand'
import { hapticSelection, hapticNotification } from './utils/telegram'

export interface CountryInfo {
  id: string
  name: string
  shortName?: string
  capital: string
  ruler: string
  governmentType: string
  religion: string
  culture: string
  description: string
  dates: string
  color: string
  groupId?: string
}

interface MapState {
  isLoading: boolean
  setLoading: (loading: boolean) => void

  currentYear: number
  setYear: (year: number) => void
  reloadKey: number
  reload: () => void

  layer: 'detailed' | 'unified'
  setLayer: (layer: 'detailed' | 'unified') => void

  hoveredCountry: string | null
  setHoveredCountry: (id: string | null) => void

  selectedCountry: CountryInfo | null
  setSelectedCountry: (country: CountryInfo | null) => void
}

export const useMapStore = create<MapState>((set) => ({
  isLoading: true,
  setLoading: (loading) => set({ isLoading: loading }),

  currentYear: 1200,
  setYear: (year) => {
    hapticSelection()
    set({ currentYear: year })
  },
  reloadKey: 0,
  reload: () => set((s) => ({ reloadKey: s.reloadKey + 1, isLoading: true })),

  layer: 'detailed',
  setLayer: (layer) => {
    hapticSelection()
    set({ layer })
  },

  hoveredCountry: null,
  setHoveredCountry: (id) => set({ hoveredCountry: id }),

  selectedCountry: null,
  setSelectedCountry: (country) => {
    if (country) hapticNotification('success')
    set({ selectedCountry: country })
  },
}))
