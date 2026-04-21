'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

const ITEMS = [
  {
    label: 'ランキング',
    sub: 'RANKINGS',
    href: '/rankings',
    emoji: '🏆',
    bg: 'from-yellow-900 via-amber-800 to-yellow-950',
    border: '#f59e0b',
    glow: 'rgba(245,158,11,0.7)',
    shine: 'from-yellow-300/20 via-amber-100/5 to-transparent',
    badge: 'bg-yellow-400 text-yellow-900',
    disabled: false,
  },
  {
    label: 'メンバー',
    sub: 'MEMBERS',
    href: '/players',
    emoji: '👥',
    bg: 'from-blue-900 via-blue-800 to-blue-950',
    border: '#3b82f6',
    glow: 'rgba(59,130,246,0.7)',
    shine: 'from-blue-300/20 via-blue-100/5 to-transparent',
    badge: 'bg-blue-400 text-blue-900',
    disabled: false,
  },
  {
    label: '試合結果',
    sub: 'MATCHES',
    href: '/matches',
    emoji: '🎯',
    bg: 'from-green-900 via-emerald-800 to-green-950',
    border: '#10b981',
    glow: 'rgba(16,185,129,0.7)',
    shine: 'from-green-300/20 via-emerald-100/5 to-transparent',
    badge: 'bg-green-400 text-green-900',
    disabled: false,
  },
  {
    label: 'チーム',
    sub: 'COMING SOON',
    href: '#',
    emoji: '🤝',
    bg: 'from-gray-800 via-gray-700 to-gray-900',
    border: '#6b7280',
    glow: 'rgba(107,114,128,0.3)',
    shine: 'from-gray-400/10 via-transparent to-transparent',
    badge: 'bg-gray-500 text-gray-900',
    disabled: true,
  },
]

export default function QuickLinkSwiper() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActive(index)
  }

  const scrollTo = (i: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="sm:hidden mb-6">
      {/* スワイパー */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {ITEMS.map((item, i) => (
          <div key={i} className="flex-none w-full snap-center px-4 py-1">
            {item.disabled ? (
              <div
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${item.bg} opacity-40`}
                style={{ border: `2px solid ${item.border}`, height: 90 }}
              >
                <CardContent item={item} />
              </div>
            ) : (
              <Link
                href={item.href}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${item.bg} flex active:scale-95 transition-transform`}
                style={{
                  border: `2px solid ${item.border}`,
                  boxShadow: `0 0 18px ${item.glow}, 0 0 40px ${item.glow.replace('0.7', '0.25')}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                  height: 90,
                }}
              >
                <CardContent item={item} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* ドット */}
      <div className="flex justify-center gap-2 mt-2">
        {ITEMS.map((it, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === active ? 20 : 6,
              background: i === active ? it.border : '#374151',
              boxShadow: i === active ? `0 0 6px ${it.glow}` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function CardContent({ item }: { item: typeof ITEMS[0] }) {
  return (
    <>
      {/* シャイン */}
      <div className={`absolute inset-0 bg-gradient-to-br ${item.shine} pointer-events-none`} />

      {/* コーナー装飾 */}
      {(['top-1 left-1', 'top-1 right-1', 'bottom-1 left-1', 'bottom-1 right-1'] as const).map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-2.5 h-2.5 opacity-60`}
          style={{
            borderTop: i < 2 ? `2px solid ${item.border}` : 'none',
            borderBottom: i >= 2 ? `2px solid ${item.border}` : 'none',
            borderLeft: i % 2 === 0 ? `2px solid ${item.border}` : 'none',
            borderRight: i % 2 === 1 ? `2px solid ${item.border}` : 'none',
          }} />
      ))}

      {/* 横並びレイアウト */}
      <div className="relative flex items-center gap-4 px-5 h-full w-full">
        {/* アイコン */}
        <div
          className="flex items-center justify-center w-14 h-14 rounded-full flex-shrink-0"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)`,
            border: `2px solid ${item.border}`,
            boxShadow: `0 0 14px ${item.glow}`,
          }}
        >
          <span className="text-3xl">{item.emoji}</span>
        </div>

        {/* テキスト */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.25em] opacity-50 text-white">{item.sub}</p>
          <p className="text-xl font-extrabold text-white leading-tight"
            style={{ textShadow: `0 0 16px ${item.glow}` }}>
            {item.label}
          </p>
        </div>

        {/* 矢印 */}
        {!item.disabled && (
          <div className="flex-shrink-0 opacity-60 text-white text-lg">›</div>
        )}
        {item.disabled && (
          <span className="flex-shrink-0 text-[10px] font-bold text-gray-500 tracking-wider">SOON</span>
        )}
      </div>

      {/* 右端グロー */}
      <div className="absolute top-0 right-0 bottom-0 w-16 pointer-events-none"
        style={{ background: `linear-gradient(to left, ${item.glow.replace('0.7', '0.1')}, transparent)` }} />
    </>
  )
}
