import type { Metadata } from 'next'
import { QaChat } from '@/components/qa/QaChat'
import { requireUser } from '@/lib/auth'
import type { QaMessage } from '@/lib/types'

export const metadata: Metadata = { title: 'Ask about care' }

export default async function QaPage() {
  const { supabase, user, profile } = await requireUser()
  const { data } = await supabase
    .from('qa_messages')
    .select('id, role, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(200)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <p className="label">Ask about care</p>
      <QaChat initial={(data ?? []) as QaMessage[]} firstName={profile.full_name?.split(' ')[0] ?? null} />
    </div>
  )
}
