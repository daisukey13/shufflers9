import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import QualifyingClient from './QualifyingClient'

export default async function QualifyingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const { data: players } = await supabase
    .from('players')
    .select('id, name, avatar_url, hc, rating')
    .eq('is_active', true)
    .eq('is_admin', false)
    .order('name')

  const { data: defaultPlayer } = await supabase
    .from('players')
    .select('id, name')
    .eq('user_id', '00000000-0000-0000-0000-000000000000')
    .single()

  const { data: blocks } = await supabase
    .from('tournament_blocks')
    .select('*, tournament_block_players(*, player:players(id, name, avatar_url, hc, rating))')
    .eq('tournament_id', id)
    .order('block_name')

  const { data: matches } = await supabase
    .from('tournament_qualifying_matches')
    .select('*, player1:players!player1_id(id, name, avatar_url), player2:players!player2_id(id, name, avatar_url)')
    .in('block_id', (blocks ?? []).map(b => b.id))
    .order('created_at')

  return (
    <QualifyingClient
      tournament={tournament}
      players={players ?? []}
      defaultPlayerId={defaultPlayer?.id ?? ''}
      blocks={blocks ?? []}
      matches={matches ?? []}
    />
  )
}