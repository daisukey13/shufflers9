import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { name } = await req.json()

  if (!name) {
    return NextResponse.json({ error: '表示名を入力してください' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // 表示名からplayerを検索
  const { data: player, error } = await adminClient
    .from('players')
    .select('user_id, is_active')
    .eq('name', name.trim())
    .single()

  if (error || !player) {
    return NextResponse.json({ error: '該当するメンバーが見つかりません' }, { status: 404 })
  }

  if (!player.is_active) {
    return NextResponse.json({ error: 'このアカウントは無効化されています' }, { status: 403 })
  }

  // user_idからメールアドレスを取得
  const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(player.user_id)

  if (userError || !user?.email) {
    return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ email: user.email })
}