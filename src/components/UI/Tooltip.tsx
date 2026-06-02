import { useState, useEffect } from 'react'
import { useMapStore } from '../../store'
import { countriesData } from '../../data/countriesData'

export default function Tooltip() {
  const hoveredCountry = useMapStore((state) => state.hoveredCountry)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

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

  return (
    <div
      className="fixed z-50 px-3 py-2 bg-slate-800/95 border border-amber-200/40 rounded-lg shadow-2xl pointer-events-none"
      style={{
        left: mousePos.x + 16,
        top: mousePos.y - 40,
      }}
    >
      <p className="text-sm font-medium text-amber-100 whitespace-nowrap">{country.name}</p>
      <p className="text-xs text-slate-400 mt-0.5">{country.governmentType}</p>
    </div>
  )
}
