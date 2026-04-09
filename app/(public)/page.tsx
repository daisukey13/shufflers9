import Link from 'next/link'
import { getPlayerRankings } from '@/lib/queries/rankings'
import { getRecentSinglesMatches } from '@/lib/queries/matches'

export default async function HomePage() {
  const [players, recentMatches] = await Promise.all([
    getPlayerRankings(),
    getRecentSinglesMatches(3),
  ])
  const top5 = players.slice(0, 5)
  const avgRating = players.length > 0
    ? Math.round(players.reduce((a, p) => a + p.rating, 0) / players.length)
    : 1000

  const winRate = (w: number, l: number) => {
    const g = w + l
    return g > 0 ? Math.round((w / g) * 100) : 0
  }

  const sizeByRank = (rank: number) => {
    switch (rank) {
      case 1: return { cardH: 'min-h-[18rem]', avatar: 'w-28 h-28', badge: 'w-10 h-10 text-base', border: 'border-4 border-yellow-400/70', glow: 'shadow-xl shadow-yellow-400/20', pill: 'text-base', frame: 'from-yellow-400/25 to-yellow-600/25', badgeColor: 'bg-yellow-400 text-gray-900' }
      case 2: return { cardH: 'min-h-[15rem]', avatar: 'w-24 h-24', badge: 'w-9 h-9 text-sm', border: 'border-2 border-gray-300/80', glow: 'shadow-lg shadow-gray-300/10', pill: 'text-sm', frame: 'from-gray-300/20 to-gray-500/20', badgeColor: 'bg-gray-300 text-gray-900' }
      case 3: return { cardH: 'min-h-[13rem]', avatar: 'w-20 h-20', badge: 'w-9 h-9 text-sm', border: 'border-2 border-orange-500/80', glow: 'shadow-lg shadow-orange-400/10', pill: 'text-sm', frame: 'from-orange-400/20 to-orange-600/20', badgeColor: 'bg-orange-500 text-white' }
      case 4: return { cardH: 'min-h-[11rem]', avatar: 'w-16 h-16', badge: 'w-8 h-8 text-xs', border: 'border border-purple-400/40', glow: 'shadow', pill: 'text-xs', frame: 'from-purple-600/10 to-pink-600/10', badgeColor: 'bg-purple-600 text-white' }
      default: return { cardH: 'min-h-[10rem]', avatar: 'w-16 h-16', badge: 'w-8 h-8 text-xs', border: 'border border-purple-400/40', glow: 'shadow', pill: 'text-xs', frame: 'from-purple-600/10 to-pink-600/10', badgeColor: 'bg-purple-600 text-white' }
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-white">

      {/* ヒーロー */}
      <section className="relative text-center py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#3b0764_0%,_transparent_70%)] pointer-events-none" />
        <div className="relative flex justify-center mb-4">
          <img
            src="/shuffleboard-puck-blue.png"
            alt="Shuffleboard Puck"
            className="w-24 h-24 object-contain opacity-90"
          />
        </div>
        <div className="relative flex justify-center mb-6">
          <img
            src="/logo-toyoura-shufflers.png"
            alt="Toyoura Shufflers Club"
            className="w-full max-w-2xl h-auto object-contain"
          />
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-px w-12 bg-orange-400/50" />
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <div className="h-px w-12 bg-orange-400/50" />
        </div>
        <p className="relative text-gray-400 text-sm">みんなで楽しくテーブルシャッフルボード！</p>
      </section>

      {/* クイックリンク */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-purple-900/20 border-y border-purple-800/30 mb-10">
        {[
          { label: 'ランキング', sub: '最新のランキング', href: '/rankings', disabled: false },
          { label: 'メンバー', sub: 'クラブメンバーを見る', href: '/players', disabled: false },
          { label: 'チーム', sub: '準備中', href: '#', disabled: true },
          { label: '試合結果', sub: '過去の試合をチェック', href: '/matches', disabled: false },
        ].map(item => (
          item.disabled ? (
            <div
              key={item.label}
              className="flex flex-col items-center gap-1 p-8 bg-[#12082a] opacity-40 cursor-not-allowed"
            >
              <span className="font-semibold text-gray-500">{item.label}</span>
              <span className="text-xs text-gray-600">{item.sub}</span>
            </div>
          ) : (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 p-8 bg-[#12082a] hover:bg-purple-900/30 transition">
              <span className="font-semibold text-white">{item.label}</span>
              <span className="text-xs text-gray-500">{item.sub}</span>
            </Link>
          )
        ))}
      </section>

      {/* アクションボタン（1箇所のみ） */}
      <section className="flex flex-wrap justify-center gap-3 px-4 mb-10">
        <Link href="/register" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-sm font-medium transition">
          👥 メンバー登録
        </Link>
        <Link href="/matches/register/singles" className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-full text-sm font-medium transition">
          <img src="/shuffleboard-puck-blue.png" className="w-5 h-5 object-contain" />
          シングルス登録
        </Link>
        <Link href="/matches/register/doubles" className="flex items-center gap-2 px-5 py-2 bg-green-700 hover:bg-green-600 rounded-full text-sm font-medium transition">
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
          { label: '試合数', value: recentMatches.length },
          { label: '平均pts', value: avgRating },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col items-center p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl">
            <span className="text-3xl font-bold text-white">{stat.value}</span>
            <span className="text-xs text-gray-500 mt-1">{stat.label}</span>
          </div>
        ))}
      </section>

      {/* トッププレーヤー */}
      <section className="px-4 mb-14 max-w-6xl mx-auto">
        <h2 className="text-xl font-bold mb-8 flex items-center gap-2 text-yellow-100">
          🏆 トッププレーヤー
        </h2>
        {top5.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">まだデータがありません</p>
        ) : (
          <>
            {/* PC: 横並び */}
            <div className="hidden sm:grid grid-cols-5 gap-4 items-end">
              {[3, 1, 0, 2, 4].map(i => {
                const player = top5[i]
                const rank = i + 1
                const S = sizeByRank(rank)
                if (!player) return <div key={i} />
                return (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className={`relative flex flex-col items-center text-center p-4 rounded-2xl bg-gradient-to-b ${S.frame} ${S.border} ${S.glow} ${S.cardH} hover:scale-[1.02] transition-transform`}
                  >
                    <div className={`absolute -top-3 -right-3 ${S.badge} ${S.badgeColor} rounded-full font-extrabold flex items-center justify-center shadow z-10`}>
                      {rank}
                    </div>
                    {rank === 1 && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold shadow whitespace-nowrap z-10">
                        👑 CHAMPION
                      </div>
                    )}
                    <div className={`${S.avatar} rounded-full overflow-hidden border-2 border-purple-500 mt-4 mb-3 flex-shrink-0`}>
                      {player.avatar_url
                        ? <img src={player.avatar_url} className="w-full h-full object-cover" />
                        : <span className="text-3xl flex items-center justify-center h-full bg-gray-800">👤</span>
                      }
                    </div>
                    <div className="font-semibold text-yellow-100 truncate w-full text-sm">{player.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 mb-3">HC {player.hc ?? 36}</div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 ${S.pill}`}>
                        <span className="text-gray-300 text-xs">RP</span>
                        <span className="font-bold text-yellow-100">{player.rating}</span>
                      </div>
                      <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-blue-900/60 border border-blue-500/40 ${S.pill}`}>
                        <span className="text-gray-300 text-xs">勝率</span>
                        <span className="font-bold text-yellow-100">{winRate(player.wins, player.losses)}%</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* モバイル: 縦並び */}
            <div className="sm:hidden space-y-2">
              {[0, 1, 2, 3, 4].map(i => {
                const player = top5[i]
                const rank = i + 1
                if (!player) return null
                const badgeColor = rank === 1 ? 'bg-yellow-400 text-black' : rank === 2 ? 'bg-gray-400 text-black' : rank === 3 ? 'bg-orange-500 text-white' : 'bg-purple-700 text-white'
                const borderColor = rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-gray-400' : rank === 3 ? 'border-orange-500' : 'border-purple-600'
                return (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className={`flex items-center gap-4 p-4 rounded-2xl bg-purple-900/20 border-2 ${borderColor}`}
                  >
                    <div className={`w-9 h-9 rounded-full ${badgeColor} font-extrabold flex items-center justify-center flex-shrink-0 text-sm`}>
                      {rank}
                    </div>
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500 flex-shrink-0">
                      {player.avatar_url
                        ? <img src={player.avatar_url} className="w-full h-full object-cover" />
                        : <span className="text-xl flex items-center justify-center h-full bg-gray-800">👤</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-yellow-100 truncate">{player.name}</p>
                      <p className="text-xs text-gray-400">HC {player.hc ?? 36}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/40 text-yellow-100">RP {player.rating}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-500/40 text-yellow-100">勝率 {winRate(player.wins, player.losses)}%</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* 最近の試合 */}
      <section className="px-4 mb-14 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-6">🔄 最近の試合</h2>
        {recentMatches.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">試合がありません</p>
        ) : (
          <div className="space-y-3">
            {recentMatches.map(match => {
              const winnerId = match.winner_id
              const date = new Date(match.played_at)
              const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
              return (
                <div key={match.id} className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-2xl">
                  <p className="text-xs text-gray-400 mb-3">{dateStr}</p>
                  <div className="flex items-center gap-3">
                    <Link href={`/players/${match.player1_id}`} className="flex-1 flex items-center gap-2 justify-end">
                      <span className={`font-semibold text-sm truncate ${winnerId === match.player1_id ? 'text-white' : 'text-gray-400'}`}>
                        {match.player1?.name ?? '不明'}
                      </span>
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30 flex-shrink-0">
                        {match.player1?.avatar_url
                          ? <img src={match.player1.avatar_url} className="w-full h-full object-cover" />
                          : <span className="text-3xl flex items-center justify-center h-full">👤</span>
                        }
                      </div>
                    </Link>
                    <div className="text-center flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold mb-1 mx-auto">VS</div>
                      <p className="text-base font-bold text-white">{match.score1} - {match.score2}</p>
                    </div>
                    <Link href={`/players/${match.player2_id}`} className="flex-1 flex items-center gap-2">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-800 border border-purple-700/30 flex-shrink-0">
                        {match.player2?.avatar_url
                          ? <img src={match.player2.avatar_url} className="w-full h-full object-cover" />
                          : <span className="text-3xl flex items-center justify-center h-full">👤</span>
                        }
                      </div>
                      <span className={`font-semibold text-sm truncate ${winnerId === match.player2_id ? 'text-white' : 'text-gray-400'}`}>
                        {match.player2?.name ?? '不明'}
                      </span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <Link href="/matches" className="block text-center text-purple-400 hover:text-purple-300 mt-5 text-sm">
          すべての試合を見る →
        </Link>
      </section>
    </div>
  )
}