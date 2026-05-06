'use client'

import { useState } from 'react'
import RankingPodium from './RankingPodium'
import RankingScoreboard from './RankingScoreboard'

type PodiumPlayer = {
  id: string; rank: number; name: string; avatar_url: string | null
  hc: number | null; rating: number; wins: number; losses: number
  winRate: number; rpChange: number | null; hasBonus: boolean
  tournament_wins: number; tournament_runner_ups: number; tournament_qualifications: number
}

type ScoreboardRow = {
  id: string; rank: number; name: string; avatar_url: string | null
  hc: number | null; rating: number; wins: number; losses: number
  winRate: number; rpChange: number | null; hasBonus: boolean
}

export default function RankingsTabContent({
  podiumPlayers,
  scoreboardRows,
  allRows,
}: {
  podiumPlayers: PodiumPlayer[]
  scoreboardRows: ScoreboardRow[]
  allRows: ScoreboardRow[]
}) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const isSearching = query.length > 0
  const filtered = isSearching ? allRows.filter(r => r.name.toLowerCase().includes(query)) : null

  return (
    <section className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="名前で検索..."
        className="w-full bg-black/40 border border-purple-800/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition"
      />

      {isSearching ? (
        filtered && filtered.length > 0 ? (
          <RankingScoreboard rows={filtered} />
        ) : (
          <p className="text-gray-500 text-sm text-center py-10">「{search}」に一致するプレーヤーが見つかりません</p>
        )
      ) : (
        <>
          {podiumPlayers.length > 0 && (
            <div>
              <div className="text-center text-xs font-mono tracking-[0.4em] text-yellow-500/60 uppercase mb-4">── TOP 3 ──</div>
              <RankingPodium players={podiumPlayers} />
            </div>
          )}
          {scoreboardRows.length > 0 && (
            <div>
              <div className="text-center text-xs font-mono tracking-[0.4em] text-gray-600 uppercase mb-3">── SCOREBOARD ──</div>
              <RankingScoreboard rows={scoreboardRows} />
            </div>
          )}
        </>
      )}
    </section>
  )
}
