// Alt panelin yatay kart şeridi.
import { useLayoutEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { ListProps } from './CardList'
import { ItemCard } from './ItemCard'

const CARD_WIDTH = 232
const CARD_GAP = 12

export function SheetList({
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
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
  const virtualizer = useVirtualizer({
    horizontal: true,
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_WIDTH + CARD_GAP,
    overscan: 4,
    getItemKey: (i) => items[i]?.id ?? i
  })
  const selectedRef = useRef(selected)
  useLayoutEffect(() => {
    selectedRef.current = selected
  })

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ left: 0 })
  }, [resetKey])

  useLayoutEffect(() => {
    if (scrollKey && items.length) virtualizer.scrollToIndex(selectedRef.current, { align: 'auto' })
  }, [scrollKey, items.length, virtualizer])

  return (
    <div
      ref={scrollRef}
      role="listbox"
      aria-orientation="horizontal"
      onWheel={(e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && scrollRef.current)
          scrollRef.current.scrollLeft += rtl ? -e.deltaY : e.deltaY
      }}
      className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-5 pt-1 pb-4"
    >
      <div style={{ width: virtualizer.getTotalSize(), height: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((col) => {
          const item = items[col.index]
          return (
            <div
              key={col.key}
              className="absolute inset-y-0 start-0 py-1"
              style={{
                width: CARD_WIDTH,
                transform: `translateX(${rtl ? -col.start : col.start}px)`
              }}
            >
              <ItemCard
                item={item}
                selected={col.index === selected}
                variant="sheet"
                onHover={() => onSelect(col.index)}
                onPaste={() => onPaste(col.index)}
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
