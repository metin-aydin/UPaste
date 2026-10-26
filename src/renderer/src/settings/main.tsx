import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import { UiProvider } from '@/lib/i18n'
import { SettingsApp } from './SettingsApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UiProvider>
      <SettingsApp />
    </UiProvider>
  </StrictMode>
)
