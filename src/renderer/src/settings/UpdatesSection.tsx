import { useEffect, useState } from 'react'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  Loader2Icon,
  RefreshCwIcon,
  RotateCcwIcon
} from 'lucide-react'
import type { UpdateState } from '@shared/update'
import { api } from '@/lib/api'
import { useUi } from '@/lib/i18n'
import { relativeTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, Row, Section } from './parts'

function StatusLine({ state }: { state: UpdateState }): React.ReactNode {
  const { t, locale } = useUi()
  switch (state.status) {
    case 'checking':
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" /> {t('updates.checking')}
        </span>
      )
    case 'up-to-date':
      return (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1.5 text-success">
            <CheckCircle2Icon className="size-3.5" /> {t('updates.upToDate')}
          </span>
          {state.checkedAt && (
            <span className="text-muted-foreground">
              {t('updates.lastChecked', { time: relativeTime(state.checkedAt, locale) })}
            </span>
          )}
        </span>
      )
    case 'available':
      return (
        <span className="font-medium text-brand">
          {t('updates.available', { version: state.version ?? '' })}
        </span>
      )
    case 'downloading':
      return (
        <span className="text-muted-foreground">
          {t('updates.downloading', { percent: state.percent ?? 0 })}
        </span>
      )
    case 'downloaded':
      return (
        <span className="font-medium text-success">
          {t('updates.downloaded', { version: state.version ?? '' })}
        </span>
      )
    case 'installing':
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" /> {t('updates.installing')}
        </span>
      )
    default:
      return null
  }
}

export function UpdatesSection(): React.ReactNode {
  const { t } = useUi()
  const [state, setState] = useState<UpdateState | null>(null)
  useEffect(() => {
    void api.update().then(setState)
    return api.onUpdate(setState)
  }, [])
  if (!state) return null
  const busy = state.status === 'checking' || state.status === 'downloading'
  const start = (): void => {
    if (state.installer) void api.downloadUpdate()
    else if (state.releaseUrl) void api.openExternal(state.releaseUrl)
  }
  return (
    <Section title={t('nav.updates')} description={t('updates.description')}>
      <Card>
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-sm font-medium">
                {t('updates.version', { version: state.currentVersion })}
              </div>
              <div className="text-[13px]" data-testid="update-status">
                <StatusLine state={state} />
              </div>
            </div>
            {(state.status === 'available' || state.status === 'downloading') && (
              <Button disabled={busy} onClick={start}>
                {state.installer ? <DownloadIcon /> : <ExternalLinkIcon />}
                {state.installer ? t('updates.download') : t('updates.openPage')}
              </Button>
            )}
            {state.status === 'downloaded' && (
              <Button onClick={() => void api.installUpdate()}>
                <RotateCcwIcon />
                {t('updates.install')}
              </Button>
            )}
            {!['available', 'downloading', 'downloaded', 'installing'].includes(state.status) && (
              <Button variant="outline" disabled={busy} onClick={() => void api.checkUpdate()}>
                <RefreshCwIcon className={busy ? 'animate-spin' : undefined} />
                {t('updates.check')}
              </Button>
            )}
          </div>
          {state.status === 'downloading' && (
            <div
              role="progressbar"
              aria-valuenow={state.percent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${state.percent ?? 0}%` }}
              />
            </div>
          )}
          {state.error && (
            <p className="flex items-start gap-1.5 text-[13px] break-words text-destructive">
              <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
              {state.status === 'error'
                ? t('updates.failed', { message: state.error })
                : state.error}
            </p>
          )}
          {state.releaseUrl && state.status !== 'up-to-date' && (
            <button
              type="button"
              onClick={() => void api.openExternal(state.releaseUrl!)}
              className="inline-flex items-center gap-1 text-[13px] text-brand hover:underline"
            >
              <ExternalLinkIcon className="size-3.5" /> {t('updates.notes')}
            </button>
          )}
        </div>
      </Card>
      <Card>
        <Row title={t('updates.auto')} hint={t('updates.autoHint')} htmlFor="auto-update">
          <Switch
            id="auto-update"
            checked={state.autoCheck}
            onCheckedChange={(v) => void api.setAutoCheck(v)}
          />
        </Row>
      </Card>
      {!state.installer && (
        <p className="text-[13px] text-muted-foreground">{t('updates.manualOnly')}</p>
      )}
    </Section>
  )
}
