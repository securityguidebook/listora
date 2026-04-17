import { SignOutButton } from '@/components/sign-out-button'

interface PageHeaderProps {
  title: string
  action?: React.ReactNode
  showSignOut?: boolean
}

export function PageHeader({ title, action, showSignOut = true }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        <div className="flex items-center gap-2">
          {action}
          {showSignOut && <SignOutButton />}
        </div>
      </div>
    </header>
  )
}
