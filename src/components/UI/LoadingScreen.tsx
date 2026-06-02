import { useMapStore } from '../../store'

export default function LoadingScreen() {
  const isLoading = useMapStore((state) => state.isLoading)

  if (!isLoading) return null

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900">
      <div className="w-16 h-16 border-4 border-amber-200/20 border-t-amber-200 rounded-full animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-amber-100">Загрузка карты...</h2>
      <p className="text-sm text-slate-400 mt-2">Подготовка геометрии и данных</p>
    </div>
  )
}
