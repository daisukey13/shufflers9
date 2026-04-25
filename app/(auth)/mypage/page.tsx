import { createClient } from '@/lib/supabase/server'
import { getPlayerByUserId } from '@/lib/queries/players'
import { getPlayerMatches, getPlayerDoublesMatches } from '@/lib/queries/matches'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'
import TournamentBadges from '@/components/ui/TournamentBadges'
import RankChart from '@/components/ui/RankChart'

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const player = await getPlayerByUserId(user.id)
  if (!player) redirect('/register')

  const [matches, doublesMatches] = await Promise.all([
    getPlayerMatches(player.id),
    getPlayerDoublesMatches(player.id),
  ])

  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, rating')
    .eq('is_active', true)
    .eq('is_admin', false)
    .order('rating', { ascending: false })

  const { data: allDoublesPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('is_active', true)
    .eq('is_admin', false)
    .order('doubles_rating', { ascending: false })

  const rank = (allPlayers?.findIndex(p => p.id === player.id) ?? 0) + 1
  const doublesRank = (allDoublesPlayers?.findIndex(p => p.id === player.id) ?? 0) + 1
  const totalPlayers = allPlayers?.length ?? 0

  const { data: teamMemberships } = await supabase
    .from('team_members')
    .select('*, team:teams(*)')
    .eq('player_id', player.id)

  const { data: openTournaments } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .in('status', ['open', 'entry_closed', 'qualifying', 'qualifying_done', 'finals'])
    .order('created_at', { ascending: false })

  const { data: myEntries } = await supabase
    .from('tournament_entries')
    .select('tournament_id, status, cancel_requested')
    .eq('player_id', player.id)

  const entryMap = new Map(myEntries?.map(e => [e.tournament_id, e]) ?? [])

  const { data: finalsParticipation } = await supabase
    .from('tournament_finals_matches')
    .select('*, tournament:tournaments(id, name, status)')
    .or(`player1_id.eq.${player.id},player2_id.eq.${player.id}`)
    .order('created_at', { ascending: false })

  const tournamentMap = new Map<string, {
    id: string; name: string; status: string
    maxRound: number; isWinner: boolean; isRunnerUp: boolean
  }>()

  finalsParticipation?.forEach((m: any) => {
    const tid = m.tournament?.id
    if (!tid) return
    const existing = tournamentMap.get(tid)
    const maxRound = existing ? Math.max(existing.maxRound, m.round) : m.round
    const isWinner = m.winner_id === player.id
    const isRunnerUp = !isWinner && m.winner_id !== null && (existing?.maxRound ?? 0) <= m.round
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

  // Rank history: rating_change から過去レーティングを逆算して近似順位を計算
  const otherRatings = (allPlayers ?? [])
    .filter((p: any) => p.id !== player.id)
    .map((p: any) => (p.rating ?? 1000) as number)

  const last5 = matches.slice(0, 5).reverse() // 古い順
  // 全変化量の合計を先に計算して「最古の試合前のレーティング」を求める
  let totalChange = 0
  for (const m of last5) {
    const isP1 = m.player1_id === player.id
    totalChange += isP1 ? (m.rating_change1 ?? 0) : (m.rating_change2 ?? 0)
  }

  const rankPoints: { label: string; rank: number }[] = []
  let rollingRating = player.rating - totalChange
  for (let i = 0; i < last5.length; i++) {
    const m = last5[i]
    const isP1 = m.player1_id === player.id
    const change = isP1 ? (m.rating_change1 ?? 0) : (m.rating_change2 ?? 0)
    rollingRating += change
    const approxRank = otherRatings.filter(r => r > rollingRating).length + 1
    rankPoints.push({ label: `試合${i + 1}`, rank: approxRank })
  }

  const rankHistory = last5.length > 0
    ? [...rankPoints, { label: '現在', rank }]
    : []

  const singlesWinRate = player.wins + player.losses > 0
    ? Math.round((player.wins / (player.wins + player.losses)) * 100) : 0
  const doublesWinRate = (player.doubles_wins ?? 0) + (player.doubles_losses ?? 0) > 0
    ? Math.round(((player.doubles_wins ?? 0) / ((player.doubles_wins ?? 0) + (player.doubles_losses ?? 0))) * 100) : 0

  const totalMatches = player.wins + player.losses

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-300">マイページ</h1>
          <div className="flex gap-3">
            {player.is_admin && (
              <Link href="/admin" className="text-sm text-yellow-400 hover:text-yellow-300 transition">
                ⚙️ 管理画面
              </Link>
            )}
            <Link href="/mypage/edit" className="text-sm text-purple-400 hover:text-purple-300 transition">
              ✏️ 編集
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* プロフィールカード */}
        <div className="bg-[#1a0f35] border border-purple-800/30 rounded-2xl p-6 space-y-5">

          {/* アバター・名前・順位 */}
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-2xl ${
                rank === 1 ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400' :
                rank === 2 ? 'border-gray-400 bg-gray-400/20 text-gray-300' :
                rank === 3 ? 'border-orange-400 bg-orange-400/20 text-orange-400' :
                'border-purple-500 bg-purple-500/20 text-purple-300'
              }`}>
                {rank}
              </div>
              {rank === 1 && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg">👑</span>
              )}
              <p className="text-xs text-gray-400 text-center mt-1">全{totalPlayers}人中</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-full border-2 border-purple-500 overflow-hidden bg-gray-800 flex items-center justify-center">
                  {player.avatar_url
                    ? <img src={player.avatar_url} className="w-full h-full object-cover" />
                    : <span className="text-2xl">👤</span>
                  }
                </div>
                <div className="absolute -bottom-1 -right-1 bg-purple-700 border border-purple-500 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white">
                  HC{player.hc ?? 36}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold text-white">{player.name}</h2>
                  {player.address && (
                    <span className="text-sm text-gray-400">📍 {player.address}</span>
                  )}
                </div>
                <TournamentBadges
                  wins={player.tournament_wins ?? 0}
                  runnerUps={player.tournament_runner_ups ?? 0}
                  qualifications={player.tournament_qualifications ?? 0}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* シングルス成績 */}
          <div>
            <p className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1.5">
              <img src="/shuffleboard-puck-blue.png" className="w-4 h-4 object-contain" />
              シングルス
            </p>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center col-span-2">
                <p className="text-xs text-gray-400 mb-1">ランキングポイント</p>
                <p className="text-3xl font-bold text-white">{player.rating}</p>
                <p className="text-xs text-gray-500 mt-1">第{rank}位</p>
              </div>
              <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">勝利</p>
                <p className="text-2xl font-bold text-green-400">{player.wins}</p>
              </div>
              <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">敗北</p>
                <p className="text-2xl font-bold text-red-400">{player.losses}</p>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${singlesWinRate}%` }} />
              </div>
              <p className="text-xs text-gray-400 text-right">勝率 {singlesWinRate}% · {totalMatches}試合</p>
            </div>
            {rankHistory.length >= 2 && (
              <div className="mt-3">
                <RankChart points={rankHistory} />
              </div>
            )}
          </div>

          {/* ダブルス成績 */}
          <div>
            <p className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1.5">
              <img src="/shuffleboard-puck-red.png" className="w-4 h-4 object-contain" />
              ダブルス
            </p>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center col-span-2">
                <p className="text-xs text-gray-400 mb-1">ランキングポイント</p>
                <p className="text-3xl font-bold text-white">{player.doubles_rating ?? 1000}</p>
                <p className="text-xs text-gray-500 mt-1">第{doublesRank}位</p>
              </div>
              <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">勝利</p>
                <p className="text-2xl font-bold text-green-400">{player.doubles_wins ?? 0}</p>
              </div>
              <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">敗北</p>
                <p className="text-2xl font-bold text-red-400">{player.doubles_losses ?? 0}</p>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${doublesWinRate}%` }} />
              </div>
              <p className="text-xs text-gray-400 text-right">勝率 {doublesWinRate}% · {(player.doubles_wins ?? 0) + (player.doubles_losses ?? 0)}試合</p>
            </div>
          </div>
        </div>

        {/* 大会戦績 */}
        {tournamentResults.length > 0 && (
          <div className="bg-[#1a0f35] border border-purple-800/30 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300">🏆 大会戦績</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-yellow-100">{tournamentResults.length}</p>
                <p className="text-xs text-gray-400 mt-1">参加大会数</p>
              </div>
              <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{player.tournament_wins ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">🥇 優勝</p>
              </div>
              <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-400">{player.tournament_runner_ups ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">🥈 準優勝</p>
              </div>
            </div>
            <div className="space-y-2">
              {tournamentResults.map(t => (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="flex items-center gap-3 p-3 bg-[#12082a] border border-purple-800/30 rounded-xl hover:bg-purple-900/20 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{t.name}</p>
                    <p className="text-xs mt-0.5">
                      {t.isWinner ? (
                        <span className="text-yellow-400">🥇 優勝</span>
                      ) : t.isRunnerUp ? (
                        <span className="text-gray-400">🥈 準優勝</span>
                      ) : (
                        <span className="text-orange-400">🎖️ 本戦{getRoundName(t.maxRound)}進出</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-purple-400 flex-shrink-0">詳細 →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 大会エントリー */}
        {openTournaments && openTournaments.length > 0 && (
          <div className="bg-[#1a0f35] border border-purple-800/30 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">🏆 大会エントリー</h2>
            <div className="space-y-2">
              {openTournaments.map(t => {
                const entry = entryMap.get(t.id)
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-[#12082a] border border-purple-800/30 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{t.name}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.status === 'open' ? 'bg-green-900/50 text-green-400' :
                          t.status === 'entry_closed' ? 'bg-yellow-900/50 text-yellow-400' :
                          'bg-blue-900/50 text-blue-400'
                        }`}>
                          {t.status === 'open' ? '受付中' :
                           t.status === 'entry_closed' ? 'エントリー終了' :
                           t.status === 'qualifying' ? '予選中' :
                           t.status === 'qualifying_done' ? '予選完了' : '本戦中'}
                        </span>
                        {entry && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            entry.status === 'cancelled' ? 'bg-gray-700 text-gray-400' :
                            entry.cancel_requested ? 'bg-red-900/50 text-red-400' :
                            'bg-purple-900/50 text-purple-400'
                          }`}>
                            {entry.status === 'cancelled' ? 'キャンセル済み' :
                             entry.cancel_requested ? 'キャンセル申請中' : 'エントリー済み'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link
                        href={`/tournaments/${t.id}/entry`}
                        className="text-xs px-3 py-1 bg-purple-700/50 hover:bg-purple-600/50 rounded-lg text-purple-300 transition"
                      >
                        {entry ? '確認・変更' : 'エントリー'}
                      </Link>
                      <Link
                        href={`/tournaments/${t.id}`}
                        className="text-xs px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-gray-300 transition"
                      >
                        詳細
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 所属チーム */}
        {teamMemberships && teamMemberships.length > 0 && (
          <div className="bg-[#1a0f35] border border-purple-800/30 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">👥 所属チーム</h2>
            <div className="space-y-2">
              {teamMemberships.map(tm => (
                <Link
                  key={tm.id}
                  href={`/teams/${tm.team_id}`}
                  className="flex items-center gap-3 p-3 bg-[#12082a] border border-purple-800/30 rounded-xl hover:bg-purple-900/20 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {(tm.team as any)?.avatar_url
                      ? <img src={(tm.team as any).avatar_url} className="w-full h-full object-cover" />
                      : <span className="text-lg">👥</span>
                    }
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{(tm.team as any)?.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* クイックアクション */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/matches/register/singles"
            className="flex flex-col items-center gap-2 p-5 bg-[#1a0f35] border border-purple-800/30 rounded-2xl hover:bg-purple-900/30 transition"
          >
            <img src="/shuffleboard-puck-blue.png" className="w-10 h-10 object-contain" />
            <span className="text-sm font-medium text-purple-300">個人戦を登録</span>
          </Link>
          <Link
            href="/matches/register/doubles"
            className="flex flex-col items-center gap-2 p-5 bg-[#1a0f35] border border-purple-800/30 rounded-2xl hover:bg-purple-900/30 transition"
          >
            <img src="/shuffleboard-puck-red.png" className="w-10 h-10 object-contain" />
            <span className="text-sm font-medium text-green-300">ダブルスを登録</span>
          </Link>
        </div>

        {/* 直近の試合 */}
        <div className="bg-[#1a0f35] border border-purple-800/30 rounded-2xl p-5 space-y-5">

          {/* シングルス */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <img src="/shuffleboard-puck-blue.png" className="w-5 h-5 object-contain" />
              シングルス直近の試合
            </h2>
            {matches.length === 0 ? (
              <p className="text-gray-500 text-sm">試合がありません</p>
            ) : (
              <div className="space-y-2">
                {matches.slice(0, 5).map(match => {
                  const isPlayer1 = match.player1_id === player.id
                  const opponent = isPlayer1 ? match.player2 : match.player1
                  const myScore = isPlayer1 ? match.score1 : match.score2
                  const oppScore = isPlayer1 ? match.score2 : match.score1
                  const isWin = match.winner_id === player.id
                  const ratingChange = isPlayer1 ? match.rating_change1 : match.rating_change2
                  const date = new Date(match.played_at)
                  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`

                  return (
                    <div
                      key={match.id}
                      className={`p-4 rounded-xl border-l-4 ${
                        isWin ? 'border-green-500 bg-green-900/10' : 'border-red-500 bg-red-900/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400">{dateStr}</p>
                          <p className="text-sm font-medium text-white mt-0.5">
                            <span className={isWin ? 'text-green-400' : 'text-red-400'}>
                              {isWin ? '勝利' : '敗北'}
                            </span>
                            ：{opponent?.name ?? '不明'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">{myScore} - {oppScore}</p>
                          <p className={`text-sm font-medium ${ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {ratingChange >= 0 ? '+' : ''}{ratingChange}pt
                          </p>
                        </div>
                      </div>
                      {opponent?.is_active !== false && (
                        <div className="mt-2 text-right">
                          <Link href={`/players/${opponent?.id}`} className="text-xs text-purple-400 hover:text-purple-300">
                            相手プロフィール →
                          </Link>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {matches.length > 5 && (
              <Link href="/matches" className="block text-center text-sm text-purple-400 hover:text-purple-300 pt-2">
                試合結果一覧へ →
              </Link>
            )}
          </div>

          {/* ダブルス */}
          <div className="space-y-3 border-t border-purple-800/30 pt-5">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <img src="/shuffleboard-puck-red.png" className="w-5 h-5 object-contain" />
              ダブルス直近の試合
            </h2>
            {doublesMatches.length === 0 ? (
              <p className="text-gray-500 text-sm">試合がありません</p>
            ) : (
              <div className="space-y-2">
                {doublesMatches.slice(0, 5).map((match: any) => {
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
                  const date = new Date(match.played_at)
                  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`

                  return (
                    <div
                      key={match.id}
                      className={`p-4 rounded-xl border-l-4 ${
                        isWin ? 'border-green-500 bg-green-900/10' : 'border-red-500 bg-red-900/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400">{dateStr}</p>
                          <p className="text-sm font-medium text-white mt-0.5">
                            <span className={isWin ? 'text-green-400' : 'text-red-400'}>
                              {isWin ? '勝利' : '敗北'}
                            </span>
                            ：{opp1?.name ?? '不明'} / {opp2?.name ?? '不明'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            パートナー：{partner?.name ?? '不明'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">{myScore} - {oppScore}</p>
                          <p className={`text-sm font-medium ${ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {ratingChange >= 0 ? '+' : ''}{ratingChange}pt
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}