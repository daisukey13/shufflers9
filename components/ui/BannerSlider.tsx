'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Banner = {
  id: string
  title: string
  body: string | null
  link_url: string | null
}

const THEMES = [
  {
    bg: 'from-[#1a0533] via-[#2d0a6e] to-[#0f1a4a]',
    accent: 'border-purple-500/40',
    dot: 'bg-purple-400',
    glow: 'shadow-purple-900/60',
    tag: 'bg-purple-700/60 text-purple-200',
  },
  {
    bg: 'from-[#1a0a00] via-[#4a2000] to-[#1a0f00]',
    accent: 'border-amber-500/40',
    dot: 'bg-amber-400',
    glow: 'shadow-amber-900/60',
    tag: 'bg-amber-700/60 text-amber-200',
  },
  {
    bg: 'from-[#001a33] via-[#002d6e] to-[#0a0a2d]',
    accent: 'border-blue-500/40',
    dot: 'bg-blue-400',
    glow: 'shadow-blue-900/60',
    tag: 'bg-blue-700/60 text-blue-200',
  },
  {
    bg: 'from-[#001a0f] via-[#00331a] to-[#0a1a0a]',
    accent: 'border-green-500/40',
    dot: 'bg-green-400',
    glow: 'shadow-green-900/60',
    tag: 'bg-green-700/60 text-green-200',
  },
]

export default function BannerSlider({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent(i => (i + 1) % banners.length), [banners.length])
  const prev = () => setCurrent(i => (i - 1 + banners.length) % banners.length)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next, banners.length])

  if (banners.length === 0) return null

  const banner = banners[current]
  const theme = THEMES[current % THEMES.length]

  const inner = (
    <div className={`relative w-full bg-gradient-to-r ${theme.bg} border ${theme.accent} rounded-2xl overflow-hidden shadow-lg ${theme.glow} min-h-[88px] flex items-center px-5 py-4 gap-4 transition-all duration-500`}>
      {/* 装飾 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.04),transparent_60%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white/20 to-transparent rounded-l-2xl" />

      {/* アイコン */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${theme.tag} flex items-center justify-center text-xl shadow`}>
        📣
      </div>

      {/* テキスト */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm sm:text-base leading-snug truncate">{banner.title}</p>
        {banner.body && (
          <p className="text-xs text-gray-300 mt-0.5 leading-relaxed line-clamp-2">{banner.body}</p>
        )}
      </div>

      {/* 矢印 */}
      {banner.link_url && (
        <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">詳細 →</span>
      )}
    </div>
  )

  return (
    <section className="px-4 mb-6 max-w-3xl mx-auto">
      <div className="relative group">
        {banner.link_url ? (
          <Link href={banner.link_url} className="block hover:opacity-90 transition">
            {inner}
          </Link>
        ) : inner}

        {/* prev / next */}
        {banners.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-sm transition opacity-0 group-hover:opacity-100"
            >‹</button>
            <button
              onClick={next}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-sm transition opacity-0 group-hover:opacity-100"
            >›</button>
          </>
        )}
      </div>

      {/* ドットインジケーター */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? `w-5 ${theme.dot}`
                  : 'w-1.5 bg-gray-700 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
