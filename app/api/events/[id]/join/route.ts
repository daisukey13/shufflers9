import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getPlayer(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()
  return player
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const player = await getPlayer(supabase)
  if (!player) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { error } = await supabase
    .from('event_participants')
    .insert({ event_id: id, player_id: player.id })

  if (error && error.code !== '23505') { // ignore duplicate key
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const player = await getPlayer(supabase)
  if (!player) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', id)
    .eq('player_id', player.id)

  return NextResponse.json({ success: true })
}
