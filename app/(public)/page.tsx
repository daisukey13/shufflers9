export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getPlayerRankings } from '@/lib/queries/rankings'
import { getRecentAllMatches, getTotalMatchesCount } from '@/lib/queries/matches'
import { getRecentNotices } from '@/lib/queries/notices'
import { getRecentTournamentWinners } from '@/lib/queries/tournaments'
import { getRecentDoublesMatches } from '@/lib/queries/matches'
import { getLastMonthWinRanking } from '@/lib/queries/monthly-ranking'
import RecentMatchesTabs from './RecentMatchesTabs'
import MonthlyRankingModal from '@/components/ui/MonthlyRankingModal'
import QuickLinkSwiper from '@/components/ui/QuickLinkSwiper'
import BannerSlider from '@/components/ui/BannerSlider'
import { getActiveBanners } from '@/lib/queries/banners'
import TopPlayersFlip from './TopPlayersFlip'

export default async function HomePage() {
  const [players, recentMatches, notices, tournamentWinners, recentDoubles, totalMatchesCount, monthlyRanking, banners] = await Promise.all([
  getPlayerRankings(),
  getRecentAllMatches(5),
  getRecentNotices(5),
  getRecentTournamentWinners(5),
  getRecentDoublesMatches(5),
  getTotalMatchesCount(),
  getLastMonthWinRanking(),
  getActiveBanners(),
])
  const top5 = players.slice(0, 5)
  const avgRating = players.length > 0
    ? Math.round(players.reduce((a, p) => a + p.rating, 0) / players.length)
    : 1000

  return (
    <div className="min-h-screen bg-transparent text-amber-50">
      <MonthlyRankingModal entries={monthlyRanking.entries} month={monthlyRanking.month} />

      {/* ヒーロー */}
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

      {/* 統計 */}
      <section className="grid grid-cols-3 gap-4 px-4 mb-10 max-w-xl mx-auto">
        {[
          { label: 'メンバー', value: players.length },
          { label: '試合数', value: totalMatchesCount },
          { label: '平均pts', value: avgRating },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col items-center p-5 bg-blue-900/20 border border-yellow-600/20 rounded-2xl">
            <span className="text-3xl font-bold text-amber-300">{stat.value}</span>
            <span className="text-xs text-gray-500 mt-1">{stat.label}</span>
          </div>
        ))}
      </section>

      {/* バナー */}
      <BannerSlider banners={banners} />

      {/* お知らせ */}
      {notices.length > 0 && (
        <section className="px-4 mb-10 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-amber-100 neon-gold">
            📢 お知らせ
          </h2>
          <div className="space-y-2">
            {notices.map(notice => {
              const publishedAt = new Date(notice.published_at)
              const isNew = (Date.now() - publishedAt.getTime()) < 7 * 24 * 60 * 60 * 1000
              const dateStr = `${publishedAt.getFullYear()}/${publishedAt.getMonth() + 1}/${publishedAt.getDate()}`
              return (
                <Link
                  key={notice.id}
                  href={`/notices/${notice.id}`}
                  className="flex items-center gap-3 p-4 bg-blue-900/20 border border-yellow-600/20 rounded-2xl hover:bg-green-900/20 transition"
                >
                  {isNew && (
                    <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
                      NEW
                    </span>
                  )}
                  <span className="flex-1 text-sm text-amber-50 truncate">{notice.title}</span>
                  <span className="flex-shrink-0 text-xs text-gray-500">{dateStr}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* トッププレーヤー */}
      <section className="px-4 mb-14 max-w-6xl mx-auto">
        <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-amber-100 neon-gold">
          🏆 トッププレーヤー
        </h2>
        <TopPlayersFlip players={top5} />
      </section>

      {/* 大会優勝者 */}
      {tournamentWinners.length > 0 && (
        <section className="px-4 mb-10 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-amber-100 neon-gold">
            🥇 大会優勝者
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {tournamentWinners.map(tw => (
              <div key={tw.tournamentId} className="flex flex-col items-center gap-2 min-w-[90px]">
                <Link href={`/tournaments/${tw.tournamentId}`} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-400 shadow shadow-yellow-400/30">
                    {tw.winner.avatar_url
                      ? <img src={tw.winner.avatar_url} className="w-full h-full object-cover" />
                      : <span className="text-2xl flex items-center justify-center h-full bg-gray-800">👤</span>
                    }
                  </div>
                  <span className="text-xs font-semibold text-amber-100 text-center leading-tight">{tw.winner.name}</span>
                </Link>
                <span className="text-xs text-gray-500 text-center leading-tight">{tw.tournamentName}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 最近の試合 */}
      <RecentMatchesTabs
        singlesMatches={recentMatches}
        doublesMatches={recentDoubles}
      />
    </div>
  )
}
