import { SignOutButton } from '@/components/sign-out-button'
import { AppLogo } from '@/components/app-logo'
import { Settings } from 'lucide-react'
import Link from 'next/link'

interface PageHeaderProps {
  title: string
  action?: React.ReactNode
  showSignOut?: boolean
}

export function PageHeader({ title, action, showSignOut = true }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>
        <div className="flex items-center gap-1">
          {action}
          <Link
            href="/settings"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
            aria-label="Settings"
          >
            <Settings size={16} />
          </Link>
          {showSignOut && <SignOutButton />}
        </div>
      </div>
    </header>
  )
}
