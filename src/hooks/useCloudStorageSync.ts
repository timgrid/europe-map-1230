// Purpose: персистенс currentYear через Telegram CloudStorage между запусками Mini App
import { useEffect, useRef } from 'react'
import { useMapStore } from '../store'
import { cloudGetItem, cloudSetItem } from '../utils/telegram'
import { useTelegram } from './useTelegram'

const KEY = 'europe-map:currentYear'
const VALID_YEARS = [800, 900, 1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600] as const

export function useCloudStorageSync() {
  const { isTG } = useTelegram()
  const currentYear = useMapStore((s) => s.currentYear)
  const setYear = useMapStore((s) => s.setYear)
  const initializedRef = useRef(false)

  // Load saved year once
  useEffect(() => {
    if (!isTG || initializedRef.current) return
    initializedRef.current = true
    let cancelled = false
    cloudGetItem(KEY).then((value) => {
      if (cancelled || value === null) return
      const parsed = Number.parseInt(value, 10)
      if (VALID_YEARS.includes(parsed as (typeof VALID_YEARS)[number])) {
        setYear(parsed)
      }
    })
    return () => { cancelled = true }
  }, [isTG, setYear])

  // Persist on change (skip initial mount where currentYear hasn't changed via user)
  useEffect(() => {
    if (!isTG || !initializedRef.current) return
    cloudSetItem(KEY, String(currentYear))
  }, [isTG, currentYear])
}
