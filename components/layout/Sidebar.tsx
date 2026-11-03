'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Plan } from '@/lib/types'
import { Logo } from './Logo'
import { NAV, initialsOf, isActive } from './nav'

export function Sidebar({ name, plan, childLine }: { name: string; plan: Plan; childLine: string | null }) {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface/70 px-4 py-5 lg:flex">
      <div className="px-2">
        <Logo href="/search" />
      </div>

      <nav className="mt-8 space-y-0.5" aria-label="Main">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                active ? 'bg-sunken font-medium text-ink' : 'text-muted hover:bg-sunken/60 hover:text-ink'
              }`}
            >
              <span className={active ? 'text-primary' : 'text-faint'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {childLine && (
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/[0.05] p-3">
          <p className="label text-primary/80">Searching for</p>
          <p className="mt-1 text-sm">{childLine}</p>
        </div>
      )}

      <div className="mt-auto rounded-xl border border-line bg-background/60 p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">
            {initialsOf(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-xs text-faint">{plan === 'pro' ? 'Pro plan' : 'Free plan'}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post" className="mt-3">
          <button className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted transition hover:bg-sunken hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
