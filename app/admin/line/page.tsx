'use client'

import { useState } from 'react'

const TEMPLATES = [
  {
    label: '📋 組み合わせ発表',
    text: '【組み合わせ発表】予選の組み合わせが発表されました。サイトでご確認ください。\nhttps://toyoura.online/notices',
  },
  {
    label: '🏆 大会結果',
    text: '【大会結果】試合結果が更新されました。ランキングサイトでご確認ください。\nhttps://toyoura.online',
  },
  {
    label: '📢 お知らせ',
    text: '【お知らせ】新着お知らせが投稿されました。サイトをご確認ください。\nhttps://toyoura.online/notices',
  },
  {
    label: '🗓️ 大会エントリー受付中',
    text: '【エントリー受付中】大会のエントリーを受け付けています。サイトからお申し込みください。\nhttps://toyoura.online/tournaments',
  },
  {
    label: '📅 スケジュール更新',
    text: '【スケジュール更新】練習・イベントの日程が更新されました。スケジュールページでご確認ください。\nhttps://toyoura.online/schedule',
  },
]

export default function LineNotificationPage() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSend = async () => {
    if (!message.trim()) return
    if (!confirm(`以下のメッセージをLINEフォロワー全員に送信しますか？\n\n${message.trim()}`)) return

    setLoading(true)
    setResult(null)

    const res = await fetch('/api/line/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setResult({ type: 'error', text: data.error ?? '送信に失敗しました' })
    } else {
      setResult({ type: 'success', text: '✅ LINEフォロワー全員に送信しました' })
      setMessage('')
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">💬 LINE通知送信</h1>

      <div className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6 space-y-5">
        {/* テンプレート */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">テンプレートから選択</p>
          <div className="grid grid-cols-1 gap-2">
            {TEMPLATES.map(t => (
              <button
                key={t.label}
                type="button"
                onClick={() => setMessage(t.text)}
                className="text-left px-3 py-2 bg-purple-900/30 border border-purple-700/40 rounded-lg text-sm text-gray-300 hover:bg-purple-900/50 hover:text-white transition"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* メッセージ入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            送信メッセージ
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={6}
            placeholder="送信するメッセージを入力..."
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">{message.length} 文字</p>
        </div>

        {/* 結果表示 */}
        {result && (
          <div className={`px-3 py-2 rounded-lg text-sm ${
            result.type === 'success'
              ? 'bg-green-900/20 text-green-400'
              : 'bg-red-900/20 text-red-400'
          }`}>
            {result.text}
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !message.trim()}
          className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          {loading ? '送信中...' : '📤 LINEフォロワー全員に送信'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          ※ LINE公式アカウントを友だち追加したフォロワー全員に配信されます
        </p>
      </div>
    </div>
  )
}
