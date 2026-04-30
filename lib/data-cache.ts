// Module-level in-memory cache — survives tab switches within a session
const MEM = new Map<string, unknown[]>()

export function readCache<T>(key: string): T[] | null {
  if (MEM.has(key)) return MEM.get(key) as T[]
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`carter:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as T[]
    MEM.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

export function writeCache<T>(key: string, data: T[]): void {
  MEM.set(key, data)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`carter:${key}`, JSON.stringify(data))
    } catch {
      // localStorage full — mem cache still works for this session
    }
  }
}

export function patchCache<T extends { id: string }>(key: string, id: string, patch: Partial<T>): void {
  const cached = readCache<T>(key)
  if (!cached) return
  writeCache(key, cached.map(item => item.id === id ? { ...item, ...patch } : item))
}

export function removeFromCache(key: string, id: string): void {
  const cached = readCache<{ id: string }>(key)
  if (!cached) return
  writeCache(key, cached.filter(item => item.id !== id))
}

export function removeMultipleFromCache(key: string, ids: string[]): void {
  const set = new Set(ids)
  const cached = readCache<{ id: string }>(key)
  if (!cached) return
  writeCache(key, cached.filter(item => !set.has(item.id)))
}

// ─── Offline write queue ─────────────────────────────────────────────────────

export interface QueuedWrite {
  id: string
  table: string
  op: 'insert' | 'update' | 'delete'
  payload?: Record<string, unknown>
  eqFilter?: { column: string; value: string }
}

export function enqueueWrite(write: Omit<QueuedWrite, 'id'>): void {
  if (typeof window === 'undefined') return
  try {
    const q = getWriteQueue()
    q.push({ ...write, id: crypto.randomUUID() })
    localStorage.setItem('carter:queue', JSON.stringify(q))
  } catch {}
}

export function getWriteQueue(): QueuedWrite[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('carter:queue')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearWriteQueue(): void {
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem('carter:queue') } catch {}
  }
}
