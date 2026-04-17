'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'
import { useState } from 'react'

interface Props {
  onAdded: () => void
}

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

export function AddWishlistDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [priority, setPriority] = useState('medium')
  const [url, setUrl] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('wishlist_items').insert({
      user_id: user.id,
      name: name.trim(),
      priority,
      url: url.trim() || null,
      price: price ? parseFloat(price) : null,
      notes: notes.trim() || null,
    })

    setName('')
    setPriority('medium')
    setUrl('')
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
      <DialogContent title="Add to Wishlist">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Item name"
            placeholder="e.g. Sony WH-1000XM5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority"
              value={priority}
              onValueChange={setPriority}
              options={PRIORITY_OPTIONS}
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
          <Input
            label="Link (optional)"
            placeholder="https://..."
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Input
            label="Notes (optional)"
            placeholder="Why you want it, alternatives, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button type="submit" disabled={loading || !name.trim()} size="lg" className="w-full mt-1">
            {loading ? 'Adding…' : 'Add to wishlist'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
