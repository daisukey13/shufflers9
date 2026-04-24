export const dynamic = 'force-dynamic'

import TournamentBadges from '@/components/ui/TournamentBadges'
import { getPlayerRankings, calcRanks, singlesTie, doublesTie } from '@/lib/queries/rankings'
import { getLastRatingChangePerPlayer } from '@/lib/queries/matches'
import { getThisMonthWinRate, getRecentRatingGrowth } from '@/lib/queries/monthly-ranking'
import { createClient } from '@/lib/supabase/server'
import { Player } from '@/types'
import Link from 'next/link'

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'doubles' ? 'doubles' : 'singles'

  const supabase = await createClient()

  const [singlesRaw, { data: doublesRaw }, lastRpChanges, thisMonthWinRate, recentGrowth] = await Promise.all([
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

  const podiumConfig = {
    1: {
      height: 'min-h-[270px]',
      avatarSize: 'w-24 h-24',
      border: 'border-2 border-yellow-400/80',
      bg: 'bg-gradient-to-b from-yellow-900/50 via-yellow-950/30 to-black/40',
      glow: '0 0 30px 8px rgba(250,204,21,0.4), 0 0 70px 20px rgba(250,204,21,0.15)',
      rankClass: 'text-yellow-300 neon-gold text-4xl',
      ptClass: 'text-yellow-300 text-2xl',
      base: 'bg-yellow-400',
    },
    2: {
      height: 'min-h-[215px]',
      avatarSize: 'w-20 h-20',
      border: 'border-2 border-gray-400/80',
      bg: 'bg-gradient-to-b from-gray-700/40 via-gray-800/30 to-black/40',
      glow: '0 0 20px 6px rgba(209,213,219,0.3), 0 0 50px 12px rgba(209,213,219,0.1)',
      rankClass: 'text-gray-200 neon-silver text-3xl',
      ptClass: 'text-gray-200 text-xl',
      base: 'bg-gray-400',
    },
    3: {
      height: 'min-h-[185px]',
      avatarSize: 'w-16 h-16',
      border: 'border-2 border-orange-500/80',
      bg: 'bg-gradient-to-b from-orange-900/40 via-orange-950/20 to-black/40',
      glow: '0 0 20px 6px rgba(249,115,22,0.3), 0 0 50px 12px rgba(249,115,22,0.1)',
      rankClass: 'text-orange-300 neon-bronze text-3xl',
      ptClass: 'text-orange-200 text-xl',
      base: 'bg-orange-500',
    },
  }

  const rpBadge = (playerId: string) => {
    const last = lastRpChanges.get(playerId)
    if (!last) return null
    const c = last.change
    const isBonus = c > 0 && last.hasBonus
    const color = isBonus ? 'neon-bonus' : c > 0 ? 'text-green-400' : c < 0 ? 'text-red-400' : 'text-gray-500'
    return (
      <span className={`text-xs font-mono font-bold ${color}`}>
        {c > 0 ? '+' : ''}{c}pt{isBonus ? '★' : ''}
      </span>
    )
  }

  const renderPodium = (players: (Player & { rank: number })[], ratingKey: string) => {
    const top3 = players.slice(0, 3)
    if (top3.length === 0) return null

    // 表示順: 2位(左) → 1位(中央) → 3位(右)
    const ordered = [top3[1], top3[0], top3[2]].filter(Boolean) as (Player & { rank: number })[]
    // 表示位置(0=1位,1=2位,2=3位)→podiumConfig番号
    const posConfigs = [podiumConfig[1], podiumConfig[2], podiumConfig[3]] as const

    return (
      <div className="grid gap-2 items-end" style={{ gridTemplateColumns: `repeat(${ordered.length}, 1fr)` }}>
        {ordered.map((player, idx) => {
          // orderedの並び: [2位,1位,3位] → posConfigs index [1,0,2]
          const posIdx = idx === 0 ? 1 : idx === 1 ? 0 : 2
          const cfg = posConfigs[posIdx]
          const rating = ratingKey === 'doubles_rating' ? player.doubles_rating : player.rating
          const wins = ratingKey === 'doubles_rating' ? player.doubles_wins : player.wins
          const losses = ratingKey === 'doubles_rating' ? player.doubles_losses : player.losses
          const wr = winRate(wins, losses)

          return (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              style={{ boxShadow: cfg.glow }}
              className={`relative flex flex-col items-center text-center px-2 pt-3 pb-2 ${cfg.height} ${cfg.border} ${cfg.bg} rounded-2xl hover:scale-[1.03] transition-transform overflow-hidden`}
            >
              {/* Rank */}
              <div className={`font-extrabold ${cfg.rankClass} leading-none mb-1`}>{player.rank}</div>

              {/* Crown */}
              {player.rank === 1 && (
                <div className="text-xl mb-1" style={{ animation: 'bounce 1s infinite' }}>👑</div>
              )}

              {/* Avatar */}
              <div className={`${cfg.avatarSize} rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0 mb-2`}>
                {player.avatar_url
                  ? <img src={player.avatar_url} className="w-full h-full object-cover" />
                  : <span className="text-2xl flex items-center justify-center h-full bg-gray-800">👤</span>
                }
              </div>

              {/* Name */}
              <p className="font-bold text-white text-xs truncate w-full px-1 mb-1 leading-tight">{player.name}</p>

              {/* Points */}
              <div className={`font-extrabold font-mono ${cfg.ptClass} leading-none`}>{rating}</div>
              <div className="text-xs text-gray-500 mb-1">pt</div>

              {/* Last RP change */}
              <div className="mb-1">{rpBadge(player.id) ?? <span className="text-xs text-gray-700">-</span>}</div>

              {/* Win/Loss */}
              <div className="text-xs text-gray-400">
                {wins}勝{losses}敗
                <span className="text-green-400 ml-1">{wr}%</span>
              </div>

              {/* Tournament badges */}
              <div className="mt-1 flex justify-center">
                <TournamentBadges
                  wins={player.tournament_wins ?? 0}
                  runnerUps={player.tournament_runner_ups ?? 0}
                  qualifications={player.tournament_qualifications ?? 0}
                  size="sm"
                />
              </div>

              {/* Base bar */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${cfg.base} opacity-70`} />
            </Link>
          )
        })}
      </div>
    )
  }

  const renderScoreboard = (players: (Player & { rank: number })[], ratingKey: string) => {
    const rest = players.slice(3)
    if (rest.length === 0) return null

    return (
      <div className="rounded-2xl overflow-hidden border border-purple-900/40" style={{ background: 'linear-gradient(180deg, #07090f 0%, #090c16 100%)' }}>
        <div className="grid grid-cols-[2.5rem_1fr_auto] gap-3 px-4 py-2 border-b border-purple-900/30">
          <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">#</span>
          <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">Player</span>
          <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">PT</span>
        </div>
        {rest.map((player) => {
          const rating = ratingKey === 'doubles_rating' ? player.doubles_rating : player.rating
          const wins = ratingKey === 'doubles_rating' ? player.doubles_wins : player.wins
          const losses = ratingKey === 'doubles_rating' ? player.doubles_losses : player.losses
          const wr = winRate(wins, losses)

          return (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="grid grid-cols-[2.5rem_1fr_auto] gap-3 items-center px-4 py-3 border-b border-purple-950/50 last:border-0 hover:bg-purple-900/20 hover:shadow-[inset_0_0_40px_rgba(139,92,246,0.12)] transition-all group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-black/70 border border-purple-900/50 font-mono text-sm font-bold text-purple-400 group-hover:text-purple-200 group-hover:border-purple-600/60 group-hover:shadow-[0_0_8px_rgba(139,92,246,0.6)] transition-all">
                {player.rank}
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-purple-800/40 flex-shrink-0">
                  {player.avatar_url
                    ? <img src={player.avatar_url} className="w-full h-full object-cover" />
                    : <span className="text-base flex items-center justify-center h-full bg-gray-800">👤</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate text-sm group-hover:text-purple-100 transition-colors">{player.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>HC {player.hc ?? 36}</span>
                    <span>{wins}勝{losses}敗</span>
                    <span className="text-green-500">{wr}%</span>
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div>
                  <span className="font-mono font-bold text-lg text-purple-300 group-hover:text-purple-100 transition-colors">{rating}</span>
                  <span className="text-xs text-gray-600 ml-0.5">pt</span>
                </div>
                <div>{rpBadge(player.id) ?? <span className="text-xs text-gray-700">-</span>}</div>
              </div>
            </Link>
          )
        })}
      </div>
    )
  }

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
                  {renderPodium(singlesPlayers, 'rating')}
                </div>
                {singlesPlayers.length > 3 && (
                  <div>
                    <div className="text-center text-xs font-mono tracking-[0.4em] text-gray-600 uppercase mb-3">── SCOREBOARD ──</div>
                    {renderScoreboard(singlesPlayers, 'rating')}
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
                  {renderPodium(doublesPlayers, 'doubles_rating')}
                </div>
                {doublesPlayers.length > 3 && (
                  <div>
                    <div className="text-center text-xs font-mono tracking-[0.4em] text-gray-600 uppercase mb-3">── SCOREBOARD ──</div>
                    {renderScoreboard(doublesPlayers, 'doubles_rating')}
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
