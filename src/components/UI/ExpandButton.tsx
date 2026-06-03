// Purpose: кнопка "Развернуть" в Telegram Mini App — вызывает tg.expand() по клику
import { useTelegram } from '../../hooks/useTelegram'

export default function ExpandButton() {
  const { isTG, isExpanded, expand } = useTelegram()
  if (!isTG || isExpanded) return null

  return (
    <button
      onClick={expand}
      className="touch-target absolute top-2 right-2 z-40 px-3 py-2 rounded-lg text-sm font-medium border pointer-events-auto transition-all"
      style={{
        backgroundColor: 'var(--color-secondary-bg, rgba(15,23,42,0.85))',
        color: 'var(--color-text, #fef3c7)',
        borderColor: 'var(--color-hint, rgba(148,163,184,0.4))',
        backdropFilter: 'blur(8px)',
      }}
      title="Развернуть на весь экран"
    >
      <span className="inline-block align-middle mr-1">⛶</span>
      <span>Развернуть</span>
    </button>
  )
}
