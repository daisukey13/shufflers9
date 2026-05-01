'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'

export default function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null

    if (!code && !token_hash) return

    const run = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { router.replace('/mypage/edit?welcome=1'); return }
      }
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type })
        if (!error) { router.replace('/mypage/edit?welcome=1'); return }
      }
    }

    run()
  }, [])

  return null
}
