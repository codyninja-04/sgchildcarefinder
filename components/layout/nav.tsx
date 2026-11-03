// Shared by the sidebar and the mobile tab bar so the two never drift apart.
const icon = (path: React.ReactNode) => (
  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
)

export const NAV = [
  {
    href: '/search',
    label: 'Find centres',
    short: 'Find',
    icon: icon(
      <>
        <circle cx="9" cy="9" r="5.5" />
        <path d="m13.2 13.2 3.8 3.8" />
      </>
    ),
  },
  {
    href: '/waitlist',
    label: 'My waitlists',
    short: 'Waitlists',
    icon: icon(
      <>
        <rect x="4" y="3" width="12" height="14" rx="2" />
        <path d="M7.5 7.5h5M7.5 10.5h5M7.5 13.5h3" />
      </>
    ),
  },
  {
    href: '/subsidy',
    label: 'Subsidy calculator',
    short: 'Subsidy',
    icon: icon(
      <>
        <rect x="4" y="3" width="12" height="14" rx="2" />
        <path d="M7 6.5h6M7 10h.01M10 10h.01M13 10h.01M7 13h.01M10 13h.01M13 13h.01" />
      </>
    ),
  },
  {
    href: '/qa',
    label: 'Ask about care',
    short: 'Ask',
    icon: icon(<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5v5a2.5 2.5 0 0 1-2.5 2.5H9l-3.5 3v-3A1.5 1.5 0 0 1 4 11.5Z" />),
  },
  {
    href: '/settings',
    label: 'Family details',
    short: 'Family',
    icon: icon(
      <>
        <circle cx="10" cy="7" r="3" />
        <path d="M4 17c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" />
      </>
    ),
  },
]

export function isActive(pathname: string, href: string) {
  if (href === '/search' && pathname.startsWith('/centre/')) return true
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'You'
  )
}
