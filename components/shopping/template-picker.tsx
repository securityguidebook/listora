'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { createClient } from '@/lib/supabase/client'
import { ShoppingItem, Template } from '@/lib/types'
import { Layout, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  onAdded: (items: ShoppingItem[]) => void
}

export function TemplatePicker({ onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    supabase
      .from('templates')
      .select('*, template_items(*)')
      .order('created_at', { ascending: false })
      .then(({ data }: { data: Template[] | null }) => {
        setTemplates(data ?? [])
        setLoading(false)
      })
  }, [open, supabase])

  async function applyTemplate(template: Template) {
    const items = template.template_items ?? []
    if (items.length === 0 || applying) return
    setApplying(template.id)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setApplying(null); return }

    const { data: newItems } = await supabase
      .from('shopping_items')
      .insert(
        items.map((item) => ({
          user_id: session.user.id,
          name: item.name,
          quantity: item.quantity ?? null,
          category: 'Other',
          checked: false,
        }))
      )
      .select()

    setApplying(null)
    setOpen(false)
    if (newItems?.length) onAdded(newItems as ShoppingItem[])
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="rounded-full p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
          aria-label="Add from template"
        >
          <Layout size={16} />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-bold text-gray-900">Add from template</Dialog.Title>
            <Dialog.Close className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition">
              <X size={18} />
            </Dialog.Close>
          </div>

          {loading ? (
            <div className="space-y-3 pb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="pb-8 pt-4 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm text-gray-500">No templates yet. Create one on the Templates tab.</p>
            </div>
          ) : (
            <ul className="space-y-2 pb-8 max-h-72 overflow-y-auto">
              {templates.map((t) => {
                const count = t.template_items?.length ?? 0
                const isApplying = applying === t.id
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => applyTemplate(t)}
                      disabled={count === 0 || !!applying}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl"
                        style={{ backgroundColor: t.color + '33' }}
                      >
                        {t.emoji}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 truncate">{t.name}</span>
                        <span className="block text-xs text-gray-400">
                          {count === 0 ? 'No items' : `${count} item${count !== 1 ? 's' : ''}`}
                        </span>
                      </span>
                      {isApplying && (
                        <span className="text-xs text-violet-500 font-medium">Adding…</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
