// Purpose: кнопка Fullscreen в Telegram Mini App — toggle fullscreen/exit + автоматический expand
import { useTelegram } from '../../hooks/useTelegram'
import { isFullscreenSupported } from '../../utils/telegram'

export default function FullscreenButton() {
  const { isTG, isFullscreen, expand, requestFullscreen, exitFullscreen } = useTelegram()
  if (!isTG) return null

  const supported = isFullscreenSupported()
  if (!supported) {
    return (
      <div
        className="touch-target absolute bottom-2 left-2 z-40 px-3 py-2 rounded-lg text-xs border pointer-events-auto"
        style={{
          backgroundColor: 'var(--color-secondary-bg, rgba(15,23,42,0.85))',
          color: 'var(--color-hint, rgba(148,163,184,0.7))',
          borderColor: 'var(--color-hint, rgba(148,163,184,0.3))',
          backdropFilter: 'blur(8px)',
        }}
        title="Telegram SDK < 8.0 — fullscreen недоступен"
      >
        Fullscreen недоступен
      </div>
    )
  }

  const handleClick = () => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      // Per SDK docs: always expand() first, then requestFullscreen()
      expand()
      requestFullscreen()
    }
  }

  return (
    <button
      onClick={handleClick}
      className="touch-target absolute bottom-2 left-2 z-40 px-3 py-2 rounded-lg text-sm font-medium border pointer-events-auto transition-all"
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
