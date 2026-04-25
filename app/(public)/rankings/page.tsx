export const dynamic = 'force-dynamic'

import { unstable_cache } from 'next/cache'
import { getPlayerRankings, calcRanks, singlesTie, doublesTie } from '@/lib/queries/rankings'
import { getLastRatingChangePerPlayer } from '@/lib/queries/matches'
import { getThisMonthWinRate, getRecentRatingGrowth } from '@/lib/queries/monthly-ranking'
import { createClient } from '@/lib/supabase/server'
import { Player } from '@/types'
import Link from 'next/link'
import RankingScoreboard from './RankingScoreboard'
import RankingPodium from './RankingPodium'

const getRankingsData = unstable_cache(
  async () => {
    const supabase = await createClient()
    const [singlesRaw, { data: doublesRaw }, lastRpChangesMap, thisMonthWinRate, recentGrowth] = await Promise.all([
      getPlayerRankings(),
      supabase
        .from('players')
        .select('*')
        .eq('is_active', true)
        .eq('is_admin', false)
        .or('doubles_wins.gt.0,doubles_losses.gt.0')
        .order('doubles_rating', { ascending: false })
        .order('hc', { ascending: false }),
      getLastRatingChangePerPlayer(),
      getThisMonthWinRate(),
      getRecentRatingGrowth(),
    ])
    // Map is not JSON-serializable, convert to array of entries
    const lastRpChanges = Array.from(lastRpChangesMap.entries())
    return { singlesRaw, doublesRaw: doublesRaw ?? [], lastRpChanges, thisMonthWinRate, recentGrowth }
  },
  ['rankings-data'],
  { revalidate: 60 }
)

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'doubles' ? 'doubles' : 'singles'

  const { singlesRaw, doublesRaw, lastRpChanges: lastRpChangesArr, thisMonthWinRate, recentGrowth } = await getRankingsData()
  const lastRpChanges = new Map(lastRpChangesArr)

  const doublesSorted = [...(doublesRaw ?? [])].sort((a: Player, b: Player) => {
    if (b.doubles_rating !== a.doubles_rating) return b.doubles_rating - a.doubles_rating
    if (b.hc !== a.hc) return b.hc - a.hc
    return (b.doubles_wins + b.doubles_losses) - (a.doubles_wins + a.doubles_losses)
  })

  const singlesPlayers = calcRanks(singlesRaw, singlesTie)
  const doublesPlayers = calcRanks(doublesSorted, doublesTie)

  const winRate = (w: number, l: number) => {
    const g = w + l
    return g > 0 ? Math.round((w / g) * 100) : 0
  }

  const toPodiumPlayers = (players: (Player & { rank: number })[], ratingKey: string) =>
    players.slice(0, 3).map(p => {
      const rating = ratingKey === 'doubles_rating' ? p.doubles_rating : p.rating
      const wins = ratingKey === 'doubles_rating' ? p.doubles_wins : p.wins
      const losses = ratingKey === 'doubles_rating' ? p.doubles_losses : p.losses
      const last = lastRpChanges.get(p.id)
      return {
        id: p.id, rank: p.rank, name: p.name, avatar_url: p.avatar_url, hc: p.hc,
        rating, wins, losses, winRate: winRate(wins, losses),
        rpChange: last ? last.change : null,
        hasBonus: last ? (last.change > 0 && last.hasBonus) : false,
        tournament_wins: p.tournament_wins ?? 0,
        tournament_runner_ups: p.tournament_runner_ups ?? 0,
        tournament_qualifications: p.tournament_qualifications ?? 0,
      }
    })

  const toScoreboardRows = (players: (Player & { rank: number })[], ratingKey: string) =>
    players.slice(3).map(p => {
      const rating = ratingKey === 'doubles_rating' ? p.doubles_rating : p.rating
      const wins = ratingKey === 'doubles_rating' ? p.doubles_wins : p.wins
      const losses = ratingKey === 'doubles_rating' ? p.doubles_losses : p.losses
      const last = lastRpChanges.get(p.id)
      return {
        id: p.id, rank: p.rank, name: p.name, avatar_url: p.avatar_url, hc: p.hc,
        rating, wins, losses, winRate: winRate(wins, losses),
        rpChange: last ? last.change : null,
        hasBonus: last ? (last.change > 0 && last.hasBonus) : false,
      }
    })

  const particles = Array.from({ length: 20 }, (_, i) => ({
    left: `${(i * 19 + 5) % 95}%`,
    bottom: `${(i * 11) % 50}%`,
    delay: `${(i * 0.55) % 9}s`,
    duration: `${7 + (i * 1.2) % 7}s`,
    size: [2, 3, 2, 4, 2, 3, 2][i % 7],
    color: [
      'rgba(251,191,36,0.7)', 'rgba(167,139,250,0.6)', 'rgba(34,197,94,0.5)',
      'rgba(251,146,60,0.6)', 'rgba(96,165,250,0.5)', 'rgba(251,191,36,0.4)',
      'rgba(244,114,182,0.4)',
    ][i % 7],
  }))

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">

      {/* パーティクル背景 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map((p, i) => (
          <div
            key={i}
            className="particle absolute rounded-full"
            style={{
              left: p.left,
              bottom: p.bottom,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(109,40,217,0.18)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_15%_80%,rgba(245,158,11,0.09)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_70%,rgba(34,197,94,0.06)_0%,transparent_60%)]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ネオンサインタイトル */}
        <div className="text-center space-y-3 py-4">
          <div className="text-xs font-mono tracking-[0.5em] text-purple-400/60 uppercase">Toyoura Shufflers Club</div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight neon-flicker">
            🏆 RANKING
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-yellow-500/40" />
            <div className="flex gap-1.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-yellow-400/70"
                  style={{ animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-yellow-500/40" />
          </div>
        </div>

        {/* 短期表彰 */}
        {(thisMonthWinRate || recentGrowth) && (
          <div className="space-y-2">
            <div className="text-center text-xs font-mono tracking-[0.4em] text-purple-400/50 uppercase">── HOT AWARDS ──</div>
            <div className="grid grid-cols-2 gap-3">
              {thisMonthWinRate && (
                <Link
                  href={`/players/${thisMonthWinRate.id}`}
                  className="flex flex-col items-center gap-1.5 p-3 bg-gradient-to-b from-yellow-900/30 to-black/30 border border-yellow-700/40 rounded-2xl hover:border-yellow-500/60 transition text-center"
                >
                  <div className="text-xs font-mono text-yellow-400/80 tracking-wider">🏅 今月の勝率王</div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-yellow-600/40 flex-shrink-0">
                    {thisMonthWinRate.avatar_url
                      ? <img src={thisMonthWinRate.avatar_url} className="w-full h-full object-cover" />
                      : <span className="text-lg flex items-center justify-center h-full bg-gray-800">👤</span>
                    }
                  </div>
                  <p className="text-xs font-semibold text-white truncate w-full">{thisMonthWinRate.name}</p>
                  <p className="text-2xl font-extrabold font-mono text-yellow-300 leading-none">{thisMonthWinRate.value}</p>
                  <p className="text-xs text-gray-500">{thisMonthWinRate.sub}</p>
                </Link>
              )}
              {recentGrowth && (
                <Link
                  href={`/players/${recentGrowth.id}`}
                  className="flex flex-col items-center gap-1.5 p-3 bg-gradient-to-b from-green-900/30 to-black/30 border border-green-700/40 rounded-2xl hover:border-green-500/60 transition text-center"
                >
                  <div className="text-xs font-mono text-green-400/80 tracking-wider">📈 直近10試合の上昇王</div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-green-600/40 flex-shrink-0">
                    {recentGrowth.avatar_url
                      ? <img src={recentGrowth.avatar_url} className="w-full h-full object-cover" />
                      : <span className="text-lg flex items-center justify-center h-full bg-gray-800">👤</span>
                    }
                  </div>
                  <p className="text-xs font-semibold text-white truncate w-full">{recentGrowth.name}</p>
                  <p className="text-2xl font-extrabold font-mono text-green-300 leading-none">{recentGrowth.value}</p>
                  <p className="text-xs text-gray-500">{recentGrowth.sub}</p>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* タブ */}
        <div className="flex gap-2 bg-black/50 backdrop-blur-sm border border-purple-900/40 rounded-xl p-1">
          <Link
            href="/rankings?tab=singles"
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-center transition-all ${
              activeTab === 'singles'
                ? 'bg-gradient-to-r from-purple-700 to-purple-600 text-white shadow-[0_0_14px_rgba(139,92,246,0.55)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            ⚡ シングルス
          </Link>
          <Link
            href="/rankings?tab=doubles"
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-center transition-all ${
              activeTab === 'doubles'
                ? 'bg-gradient-to-r from-green-700 to-green-600 text-white shadow-[0_0_14px_rgba(34,197,94,0.45)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            ⚡ ダブルス
          </Link>
        </div>

        {/* シングルス */}
        {activeTab === 'singles' && (
          <section className="space-y-6">
            {singlesPlayers.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">データがありません</p>
            ) : (
              <>
                <div>
                  <div className="text-center text-xs font-mono tracking-[0.4em] text-yellow-500/60 uppercase mb-4">── TOP 3 ──</div>
                  <RankingPodium players={toPodiumPlayers(singlesPlayers, 'rating')} />
                </div>
                {singlesPlayers.length > 3 && (
                  <div>
                    <div className="text-center text-xs font-mono tracking-[0.4em] text-gray-600 uppercase mb-3">── SCOREBOARD ──</div>
                    <RankingScoreboard rows={toScoreboardRows(singlesPlayers, 'rating')} />
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ダブルス */}
        {activeTab === 'doubles' && (
          <section className="space-y-6">
            {!doublesPlayers || doublesPlayers.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">データがありません</p>
            ) : (
              <>
                <div>
                  <div className="text-center text-xs font-mono tracking-[0.4em] text-yellow-500/60 uppercase mb-4">── TOP 3 ──</div>
                  <RankingPodium players={toPodiumPlayers(doublesPlayers, 'doubles_rating')} />
                </div>
                {doublesPlayers.length > 3 && (
                  <div>
                    <div className="text-center text-xs font-mono tracking-[0.4em] text-gray-600 uppercase mb-3">── SCOREBOARD ──</div>
                    <RankingScoreboard rows={toScoreboardRows(doublesPlayers, 'doubles_rating')} />
                  </div>
                )}
              </>
            )}
          </section>
        )}

      </div>
    </div>
  )
}
