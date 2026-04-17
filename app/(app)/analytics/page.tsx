export const runtime = 'edge'

import { PageHeader } from '@/components/page-header'
import { AnalyticsView } from '@/components/analytics/analytics-view'

export const metadata = { title: 'Analytics — Listora' }

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" showSignOut={false} />
      <main className="flex-1 max-w-md mx-auto w-full">
        <AnalyticsView />
      </main>
    </>
  )
}
