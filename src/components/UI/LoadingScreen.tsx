// Purpose: экран загрузки / спиннер + кнопка «Повторить» через 15s
import { useEffect, useState } from 'react'
import { useMapStore } from '../../store'

const TIMEOUT_MS = 15000

export default function LoadingScreen() {
  const isLoading = useMapStore((state) => state.isLoading)
  const reload = useMapStore((state) => state.reload)
  const currentYear = useMapStore((state) => state.currentYear)
  const [showRetry, setShowRetry] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setShowRetry(false)
      return
    }
    setShowRetry(false)
    const t = setTimeout(() => setShowRetry(true), TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [isLoading])

  if (!isLoading) return null

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
      <div className="w-16 h-16 border-4 border-amber-200/20 border-t-amber-200 rounded-full animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-amber-100">Загрузка карты...</h2>
      <p className="text-sm text-slate-400 mt-2">Подготовка геометрии и данных</p>
      {showRetry && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-xs text-amber-200/70">Загрузка {currentYear} года занимает больше времени</p>
          <button
            onClick={reload}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-200 text-slate-900 hover:bg-amber-100 transition-colors pointer-events-auto"
          >
            Повторить загрузку
          </button>
        </div>
      )}
    </div>
  )
}
