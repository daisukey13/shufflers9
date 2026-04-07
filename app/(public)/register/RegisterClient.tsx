'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AvatarPicker from '@/components/ui/AvatarPicker'
import Turnstile from '@/components/ui/Turnstile'

type Avatar = { id: string; url: string }
type Step = 'account' | 'verify'

export default function RegisterClient({ avatars }: { avatars: Avatar[] }) {
  const [step, setStep] = useState<Step>('account')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
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

    if (!verifyRes.ok) {
      setError('人間認証に失敗しました。もう一度お試しください')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setStep('verify')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-10">
      <div className="max-w-md mx-auto space-y-6">

        {/* ステップ表示 */}
        {step === 'account' && (
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1 text-sm text-purple-400 font-semibold">
              <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold">1</span>
              アカウント作成
            </div>
            <div className="w-8 h-px bg-gray-700" />
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">2</span>
              メール確認
            </div>
            <div className="w-8 h-px bg-gray-700" />
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">3</span>
              プロフィール設定
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold text-center">
          {step === 'account' ? '👤 メンバー登録' : '📧 メールを確認してください'}
        </h1>

        <div className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg mb-4">{error}</p>
          )}

          {/* Step1: アカウント作成 */}
          {step === 'account' && (
            <form onSubmit={handleSignUp} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="6文字以上"
                  className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <Turnstile
                onVerify={token => setTurnstileToken(token)}
                onError={() => setError('認証エラーが発生しました')}
              />

              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {loading ? '処理中...' : '次へ →'}
              </button>
              <p className="text-center text-sm text-gray-500">
                すでにアカウントをお持ちの方は{' '}
                <a href="/login" className="text-purple-400 hover:underline">ログイン</a>
              </p>
            </form>
          )}

          {/* Step2: メール確認待ち */}
          {step === 'verify' && (
            <div className="text-center space-y-5 py-4">
              <div className="text-6xl">📧</div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">確認メールを送信しました</h2>
                <p className="text-sm text-gray-400">
                  <span className="text-purple-400 font-medium">{email}</span>{' '}
                  に確認メールを送りました。
                </p>
                <p className="text-sm text-gray-400">
                  メール内のリンクをクリックして登録を完了してください。
                </p>
              </div>
              <div className="bg-purple-900/30 rounded-xl p-4 text-left space-y-2">
                <p className="text-xs text-gray-300 font-medium">📌 次のステップ：</p>
                <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                  <li>メールボックスを確認する</li>
                  <li>「登録を確認しました」リンクをクリック</li>
                  <li>プロフィール（名前・アバター）を設定する</li>
                </ol>
              </div>
              <p className="text-xs text-gray-500">
                メールが届かない場合は迷惑メールフォルダをご確認ください。
              </p>
              <a href="/login" className="block text-sm text-purple-400 hover:text-purple-300">
                ← ログインページへ
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}