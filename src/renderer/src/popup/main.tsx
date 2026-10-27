import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import { UiProvider } from '@/lib/i18n'
import { PopupApp } from './PopupApp'

document.documentElement.classList.add('popup')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UiProvider>
      <PopupApp />
    </UiProvider>
  </StrictMode>
)
