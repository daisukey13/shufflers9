'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const PUCKS = ['🔵', '🔴', '🟡', '🟢', '🟠', '🟣']

function FloatingPuck({ emoji, style }: { emoji: string; style: React.CSSProperties }) {
  return (
    <div className="absolute text-4xl pointer-events-none select-none particle" style={style}>
      {emoji}
    </div>
  )
}

export default function WelcomePage() {
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    setTimeout(() => setShow(true), 100)
  }, [])

  const pucks = [
    { emoji: '🔵', style: { top: '8%', left: '5%', animationDuration: '4s', animationDelay: '0s', fontSize: '3rem' } },
    { emoji: '🔴', style: { top: '15%', right: '8%', animationDuration: '5s', animationDelay: '0.5s', fontSize: '2.5rem' } },
    { emoji: '🟡', style: { top: '40%', left: '3%', animationDuration: '6s', animationDelay: '1s', fontSize: '2rem' } },
    { emoji: '🟢', style: { bottom: '20%', right: '5%', animationDuration: '4.5s', animationDelay: '0.3s', fontSize: '3.5rem' } },
    { emoji: '🟠', style: { bottom: '10%', left: '10%', animationDuration: '5.5s', animationDelay: '0.8s', fontSize: '2.8rem' } },
    { emoji: '🟣', style: { top: '60%', right: '12%', animationDuration: '3.5s', animationDelay: '1.2s', fontSize: '2.2rem' } },
    { emoji: '🔵', style: { top: '30%', right: '3%', animationDuration: '7s', animationDelay: '0.2s', fontSize: '1.8rem' } },
    { emoji: '🔴', style: { bottom: '35%', left: '6%', animationDuration: '4.8s', animationDelay: '0.7s', fontSize: '2.4rem' } },
  ]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden text-white"
      style={{ background: 'linear-gradient(135deg, #0d0030 0%, #1a0050 40%, #0a1128 100%)' }}
    >
      {/* 背景グロー */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(160,80,255,0.2) 0%, transparent 70%)',
      }} />

      {/* 浮遊パック */}
      {pucks.map((p, i) => (
        <FloatingPuck key={i} emoji={p.emoji} style={p.style} />
      ))}

      {/* メインコンテンツ */}
      <div
        className="relative max-w-md w-full text-center space-y-8"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
        }}
      >
        {/* タイトル */}
        <div className="space-y-3">
          <div className="text-6xl mb-2">🏆</div>
          <h1 className="text-4xl font-extrabold leading-tight neon-gold">
            あなたも<br />日本一を目指そう！
          </h1>
          <p className="text-purple-300 text-sm tracking-widest uppercase font-bold">
            Toyoura Shufflers Club
          </p>
        </div>

        {/* シャッフルボードコートのイメージ */}
        <div
          className="rounded-2xl overflow-hidden border-2 border-purple-500/40 relative"
          style={{ boxShadow: '0 0 30px rgba(160,80,255,0.3)' }}
        >
          <img
            src="/images/banner-bg.jpg"
            alt="shuffleboard"
            className="w-full h-36 object-cover opacity-70"
          />
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(13,0,48,0.5)' }}
          >
            <div className="text-center">
              <p className="text-2xl font-extrabold text-yellow-300 neon-gold">メール確認完了！</p>
              <p className="text-sm text-purple-200 mt-1">ようこそ、クラブへ！</p>
            </div>
          </div>
        </div>

        {/* 説明 */}
        <div className="space-y-3">
          {[
            { icon: '🎯', text: 'あなたの成績がランキングに反映されます' },
            { icon: '🏅', text: '大会で優勝してチャンピオンを目指そう' },
            { icon: '📢', text: '練習・大会情報はLINEでお届けします' },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left"
              style={{
                background: 'rgba(139,92,246,0.1)',
                border: '1px solid rgba(139,92,246,0.25)',
                opacity: show ? 1 : 0,
                transform: show ? 'translateX(0)' : 'translateX(-20px)',
                transition: `opacity 0.6s ease-out ${0.3 + i * 0.15}s, transform 0.6s ease-out ${0.3 + i * 0.15}s`,
              }}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-gray-200">{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTAボタン */}
        <button
          onClick={() => router.push('/mypage/edit?welcome=1')}
          className="w-full py-4 rounded-2xl font-extrabold text-lg text-gray-900 transition-all neon-btn-gold"
          style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
            boxShadow: '0 0 20px rgba(251,191,36,0.4)',
          }}
        >
          🚀 登録を完了させる
        </button>

        <p className="text-xs text-gray-500">
          プロフィールを設定してランキングに参加しましょう
        </p>
      </div>
    </div>
  )
}
