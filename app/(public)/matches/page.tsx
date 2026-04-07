import { getRecentSinglesMatches, getRecentTeamsMatches } from '@/lib/queries/matches'
import Link from 'next/link'

export default async function MatchesPage() {
  const [singles, teams] = await Promise.all([
    getRecentSinglesMatches(30),
    getRecentTeamsMatches(30),
  ])

  // 保存済みのランクとHCで大金星判定
  const isUpset = (match: any) => {
    if (!match.winner_id) return false
    const isP1Winner = match.winner_id === match.player1_id
    const winnerRank = isP1Winner ? match.player1_rank : match.player2_rank
    const loserRank = isP1Winner ? match.player2_rank : match.player1_rank
    const winnerHc = isP1Winner ? match.player1_hc : match.player2_hc
    const loserHc = isP1Winner ? match.player2_hc : match.player1_hc

    if (!winnerRank || !loserRank) return false
    const rankDiff = winnerRank - loserRank
    const hcDiff = (winnerHc ?? 36) - (loserHc ?? 36)
    return rankDiff >= 10 || hcDiff >= 5
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-10">
        <h1 className="text-2xl font-bold">📋 試合結果</h1>

        {/* 個人戦 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">個人戦</h2>
          {singles.length === 0 ? (
            <p className="text-gray-400 text-sm">データがありません</p>
          ) : (
            <div className="space-y-4">
              {singles.map(match => {
                const winnerId = match.winner_id
                const date = new Date(match.played_at)
                const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
                const upset = isUpset(match)
                const isP1Winner = winnerId === match.player1_id

                return (
                  <div key={match.id} className={`p-6 border rounded-2xl ${upset ? 'bg-yellow-900/20 border-yellow-600/40' : 'bg-purple-900/20 border-purple-800/30'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-sm text-gray-400">{dateStr}</p>
                      {upset && (
                        <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full">
                          ⭐ 大金星
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Player1 */}
                      <Link href={`/players/${match.player1_id}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className={`w-20 h-20 rounded-full overflow-hidden bg-gray-800 border-2 flex-shrink-0 ${
                          upset && isP1Winner ? 'border-yellow-400 avatar-glow' : 'border-purple-700/50'
                        }`}>
                          {match.player1?.avatar_url
                            ? <img src={match.player1.avatar_url} className="w-full h-full object-cover" />
                            : <span className="text-3xl flex items-center justify-center h-full">👤</span>
                          }
                        </div>
                        <span className={`font-bold text-sm text-center ${isP1Winner ? 'text-white' : 'text-gray-400'}`}>
                          {match.player1?.name ?? '不明'}
                        </span>
                        <div className="flex gap-2 text-xs text-gray-400">
                          <span>RP {match.player1?.rating ?? '-'}</span>
                          <span>HC {match.player1_hc ?? match.player1?.hc ?? '-'}</span>
                          {match.player1_rank && <span>#{match.player1_rank}</span>}
                        </div>
                        {isP1Winner && (
                          <span className={`text-xs font-bold ${upset ? 'text-yellow-400' : 'text-green-400'}`}>
                            {upset ? '⭐ 大金星' : '勝利'}
                          </span>
                        )}
                      </Link>

                      {/* スコア */}
                      <div className="text-center flex-shrink-0 space-y-1">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold mx-auto">VS</div>
                        <p className="text-3xl font-bold text-white">{match.score1} - {match.score2}</p>
                      </div>

                      {/* Player2 */}
                      <Link href={`/players/${match.player2_id}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className={`w-20 h-20 rounded-full overflow-hidden bg-gray-800 border-2 flex-shrink-0 ${
                          upset && !isP1Winner ? 'border-yellow-400 avatar-glow' : 'border-purple-700/50'
                        }`}>
                          {match.player2?.avatar_url
                            ? <img src={match.player2.avatar_url} className="w-full h-full object-cover" />
                            : <span className="text-3xl flex items-center justify-center h-full">👤</span>
                          }
                        </div>
                        <span className={`font-bold text-sm text-center ${!isP1Winner && winnerId ? 'text-white' : 'text-gray-400'}`}>
                          {match.player2?.name ?? '不明'}
                        </span>
                        <div className="flex gap-2 text-xs text-gray-400">
                          <span>RP {match.player2?.rating ?? '-'}</span>
                          <span>HC {match.player2_hc ?? match.player2?.hc ?? '-'}</span>
                          {match.player2_rank && <span>#{match.player2_rank}</span>}
                        </div>
                        {!isP1Winner && winnerId && (
                          <span className={`text-xs font-bold ${upset ? 'text-yellow-400' : 'text-green-400'}`}>
                            {upset ? '⭐ 大金星' : '勝利'}
                          </span>
                        )}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* チーム戦 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">チーム戦</h2>
          {teams.length === 0 ? (
            <p className="text-gray-400 text-sm">データがありません</p>
          ) : (
            <div className="space-y-4">
              {teams.map(match => {
                const winnerId = match.winner_id
                const date = new Date(match.played_at)
                const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
                return (
                  <div key={match.id} className="p-6 bg-purple-900/20 border border-purple-800/30 rounded-2xl">
                    <p className="text-sm text-gray-400 mb-4">{dateStr}</p>
                    <div className="flex items-center gap-4">
                      <Link href={`/teams/${match.team1_id}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800 border-2 border-purple-700/50 flex-shrink-0">
                          {match.team1?.avatar_url
                            ? <img src={match.team1.avatar_url} className="w-full h-full object-cover" />
                            : <span className="text-3xl flex items-center justify-center h-full">👥</span>
                          }
                        </div>
                        <span className={`font-bold text-sm text-center ${winnerId === match.team1_id ? 'text-white' : 'text-gray-400'}`}>
                          {match.team1?.name ?? '不明'}
                        </span>
                        {winnerId === match.team1_id && (
                          <span className="text-xs font-bold text-green-400">勝利</span>
                        )}
                      </Link>

                      <div className="text-center flex-shrink-0 space-y-1">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold mx-auto">VS</div>
                        <p className="text-3xl font-bold text-white">{match.score1} - {match.score2}</p>
                      </div>

                      <Link href={`/teams/${match.team2_id}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800 border-2 border-purple-700/50 flex-shrink-0">
                          {match.team2?.avatar_url
                            ? <img src={match.team2.avatar_url} className="w-full h-full object-cover" />
                            : <span className="text-3xl flex items-center justify-center h-full">👥</span>
                          }
                        </div>
                        <span className={`font-bold text-sm text-center ${winnerId === match.team2_id ? 'text-white' : 'text-gray-400'}`}>
                          {match.team2?.name ?? '不明'}
                        </span>
                        {winnerId === match.team2_id && (
                          <span className="text-xs font-bold text-green-400">勝利</span>
                        )}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}