import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
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

  const { name, email, password, avatarUrl, fullName, phone, address } = await req.json()

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? '登録に失敗しました' }, { status: 400 })
  }

  await new Promise(resolve => setTimeout(resolve, 1000))

  const { data: updatedPlayer, error: updateError } = await adminClient
    .from('players')
    .update({
      name,
      avatar_url: avatarUrl,
      full_name: fullName,
      phone,
      address,
    })
    .eq('user_id', data.user.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    id: updatedPlayer?.id,
    user_id: data.user.id,
  })
}