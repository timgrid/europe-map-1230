// Purpose: селектор года | на mobile <select>, на desktop кнопки
import { useIsMobile } from '../../hooks/useDeviceType'
import { useMapStore } from '../../store'

const years = [800, 900, 1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600]

function DesktopToggle({ currentYear, onChange }: { currentYear: number; onChange: (y: number) => void }) {
  return (
    <div className="flex gap-1 pointer-events-auto bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-600 p-1">
      {years.map((y) => (
        <button
          key={y}
          onClick={() => onChange(y)}
          className="min-w-[48px] px-3 py-2 rounded-md text-sm font-medium transition-all touch-target
            data-[active=true]:bg-amber-200/20 data-[active=true]:text-amber-100 data-[active=true]:border-amber-400/50
            data-[active=false]:text-slate-400 hover:text-slate-200 border border-transparent data-[active=false]:hover:border-slate-500"
          data-active={currentYear === y}
        >
          {y}
        </button>
      ))}
    </div>
  )
}

function MobileToggle({ currentYear, onChange }: { currentYear: number; onChange: (y: number) => void }) {
  return (
    <select
      value={currentYear}
      onChange={(e) => onChange(Number(e.target.value))}
      className="pointer-events-auto w-full bg-slate-900/90 backdrop-blur-sm border border-slate-600 rounded-lg
        px-4 py-3 text-amber-100 text-base font-medium appearance-none
        focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23fcd34d' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 0.75rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.25rem',
      }}
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y} год
        </option>
      ))}
    </select>
  )
}

export default function YearToggle() {
  const currentYear = useMapStore((state) => state.currentYear)
  const setYear = useMapStore((state) => state.setYear)
  const setLoading = useMapStore((state) => state.setLoading)
  const isMobile = useIsMobile()

  const handleChange = (y: number) => {
    if (y === currentYear) return
    setLoading(true)
    setYear(y)
  }

  if (isMobile) return <MobileToggle currentYear={currentYear} onChange={handleChange} />
  return <DesktopToggle currentYear={currentYear} onChange={handleChange} />
}
