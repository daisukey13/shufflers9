'use client'

import { useState } from 'react'
import Link from 'next/link'

type SinglesMatch = {
  id: string
  player1: { id: string; name: string; avatar_url: string | null; is_active?: boolean } | null
  player2: { id: string; name: string; avatar_url: string | null; is_active?: boolean } | null
  score1: number | null
  score2: number | null
  winner_id: string | null
  played_at: string
  label: string | null
  rating_change1: number | null
  rating_change2: number | null
  bonus_points: number
}

type DoublesMatch = {
  id: string
  pair1_player1: { id: string; name: string; avatar_url: string | null } | null
  pair1_player2: { id: string; name: string; avatar_url: string | null } | null
  pair2_player1: { id: string; name: string; avatar_url: string | null } | null
  pair2_player2: { id: string; name: string; avatar_url: string | null } | null
  score1: number | null
  score2: number | null
  winner_pair: number | null
  played_at: string
}

export default function RecentMatchesTabs({
  singlesMatches,
  doublesMatches,
}: {
  singlesMatches: SinglesMatch[]
  doublesMatches: DoublesMatch[]
}) {
  const [tab, setTab] = useState<'singles' | 'doubles'>('singles')

  return (
    <section className="px-4 mb-14 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">🔄 最近の試合</h2>

      {/* タブ */}
      <div className="flex gap-2 bg-black/20 rounded-lg p-1 mb-4">
        <button
          onClick={() => setTab('singles')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-1.5 ${tab === 'singles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <img src="/shuffleboard-puck-blue.png" className="w-4 h-4 object-contain" />
          シングルス
        </button>
        <button
          onClick={() => setTab('doubles')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-1.5 ${tab === 'doubles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <img src="/shuffleboard-puck-red.png" className="w-4 h-4 object-contain" />
          ダブルス
        </button>
      </div>

      {/* シングルス */}
      {tab === 'singles' && (
        <div className="space-y-3">
          {singlesMatches.length === 0 ? (
            <p className="text-gray-500 text-sm text-center">試合がありません</p>
          ) : (
            singlesMatches.map(match => {
              const winnerId = match.winner_id
              const date = new Date(match.played_at)
              const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
              return (
                <div key={match.id} className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-400">{dateStr}</p>
                    {match.label && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-700/50 text-purple-300">
                        {match.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {match.player1?.is_active !== false ? (
                      <Link href={`/players/${match.player1?.id}`} className="flex-1 flex items-center gap-2 justify-end">
                        <div className="text-right">
                          <span className={`font-semibold text-sm truncate block ${winnerId === match.player1?.id ? 'text-white' : 'text-gray-400'}`}>
                            {match.player1?.name ?? '不明'}
                          </span>
                          {match.rating_change1 != null && (
                            <span className={`text-xs font-medium ${
                              match.rating_change1 > 0 && match.bonus_points > 0
                                ? 'neon-bonus'
                                : match.rating_change1 >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {match.rating_change1 >= 0 ? '+' : ''}{match.rating_change1}pt
                              {match.rating_change1 > 0 && match.bonus_points > 0 && <span className="ml-0.5">★</span>}
                            </span>
                          )}
                        </div>
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30 flex-shrink-0">
                          {match.player1?.avatar_url
                            ? <img src={match.player1.avatar_url} className="w-full h-full object-cover" />
                            : <span className="text-2xl flex items-center justify-center h-full">👤</span>
                          }
                        </div>
                      </Link>
                    ) : (
                      <div className="flex-1 flex items-center gap-2 justify-end">
                        <div className="text-right">
                          <span className={`font-semibold text-sm truncate block ${winnerId === match.player1?.id ? 'text-white' : 'text-gray-400'}`}>
                            {match.player1?.name ?? '不明'}
                          </span>
                          {match.rating_change1 != null && (
                            <span className={`text-xs font-medium ${match.rating_change1 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {match.rating_change1 >= 0 ? '+' : ''}{match.rating_change1}pt
                            </span>
                          )}
                        </div>
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30 flex-shrink-0">
                          {match.player1?.avatar_url
                            ? <img src={match.player1.avatar_url} className="w-full h-full object-cover" />
                            : <span className="text-2xl flex items-center justify-center h-full">👤</span>
                          }
                        </div>
                      </div>
                    )}
                    <div className="text-center flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold mb-1 mx-auto">VS</div>
                      <p className="text-base font-bold text-white">{match.score1} - {match.score2}</p>
                    </div>
                    {match.player2?.is_active !== false ? (
                      <Link href={`/players/${match.player2?.id}`} className="flex-1 flex items-center gap-2">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30 flex-shrink-0">
                          {match.player2?.avatar_url
                            ? <img src={match.player2.avatar_url} className="w-full h-full object-cover" />
                            : <span className="text-2xl flex items-center justify-center h-full">👤</span>
                          }
                        </div>
                        <div>
                          <span className={`font-semibold text-sm truncate block ${winnerId === match.player2?.id ? 'text-white' : 'text-gray-400'}`}>
                            {match.player2?.name ?? '不明'}
                          </span>
                          {match.rating_change2 != null && (
                            <span className={`text-xs font-medium ${
                              match.rating_change2 > 0 && match.bonus_points > 0
                                ? 'neon-bonus'
                                : match.rating_change2 >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {match.rating_change2 >= 0 ? '+' : ''}{match.rating_change2}pt
                              {match.rating_change2 > 0 && match.bonus_points > 0 && <span className="ml-0.5">★</span>}
                            </span>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30 flex-shrink-0">
                          {match.player2?.avatar_url
                            ? <img src={match.player2.avatar_url} className="w-full h-full object-cover" />
                            : <span className="text-2xl flex items-center justify-center h-full">👤</span>
                          }
                        </div>
                        <div>
                          <span className={`font-semibold text-sm truncate block ${winnerId === match.player2?.id ? 'text-white' : 'text-gray-400'}`}>
                            {match.player2?.name ?? '不明'}
                          </span>
                          {match.rating_change2 != null && (
                            <span className={`text-xs font-medium ${match.rating_change2 >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {match.rating_change2 >= 0 ? '+' : ''}{match.rating_change2}pt
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ダブルス */}
      {tab === 'doubles' && (
        <div className="space-y-3">
          {doublesMatches.length === 0 ? (
            <p className="text-gray-500 text-sm text-center">試合がありません</p>
          ) : (
            doublesMatches.map(match => {
              const date = new Date(match.played_at)
              const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
              const isPair1Winner = match.winner_pair === 1
              return (
                <div key={match.id} className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-2xl">
                  <p className="text-xs text-gray-400 mb-3">{dateStr}</p>
                  <div className="flex items-center gap-3">
                    {/* ペア1 */}
                    <div className="flex-1 flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                        {[match.pair1_player1, match.pair1_player2].map((p, i) => (
                          <div key={i} className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30">
                            {p?.avatar_url
                              ? <img src={p.avatar_url} className="w-full h-full object-cover" />
                              : <span className="text-lg flex items-center justify-center h-full">👤</span>
                            }
                          </div>
                        ))}
                      </div>
                      <p className={`text-xs text-right ${isPair1Winner ? 'text-white font-bold' : 'text-gray-400'}`}>
                        {match.pair1_player1?.name ?? '不明'} / {match.pair1_player2?.name ?? '不明'}
                      </p>
                    </div>

                    <div className="text-center flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold mb-1 mx-auto">VS</div>
                      <p className="text-base font-bold text-white">{match.score1} - {match.score2}</p>
                    </div>

                    {/* ペア2 */}
                    <div className="flex-1 flex flex-col items-start gap-1">
                      <div className="flex gap-1">
                        {[match.pair2_player1, match.pair2_player2].map((p, i) => (
                          <div key={i} className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30">
                            {p?.avatar_url
                              ? <img src={p.avatar_url} className="w-full h-full object-cover" />
                              : <span className="text-lg flex items-center justify-center h-full">👤</span>
                            }
                          </div>
                        ))}
                      </div>
                      <p className={`text-xs ${!isPair1Winner ? 'text-white font-bold' : 'text-gray-400'}`}>
                        {match.pair2_player1?.name ?? '不明'} / {match.pair2_player2?.name ?? '不明'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </section>
  )
}