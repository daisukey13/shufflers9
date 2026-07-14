import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  // 管理者確認
  const { data: me } = await supabase
    .from('players')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!me?.is_admin) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const { playerId, email } = await req.json()

  if (typeof playerId !== 'string' || !playerId) {
    return NextResponse.json({ error: '対象メンバーが指定されていません' }, { status: 400 })
  }
  if (typeof email !== 'string' || /[\r\n]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // 対象プレーヤーの user_id を取得
  const { data: target } = await adminClient
    .from('players')
    .select('user_id')
    .eq('id', playerId)
    .single()

  if (!target?.user_id) {
    return NextResponse.json({ error: '対象メンバーが見つかりません' }, { status: 404 })
  }

  // auth.users のメールアドレスを更新（管理者変更のため確認メール不要＝即時確定）
  const { error } = await adminClient.auth.admin.updateUserById(target.user_id, {
    email,
    email_confirm: true,
  })

  if (error) {
    // 重複などは Supabase 側メッセージを日本語で補足
    const dup = /already|registered|exists/i.test(error.message)
    return NextResponse.json(
      { error: dup ? 'このメールアドレスは既に他のメンバーに使われています' : `変更に失敗しました: ${error.message}` },
      { status: 400 },
    )
  }

  return NextResponse.json({ success: true, email })
}
