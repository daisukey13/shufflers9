export const dynamic = 'force-dynamic'

import { getPlayers } from '@/lib/queries/players'
import { getPlayerRankings } from '@/lib/queries/rankings'
import { ADDRESS_OPTIONS } from '@/lib/constants'
import PlayersClient from './PlayersClient'

export default async function PlayersPage() {
  const [players, rankings] = await Promise.all([
    getPlayers(),
    getPlayerRankings(),
  ])

  const rankMap = new Map(rankings.map((p, i) => [p.id, i + 1]))

  const addressCount: Record<string, number> = {}
  players.forEach(p => {
    const addr = p.address || 'その他'
    addressCount[addr] = (addressCount[addr] ?? 0) + 1
  })

  const sortedCategories = [
    ...ADDRESS_OPTIONS.filter(a => a in addressCount),
    ...('その他' in addressCount ? ['その他'] : []),
  ]

  const sortedPlayers = [
    ...sortedCategories.flatMap(cat =>
      players.filter(p => (p.address || 'その他') === cat)
    ),
    ...players.filter(p => !sortedCategories.includes(p.address || 'その他')),
  ]

  const allPlayersWithRank = sortedPlayers.map(p => ({
    id: p.id,
    name: p.name,
    address: p.address ?? null,
    avatar_url: p.avatar_url ?? null,
    hc: p.hc ?? null,
    wins: p.wins,
    losses: p.losses,
    rating: p.rating,
    tournament_wins: p.tournament_wins ?? null,
    tournament_runner_ups: p.tournament_runner_ups ?? null,
    tournament_qualifications: p.tournament_qualifications ?? null,
    rank: rankMap.get(p.id) ?? null,
  }))

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">👤 メンバー一覧</h1>
          <p className="text-sm text-gray-400">総勢 {players.length} 名</p>
        </div>

        <PlayersClient
          players={allPlayersWithRank}
          sortedCategories={sortedCategories}
          addressCount={addressCount}
        />
      </div>
    </div>
  )
}
