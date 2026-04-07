import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPresetAvatars } from '@/lib/avatars'
import ProfileSetupClient from './ProfileSetupClient'

export default async function ProfileSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const avatars = await getPresetAvatars()
  return <ProfileSetupClient avatars={avatars} />
}