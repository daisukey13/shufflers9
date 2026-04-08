import { createClient } from '@/lib/supabase/server'
import { getPlayerByUserId } from '@/lib/queries/players'
import { getPlayerMatches } from '@/lib/queries/matches'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/ui/LogoutButton'

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const player = await getPlayerByUserId(user.id)
  if (!player) redirect('/login')

  const matches = await getPlayerMatches(player.id)

  const { data: allPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('is_active', true)
    .eq('is_admin', false)
    .order('rating', { ascending: false })

  const rank = (allPlayers?.findIndex(p => p.id === player.id) ?? 0) + 1
  const totalPlayers = allPlayers?.length ?? 0

  const { data: teamMemberships } = await supabase
    .from('team_members')
    .select('*, team:teams(*)')
    .eq('player_id', player.id)

  // 受付中・エントリー終了の大会を取得
  const { data: openTournaments } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .in('status', ['open', 'entry_closed', 'qualifying', 'qualifying_done', 'finals'])
    .order('created_at', { ascending: false })

  // 自分のエントリー状況を取得
  const { data: myEntries } = await supabase
    .from('tournament_entries')
    .select('tournament_id, status, cancel_requested')
    .eq('player_id', player.id)

  const entryMap = new Map(myEntries?.map(e => [e.tournament_id, e]) ?? [])

  const winRate = player.wins + player.losses > 0
    ? Math.round((player.wins / (player.wins + player.losses)) * 100)
    : 0

  const totalMatches = player.wins + player.losses

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-300">マイページ</h1>
          <div className="flex gap-3">
            <Link href="/mypage/edit" className="text-sm text-purple-400 hover:text-purple-300 transition">
              ✏️ 編集
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* プロフィールカード */}
        <div className="bg-[#1a0f35] border border-purple-800/30 rounded-2xl p-6 space-y-5">
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
              <div className="w-14 h-14 rounded-full border-2 border-purple-500 overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
                {player.avatar_url
                  ? <img src={player.avatar_url} className="w-full h-full object-cover" />
                  : <span className="text-2xl">👤</span>
                }
              </div>
              <h2 className="text-2xl font-bold text-white">{player.name}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">🏅 ランキングポイント</p>
              <p className="text-4xl font-bold text-white">{player.rating}</p>
            </div>
            <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">📊 ハンディキャップ</p>
              <p className="text-4xl font-bold text-white">{player.hc ?? 36}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{player.wins}</p>
              <p className="text-xs text-gray-400 mt-1">勝利</p>
            </div>
            <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{player.losses}</p>
              <p className="text-xs text-gray-400 mt-1">敗北</p>
            </div>
            <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{winRate}%</p>
              <p className="text-xs text-gray-400 mt-1">勝率</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all"
                style={{ width: `${winRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right">{totalMatches} 試合</p>
          </div>
        </div>

        {/* 大会エントリー */}
        {openTournaments && openTournaments.length > 0 && (
          <div className="bg-[#1a0f35] border border-purple-800/30 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">🏆 大会</h2>
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
            <span className="text-3xl">🏒</span>
            <span className="text-sm font-medium text-purple-300">個人戦を登録</span>
          </Link>
          <Link
            href="/matches/register/teams"
            className="flex flex-col items-center gap-2 p-5 bg-[#1a0f35] border border-purple-800/30 rounded-2xl hover:bg-purple-900/30 transition"
          >
            <span className="text-3xl">👥</span>
            <span className="text-sm font-medium text-green-300">チーム戦を登録</span>
          </Link>
        </div>

        {/* 直近の試合 */}
        <div className="bg-[#1a0f35] border border-purple-800/30 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">直近の試合</h2>
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
                    <div className="mt-2 text-right">
                      <Link
                        href={`/players/${opponent?.id}`}
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        相手プロフィール →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {matches.length > 5 && (
            <Link href="/matches" className="block text-center text-sm text-purple-400 hover:text-purple-300 pt-2">
              🏆 試合結果一覧へ
            </Link>
          )}
        </div>

      </div>
    </div>
  )
}