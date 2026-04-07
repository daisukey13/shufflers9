'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Player = { id: string; name: string; avatar_url: string | null; rating: number; hc: number }
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
  const [matchType, setMatchType] = useState<'singles' | 'teams'>('singles')
  const [player1Id, setPlayer1Id] = useState('')
  const [player2Id, setPlayer2Id] = useState('')
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')
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

  // ランキング順のプレーヤーリストを取得
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('players')
        .select('id, name, avatar_url, rating, hc')
        .eq('is_active', true)
        .eq('is_admin', false)
        .order('rating', { ascending: false })
      if (data) setRankedPlayers(data)
    }
    load()
  }, [])

  const filteredTournaments = tournaments.filter(t => t.type === matchType)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const s1 = parseInt(score1)
    const s2 = parseInt(score2)

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

      const { data: p1 } = await supabase.from('players').select('rating, wins, losses, total_score, total_matches, hc').eq('id', player1Id).single()
      const { data: p2 } = await supabase.from('players').select('rating, wins, losses, total_score, total_matches, hc').eq('id', player2Id).single()

      if (!p1 || !p2) {
        setError('プレーヤー情報の取得に失敗しました')
        setLoading(false)
        return
      }

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

      // 登録時点のランクとHCを保存
      const player1Rank = rankedPlayers.findIndex(p => p.id === player1Id) + 1
      const player2Rank = rankedPlayers.findIndex(p => p.id === player2Id) + 1
      const player1Hc = p1.hc ?? 36
      const player2Hc = p2.hc ?? 36

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
      if (!team1Id || !team2Id) {
        setError('チームを選択してください')
        setLoading(false)
        return
      }
      if (team1Id === team2Id) {
        setError('同じチームは選択できません')
        setLoading(false)
        return
      }

      const { data: t1 } = await supabase.from('teams').select('rating, wins, losses').eq('id', team1Id).single()
      const { data: t2 } = await supabase.from('teams').select('rating, wins, losses').eq('id', team2Id).single()

      if (!t1 || !t2) {
        setError('チーム情報の取得に失敗しました')
        setLoading(false)
        return
      }

      const { data: elo, error: eloError } = await supabase.rpc('calc_elo', {
        rating_a: t1.rating,
        rating_b: t2.rating,
        score_a: s1,
        score_b: s2,
      })

      if (eloError || !elo?.[0]) {
        setError('レーティング計算に失敗しました')
        setLoading(false)
        return
      }

      const eloResult = elo[0]
      const winnerId = s1 > s2 ? team1Id : s1 < s2 ? team2Id : null

      const { error: matchError } = await supabase.from('teams_matches').insert({
        team1_id: team1Id,
        team2_id: team2Id,
        score1: s1,
        score2: s2,
        winner_id: winnerId,
        rating_change1: eloResult.change_a,
        rating_change2: eloResult.change_b,
        status: 'confirmed',
        played_at: new Date(playedAt).toISOString(),
        tournament_id: tournamentType === 'tournament' && tournamentId ? tournamentId : null,
      })

      if (matchError) {
        setError('登録に失敗しました: ' + matchError.message)
        setLoading(false)
        return
      }

      await supabase.from('teams').update({
        rating: eloResult.new_rating_a,
        wins: s1 > s2 ? t1.wins + 1 : t1.wins,
        losses: s1 < s2 ? t1.losses + 1 : t1.losses,
      }).eq('id', team1Id)

      await supabase.from('teams').update({
        rating: eloResult.new_rating_b,
        wins: s2 > s1 ? t2.wins + 1 : t2.wins,
        losses: s2 < s1 ? t2.losses + 1 : t2.losses,
      }).eq('id', team2Id)
    }

    setSuccess(true)
    setLoading(false)
    setPlayer1Id('')
    setPlayer2Id('')
    setTeam1Id('')
    setTeam2Id('')
    setScore1('')
    setScore2('')
    setTournamentId('')
    setPlayedAt(new Date().toISOString().slice(0, 16))
  }

  return (
    <div className="space-y-6 max-w-2xl">
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
              onClick={() => { setMatchType('singles'); setTournamentId('') }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${matchType === 'singles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              🏒 個人戦
            </button>
            <button
              type="button"
              onClick={() => { setMatchType('teams'); setTournamentId('') }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${matchType === 'teams' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              👥 チーム戦
            </button>
          </div>
        </div>

        {/* プレーヤー/チーム選択 */}
        {matchType === 'singles' ? (
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
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">チーム1</label>
              <select
                value={team1Id}
                onChange={e => setTeam1Id(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">選択してください</option>
                {teams.filter(t => t.id !== team2Id).map(t => (
                  <option key={t.id} value={t.id}>{t.name} (RP:{t.rating})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">チーム2</label>
              <select
                value={team2Id}
                onChange={e => setTeam2Id(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">選択してください</option>
                {teams.filter(t => t.id !== team1Id).map(t => (
                  <option key={t.id} value={t.id}>{t.name} (RP:{t.rating})</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* スコア */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {matchType === 'singles' ? 'プレーヤー1' : 'チーム1'}のスコア
            </label>
            <input
              type="number"
              min="0"
              value={score1}
              onChange={e => setScore1(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <span className="text-gray-400 pb-2 font-bold text-xl">-</span>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {matchType === 'singles' ? 'プレーヤー2' : 'チーム2'}のスコア
            </label>
            <input
              type="number"
              min="0"
              value={score2}
              onChange={e => setScore2(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

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

        {/* 通常/大会 */}
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