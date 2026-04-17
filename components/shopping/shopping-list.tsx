'use client'

import { AddItemDialog } from '@/components/shopping/add-item-dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { ShoppingItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Check, RotateCcw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

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

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('shopping_items')
      .select('*')
      .order('checked', { ascending: true })
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function toggleCheck(item: ShoppingItem) {
    const newChecked = !item.checked
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: newChecked } : i))
    )

    await supabase
      .from('shopping_items')
      .update({ checked: newChecked })
      .eq('id', item.id)

    // Write to purchase history when checking off
    if (newChecked) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('purchase_history').insert({
          user_id: user.id,
          item_name: item.name,
          category: item.category,
          quantity: item.quantity,
          source: 'shopping',
        })
      }
    }
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('shopping_items').delete().eq('id', id)
  }

  async function clearChecked() {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id)
    setItems((prev) => prev.filter((i) => !i.checked))
    await supabase.from('shopping_items').delete().in('id', checkedIds)
  }

  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)

  if (loading) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 px-4 pb-32 pt-2">
      {unchecked.length === 0 && checked.length === 0 && (
        <div className="mt-20 flex flex-col items-center gap-3 text-center">
          <div className="text-5xl">🛒</div>
          <p className="text-lg font-semibold text-gray-800">Your list is empty</p>
          <p className="text-sm text-gray-500">Tap + to add your first item</p>
        </div>
      )}

      {unchecked.map((item) => (
        <ItemRow key={item.id} item={item} onToggle={toggleCheck} onDelete={deleteItem} />
      ))}

      {checked.length > 0 && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Checked off ({checked.length})
            </p>
            <Button variant="ghost" size="sm" onClick={clearChecked}>
              <RotateCcw size={14} />
              Clear
            </Button>
          </div>
          {checked.map((item) => (
            <ItemRow key={item.id} item={item} onToggle={toggleCheck} onDelete={deleteItem} />
          ))}
        </>
      )}

      <AddItemDialog onAdded={fetchItems} />
    </div>
  )
}

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 transition-opacity',
        item.checked && 'opacity-50'
      )}
    >
      <button
        onClick={() => onToggle(item)}
        className={cn(
          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all',
          item.checked
            ? 'border-violet-600 bg-violet-600 text-white'
            : 'border-gray-300 hover:border-violet-400'
        )}
      >
        {item.checked && <Check size={13} strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-gray-900 truncate', item.checked && 'line-through')}>
          {item.name}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {item.quantity && (
            <span className="text-xs text-gray-500">{item.quantity}</span>
          )}
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other)}>
            {item.category}
          </span>
        </div>
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400 transition"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
