import { createClient } from '@/lib/supabase/server'
import AdminMatchRegisterClient from './AdminMatchRegisterClient'

export default async function AdminMatchRegisterPage() {
  const supabase = await createClient()

  const [{ data: players }, { data: teams }, { data: tournaments }] = await Promise.all([
    supabase.from('players').select('id, name, avatar_url, rating, hc, doubles_rating').eq('is_active', true).eq('is_admin', false).order('name'),
    supabase.from('teams').select('id, name, avatar_url, rating').eq('is_active', true).order('name'),
    supabase.from('tournaments').select('id, name, type').in('status', ['open', 'in_progress']).order('created_at', { ascending: false }),
  ])

  return (
    <AdminMatchRegisterClient
      players={players ?? []}
      teams={teams ?? []}
      tournaments={tournaments ?? []}
    />
  )
}