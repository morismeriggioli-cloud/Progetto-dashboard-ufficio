import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function hasValidAnonKey(value: string | undefined) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  return trimmed.length > 20 && trimmed !== "...";
}

export const hasValidSupabaseConfig = Boolean(supabaseUrl) && hasValidAnonKey(supabaseAnonKey);

const validatedSupabaseUrl = supabaseUrl ?? "";
const validatedSupabaseAnonKey = supabaseAnonKey ?? "";

function resolveSupabaseAuthStorageKey(url: string) {
  try {
    const projectRef = new URL(url).hostname.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return "supabase.auth.token";
  }
}

export const supabaseAuthStorageKey = resolveSupabaseAuthStorageKey(validatedSupabaseUrl);

export const supabase = hasValidSupabaseConfig
  ? createClient(validatedSupabaseUrl, validatedSupabaseAnonKey, {
      auth: {
        persistSession: true,
        // Avoid eager refresh during client bootstrap, which can throw an uncaught
        // network error when a stale session exists and Supabase is unreachable.
        autoRefreshToken: false,
        detectSessionInUrl: true,
        storageKey: supabaseAuthStorageKey,
      },
    })
  : null;
