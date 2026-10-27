import { useCallback, useEffect, useState } from 'react'
import { ShieldCheckIcon, Trash2Icon } from 'lucide-react'
import type { HistoryStats } from '@shared/types'
import { api } from '@/lib/api'
import { useUi } from '@/lib/i18n'
import { formatBytes, formatDays, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Card, Row, Section } from './parts'
import { useSettings } from './useSettings'

const PRESETS = [1, 7, 30, 90, 365]

export function HistorySection(): React.ReactNode {
  const { t, locale } = useUi()
  const [settings, update] = useSettings()
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [includePinned, setIncludePinned] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)

  const reload = useCallback(() => void api.stats().then(setStats), [])
  useEffect(() => {
    reload()
    return api.onHistoryChanged(reload)
  }, [reload])

  if (!settings) return null
  const days = settings.retentionDays
  const tiles: [string, string][] = stats
    ? [
        [t('history.items'), formatNumber(stats.total, locale)],
        [t('history.images'), formatNumber(stats.images, locale)],
        [t('history.pinned'), formatNumber(stats.pinned, locale)],
        [t('history.disk'), formatBytes(stats.bytes, locale)]
      ]
    : []

  const commitDraft = (): void => {
    if (draft === null) return
    const n = Math.round(Number(draft))
    if (Number.isFinite(n) && n >= 1) update({ retentionDays: Math.min(n, 3650) })
    setDraft(null)
  }

  return (
    <Section title={t('nav.history')} description={t('history.description')}>
      <div className="grid grid-cols-4 gap-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-3 shadow-xs">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums" data-testid={`stat-${label}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div className="space-y-4 px-5 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">{t('history.keepFor')}</div>
              <div className="text-[13px] text-muted-foreground">{t('history.keepForHint')}</div>
            </div>
            <div
              className="shrink-0 text-lg font-semibold text-brand"
              data-testid="retention-value"
            >
              {days ? formatDays(days, locale) : t('history.forever')}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => update({ retentionDays: d })}
                className={cn(
                  'h-8 rounded-full border px-3 text-[13px] font-medium transition-colors',
                  days === d
                    ? 'border-primary bg-primary font-semibold text-white'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {formatDays(d, locale)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => update({ retentionDays: 0 })}
              className={cn(
                'h-8 rounded-full border px-3 text-[13px] font-medium transition-colors',
                days === 0
                  ? 'border-primary bg-primary font-semibold text-white'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {t('history.forever')}
            </button>
            <div className="ms-auto flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={3650}
                data-testid="retention-input"
                aria-label={t('history.keepFor')}
                className="w-24 text-end tabular-nums"
                value={draft ?? (days ? String(days) : '')}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
              />
              <span className="text-[13px] text-muted-foreground">{t('history.days')}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <Row
          title={t('history.clear')}
          hint={cleared ? t('history.cleared') : t('history.clearHint')}
        >
          <Button
            variant="destructive"
            data-testid="clear-history"
            disabled={!stats?.total}
            onClick={() => {
              setIncludePinned(false)
              setConfirm(true)
            }}
          >
            <Trash2Icon />
            {t('history.clear')}
          </Button>
        </Row>
      </Card>

      <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
        {t('history.privacy')}
      </p>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('history.clearTitle')}</DialogTitle>
            <DialogDescription>{t('history.clearBody')}</DialogDescription>
          </DialogHeader>
          {!!stats?.pinned && (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={includePinned} onCheckedChange={setIncludePinned} />
              {t('history.clearPinned')}
            </label>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('history.cancel')}</DialogClose>
            <Button
              variant="destructive"
              data-testid="confirm-clear"
              onClick={() => {
                void api.clearHistory(includePinned).then((s) => {
                  setStats(s)
                  setCleared(true)
                  setConfirm(false)
                })
              }}
            >
              {t('history.confirmClear')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  )
}
