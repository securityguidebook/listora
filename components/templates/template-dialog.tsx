'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Template, TemplateItem, TEMPLATE_COLORS, TEMPLATE_EMOJIS } from '@/lib/types'
import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  template?: Template
  trigger: React.ReactNode
  onSaved: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TemplateDialog({ template, trigger, onSaved, open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [color, setColor] = useState(template?.color ?? TEMPLATE_COLORS[0])
  const [emoji, setEmoji] = useState(template?.emoji ?? '📋')
  const [items, setItems] = useState<Omit<TemplateItem, 'id' | 'template_id'>[]>(
    template?.template_items?.map((i) => ({ name: i.name, quantity: i.quantity, order_index: i.order_index })) ?? []
  )
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (open && template) {
      setName(template.name)
      setDescription(template.description ?? '')
      setColor(template.color)
      setEmoji(template.emoji)
      setItems(
        template.template_items?.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          order_index: i.order_index,
        })) ?? []
      )
    }
  }, [open, template])

  function addItem() {
    if (!newItem.trim()) return
    setItems((prev) => [...prev, { name: newItem.trim(), quantity: null, order_index: prev.length }])
    setNewItem('')
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    if (template) {
      // Update
      await supabase.from('templates').update({ name, description: description || null, color, emoji }).eq('id', template.id)
      await supabase.from('template_items').delete().eq('template_id', template.id)
    } else {
      // Insert new
      const { data: newTemplate } = await supabase
        .from('templates')
        .insert({ user_id: session.user.id, name, description: description || null, color, emoji })
        .select()
        .single()

      if (newTemplate && items.length > 0) {
        await supabase.from('template_items').insert(
          items.map((item, idx) => ({ template_id: newTemplate.id, ...item, order_index: idx }))
        )
      }

      setName('')
      setDescription('')
      setColor(TEMPLATE_COLORS[0])
      setEmoji('📋')
      setItems([])
      setLoading(false)
      setOpen(false)
      onSaved()
      return
    }

    if (template && items.length > 0) {
      await supabase.from('template_items').insert(
        items.map((item, idx) => ({ template_id: template.id, ...item, order_index: idx }))
      )
    }

    setLoading(false)
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={template ? 'Edit template' : 'Create template'} description="Build a reusable list you can add to shopping in one tap">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Emoji picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Icon</label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-xl rounded-xl p-2 transition ${emoji === e ? 'bg-violet-100 ring-2 ring-violet-500' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <div className="flex gap-2">
              {TEMPLATE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Input
            label="Template name"
            placeholder="e.g. Weekly groceries"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Description (optional)"
            placeholder="What's this list for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Items */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Items</label>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className="flex-1 text-sm text-gray-800">{item.name}</span>
                <button type="button" onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-400 transition">
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
                placeholder="Add an item…"
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
              <button
                type="button"
                onClick={addItem}
                className="flex items-center justify-center rounded-xl bg-violet-100 px-3 text-violet-700 hover:bg-violet-200 transition"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-1">
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="flex-1">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading || !name.trim()} className="flex-1">
              {loading ? 'Saving…' : template ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
