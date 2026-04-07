import { createClient } from '@/lib/supabase/server'
import { Player, Team } from '@/types'

export async function getPlayerRankings(): Promise<Player[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .eq('is_admin', false)  // 追加
    .order('rating', { ascending: false })

  if (error) throw error
  return data
}

export async function getTeamRankings(): Promise<Team[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false })

  if (error) throw error
  return data
}