export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EntryClient from './EntryClient'

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('id, name, hc, rating, is_admin')
    .eq('user_id', user.id)
    .single()

  if (!player) redirect('/login')
  if (player.is_admin) redirect(`/tournaments/${id}`)

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const { data: entry } = await supabase
    .from('tournament_entries')
    .select('*')
    .eq('tournament_id', id)
    .eq('player_id', player.id)
    .single()

  // ダブルス大会の場合、エントリー済み他プレーヤー一覧を取得
  let otherPlayers: { id: string; name: string }[] = []
  if (tournament.format === 'doubles') {
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('player_id, player:players!tournament_entries_player_id_fkey(id, name)')
      .eq('tournament_id', id)
      .eq('status', 'entered')
      .neq('player_id', player.id)
    otherPlayers = (entries ?? []).map((e: any) => e.player).filter(Boolean)
  }

  return (
    <EntryClient
      tournament={tournament}
      player={player}
      existingEntry={entry}
      otherPlayers={otherPlayers}
    />
  )
}