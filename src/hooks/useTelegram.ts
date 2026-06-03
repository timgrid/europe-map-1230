// Purpose: React-хук для Telegram Mini App — тема, платформа, инициализация
import { useEffect, useState } from 'react'
import { getTelegram, type TelegramWebApp, type TelegramThemeParams } from '../utils/telegram'

export interface TelegramState {
  isTG: boolean
  tg: TelegramWebApp | null
  theme: TelegramThemeParams
  colorScheme: 'light' | 'dark'
  platform: string
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
    if (!t) return { isTG: false, tg: null, theme: DEFAULT_THEME, colorScheme: 'light', platform: '' }
    return {
      isTG: true,
      tg: t,
      theme: t.themeParams,
      colorScheme: t.colorScheme,
      platform: t.platform,
    }
  })

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

    t.onEvent('themeChanged', handleTheme)
    return () => t.offEvent('themeChanged', handleTheme)
  }, [])

  return state
}
