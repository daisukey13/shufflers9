import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AdminPlayerEditClient from './AdminPlayerEditClient'
import { getPresetAvatars } from '@/lib/avatars'

export default async function AdminPlayerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()

  if (!player) notFound()

  const adminClient = (await import('@/lib/supabase/admin')).createAdminClient()
  const { data: { user } } = await adminClient.auth.admin.getUserById(player.user_id)

  const avatars = await getPresetAvatars()

  return <AdminPlayerEditClient player={player} email={user?.email ?? ''} avatars={avatars} />
}