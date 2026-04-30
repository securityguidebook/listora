'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

const VARIANTS = [
  { id: 'blue',  label: 'Blue',  src: '/icons/icon-blue-192.png' },
  { id: 'peach', label: 'Peach', src: '/icons/icon-peach-192.png' },
] as const

type Variant = 'blue' | 'peach'

export function LogoPicker({ current }: { current: Variant }) {
  const [selected, setSelected] = useState<Variant>(current)
  const [saving, setSaving] = useState(false)

  // Keep localStorage in sync with the DB-fetched value on every settings visit
  useEffect(() => {
    localStorage.setItem('carter_logo_variant', current)
  }, [current])

  async function pick(variant: Variant) {
    if (variant === selected || saving) return
    setSaving(true)
    setSelected(variant)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_preferences').upsert(
        { user_id: user.id, logo_variant: variant },
        { onConflict: 'user_id' }
      )
      localStorage.setItem('carter_logo_variant', variant)
    }
    setSaving(false)
  }

  return (
    <div className="flex gap-4">
      {VARIANTS.map(({ id, label, src }) => {
        const active = selected === id
        return (
          <button
            key={id}
            onClick={() => pick(id)}
            disabled={saving}
            className={[
              'relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all',
              active
                ? 'border-violet-500 bg-violet-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300',
            ].join(' ')}
          >
            {active && (
              <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
                <Check size={12} strokeWidth={3} className="text-white" />
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${label} Carter logo`} className="h-20 w-20 rounded-xl" />
            <span className={['text-sm font-medium', active ? 'text-violet-700' : 'text-gray-600'].join(' ')}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
