'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Template } from '@/lib/types'
import { Edit2, ShoppingCart, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface Props {
  template: Template
  onDeleted: () => void
  onCopied: () => void
  onEdit: (template: Template) => void
}

export function TemplateCard({ template, onDeleted, onCopied, onEdit }: Props) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function copyToShoppingList() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const items = template.template_items ?? []
    if (items.length === 0) {
      setLoading(false)
      return
    }

    await supabase.from('shopping_items').insert(
      items.map((item) => ({
        user_id: user.id,
        name: item.name,
        quantity: item.quantity,
        category: 'Other',
      }))
    )

    setLoading(false)
    onCopied()
  }

  async function deleteTemplate() {
    await supabase.from('templates').delete().eq('id', template.id)
    onDeleted()
  }

  const itemCount = template.template_items?.length ?? 0

  return (
    <div
      className="rounded-2xl p-4 shadow-sm text-white relative overflow-hidden"
      style={{ backgroundColor: template.color }}
    >
      {/* Decorative circle */}
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20"
        style={{ backgroundColor: 'white' }}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-3xl">{template.emoji}</span>
            <h3 className="mt-2 text-base font-bold leading-tight">{template.name}</h3>
            {template.description && (
              <p className="mt-0.5 text-xs opacity-80 line-clamp-2">{template.description}</p>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(template)}
              className="rounded-lg p-1.5 hover:bg-white/20 transition"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={deleteTemplate}
              className="rounded-lg p-1.5 hover:bg-white/20 transition"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {itemCount > 0 && (
          <div className="mt-3 rounded-xl bg-white/20 px-3 py-2">
            <ul className="space-y-1">
              {template.template_items?.slice(0, 4).map((item) => (
                <li key={item.id} className="flex items-center gap-1.5 text-xs opacity-90">
                  <span className="h-1 w-1 rounded-full bg-white flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                  {item.quantity && <span className="opacity-70 flex-shrink-0">× {item.quantity}</span>}
                </li>
              ))}
              {itemCount > 4 && (
                <li className="text-xs opacity-70">+{itemCount - 4} more items</li>
              )}
            </ul>
          </div>
        )}

        <Button
          onClick={copyToShoppingList}
          disabled={loading || itemCount === 0}
          className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white border-0"
          size="sm"
        >
          <ShoppingCart size={13} />
          {loading ? 'Adding…' : `Add ${itemCount} items to shopping list`}
        </Button>
      </div>
    </div>
  )
}
