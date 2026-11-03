import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import type { Profile } from './types'

export function toProfile(userId: string, row: Partial<Profile> | null, fallbackName?: string | null): Profile {
  return {
    user_id: userId,
    full_name: row?.full_name ?? fallbackName ?? null,
    plan: row?.plan === 'pro' ? 'pro' : 'free',
    home_address: row?.home_address ?? null,
    home_postal_code: row?.home_postal_code ?? null,
    home_lat: row?.home_lat != null ? Number(row.home_lat) : null,
    home_lng: row?.home_lng != null ? Number(row.home_lng) : null,
    child_name: row?.child_name ?? null,
    child_birth_date: row?.child_birth_date ?? null,
    desired_start_date: row?.desired_start_date ?? null,
    household_income_monthly: row?.household_income_monthly ?? null,
    household_size: row?.household_size ?? null,
    is_working_mother: row?.is_working_mother ?? true,
    citizenship_status: row?.citizenship_status ?? null,
  }
}

/** Server components behind the app layout call this for the user and their profile. */
export async function requireUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined
  const profile = toProfile(user.id, data, meta?.full_name ?? meta?.name ?? user.email ?? null)

  return { supabase, user, profile }
}

/** For route handlers: the user or a 401, without redirecting. */
export async function getUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Pro limits only bite when billing is switched on, so the app is fully usable in development. */
export function proEnforced() {
  return process.env.ENFORCE_PRO === 'true'
}

export const FREE_LIMITS = {
  waitlistEntries: 3,
  questionsPerMonth: 10,
}
