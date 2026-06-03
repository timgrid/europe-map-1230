// Purpose: точка входа | Vite entry point — монтирует App в #root + инициализация Telegram
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initTelegram } from './utils/telegram'
import './index.css'
import App from './App.tsx'

initTelegram()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
