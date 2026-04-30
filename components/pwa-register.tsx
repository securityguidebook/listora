'use client'

import { getWriteQueue, clearWriteQueue, enqueueWrite } from '@/lib/data-cache'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }

    async function flushQueue() {
      const queue = getWriteQueue()
      if (!queue.length) return
      const supabase = createClient()
      const failed: typeof queue = []
      for (const write of queue) {
        try {
          if (write.op === 'insert') {
            await supabase.from(write.table).insert(write.payload as object)
          } else if (write.op === 'update' && write.eqFilter) {
            await supabase.from(write.table).update(write.payload as object).eq(write.eqFilter.column, write.eqFilter.value)
          } else if (write.op === 'delete' && write.eqFilter) {
            await supabase.from(write.table).delete().eq(write.eqFilter.column, write.eqFilter.value)
          }
        } catch {
          failed.push(write)
        }
      }
      if (failed.length < queue.length) {
        // At least some writes succeeded — clear queue and re-queue only failures
        clearWriteQueue()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        failed.forEach(({ id: _id, ...rest }) => enqueueWrite(rest))
        // Signal components to refetch fresh data
        window.dispatchEvent(new Event('carter:synced'))
      }
    }

    window.addEventListener('online', flushQueue)
    // Also try on mount in case we're already online with a stale queue
    flushQueue()

    return () => window.removeEventListener('online', flushQueue)
  }, [])

  return null
}
