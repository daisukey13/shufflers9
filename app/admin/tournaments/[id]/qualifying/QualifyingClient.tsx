'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Player = { id: string; name: string; avatar_url: string | null; hc: number; rating: number }
type BlockPlayer = { id: string; block_id: string; player_id: string; is_default: boolean; player: Player }
type Block = { id: string; tournament_id: string; block_name: string; tournament_block_players: BlockPlayer[] }
type Match = {
  id: string; block_id: string; player1_id: string; player2_id: string
  score1: number | null; score2: number | null; winner_id: string | null
  mode: string; affects_ranking: boolean
  player1: { id: string; name: string; avatar_url: string | null }
  player2: { id: string; name: string; avatar_url: string | null }
}
type Tournament = { id: string; name: string; status: string; format: string }

export default function QualifyingClient({
  tournament,
  players,
  enteredPlayers,
  defaultPlayerId,
  blocks,
  matches,
}: {

  tournament: Tournament
  players: Player[]
  defaultPlayerId: string
  blocks: Block[]
  matches: Match[]
}) {
  const [showNewBlock, setShowNewBlock] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(['', '', ''])
  const [blockLoading, setBlockLoading] = useState(false)
  const [blockError, setBlockError] = useState<string | null>(null)

  const [showMatchForm, setShowMatchForm] = useState<string | null>(null)
  const [matchPlayer1, setMatchPlayer1] = useState('')
  const [matchPlayer2, setMatchPlayer2] = useState('')
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [matchMode, setMatchMode] = useState<'normal' | 'walkover' | 'forfeit'>('normal')
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)

  const [autoLoading, setAutoLoading] = useState(false)
const [autoError, setAutoError] = useState<string | null>(null)

// ランダムブロック自動生成
const handleAutoGenerate = async () => {
  if (enteredPlayers.length === 0) {
    setAutoError('エントリー済みのプレーヤーがいません')
    return
  }
  if (!confirm(`${enteredPlayers.length}名をランダムにブロック分けします。よろしいですか？`)) return

  setAutoLoading(true)
  setAutoError(null)

  // シャッフル
  const shuffled = [...enteredPlayers].sort(() => Math.random() - 0.5)

  // 3人ずつブロックに分ける
  const blockGroups: Player[][] = []
  for (let i = 0; i < shuffled.length; i += 3) {
    blockGroups.push(shuffled.slice(i, i + 3))
  }

  const blockNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const startIndex = blocks.length

  for (let i = 0; i < blockGroups.length; i++) {
    const group = blockGroups[i]
    const blockName = blockNames[startIndex + i]

    const { data: block, error: blockErr } = await supabase
      .from('tournament_blocks')
      .insert({ tournament_id: tournament.id, block_name: blockName })
      .select()
      .single()

    if (blockErr || !block) continue

    const blockPlayers = [...group]
    while (blockPlayers.length < 3) {
      blockPlayers.push({ id: defaultPlayerId } as Player)
    }

    await supabase.from('tournament_block_players').insert(
      blockPlayers.map(p => ({
        block_id: block.id,
        player_id: p.id,
        is_default: p.id === defaultPlayerId,
      }))
    )
  }

  setAutoLoading(false)
  router.refresh()
}

  const router = useRouter()
  const supabase = createClient()

  const blockNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  const isQualifyingLocked = ['qualifying_done', 'finals', 'finished'].includes(tournament.status)

  // ブロック作成
  const handleCreateBlock = async () => {
    setBlockLoading(true)
    setBlockError(null)

    const filled = selectedPlayers.filter(p => p !== '')
    if (filled.length < 1) {
      setBlockError('少なくとも1人選択してください')
      setBlockLoading(false)
      return
    }

    const finalPlayers = [...selectedPlayers]
    while (finalPlayers.filter(p => p !== '').length < 3) {
      const emptyIdx = finalPlayers.findIndex(p => p === '')
      if (emptyIdx !== -1) finalPlayers[emptyIdx] = defaultPlayerId
    }

    const blockName = blockNames[blocks.length]

    const { data: block, error: blockErr } = await supabase
      .from('tournament_blocks')
      .insert({ tournament_id: tournament.id, block_name: blockName })
      .select()
      .single()

    if (blockErr || !block) {
      setBlockError('ブロック作成に失敗しました')
      setBlockLoading(false)
      return
    }

    const blockPlayers = finalPlayers.filter(p => p !== '').map(pid => ({
      block_id: block.id,
      player_id: pid,
      is_default: pid === defaultPlayerId,
    }))

    const { error: bpErr } = await supabase
      .from('tournament_block_players')
      .insert(blockPlayers)

    if (bpErr) {
      setBlockError('メンバー設定に失敗しました')
      setBlockLoading(false)
      return
    }

    setSelectedPlayers(['', '', ''])
    setShowNewBlock(false)
    setBlockLoading(false)
    router.refresh()
  }

  // 試合登録（RP・HC反映含む）
  const handleRegisterMatch = async (blockId: string) => {
    setMatchLoading(true)
    setMatchError(null)

    if (!matchPlayer1 || !matchPlayer2) {
      setMatchError('プレーヤーを選択してください')
      setMatchLoading(false)
      return
    }

    const s1 = parseInt(score1)
    const s2 = parseInt(score2)
    const isNormal = matchMode === 'normal'

    if (isNormal && (isNaN(s1) || isNaN(s2))) {
      setMatchError('スコアを入力してください')
      setMatchLoading(false)
      return
    }

    const winnerId = matchMode === 'walkover'
      ? matchPlayer1
      : matchMode === 'forfeit'
        ? matchPlayer1
        : s1 > s2 ? matchPlayer1 : s2 > s1 ? matchPlayer2 : null

    const finalScore1 = matchMode === 'walkover' ? 15 : isNaN(s1) ? null : s1
    const finalScore2 = matchMode === 'walkover' ? 0 : isNaN(s2) ? null : s2

    const { error } = await supabase
      .from('tournament_qualifying_matches')
      .insert({
        block_id: blockId,
        player1_id: matchPlayer1,
        player2_id: matchPlayer2,
        score1: finalScore1,
        score2: finalScore2,
        winner_id: winnerId,
        mode: matchMode,
        affects_ranking: isNormal,
      })

    if (error) {
      setMatchError('登録に失敗しました: ' + error.message)
      setMatchLoading(false)
      return
    }

    // 通常試合のみRP・HC反映
    if (isNormal && winnerId && finalScore1 !== null && finalScore2 !== null) {
      const { data: p1 } = await supabase
        .from('players')
        .select('rating, wins, losses, total_score, total_matches, hc')
        .eq('id', matchPlayer1)
        .single()
      const { data: p2 } = await supabase
        .from('players')
        .select('rating, wins, losses, total_score, total_matches, hc')
        .eq('id', matchPlayer2)
        .single()

      if (p1 && p2) {
        const { count: matchesP1 } = await supabase
          .from('singles_matches')
          .select('*', { count: 'exact', head: true })
          .or(`player1_id.eq.${matchPlayer1},player2_id.eq.${matchPlayer1}`)
        const { count: matchesP2 } = await supabase
          .from('singles_matches')
          .select('*', { count: 'exact', head: true })
          .or(`player1_id.eq.${matchPlayer2},player2_id.eq.${matchPlayer2}`)

        const { data: elo } = await supabase.rpc('calc_elo', {
          rating_a: p1.rating,
          rating_b: p2.rating,
          score_a: finalScore1,
          score_b: finalScore2,
          matches_a: matchesP1 ?? 0,
          matches_b: matchesP2 ?? 0,
        })

        if (elo?.[0]) {
          const eloResult = elo[0]

          await supabase.from('players').update({
            rating: eloResult.new_rating_a,
            wins: finalScore1 > finalScore2 ? p1.wins + 1 : p1.wins,
            losses: finalScore1 < finalScore2 ? p1.losses + 1 : p1.losses,
            total_score: (p1.total_score ?? 0) + finalScore1,
            total_matches: (p1.total_matches ?? 0) + 1,
          }).eq('id', matchPlayer1)

          await supabase.from('players').update({
            rating: eloResult.new_rating_b,
            wins: finalScore2 > finalScore1 ? p2.wins + 1 : p2.wins,
            losses: finalScore2 < finalScore1 ? p2.losses + 1 : p2.losses,
            total_score: (p2.total_score ?? 0) + finalScore2,
            total_matches: (p2.total_matches ?? 0) + 1,
          }).eq('id', matchPlayer2)

          // HC更新
          const { data: hc1 } = await supabase.rpc('calc_hc', {
            p_wins: finalScore1 > finalScore2 ? p1.wins + 1 : p1.wins,
            p_losses: finalScore1 < finalScore2 ? p1.losses + 1 : p1.losses,
            p_total_score: (p1.total_score ?? 0) + finalScore1,
            p_total_matches: (p1.total_matches ?? 0) + 1,
          })
          if (hc1 !== null) await supabase.from('players').update({ hc: hc1 }).eq('id', matchPlayer1)

          const { data: hc2 } = await supabase.rpc('calc_hc', {
            p_wins: finalScore2 > finalScore1 ? p2.wins + 1 : p2.wins,
            p_losses: finalScore2 < finalScore1 ? p2.losses + 1 : p2.losses,
            p_total_score: (p2.total_score ?? 0) + finalScore2,
            p_total_matches: (p2.total_matches ?? 0) + 1,
          })
          if (hc2 !== null) await supabase.from('players').update({ hc: hc2 }).eq('id', matchPlayer2)
        }
      }
    }

    setMatchPlayer1('')
    setMatchPlayer2('')
    setScore1('')
    setScore2('')
    setMatchMode('normal')
    setShowMatchForm(null)
    setMatchLoading(false)
    router.refresh()
  }

  // ブロックの順位計算
  const calcBlockStandings = (block: Block, blockMatches: Match[]) => {
    const standings = block.tournament_block_players.map(bp => {
      const wins = blockMatches.filter(m => m.winner_id === bp.player_id).length
      const losses = blockMatches.filter(m =>
        (m.player1_id === bp.player_id || m.player2_id === bp.player_id) && m.winner_id && m.winner_id !== bp.player_id
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
        wins, losses, scoreFor, scoreAgainst,
        diff: scoreFor - scoreAgainst,
      }
    }).sort((a, b) => b.wins - a.wins || b.diff - a.diff)
    return standings
  }

  const getRegisteredPairs = (blockMatches: Match[]) =>
    blockMatches.map(m => `${m.player1_id}-${m.player2_id}`)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🏆 {tournament.name}</h1>
          <p className="text-sm text-gray-400 mt-1">予選管理</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/tournaments" className="text-sm text-gray-400 hover:text-white transition">
            ← 大会一覧
          </Link>
          <Link
            href={`/admin/tournaments/${tournament.id}/finals`}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition"
          >
            本戦管理 →
          </Link>
        </div>
      </div>

      {/* ブロック追加（ロック中は非表示） */}
      {!isQualifyingLocked && (
        <div>
          <button
            onClick={() => setShowNewBlock(!showNewBlock)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
          >
            {showNewBlock ? 'キャンセル' : `+ ブロック${blockNames[blocks.length]}を追加`}
          </button>

          {showNewBlock && (
            <div className="mt-4 p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl space-y-4">
              <h3 className="font-semibold">ブロック{blockNames[blocks.length]}のメンバーを選択</h3>
              {blockError && (
                <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{blockError}</p>
              )}
              <p className="text-xs text-gray-400">3人未満の場合はDEFAULTプレーヤーで自動補充されます</p>
              {[0, 1, 2].map(i => (
                <div key={i}>
                  <label className="block text-sm text-gray-300 mb-1">プレーヤー {i + 1}</label>
                  <select
                    value={selectedPlayers[i]}
                    onChange={e => {
                      const updated = [...selectedPlayers]
                      updated[i] = e.target.value
                      setSelectedPlayers(updated)
                    }}
                    className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">選択してください（空欄=DEFAULT）</option>
                    {players
                      .filter(p => !selectedPlayers.includes(p.id) || selectedPlayers[i] === p.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name} (HC:{p.hc} RP:{p.rating})</option>
                      ))
                    }
                  </select>
                </div>
              ))}
              <button
                onClick={handleCreateBlock}
                disabled={blockLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {blockLoading ? '作成中...' : 'ブロックを作成'}
              </button>
            </div>
          )}
        </div>
      )}

      {isQualifyingLocked && (
        <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
          <p className="text-yellow-400 text-sm">✅ 予選完了済み。試合の編集のみ可能です。</p>
        </div>
      )}

      {/* ブロック一覧 */}
      {blocks.length === 0 ? (
        <p className="text-gray-400 text-sm">まだブロックがありません</p>
      ) : (
        <div className="space-y-8">
          {blocks.map(block => {
            const blockMatches = matches.filter(m => m.block_id === block.id)
            const standings = calcBlockStandings(block, blockMatches)
            const registeredPairs = getRegisteredPairs(blockMatches)
            const blockPlayerIds = block.tournament_block_players.map(bp => bp.player_id)

            const pendingPairs: [string, string][] = []
            for (let i = 0; i < blockPlayerIds.length; i++) {
              for (let j = i + 1; j < blockPlayerIds.length; j++) {
                const pair = `${blockPlayerIds[i]}-${blockPlayerIds[j]}`
                const pairReverse = `${blockPlayerIds[j]}-${blockPlayerIds[i]}`
                if (!registeredPairs.includes(pair) && !registeredPairs.includes(pairReverse)) {
                  pendingPairs.push([blockPlayerIds[i], blockPlayerIds[j]])
                }
              }
            }

            return (
              <div key={block.id} className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-5 space-y-5">
                <h2 className="text-lg font-bold text-yellow-100">ブロック {block.block_name}</h2>

                {/* 順位表 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">順位表</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-purple-800/30">
                          <th className="text-left py-2 pr-4">順位</th>
                          <th className="text-left py-2 pr-4">プレーヤー</th>
                          <th className="text-center py-2 pr-4">HC</th>
                          <th className="text-center py-2 pr-4">勝</th>
                          <th className="text-center py-2 pr-4">敗</th>
                          <th className="text-center py-2 pr-4">得点</th>
                          <th className="text-center py-2 pr-4">失点</th>
                          <th className="text-center py-2">得失点差</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s, idx) => (
                          <tr key={s.player.id} className={`border-b border-purple-800/20 ${idx === 0 ? 'text-yellow-100' : 'text-white'}`}>
                            <td className="py-2 pr-4">
                              <span className={`font-bold ${idx === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                {idx + 1}{idx === 0 && ' 👑'}
                              </span>
                            </td>
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-2">
                                {s.player.avatar_url && (
                                  <img src={s.player.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                                )}
                                <span>{s.player.name}</span>
                                {s.is_default && <span className="text-xs text-gray-500">(DEFAULT)</span>}
                              </div>
                            </td>
                            <td className="text-center py-2 pr-4">{s.player.hc}</td>
                            <td className="text-center py-2 pr-4 text-green-400">{s.wins}</td>
                            <td className="text-center py-2 pr-4 text-red-400">{s.losses}</td>
                            <td className="text-center py-2 pr-4">{s.scoreFor}</td>
                            <td className="text-center py-2 pr-4">{s.scoreAgainst}</td>
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
                </div>

                {/* 試合結果一覧 */}
                {blockMatches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">試合結果</h3>
                    <div className="space-y-1">
                      {blockMatches.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg text-sm">
                          <span className={m.winner_id === m.player1_id ? 'text-white font-bold' : 'text-gray-400'}>{m.player1.name}</span>
                          <span className="text-white font-bold">{m.mode === 'walkover' ? 'W/O' : `${m.score1} - ${m.score2}`}</span>
                          <span className={m.winner_id === m.player2_id ? 'text-white font-bold' : 'text-gray-400'}>{m.player2.name}</span>
                          {m.mode !== 'normal' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400">
                              {m.mode === 'walkover' ? '不戦勝' : '途中棄権'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 試合登録（ロック中は非表示） */}
                {!isQualifyingLocked && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-300">
                        試合登録 {pendingPairs.length > 0 && <span className="text-gray-500">（残り{pendingPairs.length}試合）</span>}
                      </h3>
                      <button
                        onClick={() => {
                          if (showMatchForm === block.id) {
                            setShowMatchForm(null)
                          } else {
                            setShowMatchForm(block.id)
                            if (pendingPairs.length > 0) {
                              setMatchPlayer1(pendingPairs[0][0])
                              setMatchPlayer2(pendingPairs[0][1])
                            }
                          }
                        }}
                        className="text-xs px-3 py-1 bg-purple-700/50 hover:bg-purple-600/50 rounded-lg text-purple-300 transition"
                      >
                        {showMatchForm === block.id ? 'キャンセル' : '+ 試合登録'}
                      </button>
                    </div>

                    {showMatchForm === block.id && (
                      <div className="p-4 bg-black/20 rounded-xl space-y-3">
                        {matchError && (
                          <p className="text-sm text-red-400">{matchError}</p>
                        )}

                        <div className="flex gap-2 bg-black/20 rounded-lg p-1">
                          {(['normal', 'walkover', 'forfeit'] as const).map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setMatchMode(mode)}
                              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${matchMode === mode ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                              {mode === 'normal' ? '通常' : mode === 'walkover' ? '不戦勝' : '途中棄権'}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">
                              {matchMode === 'walkover' ? '勝者' : matchMode === 'forfeit' ? '続行者' : 'プレーヤー1'}
                            </label>
                            <select
                              value={matchPlayer1}
                              onChange={e => setMatchPlayer1(e.target.value)}
                              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="">選択</option>
{block.tournament_block_players.map(bp => (
  <option key={bp.player_id} value={bp.player_id}>{bp.player.name}</option>
))}
<option value={defaultPlayerId}>DEFAULT（不戦勝）</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">
                              {matchMode === 'walkover' ? '相手（不在）' : matchMode === 'forfeit' ? '棄権者' : 'プレーヤー2'}
                            </label>
                            <select
                              value={matchPlayer2}
                              onChange={e => setMatchPlayer2(e.target.value)}
                              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="">選択</option>
{block.tournament_block_players
  .filter(bp => bp.player_id !== matchPlayer1)
  .map(bp => (
    <option key={bp.player_id} value={bp.player_id}>{bp.player.name}</option>
  ))}
{matchPlayer1 !== defaultPlayerId && (
  <option value={defaultPlayerId}>DEFAULT（不戦勝）</option>
)}
                            </select>
                          </div>
                        </div>

                        {matchMode !== 'walkover' && (
                          <div className="flex gap-3 items-center">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-400 mb-1">スコア1</label>
                              <input
                                type="number"
                                min="0"
                                max="15"
                                value={score1}
                                onChange={e => setScore1(e.target.value)}
                                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                            <span className="text-gray-400 mt-4">-</span>
                            <div className="flex-1">
                              <label className="block text-xs text-gray-400 mb-1">スコア2</label>
                              <input
                                type="number"
                                min="0"
                                max="15"
                                value={score2}
                                onChange={e => setScore2(e.target.value)}
                                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => handleRegisterMatch(block.id)}
                          disabled={matchLoading}
                          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-1.5 rounded-lg text-sm font-medium transition"
                        >
                          {matchLoading ? '登録中...' : '登録する'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}