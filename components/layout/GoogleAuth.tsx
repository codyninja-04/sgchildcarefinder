'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from './Logo'

export function GoogleAuth({ mode }: { mode: 'login' | 'signup' }) {
  const params = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(params.get('error') ? 'Sign in did not finish. Try again.' : null)

  async function signIn() {
    setLoading(true)
    setError(null)
    const next = params.get('next') ?? (mode === 'signup' ? '/settings?welcome=1' : '/search')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const copy =
    mode === 'login'
      ? {
          title: 'Welcome back',
          sub: 'Your shortlist, waitlists and notes are where you left them.',
          alt: 'New here?',
          altLink: '/signup',
          altText: 'Create an account',
        }
      : {
          title: 'Stop calling twelve centres',
          sub: 'Search and the subsidy calculator are free. No card needed.',
          alt: 'Already have an account?',
          altLink: '/login',
          altText: 'Sign in',
        }

  return (
    <div className="w-full max-w-sm">
      <Logo />
      <h1 className="mt-10 font-display text-4xl leading-tight tracking-tight">{copy.title}</h1>
      <p className="mt-2 text-muted">{copy.sub}</p>

      <button onClick={signIn} disabled={loading} className="btn-dark mt-8 w-full py-3">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            fill="#fff"
            d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"
          />
        </svg>
        {loading ? 'Opening Google…' : 'Continue with Google'}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-full">
          {error}
        </p>
      )}

      <p className="mt-6 text-sm text-muted">
        {copy.alt}{' '}
        <Link href={copy.altLink} className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-faint">
          {copy.altText}
        </Link>
      </p>

      <p className="mt-10 text-xs leading-relaxed text-faint">
        We only use your household income to estimate subsidies. It stays in your account and is never shared with
        centres.
      </p>
    </div>
  )
}
