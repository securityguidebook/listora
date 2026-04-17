'use client'

import { AddWishlistDialog } from '@/components/wishlist/add-wishlist-dialog'
import { createClient } from '@/lib/supabase/client'
import { WishlistItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ExternalLink, ShoppingBag, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

export function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('wishlist_items')
      .select('*')
      .order('purchased', { ascending: true })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function markPurchased(item: WishlistItem) {
    const newPurchased = !item.purchased
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, purchased: newPurchased } : i))
    )
    await supabase
      .from('wishlist_items')
      .update({ purchased: newPurchased })
      .eq('id', item.id)

    if (newPurchased) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('purchase_history').insert({
          user_id: user.id,
          item_name: item.name,
          category: 'Wishlist',
          price: item.price,
          source: 'wishlist',
        })
      }
    }
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('wishlist_items').delete().eq('id', id)
  }

  const active = items.filter((i) => !i.purchased)
  const purchased = items.filter((i) => i.purchased)

  if (loading) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 px-4 pb-32 pt-2">
      {active.length === 0 && purchased.length === 0 && (
        <div className="mt-20 flex flex-col items-center gap-3 text-center">
          <div className="text-5xl">💭</div>
          <p className="text-lg font-semibold text-gray-800">Wishlist is empty</p>
          <p className="text-sm text-gray-500">Track things you want to buy someday</p>
        </div>
      )}

      {active.map((item) => (
        <WishCard key={item.id} item={item} onMarkPurchased={markPurchased} onDelete={deleteItem} />
      ))}

      {purchased.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Purchased ({purchased.length})
          </p>
          {purchased.map((item) => (
            <WishCard key={item.id} item={item} onMarkPurchased={markPurchased} onDelete={deleteItem} />
          ))}
        </>
      )}

      <AddWishlistDialog onAdded={fetchItems} />
    </div>
  )
}

function WishCard({
  item,
  onMarkPurchased,
  onDelete,
}: {
  item: WishlistItem
  onMarkPurchased: (item: WishlistItem) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white p-4 shadow-sm border border-gray-100',
        item.purchased && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('text-sm font-semibold text-gray-900', item.purchased && 'line-through')}>
              {item.name}
            </p>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', PRIORITY_STYLES[item.priority])}>
              {item.priority}
            </span>
          </div>
          {item.price && (
            <p className="mt-0.5 text-sm font-medium text-violet-600">
              ${item.price.toFixed(2)}
            </p>
          )}
          {item.notes && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{item.notes}</p>}
        </div>
        <div className="flex flex-col gap-1">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400 transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {!item.purchased && (
        <button
          onClick={() => onMarkPurchased(item)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100 transition"
        >
          <ShoppingBag size={13} />
          Mark as purchased
        </button>
      )}
    </div>
  )
}
