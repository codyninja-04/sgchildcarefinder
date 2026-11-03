import { NextResponse } from 'next/server'
import { FREE_LIMITS, getUser, proEnforced, toProfile } from '@/lib/auth'
import { claudeConfigured } from '@/lib/claude/client'
import { QA_HISTORY_LIMIT, streamCareAnswer } from '@/lib/claude/care-qa'

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { data } = await supabase
    .from('qa_messages')
    .select('id, role, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(200)
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  if (!claudeConfigured()) return NextResponse.json({ error: 'Q&A needs ANTHROPIC_API_KEY set on the server.' }, { status: 503 })

  const body = (await request.json().catch(() => null)) as { message?: unknown } | null
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : ''
  if (!message) return NextResponse.json({ error: 'Type a question first.' }, { status: 400 })

  const { data: profileRow } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  const profile = toProfile(user.id, profileRow)

  if (proEnforced() && profile.plan !== 'pro') {
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('qa_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', monthStart.toISOString())
    if ((count ?? 0) >= FREE_LIMITS.questionsPerMonth) {
      return NextResponse.json(
        { error: `That’s your ${FREE_LIMITS.questionsPerMonth} free questions this month. Pro is unlimited for $4 a month.`, upgrade: true },
        { status: 402 }
      )
    }
  }

  const { data: history } = await supabase
    .from('qa_messages')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(QA_HISTORY_LIMIT - 1)

  await supabase.from('qa_messages').insert({ user_id: user.id, role: 'user', content: message })
  const conversation = [...(history ?? []).reverse(), { role: 'user' as const, content: message }]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let answer = ''
      try {
        const claude = streamCareAnswer(profile, conversation)
        for await (const event of claude) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text.replace(/\s*—\s*/g, ', ')
            answer += text
            controller.enqueue(encoder.encode(text))
          }
        }
      } catch {
        const fallback = answer ? '\n\n(The answer was cut short. Ask again to continue.)' : 'Sorry, I couldn’t answer just now. Try again in a moment.'
        answer += fallback
        controller.enqueue(encoder.encode(fallback))
      } finally {
        if (answer.trim()) await supabase.from('qa_messages').insert({ user_id: user.id, role: 'assistant', content: answer.trim() })
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}

export async function DELETE() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  await supabase.from('qa_messages').delete().eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
