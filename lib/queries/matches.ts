import { createClient } from '@/lib/supabase/server'
import { SinglesMatch, TeamsMatch } from '@/types'
import { calcElo } from '@/lib/elo'

export async function getRecentSinglesMatches(limit = 20): Promise<SinglesMatch[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('singles_matches')
    .select('*, player1:players!player1_id(*), player2:players!player2_id(*)')
    .order('played_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getRecentTeamsMatches(limit = 20): Promise<TeamsMatch[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams_matches')
    .select('*, team1:teams!team1_id(*), team2:teams!team2_id(*)')
    .order('played_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getPlayerMatches(playerId: string): Promise<SinglesMatch[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('singles_matches')
    .select('*, player1:players!player1_id(*), player2:players!player2_id(*)')
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .order('played_at', { ascending: false })
  if (error) throw error
  return data
}
export async function getPlayerDoublesMatches(playerId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('doubles_matches')
    .select(`
      *,
      pair1_player1:players!pair1_player1_id(id, name, avatar_url),
      pair1_player2:players!pair1_player2_id(id, name, avatar_url),
      pair2_player1:players!pair2_player1_id(id, name, avatar_url),
      pair2_player2:players!pair2_player2_id(id, name, avatar_url)
    `)
    .or(`pair1_player1_id.eq.${playerId},pair1_player2_id.eq.${playerId},pair2_player1_id.eq.${playerId},pair2_player2_id.eq.${playerId}`)
    .order('played_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
export async function getRecentAllMatches(limit = 5) {
  const supabase = await createClient()

  // シングルス試合
  const { data: singles } = await supabase
    .from('singles_matches')
    .select('*, player1:players!player1_id(id, name, avatar_url), player2:players!player2_id(id, name, avatar_url)')
    .order('played_at', { ascending: false })
    .limit(limit)

 // 予選試合（スコア確定済みのみ）
  const { data: qualifying } = await supabase
    .from('tournament_qualifying_matches')
    .select('*, player1:players!player1_id(id, name, avatar_url), player2:players!player2_id(id, name, avatar_url), block:tournament_blocks(tournament_id, block_name, tournament:tournaments(name))')
    .eq('mode', 'normal')
    .not('winner_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)


    // 本戦試合（スコア確定済みのみ）
  const { data: finals } = await supabase
    .from('tournament_finals_matches')
    .select('*, player1:players!player1_id(id, name, avatar_url), player2:players!player2_id(id, name, avatar_url), tournament:tournaments(name)')
    .not('winner_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  // 統合して日付順にソート
  const all = [
    ...(singles ?? []).map((m: any) => ({
      id: m.id,
      type: 'singles' as const,
      player1: m.player1,
      player2: m.player2,
      score1: m.score1,
      score2: m.score2,
      winner_id: m.winner_id,
      played_at: m.played_at,
      label: null,
    })),
    ...(qualifying ?? []).map((m: any) => ({
      id: m.id,
      type: 'qualifying' as const,
      player1: m.player1,
      player2: m.player2,
      score1: m.score1,
      score2: m.score2,
      winner_id: m.winner_id,
      played_at: m.created_at,
      label: m.block?.tournament?.name ? `${m.block.tournament.name} 予選` : '予選',
    })),
    ...(finals ?? []).map((m: any) => ({
      id: m.id,
      type: 'finals' as const,
      player1: m.player1,
      player2: m.player2,
      score1: m.tournament_finals_sets?.[0]?.score1 ?? null,
      score2: m.tournament_finals_sets?.[0]?.score2 ?? null,
      winner_id: m.winner_id,
      played_at: m.created_at,
      label: m.tournament?.name ? `${m.tournament.name} 本戦` : '本戦',
    })),
  ].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
   .slice(0, limit)

  return all
}
export async function getRecentDoublesMatches(limit = 5) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('doubles_matches')
    .select(`*,
      pair1_player1:players!pair1_player1_id(id, name, avatar_url),
      pair1_player2:players!pair1_player2_id(id, name, avatar_url),
      pair2_player1:players!pair2_player1_id(id, name, avatar_url),
      pair2_player2:players!pair2_player2_id(id, name, avatar_url)
    `)
    .order('played_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
export async function getTotalMatchesCount(): Promise<number> {
  const supabase = await createClient()
  const [
    { count: singlesCount },
    { count: doublesCount },
    { count: qualifyingCount },
    { count: finalsCount },
  ] = await Promise.all([
    supabase.from('singles_matches').select('*', { count: 'exact', head: true }),
    supabase.from('doubles_matches').select('*', { count: 'exact', head: true }),
    supabase.from('tournament_qualifying_matches').select('*', { count: 'exact', head: true }).eq('mode', 'normal').not('winner_id', 'is', null),
    supabase.from('tournament_finals_matches').select('*', { count: 'exact', head: true }).not('winner_id', 'is', null),
  ])
  return (singlesCount ?? 0) + (doublesCount ?? 0) + (qualifyingCount ?? 0) + (finalsCount ?? 0)
}

export async function getPlayerAllSinglesMatches(playerId: string) {
  const supabase = await createClient()

  // 通常シングルス
  const { data: singles } = await supabase
    .from('singles_matches')
    .select('*, player1:players!player1_id(*), player2:players!player2_id(*)')
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .order('played_at', { ascending: false })

  // 予選（tournament は block 経由でJOIN、DEFAULTプレーヤーを除外）
  const { data: qualifying } = await supabase
    .from('tournament_qualifying_matches')
    .select('*, player1:players!player1_id(*), player2:players!player2_id(*), block:tournament_blocks(tournament:tournaments(name))')
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .not('winner_id', 'is', null)

  // 決勝
  const { data: finals } = await supabase
    .from('tournament_finals_matches')
    .select('*, player1:players!player1_id(*), player2:players!player2_id(*), tournament:tournaments(name), tournament_finals_sets(*)')
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .not('winner_id', 'is', null)

  // 統一フォーマットに変換
  const all = [
    ...(singles ?? []).map(m => ({
      ...m,
      source: 'singles' as const,
      tournament_name: null,
    })),
    ...(qualifying ?? [])
      .filter((m: any) => m.player1?.name !== 'DEFAULT' && m.player2?.name !== 'DEFAULT')
      .map((m: any) => ({
        ...m,
        played_at: m.created_at,
        source: 'qualifying' as const,
        tournament_name: m.block?.tournament?.name ?? null,
        rating_change1: m.player1_rating_change,
        rating_change2: m.player2_rating_change,
      })),
    ...(finals ?? []).map(m => {
      const sets = (m.tournament_finals_sets ?? []) as { score1: number; score2: number }[]
      const numSets = sets.length
      const total1 = sets.reduce((s, set) => s + (set.score1 ?? 0), 0)
      const total2 = sets.reduce((s, set) => s + (set.score2 ?? 0), 0)

      let rating_change1: number | null = null
      let rating_change2: number | null = null

      if (m.winner_id && numSets > 0 && m.mode === 'normal') {
        const p1Rating: number = (m.player1 as any)?.rating ?? 1000
        const p2Rating: number = (m.player2 as any)?.rating ?? 1000
        // 3セットマッチはセットあたりの平均ポイントをELO入力に使用
        const avg1 = total1 / numSets
        const avg2 = total2 / numSets
        const { changeA, changeB } = calcElo(p1Rating, p2Rating, avg1, avg2)
        rating_change1 = changeA
        rating_change2 = changeB
      } else if (m.winner_id && (m.mode === 'walkover' || m.mode === 'forfeit')) {
        rating_change1 = 0
        rating_change2 = 0
      }

      return {
        ...m,
        played_at: m.created_at,
        source: 'finals' as const,
        tournament_name: m.tournament?.name ?? null,
        score1: total1,
        score2: total2,
        rating_change1,
        rating_change2,
      }
    }),
  ]

  // 日付降順でソート
  all.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())

  return all
}