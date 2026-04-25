export const revalidate = 60

import { getPlayers } from '@/lib/queries/players'
import { getPlayerRankings } from '@/lib/queries/rankings'
import TournamentBadges from '@/components/ui/TournamentBadges'
import Link from 'next/link'
import { ADDRESS_OPTIONS } from '@/lib/constants'

const PER_PAGE = 20

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? '1'))

  const [players, rankings] = await Promise.all([
    getPlayers(),
    getPlayerRankings(),
  ])

  const rankMap = new Map(rankings.map((p, i) => [p.id, i + 1]))

  // 住所カテゴリー別に集計・ソート
  const addressCount = new Map<string, number>()
  players.forEach(p => {
    const addr = p.address || 'その他'
    addressCount.set(addr, (addressCount.get(addr) ?? 0) + 1)
  })

  // ADDRESS_OPTIONSの順序を維持してソート
  const sortedCategories = [
  ...ADDRESS_OPTIONS.filter(a => addressCount.has(a)),
  ...(addressCount.has('その他') ? ['その他'] : []),
]


  // カテゴリー順に並び替えたプレーヤーリスト
  const sortedPlayers = [
    ...sortedCategories.flatMap(cat =>
      players.filter(p => (p.address || 'その他') === cat)
    ),
    // どのカテゴリーにも属さないプレーヤー（念のため）
    ...players.filter(p => !sortedCategories.includes(p.address || 'その他')),
  ]

  const totalPages = Math.ceil(sortedPlayers.length / PER_PAGE)
  const pagedPlayers = sortedPlayers.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  // 現在のページに表示されるカテゴリーの先頭インデックスを計算
  const startIndex = (currentPage - 1) * PER_PAGE
  const categoryHeaders = new Map<number, string>()
  pagedPlayers.forEach((player, i) => {
    const globalIndex = startIndex + i
    const cat = player.address || 'その他'
    // このカテゴリーの最初のプレーヤーかチェック
    const prevPlayer = sortedPlayers[globalIndex - 1]
    const prevCat = prevPlayer ? (prevPlayer.address || 'その他') : null
    if (cat !== prevCat) {
      categoryHeaders.set(i, cat)
    }
  })

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">👤 メンバー一覧</h1>
          <p className="text-sm text-gray-400">総勢 {players.length} 名</p>
        </div>

        {/* カテゴリー別件数 */}
        <div className="flex flex-wrap gap-2">
          {sortedCategories.map(cat => (
            <span key={cat} className="text-xs px-2 py-1 bg-purple-900/30 border border-purple-800/30 rounded-full text-gray-400">
              {cat} {addressCount.get(cat)}名
            </span>
          ))}
        </div>

        {/* プレーヤーリスト */}
        <div className="space-y-1">
          {pagedPlayers.length === 0 ? (
            <p className="text-gray-400 text-sm">メンバーがいません</p>
          ) : (
            pagedPlayers.map((player, i) => {
              const rank = rankMap.get(player.id) ?? '-'
              const winRate = player.wins + player.losses > 0
                ? Math.round(player.wins / (player.wins + player.losses) * 100)
                : 0
              const rankNum = typeof rank === 'number' ? rank : 99
              const categoryHeader = categoryHeaders.get(i)

              return (
                <div key={player.id}>
                  {categoryHeader && (
                    <div className="flex items-center gap-3 mt-4 mb-2 first:mt-0">
                      <h2 className="text-sm font-bold text-purple-400">{categoryHeader}</h2>
                      <div className="flex-1 h-px bg-purple-800/30" />
                      <span className="text-xs text-gray-500">{addressCount.get(categoryHeader)}名</span>
                    </div>
                  )}
                  <Link
                    href={`/players/${player.id}`}
                    className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl hover:bg-purple-900/40 transition"
                  >
                    <div className="flex-shrink-0 w-10 text-center">
                      <div className={`text-base font-black leading-none ${
                        rankNum === 1 ? 'text-yellow-400' :
                        rankNum === 2 ? 'text-gray-300' :
                        rankNum === 3 ? 'text-orange-400' : 'text-gray-500'
                      }`}>{rank}<span className="text-xs font-bold">位</span></div>
                      <div className="text-[9px] text-gray-600 leading-tight mt-0.5">現在</div>
                    </div>
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30 flex items-center justify-center flex-shrink-0">
                      {player.avatar_url
                        ? <img src={player.avatar_url} className="w-full h-full object-cover" />
                        : <span className="text-xl">👤</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-white truncate">{player.name}</p>
                        {player.address && (
                          <span className="text-xs text-gray-500">📍 {player.address}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        HC {player.hc ?? 36} · {player.wins}勝 {player.losses}敗 · {winRate}%
                      </p>
                      <TournamentBadges
                        wins={player.tournament_wins ?? 0}
                        runnerUps={player.tournament_runner_ups ?? 0}
                        qualifications={player.tournament_qualifications ?? 0}
                        size="sm"
                      />
                    </div>
                    <span className="font-bold text-purple-400 flex-shrink-0">{player.rating} pt</span>
                  </Link>
                </div>
              )
            })
          )}
        </div>

        {/* ページャー */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            {currentPage > 1 && (
              <Link
                href={`/players?page=${currentPage - 1}`}
                className="px-4 py-2 bg-purple-900/30 border border-purple-800/30 rounded-lg text-sm text-purple-400 hover:bg-purple-900/50 transition"
              >
                ← 前へ
              </Link>
            )}
            <span className="text-sm text-gray-400">
              {currentPage} / {totalPages}ページ
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/players?page=${currentPage + 1}`}
                className="px-4 py-2 bg-purple-900/30 border border-purple-800/30 rounded-lg text-sm text-purple-400 hover:bg-purple-900/50 transition"
              >
                次へ →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}