import { createClient } from '@/lib/supabase/server'

export async function getRecentTournamentWinners(limit = 5) {
  const supabase = await createClient()

  const { data: tournaments, error: tError } = await supabase
    .from('tournaments')
    .select('id, name, finished_at')
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
    .limit(limit)
  if (tError || !tournaments || tournaments.length === 0) return []

  const results = await Promise.all(
    tournaments.map(async (t) => {
      const { data: finals } = await supabase
        .from('tournament_finals_matches')
        .select('winner_id, round')
        .eq('tournament_id', t.id)
        .order('round', { ascending: false })
        .limit(1)
        .single()
      if (!finals?.winner_id) return null

      const { data: player } = await supabase
        .from('players')
        .select('id, name, avatar_url')
        .eq('id', finals.winner_id)
        .single()
      if (!player) return null

      return {
        tournamentId: t.id,
        tournamentName: t.name,
        finishedAt: t.finished_at,
        winner: player,
      }
    })
  )

 return results.filter((r): r is NonNullable<typeof r> => r !== null)
}