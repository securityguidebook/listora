export const dynamic = 'force-dynamic'

import { BottomNav } from '@/components/bottom-nav'
import { SignOutButton } from '@/components/sign-out-button'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f8fc]">
      {children}
      <BottomNav />
    </div>
  )
}
