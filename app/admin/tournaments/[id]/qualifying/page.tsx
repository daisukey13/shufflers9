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

  // エントリー済みプレーヤーを取得
  const { data: entries } = await supabase
    .from('tournament_entries')
    .select('player_id, player:players!tournament_entries_player_id_fkey(id, name, avatar_url, hc, rating)')
    .eq('tournament_id', id)
    .eq('status', 'entered')
    .eq('cancel_requested', false)

  const enteredPlayers = (entries ?? []).map((e: any) => e.player).filter(Boolean)

  const { data: blocks } = await supabase
    .from('tournament_blocks')
    .select('*, tournament_block_players(*, player:players(id, name, avatar_url, hc, rating, doubles_rating), partner:players!tournament_block_players_partner_id_fkey(id, name, avatar_url, hc, rating, doubles_rating))')
    .eq('tournament_id', id)
    .order('block_name')

  const { data: matches } = await supabase
    .from('tournament_qualifying_matches')
    .select('*, player1:players!player1_id(id, name, avatar_url), player2:players!player2_id(id, name, avatar_url), pair1_player2:players!pair1_player2_id(id, name, avatar_url), pair2_player2:players!pair2_player2_id(id, name, avatar_url)')
    .in('block_id', (blocks ?? []).map(b => b.id))
    .order('created_at')

  // ダブルス大会の場合、確定済みペアを取得
  let tournamentPairs: any[] = []
  if (tournament.format === 'doubles') {
    const { data: pairs } = await supabase
      .from('tournament_pairs')
      .select('id, player1_id, player2_id, player1:players!tournament_pairs_player1_id_fkey(id, name, avatar_url, hc, rating, doubles_rating), player2:players!tournament_pairs_player2_id_fkey(id, name, avatar_url, hc, rating, doubles_rating)')
      .eq('tournament_id', id)
      .order('created_at')
    tournamentPairs = pairs ?? []
  }

  return (
    <QualifyingClient
      tournament={tournament}
      players={players ?? []}
      enteredPlayers={enteredPlayers}
      defaultPlayerId={defaultPlayer?.id ?? ''}
      blocks={blocks ?? []}
      matches={matches ?? []}
      tournamentPairs={tournamentPairs}
    />
  )
}