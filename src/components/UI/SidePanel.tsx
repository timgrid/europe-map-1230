// Purpose: боковая панель с описанием выбранной страны | на mobile bottom sheet
import { motion, AnimatePresence } from 'framer-motion'
import { useMapStore, type CountryInfo } from '../../store'
import { useIsMobile } from '../../hooks/useDeviceType'

function DesktopPanel({ country, onClose }: { country: CountryInfo; onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute top-0 right-0 h-full w-96 bg-slate-800/95 border-l border-amber-200/20 shadow-2xl pointer-events-auto overflow-y-auto backdrop-blur-md"
    >
      <PanelContent country={country} onClose={onClose} />
    </motion.div>
  )
}

function MobileSheet({ country, onClose }: { country: CountryInfo; onClose: () => void }) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute bottom-0 left-0 right-0 max-h-[60vh] bg-slate-800/95 border-t border-amber-200/20 shadow-2xl pointer-events-auto overflow-y-auto backdrop-blur-md rounded-t-2xl"
    >
      <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-slate-800/95">
        <div className="w-10 h-1 rounded-full bg-slate-600" />
      </div>
      <PanelContent country={country} onClose={onClose} />
    </motion.div>
  )
}

function PanelContent({ country, onClose }: { country: CountryInfo; onClose: () => void }) {
  return (
    <div className="p-4 sm:p-6">
      <button
        onClick={onClose}
        className="touch-target absolute top-3 right-3 text-slate-400 hover:text-amber-100 transition-colors text-2xl rounded-lg hover:bg-slate-700/50"
      >
        ×
      </button>

      <div className="flex items-start gap-3 mb-4 pr-8">
        <div
          className="w-4 h-12 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: country.color }}
        />
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-amber-100" style={{ fontFamily: 'Georgia, serif' }}>
            {country.name}
          </h2>
          <p className="text-xs text-amber-200/60 mt-1">{country.dates}</p>
        </div>
      </div>

      <div className="w-full h-px bg-amber-200/20 mb-5" />

      <div className="grid grid-cols-1 gap-3 text-sm mb-5">
        {country.capital && <InfoRow label="Столица" value={country.capital} />}
        {country.ruler && <InfoRow label="Правитель" value={country.ruler} />}
        {country.governmentType && <InfoRow label="Тип правления" value={country.governmentType} />}
        {country.religion && <InfoRow label="Религия" value={country.religion} />}
        {country.culture && <InfoRow label="Культура" value={country.culture} />}
      </div>

      {country.description && (
        <div className="mt-4">
          <h3 className="text-amber-200 font-medium mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-200/60" />
            Историческая справка
          </h3>
          <p className="text-slate-300 leading-relaxed text-sm bg-slate-700/20 p-4 rounded-lg border border-slate-700/50">
            {country.description}
          </p>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 italic">
          Данные приблизительны и основаны на исторических источниках.
        </p>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded-lg">
      <span className="text-slate-400">{label}</span>
      <span className="text-amber-50 font-medium">{value}</span>
    </div>
  )
}

export default function SidePanel() {
  const selectedCountry = useMapStore((state) => state.selectedCountry)
  const setSelectedCountry = useMapStore((state) => state.setSelectedCountry)
  const isMobile = useIsMobile()

  const Panel = isMobile ? MobileSheet : DesktopPanel

  return (
    <AnimatePresence>
      {selectedCountry && (
        <Panel country={selectedCountry} onClose={() => setSelectedCountry(null)} />
      )}
    </AnimatePresence>
  )
}
