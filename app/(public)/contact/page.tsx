'use client'

import { useState } from 'react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    })

    if (res.ok) {
      setStatus('success')
      setName('')
      setEmail('')
      setMessage('')
    } else {
      const data = await res.json()
      setErrorMsg(data.error ?? '送信に失敗しました')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-xl mx-auto space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-yellow-100">お問い合わせ</h1>
          <p className="text-gray-400 text-sm">Toyoura Shufflers Club</p>
        </div>

        {status === 'success' ? (
          <div className="p-6 bg-green-900/30 border border-green-700/50 rounded-2xl text-center space-y-3">
            <p className="text-2xl">✅</p>
            <p className="text-green-400 font-semibold">送信が完了しました</p>
            <p className="text-gray-400 text-sm">お問い合わせありがとうございます。内容を確認後、ご連絡いたします。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <label className="text-sm text-gray-300 font-medium">お名前 <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="豊浦 太郎"
                className="w-full px-4 py-3 bg-blue-900/20 border border-yellow-600/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-300 font-medium">メールアドレス <span className="text-red-400">*</span></label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-4 py-3 bg-blue-900/20 border border-yellow-600/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-300 font-medium">お問い合わせ内容 <span className="text-red-400">*</span></label>
              <textarea
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="お気軽にご連絡ください"
                rows={6}
                className="w-full px-4 py-3 bg-blue-900/20 border border-yellow-600/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition resize-none"
              />
            </div>

            {status === 'error' && (
              <p className="text-red-400 text-sm">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-semibold transition"
            >
              {status === 'loading' ? '送信中...' : '送信する'}
            </button>

          </form>
        )}

      </div>
    </div>
  )
}
