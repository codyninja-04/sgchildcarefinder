import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { requireUser } from '@/lib/auth'
import { childLine } from '@/lib/format'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUser()
  const name = profile.full_name || user.email || 'You'

  return (
    <div className="flex min-h-screen">
      <Sidebar name={name} plan={profile.plan} childLine={childLine(profile)} />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <Header />
        <main>{children}</main>
      </div>
    </div>
  )
}
