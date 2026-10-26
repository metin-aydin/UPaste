import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  KeyboardIcon,
  Loader2Icon,
  LogOutIcon,
  PuzzleIcon,
  RotateCcwIcon
} from 'lucide-react'
import { acceleratorFromEvent, acceleratorLabel, acceleratorParts } from '@shared/accelerator'
import type { IntegrationState } from '@shared/types'
import { api } from '@/lib/api'
import { useUi } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, Row, Section, StatusDot } from './parts'

const DEFAULT_SHORTCUT = '<Super>v'

function Keycap({
  children,
  small
}: {
  children: React.ReactNode
  small?: boolean
}): React.ReactNode {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center rounded-lg border border-b-[3px] bg-background font-sans font-semibold shadow-xs',
        small ? 'h-7 min-w-7 px-2 text-xs' : 'h-9 min-w-9 px-3 text-sm'
      )}
    >
      {children}
    </kbd>
  )
}

function Keys({ accel, small }: { accel: string; small?: boolean }): React.ReactNode {
  return (
    <span className="flex items-center gap-1.5" dir="ltr">
      {acceleratorParts(accel).map((part, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground">+</span>}
          <Keycap small={small}>{part}</Keycap>
        </span>
      ))}
    </span>
  )
}

function Status({
  tone,
  children
}: {
  tone: 'ok' | 'warn' | 'error' | 'muted'
  children: React.ReactNode
}): React.ReactNode {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
      <StatusDot tone={tone} />
      {children}
    </span>
  )
}

/** Kısayol kaydedici: "Değiştir"e basınca bir sonraki tuş birleşimini yeni kısayol olarak alır. */
function ShortcutRecorder({
  current,
  onDone
}: {
  current: string
  onDone: () => void
}): React.ReactNode {
  const { t } = useUi()
  const [recording, setRecording] = useState(false)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    if (!recording) return
    void api.pauseShortcut(true)
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRecording(false)
        return
      }
      if (['Control', 'Alt', 'Shift', 'Meta', 'Super', 'OS', 'Hyper'].includes(e.key)) return
      const accel = acceleratorFromEvent(e)
      if (!accel) {
        setInvalid(true)
        return
      }
      setRecording(false)
      void api.setShortcut(accel).then(onDone)
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      void api.pauseShortcut(false)
    }
  }, [recording, onDone])

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {recording ? (
          <span
            data-testid="shortcut-recording"
            className="flex h-9 animate-pulse items-center rounded-lg border-2 border-dashed border-primary px-3 text-[13px] font-medium text-brand"
          >
            {t('setup.shortcutRecording')}
          </span>
        ) : (
          current && <Keys accel={current} small />
        )}
        {recording ? (
          <Button variant="ghost" size="sm" onClick={() => setRecording(false)}>
            {t('history.cancel')}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            data-testid="shortcut-change"
            onClick={() => {
              setInvalid(false)
              setRecording(true)
            }}
          >
            <KeyboardIcon />
            {t('setup.shortcutChange')}
          </Button>
        )}
        {!recording && current !== DEFAULT_SHORTCUT && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void api.setShortcut(DEFAULT_SHORTCUT).then(onDone)}
          >
            <RotateCcwIcon />
            {t('setup.shortcutReset')}
          </Button>
        )}
      </div>
      {invalid && recording && (
        <span className="text-xs text-destructive">{t('setup.shortcutInvalid')}</span>
      )}
    </div>
  )
}

export function SetupSection(): React.ReactNode {
  const { t } = useUi()
  const [state, setState] = useState<IntegrationState | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)

  const reload = useCallback(() => void api.integration().then(setState), [])
  useEffect(() => {
    reload()
    const off = api.onIntegration(setState)
    window.addEventListener('focus', reload)
    return () => {
      off()
      window.removeEventListener('focus', reload)
    }
  }, [reload])

  const run = async (name: string, action: () => Promise<unknown>): Promise<void> => {
    setBusy(name)
    try {
      await action()
    } finally {
      setBusy(null)
      reload()
    }
  }

  if (!state) return null
  const ext = state.extension
  const working = ext === 'active' || ext === 'outdated'
  const shortcut = state.shortcut || DEFAULT_SHORTCUT
  const shortcutText = acceleratorLabel(shortcut)
  const extStatus: Record<
    IntegrationState['extension'],
    [React.ComponentProps<typeof StatusDot>['tone'], string]
  > = {
    active: ['ok', t('setup.statusActive')],
    'needs-relogin': ['warn', t('setup.statusRelogin')],
    outdated: ['warn', t('setup.statusRelogin')],
    disabled: ['muted', t('setup.statusDisabled')],
    error: ['error', t('setup.statusError')],
    'not-installed': ['muted', t('setup.statusMissing')]
  }
  const [extTone, extLabel] = extStatus[ext]
  const spinner = (name: string): React.ReactNode =>
    busy === name ? <Loader2Icon className="animate-spin" /> : null

  return (
    <Section title={t('nav.setup')} description={t('setup.description')}>
      <div
        data-testid="setup-banner"
        className={cn(
          'flex items-center gap-5 rounded-xl border px-5 py-4',
          state.ready ? 'border-primary/40 bg-primary/8' : 'border-warning/30 bg-warning/8'
        )}
      >
        <Keys accel={shortcut} />
        <div className="flex min-w-0 flex-1 items-start gap-2 text-sm">
          {state.ready ? (
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-brand" />
          ) : (
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" />
          )}
          <span>
            {!state.gnome
              ? t('setup.notGnome')
              : state.ready
                ? t('setup.ready', { shortcut: shortcutText })
                : t('setup.notReady', { shortcut: shortcutText })}
          </span>
        </div>
      </div>

      {state.gnome && (
        <Card>
          <Row
            title={
              <span className="flex items-center gap-2">
                <PuzzleIcon className="size-4 text-muted-foreground" />
                {t('setup.extension')}
              </span>
            }
            hint={
              <>
                <span>{t('setup.extensionHint')}</span>
                {ext === 'error' && state.extensionError && (
                  <span className="mt-1 block text-destructive">{state.extensionError}</span>
                )}
              </>
            }
          >
            <Status tone={extTone}>{extLabel}</Status>
            {(ext === 'not-installed' || ext === 'error') && (
              <Button
                data-testid="install-extension"
                disabled={!!busy}
                onClick={() => void run('install', api.installExtension)}
              >
                {spinner('install')}
                {t('setup.install')}
              </Button>
            )}
            {ext === 'disabled' && (
              <Button disabled={!!busy} onClick={() => void run('install', api.installExtension)}>
                {spinner('install')}
                {t('setup.enable')}
              </Button>
            )}
            {(ext === 'needs-relogin' || ext === 'outdated') && (
              <Button variant="outline" onClick={() => void api.logout()}>
                <LogOutIcon />
                {t('setup.logout')}
              </Button>
            )}
          </Row>
          <Row
            title={t('setup.shortcut')}
            hint={
              <>
                <span>{restored ? t('setup.restored') : t('setup.shortcutHint')}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-2">
                  {!working ? (
                    <Status tone="muted">{t('setup.shortcutWaiting')}</Status>
                  ) : state.conflicts.length ? (
                    <Status tone="warn">
                      {t('setup.shortcutTaken', {
                        names: state.conflicts.map((c) => c.name).join(', ')
                      })}
                    </Status>
                  ) : state.ready ? (
                    <Status tone="ok">{t('setup.shortcutReady')}</Status>
                  ) : null}
                  {working && !state.ready && (
                    <Button
                      size="sm"
                      data-testid="take-over"
                      disabled={!!busy}
                      onClick={() => {
                        setRestored(false)
                        void run('takeover', api.takeOver)
                      }}
                    >
                      {spinner('takeover')}
                      {t('setup.takeOver')}
                    </Button>
                  )}
                  {state.tookOver && state.ready && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      onClick={() =>
                        void run('restore', async () => {
                          await api.restore()
                          setRestored(true)
                        })
                      }
                    >
                      <RotateCcwIcon />
                      {t('setup.restore')}
                    </Button>
                  )}
                </span>
              </>
            }
          >
            <ShortcutRecorder current={state.shortcut} onDone={reload} />
          </Row>
        </Card>
      )}
    </Section>
  )
}
