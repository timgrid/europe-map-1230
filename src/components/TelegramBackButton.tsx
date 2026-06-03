// Purpose: синхронизация Telegram back button с состоянием выбранной страны
import { useEffect } from 'react'
import { useMapStore } from '../store'
import { getTelegram } from '../utils/telegram'

export default function TelegramBackButton() {
  const selectedCountry = useMapStore((state) => state.selectedCountry)
  const setSelectedCountry = useMapStore((state) => state.setSelectedCountry)

  useEffect(() => {
    const tg = getTelegram()
    if (!tg) return

    if (selectedCountry) {
      tg.BackButton.show()
      const cb = () => setSelectedCountry(null)
      tg.BackButton.onClick(cb)
      return () => {
        tg.BackButton.offClick(cb)
        tg.BackButton.hide()
      }
    } else {
      tg.BackButton.hide()
    }
  }, [selectedCountry, setSelectedCountry])

  return null
}
