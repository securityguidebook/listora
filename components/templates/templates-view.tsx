'use client'

import { TemplateCard } from '@/components/templates/template-card'
import { TemplateDialog } from '@/components/templates/template-dialog'
import { Button } from '@/components/ui/button'
import { readCache, writeCache } from '@/lib/data-cache'
import { createClient } from '@/lib/supabase/client'
import { Template } from '@/lib/types'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const CACHE_KEY = 'templates'

export function TemplatesView() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const cached = readCache<Template>(CACHE_KEY)
    if (cached) { setTemplates(cached); setLoading(false) }
  }, [])

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('templates')
      .select('*, template_items(*)')
      .order('created_at', { ascending: false })
    if (data) { setTemplates(data); writeCache(CACHE_KEY, data) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  function handleCopied() {
    router.push('/shopping')
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 pt-4 sm:grid-cols-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-44 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 pb-32 pt-4">
      {templates.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="text-5xl">📋</div>
          <p className="text-lg font-semibold text-gray-800">No templates yet</p>
          <p className="text-sm text-gray-500 max-w-xs">
            Create reusable lists — like a weekly grocery run, camping gear, or a recipe — and add them to your shopping list in one tap.
          </p>
          <TemplateDialog
            trigger={
              <Button>
                <Plus size={16} />
                Create first template
              </Button>
            }
            onSaved={fetchTemplates}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onDeleted={fetchTemplates}
                onCopied={handleCopied}
                onEdit={(tmpl) => {
                  setEditingTemplate(tmpl)
                  // Small delay lets React update editingTemplate before dialog opens
                  setTimeout(() => setEditOpen(true), 0)
                }}
              />
            ))}
          </div>

          <TemplateDialog
            trigger={
              <button className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 hover:bg-violet-700 active:scale-95 transition-all">
                <Plus size={24} />
              </button>
            }
            onSaved={fetchTemplates}
          />

          {/* Edit dialog — controlled open state */}
          {editingTemplate && (
            <TemplateDialog
              key={editingTemplate.id}
              template={editingTemplate}
              trigger={<span className="hidden" />}
              open={editOpen}
              onOpenChange={(v) => { setEditOpen(v); if (!v) setEditingTemplate(null) }}
              onSaved={() => {
                setEditingTemplate(null)
                setEditOpen(false)
                fetchTemplates()
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
