import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { turnstileToken, nameOrEmail, password, mode } = await req.json()

  // 1. Turnstile 検証
  const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: turnstileToken,
    }),
  })
  const tsData = await tsRes.json()
  if (!tsData.success) {
    return NextResponse.json({ error: '人間認証に失敗しました。もう一度お試しください' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  let email = nameOrEmail.trim()

  // 2. 表示名 → メールアドレス解決
  if (mode === 'name') {
    const { data: player, error } = await adminClient
      .from('players')
      .select('user_id, is_active')
      .eq('name', nameOrEmail.trim())
      .single()

    if (error || !player) {
      return NextResponse.json({ error: '該当するメンバーが見つかりません' }, { status: 404 })
    }
    if (!player.is_active) {
      return NextResponse.json({ error: 'このアカウントは無効化されています' }, { status: 403 })
    }

    const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(player.user_id)
    if (userError || !user?.email) {
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    }
    email = user.email
  }

  // 3. サインイン（SSRクライアントがCookieをセット）
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 })
  }

  // 4. is_active・is_admin チェック
  const { data: player } = await adminClient
    .from('players')
    .select('is_active, is_admin')
    .eq('user_id', authData.user.id)
    .single()

  if (player && !player.is_active) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'このアカウントは無効化されています' }, { status: 403 })
  }

  const redirectTo = player?.is_admin ? '/admin' : '/mypage'
  return NextResponse.json({ redirectTo })
}
