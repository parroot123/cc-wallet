import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cloud sync is entirely optional. Without these two env vars the app runs
// exactly as a local-only vault (unchanged behavior) — nothing here ever
// runs and no network call to Supabase is ever made.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isCloudConfigured = Boolean(url && anonKey);

// The anon key is safe to ship in frontend code by design (Supabase's public
// client key) — access is enforced server-side by the RLS policies in
// supabase/migration.sql, not by keeping this key secret.
export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
