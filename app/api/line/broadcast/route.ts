import { NextRequest, NextResponse } from 'next/server'
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

  const { message } = await req.json()

  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'メッセージを入力してください' }, { status: 400 })
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN が設定されていません' }, { status: 500 })
  }

  const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: [{ type: 'text', text: message.trim() }],
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: `LINE送信に失敗しました: ${errorData.message ?? res.statusText}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
