'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useInView } from '@/hooks/useInView'

type Banner = {
  id: string
  title: string
  body: string | null
  link_url: string | null
}

const THEMES = [
  {
    // 紫・ゴールド
    bg: 'from-[#0d0030] via-[#1a0050] to-[#0d0030]',
    spotlight: 'rgba(160,80,255,0.25)',
    spotlight2: 'rgba(255,200,50,0.10)',
    border: 'border-yellow-400/40',
    tagBg: 'bg-yellow-400/20 border border-yellow-400/60',
    tagText: 'text-yellow-300',
    titleColor: 'text-white',
    btnBg: 'bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300',
    btnText: 'text-gray-900',
    glow: '#a050ff',
  },
  {
    // 赤・ゴールド（スクリーンショット風）
    bg: 'from-[#2a0000] via-[#4a0a00] to-[#2a0000]',
    spotlight: 'rgba(255,80,30,0.30)',
    spotlight2: 'rgba(255,200,50,0.12)',
    border: 'border-yellow-400/40',
    tagBg: 'bg-yellow-400/20 border border-yellow-400/60',
    tagText: 'text-yellow-300',
    titleColor: 'text-white',
    btnBg: 'bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300',
    btnText: 'text-gray-900',
    glow: '#ff501e',
  },
  {
    // 深青・シアン
    bg: 'from-[#00082a] via-[#001050] to-[#00082a]',
    spotlight: 'rgba(30,120,255,0.25)',
    spotlight2: 'rgba(0,220,255,0.10)',
    border: 'border-cyan-400/40',
    tagBg: 'bg-cyan-400/20 border border-cyan-400/60',
    tagText: 'text-cyan-300',
    titleColor: 'text-white',
    btnBg: 'bg-gradient-to-r from-cyan-500 to-blue-400 hover:from-cyan-400 hover:to-blue-300',
    btnText: 'text-gray-900',
    glow: '#1e78ff',
  },
  {
    // 緑・エメラルド
    bg: 'from-[#001a0a] via-[#003020] to-[#001a0a]',
    spotlight: 'rgba(0,200,80,0.22)',
    spotlight2: 'rgba(100,255,150,0.08)',
    border: 'border-emerald-400/40',
    tagBg: 'bg-emerald-400/20 border border-emerald-400/60',
    tagText: 'text-emerald-300',
    titleColor: 'text-white',
    btnBg: 'bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300',
    btnText: 'text-gray-900',
    glow: '#00c850',
  },
]

const TAG_LABELS = ['📣 お知らせ', '🏆 大会情報', '📅 イベント', '⭐ 注目']

export default function BannerSlider({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)
  const { ref: sectionRef, inView: entered } = useInView(0.2)

  const goTo = useCallback((index: number) => {
    setAnimating(true)
    setTimeout(() => {
      setCurrent(index)
      setAnimating(false)
    }, 200)
  }, [])

  const next = useCallback(() => {
    goTo((current + 1) % banners.length)
  }, [current, banners.length, goTo])

  const prev = () => goTo((current - 1 + banners.length) % banners.length)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(next, 6000)
    return () => clearInterval(timer)
  }, [next, banners.length])

  if (banners.length === 0) return null

  const banner = banners[current]
  const theme = THEMES[current % THEMES.length]
  const tagLabel = TAG_LABELS[current % TAG_LABELS.length]

  const content = (
    <div
      className={`
        relative w-full bg-gradient-to-r ${theme.bg}
        border ${theme.border} rounded-2xl overflow-hidden
        flex flex-col items-center justify-center text-center
        px-6 py-8 min-h-[180px] sm:min-h-[200px]
        transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}
        cursor-${banner.link_url ? 'pointer' : 'default'}
      `}
    >
      {/* ステージライト上部 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 50% 0%, ${theme.spotlight} 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 20% 100%, ${theme.spotlight2} 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 80% 100%, ${theme.spotlight2} 0%, transparent 60%)
          `,
        }}
      />

      {/* 左右の光柱 */}
      <div className="absolute left-0 top-0 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      <div className="absolute right-0 top-0 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />

      {/* 上部タグ */}
      <div className={`relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${theme.tagBg} mb-3`}>
        <span className={`text-xs font-bold tracking-widest uppercase ${theme.tagText}`}>
          {tagLabel}
        </span>
      </div>

      {/* タイトル */}
      <h3
        className={`relative font-extrabold text-xl sm:text-2xl leading-tight mb-2 ${theme.titleColor}`}
        style={{ textShadow: `0 0 30px ${theme.glow}80` }}
      >
        {banner.title}
      </h3>

      {/* 本文 */}
      {banner.body && (
        <p className="relative text-sm text-gray-300 leading-relaxed max-w-sm mb-4">
          {banner.body}
        </p>
      )}

      {/* ボタン */}
      {banner.link_url && (
        <div
          className={`
            relative inline-flex items-center gap-1.5 px-6 py-2 rounded-full
            ${theme.btnBg} ${theme.btnText}
            text-sm font-bold shadow-lg transition
          `}
        >
          詳しく見る →
        </div>
      )}

      {/* 下部装飾ライン */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-2/3"
        style={{ background: `linear-gradient(to right, transparent, ${theme.glow}60, transparent)` }}
      />
    </div>
  )

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="px-4 mb-8 max-w-3xl mx-auto overflow-hidden"
      style={{
        transform: entered ? 'translateX(0)' : 'translateX(110%)',
        opacity: entered ? 1 : 0,
        transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease-out',
      }}
    >
      <div className="relative group">
        {banner.link_url ? (
          <Link href={banner.link_url} className="block">
            {content}
          </Link>
        ) : content}

        {/* prev / next ボタン */}
        {banners.length > 1 && (
          <>
            <button
              onClick={e => { e.preventDefault(); prev() }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full flex items-center justify-center text-white transition opacity-0 group-hover:opacity-100"
            >‹</button>
            <button
              onClick={e => { e.preventDefault(); next() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full flex items-center justify-center text-white transition opacity-0 group-hover:opacity-100"
            >›</button>
          </>
        )}
      </div>

      {/* ドットインジケーター */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 h-2 bg-yellow-400'
                  : 'w-2 h-2 bg-gray-700 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
