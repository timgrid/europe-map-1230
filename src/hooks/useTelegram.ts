// Purpose: React-хук для Telegram Mini App — тема, viewport, expand, события
import { useEffect, useState, useCallback } from 'react'
import { getTelegram, type TelegramWebApp, type TelegramThemeParams } from '../utils/telegram'

export interface TelegramState {
  isTG: boolean
  tg: TelegramWebApp | null
  theme: TelegramThemeParams
  colorScheme: 'light' | 'dark'
  platform: string
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  expand: () => void
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

export function useTelegram(): TelegramState {
  const [state, setState] = useState<TelegramState>(() => {
    const t = getTelegram()
    if (!t) {
      return {
        isTG: false,
        tg: null,
        theme: DEFAULT_THEME,
        colorScheme: 'light',
        platform: '',
        isExpanded: false,
        viewportHeight: window?.innerHeight ?? 0,
        viewportStableHeight: window?.innerHeight ?? 0,
        expand: () => {},
      }
    }
    return {
      isTG: true,
      tg: t,
      theme: t.themeParams,
      colorScheme: t.colorScheme,
      platform: t.platform,
      isExpanded: t.isExpanded,
      viewportHeight: t.viewportHeight,
      viewportStableHeight: t.viewportStableHeight,
      expand: () => t.expand(),
    }
  })

  const expand = useCallback(() => {
    const t = getTelegram()
    if (!t) return
    t.expand()
  }, [])

  useEffect(() => {
    const t = getTelegram()
    if (!t) return

    const handleTheme = () => {
      setState((prev) => ({
        ...prev,
        theme: { ...DEFAULT_THEME, ...t.themeParams },
        colorScheme: t.colorScheme,
      }))
    }
    const handleViewport = () => {
      setState((prev) => ({
        ...prev,
        isExpanded: t.isExpanded,
        viewportHeight: t.viewportHeight,
        viewportStableHeight: t.viewportStableHeight,
      }))
    }

    t.onEvent('themeChanged', handleTheme)
    t.onEvent('viewportChanged', handleViewport)
    t.onEvent('safeAreaChanged', handleViewport)
    t.onEvent('contentSafeAreaChanged', handleViewport)
    return () => {
      t.offEvent('themeChanged', handleTheme)
      t.offEvent('viewportChanged', handleViewport)
      t.offEvent('safeAreaChanged', handleViewport)
      t.offEvent('contentSafeAreaChanged', handleViewport)
    }
  }, [])

  return { ...state, expand }
}
