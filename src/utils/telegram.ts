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
  header_bg_color?: string
  accent_text_color?: string
  section_separator_color?: string
  bottom_bar_bg_color?: string
}

export interface TelegramSafeAreaInset {
  top: number
  bottom: number
  left: number
  right: number
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: Record<string, unknown>
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  isExpanded: boolean
  isFullscreen: boolean
  isActive: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  bottomBarColor: string
  safeAreaInset: TelegramSafeAreaInset
  contentSafeAreaInset: TelegramSafeAreaInset
  isVerticalSwipesEnabled: boolean
  isClosingConfirmationEnabled: boolean

  ready: () => void
  expand: () => void
  close: () => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  setBottomBarColor?: (color: string) => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  requestFullscreen?: () => void
  exitFullscreen?: () => void
  enableVerticalSwipes?: () => void
  disableVerticalSwipes?: () => void

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

  CloudStorage?: {
    setItem: (key: string, value: string, cb?: (err: string | null, ok?: boolean) => unknown) => void
    getItem: (key: string, cb?: (err: string | null, value?: string) => unknown) => void
  }

  onEvent: (eventType: string, cb: (data?: unknown) => void) => void
  offEvent: (eventType: string, cb: (data?: unknown) => void) => void
  sendData: (data: string) => void
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void
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

/**
 * Read the Telegram WebApp object from the global scope.
 * Uses `globalThis` (works in browser, jsdom and node) — no `window` check
 * because tests can mock `globalThis.Telegram` directly.
 */
function getTelegramObject(): { WebApp?: TelegramWebApp } | undefined {
  if (typeof globalThis === 'undefined') return undefined
  return (globalThis as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram
}

export function getTelegram(): TelegramWebApp | null {
  if (tgInstance) return tgInstance
  const webApp = getTelegramObject()?.WebApp
  if (webApp) tgInstance = webApp
  return tgInstance
}

/**
 * Parse the major version of Telegram WebApp SDK (e.g. "7.10" → 7, "8.0" → 8).
 * Telegram uses `major.minor` versioning where `7.10` is SDK 7.10, not 7.1.
 * Returns NaN if version string is missing/malformed.
 */
export function parseSDKVersion(version: string | undefined): number {
  if (!version) return NaN
  const m = /^(\d+)(?:\.(\d+))?/.exec(version)
  if (!m) return NaN
  return Number(m[1])
}

/**
 * Fullscreen API (`requestFullscreen` / `exitFullscreen` / `isFullscreen` /
 * `fullscreenChanged` event) was added in Telegram WebApp SDK 8.0.
 * Earlier versions silently no-op the call.
 */
export const FULLSCREEN_MIN_SDK = 8

export function isFullscreenSupported(tg: TelegramWebApp | null = getTelegram()): boolean {
  if (!tg) return false
  const major = parseSDKVersion(tg.version)
  if (Number.isNaN(major)) return false
  if (major < FULLSCREEN_MIN_SDK) return false
  return typeof tg.requestFullscreen === 'function' && typeof tg.exitFullscreen === 'function'
}

/**
 * Returns true if the platform is known not to support fullscreen
 * (e.g. some web TG clients). Use this to hide the UI affordance.
 * Currently no known-unsupported platforms — all current Telegram clients
 * that ship SDK 8.0+ support the fullscreen API.
 */
export function isUnsupportedFullscreenPlatform(tg: TelegramWebApp | null = getTelegram()): boolean {
  if (!tg) return false
  // No-op reserved for future platform-specific restrictions.
  return false
}

export function initTelegram(): TelegramWebApp | null {
  const tg = getTelegram()
  if (!tg) return null
  tg.ready()
  tg.expand()
  if (typeof tg.enableClosingConfirmation === 'function') {
    tg.enableClosingConfirmation()
  }
  // Vertical swipes must be disabled on a 3D map — pan gesture would close Mini App
  if (typeof tg.disableVerticalSwipes === 'function') {
    tg.disableVerticalSwipes()
  }
  if (typeof console !== 'undefined' && import.meta.env?.DEV) {
    const v = parseSDKVersion(tg.version)
    console.info(
      `[TG] SDK ${tg.version || 'unknown'} (parsed ${Number.isNaN(v) ? '?' : v}) | ` +
      `platform=${tg.platform} | ` +
      `fullscreen=${isFullscreenSupported(tg) ? 'yes' : 'NO'}`,
    )
  }
  return tg
}

export function hapticImpact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') {
  const tg = getTelegram()
  if (!tg) return
  try { tg.HapticFeedback.impactOccurred(style) } catch { /* noop */ }
}

export function hapticNotification(type: 'error' | 'success' | 'warning' = 'success') {
  const tg = getTelegram()
  if (!tg) return
  try { tg.HapticFeedback.notificationOccurred(type) } catch { /* noop */ }
}

export function hapticSelection() {
  const tg = getTelegram()
  if (!tg) return
  try { tg.HapticFeedback.selectionChanged() } catch { /* noop */ }
}

export function cloudGetItem(key: string): Promise<string | null> {
  const tg = getTelegram()
  if (!tg?.CloudStorage) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      tg.CloudStorage!.getItem(key, (err, value) => {
        if (err || value === undefined) resolve(null)
        else resolve(value)
      })
    } catch {
      resolve(null)
    }
  })
}

export function cloudSetItem(key: string, value: string): Promise<boolean> {
  const tg = getTelegram()
  if (!tg?.CloudStorage) return Promise.resolve(false)
  return new Promise((resolve) => {
    try {
      tg.CloudStorage!.setItem(key, value, (err, ok) => {
        resolve(ok === true && !err)
      })
    } catch {
      resolve(false)
    }
  })
}
