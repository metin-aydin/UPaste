// Ayarlar sayfalarının ortak yapı taşları: bölüm başlığı, kart ve "etiket + açıklama | denetim" satırı.
import { cn } from '@/lib/utils'

export function Section({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}): React.ReactNode {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  )
}

export function Card({
  className,
  children
}: {
  className?: string
  children: React.ReactNode
}): React.ReactNode {
  return (
    <div
      className={cn('divide-y rounded-xl border bg-card text-card-foreground shadow-xs', className)}
    >
      {children}
    </div>
  )
}

export function Row({
  title,
  hint,
  children,
  className,
  htmlFor
}: {
  title: React.ReactNode
  hint?: React.ReactNode
  children?: React.ReactNode
  className?: string
  htmlFor?: string
}): React.ReactNode {
  return (
    <div className={cn('flex items-center gap-6 px-5 py-4', className)}>
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={htmlFor} className="block text-sm font-medium leading-none">
          {title}
        </label>
        {hint && <div className="text-[13px] leading-5 text-muted-foreground">{hint}</div>}
      </div>
      {children !== undefined && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label
}: {
  value: T
  options: { value: T; label: string; icon?: React.ReactNode }[]
  onChange: (v: T) => void
  label: string
}): React.ReactNode {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-all [&_svg]:size-3.5',
            value === o.value
              ? 'bg-background text-foreground shadow-sm dark:bg-input/40'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function StatusDot({ tone }: { tone: 'ok' | 'warn' | 'error' | 'muted' }): React.ReactNode {
  const color = {
    ok: 'bg-success',
    warn: 'bg-warning',
    error: 'bg-destructive',
    muted: 'bg-muted-foreground/50'
  }[tone]
  return (
    <span className="relative flex size-2">
      {tone === 'warn' && (
        <span
          className={cn(
            'absolute inline-flex size-full animate-ping rounded-full opacity-60',
            color
          )}
        />
      )}
      <span className={cn('relative inline-flex size-2 rounded-full', color)} />
    </span>
  )
}

/** Görsel seçenek kartları (radyo düğmesi gibi): her seçeneğin küçük bir çizimi, başlığı ve açıklaması vardır. */
export function ChoiceCards<T extends string>({
  value,
  options,
  onChange,
  label
}: {
  value: T
  options: { value: T; title: string; hint: string; art: React.ReactNode }[]
  onChange: (v: T) => void
  label: string
}): React.ReactNode {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          data-testid={`choice-${o.value}`}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex flex-col gap-3 rounded-xl border p-3 text-start transition-all',
            value === o.value
              ? 'border-primary ring-2 ring-primary/40'
              : 'hover:border-foreground/20 hover:bg-accent/40'
          )}
        >
          <div className="flex h-24 items-end justify-center overflow-hidden rounded-lg bg-muted">
            {o.art}
          </div>
          <div className="space-y-1 px-0.5">
            <div className="text-sm font-medium">{o.title}</div>
            <div className="text-xs leading-5 text-muted-foreground">{o.hint}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
