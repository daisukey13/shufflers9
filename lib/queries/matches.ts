import { createClient } from '@/lib/supabase/server'
import { SinglesMatch, TeamsMatch } from '@/types'

export async function getRecentSinglesMatches(limit = 20): Promise<SinglesMatch[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('singles_matches')
    .select('*, player1:players!player1_id(*), player2:players!player2_id(*)')
    .order('played_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getRecentTeamsMatches(limit = 20): Promise<TeamsMatch[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams_matches')
    .select('*, team1:teams!team1_id(*), team2:teams!team2_id(*)')
    .order('played_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getPlayerMatches(playerId: string): Promise<SinglesMatch[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('singles_matches')
    .select('*, player1:players!player1_id(*), player2:players!player2_id(*)')
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .order('played_at', { ascending: false })
  if (error) throw error
  return data
}