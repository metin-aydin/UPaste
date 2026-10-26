import { useCallback, useEffect, useState } from 'react'
import type { Settings } from '@shared/types'
import { api } from '@/lib/api'

/** Ayarları okur; değişiklik ana sürece yazılır ve dönen değer gösterilir. */
export function useSettings(): [Settings | null, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    void api.settings().then(setSettings)
  }, [])
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s))
    void api.setSettings(patch).then(setSettings)
  }, [])
  return [settings, update]
}
