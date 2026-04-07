import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { email, password, name, avatarUrl, turnstileToken } = await req.json()

  // Turnstile検証
  const turnstileRes = await fetch(`${req.nextUrl.origin}/api/turnstile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: turnstileToken }),
  })

  if (!turnstileRes.ok) {
    return NextResponse.json({ error: '人間認証に失敗しました' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ユーザー作成
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? '登録に失敗しました' }, { status: 400 })
  }

  // プロフィール更新
  await supabase
    .from('players')
    .update({ name, avatar_url: avatarUrl })
    .eq('user_id', data.user.id)

  return NextResponse.json({ success: true })
}