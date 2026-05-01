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
    const error = searchParams.get('error')
    const errorCode = searchParams.get('error_code')

    // ハッシュフラグメントのエラーも確認
    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.replace('#', ''))
    const hashError = hashParams.get('error')
    const hashErrorCode = hashParams.get('error_code')

    if (error || hashError) {
      const code = errorCode || hashErrorCode
      if (code === 'otp_expired') {
        router.replace('/register?error=link_expired')
      } else {
        router.replace('/login?error=auth_error')
      }
      return
    }

    // implicitフロー: ハッシュにaccess_tokenが含まれる場合
    // Supabase JSが自動処理するのでonAuthStateChangeを待つ
    const hasHashToken = hash.includes('access_token')
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null

    if (!code && !token_hash && !hasHashToken) return

    const run = async () => {
      // implicitフロー: SDKが自動でハッシュを処理するのでセッションを確認
      if (hasHashToken) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) { router.replace('/welcome'); return }
        await new Promise(r => setTimeout(r, 1000))
        const { data: { session: session2 } } = await supabase.auth.getSession()
        if (session2) { router.replace('/welcome'); return }
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { router.replace('/welcome'); return }
      }

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type })
        if (!error) { router.replace('/welcome'); return }
      }
    }

    run()
  }, [])

  return null
}
