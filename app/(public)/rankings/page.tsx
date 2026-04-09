import { getPlayerRankings } from '@/lib/queries/rankings'
import Link from 'next/link'

export default async function RankingsPage() {
  const players = await getPlayerRankings()

  const winRate = (w: number, l: number) => {
    const g = w + l
    return g > 0 ? Math.round((w / g) * 100) : 0
  }

  const top3 = players.slice(0, 3)
  const rest = players.slice(3)

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-10">

        <h1 className="text-3xl font-bold text-center text-yellow-100">🏆 ランキング</h1>

        {/* タブ */}
        <div className="flex gap-2 bg-black/20 rounded-lg p-1">
          <div className="flex-1 py-2 rounded-md text-sm font-medium text-center bg-purple-600 text-white">
            個人戦
          </div>
          <div className="flex-1 py-2 rounded-md text-sm font-medium text-center text-gray-600 cursor-not-allowed opacity-50 bg-gray-800">
            ダブルス（準備中）
          </div>
        </div>

        {/* 個人ランキング */}
        <section>
          {players.length === 0 ? (
            <p className="text-gray-400 text-sm">データがありません</p>
          ) : (
            <div className="space-y-3">
              {/* トップ3 */}
              {top3.map((player, i) => {
                const rank = i + 1
                const wr = winRate(player.wins, player.losses)
                const borderColor = rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-gray-400' : 'border-orange-500'
                const badgeColor = rank === 1 ? 'bg-yellow-400 text-black' : rank === 2 ? 'bg-gray-400 text-black' : 'bg-orange-500 text-white'
                const bgColor = rank === 1 ? 'bg-gradient-to-r from-yellow-900/40 to-yellow-700/20' : rank === 2 ? 'bg-gradient-to-r from-gray-800/60 to-gray-700/20' : 'bg-gradient-to-r from-orange-900/40 to-orange-700/20'
                const glowColor = rank === 1 ? 'shadow-yellow-400/20' : rank === 2 ? 'shadow-gray-400/10' : 'shadow-orange-500/10'

                return (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className={`relative flex items-center gap-4 p-5 border-2 ${borderColor} ${bgColor} rounded-2xl shadow-lg ${glowColor} hover:scale-[1.01] transition-transform`}
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
                        <span className="text-sm text-green-300">{player.wins}勝</span>
                        <span className="text-sm text-red-300">{player.losses}敗</span>
                        <span className="text-sm text-blue-300">{wr}%</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-yellow-100">{player.rating}</p>
                      <p className="text-xs text-gray-400">ポイント</p>
                    </div>
                  </Link>
                )
              })}

              {/* 4位以下 */}
              {rest.map((player, i) => {
                const rank = i + 4
                const wr = winRate(player.wins, player.losses)
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
                      <p className="text-xs text-gray-400">HC {player.hc ?? 36} · {player.wins}勝 {player.losses}敗 · {wr}%</p>
                    </div>
                    <span className="font-bold text-purple-400 flex-shrink-0 text-lg">{player.rating} pt</span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}