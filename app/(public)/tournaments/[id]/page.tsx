export const dynamic = 'force-dynamic'

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
    .select('*, tournament_block_players(*, player:players(id, name, avatar_url, hc, rating, is_active))')
    .eq('tournament_id', id)
    .order('block_name')

  const { data: qualifyingMatches } = await supabase
    .from('tournament_qualifying_matches')
    .select('*, player1:players!player1_id(id, name, avatar_url, hc, rating), player2:players!player2_id(id, name, avatar_url, hc, rating)')
    .in('block_id', (blocks ?? []).map(b => b.id))
    .order('created_at')

  const { data: finalsMatches } = await supabase
    .from('tournament_finals_matches')
    .select('*, player1:players!player1_id(id, name, avatar_url, hc, rating), player2:players!player2_id(id, name, avatar_url, hc, rating), winner:players!winner_id(id, name, avatar_url, hc, rating), tournament_finals_sets(*)')
    .eq('tournament_id', id)
    .order('round')
    .order('match_number')

  const { data: rankingPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('is_active', true)
    .eq('is_admin', false)
    .order('rating', { ascending: false })

  const rankings = (rankingPlayers ?? []).map((p, i) => ({ id: p.id, rank: i + 1 }))

  // ログイン状態とエントリー状況を取得
  const { data: { user } } = await supabase.auth.getUser()
  let currentPlayer = null
  let myEntry = null

  if (user) {
    const { data: player } = await supabase
      .from('players')
      .select('id, name, is_admin')
      .eq('user_id', user.id)
      .single()

    if (player && !player.is_admin) {
      currentPlayer = player
      const { data: entry } = await supabase
        .from('tournament_entries')
        .select('*')
        .eq('tournament_id', id)
        .eq('player_id', player.id)
        .single()
      myEntry = entry
    }
  }

  // エントリー済みプレーヤー一覧
  const { data: entries } = await supabase
    .from('tournament_entries')
    .select('*, player:players(id, name, avatar_url, is_active)')
    .eq('tournament_id', id)
    .neq('status', 'cancelled')
    .order('created_at')

  return (
    <TournamentDetailClient
      tournament={tournament}
      blocks={blocks ?? []}
      qualifyingMatches={qualifyingMatches ?? []}
      finalsMatches={finalsMatches ?? []}
      rankings={rankings}
      isLoggedIn={!!user}
      currentPlayer={currentPlayer}
      myEntry={myEntry}
      entries={entries ?? []}
    />
  )
}