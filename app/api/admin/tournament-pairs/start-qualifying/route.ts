import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: player } = await supabase.from('players').select('is_admin').eq('user_id', user.id).single()
  if (!player?.is_admin) return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

  const { tournament_id } = await req.json()
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('tournaments').update({ status: 'qualifying' }).eq('id', tournament_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
