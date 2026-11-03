'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { money } from '@/lib/format'
import { SG_CENTRE } from '@/lib/geo'
import { VACANCY_META } from '@/lib/levels'
import type { CentreResult } from '@/lib/types'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

/**
 * Pins are coloured by ECDA's vacancy indicator for the chosen month, so the map
 * answers the one question parents actually have: which nearby centres might
 * have a place. DOM markers are fine at a few hundred pins.
 */
export default function CentreMap({
  results,
  origin,
  radiusKm,
  highlight,
  onSelect,
}: {
  results: CentreResult[]
  origin: { lat: number; lng: number } | null
  radiusKm: number
  highlight: string | null
  onSelect: (id: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLButtonElement }>>(new Map())
  const home = useRef<mapboxgl.Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!TOKEN || !container.current || map.current) return
    mapboxgl.accessToken = TOKEN
    map.current = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [origin?.lng ?? SG_CENTRE.lng, origin?.lat ?? SG_CENTRE.lat],
      zoom: origin ? 13.5 : 10.8,
      attributionControl: false,
    })
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    return () => {
      map.current?.remove()
      map.current = null
    }
    // Built once. Origin and results are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Home marker and a zoom that fits the search radius.
  useEffect(() => {
    if (!map.current || !origin) return
    home.current?.remove()
    const el = document.createElement('div')
    el.style.cssText =
      'width:18px;height:18px;border-radius:9999px;background:#291C12;border:3px solid #fff;box-shadow:0 0 0 6px rgba(234,88,12,.18)'
    el.setAttribute('aria-label', 'Home')
    home.current = new mapboxgl.Marker({ element: el }).setLngLat([origin.lng, origin.lat]).addTo(map.current)
    const zoom = radiusKm <= 1 ? 14.6 : radiusKm <= 2 ? 13.8 : radiusKm <= 3 ? 13.2 : radiusKm <= 5 ? 12.5 : 11.8
    map.current.easeTo({ center: [origin.lng, origin.lat], zoom, duration: 500 })
  }, [origin, radiusKm])

  useEffect(() => {
    if (!map.current) return
    markers.current.forEach(({ marker }) => marker.remove())
    markers.current.clear()

    for (const r of results) {
      const meta = VACANCY_META[r.vacancy ?? 'na']
      const el = document.createElement('button')
      el.type = 'button'
      el.setAttribute('aria-label', r.centre.name)
      el.style.cssText = `width:22px;height:22px;border-radius:9999px;background:${meta.hex};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(41,28,18,.3);cursor:pointer;transition:transform .15s`

      const popup = new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(
        `<div style="font-size:13px;line-height:1.45;max-width:220px">
           <strong style="display:block;color:#291C12">${escapeHtml(r.centre.name)}</strong>
           <span style="color:${meta.hex}">${meta.label}</span>
           ${r.net_fee != null ? `<span style="color:#6B5646"> · ${money(r.net_fee)}/mth after subsidy</span>` : ''}
         </div>`
      )

      const marker = new mapboxgl.Marker({ element: el }).setLngLat([r.centre.lng, r.centre.lat]).setPopup(popup).addTo(map.current)
      el.addEventListener('mouseenter', () => marker.togglePopup())
      el.addEventListener('mouseleave', () => marker.getPopup()?.remove())
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelectRef.current(r.centre.id)
      })
      markers.current.set(r.centre.id, { marker, el })
    }
  }, [results])

  useEffect(() => {
    markers.current.forEach(({ el }, id) => {
      el.style.transform = id === highlight ? 'scale(1.35)' : 'scale(1)'
      el.style.zIndex = id === highlight ? '2' : '1'
    })
  }, [highlight, results])

  if (!TOKEN) {
    return (
      <div className="dotted flex h-full items-center justify-center rounded-2xl border border-line bg-sunken/40 p-6 text-center">
        <p className="max-w-xs text-sm text-muted">
          Add <code className="font-mono text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> to see centres on a map. The list works without
          it.
        </p>
      </div>
    )
  }

  return <div ref={container} className="h-full w-full overflow-hidden rounded-2xl" />
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
}
