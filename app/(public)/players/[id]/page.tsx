import { getPlayerById } from '@/lib/queries/players'
import { getPlayerAllSinglesMatches, getPlayerDoublesMatches } from '@/lib/queries/matches'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TournamentBadges from '@/components/ui/TournamentBadges'
import Link from 'next/link'

const PER_PAGE = 10

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; page?: string }>
}) {
  const { id } = await params
  const { tab, page } = await searchParams
  const activeTab = tab === 'doubles' ? 'doubles' : 'singles'
  const currentPage = Math.max(1, parseInt(page ?? '1'))

  const supabase = await createClient()

  const [player, matches, doublesMatches] = await Promise.all([
    getPlayerById(id),
    getPlayerAllSinglesMatches(id),
    getPlayerDoublesMatches(id),
  ])

  if (!player) notFound()

  const { data: finalsParticipation } = await supabase
    .from('tournament_finals_matches')
    .select('*, tournament:tournaments(id, name, status)')
    .or(`player1_id.eq.${id},player2_id.eq.${id}`)
    .order('created_at', { ascending: false })

  const tournamentMap = new Map<string, {
    id: string; name: string; status: string
    maxRound: number; isWinner: boolean; isRunnerUp: boolean
  }>()

  // まず各大会の最大ラウンドを計算
  const tournamentMaxRoundMap = new Map<string, number>()
  finalsParticipation?.forEach((m: any) => {
    const tid = m.tournament?.id
    if (!tid) return
    const current = tournamentMaxRoundMap.get(tid) ?? 0
    tournamentMaxRoundMap.set(tid, Math.max(current, m.round))
  })

  finalsParticipation?.forEach((m: any) => {
    const tid = m.tournament?.id
    if (!tid) return
    const existing = tournamentMap.get(tid)
    const maxRound = existing ? Math.max(existing.maxRound, m.round) : m.round
    const tournamentMaxRound = tournamentMaxRoundMap.get(tid) ?? 0
    const isWinner = m.winner_id === id
    // 準優勝は決勝（最大ラウンド）で負けた場合のみ
    const isRunnerUp = !isWinner && m.winner_id !== null && m.round === tournamentMaxRound
    tournamentMap.set(tid, {
      id: tid, name: m.tournament?.name ?? '不明',
      status: m.tournament?.status ?? '', maxRound,
      isWinner: (existing?.isWinner ?? false) || isWinner,
      isRunnerUp: (existing?.isRunnerUp ?? false) || isRunnerUp,
    })
  })

  const tournamentResults = Array.from(tournamentMap.values())
  const roundNames = ['1回戦', '2回戦', '3回戦', '準決勝', '決勝']
  const getRoundName = (r: number) => roundNames[r - 1] ?? `第${r}回戦`

// 全シングルス試合から勝敗を再計算
  const totalSinglesWins = matches.filter((m: any) => m.winner_id === player.id).length
  const totalSinglesLosses = matches.filter((m: any) => m.winner_id && m.winner_id !== player.id).length


  const winRate = totalSinglesWins + totalSinglesLosses > 0
    ? Math.round((totalSinglesWins / (totalSinglesWins + totalSinglesLosses)) * 100) : 0
  const doublesWinRate = (player.doubles_wins ?? 0) + (player.doubles_losses ?? 0) > 0
    ? Math.round(((player.doubles_wins ?? 0) / ((player.doubles_wins ?? 0) + (player.doubles_losses ?? 0))) * 100) : 0

  const totalSinglesPages = Math.ceil(matches.length / PER_PAGE)
  const totalDoublesPages = Math.ceil(doublesMatches.length / PER_PAGE)
  const pagedMatches = matches.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  const pagedDoubles = doublesMatches.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  // パートナーとの通算成績を事前計算
  const partnerStatsMap = new Map<string, { wins: number; losses: number }>()
  doublesMatches.forEach((m: any) => {
    const isPair1 = m.pair1_player1_id === player.id || m.pair1_player2_id === player.id
    const partner = isPair1
      ? (m.pair1_player1_id === player.id ? m.pair1_player2 : m.pair1_player1)
      : (m.pair2_player1_id === player.id ? m.pair2_player2 : m.pair2_player1)
    if (!partner?.id) return
    const isWin = (isPair1 && m.winner_pair === 1) || (!isPair1 && m.winner_pair === 2)
    const prev = partnerStatsMap.get(partner.id) ?? { wins: 0, losses: 0 }
    partnerStatsMap.set(partner.id, {
      wins: prev.wins + (isWin ? 1 : 0),
      losses: prev.losses + (isWin ? 0 : 1),
    })
  })

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

          {/* シングルス成績 */}
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <img src="/shuffleboard-puck-blue.png" className="w-3 h-3 object-contain" />
              シングルス
            </p>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-purple-400">{player.rating}</p>
                <p className="text-xs text-gray-400">RP</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{player.hc ?? 36}</p>
                <p className="text-xs text-gray-400">HC</p>
              </div>
              <div className="text-center">
               <p className="text-xl font-bold text-green-400">{totalSinglesWins}</p>
                <p className="text-xs text-gray-400">勝</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-400">{totalSinglesLosses}</p>
                <p className="text-xs text-gray-400">敗</p> 
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-400">{winRate}%</p>
                <p className="text-xs text-gray-400">勝率</p>
              </div>
            </div>
          </div>

          {/* ダブルス成績 */}
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <img src="/shuffleboard-puck-red.png" className="w-3 h-3 object-contain" />
              ダブルス
            </p>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-purple-400">{player.doubles_rating ?? 1000}</p>
                <p className="text-xs text-gray-400">RP</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-400">{player.doubles_wins ?? 0}</p>
                <p className="text-xs text-gray-400">勝</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-400">{player.doubles_losses ?? 0}</p>
                <p className="text-xs text-gray-400">敗</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-400">{doublesWinRate}%</p>
                <p className="text-xs text-gray-400">勝率</p>
              </div>
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

      {/* 試合履歴タブ */}
      <section>
        <div className="flex gap-2 bg-black/20 rounded-lg p-1 mb-4">
          <Link
            href={`/players/${id}?tab=singles&page=1`}
            className={`flex-1 py-2 rounded-md text-sm font-medium text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'singles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <img src="/shuffleboard-puck-blue.png" className="w-4 h-4 object-contain" />
            シングルス ({matches.length})
          </Link>
          <Link
            href={`/players/${id}?tab=doubles&page=1`}
            className={`flex-1 py-2 rounded-md text-sm font-medium text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'doubles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <img src="/shuffleboard-puck-red.png" className="w-4 h-4 object-contain" />
            ダブルス ({doublesMatches.length})
          </Link>
        </div>

        {/* シングルス履歴 */}
        {activeTab === 'singles' && (
          <>
            {pagedMatches.length === 0 ? (
              <p className="text-gray-400 text-sm">試合がありません</p>
            ) : (
              <div className="space-y-2">
                {pagedMatches.map((match: any) => {
                  const isPlayer1 = match.player1_id === player.id
                  const opponent = isPlayer1 ? match.player2 : match.player1
                  const myScore = isPlayer1 ? match.score1 : match.score2
                  const oppScore = isPlayer1 ? match.score2 : match.score1
                  const isWin = match.winner_id === player.id
                  const ratingChange = isPlayer1 ? match.rating_change1 : match.rating_change2

                  return (
  <div key={match.id} className={`flex items-center gap-4 p-4 rounded-xl border-l-4 ${isWin ? 'border-green-500 bg-green-900/10' : 'border-red-500 bg-red-900/10'}`}>
                      <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${isWin ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {isWin ? '勝' : '負'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">vs {opponent?.name ?? '不明'}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(match.played_at).toLocaleDateString('ja-JP')}
                          {match.tournament_name && (
                            <span className="ml-1.5 text-purple-400">🏆 {match.tournament_name}</span>
                          )}
                      </p>
                      </div>
                      <span className="font-bold text-white">
                        {match.source === 'finals' && match.tournament_finals_sets?.length > 0
                          ? match.tournament_finals_sets
                              .sort((a: any, b: any) => a.set_number - b.set_number)
                              .map((s: any) => {
                                const my = isPlayer1 ? s.score1 : s.score2
                                const opp = isPlayer1 ? s.score2 : s.score1
                                return `${my}-${opp}`
                              })
                              .join(' / ')
                          : `${myScore} - ${oppScore}`
                        }
                      </span>
                      <span className={`text-sm font-medium flex-shrink-0 ${ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {ratingChange >= 0 ? '+' : ''}{ratingChange}pt
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {totalSinglesPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                {currentPage > 1 && (
                  <Link href={`/players/${id}?tab=singles&page=${currentPage - 1}`} className="px-4 py-2 bg-purple-900/30 border border-purple-800/30 rounded-lg text-sm text-purple-400 hover:bg-purple-900/50 transition">
                    ← 前へ
                  </Link>
                )}
                <span className="text-sm text-gray-400">{currentPage} / {totalSinglesPages}</span>
                {currentPage < totalSinglesPages && (
                  <Link href={`/players/${id}?tab=singles&page=${currentPage + 1}`} className="px-4 py-2 bg-purple-900/30 border border-purple-800/30 rounded-lg text-sm text-purple-400 hover:bg-purple-900/50 transition">
                    次へ →
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* ダブルス履歴 */}
        {activeTab === 'doubles' && (
          <>
            {pagedDoubles.length === 0 ? (
              <p className="text-gray-400 text-sm">試合がありません</p>
            ) : (
              <div className="space-y-2">
                {pagedDoubles.map((match: any) => {
                  const isPair1 = match.pair1_player1_id === player.id || match.pair1_player2_id === player.id
                  const isWin = (isPair1 && match.winner_pair === 1) || (!isPair1 && match.winner_pair === 2)
                  const myScore = isPair1 ? match.score1 : match.score2
                  const oppScore = isPair1 ? match.score2 : match.score1
                  const partner = isPair1
                    ? (match.pair1_player1_id === player.id ? match.pair1_player2 : match.pair1_player1)
                    : (match.pair2_player1_id === player.id ? match.pair2_player2 : match.pair2_player1)
                  const opp1 = isPair1 ? match.pair2_player1 : match.pair1_player1
                  const opp2 = isPair1 ? match.pair2_player2 : match.pair1_player2
                  const ratingChange = isPair1 ? match.rating_change1 : match.rating_change2
                  const partnerId = partner?.id
                  const partnerStats = partnerId ? partnerStatsMap.get(partnerId) : null

                  return (
                    <div key={match.id} className={`flex items-center gap-4 p-4 rounded-xl border-l-4 ${isWin ? 'border-green-500 bg-green-900/10' : 'border-red-500 bg-red-900/10'}`}>
                      <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${isWin ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {isWin ? '勝' : '負'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          vs {opp1?.name ?? '不明'} / {opp2?.name ?? '不明'}
                        </p>
                        <p className="text-xs mt-0.5">
                          <span className="text-yellow-400 font-semibold">
                            🤝 {partner?.name ?? '不明'}
                          </span>
                          {partnerStats && (
                            <span className="ml-1.5">
                              <span className="text-green-400">{partnerStats.wins}勝</span>
                              <span className="text-gray-500"> / </span>
                              <span className="text-red-400">{partnerStats.losses}敗</span>
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(match.played_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <span className="font-bold text-white">{myScore} - {oppScore}</span>
                      <span className={`text-sm font-medium flex-shrink-0 ${ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {ratingChange >= 0 ? '+' : ''}{ratingChange}pt
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {totalDoublesPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                {currentPage > 1 && (
                  <Link href={`/players/${id}?tab=doubles&page=${currentPage - 1}`} className="px-4 py-2 bg-purple-900/30 border border-purple-800/30 rounded-lg text-sm text-purple-400 hover:bg-purple-900/50 transition">
                    ← 前へ
                  </Link>
                )}
                <span className="text-sm text-gray-400">{currentPage} / {totalDoublesPages}</span>
                {currentPage < totalDoublesPages && (
                  <Link href={`/players/${id}?tab=doubles&page=${currentPage + 1}`} className="px-4 py-2 bg-purple-900/30 border border-purple-800/30 rounded-lg text-sm text-purple-400 hover:bg-purple-900/50 transition">
                    次へ →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}