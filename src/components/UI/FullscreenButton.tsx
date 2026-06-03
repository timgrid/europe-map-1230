// Purpose: кнопка Fullscreen в Telegram Mini App — toggle между fullscreen и обычным режимом
import { useTelegram } from '../../hooks/useTelegram'

export default function FullscreenButton() {
  const { isTG, isFullscreen, requestFullscreen, exitFullscreen } = useTelegram()
  if (!isTG) return null

  const handleClick = () => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      requestFullscreen()
    }
  }

  return (
    <button
      onClick={handleClick}
      className="touch-target absolute top-2 right-2 z-40 px-3 py-2 rounded-lg text-sm font-medium border pointer-events-auto transition-all"
      style={{
        backgroundColor: 'var(--color-secondary-bg, rgba(15,23,42,0.85))',
        color: 'var(--color-text, #fef3c7)',
        borderColor: 'var(--color-hint, rgba(148,163,184,0.4))',
        backdropFilter: 'blur(8px)',
      }}
      title={isFullscreen ? 'Свернуть' : 'Развернуть на весь экран'}
      aria-label={isFullscreen ? 'Свернуть' : 'Развернуть на весь экран'}
    >
      <span className="inline-block align-middle mr-1">{isFullscreen ? '⤡' : '⛶'}</span>
      <span>{isFullscreen ? 'Свернуть' : 'Fullscreen'}</span>
    </button>
  )
}
