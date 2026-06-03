// Purpose: подсказка по управлению | разный текст для mobile/desktop
import { useIsMobile } from '../../hooks/useDeviceType'

export default function ControlsHint() {
  const isMobile = useIsMobile()

  return (
    <div className="absolute bottom-4 left-4 text-xs text-slate-400/80 pointer-events-auto bg-slate-900/50 px-3 py-2 rounded-lg backdrop-blur-sm">
      {isMobile ? (
        <>
          <p>1 палец — сдвиг карты</p>
          <p>2 пальца — вращение и зум</p>
          <p>Тап по стране — информация</p>
        </>
      ) : (
        <>
          <p>ЛКМ + движение — сдвиг карты</p>
          <p>ПКМ + движение — вращение камеры</p>
          <p>Прокрутка — масштаб</p>
          <p>Клик по стране — информация</p>
        </>
      )}
    </div>
  )
}
