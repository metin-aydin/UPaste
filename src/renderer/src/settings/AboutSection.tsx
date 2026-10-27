import { BugIcon, CodeXmlIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { useUi } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import logo from '@/assets/logo.png'
import { Section } from './parts'

const REPO = 'https://github.com/metin-aydin/UPaste'

export function AboutSection(): React.ReactNode {
  const { t, version } = useUi()
  return (
    <Section title={t('nav.about')}>
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-10 text-center shadow-xs">
        <img src={logo} alt="" className="size-24 drop-shadow-lg" draggable={false} />
        <div className="space-y-1">
          <div className="text-2xl font-semibold tracking-tight">UPaste</div>
          <div className="text-sm text-muted-foreground" dir="ltr">
            {version}
          </div>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">{t('about.tagline')}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void api.openExternal(REPO)}>
            <CodeXmlIcon />
            {t('about.source')}
          </Button>
          <Button variant="outline" onClick={() => void api.openExternal(`${REPO}/issues`)}>
            <BugIcon />
            {t('about.issues')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('about.license')}</p>
      </div>
    </Section>
  )
}
