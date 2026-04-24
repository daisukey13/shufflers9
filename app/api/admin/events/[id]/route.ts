import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!player?.is_admin) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  await supabase.from('events').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
