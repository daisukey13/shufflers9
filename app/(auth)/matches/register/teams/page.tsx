'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Team } from '@/types'

export default function RegisterTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [myTeamId, setMyTeamId] = useState('')
  const [opponentTeamId, setOpponentTeamId] = useState('')
  const [myScore, setMyScore] = useState('')
  const [oppScore, setOppScore] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('teams')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (data) setTeams(data)
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myTeamId || !opponentTeamId) return
    if (myTeamId === opponentTeamId) {
      setError('対戦相手は別のチームを選んでください')
      return
    }

    setLoading(true)
    setError(null)

    const s1 = parseInt(myScore)
    const s2 = parseInt(oppScore)

    const { data: team1 } = await supabase.from('teams').select('rating, wins, losses').eq('id', myTeamId).single()
    const { data: team2 } = await supabase.from('teams').select('rating, wins, losses').eq('id', opponentTeamId).single()

    if (!team1 || !team2) {
      setError('チーム情報の取得に失敗しました')
      setLoading(false)
      return
    }

    const { data: elo, error: eloError } = await supabase.rpc('calc_elo', {
      rating_a: team1.rating,
      rating_b: team2.rating,
      score_a: s1,
      score_b: s2,
    })

    if (eloError || !elo?.[0]) {
      setError('レーティング計算に失敗しました')
      setLoading(false)
      return
    }

    const eloResult = elo[0]
    const winnerId = s1 > s2 ? myTeamId : s1 < s2 ? opponentTeamId : null

    const { error: matchError } = await supabase.from('teams_matches').insert({
      team1_id: myTeamId,
      team2_id: opponentTeamId,
      score1: s1,
      score2: s2,
      winner_id: winnerId,
      rating_change1: eloResult.change_a,
      rating_change2: eloResult.change_b,
      status: 'confirmed',
    })

    if (matchError) {
      setError(`登録に失敗しました: ${matchError.message}`)
      setLoading(false)
      return
    }

    await supabase.from('teams').update({
      rating: eloResult.new_rating_a,
      wins: s1 > s2 ? team1.wins + 1 : team1.wins,
      losses: s1 < s2 ? team1.losses + 1 : team1.losses,
    }).eq('id', myTeamId)

    await supabase.from('teams').update({
      rating: eloResult.new_rating_b,
      wins: s2 > s1 ? team2.wins + 1 : team2.wins,
      losses: s2 < s1 ? team2.losses + 1 : team2.losses,
    }).eq('id', opponentTeamId)

    router.push('/mypage')
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-10">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">👥 チーム戦を登録</h1>

        <form onSubmit={handleSubmit} className="space-y-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">自分のチーム</label>
            <select
              value={myTeamId}
              onChange={e => setMyTeamId(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">対戦相手チーム</label>
            <select
              value={opponentTeamId}
              onChange={e => setOpponentTeamId(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {teams.filter(t => t.id !== myTeamId).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">自チームのスコア</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">相手チームのスコア</label>
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