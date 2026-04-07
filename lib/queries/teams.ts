import { createClient } from '@/lib/supabase/server'
import { Team, TeamMember } from '@/types'

export async function getTeams(): Promise<Team[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false })

  if (error) throw error
  return data
}

export async function getTeamById(id: string): Promise<Team | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('*, player:players(*)')
    .eq('team_id', teamId)

  if (error) throw error
  return data
}