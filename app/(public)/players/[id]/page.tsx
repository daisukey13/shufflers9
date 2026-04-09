import { getPlayerById } from '@/lib/queries/players'
import { getPlayerMatches } from '@/lib/queries/matches'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TournamentBadges from '@/components/ui/TournamentBadges'
import Link from 'next/link'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [player, matches] = await Promise.all([
    getPlayerById(id),
    getPlayerMatches(id),
  ])

  if (!player) notFound()

  // 大会戦績を取得
  const { data: finalsParticipation } = await supabase
    .from('tournament_finals_matches')
    .select('*, tournament:tournaments(id, name, status), tournament_finals_sets(*)')
    .or(`player1_id.eq.${id},player2_id.eq.${id}`)
    .order('created_at', { ascending: false })

  // 大会ごとに集計
  const tournamentMap = new Map<string, {
    id: string
    name: string
    status: string
    maxRound: number
    isWinner: boolean
    isRunnerUp: boolean
  }>()

  finalsParticipation?.forEach((m: any) => {
    const tid = m.tournament?.id
    if (!tid) return
    const existing = tournamentMap.get(tid)
    const maxRound = existing ? Math.max(existing.maxRound, m.round) : m.round

    // 優勝判定：最高ラウンドで勝利
    const isWinner = m.winner_id === id
    const isRunnerUp = !isWinner && m.winner_id !== null && (existing?.maxRound ?? 0) <= m.round

    tournamentMap.set(tid, {
      id: tid,
      name: m.tournament?.name ?? '不明',
      status: m.tournament?.status ?? '',
      maxRound,
      isWinner: (existing?.isWinner ?? false) || isWinner,
      isRunnerUp: (existing?.isRunnerUp ?? false) || isRunnerUp,
    })
  })

  const tournamentResults = Array.from(tournamentMap.values())

  const winRate = player.wins + player.losses > 0
    ? Math.round((player.wins / (player.wins + player.losses)) * 100)
    : 0

  const roundNames = ['1回戦', '2回戦', '3回戦', '準決勝', '決勝']
  const getRoundName = (r: number) => roundNames[r - 1] ?? `第${r}回戦`

  return (
    <div className="space-y-8 max-w-3xl mx-auto px-4 py-8">
      {/* プロフィール */}
      <div className="flex items-center gap-6 p-6 bg-purple-900/20 border border-purple-800/30 rounded-2xl">
        <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-purple-500 overflow-hidden flex items-center justify-center flex-shrink-0">
          {player.avatar_url
            ? <img src={player.avatar_url} className="w-full h-full object-cover" />
            : <span className="text-3xl">👤</span>
          }
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{player.name}</h1>
            {player.address && (
              <span className="text-sm text-gray-400">📍 {player.address}</span>
            )}
          </div>
          <TournamentBadges
            wins={player.tournament_wins ?? 0}
            runnerUps={player.tournament_runner_ups ?? 0}
            qualifications={player.tournament_qualifications ?? 0}
            size="md"
          />
          <div className="flex gap-6 mt-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{player.rating}</p>
              <p className="text-xs text-gray-400">RP</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{player.hc ?? 36}</p>
              <p className="text-xs text-gray-400">HC</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{player.wins}</p>
              <p className="text-xs text-gray-400">勝利</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{player.losses}</p>
              <p className="text-xs text-gray-400">敗北</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{winRate}%</p>
              <p className="text-xs text-gray-400">勝率</p>
            </div>
          </div>
        </div>
      </div>

      {/* 大会戦績 */}
      {tournamentResults.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">🏆 大会戦績</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-purple-900/20 border border-purple-800/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-100">{tournamentResults.length}</p>
              <p className="text-xs text-gray-400 mt-1">参加大会数</p>
            </div>
            <div className="bg-purple-900/20 border border-purple-800/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-100">{player.tournament_wins ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">🥇 優勝</p>
            </div>
            <div className="bg-purple-900/20 border border-purple-800/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-100">{player.tournament_runner_ups ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">🥈 準優勝</p>
            </div>
          </div>
          <div className="space-y-2">
            {tournamentResults.map(t => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="flex items-center gap-3 p-3 bg-purple-900/20 border border-purple-800/30 rounded-xl hover:bg-purple-900/40 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.isWinner ? '🥇 優勝' :
                     t.isRunnerUp ? '🥈 準優勝' :
                     `🎖️ 本戦${getRoundName(t.maxRound)}進出`}
                  </p>
                </div>
                <span className="text-xs text-purple-400">詳細 →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 試合履歴 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-300 mb-4">試合履歴</h2>
        {matches.length === 0 ? (
          <p className="text-gray-400 text-sm">試合がありません</p>
        ) : (
          <div className="space-y-2">
            {matches.map(match => {
              const isPlayer1 = match.player1_id === player.id
              const opponent = isPlayer1 ? match.player2 : match.player1
              const myScore = isPlayer1 ? match.score1 : match.score2
              const oppScore = isPlayer1 ? match.score2 : match.score1
              const isWin = match.winner_id === player.id
              const ratingChange = isPlayer1 ? match.rating_change1 : match.rating_change2

              return (
                <div key={match.id} className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    isWin ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                  }`}>
                    {isWin ? '勝' : '負'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-white">vs {opponent?.name ?? '不明'}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(match.played_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <span className="font-bold text-white">{myScore} - {oppScore}</span>
                  <span className={`text-sm font-medium ${
                    ratingChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {ratingChange >= 0 ? '+' : ''}{ratingChange}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}