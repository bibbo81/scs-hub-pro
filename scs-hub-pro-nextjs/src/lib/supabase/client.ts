import { createBrowserClient } from '@supabase/ssr'

export function createClientSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Create and export a singleton instance
export const supabase = createClientSupabaseClient()