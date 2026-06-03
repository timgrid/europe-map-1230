// Purpose: тултип с названием страны | на desktop следует за курсором, на mobile фиксирован сверху
import { useState, useEffect } from 'react'
import { useMapStore } from '../../store'
import { countriesData } from '../../data/countriesData'
import { useIsMobile } from '../../hooks/useDeviceType'

export default function Tooltip() {
  const hoveredCountry = useMapStore((state) => state.hoveredCountry)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const isMobile = useIsMobile()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  if (!hoveredCountry) return null

  const country = countriesData[hoveredCountry]
  if (!country) return null

  // On mobile: centered fixed tooltip at the top of the screen
  if (isMobile) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-800/95 border border-amber-200/40 rounded-lg shadow-2xl pointer-events-none">
        <p className="text-sm font-medium text-amber-100 whitespace-nowrap text-center">{country.name}</p>
        <p className="text-xs text-slate-400 mt-0.5 text-center">{country.governmentType}</p>
      </div>
    )
  }

  return (
    <div
      className="fixed z-50 px-3 py-2 bg-slate-800/95 border border-amber-200/40 rounded-lg shadow-2xl pointer-events-none"
      style={{
        left: Math.min(mousePos.x + 16, window.innerWidth - 200),
        top: Math.max(mousePos.y - 40, 8),
      }}
    >
      <p className="text-sm font-medium text-amber-100 whitespace-nowrap">{country.name}</p>
      <p className="text-xs text-slate-400 mt-0.5">{country.governmentType}</p>
    </div>
  )
}
