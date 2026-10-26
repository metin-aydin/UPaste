// Küçük pencerenin dikey kart listesi.
import { useLayoutEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { PopupItem } from '@shared/types'
import type { useUi } from '@/lib/i18n'
import { ItemCard } from './ItemCard'

export interface ListProps {
  items: PopupItem[]
  selected: number
  onSelect: (index: number) => void
  onPaste: (index: number) => void
  onPin: (item: PopupItem) => void
  onRemove: (item: PopupItem) => void
  locale: string
  now: number
  t: ReturnType<typeof useUi>['t']
  /** Pencere her açıldığında değişir: liste başa döner. */
  resetKey: number
  /** Seçim klavyeyle değişince artar: seçili kart görünür alana kaydırılır (fareyle seçimde kaydırılmaz). */
  scrollKey: number
}

export function CardList({
  items,
  selected,
  onSelect,
  onPaste,
  onPin,
  onRemove,
  locale,
  now,
  t,
  resetKey,
  scrollKey
}: ListProps): React.ReactNode {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 4,
    getItemKey: (i) => items[i]?.id ?? i
  })
  const selectedRef = useRef(selected)
  useLayoutEffect(() => {
    selectedRef.current = selected
  })

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [resetKey])

  useLayoutEffect(() => {
    if (scrollKey && items.length) virtualizer.scrollToIndex(selectedRef.current, { align: 'auto' })
  }, [scrollKey, items.length, virtualizer])

  return (
    <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto p-2" role="listbox">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const item = items[row.index]
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="absolute inset-x-0 pb-2"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              <ItemCard
                item={item}
                selected={row.index === selected}
                variant="list"
                onHover={() => onSelect(row.index)}
                onPaste={() => onPaste(row.index)}
                onPin={() => onPin(item)}
                onRemove={() => onRemove(item)}
                locale={locale}
                now={now}
                t={t}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
