import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TournamentDetailClient from './TournamentDetailClient'

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const { data: blocks } = await supabase
    .from('tournament_blocks')
    .select('*, tournament_block_players(*, player:players(id, name, avatar_url, hc, rating))')
    .eq('tournament_id', id)
    .order('block_name')

  const { data: qualifyingMatches } = await supabase
    .from('tournament_qualifying_matches')
    .select('*, player1:players!player1_id(id, name, avatar_url), player2:players!player2_id(id, name, avatar_url)')
    .in('block_id', (blocks ?? []).map(b => b.id))
    .order('created_at')

  const { data: finalsMatches } = await supabase
    .from('tournament_finals_matches')
    .select('*, player1:players!player1_id(id, name, avatar_url), player2:players!player2_id(id, name, avatar_url), winner:players!winner_id(id, name, avatar_url), tournament_finals_sets(*)')
    .eq('tournament_id', id)
    .order('round')
    .order('match_number')

  return (
    <TournamentDetailClient
      tournament={tournament}
      blocks={blocks ?? []}
      qualifyingMatches={qualifyingMatches ?? []}
      finalsMatches={finalsMatches ?? []}
    />
  )
}