// lib/supabase/client.ts — browser-side Supabase client.
// Use this in any file marked 'use client' (interactive forms, buttons, etc.).
// It reads credentials from NEXT_PUBLIC_ env vars, which are safe to expose
// in the browser because Row Level Security in the DB controls actual access.
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
