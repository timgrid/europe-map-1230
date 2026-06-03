// Purpose: подсказка по управлению | разный текст для mobile/desktop
import { useIsMobile } from '../../hooks/useDeviceType'

export default function ControlsHint() {
  const isMobile = useIsMobile()

  return (
    <div className="absolute bottom-4 left-4 text-xs pointer-events-auto px-3 py-2 rounded-lg backdrop-blur-sm"
      style={{ color: 'var(--color-hint, rgba(148,163,184,0.8))', backgroundColor: 'var(--color-secondary-bg, rgba(15,23,42,0.5))' }}
    >
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
