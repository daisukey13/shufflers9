import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: player } = await supabase
    .from('players')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()
  return player?.is_admin ? user : null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const { id } = await params
  const { player_id } = await req.json()
  if (!player_id) return NextResponse.json({ error: 'player_idが必要です' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('event_participants')
    .insert({ event_id: id, player_id })

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const { id } = await params
  const { player_id } = await req.json()
  if (!player_id) return NextResponse.json({ error: 'player_idが必要です' }, { status: 400 })

  const admin = createAdminClient()
  await admin
    .from('event_participants')
    .delete()
    .eq('event_id', id)
    .eq('player_id', player_id)

  return NextResponse.json({ success: true })
}
