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
    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.replace('#', ''))

    // エラー検出（クエリとハッシュ両方）
    const errorCode = searchParams.get('error_code') || hashParams.get('error_code')
    const hasError = searchParams.get('error') || hashParams.get('error')
    if (hasError) {
      if (errorCode === 'otp_expired') {
        router.replace('/register?error=link_expired')
      } else {
        router.replace('/login?error=auth_error')
      }
      return
    }

    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const hasHashToken = hash.includes('access_token')

    // 認証パラメータがなければ何もしない
    if (!code && !token_hash && !hasHashToken) return

    const run = async () => {
      // コード交換を試みる（SDK が先に処理済みでも失敗するだけ）
      if (code) await supabase.auth.exchangeCodeForSession(code)
      if (token_hash && type) await supabase.auth.verifyOtp({ token_hash, type })

      // SDK が自動処理した場合も含め、セッションがあれば遷移
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { router.replace('/welcome'); return }

      // 少し待ってから再確認（SDK の非同期処理完了を待つ）
      await new Promise(r => setTimeout(r, 1500))
      const { data: { session: s2 } } = await supabase.auth.getSession()
      if (s2) { router.replace('/welcome'); return }
    }

    run()
  }, [])

  return null
}
