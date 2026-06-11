import { createClient } from '@supabase/supabase-js'

// Cookie不要のパブリッククライアント（unstable_cache内で使用）
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
