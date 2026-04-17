import { createBrowserClient } from '@supabase/ssr'

// Singleton — @supabase/ssr's createBrowserClient already dedupes internally,
// but we guard the env-var access so SSR prerender doesn't throw when env is
// absent (e.g. during `next build` without a .env.local).
let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

  _client = createBrowserClient(url, key)
  return _client
}
