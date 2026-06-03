// Purpose: переключатель слоя (Unified / Principalities)
import { useMapStore } from '../../store'

export default function LayerToggle() {
  const layer = useMapStore((state) => state.layer)
  const setLayer = useMapStore((state) => state.setLayer)

  return (
    <div className="flex gap-2 pointer-events-auto">
      <button
        onClick={() => setLayer('detailed')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
          layer === 'detailed'
            ? 'bg-amber-200 text-slate-900 border-amber-200'
            : 'bg-slate-800/80 text-slate-300 border-slate-600 hover:border-amber-200/50'
        }`}
      >
        Детальный
      </button>
      <button
        onClick={() => setLayer('unified')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
          layer === 'unified'
            ? 'bg-amber-200 text-slate-900 border-amber-200'
            : 'bg-slate-800/80 text-slate-300 border-slate-600 hover:border-amber-200/50'
        }`}
      >
        Объединённый
      </button>
    </div>
  )
}
