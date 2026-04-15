'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Player = { id: string; name: string; avatar_url: string | null; rating: number; hc: number; doubles_rating: number }
type Team = { id: string; name: string; avatar_url: string | null; rating: number }
type Tournament = { id: string; name: string; type: 'singles' | 'teams' }

export default function AdminMatchRegisterClient({
  players,
  teams,
  tournaments,
}: {
  players: Player[]
  teams: Team[]
  tournaments: Tournament[]
}) {
  const [matchType, setMatchType] = useState<'singles' | 'doubles' | 'teams'>('singles')

  // シングルス用
  const [resultType, setResultType] = useState<'normal' | 'retirement' | 'walkover'>('normal')
  const [player1Id, setPlayer1Id] = useState('')
  const [player2Id, setPlayer2Id] = useState('')
  const [specialWinnerId, setSpecialWinnerId] = useState('')

  // ダブルス用
  const [pair1p1, setPair1p1] = useState('')
  const [pair1p2, setPair1p2] = useState('')
  const [pair2p1, setPair2p1] = useState('')
  const [pair2p2, setPair2p2] = useState('')

  // 共通
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [playedAt, setPlayedAt] = useState(new Date().toISOString().slice(0, 16))
  const [tournamentType, setTournamentType] = useState<'normal' | 'tournament'>('normal')
  const [tournamentId, setTournamentId] = useState('')
  const [rankedPlayers, setRankedPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('players')
        .select('id, name, avatar_url, rating, hc, doubles_rating')
        .eq('is_active', true)
        .eq('is_admin', false)
        .order('rating', { ascending: false })
      if (data) setRankedPlayers(data)
    }
    load()
  }, [])

  const filteredTournaments = tournaments.filter(t => t.type === 'singles')

  const doublesAvailable = (exclude: string[]) =>
    players.filter(p => !exclude.includes(p.id))

  const resetForm = () => {
    setPlayer1Id('')
    setPlayer2Id('')
    setPair1p1('')
    setPair1p2('')
    setPair2p1('')
    setPair2p2('')
    setScore1('')
    setScore2('')
    setSpecialWinnerId('')
    setResultType('normal')
    setTournamentId('')
    setTournamentType('normal')
    setPlayedAt(new Date().toISOString().slice(0, 16))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const s1 = parseInt(score1) || 0
    const s2 = parseInt(score2) || 0

    // ── シングルス ──────────────────────────────────────────────
    if (matchType === 'singles') {
      if (!player1Id || !player2Id) {
        setError('プレーヤーを選択してください')
        setLoading(false)
        return
      }
      if (player1Id === player2Id) {
        setError('同じプレーヤーは選択できません')
        setLoading(false)
        return
      }
      if (resultType !== 'normal' && !specialWinnerId) {
        setError('勝者（または棄権プレーヤー）を選択してください')
        setLoading(false)
        return
      }

      const { data: p1 } = await supabase.from('players').select('rating, wins, losses, total_score, total_matches, hc').eq('id', player1Id).single()
      const { data: p2 } = await supabase.from('players').select('rating, wins, losses, total_score, total_matches, hc').eq('id', player2Id).single()

      if (!p1 || !p2) {
        setError('プレーヤー情報の取得に失敗しました')
        setLoading(false)
        return
      }

      const player1Rank = rankedPlayers.findIndex(p => p.id === player1Id) + 1
      const player2Rank = rankedPlayers.findIndex(p => p.id === player2Id) + 1
      const player1Hc = p1.hc ?? 36
      const player2Hc = p2.hc ?? 36

      if (resultType === 'normal') {
        const { count: matchesP1 } = await supabase.from('singles_matches').select('*', { count: 'exact', head: true }).or(`player1_id.eq.${player1Id},player2_id.eq.${player1Id}`)
        const { count: matchesP2 } = await supabase.from('singles_matches').select('*', { count: 'exact', head: true }).or(`player1_id.eq.${player2Id},player2_id.eq.${player2Id}`)

        const { data: elo, error: eloError } = await supabase.rpc('calc_elo', {
          rating_a: p1.rating,
          rating_b: p2.rating,
          score_a: s1,
          score_b: s2,
          matches_a: matchesP1 ?? 0,
          matches_b: matchesP2 ?? 0,
        })

        if (eloError || !elo?.[0]) {
          setError('レーティング計算に失敗しました')
          setLoading(false)
          return
        }

        const eloResult = elo[0]
        const winnerId = s1 > s2 ? player1Id : s1 < s2 ? player2Id : null

        const { error: matchError } = await supabase.from('singles_matches').insert({
          player1_id: player1Id,
          player2_id: player2Id,
          score1: s1,
          score2: s2,
          winner_id: winnerId,
          rating_change1: eloResult.change_a,
          rating_change2: eloResult.change_b,
          status: 'confirmed',
          played_at: new Date(playedAt).toISOString(),
          tournament_id: tournamentType === 'tournament' && tournamentId ? tournamentId : null,
          player1_hc: player1Hc,
          player2_hc: player2Hc,
          player1_rank: player1Rank || null,
          player2_rank: player2Rank || null,
        })

        if (matchError) {
          setError('登録に失敗しました: ' + matchError.message)
          setLoading(false)
          return
        }

        await supabase.from('players').update({
          rating: eloResult.new_rating_a,
          wins: s1 > s2 ? p1.wins + 1 : p1.wins,
          losses: s1 < s2 ? p1.losses + 1 : p1.losses,
          total_score: (p1.total_score ?? 0) + s1,
          total_matches: (p1.total_matches ?? 0) + 1,
        }).eq('id', player1Id)

        await supabase.from('players').update({
          rating: eloResult.new_rating_b,
          wins: s2 > s1 ? p2.wins + 1 : p2.wins,
          losses: s2 < s1 ? p2.losses + 1 : p2.losses,
          total_score: (p2.total_score ?? 0) + s2,
          total_matches: (p2.total_matches ?? 0) + 1,
        }).eq('id', player2Id)

        const { data: hc1 } = await supabase.rpc('calc_hc', {
          p_wins: s1 > s2 ? p1.wins + 1 : p1.wins,
          p_losses: s1 < s2 ? p1.losses + 1 : p1.losses,
          p_total_score: (p1.total_score ?? 0) + s1,
          p_total_matches: (p1.total_matches ?? 0) + 1,
        })
        if (hc1 !== null) await supabase.from('players').update({ hc: hc1 }).eq('id', player1Id)

        const { data: hc2 } = await supabase.rpc('calc_hc', {
          p_wins: s2 > s1 ? p2.wins + 1 : p2.wins,
          p_losses: s2 < s1 ? p2.losses + 1 : p2.losses,
          p_total_score: (p2.total_score ?? 0) + s2,
          p_total_matches: (p2.total_matches ?? 0) + 1,
        })
        if (hc2 !== null) await supabase.from('players').update({ hc: hc2 }).eq('id', player2Id)

      } else {
        // 途中棄権 or 不戦勝
        const winnerId = resultType === 'retirement'
          ? (specialWinnerId === player1Id ? player2Id : player1Id)
          : specialWinnerId
        const loserId = winnerId === player1Id ? player2Id : player1Id

        const finalScore1 = resultType === 'walkover' ? 0 : s1
        const finalScore2 = resultType === 'walkover' ? 0 : s2

        const { error: matchError } = await supabase.from('singles_matches').insert({
          player1_id: player1Id,
          player2_id: player2Id,
          score1: finalScore1,
          score2: finalScore2,
          winner_id: winnerId,
          rating_change1: 0,
          rating_change2: 0,
          status: resultType,
          played_at: new Date(playedAt).toISOString(),
          tournament_id: tournamentType === 'tournament' && tournamentId ? tournamentId : null,
          player1_hc: player1Hc,
          player2_hc: player2Hc,
          player1_rank: player1Rank || null,
          player2_rank: player2Rank || null,
        })

        if (matchError) {
          setError('登録に失敗しました: ' + matchError.message)
          setLoading(false)
          return
        }

        const winnerData = winnerId === player1Id ? p1 : p2
        const loserData = loserId === player1Id ? p1 : p2

        if (resultType === 'retirement') {
          const winnerScore = winnerId === player1Id ? finalScore1 : finalScore2
          const loserScore = loserId === player1Id ? finalScore1 : finalScore2

          await supabase.from('players').update({
            wins: winnerData.wins + 1,
            total_score: (winnerData.total_score ?? 0) + winnerScore,
            total_matches: (winnerData.total_matches ?? 0) + 1,
          }).eq('id', winnerId)

          await supabase.from('players').update({
            losses: loserData.losses + 1,
            total_score: (loserData.total_score ?? 0) + loserScore,
            total_matches: (loserData.total_matches ?? 0) + 1,
          }).eq('id', loserId)

          const { data: hcW } = await supabase.rpc('calc_hc', {
            p_wins: winnerData.wins + 1,
            p_losses: winnerData.losses,
            p_total_score: (winnerData.total_score ?? 0) + winnerScore,
            p_total_matches: (winnerData.total_matches ?? 0) + 1,
          })
          if (hcW !== null) await supabase.from('players').update({ hc: hcW }).eq('id', winnerId)

          const { data: hcL } = await supabase.rpc('calc_hc', {
            p_wins: loserData.wins,
            p_losses: loserData.losses + 1,
            p_total_score: (loserData.total_score ?? 0) + loserScore,
            p_total_matches: (loserData.total_matches ?? 0) + 1,
          })
          if (hcL !== null) await supabase.from('players').update({ hc: hcL }).eq('id', loserId)

        } else {
          await supabase.from('players').update({ wins: winnerData.wins + 1 }).eq('id', winnerId)
          await supabase.from('players').update({ losses: loserData.losses + 1 }).eq('id', loserId)
        }
      }

    // ── ダブルス ──────────────────────────────────────────────
    } else if (matchType === 'doubles') {
      if (!pair1p1 || !pair1p2 || !pair2p1 || !pair2p2) {
        setError('4人全員を選択してください')
        setLoading(false)
        return
      }
      if (s1 === s2) {
        setError('引き分けは登録できません')
        setLoading(false)
        return
      }

      const [{ data: dp1 }, { data: dp2 }, { data: dp3 }, { data: dp4 }] = await Promise.all([
        supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses, total_matches, wins, losses, total_score').eq('id', pair1p1).single(),
        supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses, total_matches, wins, losses, total_score').eq('id', pair1p2).single(),
        supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses, total_matches, wins, losses, total_score').eq('id', pair2p1).single(),
        supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses, total_matches, wins, losses, total_score').eq('id', pair2p2).single(),
      ])

      if (!dp1 || !dp2 || !dp3 || !dp4) {
        setError('プレーヤー情報の取得に失敗しました')
        setLoading(false)
        return
      }

      const pair1AvgRating = Math.round(((dp1.doubles_rating ?? 1000) + (dp2.doubles_rating ?? 1000)) / 2)
      const pair2AvgRating = Math.round(((dp3.doubles_rating ?? 1000) + (dp4.doubles_rating ?? 1000)) / 2)

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
        played_at: new Date(playedAt).toISOString(),
      })

      if (matchError) {
        setError('登録に失敗しました: ' + matchError.message)
        setLoading(false)
        return
      }

      for (const [pid, pl] of [[pair1p1, dp1], [pair1p2, dp2]] as [string, typeof dp1][]) {
        if (!pl) continue
        await supabase.from('players').update({
          doubles_rating: Math.max(600, (pl.doubles_rating ?? 1000) + eloResult.change_a),
          doubles_wins: winnerPair === 1 ? (pl.doubles_wins ?? 0) + 1 : (pl.doubles_wins ?? 0),
          doubles_losses: winnerPair === 2 ? (pl.doubles_losses ?? 0) + 1 : (pl.doubles_losses ?? 0),
          total_matches: (pl.total_matches ?? 0) + 1,
        }).eq('id', pid)
      }

      for (const [pid, pl] of [[pair2p1, dp3], [pair2p2, dp4]] as [string, typeof dp3][]) {
        if (!pl) continue
        await supabase.from('players').update({
          doubles_rating: Math.max(600, (pl.doubles_rating ?? 1000) + eloResult.change_b),
          doubles_wins: winnerPair === 2 ? (pl.doubles_wins ?? 0) + 1 : (pl.doubles_wins ?? 0),
          doubles_losses: winnerPair === 1 ? (pl.doubles_losses ?? 0) + 1 : (pl.doubles_losses ?? 0),
          total_matches: (pl.total_matches ?? 0) + 1,
        }).eq('id', pid)
      }

      for (const [pid, pl] of [[pair1p1, dp1], [pair1p2, dp2], [pair2p1, dp3], [pair2p2, dp4]] as [string, typeof dp1][]) {
        if (!pl) continue
        const { data: hcResult } = await supabase.rpc('calc_hc', {
          p_wins: pl.wins ?? 0,
          p_losses: pl.losses ?? 0,
          p_total_score: pl.total_score ?? 0,
          p_total_matches: (pl.total_matches ?? 0) + 1,
        })
        if (hcResult !== null) {
          await supabase.from('players').update({ hc: hcResult }).eq('id', pid)
        }
      }
    }

    setSuccess(true)
    setLoading(false)
    resetForm()
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">🏒 試合結果を登録</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-400 bg-green-900/20 px-3 py-2 rounded-lg">✅ 登録しました！</p>
        )}

        {/* 試合種別 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">試合種別</label>
          <div className="flex gap-2 bg-black/20 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setMatchType('singles'); resetForm() }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${matchType === 'singles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <img src="/shuffleboard-puck-blue.png" alt="" className="inline w-5 h-5 mr-1 align-middle" />シングルス戦
            </button>
            <button
              type="button"
              onClick={() => { setMatchType('doubles'); resetForm() }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${matchType === 'doubles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <img src="/shuffleboard-puck-red.png" alt="" className="inline w-5 h-5 mr-1 align-middle" />ダブルス戦
            </button>
            <button
              type="button"
              disabled
              className="flex-1 py-2 rounded-md text-sm font-medium text-gray-600 cursor-not-allowed"
            >
              👥 チーム戦
            </button>
          </div>
        </div>

        {/* ── シングルス：プレーヤー選択 ── */}
        {matchType === 'singles' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">プレーヤー1</label>
                <select
                  value={player1Id}
                  onChange={e => setPlayer1Id(e.target.value)}
                  required
                  className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">選択してください</option>
                  {players.filter(p => p.id !== player2Id).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (RP:{p.rating} HC:{p.hc})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">プレーヤー2</label>
                <select
                  value={player2Id}
                  onChange={e => setPlayer2Id(e.target.value)}
                  required
                  className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">選択してください</option>
                  {players.filter(p => p.id !== player1Id).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (RP:{p.rating} HC:{p.hc})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 結果種別 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">結果種別</label>
              <div className="flex gap-2 bg-black/20 rounded-lg p-1">
                {(['normal', 'retirement', 'walkover'] as const).map(rt => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => { setResultType(rt); setSpecialWinnerId('') }}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition ${resultType === rt ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    {rt === 'normal' ? '通常' : rt === 'retirement' ? '途中棄権' : '不戦勝'}
                  </button>
                ))}
              </div>

              {resultType === 'retirement' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">棄権したプレーヤー</label>
                  <select
                    value={specialWinnerId}
                    onChange={e => setSpecialWinnerId(e.target.value)}
                    required
                    className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">選択してください</option>
                    {[player1Id, player2Id].filter(Boolean).map(id => {
                      const p = players.find(pl => pl.id === id)
                      return p ? <option key={p.id} value={p.id}>{p.name}</option> : null
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">選択したプレーヤーが敗者になります。レーティング変動はありません。</p>
                </div>
              )}

              {resultType === 'walkover' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">不戦勝プレーヤー（勝者）</label>
                  <select
                    value={specialWinnerId}
                    onChange={e => setSpecialWinnerId(e.target.value)}
                    required
                    className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">選択してください</option>
                    {[player1Id, player2Id].filter(Boolean).map(id => {
                      const p = players.find(pl => pl.id === id)
                      return p ? <option key={p.id} value={p.id}>{p.name}</option> : null
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">スコアなし・レーティング変動なし。勝敗のみ記録されます。</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── ダブルス：ペア選択 ── */}
        {matchType === 'doubles' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-purple-300 border-b border-purple-800/30 pb-1">ペア1</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">プレーヤー1</label>
                  <select
                    value={pair1p1}
                    onChange={e => setPair1p1(e.target.value)}
                    required
                    className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">選択してください</option>
                    {doublesAvailable([pair1p2, pair2p1, pair2p2]).map(p => (
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
                    {doublesAvailable([pair1p1, pair2p1, pair2p2]).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-orange-300 border-b border-purple-800/30 pb-1">ペア2</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">プレーヤー1</label>
                  <select
                    value={pair2p1}
                    onChange={e => setPair2p1(e.target.value)}
                    required
                    className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">選択してください</option>
                    {doublesAvailable([pair1p1, pair1p2, pair2p2]).map(p => (
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
                    {doublesAvailable([pair1p1, pair1p2, pair2p1]).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* スコア（不戦勝以外で表示） */}
        {(matchType !== 'singles' || resultType !== 'walkover') && (
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {matchType === 'doubles' ? 'ペア1' : 'プレーヤー1'}のスコア
                {matchType === 'singles' && resultType === 'retirement' && <span className="text-gray-500 ml-1">（任意）</span>}
              </label>
              <input
                type="number"
                min="0"
                value={score1}
                onChange={e => setScore1(e.target.value)}
                required={matchType !== 'singles' || resultType === 'normal'}
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <span className="text-gray-400 pb-2 font-bold text-xl">-</span>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {matchType === 'doubles' ? 'ペア2' : 'プレーヤー2'}のスコア
                {matchType === 'singles' && resultType === 'retirement' && <span className="text-gray-500 ml-1">（任意）</span>}
              </label>
              <input
                type="number"
                min="0"
                value={score2}
                onChange={e => setScore2(e.target.value)}
                required={matchType !== 'singles' || resultType === 'normal'}
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {/* 日時 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">試合日時</label>
          <input
            type="datetime-local"
            value={playedAt}
            onChange={e => setPlayedAt(e.target.value)}
            required
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 通常/大会（シングルスのみ） */}
        {matchType === 'singles' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">試合種類</label>
            <div className="flex gap-2 bg-black/20 rounded-lg p-1 mb-3">
              <button
                type="button"
                onClick={() => { setTournamentType('normal'); setTournamentId('') }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${tournamentType === 'normal' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                通常試合
              </button>
              <button
                type="button"
                onClick={() => setTournamentType('tournament')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${tournamentType === 'tournament' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                大会
              </button>
            </div>

            {tournamentType === 'tournament' && (
              <select
                value={tournamentId}
                onChange={e => setTournamentId(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">大会を選択してください</option>
                {filteredTournaments.length === 0 ? (
                  <option disabled>該当する大会がありません</option>
                ) : (
                  filteredTournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))
                )}
              </select>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition"
        >
          {loading ? '登録中...' : '試合結果を登録'}
        </button>
      </form>
    </div>
  )
}
