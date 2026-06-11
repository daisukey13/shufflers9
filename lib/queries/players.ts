import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { unstable_cache } from 'next/cache'
import { Player } from '@/types'

export const getPlayers = unstable_cache(
  async (): Promise<Player[]> => {
    const supabase = createPublicClient()
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
  },
  ['players-list'],
  { revalidate: 300 } // 5分
)

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
