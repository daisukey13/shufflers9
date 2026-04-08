import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import FinalsClient from './FinalsClient'

export default async function FinalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  // 予選各ブロックの1位を取得
  const { data: blocks } = await supabase
    .from('tournament_blocks')
    .select('*, tournament_block_players(*, player:players(id, name, avatar_url, hc, rating))')
    .eq('tournament_id', id)
    .order('block_name')

  const { data: qualifyingMatches } = await supabase
    .from('tournament_qualifying_matches')
    .select('*')
    .in('block_id', (blocks ?? []).map(b => b.id))

  const { data: finalsMatches } = await supabase
    .from('tournament_finals_matches')
    .select('*, player1:players!player1_id(id, name, avatar_url), player2:players!player2_id(id, name, avatar_url), winner:players!winner_id(id, name, avatar_url), tournament_finals_sets(*)')
    .eq('tournament_id', id)
    .order('round')
    .order('match_number')

  // 予選通過者（各ブロック1位）を計算
  const qualifiers = (blocks ?? []).map(block => {
    const blockMatches = (qualifyingMatches ?? []).filter(m => m.block_id === block.id)
    const standings = block.tournament_block_players.map((bp: any) => {
      const wins = blockMatches.filter(m => m.winner_id === bp.player_id).length
      const scoreFor = blockMatches.reduce((sum: number, m: any) => {
        if (m.player1_id === bp.player_id) return sum + (m.score1 ?? 0)
        if (m.player2_id === bp.player_id) return sum + (m.score2 ?? 0)
        return sum
      }, 0)
      const scoreAgainst = blockMatches.reduce((sum: number, m: any) => {
        if (m.player1_id === bp.player_id) return sum + (m.score2 ?? 0)
        if (m.player2_id === bp.player_id) return sum + (m.score1 ?? 0)
        return sum
      }, 0)
      return { ...bp, wins, diff: scoreFor - scoreAgainst }
    }).sort((a: any, b: any) => b.wins - a.wins || b.diff - a.diff)

    return {
      block,
      winner: standings[0],
      hasDefault: block.tournament_block_players.some((bp: any) => bp.is_default),
    }
  })

  return (
    <FinalsClient
      tournament={tournament}
      qualifiers={qualifiers}
      finalsMatches={finalsMatches ?? []}
    />
  )
}