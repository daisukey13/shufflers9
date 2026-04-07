'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Player } from '@/types'

export default function RegisterSinglesPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [opponent, setOpponent] = useState('')
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
        .order('rating', { ascending: false })

      if (allPlayers) setPlayers(allPlayers)
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myId || !opponent || myScore === '' || oppScore === '') return
    if (myId === opponent) {
      setError('対戦相手は自分以外を選んでください')
      return
    }

    setLoading(true)
    setError(null)

    const s1 = parseInt(myScore)
    const s2 = parseInt(oppScore)

    const { data: me } = await supabase.from('players').select('rating').eq('id', myId).single()
    const { data: opp } = await supabase.from('players').select('rating').eq('id', opponent).single()

    if (!me || !opp) {
      setError('プレーヤー情報の取得に失敗しました')
      setLoading(false)
      return
    }

    const { count: matchesMe } = await supabase
      .from('singles_matches')
      .select('*', { count: 'exact', head: true })
      .or(`player1_id.eq.${myId},player2_id.eq.${myId}`)

    const { count: matchesOpp } = await supabase
      .from('singles_matches')
      .select('*', { count: 'exact', head: true })
      .or(`player1_id.eq.${opponent},player2_id.eq.${opponent}`)

    const { data: elo, error: eloError } = await supabase.rpc('calc_elo', {
      rating_a: me.rating,
      rating_b: opp.rating,
      score_a: s1,
      score_b: s2,
      matches_a: matchesMe ?? 0,
      matches_b: matchesOpp ?? 0,
    })

    if (eloError || !elo?.[0]) {
      setError(`レーティング計算に失敗しました: ${eloError?.message ?? '不明なエラー'}`)
      setLoading(false)
      return
    }

    const eloResult = elo[0]
    const winnerId = s1 > s2 ? myId : s1 < s2 ? opponent : null

    // 登録時点のランクとHCを保存
    const player1Rank = players.findIndex(p => p.id === myId) + 1
    const player2Rank = players.findIndex(p => p.id === opponent) + 1
    const player1Hc = players.find(p => p.id === myId)?.hc ?? 36
    const player2Hc = players.find(p => p.id === opponent)?.hc ?? 36

    const { error: matchError } = await supabase.from('singles_matches').insert({
      player1_id: myId,
      player2_id: opponent,
      score1: s1,
      score2: s2,
      winner_id: winnerId,
      rating_change1: eloResult.change_a,
      rating_change2: eloResult.change_b,
      registered_by: myId,
      status: 'confirmed',
      player1_hc: player1Hc,
      player2_hc: player2Hc,
      player1_rank: player1Rank,
      player2_rank: player2Rank,
    })

    if (matchError) {
      setError(`登録に失敗しました: ${matchError.message}`)
      setLoading(false)
      return
    }

    await supabase.from('players').update({
      rating: eloResult.new_rating_a,
      wins: s1 > s2 ? players.find(p => p.id === myId)!.wins + 1 : players.find(p => p.id === myId)!.wins,
      losses: s1 < s2 ? players.find(p => p.id === myId)!.losses + 1 : players.find(p => p.id === myId)!.losses,
      total_score: (players.find(p => p.id === myId)?.total_score ?? 0) + s1,
      total_matches: (players.find(p => p.id === myId)?.total_matches ?? 0) + 1,
    }).eq('id', myId)

    await supabase.from('players').update({
      rating: eloResult.new_rating_b,
      wins: s2 > s1 ? players.find(p => p.id === opponent)!.wins + 1 : players.find(p => p.id === opponent)!.wins,
      losses: s2 < s1 ? players.find(p => p.id === opponent)!.losses + 1 : players.find(p => p.id === opponent)!.losses,
      total_score: (players.find(p => p.id === opponent)?.total_score ?? 0) + s2,
      total_matches: (players.find(p => p.id === opponent)?.total_matches ?? 0) + 1,
    }).eq('id', opponent)

    const { data: hcResult } = await supabase.rpc('calc_hc', {
      p_wins: s1 > s2 ? players.find(p => p.id === myId)!.wins + 1 : players.find(p => p.id === myId)!.wins,
      p_losses: s1 < s2 ? players.find(p => p.id === myId)!.losses + 1 : players.find(p => p.id === myId)!.losses,
      p_total_score: (players.find(p => p.id === myId)?.total_score ?? 0) + s1,
      p_total_matches: (players.find(p => p.id === myId)?.total_matches ?? 0) + 1,
    })
    if (hcResult !== null) {
      await supabase.from('players').update({ hc: hcResult }).eq('id', myId)
    }

    router.push('/mypage')
  }

  const opponentPlayers = players.filter(p => p.id !== myId)

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-10">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">🏒 個人戦を登録</h1>

        <form onSubmit={handleSubmit} className="space-y-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">対戦相手</label>
            <select
              value={opponent}
              onChange={e => setOpponent(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {opponentPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">自分のスコア</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">相手のスコア</label>
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