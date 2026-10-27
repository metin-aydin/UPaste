import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { LOCALES, localeName } from '@shared/i18n'
import type { LayoutSetting, ThemeSetting } from '@shared/types'
import { useUi } from '@/lib/i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, ChoiceCards, Row, Section, Segmented } from './parts'
import { useSettings } from './useSettings'

export function GeneralSection(): React.ReactNode {
  const { t, systemLocale } = useUi()
  const [settings, update] = useSettings()
  if (!settings) return null
  const systemLabel = t('general.systemLanguage', { language: localeName(systemLocale) })
  const items = [
    { value: 'system', label: systemLabel },
    ...LOCALES.map((l) => ({ value: l.code, label: l.name }))
  ]
  return (
    <Section title={t('nav.general')} description={t('general.description')}>
      <Card>
        <Row title={t('general.language')} hint={t('general.languageHint')} htmlFor="language">
          <Select
            value={settings.language}
            items={items}
            onValueChange={(v) => typeof v === 'string' && update({ language: v })}
          >
            <SelectTrigger
              id="language"
              data-testid="language"
              className="w-60"
              aria-label={t('general.language')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">{systemLabel}</SelectItem>
              <SelectSeparator />
              {LOCALES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  <span dir={l.dir}>{l.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row title={t('general.theme')}>
          <Segmented<ThemeSetting>
            label={t('general.theme')}
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'system', label: t('general.themeSystem'), icon: <MonitorIcon /> },
              { value: 'light', label: t('general.themeLight'), icon: <SunIcon /> },
              { value: 'dark', label: t('general.themeDark'), icon: <MoonIcon /> }
            ]}
          />
        </Row>
        <Row
          title={t('general.launchAtLogin')}
          hint={t('general.launchAtLoginHint')}
          htmlFor="login"
        >
          <Switch
            id="login"
            checked={settings.launchAtLogin}
            onCheckedChange={(v) => update({ launchAtLogin: v })}
          />
        </Row>
      </Card>
      <Card>
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">{t('general.layout')}</div>
            <div className="text-[13px] text-muted-foreground">{t('general.layoutHint')}</div>
          </div>
          <ChoiceCards<LayoutSetting>
            label={t('general.layout')}
            value={settings.layout}
            onChange={(layout) => update({ layout })}
            options={[
              {
                value: 'auto',
                title: t('general.layoutAuto'),
                hint: t('general.layoutAutoHint'),
                art: <PopupArt />
              },
              {
                value: 'sheet',
                title: t('general.layoutSheet'),
                hint: t('general.layoutSheetHint'),
                art: <SheetArt />
              }
            ]}
          />
        </div>
      </Card>
    </Section>
  )
}

/** Metin alanının altında açılan küçük pencerenin çizimi. */
function PopupArt(): React.ReactNode {
  return (
    <div className="relative mb-2 h-20 w-40">
      <div className="flex h-5 items-center rounded-md border bg-background px-2">
        <div className="h-2 w-12 rounded-full bg-muted-foreground/30" />
        <div className="ms-0.5 h-3 w-px animate-pulse bg-foreground" />
      </div>
      <div className="absolute start-1 top-6 w-28 space-y-1 rounded-md border bg-background p-1.5 shadow-md">
        <div className="h-2.5 rounded-sm bg-primary/70" />
        <div className="h-2.5 rounded-sm bg-muted" />
        <div className="h-2.5 rounded-sm bg-muted" />
      </div>
    </div>
  )
}

/** Ekranın altındaki panelin çizimi: yan yana kartlar. */
function SheetArt(): React.ReactNode {
  return (
    <div className="flex w-full gap-1.5 rounded-t-lg border-x border-t bg-background p-2 pb-3 shadow-[0_-4px_12px_-6px_rgb(0_0_0/0.25)]">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={
            i === 0
              ? 'h-12 flex-1 rounded-md border-2 border-primary bg-card'
              : 'h-12 flex-1 rounded-md border bg-card'
          }
        />
      ))}
    </div>
  )
}
