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

  const [avatars, { data: takenData }] = await Promise.all([
    getPresetAvatars(),
    supabase.from('players').select('avatar_url').not('avatar_url', 'is', null).neq('id', player.id),
  ])

  const takenUrls = takenData
    ?.map(p => p.avatar_url!.split('?')[0])
    .filter(url => url.includes('/preset/')) ?? []

  const { welcome } = await searchParams

  return <MyPageEditClient player={player} avatars={avatars} email={user.email ?? ''} isWelcome={welcome === '1'} takenUrls={takenUrls} />
}