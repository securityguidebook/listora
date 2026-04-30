'use client'

import { readCache, writeCache } from '@/lib/data-cache'
import { createClient } from '@/lib/supabase/client'
import { PurchaseHistory, ReceiptGroup } from '@/lib/types'
import { cn, formatDate, formatRelative } from '@/lib/utils'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

const CACHE_KEY = 'purchase_history'

const CATEGORY_COLORS: Record<string, string> = {
  Produce: 'bg-green-100 text-green-700',
  Dairy: 'bg-blue-100 text-blue-700',
  'Meat & Seafood': 'bg-red-100 text-red-700',
  Bakery: 'bg-amber-100 text-amber-700',
  Pantry: 'bg-orange-100 text-orange-700',
  Frozen: 'bg-cyan-100 text-cyan-700',
  Snacks: 'bg-yellow-100 text-yellow-700',
  Beverages: 'bg-indigo-100 text-indigo-700',
  'Health & Beauty': 'bg-pink-100 text-pink-700',
  Household: 'bg-gray-100 text-gray-700',
  Electronics: 'bg-violet-100 text-violet-700',
  Clothing: 'bg-fuchsia-100 text-fuchsia-700',
  Other: 'bg-gray-100 text-gray-600',
}

function groupHistory(history: PurchaseHistory[]): ReceiptGroup[] {
  const map = new Map<string, { category: string; last_bought: string; entries: PurchaseHistory[] }>()

  for (const entry of history) {
    const existing = map.get(entry.item_name)
    if (existing) {
      existing.entries.push(entry)
      if (entry.purchased_at > existing.last_bought) {
        existing.last_bought = entry.purchased_at
        existing.category = entry.category
      }
    } else {
      map.set(entry.item_name, {
        category: entry.category,
        last_bought: entry.purchased_at,
        entries: [entry],
      })
    }
  }

  const groups: ReceiptGroup[] = []

  for (const [item_name, data] of map) {
    data.entries.sort((a, b) => b.purchased_at.localeCompare(a.purchased_at))
    const priced = data.entries.filter(e => e.price !== null)
    const best_price = priced.length > 0 ? Math.min(...priced.map(e => e.price!)) : null
    const avg_price = priced.length > 0
      ? priced.reduce((sum, e) => sum + e.price!, 0) / priced.length
      : null
    groups.push({ item_name, category: data.category, count: data.entries.length, best_price, avg_price, last_bought: data.last_bought, entries: data.entries })
  }

  return groups.sort((a, b) => b.last_bought.localeCompare(a.last_bought))
}

function groupByStore(history: PurchaseHistory[]): { store: string | null; groups: ReceiptGroup[] }[] {
  const order: (string | null)[] = []
  const map = new Map<string | null, PurchaseHistory[]>()

  for (const entry of history) {
    const store = entry.section ?? null
    if (!map.has(store)) { map.set(store, []); order.push(store) }
    map.get(store)!.push(entry)
  }

  // Named stores first (alphabetical), unsorted last
  order.sort((a, b) => {
    if (a === null) return 1
    if (b === null) return -1
    return a.localeCompare(b)
  })

  return order.map(store => ({ store, groups: groupHistory(map.get(store)!) }))
}

function getSuggestions(query: string, groups: ReceiptGroup[]) {
  const qWords = query.toLowerCase().trim().split(/\s+/).filter(Boolean)

  const nameSuggestions = groups
    .filter(group => {
      const nameWords = group.item_name.toLowerCase().split(/\s+/)
      return qWords.some(qw => nameWords.some(nw => nw.startsWith(qw) || qw.startsWith(nw)))
    })
    .slice(0, 6)

  const categorySuggestions = new Map<string, ReceiptGroup[]>()
  for (const group of groups) {
    const catLower = group.category.toLowerCase()
    if (qWords.some(qw => catLower.includes(qw))) {
      const existing = categorySuggestions.get(group.category) ?? []
      existing.push(group)
      categorySuggestions.set(group.category, existing)
    }
  }

  return { nameSuggestions, categorySuggestions }
}

type ViewMode = 'item' | 'store'

export function ReceiptsView() {
  const [history, setHistory] = useState<PurchaseHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('item')
  const supabase = createClient()

  useEffect(() => {
    const cached = readCache<PurchaseHistory>(CACHE_KEY)
    if (cached) { setHistory(cached); setLoading(false) }
  }, [])

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('purchase_history')
      .select('*')
      .order('purchased_at', { ascending: false })
      .limit(500)
    if (data) { setHistory(data); writeCache(CACHE_KEY, data) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const groups = useMemo(() => groupHistory(history), [history])
  const storeGroups = useMemo(() => groupByStore(history), [history])

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups
    const q = query.toLowerCase()
    return groups.filter(g => g.item_name.toLowerCase().includes(q))
  }, [groups, query])

  const filteredStoreGroups = useMemo(() => {
    if (!query.trim()) return storeGroups
    const q = query.toLowerCase()
    return storeGroups
      .map(sg => ({ ...sg, groups: sg.groups.filter(g => g.item_name.toLowerCase().includes(q)) }))
      .filter(sg => sg.groups.length > 0)
  }, [storeGroups, query])

  const suggestions = useMemo(() => {
    if (query.trim().length < 2 || filteredGroups.length > 0) return null
    return getSuggestions(query, groups)
  }, [query, groups, filteredGroups.length])

  const handleToggle = useCallback((itemName: string) => {
    setExpandedItem(prev => (prev === itemName ? null : itemName))
  }, [])

  const hasStoreData = history.some(e => e.section)

  if (loading) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="mt-20 flex flex-col items-center gap-3 text-center px-4">
        <div className="text-5xl">🧾</div>
        <p className="text-lg font-semibold text-gray-800">No receipts yet</p>
        <p className="text-sm text-gray-500">
          Check off items on your shopping list with prices to start building your price history.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-24">
      <div className="sticky top-0 z-10 bg-[#f8f8fc] px-4 pt-3 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {groups.length} {groups.length === 1 ? 'item' : 'items'} tracked
          </p>
          {hasStoreData && (
            <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
              <button
                onClick={() => setViewMode('item')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  viewMode === 'item' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                By Item
              </button>
              <button
                onClick={() => setViewMode('store')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  viewMode === 'store' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                By Store
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pt-1">
        {viewMode === 'item' ? (
          filteredGroups.length > 0 ? (
            filteredGroups.map(group => (
              <ItemCard
                key={group.item_name}
                group={group}
                expanded={expandedItem === group.item_name}
                onToggle={handleToggle}
              />
            ))
          ) : query.trim().length >= 2 ? (
            <NoResults query={query} suggestions={suggestions} expandedItem={expandedItem} onToggle={handleToggle} onSuggest={setQuery} />
          ) : null
        ) : (
          filteredStoreGroups.length > 0 ? (
            filteredStoreGroups.map(({ store, groups: storeItems }) => (
              <div key={store ?? '__unsorted__'} className="flex flex-col gap-2">
                <div className="mt-3 flex items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    {store ?? 'Unsorted'}
                  </p>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                {storeItems.map(group => (
                  <ItemCard
                    key={group.item_name}
                    group={group}
                    expanded={expandedItem === group.item_name}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            ))
          ) : query.trim().length >= 2 ? (
            <NoResults query={query} suggestions={suggestions} expandedItem={expandedItem} onToggle={handleToggle} onSuggest={setQuery} />
          ) : null
        )}
      </div>
    </div>
  )
}

// ─── NoResults ───────────────────────────────────────────────────────────────

function NoResults({ query, suggestions, expandedItem, onToggle, onSuggest }: {
  query: string
  suggestions: ReturnType<typeof getSuggestions> | null
  expandedItem: string | null
  onToggle: (name: string) => void
  onSuggest: (name: string) => void
}) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-sm text-gray-500">No items matching &ldquo;{query}&rdquo;</p>
      {suggestions && (suggestions.nameSuggestions.length > 0 || suggestions.categorySuggestions.size > 0) && (
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold text-gray-700">Did you mean...?</p>
          {suggestions.nameSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.nameSuggestions.map(g => (
                <button
                  key={g.item_name}
                  onClick={() => onSuggest(g.item_name)}
                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm text-violet-700 hover:bg-violet-100 transition-colors"
                >
                  {g.item_name}
                </button>
              ))}
            </div>
          )}
          {Array.from(suggestions.categorySuggestions.entries()).map(([category, catGroups]) => (
            <div key={category} className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Items in &ldquo;{category}&rdquo;
              </p>
              {catGroups.map(group => (
                <ItemCard
                  key={group.item_name}
                  group={group}
                  expanded={expandedItem === group.item_name}
                  onToggle={onToggle}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ItemCard ────────────────────────────────────────────────────────────────

interface ItemCardProps {
  group: ReceiptGroup
  expanded: boolean
  onToggle: (itemName: string) => void
}

function ItemCard({ group, expanded, onToggle }: ItemCardProps) {
  const catColor = CATEGORY_COLORS[group.category] ?? CATEGORY_COLORS.Other

  return (
    <div
      className={cn(
        'rounded-2xl bg-white border transition-shadow cursor-pointer select-none',
        expanded ? 'border-violet-200 shadow-sm' : 'border-gray-100 hover:shadow-sm'
      )}
      onClick={() => onToggle(group.item_name)}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{group.item_name}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', catColor)}>
              {group.category}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {group.count} {group.count === 1 ? 'purchase' : 'purchases'} · Last: {formatRelative(group.last_bought)}
          </p>
          {(group.best_price !== null || group.avg_price !== null) && (
            <p className="mt-0.5 text-xs">
              {group.best_price !== null && (
                <span className="font-medium text-emerald-600">Best ${group.best_price.toFixed(2)}</span>
              )}
              {group.best_price !== null && group.avg_price !== null && (
                <span className="text-gray-400"> · </span>
              )}
              {group.avg_price !== null && (
                <span className="text-gray-500">Avg ${group.avg_price.toFixed(2)}</span>
              )}
            </p>
          )}
        </div>
        <div className="shrink-0 pt-0.5 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <div className="flex flex-col gap-2.5">
            {group.entries.map(entry => {
              const isBest = entry.price !== null && entry.price === group.best_price
              return (
                <div key={entry.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatDate(entry.purchased_at)}</span>
                    {entry.section && (
                      <span className="text-xs text-gray-300">{entry.section}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {entry.quantity && (
                      <span className="text-xs text-gray-400">{entry.quantity}</span>
                    )}
                    <span className={cn('text-xs font-medium', isBest ? 'text-emerald-600' : 'text-gray-700')}>
                      {entry.price !== null ? `$${entry.price.toFixed(2)}` : '—'}
                    </span>
                    {isBest && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        best
                      </span>
                    )}
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      entry.source === 'wishlist'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {entry.source === 'wishlist' ? 'Wishlist' : 'Shop'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
