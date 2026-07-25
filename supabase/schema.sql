-- ============================================================================
-- UseMyCar — Database Schema (Section 1)
-- Run this entire file in the Supabase SQL Editor: Dashboard > SQL Editor > New query
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: profiles
-- One row per resident. The "id" column is the SAME id Supabase Auth assigns
-- when someone signs up (in auth.users), so each profile is tied 1-to-1 to a
-- login account. We never store passwords ourselves — Supabase Auth does that.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  unit_number text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Turn on Row Level Security. Until you add policies below, NO ONE (not even
-- a logged-in user) can read or write this table — RLS defaults to "deny all".
alter table public.profiles enable row level security;

-- Anyone (including signed-out visitors) can read every profile.
-- Needed for the resident directory and for showing owner names on car cards.
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- A signed-in user may only create the profile row that matches their OWN
-- auth id — auth.uid() is a built-in function that returns the id of
-- whoever is currently logged in, taken from their auth token.
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Same idea for edits: you can only update the row that is "you".
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- ----------------------------------------------------------------------------
-- TABLE: cars
-- One row per car listing. owner_id links back to the profile that listed it.
-- ----------------------------------------------------------------------------
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  make text not null,
  model text not null,
  year integer,
  colour text,
  photo_url text,
  daily_rate numeric(10, 2),
  available boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cars enable row level security;

-- Anyone can see available cars. We also let an owner see their OWN listings
-- even when toggled to unavailable, so their "my cars" view doesn't hide them.
create policy "Available cars are viewable by everyone, owners see their own"
  on public.cars for select
  using (available = true or owner_id = auth.uid());

-- A signed-in user can only create a car row where they are listed as owner.
create policy "Users can insert their own car listings"
  on public.cars for insert
  with check (auth.uid() = owner_id);

-- Only the owner can edit their own listing (e.g. toggle availability).
create policy "Users can update their own car listings"
  on public.cars for update
  using (auth.uid() = owner_id);

-- Only the owner can delete their own listing.
create policy "Users can delete their own car listings"
  on public.cars for delete
  using (auth.uid() = owner_id);


-- ============================================================================
-- UseMyCar — Database Schema (Section 2: building-scoped visibility)
-- Run this after Section 1. Scopes car postings and profile visibility to
-- residents of the same building, determined by an address picked via
-- autocomplete (see components/AddressAutocomplete.tsx).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: buildings
-- One row per physical building. Keyed by formatted_address so that two
-- residents picking the same address land on the same building row.
-- NOTE: place_id is stored for reference but is NOT the dedup key — Geoapify's
-- place_id encodes which underlying data source answered a given request and
-- can differ between identical queries for the same address (confirmed by
-- testing: same address, two calls, two different place_ids). formatted_address
-- was the stable one in practice.
-- ----------------------------------------------------------------------------
create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  formatted_address text not null unique,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

alter table public.buildings enable row level security;

-- Building addresses aren't sensitive on their own (no resident info attached),
-- so anyone can read them — needed to resolve a profile's building_id to an
-- address for display.
create policy "Buildings are viewable by everyone"
  on public.buildings for select
  using (true);

-- No insert/update/delete policies for buildings — all writes go through
-- find_or_create_building() below, so nothing else can write to this table.


-- ----------------------------------------------------------------------------
-- FUNCTION: find_or_create_building
-- Atomic upsert-and-return-id, called from the client whenever a resident
-- picks an address during onboarding or on their profile page. security
-- definer so it can write to buildings despite that table having no insert
-- policy for regular users.
-- ----------------------------------------------------------------------------
create function public.find_or_create_building(
  p_place_id text, p_formatted text, p_lat double precision, p_lon double precision
) returns uuid
language sql
security definer
set search_path = public
as $$
  insert into public.buildings (place_id, formatted_address, latitude, longitude)
  values (p_place_id, p_formatted, p_lat, p_lon)
  on conflict (formatted_address) do update set place_id = excluded.place_id
  returning id
$$;

-- Only signed-in residents completing onboarding/profile edits should call
-- this — logged-out visitors have no legitimate reason to.
revoke execute on function public.find_or_create_building(text, text, double precision, double precision) from anon;


-- ----------------------------------------------------------------------------
-- profiles.building_id — links each resident to their building.
-- Nullable: existing accounts stay usable (they just see/manage only their
-- own data) until they set an address via the profile page.
-- ----------------------------------------------------------------------------
alter table public.profiles add column building_id uuid references public.buildings (id);


-- ----------------------------------------------------------------------------
-- FUNCTION: get_my_building_id
-- security definer so it bypasses RLS — needed so the profiles/cars policies
-- below can look up the caller's own building_id without the profiles policy
-- recursively re-checking itself.
-- ----------------------------------------------------------------------------
create function public.get_my_building_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select building_id from public.profiles where id = auth.uid()
$$;


-- ----------------------------------------------------------------------------
-- Replace the old "everyone can see everything" policies with building-scoped
-- ones. A resident can always see their own profile/listings regardless of
-- building_id (e.g. before they've set an address).
-- ----------------------------------------------------------------------------
drop policy "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by residents of the same building"
  on public.profiles for select
  using (id = auth.uid() or building_id = public.get_my_building_id());

drop policy "Available cars are viewable by everyone, owners see their own" on public.cars;
create policy "Available cars are viewable by residents of the same building"
  on public.cars for select
  using (
    owner_id = auth.uid()
    or (available = true and owner_id in (
      select id from public.profiles where building_id = public.get_my_building_id()
    ))
  );


-- ============================================================================
-- UseMyCar — Database Schema (Section 3: contact by phone)
-- No payments/booking yet, so interested residents contact a car's owner
-- directly. Phone is only ever queried/shown on a car's own detail page
-- (app/cars/[id]/page.tsx), never in the browse grid — same RLS-level access
-- as unit_number, just not fetched until someone opens the listing.
-- ============================================================================

alter table public.profiles add column phone text;


-- ============================================================================
-- UseMyCar — Database Schema (Section 4: resident count feedback)
-- Shown right after picking an address in AddressAutocomplete, so a resident
-- can tell if they matched an existing building ("3 residents already here")
-- or likely picked the wrong one ("You'll be the first here").
-- security definer because, by definition, the person checking doesn't
-- belong to that building yet — the normal "same building" RLS on profiles
-- would otherwise always return 0.
-- ============================================================================

create function public.count_building_residents(p_building_id uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*) from public.profiles where building_id = p_building_id
$$;

revoke execute on function public.count_building_residents(uuid) from anon;
