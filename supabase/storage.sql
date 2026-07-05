-- ============================================================================
-- UseMyCar — Storage Setup (Section 2)
-- Run this in the Supabase SQL Editor, after schema.sql.
-- Creates two buckets (avatars, car-images) and the access rules for them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BUCKETS
-- "public = true" means files can be fetched by their URL with no auth check —
-- that's how we'll display car photos and avatars in <img> tags on the site.
-- It does NOT mean anyone can upload/delete — that's controlled separately
-- below by RLS policies on storage.objects.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('car-images', 'car-images', true);

-- storage.objects is the table Supabase uses internally to track every
-- uploaded file. RLS is already enabled on it by Supabase by default.

-- ----------------------------------------------------------------------------
-- AVATARS bucket policies
-- ----------------------------------------------------------------------------

-- Anyone (even signed-out visitors) can read/view avatar files.
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Only logged-in users can upload new avatar files.
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

-- Lets a user replace/remove their OWN uploaded avatar later (e.g. change
-- their profile photo). Supabase automatically records the uploader's id in
-- the "owner" column when a file is inserted, so we can check against that.
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

-- ----------------------------------------------------------------------------
-- CAR-IMAGES bucket policies (same pattern as avatars)
-- ----------------------------------------------------------------------------

create policy "Car images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'car-images');

create policy "Authenticated users can upload car images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'car-images');

create policy "Users can update their own car images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'car-images' and owner = auth.uid());

create policy "Users can delete their own car images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'car-images' and owner = auth.uid());
