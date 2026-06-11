import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { opponent_id, score1, score2, comment1, player1_hc, player2_hc, player1_rank, player2_rank } = await req.json()

  // 入力検証
  if (typeof opponent_id !== 'string' || !opponent_id) {
    return NextResponse.json({ error: '相手プレーヤーを指定してください' }, { status: 400 })
  }
  if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0 || score1 > 999 || score2 > 999) {
    return NextResponse.json({ error: 'スコアが不正です' }, { status: 400 })
  }
  if (typeof comment1 === 'string' && comment1.trim().length > 30) {
    return NextResponse.json({ error: 'コメントは30文字以内で入力してください' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // 自分のプレーヤー情報取得
  const { data: me } = await adminClient.from('players').select('id, rating, wins, losses, total_score, total_matches').eq('user_id', user.id).single()
  if (!me) return NextResponse.json({ error: 'プレーヤー情報が見つかりません' }, { status: 400 })

  if (opponent_id === me.id) {
    return NextResponse.json({ error: '自分自身とは対戦できません' }, { status: 400 })
  }

  // 相手のプレーヤー情報取得
  const { data: opp } = await adminClient.from('players').select('id, rating, wins, losses, total_score, total_matches, is_active').eq('id', opponent_id).single()
  if (!opp) return NextResponse.json({ error: '相手プレーヤーが見つかりません' }, { status: 400 })
  if (!opp.is_active) return NextResponse.json({ error: 'この相手は現在非アクティブです' }, { status: 400 })

  // 試合数取得（ELO計算用）
  const { count: matchesMe } = await adminClient
    .from('singles_matches')
    .select('*', { count: 'exact', head: true })
    .or(`player1_id.eq.${me.id},player2_id.eq.${me.id}`)

  const { count: matchesOpp } = await adminClient
    .from('singles_matches')
    .select('*', { count: 'exact', head: true })
    .or(`player1_id.eq.${opp.id},player2_id.eq.${opp.id}`)

  // ELO計算
  const { data: elo, error: eloError } = await adminClient.rpc('calc_elo', {
    rating_a: me.rating,
    rating_b: opp.rating,
    score_a: score1,
    score_b: score2,
    matches_a: matchesMe ?? 0,
    matches_b: matchesOpp ?? 0,
  })

  if (eloError || !elo?.[0]) {
    return NextResponse.json({ error: `レーティング計算に失敗しました: ${eloError?.message ?? '不明'}` }, { status: 400 })
  }

  const eloResult = elo[0]
  const winnerId = score1 > score2 ? me.id : score1 < score2 ? opp.id : null

  // 試合登録
  const { error: matchError } = await adminClient.from('singles_matches').insert({
    player1_id: me.id,
    player2_id: opp.id,
    score1,
    score2,
    winner_id: winnerId,
    rating_change1: eloResult.change_a,
    rating_change2: eloResult.change_b,
    registered_by: me.id,
    status: 'confirmed',
    player1_hc,
    player2_hc,
    player1_rank,
    player2_rank,
    ...(comment1 ? { comment1 } : {}),
  })

  if (matchError) return NextResponse.json({ error: `登録に失敗しました: ${matchError.message}` }, { status: 400 })

  // 自分のstats更新
  const newWinsMe = me.wins + (score1 > score2 ? 1 : 0)
  const newLossesMe = me.losses + (score1 < score2 ? 1 : 0)
  const newTotalScoreMe = (me.total_score ?? 0) + score1
  const newTotalMatchesMe = (me.total_matches ?? 0) + 1

  await adminClient.from('players').update({
    rating: eloResult.new_rating_a,
    wins: newWinsMe,
    losses: newLossesMe,
    total_score: newTotalScoreMe,
    total_matches: newTotalMatchesMe,
  }).eq('id', me.id)

  // 相手のstats更新
  const newWinsOpp = opp.wins + (score2 > score1 ? 1 : 0)
  const newLossesOpp = opp.losses + (score2 < score1 ? 1 : 0)
  const newTotalScoreOpp = (opp.total_score ?? 0) + score2
  const newTotalMatchesOpp = (opp.total_matches ?? 0) + 1

  await adminClient.from('players').update({
    rating: eloResult.new_rating_b,
    wins: newWinsOpp,
    losses: newLossesOpp,
    total_score: newTotalScoreOpp,
    total_matches: newTotalMatchesOpp,
  }).eq('id', opp.id)

  // 自分のHC再計算
  const { data: hcMe } = await adminClient.rpc('calc_hc', {
    p_wins: newWinsMe,
    p_losses: newLossesMe,
    p_total_score: newTotalScoreMe,
    p_total_matches: newTotalMatchesMe,
  })
  if (hcMe !== null) await adminClient.from('players').update({ hc: hcMe }).eq('id', me.id)

  // 相手のHC再計算
  const { data: hcOpp } = await adminClient.rpc('calc_hc', {
    p_wins: newWinsOpp,
    p_losses: newLossesOpp,
    p_total_score: newTotalScoreOpp,
    p_total_matches: newTotalMatchesOpp,
  })
  if (hcOpp !== null) await adminClient.from('players').update({ hc: hcOpp }).eq('id', opp.id)

  // ランキング・試合キャッシュを即時無効化
  revalidateTag('players', 'max')
  revalidateTag('matches', 'max')

  return NextResponse.json({ success: true })
}
