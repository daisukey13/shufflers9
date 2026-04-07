'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-callback`,
    })

    if (error) {
      setError('メールの送信に失敗しました。メールアドレスをご確認ください。')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">🔑 パスワードをお忘れですか？</h1>
          <p className="text-sm text-gray-400 mt-1">登録したメールアドレスを入力してください</p>
        </div>

        <div className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="text-5xl">📧</div>
              <h2 className="font-bold text-white">メールを送信しました</h2>
              <p className="text-sm text-gray-400">
                <span className="text-purple-400">{email}</span> にパスワードリセットのリンクを送りました。
              </p>
              <p className="text-xs text-gray-500">メールが届かない場合は迷惑メールフォルダをご確認ください。</p>
              <Link href="/login" className="block text-sm text-purple-400 hover:text-purple-300 mt-4">
                ← ログインページへ
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="example@email.com"
                  className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {loading ? '送信中...' : 'リセットメールを送信'}
              </button>
              <p className="text-center">
                <Link href="/login" className="text-sm text-gray-400 hover:text-gray-300">
                  ← ログインに戻る
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
