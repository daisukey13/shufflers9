import { getPlayers } from '@/lib/queries/players'
import { getPlayerRankings } from '@/lib/queries/rankings'
import Link from 'next/link'

export default async function PlayersPage() {
  const [players, rankings] = await Promise.all([
    getPlayers(),
    getPlayerRankings(),
  ])

  // ランキング順位マップを作成
  const rankMap = new Map(rankings.map((p, i) => [p.id, i + 1]))

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">👤 メンバー一覧</h1>
          <p className="text-sm text-gray-400">総勢 {players.length} 名</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {players.length === 0 ? (
            <p className="text-gray-400 text-sm">メンバーがいません</p>
          ) : (
            players.map((player) => {
              const rank = rankMap.get(player.id) ?? '-'
              const winRate = player.wins + player.losses > 0
                ? Math.round(player.wins / (player.wins + player.losses) * 100)
                : 0
              const rankNum = typeof rank === 'number' ? rank : 99
              return (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl hover:bg-purple-900/40 transition"
                >
                  <span className={`text-sm font-bold w-6 text-center flex-shrink-0 ${
                    rankNum === 1 ? 'text-yellow-400' :
                    rankNum === 2 ? 'text-gray-400' :
                    rankNum === 3 ? 'text-orange-400' : 'text-gray-500'
                  }`}>{rank}</span>
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30 flex items-center justify-center flex-shrink-0">
                    {player.avatar_url
                      ? <img src={player.avatar_url} className="w-full h-full object-cover" />
                      : <span className="text-xl">👤</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{player.name}</p>
                    <p className="text-xs text-gray-400">HC {player.hc ?? 36} · {player.wins}勝 {player.losses}敗 · {winRate}%</p>
                  </div>
                  <span className="font-bold text-purple-400 flex-shrink-0">{player.rating} pt</span>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}