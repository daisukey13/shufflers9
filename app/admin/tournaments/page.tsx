import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import TournamentsAdminClient from './TournamentsAdminClient'

export default async function AdminTournamentsPage() {
  const supabase = await createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  return <TournamentsAdminClient tournaments={tournaments ?? []} />
}