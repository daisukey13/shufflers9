'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Player = { id: string; name: string; hc: number; rating: number }
type Tournament = { id: string; name: string; status: string; description: string | null }
type Entry = {
  id: string
  status: string
  preferred_dates: string | null
  cancel_requested: boolean
}

export default function EntryClient({
  tournament,
  player,
  existingEntry,
}: {
  tournament: Tournament
  player: Player
  existingEntry: Entry | null
}) {
  const [preferredDates, setPreferredDates] = useState(existingEntry?.preferred_dates ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const canEntry = tournament.status === 'open'

  const handleEntry = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('tournament_entries')
      .insert({
        tournament_id: tournament.id,
        player_id: player.id,
        status: 'entered',
        preferred_dates: preferredDates.trim() || null,
      })

    if (error) {
      setError('エントリーに失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    router.refresh()
  }

  const handleCancelRequest = async () => {
    if (!confirm('キャンセルを申請しますか？管理者が確認後にキャンセルが完了します。')) return
    setLoading(true)

    await supabase
      .from('tournament_entries')
      .update({ cancel_requested: true })
      .eq('id', existingEntry!.id)

    setLoading(false)
    router.refresh()
  }

  const handleUpdateDates = async () => {
    setLoading(true)
    setError(null)

    await supabase
      .from('tournament_entries')
      .update({ preferred_dates: preferredDates.trim() || null })
      .eq('id', existingEntry!.id)

    setLoading(false)
    setSuccess(true)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <Link href="/mypage" className="text-sm text-gray-400 hover:text-white">
            ← マイページ
          </Link>
          <h1 className="text-2xl font-bold mt-2">🏆 大会エントリー</h1>
          <p className="text-gray-300 mt-1">{tournament.name}</p>
        </div>

        {tournament.description && (
          <p className="text-sm text-gray-400 bg-purple-900/20 border border-purple-800/30 rounded-xl p-4">
            {tournament.description}
          </p>
        )}

        {/* ステータス表示 */}
        {!canEntry && !existingEntry && (
          <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
            <p className="text-yellow-400 text-sm">現在エントリーを受け付けていません</p>
          </div>
        )}

        {/* エントリー済み */}
        {existingEntry && (
          <div className={`p-4 border rounded-xl ${
            existingEntry.status === 'cancelled' ? 'bg-gray-900/20 border-gray-700/30' :
            existingEntry.cancel_requested ? 'bg-red-900/20 border-red-700/30' :
            'bg-green-900/20 border-green-700/30'
          }`}>
            {existingEntry.status === 'cancelled' ? (
              <p className="text-gray-400 text-sm">❌ キャンセル済み</p>
            ) : existingEntry.cancel_requested ? (
              <p className="text-yellow-400 text-sm">⚠️ キャンセル申請中（管理者が確認中です）</p>
            ) : (
              <p className="text-green-400 text-sm">✅ エントリー済み</p>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-400 bg-green-900/20 px-3 py-2 rounded-lg">✅ 完了しました！</p>
        )}

        <div className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6 space-y-5">
          {/* プレーヤー情報 */}
          <div>
            <p className="text-sm text-gray-400 mb-1">エントリー者</p>
            <p className="font-semibold text-white">{player.name}</p>
            <p className="text-xs text-gray-400">HC {player.hc} · RP {player.rating}</p>
          </div>

          {/* 希望日程 */}
          {existingEntry?.status !== 'cancelled' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                希望日程・備考
                <span className="text-gray-500 text-xs ml-2">（任意）</span>
              </label>
              <textarea
                value={preferredDates}
                onChange={e => setPreferredDates(e.target.value)}
                rows={3}
                placeholder="例：土日希望、平日夕方可など"
                disabled={existingEntry?.cancel_requested}
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>
          )}

          {/* ボタン */}
          {!existingEntry && canEntry && (
            <button
              onClick={handleEntry}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              {loading ? 'エントリー中...' : 'エントリーする'}
            </button>
          )}

          {existingEntry && existingEntry.status !== 'cancelled' && !existingEntry.cancel_requested && (
            <div className="space-y-2">
              <button
                onClick={handleUpdateDates}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {loading ? '更新中...' : '希望日程を更新'}
              </button>
              <button
                onClick={handleCancelRequest}
                disabled={loading}
                className="w-full bg-red-900/50 hover:bg-red-900/70 disabled:opacity-50 text-red-400 py-2 rounded-lg text-sm font-medium transition"
              >
                キャンセルを申請する
              </button>
            </div>
          )}
        </div>

        <Link
          href={`/tournaments/${tournament.id}`}
          className="block text-center text-purple-400 hover:text-purple-300 text-sm"
        >
          大会詳細を見る →
        </Link>
      </div>
    </div>
  )
}