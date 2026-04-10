import { getPlayerRankings } from '@/lib/queries/rankings'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'doubles' ? 'doubles' : 'singles'

  const supabase = await createClient()

  const [singlesPlayers, { data: doublesPlayers }] = await Promise.all([
    getPlayerRankings(),
    supabase
      .from('players')
      .select('*')
      .eq('is_active', true)
      .eq('is_admin', false)
      .order('doubles_rating', { ascending: false }),
  ])

  const winRate = (w: number, l: number) => {
    const g = w + l
    return g > 0 ? Math.round((w / g) * 100) : 0
  }

  const renderTop3 = (players: any[], ratingKey: string) => {
    return players.slice(0, 3).map((player, i) => {
      const rank = i + 1
      const wr = winRate(
        ratingKey === 'doubles_rating' ? player.doubles_wins : player.wins,
        ratingKey === 'doubles_rating' ? player.doubles_losses : player.losses
      )
      const borderColor = rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-gray-400' : 'border-orange-500'
      const badgeColor = rank === 1 ? 'bg-yellow-400 text-black' : rank === 2 ? 'bg-gray-400 text-black' : 'bg-orange-500 text-white'
      const bgColor = rank === 1 ? 'bg-gradient-to-r from-yellow-900/40 to-yellow-700/20' : rank === 2 ? 'bg-gradient-to-r from-gray-800/60 to-gray-700/20' : 'bg-gradient-to-r from-orange-900/40 to-orange-700/20'

      return (
        <Link
          key={player.id}
          href={`/players/${player.id}`}
          className={`relative flex items-center gap-4 p-5 border-2 ${borderColor} ${bgColor} rounded-2xl shadow-lg hover:scale-[1.01] transition-transform`}
        >
          {rank === 1 && (
            <div className="absolute top-2 right-3 text-xs text-yellow-400 font-bold">👑 CHAMPION</div>
          )}
          <div className={`w-10 h-10 rounded-full ${badgeColor} font-extrabold flex items-center justify-center text-lg flex-shrink-0 shadow`}>
            {rank}
          </div>
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-500 flex-shrink-0">
            {player.avatar_url
              ? <img src={player.avatar_url} className="w-full h-full object-cover" />
              : <span className="text-3xl flex items-center justify-center h-full bg-gray-800">👤</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-yellow-100 text-xl truncate">{player.name}</p>
            <p className="text-sm text-gray-400 mt-0.5">HC {player.hc ?? 36}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-sm text-green-300">{ratingKey === 'doubles_rating' ? player.doubles_wins : player.wins}勝</span>
              <span className="text-sm text-red-300">{ratingKey === 'doubles_rating' ? player.doubles_losses : player.losses}敗</span>
              <span className="text-sm text-blue-300">{wr}%</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-yellow-100">{ratingKey === 'doubles_rating' ? player.doubles_rating : player.rating}</p>
            <p className="text-xs text-gray-400">ポイント</p>
          </div>
        </Link>
      )
    })
  }

  const renderRest = (players: any[], ratingKey: string, startRank: number) => {
    return players.slice(startRank - 1).map((player, i) => {
      const rank = i + startRank
      const wr = winRate(
        ratingKey === 'doubles_rating' ? player.doubles_wins : player.wins,
        ratingKey === 'doubles_rating' ? player.doubles_losses : player.losses
      )
      return (
        <Link
          key={player.id}
          href={`/players/${player.id}`}
          className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl hover:bg-purple-900/40 transition"
        >
          <span className="text-base font-bold w-8 text-center flex-shrink-0 text-gray-500">{rank}</span>
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30 flex-shrink-0">
            {player.avatar_url
              ? <img src={player.avatar_url} className="w-full h-full object-cover" />
              : <span className="text-2xl flex items-center justify-center h-full">👤</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate text-base">{player.name}</p>
            <p className="text-xs text-gray-400">HC {player.hc ?? 36} · {ratingKey === 'doubles_rating' ? player.doubles_wins : player.wins}勝 {ratingKey === 'doubles_rating' ? player.doubles_losses : player.losses}敗 · {wr}%</p>
          </div>
          <span className="font-bold text-purple-400 flex-shrink-0 text-lg">
            {ratingKey === 'doubles_rating' ? player.doubles_rating : player.rating} pt
          </span>
        </Link>
      )
    })
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-10">

        <h1 className="text-3xl font-bold text-center text-yellow-100">🏆 ランキング</h1>

        {/* タブ */}
        <div className="flex gap-2 bg-black/20 rounded-lg p-1">
          <Link
            href="/rankings?tab=singles"
            className={`flex-1 py-2 rounded-md text-sm font-medium text-center transition ${
              activeTab === 'singles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            シングルスポイント
          </Link>
          <Link
            href="/rankings?tab=doubles"
            className={`flex-1 py-2 rounded-md text-sm font-medium text-center transition ${
              activeTab === 'doubles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            ダブルスポイント
          
          </Link>
        </div>

        {/* 個人戦ランキング */}
        {activeTab === 'singles' && (
          <section>
            {singlesPlayers.length === 0 ? (
              <p className="text-gray-400 text-sm">データがありません</p>
            ) : (
              <div className="space-y-3">
                {renderTop3(singlesPlayers, 'rating')}
                {renderRest(singlesPlayers, 'rating', 4)}
              </div>
            )}
          </section>
        )}

        {/* ダブルスランキング */}
        {activeTab === 'doubles' && (
          <section>
            {!doublesPlayers || doublesPlayers.length === 0 ? (
              <p className="text-gray-400 text-sm">データがありません</p>
            ) : (
              <div className="space-y-3">
                {renderTop3(doublesPlayers, 'doubles_rating')}
                {renderRest(doublesPlayers, 'doubles_rating', 4)}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}