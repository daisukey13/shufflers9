import { getRecentSinglesMatches, getRecentTeamsMatches } from '@/lib/queries/matches'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function MatchesPage() {
  const supabase = await createClient()

  const [singles, teams] = await Promise.all([
    getRecentSinglesMatches(30),
    getRecentTeamsMatches(30),
  ])

  // 大会予選試合を取得
  const { data: qualifyingMatches } = await supabase
    .from('tournament_qualifying_matches')
    .select('*, block:tournament_blocks(block_name, tournament:tournaments(id, name)), player1:players!player1_id(id, name, avatar_url), player2:players!player2_id(id, name, avatar_url)')
    .eq('mode', 'normal')
    .order('played_at', { ascending: false })
    .limit(30)

  // 大会本戦試合を取得
  const { data: finalsMatches } = await supabase
    .from('tournament_finals_matches')
    .select('*, tournament:tournaments(id, name), player1:players!player1_id(id, name, avatar_url), player2:players!player2_id(id, name, avatar_url), tournament_finals_sets(*)')
    .eq('mode', 'normal')
    .order('played_at', { ascending: false })
    .limit(30)

  // 全試合を日時降順でまとめる
  type MatchItem = {
    id: string
    played_at: string
    type: 'singles' | 'teams' | 'qualifying' | 'finals'
    tournamentName?: string
    tournamentId?: string
    blockName?: string
    winnerId: string | null
    player1Id: string
    player2Id: string
    player1Name: string
    player2Name: string
    player1Avatar: string | null
    player2Avatar: string | null
    score1: number | null
    score2: number | null
    mode?: string
    sets?: { set_number: number; score1: number; score2: number }[]
  }

  const allMatches: MatchItem[] = [
    ...singles.map(m => ({
      id: m.id,
      played_at: m.played_at,
      type: 'singles' as const,
      winnerId: m.winner_id,
      player1Id: m.player1_id,
      player2Id: m.player2_id,
      player1Name: m.player1?.name ?? '不明',
      player2Name: m.player2?.name ?? '不明',
      player1Avatar: m.player1?.avatar_url ?? null,
      player2Avatar: m.player2?.avatar_url ?? null,
      score1: m.score1,
      score2: m.score2,
    })),
    ...teams.map(m => ({
      id: m.id,
      played_at: m.played_at,
      type: 'teams' as const,
      winnerId: m.winner_id,
      player1Id: m.team1_id,
      player2Id: m.team2_id,
      player1Name: m.team1?.name ?? '不明',
      player2Name: m.team2?.name ?? '不明',
      player1Avatar: m.team1?.avatar_url ?? null,
      player2Avatar: m.team2?.avatar_url ?? null,
      score1: m.score1,
      score2: m.score2,
    })),
    ...(qualifyingMatches ?? []).map((m: any) => ({
      id: m.id,
      played_at: m.played_at,
      type: 'qualifying' as const,
      tournamentName: m.block?.tournament?.name,
      tournamentId: m.block?.tournament?.id,
      blockName: m.block?.block_name,
      winnerId: m.winner_id,
      player1Id: m.player1_id,
      player2Id: m.player2_id,
      player1Name: m.player1?.name ?? '不明',
      player2Name: m.player2?.name ?? '不明',
      player1Avatar: m.player1?.avatar_url ?? null,
      player2Avatar: m.player2?.avatar_url ?? null,
      score1: m.score1,
      score2: m.score2,
      mode: m.mode,
    })),
    ...(finalsMatches ?? []).map((m: any) => ({
      id: m.id,
      played_at: m.played_at,
      type: 'finals' as const,
      tournamentName: m.tournament?.name,
      tournamentId: m.tournament?.id,
      winnerId: m.winner_id,
      player1Id: m.player1_id,
      player2Id: m.player2_id,
      player1Name: m.player1?.name ?? '不明',
      player2Name: m.player2?.name ?? '不明',
      player1Avatar: m.player1?.avatar_url ?? null,
      player2Avatar: m.player2?.avatar_url ?? null,
      score1: null,
      score2: null,
      mode: m.mode,
      sets: m.tournament_finals_sets?.sort((a: any, b: any) => a.set_number - b.set_number),
    })),
  ].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())

  const isUpset = (match: any) => {
    if (!match.winner_id) return false
    const isP1Winner = match.winner_id === match.player1_id
    const winnerRank = isP1Winner ? match.player1_rank : match.player2_rank
    const loserRank = isP1Winner ? match.player2_rank : match.player1_rank
    const winnerHc = isP1Winner ? match.player1_hc : match.player2_hc
    const loserHc = isP1Winner ? match.player2_hc : match.player1_hc
    if (!winnerRank || !loserRank) return false
    return (winnerRank - loserRank) >= 10 || ((winnerHc ?? 36) - (loserHc ?? 36)) >= 5
  }

  const typeLabel = (type: string, blockName?: string) => {
    switch (type) {
      case 'singles': return { label: '個人戦', color: 'bg-purple-900/50 text-purple-400' }
      case 'teams': return { label: 'チーム戦', color: 'bg-blue-900/50 text-blue-400' }
      case 'qualifying': return { label: `予選${blockName ? ` ブロック${blockName}` : ''}`, color: 'bg-green-900/50 text-green-400' }
      case 'finals': return { label: '本戦', color: 'bg-red-900/50 text-red-400' }
      default: return { label: type, color: 'bg-gray-700 text-gray-400' }
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">📋 試合結果</h1>

        {allMatches.length === 0 ? (
          <p className="text-gray-400 text-sm">データがありません</p>
        ) : (
          <div className="space-y-4">
            {allMatches.map(match => {
              const upset = match.type === 'singles' ? isUpset(singles.find(m => m.id === match.id)) : false
              const date = new Date(match.played_at)
              const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
              const { label, color } = typeLabel(match.type, match.blockName)
              const isP1Winner = match.winnerId === match.player1Id

              return (
                <div key={`${match.type}-${match.id}`} className={`p-4 border rounded-2xl ${upset ? 'bg-yellow-900/20 border-yellow-600/40' : 'bg-purple-900/20 border-purple-800/30'}`}>
                  {/* ヘッダー */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <p className="text-xs text-gray-400">{dateStr}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                    {match.tournamentName && (
                      <Link
                        href={`/tournaments/${match.tournamentId}`}
                        className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 hover:text-yellow-300 transition"
                      >
                        🏆 {match.tournamentName}
                      </Link>
                    )}
                    {upset && (
                      <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full">
                        ⭐ 大金星
                      </span>
                    )}
                  </div>

                  {/* 対戦 */}
                  <div className="flex items-center gap-4">
                    {/* Player1 */}
                    <Link href={`/players/${match.player1Id}`} className="flex-1 flex flex-col items-center gap-2">
                      <div className={`w-20 h-20 rounded-full overflow-hidden bg-gray-800 border-2 flex-shrink-0 ${upset && isP1Winner ? 'border-yellow-400 avatar-glow' : 'border-purple-700/50'}`}>
                        {match.player1Avatar
                          ? <img src={match.player1Avatar} className="w-full h-full object-cover" />
                          : <span className="text-3xl flex items-center justify-center h-full">👤</span>
                        }
                      </div>
                      <span className={`font-bold text-sm text-center ${isP1Winner ? 'text-white' : 'text-gray-400'}`}>
                        {match.player1Name}
                      </span>
                      {isP1Winner && (
                        <span className={`text-xs font-bold ${upset ? 'text-yellow-400' : 'text-green-400'}`}>
                          {upset ? '⭐ 大金星' : '勝利'}
                        </span>
                      )}
                    </Link>

                    {/* スコア */}
                    <div className="text-center flex-shrink-0 space-y-1">
                      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold mx-auto">VS</div>
                      {match.type === 'finals' && match.sets && match.sets.length > 0 ? (
                        <div className="space-y-0.5">
                          {match.sets.map(s => (
                            <p key={s.set_number} className="text-xs text-gray-300">
                              {s.score1} - {s.score2}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-2xl font-bold text-white">{match.score1} - {match.score2}</p>
                      )}
                    </div>

                    {/* Player2 */}
                    <Link href={`/players/${match.player2Id}`} className="flex-1 flex flex-col items-center gap-2">
                      <div className={`w-20 h-20 rounded-full overflow-hidden bg-gray-800 border-2 flex-shrink-0 ${upset && !isP1Winner && match.winnerId ? 'border-yellow-400 avatar-glow' : 'border-purple-700/50'}`}>
                        {match.player2Avatar
                          ? <img src={match.player2Avatar} className="w-full h-full object-cover" />
                          : <span className="text-3xl flex items-center justify-center h-full">👤</span>
                        }
                      </div>
                      <span className={`font-bold text-sm text-center ${!isP1Winner && match.winnerId ? 'text-white' : 'text-gray-400'}`}>
                        {match.player2Name}
                      </span>
                      {!isP1Winner && match.winnerId && (
                        <span className={`text-xs font-bold ${upset ? 'text-yellow-400' : 'text-green-400'}`}>
                          {upset ? '⭐ 大金星' : '勝利'}
                        </span>
                      )}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}