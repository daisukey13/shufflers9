import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EntriesAdminClient from './EntriesAdminClient'

export default async function EntriesAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const { data: entries } = await supabase
    .from('tournament_entries')
    .select('*, player:players(id, name, avatar_url, hc, rating)')
    .eq('tournament_id', id)
    .order('created_at')

  const { data: players } = await supabase
    .from('players')
    .select('id, name, avatar_url, hc, rating')
    .eq('is_active', true)
    .eq('is_admin', false)
    .order('name')

  return (
    <EntriesAdminClient
      tournament={tournament}
      entries={entries ?? []}
      players={players ?? []}
    />
  )
}