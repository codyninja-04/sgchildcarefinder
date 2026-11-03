import type { SupabaseClient } from '@supabase/supabase-js'
import type { WaitlistEntryWithCentre } from './types'

export const WAITLIST_SELECT =
  '*, centre:childcare_centres(id, name, operator, address, phone, scheme_type, vacancy, ecda_updated_on), events:waitlist_events(id, entry_id, created_at, kind, status, body)'

export async function loadWaitlist(supabase: SupabaseClient, userId: string): Promise<WaitlistEntryWithCentre[]> {
  const { data, error } = await supabase
    .from('waitlist_entries')
    .select(WAITLIST_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'waitlist_events', ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as WaitlistEntryWithCentre[]
}
