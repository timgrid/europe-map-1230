import { useMapStore } from '../../store'

const years = [1200, 1279]

export default function YearToggle() {
  const currentYear = useMapStore((state) => state.currentYear)
  const setYear = useMapStore((state) => state.setYear)
  const setLoading = useMapStore((state) => state.setLoading)

  const handleChange = (y: number) => {
    if (y === currentYear) return
    setLoading(true)
    setYear(y)
  }

  return (
    <div className="flex gap-1 pointer-events-auto bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-600 p-1">
      {years.map((y) => (
        <button
          key={y}
          onClick={() => handleChange(y)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            currentYear === y
              ? 'bg-amber-200/20 text-amber-100 border border-amber-400/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  )
}
