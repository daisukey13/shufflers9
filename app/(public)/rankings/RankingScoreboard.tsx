'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useInView } from '@/hooks/useInView'

type Row = {
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
}

export default function RankingScoreboard({ rows }: { rows: Row[] }) {
  const [visible, setVisible] = useState<boolean[]>(Array(rows.length).fill(false))
  const { ref: containerRef, inView } = useInView(0.1)

  useEffect(() => {
    if (!inView) return
    rows.forEach((_, i) => {
      setTimeout(() => {
        setVisible(prev => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, i * 55)
    })
  }, [inView, rows.length])

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="rounded-2xl overflow-hidden border border-purple-900/40"
      style={{ background: 'linear-gradient(180deg, #07090f 0%, #090c16 100%)' }}
    >
      {/* ヘッダー */}
      <div className="grid grid-cols-[2.5rem_1fr_auto] gap-3 px-4 py-2 border-b border-purple-900/30">
        <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">#</span>
        <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">Player</span>
        <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">PT</span>
      </div>

      {rows.map((row, i) => (
        <Link
          key={row.id}
          href={`/players/${row.id}`}
          className="grid grid-cols-[2.5rem_1fr_auto] gap-3 items-center px-4 py-3 border-b border-purple-950/50 last:border-0 hover:bg-purple-900/20 hover:shadow-[inset_0_0_40px_rgba(139,92,246,0.12)] transition-all group"
          style={{
            opacity: visible[i] ? 1 : 0,
            transform: visible[i] ? 'translateY(0) scaleY(1)' : 'translateY(-10px) scaleY(0.85)',
            transition: 'opacity 0.22s ease-out, transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1)',
            transformOrigin: 'top center',
          }}
        >
          {/* 順位 */}
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-black/70 border border-purple-900/50 font-mono text-sm font-bold text-purple-400 group-hover:text-purple-200 group-hover:border-purple-600/60 group-hover:shadow-[0_0_8px_rgba(139,92,246,0.6)] transition-all">
            {row.rank}
          </div>

          {/* プレーヤー */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-purple-800/40 flex-shrink-0">
              {row.avatar_url
                ? <img src={row.avatar_url} className="w-full h-full object-cover" alt={row.name} />
                : <span className="text-base flex items-center justify-center h-full bg-gray-800">👤</span>
              }
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate text-sm group-hover:text-purple-100 transition-colors">{row.name}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>HC {row.hc ?? 36}</span>
                <span>{row.wins}勝{row.losses}敗</span>
                <span className="text-green-500">{row.winRate}%</span>
              </div>
            </div>
          </div>

          {/* ポイント */}
          <div className="text-right flex-shrink-0">
            <div>
              <span className="font-mono font-bold text-lg text-purple-300 group-hover:text-purple-100 transition-colors">{row.rating}</span>
              <span className="text-xs text-gray-600 ml-0.5">pt</span>
            </div>
            {row.rpChange !== null ? (
              <span className={`text-xs font-mono font-bold ${
                row.hasBonus ? 'neon-bonus' : row.rpChange > 0 ? 'text-green-400' : row.rpChange < 0 ? 'text-red-400' : 'text-gray-500'
              }`}>
                {row.rpChange > 0 ? '+' : ''}{row.rpChange}pt{row.hasBonus ? '★' : ''}
              </span>
            ) : (
              <span className="text-xs text-gray-700">-</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
