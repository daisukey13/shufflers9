export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import PairingClient from './PairingClient'

export default async function PairingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()
  if (tournament.format !== 'doubles') redirect(`/admin/tournaments/${id}`)

  // エントリー済み参加者（希望パートナー情報含む）
  const { data: entries } = await adminClient
    .from('tournament_entries')
    .select(`
      id, player_id, preferred_partner_id,
      player:players!tournament_entries_player_id_fkey(id, name, avatar_url, hc, rating, doubles_rating),
      preferred_partner:players!tournament_entries_preferred_partner_id_fkey(id, name)
    `)
    .eq('tournament_id', id)
    .eq('status', 'entered')
    .eq('cancel_requested', false)
    .order('created_at')

  // 既存ペア
  const { data: pairs } = await adminClient
    .from('tournament_pairs')
    .select(`
      id,
      player1:players!tournament_pairs_player1_id_fkey(id, name, avatar_url, hc, rating, doubles_rating),
      player2:players!tournament_pairs_player2_id_fkey(id, name, avatar_url, hc, rating, doubles_rating)
    `)
    .eq('tournament_id', id)
    .order('created_at')

  return (
    <PairingClient
      tournament={tournament}
      entries={(entries ?? []) as any}
      pairs={(pairs ?? []) as any}
    />
  )
}
