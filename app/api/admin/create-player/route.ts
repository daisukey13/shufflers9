import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 管理者チェック
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: player } = await supabase
    .from('players')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!player?.is_admin) {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const { name, email, password, avatarUrl } = await req.json()
  console.log('Creating user:', { name, email })

  const adminClient = createAdminClient()

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  console.log('Create user result:', { data, error })

  if (error || !data.user) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: error?.message ?? '登録に失敗しました' }, { status: 400 })
  }

  // playersレコードが作成されるまで少し待つ
  await new Promise(resolve => setTimeout(resolve, 1000))

  const { data: updatedPlayer, error: updateError } = await adminClient
    .from('players')
    .update({ name, avatar_url: avatarUrl })
    .eq('user_id', data.user.id)
    .select()
    .single()

  console.log('Update player result:', { updatedPlayer, updateError })

  return NextResponse.json({
    success: true,
    id: updatedPlayer?.id,
    user_id: data.user.id,
  })
}