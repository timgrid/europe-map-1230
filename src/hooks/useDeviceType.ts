// Purpose: хук для определения типа устройства (mobile vs desktop) — по ширине экрана и поддержке touch
import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'desktop'

export function useDeviceType(): DeviceType {
  const [device, setDevice] = useState<DeviceType>(
    () => window.innerWidth < 768 || 'ontouchstart' in window ? 'mobile' : 'desktop',
  )

  useEffect(() => {
    const onResize = () => setDevice(window.innerWidth < 768 ? 'mobile' : 'desktop')
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return device
}

export function useIsMobile(): boolean {
  return useDeviceType() === 'mobile'
}
