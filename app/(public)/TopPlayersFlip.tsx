'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import TournamentBadges from '@/components/ui/TournamentBadges'
import { useInView } from '@/hooks/useInView'

type Player = {
  id: string
  name: string
  rating: number
  wins: number
  losses: number
  hc: number | null
  avatar_url: string | null
  tournament_wins?: number
  tournament_runner_ups?: number
  tournament_qualifications?: number
}

const winRate = (w: number, l: number) => {
  const g = w + l
  return g > 0 ? Math.round((w / g) * 100) : 0
}

const sizeByRank = (rank: number) => {
  switch (rank) {
    case 1: return { cardH: 'min-h-[18rem]', avatar: 'w-28 h-28', badge: 'w-10 h-10 text-base', border: 'border-4 border-yellow-400/70', glow: 'shadow-xl shadow-yellow-400/25', pill: 'text-base', frame: 'from-yellow-400/20 to-amber-600/20', badgeColor: 'bg-yellow-400 text-gray-900' }
    case 2: return { cardH: 'min-h-[15rem]', avatar: 'w-24 h-24', badge: 'w-9 h-9 text-sm', border: 'border-2 border-gray-300/80', glow: 'shadow-lg shadow-gray-300/10', pill: 'text-sm', frame: 'from-gray-300/15 to-gray-500/15', badgeColor: 'bg-gray-300 text-gray-900' }
    case 3: return { cardH: 'min-h-[13rem]', avatar: 'w-20 h-20', badge: 'w-9 h-9 text-sm', border: 'border-2 border-orange-500/80', glow: 'shadow-lg shadow-orange-400/15', pill: 'text-sm', frame: 'from-orange-400/15 to-orange-600/15', badgeColor: 'bg-orange-500 text-white' }
    case 4: return { cardH: 'min-h-[11rem]', avatar: 'w-16 h-16', badge: 'w-8 h-8 text-xs', border: 'border border-green-600/40', glow: 'shadow', pill: 'text-xs', frame: 'from-green-900/20 to-blue-900/20', badgeColor: 'bg-green-700 text-white' }
    default: return { cardH: 'min-h-[10rem]', avatar: 'w-16 h-16', badge: 'w-8 h-8 text-xs', border: 'border border-green-600/40', glow: 'shadow', pill: 'text-xs', frame: 'from-green-900/20 to-blue-900/20', badgeColor: 'bg-green-700 text-white' }
  }
}

// PC表示用のカードフリップ
function FlipCard({ player, rank, flipped, delay }: {
  player: Player
  rank: number
  flipped: boolean
  delay: number
}) {
  const S = sizeByRank(rank)

  return (
    <div
      className={`relative ${S.cardH} ${rank <= 3 ? '' : ''}`}
      style={{ perspective: '900px' }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: `transform 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: 'inherit',
        }}
      >
        {/* 裏面（パック模様） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-[#0d0520] to-[#1a0840] ${S.border} ${S.glow}`}
        >
          <img
            src="/shuffleboard-puck-red.png"
            alt=""
            className="opacity-30"
            style={{ width: '55%', height: '55%', objectFit: 'contain' }}
          />
          <div className="mt-3 w-8 h-1 rounded-full bg-purple-600/40" />
        </div>

        {/* 表面（プレーヤーカード） */}
        <Link
          href={`/players/${player.id}`}
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className={`flex flex-col items-center text-center p-4 rounded-2xl bg-gradient-to-b ${S.frame} ${S.border} ${S.glow} hover:scale-[1.02] transition-transform`}
        >
          {rank === 1 && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold shadow whitespace-nowrap z-10 neon-btn-gold">
              👑 CHAMPION
            </div>
          )}
          <div className={`absolute -top-3 -right-3 ${S.badge} ${S.badgeColor} rounded-full font-extrabold flex items-center justify-center shadow z-10`}>
            {rank}
          </div>
          <div className={`${S.avatar} rounded-full overflow-hidden border-2 border-amber-500/50 mt-4 mb-3 flex-shrink-0`}>
            {player.avatar_url
              ? <img src={player.avatar_url} className="w-full h-full object-cover" alt={player.name} />
              : <span className="text-3xl flex items-center justify-center h-full bg-gray-800">👤</span>
            }
          </div>
          <div className="font-semibold text-amber-100 truncate w-full text-sm">{player.name}</div>
          <div className="text-xs text-gray-400 mt-0.5 mb-3">HC {player.hc ?? 36}</div>
          <div className="flex flex-col gap-1.5 w-full">
            <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-blue-900/60 border border-amber-500/30 ${S.pill}`}>
              <span className="text-gray-400 text-xs">RP</span>
              <span className="font-bold text-amber-300">{player.rating}</span>
            </div>
            <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-green-900/40 border border-green-600/30 ${S.pill}`}>
              <span className="text-gray-400 text-xs">勝率</span>
              <span className="font-bold text-green-400">{winRate(player.wins, player.losses)}%</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default function TopPlayersFlip({ players }: { players: Player[] }) {
  const top5 = players.slice(0, 5)
  const desktopOrder = [2, 0, 1, 3, 4]
  const [flipped, setFlipped] = useState<boolean[]>(Array(5).fill(false))
  const { ref: containerRef, inView } = useInView(0.2)

  useEffect(() => {
    if (!inView) return
    desktopOrder.forEach((_, pos) => {
      setTimeout(() => {
        setFlipped(prev => {
          const next = [...prev]
          next[pos] = true
          return next
        })
      }, 200 + pos * 250)
    })
  }, [inView])

  if (top5.length === 0) {
    return <p className="text-gray-500 text-sm text-center">まだデータがありません</p>
  }

  return (
    // ref はPC/モバイル両方を包むラッパーに付ける（display:noneの要素はObserverが検知しないため）
    <div ref={containerRef as React.RefObject<HTMLDivElement>}>
      {/* PC: カードフリップ */}
      <div className="hidden sm:grid grid-cols-5 gap-4 items-end">
        {desktopOrder.map((rankIndex, pos) => {
          const player = top5[rankIndex]
          const rank = rankIndex + 1
          if (!player) return <div key={pos} />
          return (
            <FlipCard
              key={player.id}
              player={player}
              rank={rank}
              flipped={flipped[pos]}
              delay={0}
            />
          )
        })}
      </div>

      {/* モバイル: フェードスライドイン */}
      <div className="sm:hidden space-y-2">
        {top5.map((player, i) => {
          const rank = i + 1
          const badgeColor = rank === 1 ? 'bg-yellow-400 text-black' : rank === 2 ? 'bg-gray-400 text-black' : rank === 3 ? 'bg-orange-500 text-white' : 'bg-green-700 text-white'
          const borderColor = rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-gray-400' : rank === 3 ? 'border-orange-500' : 'border-green-700'
          return (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className={`flex items-center gap-4 p-4 rounded-2xl bg-blue-900/20 border-2 ${borderColor}`}
              style={{
                opacity: flipped[i] ? 1 : 0,
                transform: flipped[i] ? 'translateX(0)' : 'translateX(-24px)',
                transition: `opacity 0.4s ease-out, transform 0.4s ease-out`,
              }}
            >
              <div className={`w-9 h-9 rounded-full ${badgeColor} font-extrabold flex items-center justify-center flex-shrink-0 text-sm`}>
                {rank}
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500/50 flex-shrink-0">
                {player.avatar_url
                  ? <img src={player.avatar_url} className="w-full h-full object-cover" alt={player.name} />
                  : <span className="text-xl flex items-center justify-center h-full bg-gray-800">👤</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-100 truncate">{player.name}</p>
                <p className="text-xs text-gray-400">HC {player.hc ?? 36}</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 border border-amber-500/30 text-amber-300">RP {player.rating}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 border border-green-600/30 text-green-400">勝率 {winRate(player.wins, player.losses)}%</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
