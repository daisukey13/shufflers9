import { createClient } from '@/lib/supabase/server'
import RegisterClient from './RegisterClient'

export default async function RegisterPage() {
  return <RegisterClient />
}