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
  rating_change1: number
  rating_change2: number
  team1_id: string
  team2_id: string
  team1: { id: string; name: string } | null
  team2: { id: string; name: string } | null
}

type EditTarget =
  | { type: 'singles'; match: SinglesMatch }
  | { type: 'teams'; match: TeamsMatch }
  | null

export default function AdminMatchesClient({
  singles,
  teams,
}: {
  singles: SinglesMatch[]
  teams: TeamsMatch[]
}) {
  const [tab, setTab] = useState<'singles' | 'teams'>('singles')
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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

    const winnerId = s1 > s2
      ? (editTarget.type === 'singles' ? editTarget.match.player1_id : editTarget.match.team1_id)
      : s1 < s2
      ? (editTarget.type === 'singles' ? editTarget.match.player2_id : editTarget.match.team2_id)
      : null

    const table = editTarget.type === 'singles' ? 'singles_matches' : 'teams_matches'

    const { error } = await supabase
      .from(table)
      .update({ score1: s1, score2: s2, winner_id: winnerId })
      .eq('id', editTarget.match.id)

    if (error) {
      setError('更新に失敗しました')
      setLoading(false)
      return
    }

    setEditTarget(null)
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (type: 'singles' | 'teams', id: string) => {
    if (!confirm('この試合を削除しますか？')) return

    const table = type === 'singles' ? 'singles_matches' : 'teams_matches'
    const { error } = await supabase.from(table).delete().eq('id', id)

    if (error) {
      alert('削除に失敗しました')
      return
    }

    router.refresh()
  }

  const renderMatch = (match: SinglesMatch | TeamsMatch, type: 'singles' | 'teams') => {
    const name1 = type === 'singles'
      ? (match as SinglesMatch).player1?.name
      : (match as TeamsMatch).team1?.name
    const name2 = type === 'singles'
      ? (match as SinglesMatch).player2?.name
      : (match as TeamsMatch).team2?.name

    return (
      <div
        key={match.id}
        className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className={`font-medium ${match.winner_id === (type === 'singles' ? (match as SinglesMatch).player1_id : (match as TeamsMatch).team1_id) ? 'text-white' : 'text-gray-400'}`}>
              {name1 ?? '不明'}
            </span>
            <span className="font-bold text-white">{match.score1} - {match.score2}</span>
            <span className={`font-medium ${match.winner_id === (type === 'singles' ? (match as SinglesMatch).player2_id : (match as TeamsMatch).team2_id) ? 'text-white' : 'text-gray-400'}`}>
              {name2 ?? '不明'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(match.played_at).toLocaleDateString('ja-JP')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openEdit({ type, match } as EditTarget)}
            className="text-xs px-3 py-1 bg-purple-700/50 hover:bg-purple-600/50 rounded-lg text-purple-300 transition"
          >
            編集
          </button>
          <button
            onClick={() => handleDelete(type, match.id)}
            className="text-xs px-3 py-1 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-red-400 transition"
          >
            削除
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🏒 試合管理</h1>

      {/* タブ */}
      <div className="flex gap-2">
        {(['singles', 'teams'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t
                ? 'bg-purple-600 text-white'
                : 'bg-purple-900/20 text-gray-400 hover:text-white'
            }`}
          >
            {t === 'singles' ? '個人戦' : 'チーム戦'}
          </button>
        ))}
      </div>

      {/* 試合一覧 */}
      <div className="space-y-2">
        {tab === 'singles' && (
          singles.length === 0
            ? <p className="text-gray-400 text-sm">試合がありません</p>
            : singles.map(m => renderMatch(m, 'singles'))
        )}
        {tab === 'teams' && (
          teams.length === 0
            ? <p className="text-gray-400 text-sm">試合がありません</p>
            : teams.map(m => renderMatch(m, 'teams'))
        )}
      </div>

      {/* 編集モーダル */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1e0f3a] border border-purple-800/50 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">スコアを編集</h2>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">
                  {editTarget.type === 'singles'
                    ? (editTarget.match as SinglesMatch).player1?.name
                    : (editTarget.match as TeamsMatch).team1?.name}
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
                    ? (editTarget.match as SinglesMatch).player2?.name
                    : (editTarget.match as TeamsMatch).team2?.name}
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