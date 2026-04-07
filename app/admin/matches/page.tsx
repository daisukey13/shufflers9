import { createClient } from '@/lib/supabase/server'
import AdminMatchesClient from './AdminMatchesClient'

export default async function AdminMatchesPage() {
  const supabase = await createClient()

  const [{ data: singles }, { data: teams }] = await Promise.all([
    supabase
      .from('singles_matches')
      .select('*, player1:players!player1_id(*), player2:players!player2_id(*)')
      .order('played_at', { ascending: false })
      .limit(50),
    supabase
      .from('teams_matches')
      .select('*, team1:teams!team1_id(*), team2:teams!team2_id(*)')
      .order('played_at', { ascending: false })
      .limit(50),
  ])

  return <AdminMatchesClient singles={singles ?? []} teams={teams ?? []} />
}