// Geçmiş öğesinin kartı: üstte tür, zaman ve işlemler; ortada metin ya da resim; altta uzunluk ya da boyut. Küçük
// pencerede kartlar alt alta, alt panelde yan yana dizilir.
import { ImageIcon, PinIcon, PinOffIcon, TextIcon, Trash2Icon } from 'lucide-react'
import type { PopupItem } from '@shared/types'
import { formatBytes, formatNumber, relativeTime } from '@/lib/format'
import type { useUi } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Highlighted, IconButton } from './parts'

export interface ItemCardProps {
  item: PopupItem
  selected: boolean
  /** `list`: küçük pencere (içerik birkaç satır), `sheet`: alt panel (kart yüksekliğini doldurur). */
  variant: 'list' | 'sheet'
  onHover: () => void
  onPaste: () => void
  onPin: () => void
  onRemove: () => void
  locale: string
  now: number
  t: ReturnType<typeof useUi>['t']
}

export function ItemCard({
  item,
  selected,
  variant,
  onHover,
  onPaste,
  onPin,
  onRemove,
  locale,
  now,
  t
}: ItemCardProps): React.ReactNode {
  const sheet = variant === 'sheet'
  return (
    <div
      role="option"
      aria-selected={selected}
      data-testid="item"
      data-selected={selected || undefined}
      onMouseMove={() => !selected && onHover()}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPaste}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-all',
        sheet && 'h-full',
        selected
          ? cn('border-transparent ring-2 ring-primary', sheet && '-translate-y-0.5 shadow-md')
          : 'hover:border-primary/40'
      )}
    >
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b bg-muted/60 ps-3 pe-1.5 text-[11px] text-muted-foreground">
        {item.kind === 'image' ? (
          <ImageIcon className="size-3.5" />
        ) : (
          <TextIcon className="size-3.5" />
        )}
        <span className="font-medium">
          {item.kind === 'image' ? t('popup.image') : t('popup.filterText')}
        </span>
        {item.pinned && <PinIcon className="size-3 text-brand" aria-label={t('popup.pinned')} />}
        <span className="ms-auto">{relativeTime(item.createdAt, locale, now)}</span>
        <div
          className={cn(
            'flex gap-0.5 transition-opacity',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <IconButton
            label={item.pinned ? t('popup.unpin') : t('popup.pin')}
            onClick={onPin}
            className={item.pinned ? 'text-brand' : undefined}
          >
            {item.pinned ? <PinOffIcon /> : <PinIcon />}
          </IconButton>
          <IconButton
            label={t('popup.delete')}
            onClick={onRemove}
            className="hover:text-destructive"
          >
            <Trash2Icon />
          </IconButton>
        </div>
      </div>
      <div className={cn('relative overflow-hidden px-3 py-2.5', sheet && 'min-h-0 flex-1')}>
        {item.kind === 'image' && item.image ? (
          <img
            src={item.image.thumb}
            alt={t('popup.image')}
            draggable={false}
            className={cn(
              'rounded-md bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-size-[12px_12px] object-contain',
              sheet ? 'size-full' : 'max-h-32 max-w-full'
            )}
          />
        ) : (
          <p
            dir="auto"
            className={cn(
              'text-[12.5px] leading-[18px] break-words whitespace-pre-wrap',
              sheet
                ? 'h-full overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]'
                : 'line-clamp-4'
            )}
          >
            <Highlighted text={item.preview ?? ''} ranges={item.ranges} />
          </p>
        )}
      </div>
      <div
        dir="ltr"
        className="flex h-7 shrink-0 items-center border-t bg-muted/60 px-3 text-[11px] text-muted-foreground tabular-nums"
      >
        {item.kind === 'image' && item.image
          ? `${item.image.width}×${item.image.height} · ${formatBytes(item.image.bytes, locale)}`
          : `${formatNumber(item.length ?? 0, locale)} Aa`}
      </div>
    </div>
  )
}
