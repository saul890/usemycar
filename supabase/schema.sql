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
  year integer not null,
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
