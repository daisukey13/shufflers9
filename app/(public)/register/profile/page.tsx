import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPresetAvatars } from '@/lib/avatars'
import ProfileSetupClient from './ProfileSetupClient'

export default async function ProfileSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [avatars, { data: takenData }] = await Promise.all([
    getPresetAvatars(),
    supabase.from('players').select('avatar_url').not('avatar_url', 'is', null),
  ])

  const takenUrls = takenData
    ?.map(p => p.avatar_url!.split('?')[0])
    .filter(url => url.includes('/preset/')) ?? []

  return <ProfileSetupClient avatars={avatars} takenUrls={takenUrls} />
}