import { useEffect, useState } from 'react'
import {
  DownloadIcon,
  HistoryIcon,
  InfoIcon,
  KeyboardIcon,
  SlidersHorizontalIcon
} from 'lucide-react'
import type { SettingsSection } from '@shared/ipc'
import type { UpdateState } from '@shared/update'
import { api } from '@/lib/api'
import { useUi } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import logo from '@/assets/logo.png'
import { GeneralSection } from './GeneralSection'
import { HistorySection } from './HistorySection'
import { SetupSection } from './SetupSection'
import { UpdatesSection } from './UpdatesSection'
import { AboutSection } from './AboutSection'

const SECTIONS: SettingsSection[] = ['general', 'history', 'setup', 'updates', 'about']

const initialSection = (): SettingsSection => {
  const hash = location.hash.replace('#', '') as SettingsSection
  return SECTIONS.includes(hash) ? hash : 'general'
}

export function SettingsApp(): React.ReactNode {
  const { t } = useUi()
  const [section, setSection] = useState<SettingsSection>(initialSection)
  const [update, setUpdate] = useState<UpdateState | null>(null)

  useEffect(() => api.onNavigate(setSection), [])
  useEffect(() => {
    void api.update().then(setUpdate)
    return api.onUpdate(setUpdate)
  }, [])

  const nav: { id: SettingsSection; label: string; icon: React.ReactNode; dot?: boolean }[] = [
    { id: 'general', label: t('nav.general'), icon: <SlidersHorizontalIcon /> },
    { id: 'history', label: t('nav.history'), icon: <HistoryIcon /> },
    { id: 'setup', label: t('nav.setup'), icon: <KeyboardIcon /> },
    {
      id: 'updates',
      label: t('nav.updates'),
      icon: <DownloadIcon />,
      dot: update?.status === 'available' || update?.status === 'downloaded'
    },
    { id: 'about', label: t('nav.about'), icon: <InfoIcon /> }
  ]

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-e bg-sidebar px-3 py-5">
        <div className="mb-6 flex items-center gap-3 px-2">
          <img src={logo} alt="" className="size-9" draggable={false} />
          <div className="leading-tight">
            <div className="font-semibold">UPaste</div>
            <div className="text-xs text-muted-foreground">{t('about.tagline')}</div>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              data-testid={`nav-${n.id}`}
              aria-current={section === n.id ? 'page' : undefined}
              onClick={() => setSection(n.id)}
              className={cn(
                'flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors [&_svg]:size-4',
                section === n.id
                  ? 'bg-sidebar-accent text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
              )}
            >
              {n.icon}
              <span className="flex-1 text-start">{n.label}</span>
              {n.dot && <span className="size-2 rounded-full bg-primary" />}
            </button>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-10 py-9">
          {section === 'general' && <GeneralSection />}
          {section === 'history' && <HistorySection />}
          {section === 'setup' && <SetupSection />}
          {section === 'updates' && <UpdatesSection />}
          {section === 'about' && <AboutSection />}
        </div>
      </main>
    </div>
  )
}
