import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SGChildcareFinder',
    short_name: 'Childcare',
    description: 'Find childcare near you, see your fee after subsidy, and track every waitlist in one place.',
    start_url: '/search',
    display: 'standalone',
    background_color: '#FFF7ED',
    theme_color: '#FFF7ED',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
