import { createClient } from '@/lib/supabase/server'
import { Player } from '@/types'

export async function getPlayers(): Promise<Player[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .eq('is_admin', false)
    .order('hc', { ascending: true })
    .order('rating', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data || !data.is_active) return null
  return data
}

export async function getPlayerByUserId(userId: string): Promise<Player | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}