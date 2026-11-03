import { Fragment } from 'react'

// Just enough markdown for Claude's answers: paragraphs, bullet and numbered
// lists, and **bold**. Rendered as React nodes, never as raw HTML.
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className={`space-y-3 text-[15px] leading-relaxed ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim())
        if (lines.length && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
                  <span>{inline(l.replace(/^\s*[-*•]\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          )
        }
        if (lines.length && lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ol key={i} className="list-decimal space-y-1.5 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>
              ))}
            </ol>
          )
        }
        if (/^#{1,4}\s/.test(block)) {
          return (
            <p key={i} className="font-semibold">
              {inline(block.replace(/^#{1,4}\s/, ''))}
            </p>
          )
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  )
}
