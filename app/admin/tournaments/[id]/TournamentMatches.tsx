import { createClient } from '@/lib/supabase/server'

export default async function TournamentMatches({
  tournamentId,
  type,
}: {
  tournamentId: string
  type: 'singles' | 'teams'
}) {
  const supabase = await createClient()

  const { data: matches } = type === 'singles'
    ? await supabase
        .from('singles_matches')
        .select('*, player1:players!player1_id(*), player2:players!player2_id(*)')
        .eq('tournament_id', tournamentId)
        .order('tournament_round')
    : await supabase
        .from('teams_matches')
        .select('*, team1:teams!team1_id(*), team2:teams!team2_id(*)')
        .eq('tournament_id', tournamentId)
        .order('tournament_round')

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-300">試合結果</h2>

      {!matches || matches.length === 0 ? (
        <p className="text-gray-400 text-sm">
          試合を登録するには、試合登録画面でこの大会を選択してください。
        </p>
      ) : (
        <div className="space-y-2">
          {matches.map((match: any) => {
            const name1 = type === 'singles' ? match.player1?.name : match.team1?.name
            const name2 = type === 'singles' ? match.player2?.name : match.team2?.name
            return (
              <div
                key={match.id}
                className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl"
              >
                {match.tournament_round && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    R{match.tournament_round}
                  </span>
                )}
                <div className="flex-1 flex items-center gap-2 text-sm">
                  <span className="font-medium text-white">{name1 ?? '不明'}</span>
                  <span className="font-bold text-white">{match.score1} - {match.score2}</span>
                  <span className="font-medium text-white">{name2 ?? '不明'}</span>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(match.played_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}