export const runtime = 'edge'

import { PageHeader } from '@/components/page-header'
import { ShoppingList } from '@/components/shopping/shopping-list'

export const metadata = { title: 'Shopping List — Listora' }

export default function ShoppingPage() {
  return (
    <>
      <PageHeader title="Shopping List" />
      <main className="flex-1 max-w-md mx-auto w-full">
        <ShoppingList />
      </main>
    </>
  )
}
