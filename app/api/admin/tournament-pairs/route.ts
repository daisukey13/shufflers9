import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: player } = await supabase.from('players').select('is_admin').eq('user_id', user.id).single()
  return player?.is_admin ? player : null
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const { tournament_id, player1_id, player2_id } = await req.json()
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('tournament_pairs')
    .insert({ tournament_id, player1_id, player2_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const { id } = await req.json()
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('tournament_pairs').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
