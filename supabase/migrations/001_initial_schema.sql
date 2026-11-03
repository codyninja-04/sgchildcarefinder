-- SGChildcareFinder initial schema.
--
-- Centres come from ECDA's public listing on data.gov.sg (see scripts/import-ecda.ts).
-- Everything a parent writes (profile, waitlist, Q&A) is private to them through RLS.

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Centres
-- ---------------------------------------------------------------------------

create table childcare_centres (
  id uuid primary key default uuid_generate_v4(),
  updated_at timestamptz not null default now(),
  centre_code text not null unique,            -- ECDA centre code, e.g. PT0860
  name text not null,
  centre_type text not null check (centre_type in ('infant_care', 'childcare', 'kindergarten', 'family_childcare')),
  service_model text,                          -- ECDA service model (CC, KN, DS, EYC ...)
  operator text,                               -- 'PCF Sparkletots', 'My First Skool', 'independent' ...
  scheme_type text check (scheme_type in ('anchor', 'partner')),
  is_anchor_operator boolean not null default false,
  offers_infant_care boolean not null default false,
  address text not null,
  postal_code text,
  lat numeric not null,
  lng numeric not null,
  geocode_precision text not null default 'exact' check (geocode_precision in ('exact', 'approximate')),
  -- Singapore Citizen full day fees, kept on the row so search can sort by them.
  -- The full fee schedule (every level, citizenship and programme) is in centre_fees.
  monthly_fee_full_day integer,                -- childcare, highest level offered
  monthly_fee_half_day integer,
  monthly_fee_infant_full_day integer,
  operating_hours text,                        -- weekday full day hours, e.g. 07:00-19:00
  saturday_hours text,
  languages text[] not null default '{}',
  food_offered text,
  spark_certified boolean not null default false,
  extended_hours boolean not null default false,
  provides_transport boolean not null default false,
  government_subsidy boolean not null default true,
  phone text,
  email text,
  website text,
  -- ECDA's indicator per level for the next seven months, starting from the month
  -- of ecda_updated_on. Shape: { "infant": ["available","limited",...], "pg": [...], ... }
  vacancy jsonb not null default '{}'::jsonb,
  ecda_updated_on date,
  search_vector tsvector generated always as (
    to_tsvector('english', name || ' ' || coalesce(operator, '') || ' ' || address || ' ' || coalesce(postal_code, ''))
  ) stored
);

create table centre_fees (
  centre_id uuid not null references childcare_centres(id) on delete cascade,
  level text not null check (level in ('infant', 'pg', 'n1', 'n2', 'k1', 'k2')),
  programme text not null check (programme in ('full_day', 'half_day')),
  citizenship text not null check (citizenship in ('citizen', 'pr', 'other')),
  monthly_fee integer not null,
  primary key (centre_id, level, programme, citizenship)
);

-- ---------------------------------------------------------------------------
-- Parents
-- ---------------------------------------------------------------------------

create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  home_address text,
  home_postal_code text,
  home_lat numeric,
  home_lng numeric,
  child_name text,
  child_birth_date date,                       -- or expected due date
  desired_start_date date,
  household_income_monthly integer,            -- gross, used only for the subsidy estimate
  household_size integer check (household_size between 1 and 20),
  is_working_mother boolean not null default true,
  citizenship_status text check (citizenship_status in ('citizen', 'pr', 'other'))
);

create table waitlist_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  centre_id uuid not null references childcare_centres(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  child_name text,
  desired_start_date date,
  registered_date date,
  status text not null default 'waiting' check (status in ('waiting', 'offered', 'accepted', 'declined', 'withdrawn')),
  queue_position integer check (queue_position > 0),
  fee_quoted integer check (fee_quoted >= 0),
  offer_deadline date,
  follow_up_on date,
  notes text,
  unique (user_id, centre_id, child_name)
);

-- A running log per entry: every call, email and status change, so you can see
-- "called on the 3rd, still 12th in line" without digging through WhatsApp.
create table waitlist_events (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid not null references waitlist_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('status', 'call', 'email', 'visit', 'note')),
  status text check (status in ('waiting', 'offered', 'accepted', 'declined', 'withdrawn')),
  body text
);

create table qa_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  role text not null check (role in ('user', 'assistant')),
  content text not null
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_centres_search on childcare_centres using gin(search_vector);
create index idx_centres_name_trgm on childcare_centres using gin(name gin_trgm_ops);
create index idx_centres_location on childcare_centres(lat, lng);
create index idx_waitlist_user on waitlist_entries(user_id, status);
create index idx_waitlist_events_entry on waitlist_events(entry_id, created_at desc);
create index idx_qa_user on qa_messages(user_id, created_at);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_touch before update on user_profiles
  for each row execute function touch_updated_at();
create trigger trg_waitlist_touch before update on waitlist_entries
  for each row execute function touch_updated_at();

-- A profile row appears the moment someone signs in with Google.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table childcare_centres enable row level security;
alter table centre_fees enable row level security;
alter table user_profiles enable row level security;
alter table waitlist_entries enable row level security;
alter table waitlist_events enable row level security;
alter table qa_messages enable row level security;

-- Centre data is public. Writes only happen through the importer with the service role.
create policy "public_centres" on childcare_centres for select using (true);
create policy "public_fees" on centre_fees for select using (true);

create policy "own_profile" on user_profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_waitlist" on waitlist_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_waitlist_events" on waitlist_events for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from waitlist_entries e where e.id = entry_id and e.user_id = auth.uid())
  );

create policy "own_qa" on qa_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Plan is set by the billing side, not by the user editing their own row. A
-- column revoke would not beat Supabase's table level grant, so a trigger does it.
create or replace function guard_profile_plan() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then
      new.plan = 'free';
    elsif new.plan is distinct from old.plan then
      new.plan = old.plan;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_guard_plan before insert or update on user_profiles
  for each row execute function guard_profile_plan();
