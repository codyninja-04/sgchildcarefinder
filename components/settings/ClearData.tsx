'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ClearData() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function clear() {
    setBusy(true)
    await fetch('/api/profile', { method: 'DELETE' })
    setBusy(false)
    setConfirming(false)
    router.refresh()
  }

  return (
    <section className="card border-full/20 p-5 sm:p-6">
      <h2 className="font-display text-xl">Clear my data</h2>
      <p className="mt-1 text-sm text-muted">
        Removes your child’s details, address, income, every waitlist entry and your Q&amp;A history. Your sign in stays so you can
        start fresh.
      </p>
      {confirming ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-danger" onClick={clear} disabled={busy}>
            {busy ? 'Clearing…' : 'Yes, clear everything'}
          </button>
          <button className="btn-ghost" onClick={() => setConfirming(false)}>
            Keep it
          </button>
        </div>
      ) : (
        <button className="btn-ghost mt-4" onClick={() => setConfirming(true)}>
          Clear my data
        </button>
      )}
    </section>
  )
}
