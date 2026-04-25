import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { getPlayerRankings, calcRanks, singlesTie } from '@/lib/queries/rankings'

export const dynamic = 'force-dynamic'

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900',
      {
        headers: {
          'User-Agent':
            'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)',
        },
      }
    ).then((r) => r.text())
    const match = css.match(/src: url\((.+?)\) format\('truetype'\)/)
    if (!match?.[1]) return null
    return await fetch(match[1]).then((r) => r.arrayBuffer())
  } catch {
    return null
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: player }, allPlayersResult] = await Promise.all([
    supabase
      .from('players')
      .select('id,name,avatar_url,rating,hc,wins,losses,address,tournament_wins,tournament_runner_ups')
      .eq('id', id)
      .eq('is_active', true)
      .single(),
    getPlayerRankings().catch(() => [] as Awaited<ReturnType<typeof getPlayerRankings>>),
  ])
  const allPlayers = allPlayersResult ?? []

  if (!player) {
    return new Response('Not found', { status: 404 })
  }

  // 大会実績（優勝・準優勝の大会名を取得）
  const { data: finalsRaw } = await supabase
    .from('tournament_finals_matches')
    .select('player1_id,player2_id,winner_id,round,tournament:tournaments(id,name)')
    .or(`player1_id.eq.${id},player2_id.eq.${id}`)

  // トーナメントごとの最大ラウンドを計算して優勝/準優勝を判定
  const tMaxRound = new Map<string, number>()
  finalsRaw?.forEach((m: any) => {
    const tid = m.tournament?.id
    if (!tid) return
    tMaxRound.set(tid, Math.max(tMaxRound.get(tid) ?? 0, m.round))
  })

  const tResults = new Map<string, { name: string; isWin: boolean; isRunnerUp: boolean }>()
  finalsRaw?.forEach((m: any) => {
    const tid = m.tournament?.id
    if (!tid) return
    const existing = tResults.get(tid)
    const isWin = m.winner_id === id
    const isRunnerUp = !isWin && m.winner_id !== null && m.round === tMaxRound.get(tid)
    tResults.set(tid, {
      name: m.tournament?.name ?? '',
      isWin: (existing?.isWin ?? false) || isWin,
      isRunnerUp: (existing?.isRunnerUp ?? false) || isRunnerUp,
    })
  })

  const achievements = Array.from(tResults.values())
    .filter((t) => t.isWin || t.isRunnerUp)
    .sort((a, b) => (b.isWin ? 1 : 0) - (a.isWin ? 1 : 0))
    .slice(0, 3)

  // ランキング順位
  const ranked = calcRanks(allPlayers, singlesTie)
  const currentRank = ranked.find((p) => p.id === id)?.rank ?? ranked.length

  const rankColor =
    currentRank === 1 ? '#fbbf24' :
    currentRank === 2 ? '#d1d5db' :
    currentRank === 3 ? '#fb923c' : '#a78bfa'

  const totalGames = (player.wins ?? 0) + (player.losses ?? 0)
  const winRate = totalGames > 0 ? Math.round(((player.wins ?? 0) / totalGames) * 100) : 0

  // アバターURLが実際にアクセスできるか確認（Satorがリモート画像を取得できない場合に備えて）
  let avatarUrl: string | null = player.avatar_url ?? null
  if (avatarUrl) {
    try {
      const check = await fetch(avatarUrl, { method: 'HEAD' })
      if (!check.ok) avatarUrl = null
    } catch {
      avatarUrl = null
    }
  }

  const fontData = await loadFont()
  const fonts = fontData
    ? [{ name: 'NotoSansJP', data: fontData, weight: 700 as const, style: 'normal' as const }]
    : []

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1a0533 0%, #0d0721 50%, #0a1128 100%)',
          fontFamily: fontData ? 'NotoSansJP, sans-serif' : 'sans-serif',
          color: '#ffffff',
          padding: '0',
          position: 'relative',
        }}
      >
        {/* 背景デコレーション */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(ellipse 70% 60% at 80% 50%, rgba(109,40,217,0.2) 0%, transparent 70%)',
          }}
        />

        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 48px',
            borderBottom: '1px solid rgba(139,92,246,0.25)',
          }}
        >
          <span style={{ fontSize: '14px', color: 'rgba(167,139,250,0.7)', letterSpacing: '4px' }}>
            TOYOURA SHUFFLERS CLUB
          </span>
          <span style={{ fontSize: '13px', color: 'rgba(167,139,250,0.5)' }}>
            toyoura.online
          </span>
        </div>

        {/* メインコンテンツ */}
        <div style={{ display: 'flex', flex: 1, padding: '32px 48px', gap: '48px' }}>

          {/* 左カラム: 順位・アバター・名前 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '260px',
              flexShrink: 0,
              gap: '12px',
            }}
          >
            {/* 順位 */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '80px', fontWeight: 900, color: rankColor, lineHeight: 1 }}>
                {currentRank}
              </span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: rankColor }}>位</span>
            </div>

            {/* アバター */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                width={120}
                height={120}
                style={{ borderRadius: '60px', border: `3px solid ${rankColor}`, objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '120px', height: '120px', borderRadius: '60px',
                  background: '#1e1040', border: `3px solid ${rankColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '48px',
                }}
              >
                👤
              </div>
            )}

            {/* 名前 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '26px', fontWeight: 700, textAlign: 'center' }}>
                {player.name}
              </span>
              {player.address && (
                <span style={{ fontSize: '12px', color: 'rgba(156,163,175,0.8)', textAlign: 'center' }}>
                  📍 {player.address}
                </span>
              )}
            </div>

            {/* バッジ */}
            {((player.tournament_wins ?? 0) > 0 || (player.tournament_runner_ups ?? 0) > 0) && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {(player.tournament_wins ?? 0) > 0 && (
                  <span style={{ fontSize: '22px' }}>
                    🥇×{player.tournament_wins}
                  </span>
                )}
                {(player.tournament_runner_ups ?? 0) > 0 && (
                  <span style={{ fontSize: '22px' }}>
                    🥈×{player.tournament_runner_ups}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 縦区切り線 */}
          <div
            style={{
              width: '1px',
              background: 'rgba(139,92,246,0.3)',
              alignSelf: 'stretch',
              flexShrink: 0,
            }}
          />

          {/* 右カラム: 成績・実績 */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '24px' }}>

            {/* シングルス成績 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(167,139,250,0.7)', letterSpacing: '2px' }}>
                SINGLES
              </span>

              {/* RP・HC */}
              <div style={{ display: 'flex', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '48px', fontWeight: 900, color: '#a78bfa', lineHeight: 1 }}>
                    {player.rating}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(156,163,175,0.7)' }}>Rating Point</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '48px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                    {player.hc ?? 36}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(156,163,175,0.7)' }}>Handicap</span>
                </div>
              </div>

              {/* 勝敗・勝率 */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', color: '#4ade80', fontWeight: 700 }}>
                  {player.wins ?? 0}勝
                </span>
                <span style={{ fontSize: '20px', color: '#f87171', fontWeight: 700 }}>
                  {player.losses ?? 0}敗
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(74,222,128,0.1)',
                    border: '1px solid rgba(74,222,128,0.3)',
                    borderRadius: '20px',
                    padding: '4px 14px',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#4ade80' }}>
                    勝率 {winRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* 大会実績 */}
            {achievements.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    width: '100%',
                    height: '1px',
                    background: 'rgba(139,92,246,0.3)',
                  }}
                />
                <span style={{ fontSize: '13px', color: 'rgba(167,139,250,0.7)', letterSpacing: '2px' }}>
                  TOURNAMENT
                </span>
                {achievements.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{t.isWin ? '🥇' : '🥈'}</span>
                    <span style={{ fontSize: '16px', color: '#e5e7eb' }}>{t.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '12px',
            borderTop: '1px solid rgba(139,92,246,0.2)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'rgba(107,114,128,0.8)', letterSpacing: '2px' }}>
            TOYOURA SHUFFLERS CLUB RANKING SYSTEM
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    }
  )
}
