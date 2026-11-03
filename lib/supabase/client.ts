'use client'

import { createBrowserClient } from '@supabase/ssr'

// Browser side client for the auth pages. Everything else goes through the API
// routes, and RLS keeps each user scoped to their own sessions either way.
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
