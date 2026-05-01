'use client'

import { useState } from 'react'

type PlayerInfo = { id: string; name: string }

export default function InactiveCheckPage() {
  const [preview, setPreview] = useState<PlayerInfo[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<{ count: number; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePreview = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/admin/deactivate-inactive', { method: 'GET' })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setPreview(data.deactivated)
    } catch {
      setError('通信エラー')
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!preview || preview.length === 0) return
    if (!confirm(`${preview.length}名を非アクティブにします。よろしいですか？`)) return
    setExecuting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/deactivate-inactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setResult({ count: data.count, message: data.message })
      setPreview(null)
    } catch {
      setError('通信エラー')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">🔴 非アクティブ化チェック</h1>
        <p className="text-sm text-gray-400 mt-1">
          直近1年間（365日）に1試合も出場していない会員を非アクティブに設定します。<br />
          毎日深夜に自動実行されます。手動実行も可能です。
        </p>
      </div>

      <div className="p-4 bg-yellow-900/20 border border-yellow-600/40 rounded-xl text-sm text-yellow-200">
        ⚠️ 非アクティブになると、ランキングや選手一覧から非表示になります。<br />
        管理者が手動で再アクティブ化することも可能です（選手編集ページから）。
      </div>

      {error && (
        <p className="text-red-400 bg-red-900/20 px-3 py-2 rounded-lg text-sm">{error}</p>
      )}

      {result && (
        <div className="p-4 bg-green-900/20 border border-green-600/40 rounded-xl text-green-300 text-sm">
          ✅ {result.message}
        </div>
      )}

      <button
        onClick={handlePreview}
        disabled={loading}
        className="px-5 py-2.5 bg-blue-700/50 hover:bg-blue-600/60 border border-blue-600/40 rounded-xl text-sm text-white transition disabled:opacity-50"
      >
        {loading ? '確認中...' : '🔍 対象者をプレビュー'}
      </button>

      {preview !== null && (
        <div className="space-y-4">
          {preview.length === 0 ? (
            <p className="text-gray-400 text-sm">対象者はいません（全員が直近1年以内に出場済み）</p>
          ) : (
            <>
              <p className="text-sm text-gray-300">
                以下の <span className="text-red-400 font-bold">{preview.length}名</span> が1年以上試合なし：
              </p>
              <div className="space-y-2">
                {preview.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-red-900/20 border border-red-800/30 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-sm text-white">{p.name}</span>
                    <span className="text-xs text-gray-500 ml-auto font-mono">{p.id.slice(0, 8)}…</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleExecute}
                disabled={executing}
                className="px-5 py-2.5 bg-red-700/60 hover:bg-red-600/70 border border-red-600/50 rounded-xl text-sm text-white font-bold transition disabled:opacity-50"
              >
                {executing ? '処理中...' : `🔴 ${preview.length}名を非アクティブ化する`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
