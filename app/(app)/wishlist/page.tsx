export const runtime = 'edge'

import { PageHeader } from '@/components/page-header'
import { Wishlist } from '@/components/wishlist/wishlist'

export const metadata = { title: 'Wishlist — Carter' }

export default function WishlistPage() {
  return (
    <>
      <PageHeader title="Wishlist" />
      <main className="flex-1 max-w-md mx-auto w-full">
        <Wishlist />
      </main>
    </>
  )
}
