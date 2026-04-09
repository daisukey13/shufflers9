'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type SinglesMatch = {
  id: string
  score1: number
  score2: number
  winner_id: string | null
  played_at: string
  rating_change1: number
  rating_change2: number
  player1_id: string
  player2_id: string
  player1: { id: string; name: string } | null
  player2: { id: string; name: string } | null
}

type TeamsMatch = {
  id: string
  score1: number
  score2: number
  winner_id: string | null
  played_at: string
  team1_id: string
  team2_id: string
  team1: { id: string; name: string } | null
  team2: { id: string; name: string } | null
}

type DoublesMatch = {
  id: string
  score1: number
  score2: number
  winner_pair: number | null
  played_at: string
  rating_change1: number
  rating_change2: number
  pair1_player1_id: string
  pair1_player2_id: string
  pair2_player1_id: string
  pair2_player2_id: string
  pair1_player1: { id: string; name: string } | null
  pair1_player2: { id: string; name: string } | null
  pair2_player1: { id: string; name: string } | null
  pair2_player2: { id: string; name: string } | null
}

type EditTarget =
  | { type: 'singles'; match: SinglesMatch }
  | { type: 'teams'; match: TeamsMatch }
  | { type: 'doubles'; match: DoublesMatch }
  | null

export default function AdminMatchesClient({
  singles,
  teams,
  doubles,
}: {
  singles: SinglesMatch[]
  teams: TeamsMatch[]
  doubles: DoublesMatch[]
}) {
  const [tab, setTab] = useState<'singles' | 'doubles' | 'teams'>('singles')
  const [dateFilter, setDateFilter] = useState('')
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const filterByDate = <T extends { played_at: string }>(matches: T[]) => {
    if (!dateFilter) return matches
    return matches.filter(m => m.played_at.startsWith(dateFilter))
  }

  const openEdit = (target: EditTarget) => {
    if (!target) return
    setEditTarget(target)
    setScore1(target.match.score1.toString())
    setScore2(target.match.score2.toString())
    setError(null)
  }

  const handleSave = async () => {
    if (!editTarget) return
    setLoading(true)
    setError(null)

    const s1 = parseInt(score1)
    const s2 = parseInt(score2)

    if (isNaN(s1) || isNaN(s2)) {
      setError('スコアを正しく入力してください')
      setLoading(false)
      return
    }

    if (editTarget.type === 'singles') {
      const winnerId = s1 > s2 ? editTarget.match.player1_id : s1 < s2 ? editTarget.match.player2_id : null
      const { error } = await supabase
        .from('singles_matches')
        .update({ score1: s1, score2: s2, winner_id: winnerId })
        .eq('id', editTarget.match.id)
      if (error) { setError('更新に失敗しました'); setLoading(false); return }

    } else if (editTarget.type === 'teams') {
      const winnerId = s1 > s2 ? editTarget.match.team1_id : s1 < s2 ? editTarget.match.team2_id : null
      const { error } = await supabase
        .from('teams_matches')
        .update({ score1: s1, score2: s2, winner_id: winnerId })
        .eq('id', editTarget.match.id)
      if (error) { setError('更新に失敗しました'); setLoading(false); return }

    } else if (editTarget.type === 'doubles') {
      const winnerPair = s1 > s2 ? 1 : s1 < s2 ? 2 : null
      const { error } = await supabase
        .from('doubles_matches')
        .update({ score1: s1, score2: s2, winner_pair: winnerPair })
        .eq('id', editTarget.match.id)
      if (error) { setError('更新に失敗しました'); setLoading(false); return }
    }

    setEditTarget(null)
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (type: 'singles' | 'teams' | 'doubles', id: string) => {
    if (!confirm('この試合を削除しますか？')) return
    const table = type === 'singles' ? 'singles_matches' : type === 'teams' ? 'teams_matches' : 'doubles_matches'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { alert('削除に失敗しました'); return }
    router.refresh()
  }

  const filteredSingles = filterByDate(singles)
  const filteredDoubles = filterByDate(doubles)
  const filteredTeams = filterByDate(teams)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📋 試合管理</h1>

      {/* タブ */}
      <div className="flex gap-2 bg-black/20 rounded-lg p-1">
        <button
          onClick={() => setTab('singles')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${tab === 'singles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <img src="/shuffleboard-puck-blue.png" className="w-4 h-4 object-contain" />
          シングルス
        </button>
        <button
          onClick={() => setTab('doubles')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${tab === 'doubles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <img src="/shuffleboard-puck-red.png" className="w-4 h-4 object-contain" />
          ダブルス
        </button>
        <div className="flex-1 py-2 rounded-md text-sm font-medium text-gray-600 opacity-40 cursor-not-allowed flex items-center justify-center">
          チーム戦（準備中）
        </div>
      </div>

      {/* 日付フィルター */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">日付で絞り込み：</label>
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-xs text-gray-400 hover:text-white transition"
          >
            クリア
          </button>
        )}
        <span className="text-xs text-gray-500">
          {tab === 'singles' ? filteredSingles.length : tab === 'doubles' ? filteredDoubles.length : filteredTeams.length}件
        </span>
      </div>

      {/* シングルス一覧 */}
      {tab === 'singles' && (
        <div className="space-y-2">
          {filteredSingles.length === 0 ? (
            <p className="text-gray-400 text-sm">試合がありません</p>
          ) : (
            filteredSingles.map(m => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`font-medium ${m.winner_id === m.player1_id ? 'text-white' : 'text-gray-400'}`}>
                      {m.player1?.name ?? '不明'}
                    </span>
                    <span className="font-bold text-white">{m.score1} - {m.score2}</span>
                    <span className={`font-medium ${m.winner_id === m.player2_id ? 'text-white' : 'text-gray-400'}`}>
                      {m.player2?.name ?? '不明'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(m.played_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit({ type: 'singles', match: m })}
                    className="text-xs px-3 py-1 bg-purple-700/50 hover:bg-purple-600/50 rounded-lg text-purple-300 transition"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete('singles', m.id)}
                    className="text-xs px-3 py-1 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-red-400 transition"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ダブルス一覧 */}
      {tab === 'doubles' && (
        <div className="space-y-2">
          {filteredDoubles.length === 0 ? (
            <p className="text-gray-400 text-sm">試合がありません</p>
          ) : (
            filteredDoubles.map(m => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className={`font-medium ${m.winner_pair === 1 ? 'text-white' : 'text-gray-400'}`}>
                      {m.pair1_player1?.name ?? '不明'} / {m.pair1_player2?.name ?? '不明'}
                    </span>
                    <span className="font-bold text-white">{m.score1} - {m.score2}</span>
                    <span className={`font-medium ${m.winner_pair === 2 ? 'text-white' : 'text-gray-400'}`}>
                      {m.pair2_player1?.name ?? '不明'} / {m.pair2_player2?.name ?? '不明'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(m.played_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit({ type: 'doubles', match: m })}
                    className="text-xs px-3 py-1 bg-purple-700/50 hover:bg-purple-600/50 rounded-lg text-purple-300 transition"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete('doubles', m.id)}
                    className="text-xs px-3 py-1 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-red-400 transition"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 編集モーダル */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1e0f3a] border border-purple-800/50 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">スコアを編集</h2>
            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            {editTarget.type === 'doubles' && (
              <div className="text-xs text-gray-400 space-y-1">
                <p>ペア1: {editTarget.match.pair1_player1?.name} / {editTarget.match.pair1_player2?.name}</p>
                <p>ペア2: {editTarget.match.pair2_player1?.name} / {editTarget.match.pair2_player2?.name}</p>
              </div>
            )}

            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">
                  {editTarget.type === 'singles'
                    ? editTarget.match.player1?.name
                    : editTarget.type === 'teams'
                      ? editTarget.match.team1?.name
                      : 'ペア1'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={score1}
                  onChange={e => setScore1(e.target.value)}
                  className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <span className="text-gray-400 mt-4">-</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">
                  {editTarget.type === 'singles'
                    ? editTarget.match.player2?.name
                    : editTarget.type === 'teams'
                      ? editTarget.match.team2?.name
                      : 'ペア2'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={score2}
                  onChange={e => setScore2(e.target.value)}
                  className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {loading ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}