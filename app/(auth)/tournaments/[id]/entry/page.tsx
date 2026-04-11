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

  return (
    <EntryClient
      tournament={tournament}
      player={player}
      existingEntry={entry}
    />
  )
}