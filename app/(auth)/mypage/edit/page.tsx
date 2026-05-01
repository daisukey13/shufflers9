export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getPlayerByUserId } from '@/lib/queries/players'
import { redirect } from 'next/navigation'
import { getPresetAvatars } from '@/lib/avatars'
import MyPageEditClient from './MyPageEditClient'

export default async function MyPageEditPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const player = await getPlayerByUserId(user.id)
  if (!player) redirect('/login')

  const avatars = await getPresetAvatars()
  const { welcome } = await searchParams

  return <MyPageEditClient player={player} avatars={avatars} email={user.email ?? ''} isWelcome={welcome === '1'} />
}