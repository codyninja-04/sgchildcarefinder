import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'
import { createClient } from '@/lib/supabase/server'

const VACANCY_ROW = [
  { m: 'Nov', v: 'full' },
  { m: 'Dec', v: 'full' },
  { m: 'Jan', v: 'limited' },
  { m: 'Feb', v: 'available' },
  { m: 'Mar', v: 'available' },
  { m: 'Apr', v: 'limited' },
  { m: 'May', v: 'full' },
] as const

const TONE = {
  available: 'bg-offered/10 text-offered border-offered/25',
  limited: 'bg-waiting/10 text-waiting border-waiting/25',
  full: 'bg-full/10 text-full border-full/25',
}

export default async function Home() {
  let signedIn = false
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    signedIn = !!data.user
  } catch {
    // Landing page still renders if Supabase isn't reachable.
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          {signedIn ? (
            <Link href="/search" className="btn-primary px-4 py-2">
              Open the app
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-muted hover:text-ink">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary px-4 py-2">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <p className="label">For working parents in Singapore</p>
            <h1 className="mt-4 font-display text-[2.6rem] leading-[1.05] tracking-tight sm:text-6xl">
              Find infant care without calling <em className="text-primary">twelve</em> centres.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              See which centres near you have reported space for your start month, what you’d really pay after subsidy, and
              keep every waitlist in one place instead of a spreadsheet and a dozen WhatsApp chats.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={signedIn ? '/search' : '/signup'} className="btn-primary px-5 py-3 text-base">
                Find centres near me
              </Link>
              <a href="#how" className="btn-ghost px-5 py-3 text-base">
                How it works
              </a>
            </div>
            <p className="mt-4 text-sm text-faint">Search and the subsidy calculator are free. Sign in with Google.</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/[0.06] blur-2xl" aria-hidden />
            <div className="card animate-rise-in p-5 shadow-lift sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Little Harbour Preschool @ Punggol</p>
                  <p className="mt-0.5 text-sm text-muted">650m away · 10 min walk</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl leading-none">$360</p>
                  <p className="mt-1 text-[11px] text-faint">a month after subsidy</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className={`chip ${TONE.limited}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-waiting" /> Limited · Jan
                </span>
                <span className="chip border-primary/25 bg-primary/[0.06] text-primary">Anchor operator</span>
              </div>

              <div className="mt-5 border-t border-line pt-4">
                <p className="label">Infant care, next seven months</p>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {VACANCY_ROW.map((cell) => (
                    <div key={cell.m} className="text-center">
                      <span className="font-mono text-[10px] uppercase text-faint">{cell.m}</span>
                      <span className={`mt-1 flex h-7 items-center justify-center rounded-md border text-[10px] font-medium ${TONE[cell.v]} ${cell.m === 'Jan' ? 'ring-2 ring-primary ring-offset-1' : ''}`}>
                        {cell.v === 'available' ? 'Open' : cell.v === 'limited' ? 'Few' : 'Full'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-line pt-4">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-sunken">
                  <span className="h-full bg-offered" style={{ width: '46%' }} />
                  <span className="h-full bg-offered/50" style={{ width: '26%' }} />
                  <span className="h-full bg-primary" style={{ width: '28%' }} />
                </div>
                <p className="mt-2 text-xs text-muted">$1,300 fee, less $600 Basic and $340 Additional Subsidy</p>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="border-y border-line bg-surface/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-3">
            {[
              {
                n: '01',
                title: 'Search near home',
                body: 'Every ECDA licensed centre, sorted by distance from your address. Filter by class, start month, anchor operators and full or half day.',
              },
              {
                n: '02',
                title: 'See the real fee',
                body: 'Basic and Additional Subsidy worked out from ECDA’s own tables for your income, including the wider bands that start in January 2027.',
              },
              {
                n: '03',
                title: 'Track every waitlist',
                body: 'Log where you registered, your place in line and every call. Get nudged when an offer needs a reply or a centre goes quiet.',
              },
            ].map((step) => (
              <div key={step.n}>
                <p className="font-mono text-sm text-primary">{step.n}</p>
                <h2 className="mt-3 font-display text-2xl">{step.title}</h2>
                <p className="mt-2 text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="label">Straight with you</p>
              <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">What this app is, and isn’t</h2>
              <p className="mt-4 text-muted">
                Childcare is stressful enough without an app overpromising. So here is exactly where the information comes from.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                ['Vacancy is ECDA’s monthly indicator.', 'Centres report Available, Limited or Full for each class over the next seven months. It’s the best public signal there is, but it isn’t a live booking system, so always call.'],
                ['We don’t register you anywhere.', 'You still register with the centre or through LifeSG. The waitlist board is your own record.'],
                ['Subsidy is an estimate.', 'It follows ECDA’s published tables. ECDA confirms the real amount when you apply.'],
                ['Your income stays with you.', 'It only feeds the fee estimate. Centres never see it.'],
              ].map(([title, body]) => (
                <li key={title} className="card p-5">
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-6">
              <p className="label">Free</p>
              <p className="mt-2 font-display text-4xl">$0</p>
              <ul className="mt-5 space-y-2 text-sm text-muted">
                <li>Search every centre with vacancy and fees</li>
                <li>Subsidy calculator with plain English explanations</li>
                <li>Track up to 3 centres</li>
                <li>10 care questions a month</li>
              </ul>
            </div>
            <div className="card border-primary/30 p-6 ring-1 ring-primary/20">
              <p className="label text-primary">Pro</p>
              <p className="mt-2 font-display text-4xl">
                $4<span className="text-lg text-muted"> a month</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted">
                <li>Track as many centres as you register at</li>
                <li>Unlimited care questions</li>
                <li>Cancel once you’ve got your place</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-faint sm:px-8">
          <p>Centre data from ECDA via data.gov.sg. Addresses mapped with OneMap. Not affiliated with ECDA or MSF.</p>
          <p>SGChildcareFinder</p>
        </div>
      </footer>
    </div>
  )
}
