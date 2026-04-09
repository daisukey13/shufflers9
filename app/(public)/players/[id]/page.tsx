import { getPlayerById } from '@/lib/queries/players'
import { getPlayerMatches } from '@/lib/queries/matches'
import { notFound } from 'next/navigation'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [player, matches] = await Promise.all([
    getPlayerById(id),
    getPlayerMatches(id),
  ])

  if (!player) notFound()

  const winRate = player.wins + player.losses > 0
    ? Math.round((player.wins / (player.wins + player.losses)) * 100)
    : 0

  return (
    <div className="space-y-8 max-w-3xl mx-auto px-4 py-8">
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