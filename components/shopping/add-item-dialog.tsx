'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/types'
import { Plus } from 'lucide-react'
import { useState } from 'react'

interface AddItemDialogProps {
  onAdded: () => void
}

export function AddItemDialog({ onAdded }: AddItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [category, setCategory] = useState('Other')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('shopping_items').insert({
      user_id: session.user.id,
      name: name.trim(),
      quantity: quantity.trim() || null,
      category,
      price: price ? parseFloat(price) : null,
      notes: notes.trim() || null,
    })

    setName('')
    setQuantity('')
    setCategory('Other')
    setPrice('')
    setNotes('')
    setLoading(false)
    setOpen(false)
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 hover:bg-violet-700 active:scale-95 transition-all">
          <Plus size={24} />
        </button>
      </DialogTrigger>
      <DialogContent title="Add to Shopping List">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Item name"
            placeholder="e.g. Oat milk"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              placeholder="e.g. 2 x 1L"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              label="Price (optional)"
              placeholder="0.00"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <Select
            label="Category"
            value={category}
            onValueChange={setCategory}
            options={CATEGORIES.map((c) => ({ label: c, value: c }))}
          />
          <Input
            label="Notes (optional)"
            placeholder="Brand preference, store, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button type="submit" disabled={loading || !name.trim()} size="lg" className="w-full mt-1">
            {loading ? 'Adding…' : 'Add item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
