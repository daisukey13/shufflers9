import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// ダブルス試合登録（一般ユーザー用）
// クライアントから直接 players を更新すると RLS により自分以外の3人の
// 成績が更新されないため、シングルス同様サーバー側で adminClient を使って更新する。
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { partner_id, opp1_id, opp2_id, score1, score2 } = await req.json()

  // 入力検証
  for (const id of [partner_id, opp1_id, opp2_id]) {
    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: '4人全員を選択してください' }, { status: 400 })
    }
  }
  if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0 || score1 > 999 || score2 > 999) {
    return NextResponse.json({ error: 'スコアが不正です' }, { status: 400 })
  }
  if (score1 === score2) {
    return NextResponse.json({ error: '引き分けは登録できません' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: me } = await adminClient.from('players').select('id').eq('user_id', user.id).single()
  if (!me) return NextResponse.json({ error: 'プレーヤー情報が見つかりません' }, { status: 400 })

  const ids = [me.id, partner_id, opp1_id, opp2_id]
  if (new Set(ids).size !== 4) {
    return NextResponse.json({ error: '同じプレーヤーが重複しています' }, { status: 400 })
  }

  const cols = 'id, is_active, doubles_rating, doubles_wins, doubles_losses, total_matches, wins, losses, total_score'
  const { data: rows, error: fetchError } = await adminClient.from('players').select(cols).in('id', ids)
  if (fetchError || !rows || rows.length !== 4) {
    return NextResponse.json({ error: 'プレーヤー情報の取得に失敗しました' }, { status: 400 })
  }
  if (rows.some(r => !r.is_active)) {
    return NextResponse.json({ error: '非アクティブなプレーヤーが含まれています' }, { status: 400 })
  }
  const byId = Object.fromEntries(rows.map(r => [r.id, r]))
  const [p1, p2, p3, p4] = ids.map(id => byId[id])

  const pair1AvgRating = Math.round(((p1.doubles_rating ?? 1000) + (p2.doubles_rating ?? 1000)) / 2)
  const pair2AvgRating = Math.round(((p3.doubles_rating ?? 1000) + (p4.doubles_rating ?? 1000)) / 2)

  const { data: elo, error: eloError } = await adminClient.rpc('calc_elo', {
    rating_a: pair1AvgRating,
    rating_b: pair2AvgRating,
    score_a: score1,
    score_b: score2,
    matches_a: 0,
    matches_b: 0,
  })
  if (eloError || !elo?.[0]) {
    return NextResponse.json({ error: `レーティング計算に失敗しました: ${eloError?.message ?? '不明'}` }, { status: 400 })
  }

  const eloResult = elo[0]
  const winnerPair = score1 > score2 ? 1 : 2

  const { error: matchError } = await adminClient.from('doubles_matches').insert({
    pair1_player1_id: me.id,
    pair1_player2_id: partner_id,
    pair2_player1_id: opp1_id,
    pair2_player2_id: opp2_id,
    score1,
    score2,
    winner_pair: winnerPair,
    rating_change1: eloResult.change_a,
    rating_change2: eloResult.change_b,
    registered_by: me.id,
    mode: 'normal',
  })
  if (matchError) return NextResponse.json({ error: `登録に失敗しました: ${matchError.message}` }, { status: 400 })

  const errors: string[] = []
  const updates: [typeof p1, 1 | 2][] = [[p1, 1], [p2, 1], [p3, 2], [p4, 2]]
  for (const [pl, pair] of updates) {
    const change = pair === 1 ? eloResult.change_a : eloResult.change_b
    const won = winnerPair === pair
    const newTotalMatches = (pl.total_matches ?? 0) + 1

    const { error: updateError } = await adminClient.from('players').update({
      doubles_rating: Math.max(600, (pl.doubles_rating ?? 1000) + change),
      doubles_wins: (pl.doubles_wins ?? 0) + (won ? 1 : 0),
      doubles_losses: (pl.doubles_losses ?? 0) + (won ? 0 : 1),
      total_matches: newTotalMatches,
    }).eq('id', pl.id)
    if (updateError) { errors.push(`${pl.id}: ${updateError.message}`); continue }

    const { data: hc } = await adminClient.rpc('calc_hc', {
      p_wins: pl.wins ?? 0,
      p_losses: pl.losses ?? 0,
      p_total_score: pl.total_score ?? 0,
      p_total_matches: newTotalMatches,
    })
    if (hc !== null && hc !== undefined) await adminClient.from('players').update({ hc }).eq('id', pl.id)
  }

  revalidateTag('players', 'max')
  revalidateTag('matches', 'max')

  if (errors.length > 0) {
    return NextResponse.json({ error: `一部プレーヤーの成績更新に失敗しました: ${errors.join(', ')}` }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
