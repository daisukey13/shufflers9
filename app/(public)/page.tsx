export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import QuickLinkSwiper from '@/components/ui/QuickLinkSwiper'
import {
  MonthlyModalSection,
  StatsAndTopPlayersSection,
  BannersSection,
  NoticesSection,
  TournamentWinnersSection,
  RecentMatchesSection,
} from './HomeDataSections'
import AuthCallbackHandler from './AuthCallbackHandler'

// スケルトンUI
function StatsSkeleton() {
  return (
    <section className="grid grid-cols-3 gap-4 px-4 mb-10 max-w-xl mx-auto">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex flex-col items-center p-5 bg-blue-900/20 border border-yellow-600/20 rounded-2xl animate-pulse">
          <div className="h-9 w-14 bg-gray-700 rounded mb-2" />
          <div className="h-3 w-12 bg-gray-800 rounded" />
        </div>
      ))}
    </section>
  )
}

function TopPlayersSkeleton() {
  return (
    <section className="px-4 mb-14 max-w-6xl mx-auto">
      <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-amber-100 neon-gold">
        🏆 トッププレーヤー
      </h2>
      <div className="hidden sm:grid grid-cols-5 gap-4 items-end">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="min-h-[10rem] rounded-2xl bg-blue-900/20 border border-yellow-600/10 animate-pulse" />
        ))}
      </div>
      <div className="sm:hidden space-y-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-2xl bg-blue-900/20 border border-yellow-600/10 animate-pulse" />
        ))}
      </div>
    </section>
  )
}

function MatchesSkeleton() {
  return (
    <section className="px-4 pb-20 max-w-3xl mx-auto">
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-purple-900/20 border border-purple-800/30 animate-pulse" />
        ))}
      </div>
    </section>
  )
}

// HomePage はsync関数 → app/loading.tsx が即座に消える
export default function HomePage() {
  return (
    <div className="min-h-screen bg-transparent text-amber-50">
      {/* メール確認リンクからのコールバック処理 */}
      <Suspense><AuthCallbackHandler /></Suspense>
      {/* 月間ランキングモーダル（遅延ストリーム） */}
      <Suspense fallback={null}>
        <MonthlyModalSection />
      </Suspense>

      {/* ヒーロー（データ不要・即座に表示） */}
      <section className="relative text-center py-6 sm:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(30,60,120,0.35)_0%,_transparent_70%)] pointer-events-none" />
        <div className="relative flex justify-center mb-2 sm:mb-4">
          <img
            src="/shuffleboard-puck-blue.png"
            alt="Shuffleboard Puck"
            className="w-12 h-12 sm:w-24 sm:h-24 object-contain opacity-90"
          />
        </div>
        <div className="relative flex justify-center mb-2 sm:mb-6">
          <img
            src="/logo-toyoura-shufflers.png"
            alt="Toyoura Shufflers Club"
            className="w-full max-w-xs sm:max-w-2xl h-auto object-contain"
          />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2 sm:mb-4">
          <div className="h-px w-8 sm:w-12 bg-amber-500/50" />
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400" />
          <div className="h-px w-8 sm:w-12 bg-amber-500/50" />
        </div>
        <p className="relative text-gray-400 text-xs sm:text-sm">みんなで楽しくテーブルシャッフルボード！</p>
      </section>

      {/* クイックリンク（スマホ：スワイプ） */}
      <QuickLinkSwiper />

      {/* クイックリンク（PC：グリッド） */}
      <section className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-px bg-yellow-600/10 border-y border-yellow-600/20 mb-10">
        {[
          { label: 'ランキング', sub: '最新のランキング', href: '/rankings', disabled: false },
          { label: 'メンバー', sub: 'クラブメンバーを見る', href: '/players', disabled: false },
          { label: 'チーム', sub: '準備中', href: '#', disabled: true },
          { label: '試合結果', sub: '過去の試合をチェック', href: '/matches', disabled: false },
        ].map(item => (
          item.disabled ? (
            <div
              key={item.label}
              className="flex flex-col items-center gap-1 p-8 bg-[#0d1720] opacity-40 cursor-not-allowed"
            >
              <span className="font-semibold text-gray-500">{item.label}</span>
              <span className="text-xs text-gray-600">{item.sub}</span>
            </div>
          ) : (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 p-8 bg-[#0d1720] hover:bg-green-900/20 transition">
              <span className="font-semibold text-amber-100">{item.label}</span>
              <span className="text-xs text-gray-500">{item.sub}</span>
            </Link>
          )
        ))}
      </section>

      {/* アクションボタン */}
      <section className="flex flex-wrap justify-center gap-3 px-4 mb-10">
        <Link href="/register" className="px-5 py-2 bg-amber-600 hover:bg-amber-500 rounded-full text-sm font-medium transition neon-btn-gold text-gray-900 font-semibold">
          👥 メンバー登録
        </Link>
        <Link href="/matches/register/singles" className="flex items-center gap-2 px-5 py-2 bg-blue-800 hover:bg-blue-700 rounded-full text-sm font-medium transition">
          <img src="/shuffleboard-puck-blue.png" className="w-5 h-5 object-contain" />
          シングルス登録
        </Link>
        <Link href="/matches/register/doubles" className="flex items-center gap-2 px-5 py-2 bg-green-800 hover:bg-green-700 rounded-full text-sm font-medium transition">
          <img src="/shuffleboard-puck-red.png" className="w-5 h-5 object-contain" />
          ダブルス登録
        </Link>
        <span className="px-5 py-2 bg-gray-800 rounded-full text-sm font-medium text-gray-500 cursor-not-allowed opacity-50">
          👥 チーム試合（準備中）
        </span>
      </section>

      {/* 統計 + トッププレーヤー（スケルトン表示後にストリーム） */}
      <Suspense fallback={<><StatsSkeleton /><TopPlayersSkeleton /></>}>
        <StatsAndTopPlayersSection />
      </Suspense>

      {/* バナー */}
      <Suspense fallback={null}>
        <BannersSection />
      </Suspense>

      {/* お知らせ */}
      <Suspense fallback={null}>
        <NoticesSection />
      </Suspense>

      {/* 大会優勝者 */}
      <Suspense fallback={null}>
        <TournamentWinnersSection />
      </Suspense>

      {/* 最近の試合 */}
      <Suspense fallback={<MatchesSkeleton />}>
        <RecentMatchesSection />
      </Suspense>
    </div>
  )
}
