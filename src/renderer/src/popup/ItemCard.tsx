// Geçmiş öğesinin kartı: üstte tür, zaman ve işlemler; ortada metin ya da resim; altta uzunluk ya da boyut. Küçük
// pencerede kartlar alt alta, alt panelde yan yana dizilir.
import { useLayoutEffect, useRef } from 'react'
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
  const textRef = useRef<HTMLParagraphElement>(null)
  // Sığmayan metnin sonu alta doğru saydamlaşarak kesilir; sığan metin olduğu gibi görünür.
  useLayoutEffect(() => {
    const el = textRef.current
    if (el) el.dataset.overflow = String(el.scrollHeight > el.clientHeight + 1)
  }, [item.preview, variant])
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
      {/* Yazılar büyük harf yüksekliğine kırpılır (`text-box`): simgeyle aynı eksende ortalanırlar. */}
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b bg-muted/60 px-3 text-[11px] text-muted-foreground [&>span]:[text-box:trim-both_cap_alphabetic]">
        {item.kind === 'image' ? (
          <ImageIcon className="size-3.5 shrink-0" />
        ) : (
          <TextIcon className="size-3.5 shrink-0" />
        )}
        {/* Küçük pencerede tür yalnız simgeyle gösterilir. */}
        <span className={sheet ? 'font-medium' : 'sr-only'}>
          {item.kind === 'image' ? t('popup.image') : t('popup.filterText')}
        </span>
        {item.pinned && (
          <PinIcon className="size-3 shrink-0 text-brand" aria-label={t('popup.pinned')} />
        )}
        <span className="ms-auto">{relativeTime(item.createdAt, locale, now)}</span>
        {/* İşlemler seçili ya da üzerine gelinen kartta yer kaplar; diğer kartlarda zaman sağ kenara yaslanır. */}
        <div className={cn('-me-1.5 gap-0.5', selected ? 'flex' : 'hidden group-hover:flex')}>
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
            decoding="async"
            className={cn(
              'rounded-md bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-size-[12px_12px] object-contain',
              sheet ? 'size-full' : 'max-h-32 max-w-full'
            )}
          />
        ) : (
          <p
            ref={textRef}
            dir="auto"
            className={cn(
              'overflow-hidden text-[12.5px] leading-[18px] break-words whitespace-pre-wrap',
              'data-[overflow=true]:[mask-image:linear-gradient(to_bottom,black_calc(100%-32px),transparent)]',
              sheet ? 'h-full' : 'max-h-[90px]'
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
