'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Player } from '@/types'

export default function RegisterDoublesPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [partner, setPartner] = useState('')
  const [opp1, setOpp1] = useState('')
  const [opp2, setOpp2] = useState('')
  const [myScore, setMyScore] = useState('')
  const [oppScore, setOppScore] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: me } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (me) setMyId(me.id)

      const { data: allPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('is_active', true)
        .eq('is_admin', false)
        .order('name')

      if (allPlayers) setPlayers(allPlayers)
    }
    load()
  }, [])

  const selectedIds = [myId, partner, opp1, opp2].filter(Boolean) as string[]

  const availableForPartner = players.filter(p => p.id !== myId && !opp1 && !opp2 ? true : p.id !== opp1 && p.id !== opp2)
  const availableForOpp1 = players.filter(p => p.id !== myId && p.id !== partner && p.id !== opp2)
  const availableForOpp2 = players.filter(p => p.id !== myId && p.id !== partner && p.id !== opp1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myId || !partner || !opp1 || !opp2) {
      setError('4人全員を選択してください')
      return
    }

    const s1 = parseInt(myScore)
    const s2 = parseInt(oppScore)
    if (isNaN(s1) || isNaN(s2)) {
      setError('スコアを入力してください')
      return
    }

    setLoading(true)
    setError(null)

    // ペアの平均RPを取得
    const { data: p1 } = await supabase.from('players').select('doubles_rating').eq('id', myId).single()
    const { data: p2 } = await supabase.from('players').select('doubles_rating').eq('id', partner).single()
    const { data: p3 } = await supabase.from('players').select('doubles_rating').eq('id', opp1).single()
    const { data: p4 } = await supabase.from('players').select('doubles_rating').eq('id', opp2).single()

    if (!p1 || !p2 || !p3 || !p4) {
      setError('プレーヤー情報の取得に失敗しました')
      setLoading(false)
      return
    }

    const pair1AvgRating = Math.round(((p1.doubles_rating ?? 1000) + (p2.doubles_rating ?? 1000)) / 2)
    const pair2AvgRating = Math.round(((p3.doubles_rating ?? 1000) + (p4.doubles_rating ?? 1000)) / 2)

    // Elo計算
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
    const winnerPair = s1 > s2 ? 1 : s1 < s2 ? 2 : null

    // 試合登録
    const { error: matchError } = await supabase.from('doubles_matches').insert({
      pair1_player1_id: myId,
      pair1_player2_id: partner,
      pair2_player1_id: opp1,
      pair2_player2_id: opp2,
      score1: s1,
      score2: s2,
      winner_pair: winnerPair,
      rating_change1: eloResult.change_a,
      rating_change2: eloResult.change_b,
      registered_by: myId,
      mode: 'normal',
    })

    if (matchError) {
      setError('登録に失敗しました: ' + matchError.message)
      setLoading(false)
      return
    }

    // ペア1のRP・勝敗更新
    for (const pid of [myId, partner]) {
      const { data: pl } = await supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses, total_matches').eq('id', pid).single()
      if (!pl) continue
      await supabase.from('players').update({
        doubles_rating: Math.max(600, (pl.doubles_rating ?? 1000) + eloResult.change_a),
        doubles_wins: winnerPair === 1 ? (pl.doubles_wins ?? 0) + 1 : (pl.doubles_wins ?? 0),
        doubles_losses: winnerPair === 2 ? (pl.doubles_losses ?? 0) + 1 : (pl.doubles_losses ?? 0),
        total_matches: (pl.total_matches ?? 0) + 1,
      }).eq('id', pid)
    }

    // ペア2のRP・勝敗更新
    for (const pid of [opp1, opp2]) {
      const { data: pl } = await supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses, total_matches').eq('id', pid).single()
      if (!pl) continue
      await supabase.from('players').update({
        doubles_rating: Math.max(600, (pl.doubles_rating ?? 1000) + eloResult.change_b),
        doubles_wins: winnerPair === 2 ? (pl.doubles_wins ?? 0) + 1 : (pl.doubles_wins ?? 0),
        doubles_losses: winnerPair === 1 ? (pl.doubles_losses ?? 0) + 1 : (pl.doubles_losses ?? 0),
        total_matches: (pl.total_matches ?? 0) + 1,
      }).eq('id', pid)
    }

    // HC更新（試合数のみ加味）
    for (const pid of [myId, partner, opp1, opp2]) {
      const { data: pl } = await supabase.from('players').select('wins, losses, total_score, total_matches').eq('id', pid).single()
      if (!pl) continue
      const { data: hcResult } = await supabase.rpc('calc_hc', {
        p_wins: pl.wins,
        p_losses: pl.losses,
        p_total_score: pl.total_score ?? 0,
        p_total_matches: pl.total_matches ?? 0,
      })
      if (hcResult !== null) {
        await supabase.from('players').update({ hc: hcResult }).eq('id', pid)
      }
    }

    router.push('/mypage')
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-10">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">🎾 ダブルス試合を登録</h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* ペア1 */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-purple-300">ペア1（自分たち）</h2>
            <div>
              <label className="block text-xs text-gray-400 mb-1">自分</label>
              <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
                {players.find(p => p.id === myId)?.name ?? '読み込み中...'}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">パートナー</label>
              <select
                value={partner}
                onChange={e => setPartner(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">選択してください</option>
                {availableForPartner.filter(p => p.id !== myId).map(p => (
                  <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
                ))}
              </select>
            </div>
          </div>

          {/* ペア2 */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-orange-300">ペア2（相手）</h2>
            <div>
              <label className="block text-xs text-gray-400 mb-1">相手1</label>
              <select
                value={opp1}
                onChange={e => setOpp1(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">選択してください</option>
                {availableForOpp1.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">相手2</label>
              <select
                value={opp2}
                onChange={e => setOpp2(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">選択してください</option>
                {availableForOpp2.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
                ))}
              </select>
            </div>
          </div>

          {/* スコア */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">ペア1のスコア</label>
              <input
                type="number"
                min="0"
                max="15"
                value={myScore}
                onChange={e => setMyScore(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <span className="text-gray-400 pb-2 font-bold">-</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">ペア2のスコア</label>
              <input
                type="number"
                min="0"
                max="15"
                value={oppScore}
                onChange={e => setOppScore(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
          >
            {loading ? '登録中...' : '登録する'}
          </button>
        </form>
      </div>
    </div>
  )
}