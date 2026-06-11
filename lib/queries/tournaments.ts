import { createPublicClient } from '@/lib/supabase/public'
import { unstable_cache } from 'next/cache'

export const getRecentTournamentWinners = unstable_cache(
  async (limit = 5) => {
    const supabase = createPublicClient()

    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        id, name, finished_at,
        tournament_finals_matches(winner_id, round, winner:players!winner_id(id, name, avatar_url))
      `)
      .eq('status', 'finished')
      .order('finished_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    return data.map(t => {
      const matches = (t.tournament_finals_matches as any[]) ?? []
      const best = matches.reduce<any>((prev, curr) =>
        (prev?.round ?? -1) > (curr?.round ?? -1) ? prev : curr, null)
      if (!best?.winner_id || !best?.winner) return null
      return {
        tournamentId: t.id,
        tournamentName: t.name,
        finishedAt: t.finished_at,
        winner: best.winner as { id: string; name: string; avatar_url: string | null },
      }
    }).filter((r): r is NonNullable<typeof r> => r !== null)
  },
  ['recent-tournament-winners'],
  { revalidate: 1800 } // 30分
)
