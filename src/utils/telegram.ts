// Purpose: Telegram WebApp API — типы, определение окружения, инициализация
export interface TelegramThemeParams {
  bg_color: string
  text_color: string
  hint_color: string
  link_color: string
  button_color: string
  button_text_color: string
  secondary_bg_color: string
  section_bg_color?: string
  section_header_text_color?: string
  subtitle_text_color?: string
  destructive_text_color?: string
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: Record<string, unknown>
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string

  ready: () => void
  expand: () => void
  close: () => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void

  BackButton: {
    isVisible: boolean
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }

  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }

  onEvent: (eventType: string, cb: (data?: unknown) => void) => void
  offEvent: (eventType: string, cb: (data?: unknown) => void) => void
  sendData: (data: string) => void
  openLink: (url: string) => void
  openTelegramLink: (url: string) => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

let tgInstance: TelegramWebApp | null = null

export function getTelegram(): TelegramWebApp | null {
  if (tgInstance) return tgInstance
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    tgInstance = window.Telegram.WebApp
  }
  return tgInstance
}

export function initTelegram(): TelegramWebApp | null {
  const tg = getTelegram()
  if (!tg) return null
  tg.ready()
  tg.expand()
  return tg
}
