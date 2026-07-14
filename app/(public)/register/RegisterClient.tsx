'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Turnstile from '@/components/ui/Turnstile'
import Link from 'next/link'

type Step = 'account' | 'verify'

export default function RegisterClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('account')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // OTP コード確認ステップ用
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentNote, setResentNote] = useState<string | null>(null)
  const supabase = createClient()

  // URLのエラーパラメータを検出
  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null
  const urlError = searchParams?.get('error')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedToTerms) {
      setError('利用規約に同意してください')
      return
    }
    if (!turnstileToken) {
      setError('人間認証を完了してください')
      return
    }
    setLoading(true)
    setError(null)

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

    // 確認コード（OTP）をメールで送信。リンクではなく6桁コードのため
    // au 等の「URL付きメール拒否」を回避できる（メール本文は Supabase テンプレートで {{ .Token }} を使う）。
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setStep('verify')
    setLoading(false)
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = code.trim()
    if (!/^\d{6}$/.test(token)) {
      setError('6桁の確認コードを入力してください')
      return
    }
    setVerifying(true)
    setError(null)

    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })

    if (error) {
      setError('コードが正しくないか、有効期限が切れています。再送してお試しください。')
      setVerifying(false)
      return
    }

    // 認証成功でセッション確立 → プロフィール入力へ
    router.replace('/mypage/edit?welcome=1')
  }

  const handleResend = async () => {
    setResending(true)
    setError(null)
    setResentNote(null)

    const { error } = await supabase.auth.resend({ type: 'signup', email })

    if (error) {
      setError(error.message)
    } else {
      setResentNote('確認コードを再送しました。')
    }
    setResending(false)
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

        {urlError === 'link_expired' && (
          <div className="p-4 bg-red-900/30 border border-red-600/50 rounded-xl text-sm text-red-300 text-center">
            ⚠️ 確認メールのリンクが期限切れです。<br />
            再度メールアドレスを入力して登録してください。
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

              {/* 利用規約 */}
              <div className="bg-purple-900/30 border border-purple-700/30 rounded-xl p-4 space-y-3">
                <div className="h-48 overflow-y-auto text-xs text-gray-400 space-y-3 pr-1">
                  <p className="font-semibold text-gray-300">利用規約</p>
                  <p>本規約は、テーブルシャッフルボード豊浦ランキングシステム（以下「本サービス」といいます）の利用に関する条件を定めるものです。利用者は、本規約に同意した上で本サービスを利用するものとします。</p>
                  <p className="font-medium text-gray-300">第2条（利用登録）</p>
                  <p>利用登録を希望する者は、本規約に同意の上、当クラブの定める方法によって利用登録を申請し、当クラブがこれを承認することによって、利用登録が完了するものとします。</p>
                  <p className="font-medium text-gray-300">第3条（個人情報の取り扱い）</p>
                  <p>本サービスでは、ハンドルネーム・アバター・地域・ランキング情報・試合結果を公開情報として、氏名・メールアドレス・電話番号を非公開情報として収集・管理します。非公開情報は第三者に提供しません。</p>
                  <p className="font-medium text-gray-300">第4条（禁止事項）</p>
                  <p>虚偽の情報登録・なりすまし・運営妨害・誹謗中傷・その他当クラブが不適切と判断する行為を禁止します。</p>
                  <p className="font-medium text-gray-300">第5条（試合結果の登録）</p>
                  <p>試合結果は正確に登録するものとし、虚偽の結果を登録した場合はアカウントの停止等の措置を取る場合があります。</p>
                  <p className="font-medium text-gray-300">第6条（免責事項）</p>
                  <p>本サービスの利用により生じた損害について、当クラブは一切の責任を負いません。</p>
                  <p className="font-medium text-gray-300">第7条（規約の変更）</p>
                  <p>当クラブは、必要と判断した場合には本規約を変更することができます。</p>
                  <p className="font-medium text-gray-300">第8条（準拠法・管轄裁判所）</p>
                  <p>本規約の解釈にあたっては、日本法を準拠法とします。</p>
                </div>
                <div className="border-t border-purple-700/30 pt-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={e => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-purple-500"
                    />
                    <span className="text-sm text-gray-300">
                      <Link href="/terms" target="_blank" className="text-purple-400 hover:text-purple-300 underline">
                        利用規約
                      </Link>
                      を読み、同意します
                    </span>
                  </label>
                </div>
              </div>

              <Turnstile
                onVerify={token => setTurnstileToken(token)}
                onError={() => setError('認証エラーが発生しました')}
              />

              <button
                type="submit"
                disabled={loading || !turnstileToken || !agreedToTerms}
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

          {/* Step2: 確認コード入力 */}
          {step === 'verify' && (
            <div className="space-y-5 py-2">
              <div className="text-center space-y-2">
                <div className="text-6xl">📧</div>
                <h2 className="text-lg font-bold text-white">確認コードを送信しました</h2>
                <p className="text-sm text-gray-400">
                  <span className="text-purple-400 font-medium">{email}</span>{' '}
                  宛に6桁の確認コードを送りました。メールに記載のコードを入力してください。
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="123456"
                  className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-3 text-center text-2xl tracking-[0.4em] font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {resentNote && (
                  <p className="text-sm text-green-400 bg-green-900/20 px-3 py-2 rounded-lg">{resentNote}</p>
                )}
                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
                >
                  {verifying ? '確認中...' : '登録を完了する'}
                </button>
              </form>

              <div className="bg-purple-900/30 rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-400">
                  コードが届かない場合は迷惑メールフォルダをご確認ください。auメールをご利用の場合、「URL付きメール拒否」を有効にしていてもコードは届きます（本メールにURLは含まれません）。
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs text-purple-400 hover:text-purple-300 underline disabled:opacity-50"
                >
                  {resending ? '再送中...' : 'コードを再送する'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setStep('account'); setCode(''); setError(null); setResentNote(null) }}
                className="block w-full text-center text-sm text-gray-500 hover:text-gray-400"
              >
                ← メールアドレスを入力し直す
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}