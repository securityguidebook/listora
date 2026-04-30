export const runtime = 'edge'

import { PageHeader } from '@/components/page-header'
import { ReceiptsView } from '@/components/receipts/receipts-view'

export const metadata = { title: 'Receipts — Carter' }

export default function ReceiptsPage() {
  return (
    <>
      <PageHeader title="Receipts" showSignOut={false} />
      <main className="flex-1 max-w-md mx-auto w-full">
        <ReceiptsView />
      </main>
    </>
  )
}
