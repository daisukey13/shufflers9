'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TournamentBadges from '@/components/ui/TournamentBadges'
import { useInView } from '@/hooks/useInView'

type PodiumPlayer = {
  id: string
  rank: number
  name: string
  avatar_url: string | null
  hc: number | null
  rating: number
  wins: number
  losses: number
  winRate: number
  rpChange: number | null
  hasBonus: boolean
  tournament_wins: number
  tournament_runner_ups: number
  tournament_qualifications: number
}

const podiumConfig = {
  1: {
    height: 'min-h-[270px]',
    avatarSize: 'w-24 h-24',
    badge: 'w-10 h-10 text-base',
    border: 'border-2 border-yellow-400/80',
    bg: 'bg-gradient-to-b from-yellow-900/50 via-yellow-950/30 to-black/40',
    glow: '0 0 30px 8px rgba(250,204,21,0.4), 0 0 70px 20px rgba(250,204,21,0.15)',
    rankClass: 'text-yellow-300 neon-gold text-4xl',
    ptClass: 'text-yellow-300 text-2xl',
    base: 'bg-yellow-400',
    badgeColor: 'bg-yellow-400 text-gray-900',
  },
  2: {
    height: 'min-h-[215px]',
    avatarSize: 'w-20 h-20',
    badge: 'w-9 h-9 text-sm',
    border: 'border-2 border-gray-400/80',
    bg: 'bg-gradient-to-b from-gray-700/40 via-gray-800/30 to-black/40',
    glow: '0 0 20px 6px rgba(209,213,219,0.3), 0 0 50px 12px rgba(209,213,219,0.1)',
    rankClass: 'text-gray-200 neon-silver text-3xl',
    ptClass: 'text-gray-200 text-xl',
    base: 'bg-gray-400',
    badgeColor: 'bg-gray-400 text-gray-900',
  },
  3: {
    height: 'min-h-[185px]',
    avatarSize: 'w-16 h-16',
    badge: 'w-9 h-9 text-sm',
    border: 'border-2 border-orange-500/80',
    bg: 'bg-gradient-to-b from-orange-900/40 via-orange-950/20 to-black/40',
    glow: '0 0 20px 6px rgba(249,115,22,0.3), 0 0 50px 12px rgba(249,115,22,0.1)',
    rankClass: 'text-orange-300 neon-bronze text-3xl',
    ptClass: 'text-orange-200 text-xl',
    base: 'bg-orange-500',
    badgeColor: 'bg-orange-500 text-white',
  },
}

// 表示順: 2位(左) → 1位(中央) → 3位(右)
// アニメーション: 2位→3位→1位の順で登場（両脇が先、センターが最後＝クライマックス）
const ANIM_ORDER = [1, 2, 0] // ordered配列のインデックス順（[2位,1位,3位]）

export default function RankingPodium({ players }: { players: PodiumPlayer[] }) {
  const top3 = players.slice(0, 3)
  // 表示順: [2位, 1位, 3位]
  const ordered = [top3[1], top3[0], top3[2]].filter(Boolean) as PodiumPlayer[]
  const [visible, setVisible] = useState<boolean[]>(Array(ordered.length).fill(false))
  const { ref: containerRef, inView } = useInView(0.2)

  useEffect(() => {
    if (!inView) return
    ANIM_ORDER.slice(0, ordered.length).forEach((displayIdx, step) => {
      setTimeout(() => {
        setVisible(prev => {
          const next = [...prev]
          next[displayIdx] = true
          return next
        })
      }, 150 + step * 200)
    })
  }, [inView, ordered.length])

  const posConfigs = [podiumConfig[2], podiumConfig[1], podiumConfig[3]] as const

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="grid gap-2 items-end"
      style={{ gridTemplateColumns: `repeat(${ordered.length}, 1fr)` }}
    >
      {ordered.map((player, idx) => {
        const posIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2
        const cfg = posConfigs[posIdx]

        return (
          <Link
            key={player.id}
            href={`/players/${player.id}`}
            style={{
              boxShadow: cfg.glow,
              opacity: visible[idx] ? 1 : 0,
              transform: visible[idx] ? 'translateY(0)' : 'translateY(40px)',
              transition: 'opacity 0.45s ease-out, transform 0.45s cubic-bezier(0.34, 1.3, 0.64, 1)',
            }}
            className={`relative flex flex-col items-center text-center px-2 pt-3 pb-2 ${cfg.height} ${cfg.border} ${cfg.bg} rounded-2xl hover:scale-[1.03] transition-transform overflow-hidden`}
          >
            <div className={`font-extrabold ${cfg.rankClass} leading-none mb-1`}>{player.rank}</div>
            {player.rank === 1 && (
              <div className="text-xl mb-1" style={{ animation: 'bounce 1s infinite' }}>👑</div>
            )}
            <div className={`${cfg.avatarSize} rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0 mb-2`}>
              {player.avatar_url
                ? <img src={player.avatar_url} className="w-full h-full object-cover" alt={player.name} />
                : <span className="text-2xl flex items-center justify-center h-full bg-gray-800">👤</span>
              }
            </div>
            <p className="font-bold text-white text-xs truncate w-full px-1 mb-1 leading-tight">{player.name}</p>
            <div className={`font-extrabold font-mono ${cfg.ptClass} leading-none`}>{player.rating}</div>
            <div className="text-xs text-gray-500 mb-1">pt</div>
            {player.rpChange !== null ? (
              <span className={`text-xs font-mono font-bold mb-1 ${
                player.hasBonus ? 'neon-bonus' : player.rpChange > 0 ? 'text-green-400' : player.rpChange < 0 ? 'text-red-400' : 'text-gray-500'
              }`}>
                {player.rpChange > 0 ? '+' : ''}{player.rpChange}pt{player.hasBonus ? '★' : ''}
              </span>
            ) : <span className="text-xs text-gray-700 mb-1">-</span>}
            <div className="text-xs text-gray-400">
              {player.wins}勝{player.losses}敗
              <span className="text-green-400 ml-1">{player.winRate}%</span>
            </div>
            <div className="mt-1 flex justify-center">
              <TournamentBadges
                wins={player.tournament_wins}
                runnerUps={player.tournament_runner_ups}
                qualifications={player.tournament_qualifications}
                size="sm"
              />
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${cfg.base} opacity-70`} />
          </Link>
        )
      })}
    </div>
  )
}
