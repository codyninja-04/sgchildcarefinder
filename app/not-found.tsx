import Link from 'next/link'
import { Logo } from '@/components/layout/Logo'

export default function NotFound() {
  return (
    <div className="dotted flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <h1 className="mt-10 font-display text-4xl tracking-tight">This page has moved out</h1>
      <p className="mt-2 max-w-sm text-muted">The link may be old, or the centre may have closed and left ECDA’s listing.</p>
      <Link href="/search" className="btn-primary mt-8">
        Back to search
      </Link>
    </div>
  )
}
