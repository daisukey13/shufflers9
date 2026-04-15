'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type SinglesMatch = {
  id: string
  score1: number
  score2: number
  winner_id: string | null
  played_at: string
  rating_change1: number
  rating_change2: number
  status: string
  player1_id: string
  player2_id: string
  player1: { id: string; name: string } | null
  player2: { id: string; name: string } | null
}

type TeamsMatch = {
  id: string
  score1: number
  score2: number
  winner_id: string | null
  played_at: string
  team1_id: string
  team2_id: string
  team1: { id: string; name: string } | null
  team2: { id: string; name: string } | null
}

type DoublesMatch = {
  id: string
  score1: number
  score2: number
  winner_pair: number | null
  played_at: string
  rating_change1: number
  rating_change2: number
  pair1_player1_id: string
  pair1_player2_id: string
  pair2_player1_id: string
  pair2_player2_id: string
  pair1_player1: { id: string; name: string } | null
  pair1_player2: { id: string; name: string } | null
  pair2_player1: { id: string; name: string } | null
  pair2_player2: { id: string; name: string } | null
}

type EditTarget =
  | { type: 'singles'; match: SinglesMatch }
  | { type: 'doubles'; match: DoublesMatch }
  | { type: 'teams'; match: TeamsMatch }
  | null

type RpEntry = { name: string; oldChange: number; newChange: number }
type RpInfo = { entries: RpEntry[]; winnerChanged: boolean }

export default function AdminMatchesClient({
  singles,
  teams,
  doubles,
}: {
  singles: SinglesMatch[]
  teams: TeamsMatch[]
  doubles: DoublesMatch[]
}) {
  const [tab, setTab] = useState<'singles' | 'doubles' | 'teams'>('singles')
  const [dateFilter, setDateFilter] = useState('')
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rpInfo, setRpInfo] = useState<RpInfo | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const filterByDate = <T extends { played_at: string }>(matches: T[]) => {
    if (!dateFilter) return matches
    return matches.filter(m => m.played_at.startsWith(dateFilter))
  }

  const openEdit = (target: EditTarget) => {
    if (!target) return
    setEditTarget(target)
    setScore1(target.match.score1.toString())
    setScore2(target.match.score2.toString())
    setError(null)
    setRpInfo(null)
  }

  const closeModal = () => {
    setEditTarget(null)
    setRpInfo(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!editTarget) return
    setLoading(true)
    setError(null)

    const s1 = parseInt(score1)
    const s2 = parseInt(score2)

    if (isNaN(s1) || isNaN(s2)) {
      setError('スコアを正しく入力してください')
      setLoading(false)
      return
    }

    if (editTarget.type === 'singles') {
      const m = editTarget.match
      const newWinnerId = s1 > s2 ? m.player1_id : s1 < s2 ? m.player2_id : null
      const winnerChanged = newWinnerId !== m.winner_id

      // スコア・勝者をDBに保存
      const { error: dbErr } = await supabase
        .from('singles_matches')
        .update({ score1: s1, score2: s2, winner_id: newWinnerId })
        .eq('id', m.id)
      if (dbErr) { setError('更新に失敗しました'); setLoading(false); return }

      // 途中棄権・不戦勝はELO再計算しない
      if (m.status === 'retirement' || m.status === 'walkover') {
        setRpInfo({ entries: [], winnerChanged })
        setLoading(false)
        router.refresh()
        return
      }

      // 現在のプレーヤー統計を取得
      const [{ data: cp1 }, { data: cp2 }] = await Promise.all([
        supabase.from('players').select('rating, wins, losses, total_score, total_matches').eq('id', m.player1_id).single(),
        supabase.from('players').select('rating, wins, losses, total_score, total_matches').eq('id', m.player2_id).single(),
      ])

      if (cp1 && cp2) {
        // 旧スコア・勝敗の寄与を計算
        const oldWin1  = m.winner_id === m.player1_id ? 1 : 0
        const oldLoss1 = m.winner_id !== null && m.winner_id !== m.player1_id ? 1 : 0
        const oldWin2  = m.winner_id === m.player2_id ? 1 : 0
        const oldLoss2 = m.winner_id !== null && m.winner_id !== m.player2_id ? 1 : 0

        // 新スコア・勝敗の寄与を計算
        const newWin1  = newWinnerId === m.player1_id ? 1 : 0
        const newLoss1 = newWinnerId !== null && newWinnerId !== m.player1_id ? 1 : 0
        const newWin2  = newWinnerId === m.player2_id ? 1 : 0
        const newLoss2 = newWinnerId !== null && newWinnerId !== m.player2_id ? 1 : 0

        // 差分を現在の統計に適用
        const newWins1       = (cp1.wins ?? 0)        + (newWin1  - oldWin1)
        const newLosses1     = (cp1.losses ?? 0)      + (newLoss1 - oldLoss1)
        const newTotalScore1 = (cp1.total_score ?? 0) + (s1 - m.score1)
        const newWins2       = (cp2.wins ?? 0)        + (newWin2  - oldWin2)
        const newLosses2     = (cp2.losses ?? 0)      + (newLoss2 - oldLoss2)
        const newTotalScore2 = (cp2.total_score ?? 0) + (s2 - m.score2)

        // プレーヤー統計を更新
        await Promise.all([
          supabase.from('players').update({
            wins: newWins1,
            losses: newLosses1,
            total_score: newTotalScore1,
          }).eq('id', m.player1_id),
          supabase.from('players').update({
            wins: newWins2,
            losses: newLosses2,
            total_score: newTotalScore2,
          }).eq('id', m.player2_id),
        ])

        // HCを再計算・自動更新
        const [{ data: hc1 }, { data: hc2 }] = await Promise.all([
          supabase.rpc('calc_hc', {
            p_wins: newWins1,
            p_losses: newLosses1,
            p_total_score: newTotalScore1,
            p_total_matches: cp1.total_matches ?? 0,
          }),
          supabase.rpc('calc_hc', {
            p_wins: newWins2,
            p_losses: newLosses2,
            p_total_score: newTotalScore2,
            p_total_matches: cp2.total_matches ?? 0,
          }),
        ])
        await Promise.all([
          hc1 !== null ? supabase.from('players').update({ hc: hc1 }).eq('id', m.player1_id) : Promise.resolve(),
          hc2 !== null ? supabase.from('players').update({ hc: hc2 }).eq('id', m.player2_id) : Promise.resolve(),
        ])

        // ELO再計算・rating_change更新
        const { data: elo } = await supabase.rpc('calc_elo', {
          rating_a: cp1.rating,
          rating_b: cp2.rating,
          score_a: s1,
          score_b: s2,
          matches_a: 0,
          matches_b: 0,
        })

        if (elo?.[0]) {
          const newChange1 = elo[0].change_a
          const newChange2 = elo[0].change_b
          await supabase
            .from('singles_matches')
            .update({ rating_change1: newChange1, rating_change2: newChange2 })
            .eq('id', m.id)

          setRpInfo({
            entries: [
              { name: m.player1?.name ?? 'プレーヤー1', oldChange: m.rating_change1, newChange: newChange1 },
              { name: m.player2?.name ?? 'プレーヤー2', oldChange: m.rating_change2, newChange: newChange2 },
            ],
            winnerChanged,
          })
        }
      }

    } else if (editTarget.type === 'doubles') {
      const m = editTarget.match
      const newWinnerPair = s1 > s2 ? 1 : s1 < s2 ? 2 : null
      const winnerChanged = newWinnerPair !== m.winner_pair

      // スコア・勝者をDBに保存
      const { error: dbErr } = await supabase
        .from('doubles_matches')
        .update({ score1: s1, score2: s2, winner_pair: newWinnerPair })
        .eq('id', m.id)
      if (dbErr) { setError('更新に失敗しました'); setLoading(false); return }

      // 4人のdoubles統計を取得
      const ids = [m.pair1_player1_id, m.pair1_player2_id, m.pair2_player1_id, m.pair2_player2_id]
      const [{ data: dp1 }, { data: dp2 }, { data: dp3 }, { data: dp4 }] = await Promise.all(
        ids.map(id => supabase.from('players').select('doubles_rating, doubles_wins, doubles_losses').eq('id', id).single())
      )

      if (dp1 && dp2 && dp3 && dp4) {
        const oldWinPair = m.winner_pair

        // doubles_wins/losses の差分を適用してプレーヤー統計を更新
        const pair1WinDiff  = (newWinnerPair === 1 ? 1 : 0) - (oldWinPair === 1 ? 1 : 0)
        const pair1LossDiff = (newWinnerPair === 2 ? 1 : 0) - (oldWinPair === 2 ? 1 : 0)
        const pair2WinDiff  = (newWinnerPair === 2 ? 1 : 0) - (oldWinPair === 2 ? 1 : 0)
        const pair2LossDiff = (newWinnerPair === 1 ? 1 : 0) - (oldWinPair === 1 ? 1 : 0)

        await Promise.all([
          supabase.from('players').update({
            doubles_wins:   (dp1.doubles_wins ?? 0)   + pair1WinDiff,
            doubles_losses: (dp1.doubles_losses ?? 0) + pair1LossDiff,
          }).eq('id', m.pair1_player1_id),
          supabase.from('players').update({
            doubles_wins:   (dp2.doubles_wins ?? 0)   + pair1WinDiff,
            doubles_losses: (dp2.doubles_losses ?? 0) + pair1LossDiff,
          }).eq('id', m.pair1_player2_id),
          supabase.from('players').update({
            doubles_wins:   (dp3.doubles_wins ?? 0)   + pair2WinDiff,
            doubles_losses: (dp3.doubles_losses ?? 0) + pair2LossDiff,
          }).eq('id', m.pair2_player1_id),
          supabase.from('players').update({
            doubles_wins:   (dp4.doubles_wins ?? 0)   + pair2WinDiff,
            doubles_losses: (dp4.doubles_losses ?? 0) + pair2LossDiff,
          }).eq('id', m.pair2_player2_id),
        ])

        // ELO再計算・rating_change更新
        const pair1Avg = Math.round(((dp1.doubles_rating ?? 1000) + (dp2.doubles_rating ?? 1000)) / 2)
        const pair2Avg = Math.round(((dp3.doubles_rating ?? 1000) + (dp4.doubles_rating ?? 1000)) / 2)

        const { data: elo } = await supabase.rpc('calc_elo', {
          rating_a: pair1Avg,
          rating_b: pair2Avg,
          score_a: s1,
          score_b: s2,
          matches_a: 0,
          matches_b: 0,
        })

        if (elo?.[0]) {
          const newChange1 = elo[0].change_a
          const newChange2 = elo[0].change_b
          await supabase
            .from('doubles_matches')
            .update({ rating_change1: newChange1, rating_change2: newChange2 })
            .eq('id', m.id)

          const pair1Name = `${m.pair1_player1?.name ?? '?'} / ${m.pair1_player2?.name ?? '?'}`
          const pair2Name = `${m.pair2_player1?.name ?? '?'} / ${m.pair2_player2?.name ?? '?'}`
          setRpInfo({
            entries: [
              { name: `ペア1（${pair1Name}）`, oldChange: m.rating_change1, newChange: newChange1 },
              { name: `ペア2（${pair2Name}）`, oldChange: m.rating_change2, newChange: newChange2 },
            ],
            winnerChanged,
          })
        }
      }

    } else if (editTarget.type === 'teams') {
      const m = editTarget.match
      const winnerId = s1 > s2 ? m.team1_id : s1 < s2 ? m.team2_id : null
      const { error: dbErr } = await supabase
        .from('teams_matches')
        .update({ score1: s1, score2: s2, winner_id: winnerId })
        .eq('id', m.id)
      if (dbErr) { setError('更新に失敗しました'); setLoading(false); return }
      closeModal()
    }

    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (type: 'singles' | 'teams' | 'doubles', id: string) => {
    if (!confirm('この試合を削除しますか？')) return
    const table = type === 'singles' ? 'singles_matches' : type === 'teams' ? 'teams_matches' : 'doubles_matches'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { alert('削除に失敗しました'); return }
    router.refresh()
  }

  const filteredSingles = filterByDate(singles)
  const filteredDoubles = filterByDate(doubles)
  const filteredTeams = filterByDate(teams)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📋 試合管理</h1>

      {/* タブ */}
      <div className="flex gap-2 bg-black/20 rounded-lg p-1">
        <button
          onClick={() => setTab('singles')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${tab === 'singles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <img src="/shuffleboard-puck-blue.png" className="w-4 h-4 object-contain" />
          シングルス
        </button>
        <button
          onClick={() => setTab('doubles')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${tab === 'doubles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <img src="/shuffleboard-puck-red.png" className="w-4 h-4 object-contain" />
          ダブルス
        </button>
        <div className="flex-1 py-2 rounded-md text-sm font-medium text-gray-600 opacity-40 cursor-not-allowed flex items-center justify-center">
          チーム戦（準備中）
        </div>
      </div>

      {/* 日付フィルター */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">日付で絞り込み：</label>
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-xs text-gray-400 hover:text-white transition"
          >
            クリア
          </button>
        )}
        <span className="text-xs text-gray-500">
          {tab === 'singles' ? filteredSingles.length : tab === 'doubles' ? filteredDoubles.length : filteredTeams.length}件
        </span>
      </div>

      {/* シングルス一覧 */}
      {tab === 'singles' && (
        <div className="space-y-2">
          {filteredSingles.length === 0 ? (
            <p className="text-gray-400 text-sm">試合がありません</p>
          ) : (
            filteredSingles.map(m => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className={`font-medium ${m.winner_id === m.player1_id ? 'text-white' : 'text-gray-400'}`}>
                      {m.player1?.name ?? '不明'}
                    </span>
                    <span className="font-bold text-white">{m.score1} - {m.score2}</span>
                    <span className={`font-medium ${m.winner_id === m.player2_id ? 'text-white' : 'text-gray-400'}`}>
                      {m.player2?.name ?? '不明'}
                    </span>
                    {(m.status === 'retirement' || m.status === 'walkover') && (
                      <span className="text-xs text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded">
                        {m.status === 'retirement' ? '途中棄権' : '不戦勝'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(m.played_at).toLocaleDateString('ja-JP')}
                    <span className="ml-2 text-gray-600">変化: {m.rating_change1 >= 0 ? '+' : ''}{m.rating_change1} / {m.rating_change2 >= 0 ? '+' : ''}{m.rating_change2}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit({ type: 'singles', match: m })}
                    className="text-xs px-3 py-1 bg-purple-700/50 hover:bg-purple-600/50 rounded-lg text-purple-300 transition"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete('singles', m.id)}
                    className="text-xs px-3 py-1 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-red-400 transition"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ダブルス一覧 */}
      {tab === 'doubles' && (
        <div className="space-y-2">
          {filteredDoubles.length === 0 ? (
            <p className="text-gray-400 text-sm">試合がありません</p>
          ) : (
            filteredDoubles.map(m => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className={`font-medium ${m.winner_pair === 1 ? 'text-white' : 'text-gray-400'}`}>
                      {m.pair1_player1?.name ?? '不明'} / {m.pair1_player2?.name ?? '不明'}
                    </span>
                    <span className="font-bold text-white">{m.score1} - {m.score2}</span>
                    <span className={`font-medium ${m.winner_pair === 2 ? 'text-white' : 'text-gray-400'}`}>
                      {m.pair2_player1?.name ?? '不明'} / {m.pair2_player2?.name ?? '不明'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(m.played_at).toLocaleDateString('ja-JP')}
                    <span className="ml-2 text-gray-600">変化: {m.rating_change1 >= 0 ? '+' : ''}{m.rating_change1} / {m.rating_change2 >= 0 ? '+' : ''}{m.rating_change2}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit({ type: 'doubles', match: m })}
                    className="text-xs px-3 py-1 bg-purple-700/50 hover:bg-purple-600/50 rounded-lg text-purple-300 transition"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete('doubles', m.id)}
                    className="text-xs px-3 py-1 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-red-400 transition"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 編集モーダル */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1e0f3a] border border-purple-800/50 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">

            {/* ── 保存後：RP修正ガイド ── */}
            {rpInfo ? (
              <>
                <h2 className="text-lg font-bold">✅ スコアを更新しました</h2>

                {rpInfo.entries.length > 0 && (
                  <>
                    <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
                      <p className="text-xs text-yellow-300">
                        ⚠️ 以下は<strong>現在のRP</strong>で再計算した推定値です。登録後に別の試合がある場合は誤差が生じます。
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-300 mb-2">📊 RP変化量の比較</h3>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-purple-800/30">
                            <th className="text-left py-1.5">プレーヤー</th>
                            <th className="text-center py-1.5 text-red-400">旧変化量</th>
                            <th className="text-center py-1.5 text-green-400">新変化量</th>
                            <th className="text-center py-1.5 text-yellow-400">差分</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rpInfo.entries.map((e, i) => {
                            const diff = e.newChange - e.oldChange
                            return (
                              <tr key={i} className="border-b border-purple-800/20">
                                <td className="py-2 pr-2 text-white">{e.name}</td>
                                <td className={`text-center py-2 ${e.oldChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {e.oldChange >= 0 ? '+' : ''}{e.oldChange}
                                </td>
                                <td className={`text-center py-2 ${e.newChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {e.newChange >= 0 ? '+' : ''}{e.newChange}
                                </td>
                                <td className={`text-center py-2 font-bold ${diff === 0 ? 'text-gray-500' : diff > 0 ? 'text-yellow-400' : 'text-orange-400'}`}>
                                  {diff === 0 ? '±0' : diff > 0 ? `+${diff}` : diff}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-xl">
                      <p className="text-xs text-green-300">✅ HC・勝敗統計は自動的に修正されました</p>
                    </div>

                    {(rpInfo.entries.some(e => e.newChange - e.oldChange !== 0) || rpInfo.winnerChanged) && (
                      <div className="p-4 bg-gray-900/40 border border-gray-700/40 rounded-xl space-y-2">
                        <h3 className="text-xs font-semibold text-gray-300">🔧 RPのみ手動修正が必要です（Supabase）</h3>
                        <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                          <li>Supabaseの <code className="text-purple-300">players</code> テーブルを開く</li>
                          {rpInfo.entries.map((e, i) => {
                            const diff = e.newChange - e.oldChange
                            if (diff === 0) return null
                            return (
                              <li key={i}>
                                <span className="text-white">{e.name}</span> の <code className="text-purple-300">rating</code> に{' '}
                                <span className={`font-bold ${diff > 0 ? 'text-yellow-400' : 'text-orange-400'}`}>
                                  {diff > 0 ? `+${diff}` : diff} を加算
                                </span>
                              </li>
                            )
                          })}
                        </ol>
                      </div>
                    )}
                  </>
                )}

                {rpInfo.entries.length === 0 && (
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>途中棄権・不戦勝のためELO再計算はスキップしました。RPの変動はありません。</p>
                    {rpInfo.winnerChanged && (
                      <p className="text-yellow-300">⚠️ 勝者が変わりました。Supabaseの <code className="text-purple-300">players</code> テーブルで wins / losses を手動修正してください。</p>
                    )}
                  </div>
                )}

                <button
                  onClick={closeModal}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                >
                  閉じる
                </button>
              </>
            ) : (
              /* ── 編集フォーム ── */
              <>
                <h2 className="text-lg font-bold">スコアを編集</h2>

                {error && (
                  <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
                )}

                {editTarget.type === 'doubles' && (
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>ペア1: {editTarget.match.pair1_player1?.name} / {editTarget.match.pair1_player2?.name}</p>
                    <p>ペア2: {editTarget.match.pair2_player1?.name} / {editTarget.match.pair2_player2?.name}</p>
                  </div>
                )}

                {editTarget.type === 'singles' && (editTarget.match.status === 'retirement' || editTarget.match.status === 'walkover') && (
                  <p className="text-xs text-yellow-400 bg-yellow-900/20 px-3 py-2 rounded-lg">
                    {editTarget.match.status === 'retirement' ? '途中棄権' : '不戦勝'}の試合です。ELO再計算は行いません。
                  </p>
                )}

                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">
                      {editTarget.type === 'singles'
                        ? editTarget.match.player1?.name
                        : editTarget.type === 'teams'
                          ? editTarget.match.team1?.name
                          : 'ペア1'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={score1}
                      onChange={e => setScore1(e.target.value)}
                      className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <span className="text-gray-400 mt-4">-</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">
                      {editTarget.type === 'singles'
                        ? editTarget.match.player2?.name
                        : editTarget.type === 'teams'
                          ? editTarget.match.team2?.name
                          : 'ペア2'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={score2}
                      onChange={e => setScore2(e.target.value)}
                      className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {(editTarget.type === 'singles' || editTarget.type === 'doubles') && (
                  <p className="text-xs text-gray-500">
                    保存するとHC・勝敗統計を自動修正します。RPのみ保存後のガイドに従って手動修正してください。
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
                  >
                    {loading ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
                  >
                    キャンセル
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
