'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Player = { id: string; name: string; avatar_url: string | null; hc: number; rating: number }
type Entry = {
  id: string
  tournament_id: string
  player_id: string
  status: string
  preferred_dates: string | null
  cancel_requested: boolean
  created_at: string
  player: Player
}
type Tournament = { id: string; name: string; status: string }

export default function EntriesAdminClient({
  tournament,
  entries,
  players,
}: {
  tournament: Tournament
  entries: Entry[]
  players: Player[]
}) {
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const enteredPlayerIds = entries.map(e => e.player_id)

  const handleAddEntry = async () => {
    if (!selectedPlayer) return
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('tournament_entries')
      .insert({
        tournament_id: tournament.id,
        player_id: selectedPlayer,
        status: 'entered',
      })

    if (error) {
      setError('エントリーに失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    setSelectedPlayer('')
    setLoading(false)
    router.refresh()
  }

  const handleCancelApprove = async (entryId: string) => {
    if (!confirm('キャンセルを承認しますか？')) return
    await supabase
      .from('tournament_entries')
      .update({ status: 'cancelled' })
      .eq('id', entryId)
    router.refresh()
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm('エントリーを削除しますか？')) return
    await supabase.from('tournament_entries').delete().eq('id', entryId)
    router.refresh()
  }

  const activeEntries = entries.filter(e => e.status !== 'cancelled')
  const cancelledEntries = entries.filter(e => e.status === 'cancelled')

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📋 エントリー管理</h1>
          <p className="text-sm text-gray-400 mt-1">{tournament.name}</p>
        </div>
        <Link href="/admin/tournaments" className="text-sm text-gray-400 hover:text-white transition">
          ← 大会一覧
        </Link>
      </div>

      {/* 管理者によるエントリー追加 */}
      <div className="p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl space-y-3">
        <h2 className="font-semibold text-gray-300">管理者エントリー登録</h2>
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}
        <div className="flex gap-3">
          <select
            value={selectedPlayer}
            onChange={e => setSelectedPlayer(e.target.value)}
            className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">プレーヤーを選択</option>
            {players
              .filter(p => !enteredPlayerIds.includes(p.id))
              .map(p => (
                <option key={p.id} value={p.id}>{p.name} (HC:{p.hc} RP:{p.rating})</option>
              ))}
          </select>
          <button
            onClick={handleAddEntry}
            disabled={loading || !selectedPlayer}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm font-medium transition"
          >
            追加
          </button>
        </div>
      </div>

      {/* エントリー一覧 */}
      <div>
        <h2 className="font-semibold text-gray-300 mb-3">
          エントリー済み <span className="text-purple-400">{activeEntries.length}名</span>
        </h2>
        <div className="space-y-2">
          {activeEntries.length === 0 ? (
            <p className="text-gray-400 text-sm">エントリーがありません</p>
          ) : (
            activeEntries.map(entry => (
              <div key={entry.id} className={`flex items-center gap-3 p-3 border rounded-xl ${entry.cancel_requested ? 'border-red-700/50 bg-red-900/10' : 'border-purple-800/30 bg-purple-900/20'}`}>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                  {entry.player.avatar_url
                    ? <img src={entry.player.avatar_url} className="w-full h-full object-cover" />
                    : <span className="text-xl flex items-center justify-center h-full">👤</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{entry.player.name}</p>
                  <p className="text-xs text-gray-400">HC {entry.player.hc} · RP {entry.player.rating}</p>
                  {entry.preferred_dates && (
                    <p className="text-xs text-blue-400 mt-0.5">希望日程: {entry.preferred_dates}</p>
                  )}
                  {entry.cancel_requested && (
                    <p className="text-xs text-red-400 mt-0.5">⚠️ キャンセル申請中</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {entry.cancel_requested && (
                    <button
                      onClick={() => handleCancelApprove(entry.id)}
                      className="text-xs px-2 py-1 bg-red-700/50 hover:bg-red-600/50 rounded-lg text-red-300 transition"
                    >
                      キャンセル承認
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-gray-400 transition"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* キャンセル済み */}
      {cancelledEntries.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-500 mb-3">キャンセル済み {cancelledEntries.length}名</h2>
          <div className="space-y-2">
            {cancelledEntries.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 p-3 border border-gray-700/30 bg-gray-900/20 rounded-xl opacity-60">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                  {entry.player.avatar_url
                    ? <img src={entry.player.avatar_url} className="w-full h-full object-cover" />
                    : <span className="text-xl flex items-center justify-center h-full">👤</span>
                  }
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-400">{entry.player.name}</p>
                  <p className="text-xs text-gray-500">キャンセル済み</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
