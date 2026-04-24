'use client'

import { useState } from 'react'
import Link from 'next/link'

type MatchItem = {
  id: string
  played_at: string
  type: 'singles' | 'teams' | 'qualifying' | 'finals' | 'doubles'
  tournamentName?: string
  tournamentId?: string
  blockName?: string
  winnerId: string | null
  player1Id: string
  player2Id: string
  player1Name: string
  player2Name: string
  player1Avatar: string | null
  player2Avatar: string | null
  player1IsActive?: boolean
  player2IsActive?: boolean
  score1: number | null
  score2: number | null
  mode?: string
  sets?: { set_number: number; score1: number; score2: number }[]
  player1_hc?: number | null
  player2_hc?: number | null
  player1_rp?: number | null
  player2_rp?: number | null
  player1_rank?: number | null
  player2_rank?: number | null
  winnerPair?: number | null
  pair1p1Name?: string
  pair1p2Name?: string
  pair2p1Name?: string
  pair2p2Name?: string
  pair1p1Avatar?: string | null
  pair1p2Avatar?: string | null
  pair2p1Avatar?: string | null
  pair2p2Avatar?: string | null
}

type Tab = 'singles' | 'doubles' | 'tournament'

export default function MatchesClient({
  singlesMatches,
  doublesMatches,
  tournamentMatches,
}: {
  singlesMatches: MatchItem[]
  doublesMatches: MatchItem[]
  tournamentMatches: MatchItem[]
}) {
  const [tab, setTab] = useState<Tab>('singles')

  const matches =
    tab === 'singles' ? singlesMatches
    : tab === 'doubles' ? doublesMatches
    : tournamentMatches

  const isUpset = (match: MatchItem) => {
    if (!match.winnerId) return false
    const isP1Winner = match.winnerId === match.player1Id
    const winnerRank = isP1Winner ? match.player1_rank : match.player2_rank
    const loserRank = isP1Winner ? match.player2_rank : match.player1_rank
    const winnerHc = isP1Winner ? match.player1_hc : match.player2_hc
    const loserHc = isP1Winner ? match.player2_hc : match.player1_hc
    if (!winnerRank || !loserRank) return false
    return (winnerRank - loserRank) >= 10 || ((winnerHc ?? 36) - (loserHc ?? 36)) >= 5
  }

  const typeLabel = (type: string, blockName?: string) => {
    switch (type) {
      case 'singles': return { label: 'シングルス', color: 'bg-blue-900/50 text-blue-400' }
      case 'qualifying': return { label: `予選${blockName ? ` ブロック${blockName}` : ''}`, color: 'bg-green-900/50 text-green-400' }
      case 'finals': return { label: '本戦', color: 'bg-red-900/50 text-red-400' }
      case 'doubles': return { label: 'ダブルス', color: 'bg-amber-900/50 text-amber-400' }
      default: return { label: type, color: 'bg-gray-700 text-gray-400' }
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-amber-100 neon-gold">📋 試合結果</h1>
        <p className="text-xs text-gray-500">※表示HC、RPは現時点のものです。</p>

        {/* タブ */}
        <div className="flex gap-1 bg-[#0b1520] border border-yellow-600/20 rounded-xl p-1">
          <button
            onClick={() => setTab('singles')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'singles'
                ? 'bg-blue-800 text-white'
                : 'text-gray-400 hover:text-amber-300'
            }`}
          >
            <img src="/shuffleboard-puck-blue.png" className="w-5 h-5 object-contain" />
            シングルス戦
          </button>
          <button
            onClick={() => setTab('doubles')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'doubles'
                ? 'bg-red-800 text-white'
                : 'text-gray-400 hover:text-amber-300'
            }`}
          >
            <img src="/shuffleboard-puck-red.png" className="w-5 h-5 object-contain" />
            ダブルス戦
          </button>
          <button
            onClick={() => setTab('tournament')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'tournament'
                ? 'bg-amber-700 text-white'
                : 'text-gray-400 hover:text-amber-300'
            }`}
          >
            🏆 大会
          </button>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-400 text-sm">データがありません</p>
        ) : (
          <div className="space-y-4">
            {matches.map(match => {
              const upset = isUpset(match)
              const date = new Date(match.played_at)
              const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
              const { label, color } = typeLabel(match.type, match.blockName)

              const isDoubles = match.type === 'doubles'
              const isPair1Winner = isDoubles ? match.winnerPair === 1 : match.winnerId === match.player1Id
              const hasWinner = isDoubles ? match.winnerPair != null : match.winnerId != null

              return (
                <div key={`${match.type}-${match.id}`} className={`p-4 border rounded-2xl ${upset ? 'bg-yellow-900/20 border-yellow-600/40' : 'bg-[#0d1720] border-yellow-600/20'}`}>
                  {/* ヘッダー */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <p className="text-xs text-gray-400">{dateStr}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                    {match.tournamentName && (
                      <Link
                        href={`/tournaments/${match.tournamentId}`}
                        className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 hover:text-yellow-300 transition"
                      >
                        🏆 {match.tournamentName}
                      </Link>
                    )}
                    {upset && (
                      <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full">
                        ⭐ 大金星
                      </span>
                    )}
                  </div>

                  {isDoubles ? (
                    <div className="flex items-center gap-4">
                      <div className={`flex-1 flex flex-col items-center gap-2 p-2 rounded-xl ${isPair1Winner && hasWinner ? 'bg-green-900/20' : ''}`}>
                        <div className="flex gap-1 justify-center">
                          {[match.pair1p1Avatar, match.pair1p2Avatar].map((av, i) => (
                            <div key={i} className={`w-10 h-10 rounded-full overflow-hidden bg-gray-800 border-2 ${isPair1Winner && hasWinner ? 'border-amber-400 avatar-glow-win' : 'border-yellow-600/30'}`}>
                              {av
                                ? <img src={av} className="w-full h-full object-cover" />
                                : <span className="text-lg flex items-center justify-center h-full">👤</span>
                              }
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-center text-white font-medium">
                          {match.pair1p1Name}<br />{match.pair1p2Name}
                        </p>
                        {isPair1Winner && hasWinner && (
                          <span className="text-xs font-bold text-green-400">勝利</span>
                        )}
                      </div>

                      <div className="text-center flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-red-700 flex items-center justify-center text-sm font-bold mx-auto">VS</div>
                        <p className="text-xl font-bold text-white mt-1">{match.score1} - {match.score2}</p>
                      </div>

                      <div className={`flex-1 flex flex-col items-center gap-2 p-2 rounded-xl ${!isPair1Winner && hasWinner ? 'bg-green-900/20' : ''}`}>
                        <div className="flex gap-1 justify-center">
                          {[match.pair2p1Avatar, match.pair2p2Avatar].map((av, i) => (
                            <div key={i} className={`w-10 h-10 rounded-full overflow-hidden bg-gray-800 border-2 ${!isPair1Winner && hasWinner ? 'border-amber-400 avatar-glow-win' : 'border-yellow-600/30'}`}>
                              {av
                                ? <img src={av} className="w-full h-full object-cover" />
                                : <span className="text-lg flex items-center justify-center h-full">👤</span>
                              }
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-center text-white font-medium">
                          {match.pair2p1Name}<br />{match.pair2p2Name}
                        </p>
                        {!isPair1Winner && hasWinner && (
                          <span className="text-xs font-bold text-green-400">勝利</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {(() => {
                        const p1Inner = <>
                          <div className={`w-20 h-20 rounded-full overflow-hidden bg-gray-800 border-2 flex-shrink-0 ${upset && isPair1Winner ? 'border-yellow-400 avatar-glow' : isPair1Winner && hasWinner ? 'border-amber-400 avatar-glow-win' : 'border-yellow-600/30'}`}>
                            {match.player1Avatar ? <img src={match.player1Avatar} className="w-full h-full object-cover" /> : <span className="text-3xl flex items-center justify-center h-full">👤</span>}
                          </div>
                          <span className={`font-bold text-sm text-center ${isPair1Winner ? 'text-white' : 'text-gray-400'}`}>{match.player1Name}</span>
                          <div className="flex gap-2 text-xs text-gray-400">
                            {match.player1_hc != null && <span>HC {match.player1_hc}</span>}
                            {match.player1_rp != null && <span className="text-purple-400">RP {match.player1_rp}</span>}
                          </div>
                          {isPair1Winner && <span className={`text-xs font-bold ${upset ? 'text-yellow-400' : 'text-green-400'}`}>{upset ? '⭐ 大金星' : '勝利'}</span>}
                        </>
                        return match.player1IsActive !== false
                          ? <Link href={`/players/${match.player1Id}`} className="flex-1 flex flex-col items-center gap-2">{p1Inner}</Link>
                          : <div className="flex-1 flex flex-col items-center gap-2">{p1Inner}</div>
                      })()}

                      <div className="text-center flex-shrink-0 space-y-1">
                        <div className="w-12 h-12 rounded-full bg-red-700 flex items-center justify-center text-sm font-bold mx-auto">VS</div>
                        {match.type === 'finals' && match.sets && match.sets.length > 0 ? (
                          <div className="space-y-0.5">
                            {match.sets.map(s => (
                              <p key={s.set_number} className="text-xs text-gray-300">
                                {s.score1} - {s.score2}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-white">{match.score1} - {match.score2}</p>
                        )}
                      </div>

                      {(() => {
                        const p2Inner = <>
                          <div className={`w-20 h-20 rounded-full overflow-hidden bg-gray-800 border-2 flex-shrink-0 ${upset && !isPair1Winner && hasWinner ? 'border-yellow-400 avatar-glow' : !isPair1Winner && hasWinner ? 'border-amber-400 avatar-glow-win' : 'border-yellow-600/30'}`}>
                            {match.player2Avatar ? <img src={match.player2Avatar} className="w-full h-full object-cover" /> : <span className="text-3xl flex items-center justify-center h-full">👤</span>}
                          </div>
                          <span className={`font-bold text-sm text-center ${!isPair1Winner && hasWinner ? 'text-white' : 'text-gray-400'}`}>{match.player2Name}</span>
                          <div className="flex gap-2 text-xs text-gray-400">
                            {match.player2_hc != null && <span>HC {match.player2_hc}</span>}
                            {match.player2_rp != null && <span className="text-purple-400">RP {match.player2_rp}</span>}
                          </div>
                          {!isPair1Winner && hasWinner && <span className={`text-xs font-bold ${upset ? 'text-yellow-400' : 'text-green-400'}`}>{upset ? '⭐ 大金星' : '勝利'}</span>}
                        </>
                        return match.player2IsActive !== false
                          ? <Link href={`/players/${match.player2Id}`} className="flex-1 flex flex-col items-center gap-2">{p2Inner}</Link>
                          : <div className="flex-1 flex flex-col items-center gap-2">{p2Inner}</div>
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
