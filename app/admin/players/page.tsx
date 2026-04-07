import { createClient } from '@/lib/supabase/server'
import AdminPlayersClient from './AdminPlayersClient'
import { getPresetAvatars } from '@/lib/avatars'

export default async function AdminPlayersPage() {
  const supabase = await createClient()
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: false })

  const avatars = await getPresetAvatars()

  return <AdminPlayersClient players={players ?? []} avatars={avatars} />
}