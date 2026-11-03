import Link from 'next/link'

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="SGChildcareFinder home">
      <svg viewBox="0 0 64 64" className="h-7 w-7 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="16" fill="rgb(var(--primary))" />
        <path d="M32 14 14 29v21h13V38h10v12h13V29Z" fill="#FFF7ED" />
        <circle cx="32" cy="29" r="4.5" fill="rgb(var(--primary))" />
      </svg>
      <span className="font-display text-[17px] font-semibold leading-none tracking-tight">
        Childcare<span className="text-primary">Finder</span>
      </span>
    </Link>
  )
}
