'use client'

import { readCache, writeCache, patchCache, removeFromCache, removeMultipleFromCache, enqueueWrite } from '@/lib/data-cache'
import { createClient } from '@/lib/supabase/client'
import { parseShoppingText } from '@/lib/parse-shopping-text'
import { ShoppingItem, CATEGORIES } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ArrowUp, Check, Mic, MicOff, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const CACHE_KEY = 'shopping_items'

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

function buildItemText(item: ShoppingItem): string {
  const parts: string[] = []
  if (item.quantity) parts.push(item.quantity)
  parts.push(item.name)
  if (item.price != null) parts.push(`$${item.price.toFixed(2)}`)
  return parts.join(' ')
}

function groupBySection(items: ShoppingItem[]): { section: string | null; items: ShoppingItem[] }[] {
  const order: (string | null)[] = []
  const map = new Map<string | null, ShoppingItem[]>()
  for (const item of items) {
    const key = item.section ?? null
    if (!map.has(key)) { map.set(key, []); order.push(key) }
    map.get(key)!.push(item)
  }
  return order.map((key) => ({ section: key, items: map.get(key)! }))
}

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [categoryPickerId, setCategoryPickerId] = useState<string | null>(null)
  const supabase = createClient()

  // Serve cache immediately — zero-latency on revisits, works offline
  useEffect(() => {
    const cached = readCache<ShoppingItem>(CACHE_KEY)
    if (cached) { setItems(cached); setLoading(false) }
  }, [])

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('shopping_items')
      .select('*')
      .order('checked', { ascending: true })
      .order('created_at', { ascending: false })
    if (data) { setItems(data); writeCache(CACHE_KEY, data) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchItems() }, [fetchItems])

  // Re-sync after coming back online
  useEffect(() => {
    window.addEventListener('carter:synced', fetchItems)
    return () => window.removeEventListener('carter:synced', fetchItems)
  }, [fetchItems])

  async function toggleCheck(item: ShoppingItem) {
    const newChecked = !item.checked
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: newChecked } : i))
    patchCache<ShoppingItem>(CACHE_KEY, item.id, { checked: newChecked })
    const { data: { session } } = await supabase.auth.getSession()
    try {
      await supabase.from('shopping_items').update({ checked: newChecked }).eq('id', item.id)
      if (newChecked && session) {
        await supabase.from('purchase_history').insert({
          user_id: session.user.id,
          item_name: item.name,
          category: item.category,
          quantity: item.quantity,
          price: item.price,
          section: item.section,
          source: 'shopping',
        })
      }
    } catch {
      enqueueWrite({ table: 'shopping_items', op: 'update', payload: { checked: newChecked }, eqFilter: { column: 'id', value: item.id } })
      if (newChecked && session) {
        enqueueWrite({ table: 'purchase_history', op: 'insert', payload: { user_id: session.user.id, item_name: item.name, category: item.category, quantity: item.quantity, price: item.price, section: item.section, source: 'shopping' } })
      }
    }
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    removeFromCache(CACHE_KEY, id)
    try {
      await supabase.from('shopping_items').delete().eq('id', id)
    } catch {
      enqueueWrite({ table: 'shopping_items', op: 'delete', eqFilter: { column: 'id', value: id } })
    }
  }

  async function clearChecked() {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id)
    setItems((prev) => prev.filter((i) => !i.checked))
    removeMultipleFromCache(CACHE_KEY, checkedIds)
    try {
      await supabase.from('shopping_items').delete().in('id', checkedIds)
    } catch {
      checkedIds.forEach(id => enqueueWrite({ table: 'shopping_items', op: 'delete', eqFilter: { column: 'id', value: id } }))
    }
  }

  async function saveEdit(item: ShoppingItem) {
    const text = editText.trim()
    setEditingId(null)
    setEditText('')
    if (!text) {
      deleteItem(item.id)
      return
    }
    const [parsed] = parseShoppingText(text)
    if (!parsed) return
    const updates = { name: parsed.name, quantity: parsed.quantity, price: parsed.price }
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, ...updates } : i))
    patchCache<ShoppingItem>(CACHE_KEY, item.id, updates as Partial<ShoppingItem>)
    try {
      await supabase.from('shopping_items').update(updates).eq('id', item.id)
    } catch {
      enqueueWrite({ table: 'shopping_items', op: 'update', payload: updates as Record<string, unknown>, eqFilter: { column: 'id', value: item.id } })
    }
  }

  async function updateCategory(item: ShoppingItem, category: string) {
    setCategoryPickerId(null)
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, category } : i))
    patchCache<ShoppingItem>(CACHE_KEY, item.id, { category })
    try {
      await supabase.from('shopping_items').update({ category }).eq('id', item.id)
    } catch {
      enqueueWrite({ table: 'shopping_items', op: 'update', payload: { category }, eqFilter: { column: 'id', value: item.id } })
    }
  }

  function startEdit(item: ShoppingItem) {
    setEditingId(item.id)
    setEditText(buildItemText(item))
    setCategoryPickerId(null)
  }

  const { sections, hasChecked } = useMemo(() => ({
    sections: groupBySection(items),
    hasChecked: items.some((i) => i.checked),
  }), [items])

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
      <QuickAddBar onAdded={(newItems) => {
        setItems((prev) => {
          const updated = [...newItems, ...prev]
          writeCache(CACHE_KEY, updated)
          return updated
        })
      }} />

      {items.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <div className="text-5xl">🛒</div>
          <p className="text-lg font-semibold text-gray-800">Your list is empty</p>
          <p className="text-sm text-gray-500">Type above to add items</p>
        </div>
      )}

      {sections.map(({ section, items: sectionItems }) => (
        <div key={section ?? '__unsorted__'} className="flex flex-col gap-2">
          {section && (
            <div className="mt-3 flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{section}</p>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          )}
          {sectionItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              editText={editText}
              onEditTextChange={setEditText}
              onStartEdit={() => startEdit(item)}
              onSaveEdit={() => saveEdit(item)}
              onCancelEdit={() => { setEditingId(null); setEditText('') }}
              onToggle={toggleCheck}
              onDelete={deleteItem}
              showCategoryPicker={categoryPickerId === item.id}
              onToggleCategoryPicker={() =>
                setCategoryPickerId(categoryPickerId === item.id ? null : item.id)
              }
              onCategoryChange={(cat) => updateCategory(item, cat)}
            />
          ))}
        </div>
      ))}

      {hasChecked && (
        <button
          onClick={clearChecked}
          className="mt-2 self-end text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Clear checked items
        </button>
      )}
    </div>
  )
}

// ─── QuickAddBar ────────────────────────────────────────────────────────────

function QuickAddBar({ onAdded }: { onAdded: (items: ShoppingItem[]) => void }) {
  const [text, setText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    setHasSpeech('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  }, [])

  useEffect(() => {
    return () => { recognitionRef.current?.stop() }
  }, [])

  async function handleAdd() {
    const parsed = parseShoppingText(text)
    if (parsed.length === 0) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: newItems } = await supabase
      .from('shopping_items')
      .insert(
        parsed.map((item) => ({
          user_id: session.user.id,
          name: item.name,
          quantity: item.quantity ?? null,
          price: item.price ?? null,
          section: item.section ?? null,
          category: 'Other',
          checked: false,
        }))
      )
      .select()
    setText('')
    setIsExpanded(false)
    if (newItems?.length) onAdded(newItems as ShoppingItem[])
  }

  function handleVoice() {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript
      setText((prev) => (prev ? prev + '\n' + transcript : transcript))
      setIsExpanded(true)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  function expand() {
    setIsExpanded(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-1">
      {!isExpanded ? (
        <div className="flex items-center gap-3 px-4 py-3 cursor-text" onClick={expand}>
          <p className="flex-1 text-sm text-gray-400">Add items...</p>
          {hasSpeech && (
            <button
              onClick={(e) => { e.stopPropagation(); handleVoice() }}
              className={cn(
                'rounded-full p-1.5 transition-colors',
                isListening
                  ? 'bg-violet-100 text-violet-600 animate-pulse'
                  : 'text-gray-400 hover:text-violet-500'
              )}
              aria-label="Voice input"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'Woolworths:\nmilk\n3 apples $2.99\n\nChemist Warehouse:\nvitamins $15'}
            rows={5}
            className="w-full resize-none px-4 pt-3 pb-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none"
          />
          <div className="flex items-center justify-between border-t border-gray-50 px-3 py-2">
            <div className="flex items-center gap-2">
              {hasSpeech && (
                <button
                  onClick={handleVoice}
                  className={cn(
                    'rounded-full p-1.5 transition-colors',
                    isListening
                      ? 'bg-violet-100 text-violet-600 animate-pulse'
                      : 'text-gray-400 hover:text-violet-500'
                  )}
                  aria-label={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
              <span className="text-xs text-gray-300">
                {isListening ? 'Listening...' : '⌘↵ to add'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setText(''); setIsExpanded(false) }}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!text.trim()}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                  text.trim()
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                <ArrowUp size={13} />
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ItemRow ────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: ShoppingItem
  isEditing: boolean
  editText: string
  onEditTextChange: (text: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  showCategoryPicker: boolean
  onToggleCategoryPicker: () => void
  onCategoryChange: (category: string) => void
}

function ItemRow({
  item,
  isEditing,
  editText,
  onEditTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggle,
  onDelete,
  showCategoryPicker,
  onToggleCategoryPicker,
  onCategoryChange,
}: ItemRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) requestAnimationFrame(() => inputRef.current?.focus())
  }, [isEditing])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); onSaveEdit() }
    if (e.key === 'Escape') { e.preventDefault(); onCancelEdit() }
  }

  if (isEditing) {
    return (
      <div className="rounded-2xl bg-white border border-violet-200 shadow-sm overflow-hidden">
        <div className="flex items-center px-4 py-3">
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => editText.trim() ? onSaveEdit() : onCancelEdit()}
            className="flex-1 text-sm text-gray-900 focus:outline-none"
            placeholder="Item name..."
          />
        </div>
        <div className="flex items-center justify-between border-t border-gray-50 px-4 py-1.5">
          <span className="text-xs text-gray-300">↵ save · esc cancel</span>
          <span className="text-xs text-gray-300">clear + ↵ to delete</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-2xl bg-white border border-gray-100 shadow-sm', item.checked && 'opacity-50')}>
      <div className="flex items-center gap-3 p-4">
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

        {/* Tapping the text area enters edit mode */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onStartEdit}>
          <p className={cn('text-sm font-medium text-gray-900 truncate', item.checked && 'line-through')}>
            {item.name}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            {item.quantity && <span className="text-xs text-gray-500">{item.quantity}</span>}
            {item.price != null && (
              <span className="text-xs font-medium text-violet-600">${item.price.toFixed(2)}</span>
            )}
          </div>
        </div>

        {/* Category chip — tap to open picker */}
        <button
          onClick={onToggleCategoryPicker}
          className={cn(
            'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80',
            CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other
          )}
        >
          {item.category}
        </button>

        <button
          onClick={() => onDelete(item.id)}
          className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400 transition"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {showCategoryPicker && (
        <div className="border-t border-gray-50 px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-opacity',
                  CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other,
                  cat === item.category
                    ? 'ring-2 ring-violet-400 ring-offset-1'
                    : 'opacity-60 hover:opacity-100'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
