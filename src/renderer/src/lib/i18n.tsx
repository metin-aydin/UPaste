// Pencerenin dili ve teması: ana süreçten gelir, değişince yeniden çizilir. <html> öğesine `lang`, `dir` (sağdan
// sola diller) ve koyu tema için `dark` sınıfı yazılır.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { localeDir, translate, type MessageKey, type Params } from '@shared/i18n'
import type { UiInfo } from '@shared/ipc'
import { api } from './api'

interface UiContext extends UiInfo {
  t: (key: MessageKey, params?: Params) => string
}

const Context = createContext<UiContext | null>(null)

function apply(info: UiInfo): void {
  const root = document.documentElement
  root.lang = info.locale
  root.dir = localeDir(info.locale)
  root.classList.toggle('dark', info.dark)
}

export function UiProvider({ children }: { children: ReactNode }): ReactNode {
  const [info, setInfo] = useState<UiInfo | null>(null)
  useEffect(() => {
    void api.uiInfo().then((i) => {
      apply(i)
      setInfo(i)
    })
    return api.onUiChanged((i) => {
      apply(i)
      setInfo(i)
    })
  }, [])
  const value = useMemo<UiContext | null>(
    () => (info ? { ...info, t: (key, params) => translate(info.locale, key, params) } : null),
    [info]
  )
  if (!value) return null
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useUi(): UiContext {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('UiProvider missing')
  return ctx
}

export const useT = (): UiContext['t'] => useUi().t
