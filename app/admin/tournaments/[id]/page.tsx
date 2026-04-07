import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TournamentForm from '../TournamentForm'
import TournamentMatches from './TournamentMatches'

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  return (
    <div className="space-y-10">
      <TournamentForm tournament={tournament} />
      <TournamentMatches tournamentId={id} type={tournament.type} />
    </div>
  )
}