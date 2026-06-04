// Purpose: React-хук для Telegram Mini App — тема, viewport, fullscreen, safe areas
import { useEffect, useState, useCallback } from 'react'
import {
  getTelegram,
  isFullscreenSupported as checkFullscreenSupported,
  type TelegramWebApp,
  type TelegramThemeParams,
  type TelegramSafeAreaInset,
} from '../utils/telegram'

export interface TelegramState {
  isTG: boolean
  tg: TelegramWebApp | null
  theme: TelegramThemeParams
  colorScheme: 'light' | 'dark'
  platform: string
  isExpanded: boolean
  isFullscreen: boolean
  isFullscreenSupported: boolean
  isActive: boolean
  viewportHeight: number
  viewportStableHeight: number
  safeAreaInset: TelegramSafeAreaInset
  contentSafeAreaInset: TelegramSafeAreaInset
  expand: () => void
  requestFullscreen: () => void
  exitFullscreen: () => void
}

const DEFAULT_THEME: TelegramThemeParams = {
  bg_color: '#0f172a',
  text_color: '#fef3c7',
  hint_color: '#94a3b8',
  link_color: '#60a5fa',
  button_color: '#f59e0b',
  button_text_color: '#0f172a',
  secondary_bg_color: '#1e293b',
}

const ZERO_INSET: TelegramSafeAreaInset = { top: 0, bottom: 0, left: 0, right: 0 }

function safeInset(inset: TelegramSafeAreaInset | undefined): TelegramSafeAreaInset {
  return inset ?? ZERO_INSET
}

export function useTelegram(): TelegramState {
  const [state, setState] = useState<TelegramState>(() => {
    const t = getTelegram()
    const winH = typeof window !== 'undefined' ? window.innerHeight : 0
    if (!t) {
      return {
        isTG: false,
        tg: null,
        theme: DEFAULT_THEME,
        colorScheme: 'light',
        platform: '',
        isExpanded: false,
        isFullscreen: false,
        isFullscreenSupported: false,
        isActive: true,
        viewportHeight: winH,
        viewportStableHeight: winH,
        safeAreaInset: ZERO_INSET,
        contentSafeAreaInset: ZERO_INSET,
        expand: () => {},
        requestFullscreen: () => {},
        exitFullscreen: () => {},
      }
    }
    return {
      isTG: true,
      tg: t,
      theme: t.themeParams,
      colorScheme: t.colorScheme,
      platform: t.platform,
      isExpanded: t.isExpanded,
      isFullscreen: t.isFullscreen ?? false,
      isFullscreenSupported: checkFullscreenSupported(t),
      isActive: t.isActive ?? true,
      viewportHeight: t.viewportHeight,
      viewportStableHeight: t.viewportStableHeight,
      safeAreaInset: safeInset(t.safeAreaInset),
      contentSafeAreaInset: safeInset(t.contentSafeAreaInset),
      expand: () => t.expand(),
      requestFullscreen: () => t.requestFullscreen?.(),
      exitFullscreen: () => t.exitFullscreen?.(),
    }
  })

  const expand = useCallback(() => {
    const t = getTelegram()
    if (!t) return
    t.expand()
  }, [])

  const requestFullscreen = useCallback(() => {
    const t = getTelegram()
    if (!t) return
    t.requestFullscreen?.()
  }, [])

  const exitFullscreen = useCallback(() => {
    const t = getTelegram()
    if (!t) return
    t.exitFullscreen?.()
  }, [])

  useEffect(() => {
    const t = getTelegram()
    if (!t) return

    const handleTheme = () => {
      setState((prev) => ({
        ...prev,
        theme: { ...DEFAULT_THEME, ...t!.themeParams },
        colorScheme: t!.colorScheme,
      }))
    }
    const handleViewport = () => {
      setState((prev) => ({
        ...prev,
        isExpanded: t!.isExpanded,
        viewportHeight: t!.viewportHeight,
        viewportStableHeight: t!.viewportStableHeight,
        safeAreaInset: safeInset(t!.safeAreaInset),
        contentSafeAreaInset: safeInset(t!.contentSafeAreaInset),
      }))
    }
    const handleFullscreen = () => {
      setState((prev) => ({ ...prev, isFullscreen: t!.isFullscreen ?? false }))
    }
    const handleActive = () => {
      setState((prev) => ({ ...prev, isActive: t!.isActive ?? true }))
    }

    t.onEvent('themeChanged', handleTheme)
    t.onEvent('viewportChanged', handleViewport)
    t.onEvent('safeAreaChanged', handleViewport)
    t.onEvent('contentSafeAreaChanged', handleViewport)
    t.onEvent('fullscreenChanged', handleFullscreen)
    t.onEvent('activated', handleActive)
    t.onEvent('deactivated', handleActive)
    return () => {
      t.offEvent('themeChanged', handleTheme)
      t.offEvent('viewportChanged', handleViewport)
      t.offEvent('safeAreaChanged', handleViewport)
      t.offEvent('contentSafeAreaChanged', handleViewport)
      t.offEvent('fullscreenChanged', handleFullscreen)
      t.offEvent('activated', handleActive)
      t.offEvent('deactivated', handleActive)
    }
  }, [])

  return { ...state, expand, requestFullscreen, exitFullscreen }
}
