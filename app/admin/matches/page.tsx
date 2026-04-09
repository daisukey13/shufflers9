import { createClient } from '@/lib/supabase/server'
import AdminMatchesClient from './AdminMatchesClient'

export default async function AdminMatchesPage() {
  const supabase = await createClient()
  const [{ data: singles }, { data: teams }, { data: doubles }] = await Promise.all([
    supabase
      .from('singles_matches')
      .select('*, player1:players!player1_id(id, name), player2:players!player2_id(id, name)')
      .order('played_at', { ascending: false })
      .limit(100),
    supabase
      .from('teams_matches')
      .select('*, team1:teams!team1_id(id, name), team2:teams!team2_id(id, name)')
      .order('played_at', { ascending: false })
      .limit(100),
    supabase
      .from('doubles_matches')
      .select(`
        *,
        pair1_player1:players!pair1_player1_id(id, name),
        pair1_player2:players!pair1_player2_id(id, name),
        pair2_player1:players!pair2_player1_id(id, name),
        pair2_player2:players!pair2_player2_id(id, name)
      `)
      .order('played_at', { ascending: false })
      .limit(100),
  ])

  return (
    <AdminMatchesClient
      singles={singles ?? []}
      teams={teams ?? []}
      doubles={doubles ?? []}
    />
  )
}