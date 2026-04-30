export const runtime = 'edge'

import { PageHeader } from '@/components/page-header'
import { TemplatesView } from '@/components/templates/templates-view'

export const metadata = { title: 'Templates — Carter' }

export default function TemplatesPage() {
  return (
    <>
      <PageHeader title="Templates" showSignOut={false} />
      <main className="flex-1 max-w-md mx-auto w-full">
        <TemplatesView />
      </main>
    </>
  )
}
