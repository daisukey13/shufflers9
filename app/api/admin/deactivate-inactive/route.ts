import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ONE_YEAR_AGO = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString()
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // GitHub Actions cron secret
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true

  // Admin session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: player } = await supabase
    .from('players')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()
  return !!player?.is_admin
}

async function getInactivePlayers() {
  const cutoff = ONE_YEAR_AGO()
  const adminClient = createAdminClient()

  const { data: activePlayers, error: playersError } = await adminClient
    .from('players')
    .select('id, name')
    .eq('is_active', true)

  if (playersError || !activePlayers) {
    throw new Error('プレーヤー取得失敗')
  }

  const activeIds = new Set<string>()

  // シングルス
  const { data: singles } = await adminClient
    .from('singles_matches')
    .select('player1_id, player2_id')
    .gte('played_at', cutoff)
  for (const m of singles ?? []) {
    if (m.player1_id) activeIds.add(m.player1_id)
    if (m.player2_id) activeIds.add(m.player2_id)
  }

  // ダブルス
  const { data: doubles } = await adminClient
    .from('doubles_matches')
    .select('pair1_player1_id, pair1_player2_id, pair2_player1_id, pair2_player2_id')
    .gte('played_at', cutoff)
  for (const m of doubles ?? []) {
    if (m.pair1_player1_id) activeIds.add(m.pair1_player1_id)
    if (m.pair1_player2_id) activeIds.add(m.pair1_player2_id)
    if (m.pair2_player1_id) activeIds.add(m.pair2_player1_id)
    if (m.pair2_player2_id) activeIds.add(m.pair2_player2_id)
  }

  // 大会予選
  const { data: qualifying } = await adminClient
    .from('tournament_qualifying_matches')
    .select('player1_id, player2_id')
    .gte('created_at', cutoff)
  for (const m of qualifying ?? []) {
    if (m.player1_id) activeIds.add(m.player1_id)
    if (m.player2_id) activeIds.add(m.player2_id)
  }

  // 大会本戦
  const { data: finals } = await adminClient
    .from('tournament_finals_matches')
    .select('player1_id, player2_id')
    .gte('created_at', cutoff)
  for (const m of finals ?? []) {
    if (m.player1_id) activeIds.add(m.player1_id)
    if (m.player2_id) activeIds.add(m.player2_id)
  }

  return activePlayers.filter(p => !activeIds.has(p.id))
}

// プレビュー（対象者一覧を返すだけ）
export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  try {
    const toDeactivate = await getInactivePlayers()
    return NextResponse.json({ deactivated: toDeactivate, dry_run: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '不明なエラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// 実行
export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  try {
    const toDeactivate = await getInactivePlayers()

    if (toDeactivate.length === 0) {
      return NextResponse.json({ deactivated: [], count: 0, message: '対象者はいません' })
    }

    const adminClient = createAdminClient()
    const ids = toDeactivate.map(p => p.id)
    const { error: updateError } = await adminClient
      .from('players')
      .update({ is_active: false })
      .in('id', ids)

    if (updateError) {
      return NextResponse.json({ error: '更新失敗: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      deactivated: toDeactivate,
      count: toDeactivate.length,
      message: `${toDeactivate.length}名を非アクティブにしました`,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '不明なエラー'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
