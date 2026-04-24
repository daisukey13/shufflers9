import { createClient } from '@/lib/supabase/server'

export type ShortTermAward = {
  id: string
  name: string
  avatar_url: string | null
  value: string   // 表示値（例: "83%" or "+47pt"）
  sub: string     // サブテキスト（例: "6勝1敗"）
}

// 今月の勝率ランキング（最低3試合以上）
export async function getThisMonthWinRate(): Promise<ShortTermAward | null> {
  const supabase = await createClient()

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const startISO = firstDay.toISOString()

  const [{ data: singles }, { data: doubles }, { data: players }] = await Promise.all([
    supabase
      .from('singles_matches')
      .select('player1_id, player2_id, winner_id')
      .gte('played_at', startISO)
      .not('winner_id', 'is', null),
    supabase
      .from('doubles_matches')
      .select('pair1_player1_id, pair1_player2_id, pair2_player1_id, pair2_player2_id, winner_pair')
      .gte('played_at', startISO)
      .not('winner_pair', 'is', null),
    supabase
      .from('players')
      .select('id, name, avatar_url')
      .eq('is_active', true)
      .eq('is_admin', false),
  ])

  const playerMap = new Map((players ?? []).map(p => [p.id, p]))
  const stats = new Map<string, { wins: number; total: number }>()
  const getOrCreate = (id: string) => {
    if (!stats.has(id)) stats.set(id, { wins: 0, total: 0 })
    return stats.get(id)!
  }

  for (const m of singles ?? []) {
    getOrCreate(m.player1_id).total++
    getOrCreate(m.player2_id).total++
    if (m.winner_id === m.player1_id) getOrCreate(m.player1_id).wins++
    else getOrCreate(m.player2_id).wins++
  }

  for (const m of doubles ?? []) {
    for (const id of [m.pair1_player1_id, m.pair1_player2_id]) {
      getOrCreate(id).total++
      if (m.winner_pair === 1) getOrCreate(id).wins++
    }
    for (const id of [m.pair2_player1_id, m.pair2_player2_id]) {
      getOrCreate(id).total++
      if (m.winner_pair === 2) getOrCreate(id).wins++
    }
  }

  let best: { id: string; rate: number; wins: number; total: number } | null = null
  for (const [id, s] of stats) {
    if (s.total < 3) continue
    const rate = s.wins / s.total
    if (!best || rate > best.rate || (rate === best.rate && s.wins > best.wins)) {
      best = { id, rate, wins: s.wins, total: s.total }
    }
  }

  if (!best) return null
  const p = playerMap.get(best.id)
  if (!p) return null

  const losses = best.total - best.wins
  return {
    id: best.id,
    name: p.name,
    avatar_url: p.avatar_url,
    value: `${Math.round(best.rate * 100)}%`,
    sub: `${best.wins}勝${losses}敗`,
  }
}

// 直近10試合のRP上昇率ランキング（最低5試合以上）
export async function getRecentRatingGrowth(): Promise<ShortTermAward | null> {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('singles_matches')
    .select('player1_id, player2_id, rating_change1, rating_change2, played_at')
    .order('played_at', { ascending: false })
    .limit(500)

  const { data: players } = await supabase
    .from('players')
    .select('id, name, avatar_url')
    .eq('is_active', true)
    .eq('is_admin', false)

  const playerMap = new Map((players ?? []).map(p => [p.id, p]))

  // プレーヤーごとに直近10試合のrating_changeを集計
  const playerMatches = new Map<string, number[]>()
  for (const m of matches ?? []) {
    if (!playerMatches.has(m.player1_id)) playerMatches.set(m.player1_id, [])
    if (!playerMatches.has(m.player2_id)) playerMatches.set(m.player2_id, [])
    if (playerMatches.get(m.player1_id)!.length < 10)
      playerMatches.get(m.player1_id)!.push(m.rating_change1 ?? 0)
    if (playerMatches.get(m.player2_id)!.length < 10)
      playerMatches.get(m.player2_id)!.push(m.rating_change2 ?? 0)
  }

  let best: { id: string; gain: number; count: number } | null = null
  for (const [id, changes] of playerMatches) {
    if (changes.length < 5) continue
    const gain = changes.reduce((a, b) => a + b, 0)
    if (!best || gain > best.gain) {
      best = { id, gain, count: changes.length }
    }
  }

  if (!best) return null
  const p = playerMap.get(best.id)
  if (!p) return null

  return {
    id: best.id,
    name: p.name,
    avatar_url: p.avatar_url,
    value: `${best.gain > 0 ? '+' : ''}${best.gain}pt`,
    sub: `直近${best.count}試合`,
  }
}

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
