import { createClient } from '@/lib/supabase/server'
import HeaderClient from './HeaderClient'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let avatarUrl: string | null = null
  if (user) {
    const { data: player } = await supabase
      .from('players')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single()
    avatarUrl = player?.avatar_url ?? null
  }

  return <HeaderClient isLoggedIn={!!user} avatarUrl={avatarUrl} />
}