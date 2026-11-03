// The right side previews the waitlist board, so parents see what the app does
// for them before they sign in.
const PREVIEW = [
  { name: 'PCF Sparkletots @ Punggol Blk 271', status: 'Offered', tone: 'text-offered border-offered/30 bg-offered/10', meta: 'Reply by 14 Nov' },
  { name: 'My First Skool @ Sumang Walk', status: 'Waiting', tone: 'text-waiting border-waiting/30 bg-waiting/10', meta: '6th in line, called 2 Nov' },
  { name: 'Little Seeds Preschool', status: 'Waiting', tone: 'text-waiting border-waiting/30 bg-waiting/10', meta: 'Registered 18 Sep' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">{children}</div>
      <div className="dotted relative hidden flex-col justify-center overflow-hidden border-l border-line bg-sunken/50 px-12 lg:flex">
        <div className="max-w-md">
          <p className="label">Infant care from Jan 2027</p>
          <p className="mt-2 font-display text-3xl leading-snug">
            Three centres, one list. You pay <span className="text-primary">$390 a month</span> after subsidy at the
            one that said yes.
          </p>

          <div className="card mt-8 divide-y divide-line">
            {PREVIEW.map((row, i) => (
              <div key={row.name} className="flex animate-rise-in items-center justify-between gap-4 p-4" style={{ animationDelay: `${i * 110}ms` }}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{row.meta}</p>
                </div>
                <span className={`chip ${row.tone}`}>{row.status}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm text-muted">
            Vacancy comes from ECDA’s monthly listing. It is a guide, not a booking, so you still register with the
            centre yourself.
          </p>
        </div>
      </div>
    </div>
  )
}
