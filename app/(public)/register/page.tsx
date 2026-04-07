import { getPresetAvatars } from '@/lib/avatars'
import RegisterClient from './RegisterClient'

export default async function RegisterPage() {
  const avatars = await getPresetAvatars()
  return <RegisterClient avatars={avatars} />
}