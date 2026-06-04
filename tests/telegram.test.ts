// Purpose: тесты парсинга версии SDK и детекции поддержки fullscreen в Telegram Mini App
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Reset module registry between tests so telegram.ts singleton behaves predictably
const loadTelegramModule = async () => {
  vi.resetModules()
  return import('../src/utils/telegram')
}

describe('parseSDKVersion', () => {
  it('parses "8.0" as 8', async () => {
    const { parseSDKVersion } = await loadTelegramModule()
    expect(parseSDKVersion('8.0')).toBe(8)
  })

  it('parses "7.10" as 7 (Telegram convention: major.minor)', async () => {
    const { parseSDKVersion } = await loadTelegramModule()
    expect(parseSDKVersion('7.10')).toBe(7)
  })

  it('parses "8.5" as 8', async () => {
    const { parseSDKVersion } = await loadTelegramModule()
    expect(parseSDKVersion('8.5')).toBe(8)
  })

  it('parses "9" as 9 (no minor)', async () => {
    const { parseSDKVersion } = await loadTelegramModule()
    expect(parseSDKVersion('9')).toBe(9)
  })

  it('returns NaN for undefined', async () => {
    const { parseSDKVersion } = await loadTelegramModule()
    expect(parseSDKVersion(undefined)).toBeNaN()
  })

  it('returns NaN for empty string', async () => {
    const { parseSDKVersion } = await loadTelegramModule()
    expect(parseSDKVersion('')).toBeNaN()
  })

  it('returns NaN for garbage', async () => {
    const { parseSDKVersion } = await loadTelegramModule()
    expect(parseSDKVersion('not-a-version')).toBeNaN()
  })
})

describe('isFullscreenSupported', () => {
  const originalTelegram = (globalThis as { Telegram?: unknown }).Telegram

  const installFakeTelegram = (version: string | undefined, withMethods = true) => {
    const fake: Record<string, unknown> = {
      version,
      isFullscreen: false,
      isExpanded: true,
    }
    if (withMethods) {
      fake.requestFullscreen = vi.fn()
      fake.exitFullscreen = vi.fn()
    }
    ;(globalThis as { Telegram?: unknown }).Telegram = { WebApp: fake }
    return fake
  }

  beforeEach(() => {
    delete (globalThis as { Telegram?: unknown }).Telegram
  })

  afterEach(() => {
    if (originalTelegram === undefined) {
      delete (globalThis as { Telegram?: unknown }).Telegram
    } else {
      ;(globalThis as { Telegram?: unknown }).Telegram = originalTelegram
    }
  })

  it('returns false when no Telegram', async () => {
    delete (globalThis as { Telegram?: unknown }).Telegram
    const { isFullscreenSupported } = await loadTelegramModule()
    expect(isFullscreenSupported()).toBe(false)
  })

  it('returns false when SDK < 8.0', async () => {
    installFakeTelegram('7.10')
    const { isFullscreenSupported } = await loadTelegramModule()
    expect(isFullscreenSupported()).toBe(false)
  })

  it('returns true when SDK == 8.0 and methods present', async () => {
    installFakeTelegram('8.0')
    const { isFullscreenSupported } = await loadTelegramModule()
    expect(isFullscreenSupported()).toBe(true)
  })

  it('returns true when SDK > 8.0', async () => {
    installFakeTelegram('8.5')
    const { isFullscreenSupported } = await loadTelegramModule()
    expect(isFullscreenSupported()).toBe(true)
  })

  it('returns false when SDK >= 8.0 but methods missing', async () => {
    installFakeTelegram('8.0', false)
    const { isFullscreenSupported } = await loadTelegramModule()
    expect(isFullscreenSupported()).toBe(false)
  })

  it('returns false when version is undefined', async () => {
    installFakeTelegram(undefined)
    const { isFullscreenSupported } = await loadTelegramModule()
    expect(isFullscreenSupported()).toBe(false)
  })
})

describe('getTelegram + isFullscreenSupported integration', () => {
  const originalTelegram = (globalThis as { Telegram?: unknown }).Telegram

  afterEach(() => {
    if (originalTelegram === undefined) {
      delete (globalThis as { Telegram?: unknown }).Telegram
    } else {
      ;(globalThis as { Telegram?: unknown }).Telegram = originalTelegram
    }
  })

  it('getTelegram returns null when not in TG', async () => {
    delete (globalThis as { Telegram?: unknown }).Telegram
    const { getTelegram } = await loadTelegramModule()
    expect(getTelegram()).toBeNull()
  })

  it('initTelegram returns null when not in TG', async () => {
    delete (globalThis as { Telegram?: unknown }).Telegram
    const { initTelegram } = await loadTelegramModule()
    expect(initTelegram()).toBeNull()
  })

  it('initTelegram does not throw when SDK is old', async () => {
    const fake = {
      version: '7.0',
      isExpanded: true,
      isFullscreen: false,
      ready: vi.fn(),
      expand: vi.fn(),
      enableClosingConfirmation: vi.fn(),
      disableVerticalSwipes: vi.fn(),
    }
    ;(globalThis as { Telegram?: unknown }).Telegram = { WebApp: fake }
    const { initTelegram } = await loadTelegramModule()
    expect(() => initTelegram()).not.toThrow()
    expect(fake.ready).toHaveBeenCalledOnce()
    expect(fake.expand).toHaveBeenCalledOnce()
  })

  it('initTelegram calls fullscreen-related API when supported', async () => {
    const fake = {
      version: '8.0',
      isExpanded: true,
      isFullscreen: false,
      ready: vi.fn(),
      expand: vi.fn(),
      requestFullscreen: vi.fn(),
      exitFullscreen: vi.fn(),
      enableClosingConfirmation: vi.fn(),
      disableVerticalSwipes: vi.fn(),
    }
    ;(globalThis as { Telegram?: unknown }).Telegram = { WebApp: fake }
    const { initTelegram } = await loadTelegramModule()
    initTelegram()
    // initTelegram itself does NOT call requestFullscreen (requires user gesture)
    expect(fake.requestFullscreen).not.toHaveBeenCalled()
    expect(fake.disableVerticalSwipes).toHaveBeenCalledOnce()
  })
})
