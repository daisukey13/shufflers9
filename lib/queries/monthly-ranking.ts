import { createClient } from '@/lib/supabase/server'

export type MonthlyRankingEntry = {
  id: string
  name: string
  avatar_url: string | null
  address: string | null
  wins: number
  losses: number
  scoreDiff: number
  rating: number
  currentRank: number
}

export async function getLastMonthWinRanking(): Promise<{
  entries: MonthlyRankingEntry[]
  month: string // e.g. "2026年3月"
}> {
  const supabase = await createClient()

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const month = `${firstDay.getFullYear()}年${firstDay.getMonth() + 1}月`

  const startISO = firstDay.toISOString()
  const endISO = lastDay.toISOString()

  const [{ data: singles }, { data: doubles }, { data: allPlayers }] = await Promise.all([
    supabase
      .from('singles_matches')
      .select('player1_id, player2_id, score1, score2, winner_id')
      .gte('played_at', startISO)
      .lte('played_at', endISO)
      .not('winner_id', 'is', null),
    supabase
      .from('doubles_matches')
      .select('pair1_player1_id, pair1_player2_id, pair2_player1_id, pair2_player2_id, score1, score2, winner_pair')
      .gte('played_at', startISO)
      .lte('played_at', endISO)
      .not('winner_pair', 'is', null),
    supabase
      .from('players')
      .select('id, name, avatar_url, address, rating, hc')
      .eq('is_active', true)
      .eq('is_admin', false)
      .order('hc', { ascending: true })
      .order('rating', { ascending: false })
      .order('created_at', { ascending: true }),
  ])

  // 現在のRP順位マップ
  const rankMap = new Map<string, number>()
  ;(allPlayers ?? []).forEach((p, i) => rankMap.set(p.id, i + 1))
  const playerMap = new Map((allPlayers ?? []).map(p => [p.id, p]))

  // 月間集計
  const stats = new Map<string, { wins: number; losses: number; scoreDiff: number }>()
  const getOrCreate = (id: string) => {
    if (!stats.has(id)) stats.set(id, { wins: 0, losses: 0, scoreDiff: 0 })
    return stats.get(id)!
  }

  for (const m of singles ?? []) {
    const s1 = getOrCreate(m.player1_id)
    const s2 = getOrCreate(m.player2_id)
    const diff = (m.score1 ?? 0) - (m.score2 ?? 0)
    s1.scoreDiff += diff
    s2.scoreDiff -= diff
    if (m.winner_id === m.player1_id) {
      s1.wins++
      s2.losses++
    } else {
      s2.wins++
      s1.losses++
    }
  }

  for (const m of doubles ?? []) {
    const diff = (m.score1 ?? 0) - (m.score2 ?? 0)
    const pair1 = [m.pair1_player1_id, m.pair1_player2_id]
    const pair2 = [m.pair2_player1_id, m.pair2_player2_id]
    for (const id of pair1) {
      const s = getOrCreate(id)
      s.scoreDiff += diff
      if (m.winner_pair === 1) s.wins++; else s.losses++
    }
    for (const id of pair2) {
      const s = getOrCreate(id)
      s.scoreDiff -= diff
      if (m.winner_pair === 2) s.wins++; else s.losses++
    }
  }

  // 試合がないプレーヤーを除外し、ソート
  const entries: MonthlyRankingEntry[] = []
  for (const [id, stat] of stats) {
    const p = playerMap.get(id)
    if (!p) continue
    if (stat.wins === 0 && stat.losses === 0) continue
    entries.push({
      id,
      name: p.name,
      avatar_url: p.avatar_url,
      address: p.address,
      wins: stat.wins,
      losses: stat.losses,
      scoreDiff: stat.scoreDiff,
      rating: p.rating,
      currentRank: rankMap.get(id) ?? 999,
    })
  }

  entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff
    return b.rating - a.rating
  })

  return { entries: entries.slice(0, 5), month }
}
