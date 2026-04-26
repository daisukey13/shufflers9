import Link from 'next/link'
import { getPlayerRankings } from '@/lib/queries/rankings'
import { getRecentAllMatches, getTotalMatchesCount, getRecentDoublesMatches } from '@/lib/queries/matches'
import { getRecentNotices } from '@/lib/queries/notices'
import { getRecentTournamentWinners } from '@/lib/queries/tournaments'
import { getLastMonthWinRanking } from '@/lib/queries/monthly-ranking'
import { getActiveBanners } from '@/lib/queries/banners'
import MonthlyRankingModal from '@/components/ui/MonthlyRankingModal'
import BannerSlider from '@/components/ui/BannerSlider'
import TopPlayersFlip from './TopPlayersFlip'
import RecentMatchesTabs from './RecentMatchesTabs'

export async function MonthlyModalSection() {
  const monthlyRanking = await getLastMonthWinRanking()
  return <MonthlyRankingModal entries={monthlyRanking.entries} month={monthlyRanking.month} />
}

// 統計 + トッププレーヤーをまとめて取得（getPlayerRankings を1回だけ呼ぶ）
export async function StatsAndTopPlayersSection() {
  const [players, totalMatchesCount] = await Promise.all([
    getPlayerRankings(),
    getTotalMatchesCount(),
  ])
  const top5 = players.slice(0, 5)
  const avgRating = players.length > 0
    ? Math.round(players.reduce((a, p) => a + p.rating, 0) / players.length)
    : 1000

  return (
    <>
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

      {/* トッププレーヤー */}
      <section className="px-4 mb-14 max-w-6xl mx-auto">
        <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-amber-100 neon-gold">
          🏆 トッププレーヤー
        </h2>
        <TopPlayersFlip players={top5} />
      </section>
    </>
  )
}

export async function BannersSection() {
  const banners = await getActiveBanners()
  return <BannerSlider banners={banners} />
}

export async function NoticesSection() {
  const notices = await getRecentNotices(5)
  if (notices.length === 0) return null
  return (
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
  )
}

export async function TournamentWinnersSection() {
  const tournamentWinners = await getRecentTournamentWinners(5)
  if (tournamentWinners.length === 0) return null
  return (
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
  )
}

export async function RecentMatchesSection() {
  const [recentMatches, recentDoubles] = await Promise.all([
    getRecentAllMatches(5),
    getRecentDoublesMatches(5),
  ])
  return <RecentMatchesTabs singlesMatches={recentMatches} doublesMatches={recentDoubles} />
}
