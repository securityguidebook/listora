'use client'

import { cn } from '@/lib/utils'
import { BarChart2, Heart, Layout, Receipt, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/shopping', label: 'Shopping', icon: ShoppingCart },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/templates', label: 'Templates', icon: Layout },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/receipts', label: 'Receipts', icon: Receipt },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur-md pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-2 pb-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-medium transition-colors',
                active
                  ? 'text-violet-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={cn(active && 'text-violet-600')}
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
