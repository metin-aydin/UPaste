// Geçmiş penceresinin iki biçiminde (küçük pencere ve alt panel) ortak kullanılan parçalar.
import { ClipboardIcon, PinIcon, SearchIcon, SearchXIcon, XIcon } from 'lucide-react'
import type { Range } from '@shared/search'
import type { PopupFilter } from '@shared/types'
import type { useUi } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FILTERS } from './filters'

type T = ReturnType<typeof useUi>['t']

export function Highlighted({ text, ranges }: { text: string; ranges?: Range[] }): React.ReactNode {
  if (!ranges?.length) return text
  const parts: React.ReactNode[] = []
  let at = 0
  ranges.forEach(([start, end], i) => {
    if (start > at) parts.push(text.slice(at, start))
    parts.push(
      <mark key={i} className="rounded-[3px] bg-highlight px-px text-foreground">
        {text.slice(start, end)}
      </mark>
    )
    at = end
  })
  if (at < text.length) parts.push(text.slice(at))
  return parts
}

export function IconButton({
  label,
  onClick,
  children,
  className
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  className?: string
}): React.ReactNode {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground [&_svg]:size-3.5',
        className
      )}
    >
      {children}
    </button>
  )
}

export function EmptyState({
  query,
  filter,
  t
}: {
  query: string
  filter: PopupFilter
  t: T
}): React.ReactNode {
  const [Icon, title, body] = query
    ? [SearchXIcon, t('popup.noResults', { query }), '']
    : filter === 'pinned'
      ? [PinIcon, t('popup.noPinned'), '']
      : [ClipboardIcon, t('popup.emptyTitle'), t('popup.emptyBody')]
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="text-xs text-muted-foreground">{body}</p>}
    </div>
  )
}

export function FilterChips({
  filter,
  onChange,
  t
}: {
  filter: PopupFilter
  onChange: (f: PopupFilter) => void
  t: T
}): React.ReactNode {
  const label: Record<PopupFilter, string> = {
    all: t('popup.filterAll'),
    text: t('popup.filterText'),
    image: t('popup.filterImages'),
    pinned: t('popup.filterPinned')
  }
  return (
    <div className="flex gap-1" role="tablist">
      {FILTERS.map((f) => (
        <button
          key={f}
          role="tab"
          aria-selected={filter === f}
          data-testid={`filter-${f}`}
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(f)}
          className={cn(
            'h-6 rounded-full px-2.5 text-xs font-medium transition-colors',
            filter === f
              ? 'bg-primary font-semibold text-white shadow-xs'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {label[f]}
        </button>
      ))}
    </div>
  )
}

/**
 * Arama kutusu. Pencere klavye odağında değilken (hedef uygulamanın imleci korunurken) yazılanlar eklentiden gelir:
 * odaksız pencerede kutu yalnız metni ve yanıp sönen imleci gösterir; kutuya tıklamak aramayı başlatır.
 */
export function SearchBox({
  inputRef,
  query,
  onQuery,
  focused,
  overlay,
  typing,
  onRequestFocus,
  t,
  className
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  query: string
  onQuery: (q: string) => void
  focused: boolean
  overlay: boolean
  typing: boolean
  onRequestFocus: () => void
  t: T
  className?: string
}): React.ReactNode {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
      {overlay ? (
        <div
          data-testid="search"
          onMouseDown={(e) => {
            e.preventDefault()
            if (!typing) onRequestFocus()
          }}
          className="flex h-full min-w-0 flex-1 cursor-text items-center overflow-hidden text-sm whitespace-pre"
        >
          {query ? (
            <span className="truncate">{query}</span>
          ) : (
            !typing && <span className="truncate text-muted-foreground">{t('popup.search')}</span>
          )}
          {typing && <span className="ms-px h-4 w-px shrink-0 animate-caret bg-foreground" />}
          {typing && !query && (
            <span className="truncate text-muted-foreground">{t('popup.search')}</span>
          )}
        </div>
      ) : (
        <input
          ref={inputRef}
          data-testid="search"
          value={query}
          readOnly={!focused}
          onMouseDown={() => {
            if (!focused) onRequestFocus()
          }}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t('popup.search')}
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      )}
      {query && !overlay && (
        <IconButton label={t('history.cancel')} onClick={() => onQuery('')}>
          <XIcon />
        </IconButton>
      )}
    </div>
  )
}
