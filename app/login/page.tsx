'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Turnstile from '@/components/ui/Turnstile'

type LoginMode = 'name' | 'email'

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('name')
  const [nameOrEmail, setNameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!turnstileToken) {
      setError('人間認証を完了してください')
      return
    }

    setLoading(true)
    setError(null)

    // Turnstile検証
    const verifyRes = await fetch('/api/turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: turnstileToken }),
    })
    setTurnstileToken(null)

    if (!verifyRes.ok) {
      setError('人間認証に失敗しました。もう一度お試しください')
      setLoading(false)
      return
    }

    let email = nameOrEmail.trim()

    if (mode === 'name') {
      const res = await fetch('/api/auth/resolve-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameOrEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'ログインに失敗しました')
        setLoading(false)
        return
      }

      email = data.email
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('パスワードが正しくありません')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/shuffleboard-puck-blue.png" className="w-8 h-8 object-contain" />
            <h1 className="text-2xl font-bold text-white">ログイン</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">Toyoura Shufflers Club</p>
        </div>

        <div className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6 space-y-5">

          {/* モード切替 */}
          <div className="flex gap-2 bg-black/20 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setMode('name'); setNameOrEmail(''); setError(null) }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                mode === 'name' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              表示名でログイン
            </button>
            <button
              type="button"
              onClick={() => { setMode('email'); setNameOrEmail(''); setError(null) }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                mode === 'email' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              メールでログイン
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {mode === 'name' ? '表示名' : 'メールアドレス'}
              </label>
              <input
                type={mode === 'name' ? 'text' : 'email'}
                value={nameOrEmail}
                onChange={e => setNameOrEmail(e.target.value)}
                required
                placeholder={mode === 'name' ? 'クラブ内での表示名' : 'example@email.com'}
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="パスワード"
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-purple-400">
                パスワードをお忘れですか？
              </Link>
            </div>

            {/* Cloudflare Turnstile */}
            <div>
              <Turnstile
                onVerify={(token) => setTurnstileToken(token)}
                onError={() => setTurnstileToken(null)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            アカウントをお持ちでない方は{' '}
            <a href="/register" className="text-purple-400 hover:underline">新規登録</a>
          </p>

          <p className="text-center">
            <a href="/" className="text-sm text-gray-500 hover:text-gray-300 transition">
              ← トップページへ戻る
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}