'use client'

import { useEffect, useState } from 'react'

// The questions experienced parents wish they'd asked on the first call.
// Ticks are remembered per centre on this device only.
const QUESTIONS = [
  'How many children are ahead of us on the waitlist for our start month?',
  'Do siblings or staff children get priority over the queue?',
  'What is the registration fee, and is the deposit refundable if we don’t take the place?',
  'How many days do we get to accept an offer?',
  'What is the teacher to child ratio in the class we’d join?',
  'What happens on the first two weeks of settling in?',
  'Which public holidays and school holidays is the centre closed?',
  'Is there a sick child policy, and when do they call you to pick up?',
]

export function CallChecklist({ centreId }: { centreId: string }) {
  const key = `call-checklist:${centreId}`
  const [ticked, setTicked] = useState<number[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setTicked(JSON.parse(raw))
    } catch {
      // storage blocked, the list still works for this visit
    }
  }, [key])

  function toggle(i: number) {
    setTicked((current) => {
      const next = current.includes(i) ? current.filter((x) => x !== i) : [...current, i]
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  return (
    <ul className="space-y-1">
      {QUESTIONS.map((q, i) => (
        <li key={q}>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 text-sm transition hover:bg-sunken/50">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--primary))]" checked={ticked.includes(i)} onChange={() => toggle(i)} />
            <span className={ticked.includes(i) ? 'text-faint line-through' : ''}>{q}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}
