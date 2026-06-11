import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: me } = await supabase.from('players').select('is_admin').eq('user_id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const adminClient = createAdminClient()

  // 全確定済みシングルス試合を取得（古い順）
  const { data: matches, error: matchesError } = await adminClient
    .from('singles_matches')
    .select('id, player1_id, player2_id, score1, score2, winner_id, rating_change1, rating_change2')
    .eq('status', 'confirmed')
    .order('played_at', { ascending: true })

  if (matchesError) return NextResponse.json({ error: matchesError.message }, { status: 400 })

  // 全アクティブプレーヤー取得（管理者も含む）
  const { data: players, error: playersError } = await adminClient
    .from('players')
    .select('id')
    .eq('is_active', true)

  if (playersError) return NextResponse.json({ error: playersError.message }, { status: 400 })

  // プレーヤーごとにstatsを集計
  const statsMap: Record<string, {
    rating: number
    wins: number
    losses: number
    draws: number
    total_score: number
    total_matches: number
  }> = {}

  for (const p of (players ?? [])) {
    statsMap[p.id] = { rating: 1000, wins: 0, losses: 0, draws: 0, total_score: 0, total_matches: 0 }
  }

  for (const m of matches ?? []) {
    if (statsMap[m.player1_id]) {
      statsMap[m.player1_id].rating += m.rating_change1
      statsMap[m.player1_id].total_score += m.score1
      statsMap[m.player1_id].total_matches += 1
      if (m.winner_id === m.player1_id) statsMap[m.player1_id].wins += 1
      else if (m.winner_id === null) statsMap[m.player1_id].draws += 1
      else statsMap[m.player1_id].losses += 1
    }
    if (statsMap[m.player2_id]) {
      statsMap[m.player2_id].rating += m.rating_change2
      statsMap[m.player2_id].total_score += m.score2
      statsMap[m.player2_id].total_matches += 1
      if (m.winner_id === m.player2_id) statsMap[m.player2_id].wins += 1
      else if (m.winner_id === null) statsMap[m.player2_id].draws += 1
      else statsMap[m.player2_id].losses += 1
    }
  }

  // 各プレーヤーを更新（並列・同時実行数を制限）
  const errors: string[] = []
  const entries = Object.entries(statsMap)
  const CONCURRENCY = 10

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    await Promise.all(entries.slice(i, i + CONCURRENCY).map(async ([playerId, stats]) => {
      // HC計算とstats更新を並行実行
      const [{ error: updateError }, { data: hc }] = await Promise.all([
        adminClient.from('players').update({
          rating: stats.rating,
          wins: stats.wins,
          losses: stats.losses,
          total_score: stats.total_score,
          total_matches: stats.total_matches,
        }).eq('id', playerId),
        adminClient.rpc('calc_hc', {
          p_wins: stats.wins,
          p_losses: stats.losses,
          p_total_score: stats.total_score,
          p_total_matches: stats.total_matches,
        }),
      ])

      if (updateError) { errors.push(`${playerId}: ${updateError.message}`); return }
      if (hc !== null) {
        await adminClient.from('players').update({ hc }).eq('id', playerId)
      }
    }))
  }

  revalidateTag('players', 'max')
  revalidateTag('matches', 'max')

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 207 })
  }

  return NextResponse.json({ success: true, updated: Object.keys(statsMap).length })
}
