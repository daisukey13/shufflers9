'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'

export default function ConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const run = async () => {
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type') as EmailOtpType | null
      const code = searchParams.get('code')

      // PKCE flow
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { router.replace('/mypage/edit?welcome=1'); return }
      }

      // Email OTP flow (token_hash)
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type })
        if (!error) { router.replace('/mypage/edit?welcome=1'); return }
      }

      // Implicit flow: hash fragment (#access_token=...) — Supabase JS SDK handles this automatically
      // Just wait for session to be established
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { router.replace('/mypage/edit?welcome=1'); return }

      // Listen for auth state in case it arrives async
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          subscription.unsubscribe()
          router.replace('/mypage/edit?welcome=1')
        }
      })

      // Timeout fallback
      setTimeout(() => {
        subscription.unsubscribe()
        setStatus('error')
      }, 8000)
    }

    run()
  }, [])

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-bold">リンクの有効期限切れ</h1>
          <p className="text-sm text-gray-400">確認リンクが無効または期限切れです。再度登録をお試しください。</p>
          <a href="/register" className="block mt-4 text-purple-400 hover:text-purple-300 underline text-sm">
            登録ページへ戻る
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">認証中です。しばらくお待ちください…</p>
      </div>
    </div>
  )
}
