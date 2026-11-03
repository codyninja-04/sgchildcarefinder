'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Place } from '@/lib/onemap'

/**
 * Type a postal code, block or street and pick the match. OneMap does the lookup,
 * so the coordinates are exact rather than a guess from the postal sector.
 */
export function AddressSearch({
  value,
  onPick,
  placeholder = 'Postal code or street, e.g. 520123',
  autoFocus,
}: {
  value: string
  onPick: (place: Place) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  const id = useId()
  const [query, setQuery] = useState(value)
  const [places, setPlaces] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle')
  const picked = useRef(value)

  useEffect(() => setQuery(value), [value])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3 || q === picked.current) {
      setPlaces([])
      setState('idle')
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setState('loading')
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        const json = (await res.json()) as { places: Place[] }
        setPlaces(json.places)
        setActive(0)
        setState(res.ok ? (json.places.length ? 'idle' : 'empty') : 'error')
        setOpen(true)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setState('error')
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function pick(place: Place) {
    picked.current = place.address
    setQuery(place.address)
    setOpen(false)
    setPlaces([])
    onPick(place)
  }

  return (
    <div className="relative">
      <div className="relative">
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.5 5.5 9.5 5.5 9.5Z" />
          <circle cx="10" cy="8" r="2" />
        </svg>
        <input
          id={id}
          role="combobox"
          aria-expanded={open && places.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          className="input pl-10"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => places.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!open || places.length === 0) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, places.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              pick(places[active])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        {state === 'loading' && <span className="absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-primary" />}
      </div>

      {open && places.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="card absolute z-30 mt-1.5 max-h-72 w-full animate-fade-in overflow-auto p-1">
          {places.map((place, i) => (
            <li key={`${place.address}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(place)}
                onMouseEnter={() => setActive(i)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${i === active ? 'bg-sunken' : ''}`}
              >
                {place.address}
              </button>
            </li>
          ))}
        </ul>
      )}
      {state === 'empty' && <p className="mt-1.5 text-xs text-muted">No match. A 6 digit postal code works best.</p>}
      {state === 'error' && <p className="mt-1.5 text-xs text-full">Address search is not responding. Try again in a moment.</p>}
    </div>
  )
}
