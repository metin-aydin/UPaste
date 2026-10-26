import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Settings2Icon, XIcon } from 'lucide-react'
import type { PopupFilter, PopupItem, PopupMode } from '@shared/types'
import { api } from '@/lib/api'
import { useUi } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Kbd } from '@/components/ui/kbd'
import { CardList } from './CardList'
import { SheetList } from './SheetList'
import { FILTERS } from './filters'
import { EmptyState, FilterChips, IconButton, SearchBox } from './parts'

const SEARCH_DEBOUNCE_MS = 60

/** Klavye odağındayken (arama kutusu yazılabilirken) DOM tuşlarının eklentiden gelen tuş adlarına karşılığı. */
function domKey(e: React.KeyboardEvent): string | null {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') return 'ctrl+p'
  switch (e.key) {
    case 'ArrowDown':
      return 'down'
    case 'ArrowUp':
      return 'up'
    case 'PageDown':
      return 'pagedown'
    case 'PageUp':
      return 'pageup'
    case 'Enter':
      return e.shiftKey ? 'shift+enter' : 'enter'
    case 'Escape':
      return 'escape'
    case 'Tab':
      return e.shiftKey ? 'shift+tab' : 'tab'
    case 'Delete':
      return e.shiftKey ? 'shift+delete' : 'delete'
    default:
      return null
  }
}

export function PopupApp(): React.ReactNode {
  const { t, locale } = useUi()
  const [items, setItems] = useState<PopupItem[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PopupFilter>('all')
  const [selected, setSelected] = useState(0)
  const [mode, setMode] = useState<PopupMode>('popup')
  const [above, setAbove] = useState(false)
  const [focused, setFocused] = useState(false)
  const [overlay, setOverlay] = useState(false)
  const [typing, setTyping] = useState(false)
  const [scrollKey, setScrollKey] = useState(0)
  const [openCount, setOpenCount] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const state = useRef({ query, filter, items, selected, mode })
  useLayoutEffect(() => {
    state.current = { query, filter, items, selected, mode }
  })

  const refresh = useCallback(async (keepId?: string) => {
    const { query: q, filter: f } = state.current
    const next = await api.list(q, f)
    setItems(next)
    setSelected((s) => {
      if (keepId) {
        const i = next.findIndex((it) => it.id === keepId)
        if (i >= 0) return i
      }
      return Math.min(s, Math.max(next.length - 1, 0))
    })
  }, [])

  useEffect(
    () =>
      api.onPopupShown((p) => {
        setItems(p.items)
        setQuery('')
        setFilter(p.filter)
        setSelected(0)
        setMode(p.mode)
        setAbove(p.above)
        setFocused(p.focused)
        setOverlay(p.overlay)
        setTyping(false)
        setScrollKey(0)
        setNow(Date.now())
        setOpenCount((c) => c + 1)
        if (p.focused) requestAnimationFrame(() => inputRef.current?.focus())
      }),
    []
  )

  // Her açılışta yalnız giriş animasyonu baştan oynatılır; kartlar (ve çözülmüş resimleri) yerinde kalır.
  useLayoutEffect(() => {
    for (const animation of panelRef.current?.getAnimations() ?? []) {
      animation.cancel()
      animation.play()
    }
  }, [openCount])

  useEffect(
    () =>
      api.onPopupFocus(() => {
        setFocused(true)
        inputRef.current?.focus()
      }),
    []
  )

  useEffect(() => api.onPopupQuery((text) => setQuery(text)), [])
  useEffect(() => api.onPopupTyping((v) => setTyping(v)), [])

  useEffect(
    () =>
      api.onHistoryChanged(() => {
        const { items: list, selected: index } = state.current
        void refresh(list[index]?.id)
      }),
    [refresh]
  )

  useEffect(() => {
    if (openCount === 0) return
    const timer = setTimeout(() => {
      setSelected(0)
      void refresh()
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, filter, refresh, openCount])

  const paste = useCallback((index: number, plain = false) => {
    const item = state.current.items[index]
    if (item) void api.paste(item.id, plain)
  }, [])

  const togglePin = useCallback(
    async (item: PopupItem) => {
      await api.pin(item.id, !item.pinned)
      await refresh(item.id)
    },
    [refresh]
  )

  const remove = useCallback(
    async (item: PopupItem) => {
      await api.remove(item.id)
      await refresh()
    },
    [refresh]
  )

  /** Tuş adını işler; işlendiyse true. Hem eklentiden gelen tuşlar hem odaktaki DOM tuşları buradan geçer. */
  const handleKey = useCallback(
    (key: string): boolean => {
      const { items: list, selected: index, query: q, filter: f, mode: m } = state.current
      const move = (to: number): boolean => {
        if (list.length) {
          setSelected(Math.max(0, Math.min(list.length - 1, to)))
          setScrollKey((k) => k + 1)
        }
        return true
      }
      const horizontal = m === 'sheet'
      switch (key) {
        case 'down':
          return move(index + 1)
        case 'up':
          return move(index - 1)
        case 'right':
          return horizontal ? move(index + 1) : false
        case 'left':
          return horizontal ? move(index - 1) : false
        case 'pagedown':
          return move(index + (horizontal ? 4 : 5))
        case 'pageup':
          return move(index - (horizontal ? 4 : 5))
        case 'home':
          return move(0)
        case 'end':
          return move(list.length - 1)
        case 'enter':
          paste(index)
          return true
        case 'shift+enter':
          paste(index, true)
          return true
        case 'escape':
          if (q) setQuery('')
          else api.closePopup()
          return true
        case 'tab':
        case 'shift+tab': {
          const i = FILTERS.indexOf(f)
          setFilter(FILTERS[(i + (key === 'tab' ? 1 : FILTERS.length - 1)) % FILTERS.length])
          return true
        }
        case 'backspace':
          setQuery((s) => s.slice(0, -1))
          return true
        case 'delete':
          if (q) return false
          if (list[index]) void remove(list[index])
          return true
        case 'shift+delete':
          if (list[index]) void remove(list[index])
          return true
        case 'ctrl+p':
          if (list[index]) void togglePin(list[index])
          return true
        default:
          return false
      }
    },
    [paste, remove, togglePin]
  )

  useEffect(() => api.onPopupKey((key) => void handleKey(key)), [handleKey])

  const onKeyDown = (e: React.KeyboardEvent): void => {
    const key = domKey(e)
    if (key && handleKey(key)) e.preventDefault()
  }

  const listProps = {
    items,
    selected,
    onSelect: setSelected,
    onPaste: paste,
    onPin: (item: PopupItem) => void togglePin(item),
    onRemove: (item: PopupItem) => void remove(item),
    locale,
    now,
    t,
    resetKey: openCount,
    scrollKey
  }
  const empty = items.length === 0
  const search = (
    <SearchBox
      inputRef={inputRef}
      query={query}
      onQuery={setQuery}
      focused={focused}
      overlay={overlay}
      typing={typing}
      onRequestFocus={() => api.requestFocus()}
      t={t}
      className="h-full flex-1"
    />
  )

  if (mode === 'sheet') {
    return (
      <div className="h-full pt-6" onKeyDown={onKeyDown}>
        <div
          ref={panelRef}
          className="flex h-full animate-sheet-in flex-col overflow-hidden rounded-t-2xl border-x border-t bg-popover text-popover-foreground shadow-[0_-10px_30px_-12px_rgb(0_0_0/0.35)] dark:border-white/12"
        >
          <div className="flex h-14 shrink-0 items-center gap-4 px-5">
            <div className="flex h-9 w-80 items-center rounded-full border bg-muted/60 ps-3 pe-1.5">
              {search}
            </div>
            <FilterChips filter={filter} onChange={setFilter} t={t} />
            <div className="ms-auto flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Kbd>←</Kbd>
                <Kbd>→</Kbd>
                {t('popup.navigate')}
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd>
                {t('popup.paste')}
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Esc</Kbd>
                {t('popup.close')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <IconButton label={t('popup.settings')} onClick={() => api.openSettings()}>
                <Settings2Icon />
              </IconButton>
              <IconButton label={t('popup.close')} onClick={() => api.closePopup()}>
                <XIcon />
              </IconButton>
            </div>
          </div>
          {empty ? (
            <div className="min-h-0 flex-1 pb-6">
              <EmptyState query={query} filter={filter} t={t} />
            </div>
          ) : (
            <SheetList {...listProps} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-7" onKeyDown={onKeyDown}>
      <div
        ref={panelRef}
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground',
          'shadow-[0_10px_24px_-8px_rgb(0_0_0/0.35),0_2px_8px_-2px_rgb(0_0_0/0.12)] dark:border-white/12',
          above ? 'animate-popup-in-up' : 'animate-popup-in'
        )}
      >
        <div className="flex h-12 shrink-0 items-center gap-2 border-b ps-3.5 pe-2">
          {search}
          <IconButton label={t('popup.settings')} onClick={() => api.openSettings()}>
            <Settings2Icon />
          </IconButton>
        </div>
        <div className="shrink-0 border-b px-2.5 py-2">
          <FilterChips filter={filter} onChange={setFilter} t={t} />
        </div>
        {empty ? (
          <div className="min-h-0 flex-1">
            <EmptyState query={query} filter={filter} t={t} />
          </div>
        ) : (
          <CardList {...listProps} />
        )}
        <div className="flex h-8 shrink-0 items-center gap-3 border-t px-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            {t('popup.navigate')}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd>
            {t('popup.paste')}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Ctrl P</Kbd>
            {t('popup.pin')}
          </span>
          <span className="ms-auto flex items-center gap-1">
            <Kbd>Esc</Kbd>
            {t('popup.close')}
          </span>
        </div>
      </div>
    </div>
  )
}
