export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { LogoPicker } from './logo-picker'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let logoVariant: 'blue' | 'peach' = 'blue'
  if (user) {
    const { data } = await supabase
      .from('user_preferences')
      .select('logo_variant')
      .eq('user_id', user.id)
      .single()
    if (data?.logo_variant === 'peach') logoVariant = 'peach'
  }

  return (
    <>
      <PageHeader title="Settings" />
      <main className="max-w-md mx-auto px-4 pt-6 pb-28 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">App Icon</h2>
          <LogoPicker current={logoVariant} />
        </section>
      </main>
    </>
  )
}
