'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Player } from '@/types'

export default function AdminRegisterDoublesPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [pair1p1, setPair1p1] = useState('')
  const [pair1p2, setPair1p2] = useState('')
  const [pair2p1, setPair2p1] = useState('')
  const [pair2p2, setPair2p2] = useState('')
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('is_active', true)
        .eq('is_admin', false)
        .order('name')
      if (data) setPlayers(data)
    }
    load()
  }, [])

  const available = (exclude: string[]) =>
    players.filter(p => !exclude.includes(p.id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pair1p1 || !pair1p2 || !pair2p1 || !pair2p2) {
      setError('4人全員を選択してください')
      return
    }

    const s1 = parseInt(score1)
    const s2 = parseInt(score2)
    if (isNaN(s1) || isNaN(s2)) {
      setError('スコアを入力してください')
      return
    }
    if (s1 === s2) {
      setError('引き分けは登録できません')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: p1 } = await supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses, total_matches, wins, losses, total_score').eq('id', pair1p1).single()
      const { data: p2 } = await supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses, total_matches, wins, losses, total_score').eq('id', pair1p2).single()
      const { data: p3 } = await supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses, total_matches, wins, losses, total_score').eq('id', pair2p1).single()
      const { data: p4 } = await supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses, total_matches, wins, losses, total_score').eq('id', pair2p2).single()

      if (!p1 || !p2 || !p3 || !p4) {
        setError('プレーヤー情報の取得に失敗しました')
        setLoading(false)
        return
      }

      const pair1AvgRating = Math.round(((p1.doubles_rating ?? 1000) + (p2.doubles_rating ?? 1000)) / 2)
      const pair2AvgRating = Math.round(((p3.doubles_rating ?? 1000) + (p4.doubles_rating ?? 1000)) / 2)

      const { data: elo, error: eloError } = await supabase.rpc('calc_elo', {
        rating_a: pair1AvgRating,
        rating_b: pair2AvgRating,
        score_a: s1,
        score_b: s2,
        matches_a: 0,
        matches_b: 0,
      })

      if (eloError || !elo?.[0]) {
        setError('レーティング計算に失敗しました')
        setLoading(false)
        return
      }

      const eloResult = elo[0]
      const winnerPair = s1 > s2 ? 1 : 2

      const { error: matchError } = await supabase.from('doubles_matches').insert({
        pair1_player1_id: pair1p1,
        pair1_player2_id: pair1p2,
        pair2_player1_id: pair2p1,
        pair2_player2_id: pair2p2,
        score1: s1,
        score2: s2,
        winner_pair: winnerPair,
        rating_change1: eloResult.change_a,
        rating_change2: eloResult.change_b,
        mode: 'normal',
      })

      if (matchError) {
        setError('登録に失敗しました: ' + matchError.message)
        setLoading(false)
        return
      }

      for (const [pid, pl] of [[pair1p1, p1], [pair1p2, p2]] as [string, typeof p1][]) {
        if (!pl) continue
        await supabase.from('players').update({
          doubles_rating: Math.max(600, (pl.doubles_rating ?? 1000) + eloResult.change_a),
          doubles_wins: winnerPair === 1 ? (pl.doubles_wins ?? 0) + 1 : (pl.doubles_wins ?? 0),
          doubles_losses: winnerPair === 2 ? (pl.doubles_losses ?? 0) + 1 : (pl.doubles_losses ?? 0),
          total_matches: (pl.total_matches ?? 0) + 1,
        }).eq('id', pid)
      }

      for (const [pid, pl] of [[pair2p1, p3], [pair2p2, p4]] as [string, typeof p3][]) {
        if (!pl) continue
        await supabase.from('players').update({
          doubles_rating: Math.max(600, (pl.doubles_rating ?? 1000) + eloResult.change_b),
          doubles_wins: winnerPair === 2 ? (pl.doubles_wins ?? 0) + 1 : (pl.doubles_wins ?? 0),
          doubles_losses: winnerPair === 1 ? (pl.doubles_losses ?? 0) + 1 : (pl.doubles_losses ?? 0),
          total_matches: (pl.total_matches ?? 0) + 1,
        }).eq('id', pid)
      }

      for (const [pid, pl] of [
        [pair1p1, p1], [pair1p2, p2], [pair2p1, p3], [pair2p2, p4]
      ] as [string, typeof p1][]) {
        if (!pl) continue
        const newTotalMatches = (pl.total_matches ?? 0) + 1
        const { data: hcResult } = await supabase.rpc('calc_hc', {
          p_wins: pl.wins ?? 0,
          p_losses: pl.losses ?? 0,
          p_total_score: pl.total_score ?? 0,
          p_total_matches: newTotalMatches,
        })
        if (hcResult !== null) {
          await supabase.from('players').update({ hc: hcResult }).eq('id', pid)
        }
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/admin/matches')
        router.refresh()
      }, 1000)

    } catch (err) {
      setError('予期しないエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎾 ダブルス試合登録</h1>
        <Link href="/admin/matches" className="text-sm text-gray-400 hover:text-white transition">
          ← 試合管理
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-400 bg-green-900/20 px-3 py-2 rounded-lg">✅ 登録しました！</p>
        )}

        {/* ペア1 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-purple-300 border-b border-purple-800/30 pb-1">ペア1</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1">プレーヤー1</label>
            <select
              value={pair1p1}
              onChange={e => setPair1p1(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {available([pair1p2, pair2p1, pair2p2]).map(p => (
                <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">プレーヤー2</label>
            <select
              value={pair1p2}
              onChange={e => setPair1p2(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {available([pair1p1, pair2p1, pair2p2]).map(p => (
                <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
              ))}
            </select>
          </div>
        </div>

        {/* ペア2 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-orange-300 border-b border-purple-800/30 pb-1">ペア2</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1">プレーヤー1</label>
            <select
              value={pair2p1}
              onChange={e => setPair2p1(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {available([pair1p1, pair1p2, pair2p2]).map(p => (
                <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">プレーヤー2</label>
            <select
              value={pair2p2}
              onChange={e => setPair2p2(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {available([pair1p1, pair1p2, pair2p1]).map(p => (
                <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
              ))}
            </select>
          </div>
        </div>

        {/* スコア */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 border-b border-purple-800/30 pb-1 mb-3">スコア</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">ペア1のスコア</label>
              <input
                type="number"
                min="0"
                max="15"
                value={score1}
                onChange={e => setScore1(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <span className="text-gray-400 pb-2 font-bold text-lg">-</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">ペア2のスコア</label>
              <input
                type="number"
                min="0"
                max="15"
                value={score2}
                onChange={e => setScore2(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          {loading ? '登録中...' : success ? '登録完了！' : '登録する'}
        </button>
      </form>
    </div>
  )
}