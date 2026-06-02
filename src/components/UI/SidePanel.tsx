import { motion, AnimatePresence } from 'framer-motion'
import { useMapStore } from '../../store'

export default function SidePanel() {
  const selectedCountry = useMapStore((state) => state.selectedCountry)
  const setSelectedCountry = useMapStore((state) => state.setSelectedCountry)

  return (
    <AnimatePresence>
      {selectedCountry && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute top-0 right-0 h-full w-96 bg-slate-800/95 border-l border-amber-200/20 shadow-2xl pointer-events-auto overflow-y-auto backdrop-blur-md"
        >
          <div className="p-6">
            <button
              onClick={() => setSelectedCountry(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-amber-100 transition-colors text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50"
            >
              ×
            </button>

            {/* Header with color indicator */}
            <div className="flex items-start gap-3 mb-4 pr-8">
              <div 
                className="w-4 h-12 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: selectedCountry.color }}
              />
              <div>
                <h2 className="text-2xl font-bold text-amber-100" style={{ fontFamily: 'Georgia, serif' }}>
                  {selectedCountry.name}
                </h2>
                <p className="text-xs text-amber-200/60 mt-1">{selectedCountry.dates}</p>
              </div>
            </div>
            
            <div className="w-full h-px bg-amber-200/20 mb-6" />

            {/* Info grid */}
            <div className="grid grid-cols-1 gap-3 text-sm mb-6">
              {selectedCountry.capital && (
                <div className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-400">Столица</span>
                  <span className="text-amber-50 font-medium">{selectedCountry.capital}</span>
                </div>
              )}
              {selectedCountry.ruler && (
                <div className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-400">Правитель</span>
                  <span className="text-amber-50 font-medium">{selectedCountry.ruler}</span>
                </div>
              )}
              {selectedCountry.governmentType && (
                <div className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-400">Тип правления</span>
                  <span className="text-amber-50 font-medium">{selectedCountry.governmentType}</span>
                </div>
              )}
              {selectedCountry.religion && (
                <div className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-400">Религия</span>
                  <span className="text-amber-50 font-medium">{selectedCountry.religion}</span>
                </div>
              )}
              {selectedCountry.culture && (
                <div className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-400">Культура</span>
                  <span className="text-amber-50 font-medium">{selectedCountry.culture}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {selectedCountry.description && (
              <div className="mt-4">
                <h3 className="text-amber-200 font-medium mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-200/60" />
                  Историческая справка
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm bg-slate-700/20 p-4 rounded-lg border border-slate-700/50">
                  {selectedCountry.description}
                </p>
              </div>
            )}

            {/* Footer note */}
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 italic">
                Данные приблизительны и основаны на исторических источниках периода ~1230 г.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
