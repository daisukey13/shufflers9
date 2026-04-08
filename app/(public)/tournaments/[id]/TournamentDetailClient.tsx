'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

type Player = { id: string; name: string; avatar_url: string | null; hc?: number; rating?: number }
type BlockPlayer = { id: string; block_id: string; player_id: string; is_default: boolean; player: Player }
type Block = { id: string; block_name: string; tournament_block_players: BlockPlayer[] }
type QualifyingMatch = {
  id: string; block_id: string; player1_id: string; player2_id: string
  score1: number | null; score2: number | null; winner_id: string | null
  mode: string; affects_ranking: boolean
  player1: Player; player2: Player
}
type FinalsSet = { id: string; match_id: string; set_number: number; score1: number; score2: number }
type FinalsMatch = {
  id: string; round: number; match_number: number
  player1_id: string | null; player2_id: string | null; winner_id: string | null
  disadvantage_player_id: string | null; mode: string
  player1: Player | null; player2: Player | null; winner: Player | null
  tournament_finals_sets: FinalsSet[]
}
type Tournament = { id: string; name: string; status: string; format: string; description: string | null }

export default function TournamentDetailClient({
  tournament,
  blocks,
  qualifyingMatches,
  finalsMatches,
  rankings,
}: {
  tournament: Tournament
  blocks: Block[]
  qualifyingMatches: QualifyingMatch[]
  finalsMatches: FinalsMatch[]
  rankings: { id: string; rank: number }[]
}) {
  const [tab, setTab] = useState<'qualifying' | 'finals'>('qualifying')
  const [popupPlayer, setPopupPlayer] = useState<Player & { hc?: number; rating?: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const rankMap = new Map(rankings.map(r => [r.id, r.rank]))

  const isQualifyingDone = ['qualifying_done', 'finals', 'finished'].includes(tournament.status)
  const isFinished = tournament.status === 'finished'

  const calcBlockStandings = (block: Block) => {
    const blockMatches = qualifyingMatches.filter(m => m.block_id === block.id)
    return block.tournament_block_players.map(bp => {
      const wins = blockMatches.filter(m => m.winner_id === bp.player_id).length
      const losses = blockMatches.filter(m =>
        (m.player1_id === bp.player_id || m.player2_id === bp.player_id) &&
        m.winner_id && m.winner_id !== bp.player_id
      ).length
      const scoreFor = blockMatches.reduce((sum, m) => {
        if (m.player1_id === bp.player_id) return sum + (m.score1 ?? 0)
        if (m.player2_id === bp.player_id) return sum + (m.score2 ?? 0)
        return sum
      }, 0)
      const scoreAgainst = blockMatches.reduce((sum, m) => {
        if (m.player1_id === bp.player_id) return sum + (m.score2 ?? 0)
        if (m.player2_id === bp.player_id) return sum + (m.score1 ?? 0)
        return sum
      }, 0)
      return {
        player: bp.player,
        is_default: bp.is_default,
        wins, losses,
        scoreFor, scoreAgainst,
        diff: scoreFor - scoreAgainst,
      }
    }).sort((a, b) => b.wins - a.wins || b.diff - a.diff)
  }

  const maxRound = finalsMatches.length > 0
    ? Math.max(...finalsMatches.map(m => m.round))
    : 0

  const roundNames = ['1回戦', '2回戦', '3回戦', '準決勝', '決勝']
  const getRoundName = (r: number) => roundNames[r - 1] ?? `第${r}回戦`

  const champion = isFinished
    ? finalsMatches
        .filter(m => m.round === maxRound && m.winner)
        .sort((a, b) => b.match_number - a.match_number)[0]?.winner
    : null

  const roundsInFinals = Array.from(new Set(finalsMatches.map(m => m.round))).sort()

  const STATUS_LABELS: Record<string, string> = {
    open: '受付中',
    entry_closed: 'エントリー終了',
    qualifying: '予選中',
    qualifying_done: '予選完了',
    finals: '本戦中',
    finished: '終了',
  }

  const STATUS_COLORS: Record<string, string> = {
    open: 'bg-green-900/50 text-green-400',
    entry_closed: 'bg-yellow-900/50 text-yellow-400',
    qualifying: 'bg-blue-900/50 text-blue-400',
    qualifying_done: 'bg-purple-900/50 text-purple-400',
    finals: 'bg-red-900/50 text-red-400',
    finished: 'bg-gray-700 text-gray-400',
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ヘッダー */}
        <div>
          <Link href="/tournaments" className="text-sm text-gray-400 hover:text-white mb-2 inline-block">
            ← 大会一覧
          </Link>
          <h1 className="text-2xl font-bold text-yellow-100">{tournament.name}</h1>
          {tournament.description && (
            <p className="text-sm text-gray-400 mt-1">{tournament.description}</p>
          )}
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[tournament.status] ?? 'bg-gray-700 text-gray-400'}`}>
            {STATUS_LABELS[tournament.status] ?? tournament.status}
          </span>
        </div>

        {/* 優勝者（終了後のみ表示） */}
{champion && (
  <div className="p-6 bg-gradient-to-r from-yellow-900/40 to-yellow-700/20 border-2 border-yellow-400 rounded-2xl text-center">
    <p className="text-yellow-400 text-sm font-bold mb-3">👑 優勝者</p>
    <div className="flex flex-col items-center gap-3">
      {champion.avatar_url && (
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-yellow-400 avatar-glow mx-auto">
          <img src={champion.avatar_url} className="w-full h-full object-cover" />
        </div>
      )}
      <p className="text-3xl font-bold text-yellow-100">{champion.name}</p>
      <div className="flex gap-4 mt-2">
        <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-purple-900/60 border border-purple-500/40">
          <span className="text-xs text-gray-400 mb-1">ランキングポイント</span>
          <span className="text-2xl font-bold text-yellow-100">{champion.rating ?? '-'}</span>
        </div>
        <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-blue-900/60 border border-blue-500/40">
          <span className="text-xs text-gray-400 mb-1">ハンディキャップ</span>
          <span className="text-2xl font-bold text-yellow-100">{champion.hc ?? '-'}</span>
        </div>
        <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-yellow-900/60 border border-yellow-500/40">
          <span className="text-xs text-gray-400 mb-1">現在順位</span>
          <span className="text-2xl font-bold text-yellow-100">
            {rankMap.get(champion.id) ? `第${rankMap.get(champion.id)}位` : '-'}
          </span>
        </div>
      </div>
    </div>
  </div>
)}

        {/* タブ */}
        <div className="flex gap-2 bg-black/20 rounded-lg p-1">
          <button
            onClick={() => setTab('qualifying')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${tab === 'qualifying' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            予選
          </button>
          <button
            onClick={() => setTab('finals')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${tab === 'finals' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            本戦
          </button>
        </div>

        {/* 予選タブ */}
        {tab === 'qualifying' && (
          <div className="space-y-8">
            {blocks.length === 0 ? (
              <p className="text-gray-400 text-sm">予選ブロックがありません</p>
            ) : (
              blocks.map(block => {
                const standings = calcBlockStandings(block)
                const blockMatches = qualifyingMatches.filter(m => m.block_id === block.id)

                return (
                  <div key={block.id} className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-5 space-y-5">
                    <h2 className="text-lg font-bold text-yellow-100">ブロック {block.block_name}</h2>

                    {/* 順位表 */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-purple-800/30">
                            <th className="text-left py-2 pr-3">順位</th>
                            <th className="text-left py-2 pr-3">プレーヤー</th>
                            <th className="text-center py-2 pr-3">HC</th>
                            <th className="text-center py-2 pr-3">勝</th>
                            <th className="text-center py-2 pr-3">敗</th>
                            <th className="text-center py-2 pr-3">得点</th>
                            <th className="text-center py-2 pr-3">失点</th>
                            <th className="text-center py-2">差</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((s, idx) => (
                            <tr key={s.player.id} className={`border-b border-purple-800/20 ${idx === 0 && !s.is_default && isQualifyingDone ? 'bg-yellow-900/10' : ''}`}>
                              <td className="py-2 pr-3">
                                <span className={`font-bold ${idx === 0 && isQualifyingDone ? 'text-yellow-400' : 'text-gray-400'}`}>
                                  {idx + 1}{idx === 0 && !s.is_default && isQualifyingDone ? ' 👑' : ''}
                                </span>
                              </td>
                              <td className="py-2 pr-3">
                                <button
                                  onClick={() => setPopupPlayer(s.player)}
                                  className="flex items-center gap-2 hover:opacity-80 transition text-left"
                                >
                                  {s.player.avatar_url && (
                                    <img src={s.player.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                                  )}
                                  <span className={`underline decoration-dotted ${s.is_default ? 'text-gray-500' : 'text-white'}`}>
                                    {s.player.name}
                                  </span>
                                </button>
                              </td>
                              <td className="text-center py-2 pr-3 text-gray-300">{s.player.hc ?? '-'}</td>
                              <td className="text-center py-2 pr-3 text-green-400 font-bold">{s.wins}</td>
                              <td className="text-center py-2 pr-3 text-red-400">{s.losses}</td>
                              <td className="text-center py-2 pr-3">{s.scoreFor}</td>
                              <td className="text-center py-2 pr-3">{s.scoreAgainst}</td>
                              <td className="text-center py-2">
                                <span className={s.diff >= 0 ? 'text-green-400' : 'text-red-400'}>
                                  {s.diff >= 0 ? '+' : ''}{s.diff}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 試合結果 */}
                    {blockMatches.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 mb-2">試合結果</h3>
                        <div className="space-y-1">
                          {blockMatches.map(m => (
                            <div key={m.id} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg text-sm">
                              <button
                                onClick={() => setPopupPlayer(m.player1)}
                                className={`flex-1 text-right hover:opacity-80 ${m.winner_id === m.player1_id ? 'text-white font-bold' : 'text-gray-400'}`}
                              >
                                {m.player1.name}
                              </button>
                              <span className="text-white font-bold flex-shrink-0">
                                {m.mode === 'walkover' ? 'W/O' : `${m.score1} - ${m.score2}`}
                              </span>
                              <button
                                onClick={() => setPopupPlayer(m.player2)}
                                className={`flex-1 hover:opacity-80 ${m.winner_id === m.player2_id ? 'text-white font-bold' : 'text-gray-400'}`}
                              >
                                {m.player2.name}
                              </button>
                              {m.mode !== 'normal' && (
                                <span className="text-xs text-yellow-400 flex-shrink-0">
                                  {m.mode === 'walkover' ? '不戦勝' : '棄権'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* 本戦タブ */}
        {tab === 'finals' && (
          <div className="space-y-6">
            {finalsMatches.length === 0 ? (
              <p className="text-gray-400 text-sm">本戦の試合がありません</p>
            ) : (
              <>
                <div
                  ref={scrollRef}
                  className="overflow-x-auto pb-4"
                  style={{ scrollSnapType: 'x mandatory' }}
                >
                  <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                    {roundsInFinals.map(r => (
                      <div
                        key={r}
                        className="w-72 flex-shrink-0"
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        <h3 className="text-base font-bold text-yellow-100 mb-3 text-center">{getRoundName(r)}</h3>
                        <div className="space-y-3">
                          {finalsMatches.filter(m => m.round === r).map(match => (
                            <div key={match.id} className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                              {/* Player1 */}
                              <div className={`flex items-center gap-3 p-2 rounded-lg mb-2 ${isFinished && match.winner_id === match.player1_id ? 'bg-green-900/30 border border-green-700/30' : ''}`}>
                                {match.player1?.avatar_url && (
                                  <img src={match.player1.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={() => match.player1 && setPopupPlayer(match.player1)}
                                    className={`text-sm font-semibold truncate underline decoration-dotted hover:opacity-80 ${isFinished && match.winner_id === match.player1_id ? 'text-white' : 'text-gray-400'}`}
                                  >
                                    {match.player1?.name ?? '未定'}
                                  </button>
                                  {match.disadvantage_player_id === match.player1_id && (
                                    <p className="text-[10px] text-orange-400">1勝アドバンテージ</p>
                                  )}
                                </div>
                                {isFinished && match.winner_id === match.player1_id && (
                                  <span className="text-yellow-400 text-sm">👑</span>
                                )}
                              </div>

                              {/* セットスコア */}
                              {match.tournament_finals_sets.length > 0 && (
                                <div className="flex justify-center gap-2 my-2">
                                  {match.tournament_finals_sets
                                    .sort((a, b) => a.set_number - b.set_number)
                                    .map(s => (
                                      <div key={s.id} className="text-center">
                                        <p className="text-[10px] text-gray-500">第{s.set_number}</p>
                                        <p className="text-xs font-bold text-white">{s.score1}-{s.score2}</p>
                                      </div>
                                    ))}
                                </div>
                              )}

                              {match.mode === 'walkover' && (
                                <p className="text-center text-xs text-yellow-400 my-2">不戦勝</p>
                              )}

                              {/* Player2 */}
                              <div className={`flex items-center gap-3 p-2 rounded-lg ${isFinished && match.winner_id === match.player2_id ? 'bg-green-900/30 border border-green-700/30' : ''}`}>
                                {match.player2?.avatar_url && (
                                  <img src={match.player2.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={() => match.player2 && setPopupPlayer(match.player2)}
                                    className={`text-sm font-semibold truncate underline decoration-dotted hover:opacity-80 ${isFinished && match.winner_id === match.player2_id ? 'text-white' : 'text-gray-400'}`}
                                  >
                                    {match.player2?.name ?? '未定'}
                                  </button>
                                  {match.disadvantage_player_id === match.player2_id && (
                                    <p className="text-[10px] text-orange-400">1勝アドバンテージ</p>
                                  )}
                                </div>
                                {isFinished && match.winner_id === match.player2_id && (
                                  <span className="text-yellow-400 text-sm">👑</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* 優勝者カード（終了後のみ） */}
                    {champion && (
                      <div
                        className="w-72 flex-shrink-0 flex items-center justify-center"
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        <div className="p-8 bg-gradient-to-b from-yellow-900/40 to-yellow-700/20 border-2 border-yellow-400 rounded-2xl text-center w-full">
                          <p className="text-yellow-400 font-bold mb-4">👑 優勝</p>
                          {champion.avatar_url && (
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-yellow-400 avatar-glow mx-auto mb-4">
                              <img src={champion.avatar_url} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="text-2xl font-bold text-yellow-100 mb-3">{champion.name}</p>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-yellow-100">
                              RP {champion.rating ?? '-'}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-900/60 border border-blue-500/40 text-yellow-100">
                              HC {champion.hc ?? '-'}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-900/60 border border-yellow-500/40 text-yellow-100">
                              #{rankMap.get(champion.id) ?? '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">← スワイプで各ラウンドを確認 →</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* プレーヤーポップアップ */}
      {popupPlayer && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          onClick={() => setPopupPlayer(null)}
        >
          <div
            className="bg-[#1e0f3a] border border-purple-800/50 rounded-2xl p-6 w-full max-w-xs space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              {popupPlayer.avatar_url && (
                <img src={popupPlayer.avatar_url} className="w-16 h-16 rounded-full border-2 border-purple-500 object-cover" />
              )}
              <div>
                <p className="font-bold text-white text-lg">{popupPlayer.name}</p>
                <Link
                  href={`/players/${popupPlayer.id}`}
                  className="text-xs text-purple-400 hover:text-purple-300"
                  onClick={() => setPopupPlayer(null)}
                >
                  プロフィールを見る →
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-purple-900/40 rounded-xl">
                <p className="text-xs text-gray-400">RP</p>
                <p className="font-bold text-yellow-100">{popupPlayer.rating ?? '-'}</p>
              </div>
              <div className="text-center p-2 bg-blue-900/40 rounded-xl">
                <p className="text-xs text-gray-400">HC</p>
                <p className="font-bold text-yellow-100">{popupPlayer.hc ?? '-'}</p>
              </div>
              <div className="text-center p-2 bg-yellow-900/40 rounded-xl">
                <p className="text-xs text-gray-400">順位</p>
                <p className="font-bold text-yellow-100">#{rankMap.get(popupPlayer.id) ?? '-'}</p>
              </div>
            </div>
            <button
              onClick={() => setPopupPlayer(null)}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-300 transition"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}