'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './Logo'
import { NAV, isActive } from './nav'

// Phones and tablets get a slim top bar and a thumb friendly tab bar at the bottom,
// since this is mostly opened on a phone between calls to centres.
export function Header() {
  const pathname = usePathname()

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <Logo href="/search" />
          <form action="/auth/signout" method="post">
            <button className="text-xs text-muted hover:text-ink">Sign out</button>
          </form>
        </div>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition ${
                  active ? 'font-medium text-primary' : 'text-muted hover:text-ink'
                }`}
              >
                {item.icon}
                {item.short}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
