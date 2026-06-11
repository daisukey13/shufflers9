import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// プレーヤー情報・試合データのクエリキャッシュを即時無効化する。
// プロフィール編集やクライアントサイドの試合登録/編集後に呼ぶ。
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  revalidateTag('players', 'max')
  revalidateTag('matches', 'max')

  return NextResponse.json({ success: true })
}
