export type CentreType = 'infant_care' | 'childcare' | 'kindergarten' | 'family_childcare'
export type SchemeType = 'anchor' | 'partner'
export type Citizenship = 'citizen' | 'pr' | 'other'
export type Programme = 'full_day' | 'half_day'
export type Plan = 'free' | 'pro'

/** ECDA's level codes. pg is playgroup, n1 and n2 are nursery 1 and 2. */
export type Level = 'infant' | 'pg' | 'n1' | 'n2' | 'k1' | 'k2'

/** ECDA publishes one of these per level per month. */
export type Vacancy = 'available' | 'limited' | 'full' | 'na'

export type VacancyMap = Partial<Record<Level, Vacancy[]>>

export type WaitlistStatus = 'waiting' | 'offered' | 'accepted' | 'declined' | 'withdrawn'
export type WaitlistEventKind = 'status' | 'call' | 'email' | 'visit' | 'note'

export interface Centre {
  id: string
  updated_at: string
  centre_code: string
  name: string
  centre_type: CentreType
  service_model: string | null
  operator: string | null
  scheme_type: SchemeType | null
  is_anchor_operator: boolean
  offers_infant_care: boolean
  address: string
  postal_code: string | null
  lat: number
  lng: number
  geocode_precision: 'exact' | 'approximate'
  monthly_fee_full_day: number | null
  monthly_fee_half_day: number | null
  monthly_fee_infant_full_day: number | null
  operating_hours: string | null
  saturday_hours: string | null
  languages: string[]
  food_offered: string | null
  spark_certified: boolean
  extended_hours: boolean
  provides_transport: boolean
  government_subsidy: boolean
  phone: string | null
  email: string | null
  website: string | null
  vacancy: VacancyMap
  ecda_updated_on: string | null
}

export interface CentreFee {
  centre_id: string
  level: Level
  programme: Programme
  citizenship: Citizenship
  monthly_fee: number
}

export interface Profile {
  user_id: string
  full_name: string | null
  plan: Plan
  home_address: string | null
  home_postal_code: string | null
  home_lat: number | null
  home_lng: number | null
  child_name: string | null
  child_birth_date: string | null
  desired_start_date: string | null
  household_income_monthly: number | null
  household_size: number | null
  is_working_mother: boolean
  citizenship_status: Citizenship | null
}

export interface WaitlistEntry {
  id: string
  user_id: string
  centre_id: string
  created_at: string
  updated_at: string
  child_name: string | null
  desired_start_date: string | null
  registered_date: string | null
  status: WaitlistStatus
  queue_position: number | null
  fee_quoted: number | null
  offer_deadline: string | null
  follow_up_on: string | null
  notes: string | null
}

export interface WaitlistEvent {
  id: string
  entry_id: string
  created_at: string
  kind: WaitlistEventKind
  status: WaitlistStatus | null
  body: string | null
}

export type WaitlistEntryWithCentre = WaitlistEntry & {
  centre: Pick<Centre, 'id' | 'name' | 'operator' | 'address' | 'phone' | 'scheme_type' | 'vacancy' | 'ecda_updated_on'>
  events: WaitlistEvent[]
}

/** A centre as search returns it: distance and the numbers for your child worked out. */
export interface CentreResult {
  centre: Centre
  distance_km: number | null
  fee: number | null
  net_fee: number | null
  subsidy: number | null
  vacancy: Vacancy | null
}

export interface QaMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
