import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!player) return NextResponse.json({ error: '選手情報が見つかりません' }, { status: 403 })

  const { comment } = await req.json()
  if (typeof comment !== 'string' || comment.trim().length === 0) {
    return NextResponse.json({ error: 'コメントを入力してください' }, { status: 400 })
  }
  if (comment.trim().length > 100) {
    return NextResponse.json({ error: 'コメントは100文字以内で入力してください' }, { status: 400 })
  }

  const { data: match } = await supabase
    .from('singles_matches')
    .select('player1_id, player2_id, comment1, comment2')
    .eq('id', id)
    .single()

  if (!match) return NextResponse.json({ error: '試合が見つかりません' }, { status: 404 })

  let field: 'comment1' | 'comment2'
  if (match.player1_id === player.id) field = 'comment1'
  else if (match.player2_id === player.id) field = 'comment2'
  else return NextResponse.json({ error: 'この試合へのコメント権限がありません' }, { status: 403 })

  const { error } = await supabase
    .from('singles_matches')
    .update({ [field]: comment.trim() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, field })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!player) return NextResponse.json({ error: '選手情報が見つかりません' }, { status: 403 })

  const { data: match } = await supabase
    .from('singles_matches')
    .select('player1_id, player2_id')
    .eq('id', id)
    .single()

  if (!match) return NextResponse.json({ error: '試合が見つかりません' }, { status: 404 })

  let field: 'comment1' | 'comment2'
  if (match.player1_id === player.id) field = 'comment1'
  else if (match.player2_id === player.id) field = 'comment2'
  else return NextResponse.json({ error: 'この試合へのコメント権限がありません' }, { status: 403 })

  await supabase.from('singles_matches').update({ [field]: null }).eq('id', id)

  return NextResponse.json({ success: true })
}
