'use client'

import { useState } from 'react'
import Link from 'next/link'
import TournamentBadges from '@/components/ui/TournamentBadges'

type PlayerRow = {
  id: string
  name: string
  address: string | null
  avatar_url: string | null
  hc: number | null
  wins: number
  losses: number
  rating: number
  tournament_wins: number | null
  tournament_runner_ups: number | null
  tournament_qualifications: number | null
  rank: number | null
}

function PlayerCard({ player }: { player: PlayerRow }) {
  const winRate = player.wins + player.losses > 0
    ? Math.round(player.wins / (player.wins + player.losses) * 100)
    : 0
  return (
    <Link
      href={`/players/${player.id}`}
      className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl hover:bg-purple-900/40 transition"
    >
      <div className="flex-shrink-0 w-10 text-center">
        {player.rank != null ? (
          <>
            <div className={`text-base font-black leading-none ${
              player.rank === 1 ? 'text-yellow-400' :
              player.rank === 2 ? 'text-gray-300' :
              player.rank === 3 ? 'text-orange-400' : 'text-gray-500'
            }`}>{player.rank}<span className="text-xs font-bold">位</span></div>
            <div className="text-[9px] text-gray-600 leading-tight mt-0.5">現在</div>
          </>
        ) : (
          <div className="text-base font-black leading-none text-gray-700">—</div>
        )}
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
  )
}

export default function PlayersClient({
  players,
  sortedCategories,
  addressCount,
}: {
  players: PlayerRow[]
  sortedCategories: string[]
  addressCount: Record<string, number>
}) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const isSearching = query.length > 0
  const filtered = isSearching ? players.filter(p => p.name.toLowerCase().includes(query)) : null

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="名前で検索..."
        className="w-full bg-black/40 border border-purple-800/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition"
      />

      {isSearching ? (
        filtered && filtered.length > 0 ? (
          <div className="space-y-1">
            {filtered.map(p => <PlayerCard key={p.id} player={p} />)}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">「{search}」に一致するメンバーが見つかりません</p>
        )
      ) : (
        <>
          {/* カテゴリー別件数 */}
          <div className="flex flex-wrap gap-2">
            {sortedCategories.map(cat => (
              <span key={cat} className="text-xs px-2 py-1 bg-purple-900/30 border border-purple-800/30 rounded-full text-gray-400">
                {cat} {addressCount[cat]}名
              </span>
            ))}
          </div>

          {/* カテゴリー別リスト */}
          <div className="space-y-1">
            {sortedCategories.map(cat => {
              const catPlayers = players.filter(p => (p.address || 'その他') === cat)
              return (
                <div key={cat}>
                  <div className="flex items-center gap-3 mt-4 mb-2 first:mt-0">
                    <h2 className="text-sm font-bold text-purple-400">{cat}</h2>
                    <div className="flex-1 h-px bg-purple-800/30" />
                    <span className="text-xs text-gray-500">{catPlayers.length}名</span>
                  </div>
                  {catPlayers.map(p => <PlayerCard key={p.id} player={p} />)}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
