'use client'

import { useEffect, useRef, useState } from 'react'
import { RichText } from '@/components/ui/RichText'
import type { QaMessage } from '@/lib/types'

const STARTERS = [
  'Infant care, a nanny or my parents: how do I even compare them?',
  'My mother in law will look after our baby. What support is there for that?',
  'Is it worth paying more for a private centre over an anchor operator?',
  'How many centres should I register at, and how early?',
  'Does Working Mother’s Child Relief change what I pay the centre?',
  'What should I look for when I visit an infant care centre?',
]

export function QaChat({ initial, firstName }: { initial: QaMessage[]; firstName: string | null }) {
  const [messages, setMessages] = useState(initial)
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function send(text: string) {
    const question = text.trim()
    if (!question || streaming) return
    setError(null)
    setDraft('')
    const now = new Date().toISOString()
    setMessages((m) => [...m, { id: `u-${now}`, role: 'user', content: question, created_at: now }, { id: `a-${now}`, role: 'assistant', content: '', created_at: now }])
    setStreaming(true)

    try {
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: question }),
      })
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Could not get an answer.')
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((m) => {
          const copy = [...m]
          const last = copy[copy.length - 1]
          copy[copy.length - 1] = { ...last, content: last.content + chunk }
          return copy
        })
      }
    } catch (err) {
      setError((err as Error).message)
      setMessages((m) => (m[m.length - 1]?.content ? m : m.slice(0, -2)))
      setDraft(question)
    } finally {
      setStreaming(false)
      box.current?.focus()
    }
  }

  async function clear() {
    if (!confirm('Clear this conversation?')) return
    await fetch('/api/qa', { method: 'DELETE' })
    setMessages([])
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col lg:min-h-[calc(100vh-6rem)]">
      {messages.length === 0 ? (
        <div className="flex-1">
          <p className="font-display text-2xl">{firstName ? `Hi ${firstName}.` : 'Hi.'} What’s on your mind?</p>
          <p className="mt-2 max-w-xl text-muted">
            Ask anything about getting childcare sorted: centres versus nannies versus grandparents, subsidies and tax relief,
            waitlists, settling in. Answers use your family details, and nothing you ask is shared with centres.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button key={s} onClick={() => send(s)} className="card px-4 py-3 text-left text-sm transition hover:-translate-y-px hover:shadow-lift">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-5" aria-live="polite">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={m.id ?? i} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[15px] text-white">{m.content}</p>
              </div>
            ) : (
              <div key={m.id ?? i} className="max-w-[92%]">
                {m.content ? (
                  <RichText text={m.content} />
                ) : (
                  <span className="inline-flex gap-1 py-2" aria-label="Thinking">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-faint" style={{ animationDelay: `${d * 150}ms` }} />
                    ))}
                  </span>
                )}
              </div>
            )
          )}
          <div ref={bottom} />
        </div>
      )}

      <div className="sticky bottom-20 mt-6 lg:bottom-4">
        {error && <p className="mb-2 rounded-xl border border-full/25 bg-full/5 px-3 py-2 text-sm text-full">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
          className="card flex items-end gap-2 p-2"
        >
          <textarea
            ref={box}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(draft)
              }
            }}
            placeholder="Ask about care options, subsidies or waitlists"
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-faint"
            aria-label="Your question"
          />
          <button className="btn-primary" disabled={streaming || !draft.trim()}>
            {streaming ? '…' : 'Ask'}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between px-1 text-xs text-faint">
          <span>General guidance, not financial or medical advice. Check figures with ECDA, LifeSG or IRAS.</span>
          {messages.length > 0 && (
            <button onClick={clear} className="hover:text-ink">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
