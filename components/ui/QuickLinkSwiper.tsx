'use client'

import Link from 'next/link'
import { useRef, useState, useEffect } from 'react'

const ITEMS = [
  {
    label: 'ランキング',
    sub: 'RANKINGS',
    href: '/rankings',
    emoji: '🏆',
    bg: 'from-yellow-900 via-amber-800 to-yellow-950',
    border: '#f59e0b',
    glow: 'rgba(245,158,11,0.7)',
    shine: 'from-yellow-300/30 via-amber-100/10 to-transparent',
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
    shine: 'from-blue-300/30 via-blue-100/10 to-transparent',
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
    shine: 'from-green-300/30 via-emerald-100/10 to-transparent',
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

  const item = ITEMS[active]

  return (
    <div className="sm:hidden mb-10">
      {/* スワイパー */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {ITEMS.map((item, i) => (
          <div key={i} className="flex-none w-full snap-center px-5 py-2">
            {item.disabled ? (
              <div
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.bg} opacity-40`}
                style={{ border: `2px solid ${item.border}`, minHeight: 200 }}
              >
                <CardContent item={item} />
              </div>
            ) : (
              <Link
                href={item.href}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.bg} block active:scale-95 transition-transform`}
                style={{
                  border: `2px solid ${item.border}`,
                  boxShadow: `0 0 24px ${item.glow}, 0 0 60px ${item.glow.replace('0.7', '0.3')}, inset 0 1px 0 rgba(255,255,255,0.15)`,
                  minHeight: 200,
                }}
              >
                <CardContent item={item} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* ドット */}
      <div className="flex justify-center gap-2 mt-3">
        {ITEMS.map((it, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i === active ? 24 : 8,
              background: i === active ? it.border : '#374151',
              boxShadow: i === active ? `0 0 8px ${it.glow}` : 'none',
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

      {/* 上部装飾ライン */}
      <div className="absolute top-0 left-4 right-4 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${item.border}, transparent)` }} />

      {/* コーナー装飾 */}
      {['top-1 left-1', 'top-1 right-1', 'bottom-1 left-1', 'bottom-1 right-1'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-3 h-3 opacity-70`}
          style={{
            borderTop: i < 2 ? `2px solid ${item.border}` : 'none',
            borderBottom: i >= 2 ? `2px solid ${item.border}` : 'none',
            borderLeft: i % 2 === 0 ? `2px solid ${item.border}` : 'none',
            borderRight: i % 2 === 1 ? `2px solid ${item.border}` : 'none',
          }} />
      ))}

      {/* メインコンテンツ */}
      <div className="relative flex flex-col items-center justify-center gap-4 py-10 px-6">
        {/* サブタイトル */}
        <p className="text-xs font-bold tracking-[0.3em] opacity-60 text-white">{item.sub}</p>

        {/* アイコン枠 */}
        <div
          className="relative flex items-center justify-center w-24 h-24 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)`,
            border: `2px solid ${item.border}`,
            boxShadow: `0 0 20px ${item.glow}, inset 0 0 20px rgba(255,255,255,0.05)`,
          }}
        >
          <span className="text-5xl">{item.emoji}</span>
          {/* リング装飾 */}
          <div className="absolute inset-[-6px] rounded-full opacity-30"
            style={{ border: `1px dashed ${item.border}` }} />
        </div>

        {/* タイトル */}
        <div className="text-center">
          <p className="text-2xl font-extrabold text-white tracking-wide"
            style={{ textShadow: `0 0 20px ${item.glow}` }}>
            {item.label}
          </p>
        </div>

        {/* バッジ */}
        {!item.disabled && (
          <span className={`px-4 py-1 rounded-full text-xs font-bold ${item.badge} tracking-wider uppercase`}>
            TAP TO OPEN
          </span>
        )}
        {item.disabled && (
          <span className="px-4 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-400 tracking-wider">
            COMING SOON
          </span>
        )}
      </div>

      {/* 下部グロー */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: `linear-gradient(to top, ${item.glow.replace('0.7', '0.15')}, transparent)` }} />
    </>
  )
}
