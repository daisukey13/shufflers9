'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Player = { id: string; name: string; avatar_url: string | null }
type Qualifier = {
  block: { id: string; block_name: string }
  winner: { player_id: string; player: Player; is_default: boolean }
  hasDefault: boolean
}
type FinalsSet = { id: string; match_id: string; set_number: number; score1: number; score2: number }
type FinalsMatch = {
  id: string; tournament_id: string; round: number; match_number: number
  player1_id: string | null; player2_id: string | null; winner_id: string | null
  disadvantage_player_id: string | null; mode: string; scheduled_time: string | null
  player1: Player | null; player2: Player | null; winner: Player | null
  tournament_finals_sets: FinalsSet[]
}
type Tournament = { id: string; name: string; status: string }

const NEXT_STATUS: Record<string, { status: string; label: string; color: string }> = {
  open: { status: 'entry_closed', label: 'エントリー締切', color: 'bg-yellow-600 hover:bg-yellow-700' },
  entry_closed: { status: 'qualifying', label: '予選開始', color: 'bg-blue-600 hover:bg-blue-700' },
  qualifying: { status: 'qualifying_done', label: '予選完了', color: 'bg-purple-600 hover:bg-purple-700' },
  qualifying_done: { status: 'finals', label: '決勝トーナメント開始', color: 'bg-orange-600 hover:bg-orange-700' },
  finals: { status: 'finished', label: '大会終了', color: 'bg-red-600 hover:bg-red-700' },
}

export default function FinalsClient({
  tournament,
  qualifiers,
  finalsMatches,
  defaultPlayerId,
}: {
  tournament: Tournament
  qualifiers: Qualifier[]
  finalsMatches: FinalsMatch[]
  defaultPlayerId: string
}) {
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [round, setRound] = useState(1)
  const [player1Id, setPlayer1Id] = useState('')
  const [player2Id, setPlayer2Id] = useState('')
  const [disadvantageId, setDisadvantageId] = useState('')
  const [sets, setSets] = useState([
    { score1: '', score2: '' },
    { score1: '', score2: '' },
    { score1: '', score2: '' },
  ])
  const [mode, setMode] = useState<'normal' | 'walkover' | 'forfeit'>('normal')
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [autoGenLoading, setAutoGenLoading] = useState(false)
  const [editMatch, setEditMatch] = useState<FinalsMatch | null>(null)
  const [editSets, setEditSets] = useState([
    { score1: '', score2: '' },
    { score1: '', score2: '' },
    { score1: '', score2: '' },
  ])
  const [editLoading, setEditLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchTimes, setMatchTimes] = useState<Record<string, string>>(() =>
    Object.fromEntries(finalsMatches.map(m => [m.id, m.scheduled_time ?? '']))
  )

  const router = useRouter()
  const supabase = createClient()

  const isFinalsLocked = tournament.status === 'finished'

  const maxRound = finalsMatches.length > 0
    ? Math.max(...finalsMatches.map(m => m.round))
    : 0

  const roundNames = ['1回戦', '2回戦', '3回戦', '準決勝', '決勝']
  const getRoundName = (r: number) => roundNames[r - 1] ?? `第${r}回戦`

  const calcWinner = (matchSets: { score1: string; score2: string }[]) => {
    let p1wins = 0, p2wins = 0
    matchSets.forEach(s => {
      const s1 = parseInt(s.score1)
      const s2 = parseInt(s.score2)
      if (!isNaN(s1) && !isNaN(s2)) {
        if (s1 > s2) p1wins++
        else if (s2 > s1) p2wins++
      }
    })
    if (p1wins > p2wins) return player1Id
    if (p2wins > p1wins) return player2Id
    return null
  }

  const handleStatusChange = async () => {
    const next = NEXT_STATUS[tournament.status]
    if (!next) return
    if (!confirm(`ステータスを「${next.label}」に変更しますか？`)) return
    setStatusLoading(true)
    await supabase.from('tournaments').update({ status: next.status }).eq('id', tournament.id)
    if (next.status === 'finished') {
      await supabase.rpc('update_tournament_stats', { p_tournament_id: tournament.id })
    }
    setStatusLoading(false)
    router.refresh()
  }

  const handleEditMatchSave = async () => {
    if (!editMatch) return
    setEditLoading(true)

    const setsToInsert = editSets
      .map((s, i) => ({
        match_id: editMatch.id,
        set_number: i + 1,
        score1: parseInt(s.score1),
        score2: parseInt(s.score2),
      }))
      .filter(s => !isNaN(s.score1) && !isNaN(s.score2))

    let p1wins = 0, p2wins = 0
    setsToInsert.forEach(s => {
      if (s.score1 > s.score2) p1wins++
      else if (s.score2 > s.score1) p2wins++
    })
    const winnerId = p1wins > p2wins
      ? editMatch.player1_id
      : p2wins > p1wins
        ? editMatch.player2_id
        : null

    await supabase.from('tournament_finals_sets').delete().eq('match_id', editMatch.id)
    if (setsToInsert.length > 0) {
      await supabase.from('tournament_finals_sets').insert(setsToInsert)
    }
    await supabase.from('tournament_finals_matches').update({ winner_id: winnerId }).eq('id', editMatch.id)

    setEditMatch(null)
    setEditLoading(false)
    router.refresh()
  }

  // 試合削除
  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('この試合を削除しますか？\n※RPや勝敗は元に戻りません')) return
    await supabase.from('tournament_finals_sets').delete().eq('match_id', matchId)
    await supabase.from('tournament_finals_matches').delete().eq('id', matchId)
    router.refresh()
  }

  // 全試合削除
  const handleDeleteAllFinalMatches = async () => {
    if (!confirm('決勝トーナメントの試合を全て削除しますか？\n※RPや勝敗は元に戻りません')) return
    for (const m of finalsMatches) {
      await supabase.from('tournament_finals_sets').delete().eq('match_id', m.id)
    }
    await supabase.from('tournament_finals_matches').delete().eq('tournament_id', tournament.id)
    router.refresh()
  }

const timeOptions = (() => {
    const options: string[] = []
    for (let h = 8; h <= 20; h++) {
      for (let m = 0; m < 60; m += 5) {
        options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    return options
  })()

  const handleSetMatchTime = async (matchId: string, value: string) => {
    setMatchTimes(prev => ({ ...prev, [matchId]: value }))
    await supabase
      .from('tournament_finals_matches')
      .update({ scheduled_time: value || null })
      .eq('id', matchId)
  }
  
  const handleAutoGenerate = async () => {
    const validQualifiers = qualifiers.filter(q => q.winner && !q.winner.is_default)
    const count = validQualifiers.length

    if (count < 2) {
      alert('予選通過者が2名以上必要です')
      return
    }

    if (finalsMatches.length > 0) {
      if (!confirm('既存の試合を全て削除してから再生成しますか？')) return
      // 既存を全削除してから生成
      for (const m of finalsMatches) {
        await supabase.from('tournament_finals_sets').delete().eq('match_id', m.id)
      }
      await supabase.from('tournament_finals_matches').delete().eq('tournament_id', tournament.id)
    } else {
      if (!confirm(`${count}名で決勝トーナメントの組み合わせを自動生成しますか？`)) return
    }

    setAutoGenLoading(true)

    const sorted = [...validQualifiers].sort((a, b) =>
      a.block.block_name.localeCompare(b.block.block_name)
    )

    const pairs: [Qualifier, Qualifier | null][] = []
    for (let i = 0; i < sorted.length; i += 2) {
      if (i + 1 < sorted.length) {
        pairs.push([sorted[i], sorted[i + 1]])
      } else {
        pairs.push([sorted[i], null])
      }
    }

    // ラウンド名を選択させる
    const totalMatches = pairs.filter(([, q2]) => q2 !== null).length
    let roundName = '1回戦'
    if (totalMatches === 1) {
      const options = ['決勝', '準決勝', '1回戦', '2回戦', '3回戦']
      const selected = window.prompt(
        `この試合のラウンド名を選んでください：\n${options.map((o, i) => `${i + 1}: ${o}`).join('\n')}\n\n番号を入力してください`,
        '1'
      )
      const idx = parseInt(selected ?? '1') - 1
      roundName = options[idx] ?? '決勝'
    } else if (totalMatches === 2) {
      roundName = '準決勝'
    }

    const roundNumber = roundName === '決勝' ? 5
      : roundName === '準決勝' ? 4
      : roundName === '3回戦' ? 3
      : roundName === '2回戦' ? 2
      : 1

    let matchNumber = 1

    for (const [q1, q2] of pairs) {
      if (!q2) continue

      const p1id = q1.winner.player_id
      const p2id = q2.winner.player_id
      const hasDefault = p1id === defaultPlayerId || p2id === defaultPlayerId
      const winnerId = hasDefault
        ? (p1id === defaultPlayerId ? p2id : p1id)
        : null

      const disadvantagePlayerId = hasDefault
        ? (p1id === defaultPlayerId ? p2id : p1id)
        : null

      await supabase.from('tournament_finals_matches').insert({
        tournament_id: tournament.id,
        round: roundNumber,
        match_number: matchNumber++,
        player1_id: p1id,
        player2_id: p2id,
        winner_id: winnerId,
        mode: hasDefault ? 'walkover' : 'normal',
        disadvantage_player_id: disadvantagePlayerId,
      })
    }

    // 奇数の場合、最後の1人を次のラウンドにアドバンテージ付きで登録
    if (sorted.length % 2 !== 0) {
      const byePlayer = sorted[sorted.length - 1]
      await supabase.from('tournament_finals_matches').insert({
        tournament_id: tournament.id,
        round: roundNumber + 1,
        match_number: 1,
        player1_id: byePlayer.winner.player_id,
        player2_id: null,
        winner_id: null,
        mode: 'normal',
        disadvantage_player_id: byePlayer.winner.player_id,
      })
    }

    setAutoGenLoading(false)
    router.refresh()
  }

  const handleRegisterMatch = async () => {
    setLoading(true)
    setError(null)

    if (!player1Id || !player2Id) {
      setError('プレーヤーを選択してください')
      setLoading(false)
      return
    }

    const winnerId = mode === 'walkover'
      ? player1Id
      : player2Id === defaultPlayerId
        ? player1Id
        : player1Id === defaultPlayerId
          ? player2Id
          : calcWinner(sets)

    const matchNumber = finalsMatches.filter(m => m.round === round).length + 1

    const { data: match, error: matchErr } = await supabase
      .from('tournament_finals_matches')
      .insert({
        tournament_id: tournament.id,
        round,
        match_number: matchNumber,
        player1_id: player1Id,
        player2_id: player2Id,
        winner_id: winnerId,
        disadvantage_player_id: disadvantageId || null,
        mode,
      })
      .select()
      .single()

    if (matchErr || !match) {
      setError('登録に失敗しました: ' + matchErr?.message)
      setLoading(false)
      return
    }

    const setsToInsert = mode !== 'walkover'
      ? sets
          .map((s, i) => ({
            match_id: match.id,
            set_number: i + 1,
            score1: parseInt(s.score1),
            score2: parseInt(s.score2),
          }))
          .filter(s => !isNaN(s.score1) && !isNaN(s.score2))
      : []

    if (setsToInsert.length > 0) {
      await supabase.from('tournament_finals_sets').insert(setsToInsert)
    }

    const isDefaultMatch = player1Id === defaultPlayerId || player2Id === defaultPlayerId
    if (mode === 'normal' && winnerId && setsToInsert.length > 0 && !isDefaultMatch) {
      const totalScore1 = setsToInsert.reduce((sum, s) => sum + s.score1, 0)
      const totalScore2 = setsToInsert.reduce((sum, s) => sum + s.score2, 0)

      const { data: p1 } = await supabase
        .from('players')
        .select('rating, wins, losses, total_score, total_matches')
        .eq('id', player1Id)
        .single()
      const { data: p2 } = await supabase
        .from('players')
        .select('rating, wins, losses, total_score, total_matches')
        .eq('id', player2Id)
        .single()

      if (p1 && p2) {
        const { data: elo } = await supabase.rpc('calc_elo', {
          rating_a: p1.rating,
          rating_b: p2.rating,
          score_a: totalScore1,
          score_b: totalScore2,
          matches_a: p1.total_matches ?? 0,
          matches_b: p2.total_matches ?? 0,
        })

        if (elo?.[0]) {
          const eloResult = elo[0]
          const p1wins = winnerId === player1Id

          await supabase.from('players').update({
            rating: eloResult.new_rating_a,
            wins: p1wins ? p1.wins + 1 : p1.wins,
            losses: !p1wins ? p1.losses + 1 : p1.losses,
            total_score: (p1.total_score ?? 0) + totalScore1,
            total_matches: (p1.total_matches ?? 0) + 1,
          }).eq('id', player1Id)

          await supabase.from('players').update({
            rating: eloResult.new_rating_b,
            wins: !p1wins ? p2.wins + 1 : p2.wins,
            losses: p1wins ? p2.losses + 1 : p2.losses,
            total_score: (p2.total_score ?? 0) + totalScore2,
            total_matches: (p2.total_matches ?? 0) + 1,
          }).eq('id', player2Id)

          const { data: hc1 } = await supabase.rpc('calc_hc', {
            p_wins: p1wins ? p1.wins + 1 : p1.wins,
            p_losses: !p1wins ? p1.losses + 1 : p1.losses,
            p_total_score: (p1.total_score ?? 0) + totalScore1,
            p_total_matches: (p1.total_matches ?? 0) + 1,
          })
          if (hc1 !== null) await supabase.from('players').update({ hc: hc1 }).eq('id', player1Id)

          const { data: hc2 } = await supabase.rpc('calc_hc', {
            p_wins: !p1wins ? p2.wins + 1 : p2.wins,
            p_losses: p1wins ? p2.losses + 1 : p2.losses,
            p_total_score: (p2.total_score ?? 0) + totalScore2,
            p_total_matches: (p2.total_matches ?? 0) + 1,
          })
          if (hc2 !== null) await supabase.from('players').update({ hc: hc2 }).eq('id', player2Id)
        }
      }
    }

    setShowMatchForm(false)
    setPlayer1Id('')
    setPlayer2Id('')
    setDisadvantageId('')
    setSets([{ score1: '', score2: '' }, { score1: '', score2: '' }, { score1: '', score2: '' }])
    setMode('normal')
    setLoading(false)
    router.refresh()
  }

  const allPlayers = [
    ...qualifiers.map(q => q.winner?.player).filter(Boolean) as Player[],
    ...(defaultPlayerId ? [{ id: defaultPlayerId, name: 'DEFAULT（不戦勝）', avatar_url: null }] : []),
  ]
  const roundsInFinals = Array.from(new Set(finalsMatches.map(m => m.round))).sort()

  const champion = isFinalsLocked
    ? finalsMatches
        .filter(m => m.round === maxRound && m.winner)
        .sort((a, b) => b.match_number - a.match_number)[0]?.winner
    : null

  const finalMatch = finalsMatches
    .filter(m => m.round === maxRound)
    .sort((a, b) => b.match_number - a.match_number)[0]

  const runnerUp = isFinalsLocked && finalMatch
    ? (finalMatch.winner_id === finalMatch.player1_id ? finalMatch.player2 : finalMatch.player1)
    : null

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🏆 {tournament.name}</h1>
          <p className="text-sm text-gray-400 mt-1">決勝トーナメント管理</p>
        </div>
        <div className="flex items-center gap-3">
          {NEXT_STATUS[tournament.status] && (
            <button
              onClick={handleStatusChange}
              disabled={statusLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 ${NEXT_STATUS[tournament.status].color}`}
            >
              {statusLoading ? '処理中...' : `${NEXT_STATUS[tournament.status].label} →`}
            </button>
          )}
          <Link href={`/admin/tournaments/${tournament.id}/qualifying`} className="text-sm text-gray-400 hover:text-white transition">
            ← 予選管理
          </Link>
        </div>
      </div>

      {isFinalsLocked && (
        <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
          <p className="text-yellow-400 text-sm">✅ 大会終了済み。試合の編集のみ可能です。</p>
        </div>
      )}
{/* 準優勝者 */}
{runnerUp && (
  <div className="p-4 bg-gray-900/40 border border-gray-600/40 rounded-2xl text-center">
    <p className="text-gray-400 text-sm font-bold mb-2">🥈 準優勝</p>
    <div className="flex items-center justify-center gap-3">
      {runnerUp.avatar_url && (
        <img src={runnerUp.avatar_url} className="w-12 h-12 rounded-full border-2 border-gray-400 object-cover" />
      )}
      <p className="text-xl font-bold text-gray-200">{runnerUp.name}</p>
    </div>
  </div>
)}
      {/* 優勝者（終了後のみ） */}
      {champion && (
        <div className="p-6 bg-gradient-to-r from-yellow-900/40 to-yellow-700/20 border-2 border-yellow-400 rounded-2xl text-center">
          <p className="text-yellow-400 text-sm font-bold mb-2">👑 優勝者</p>
          <div className="flex items-center justify-center gap-3">
            {champion.avatar_url && (
              <img src={champion.avatar_url} className="w-16 h-16 rounded-full border-2 border-yellow-400 object-cover" />
            )}
            <p className="text-2xl font-bold text-yellow-100">{champion.name}</p>
          </div>
        </div>
      )}

      {/* 予選通過者 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-300 mb-3">予選通過者</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {qualifiers.map(q => (
            <div key={q.block.id} className="p-3 bg-purple-900/20 border border-purple-800/30 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">ブロック{q.block.block_name}</p>
              {q.winner ? (
                <div className="flex items-center gap-2">
                  {q.winner.player.avatar_url && (
                    <img src={q.winner.player.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{q.winner.player.name}</p>
                    {q.hasDefault && (
                      <span className="text-[10px] text-orange-400">※1勝アドバンテージ</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">未決定</p>
              )}
            </div>
          ))}
        </div>
      </div>


      {/* 決勝トーナメント試合一覧 */}
      {roundsInFinals.map(r => (
        <div key={r}>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">{getRoundName(r)}</h2>
          <div className="space-y-3">
            {finalsMatches.filter(m => m.round === r).map(match => (
              <div key={match.id} className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-right">
                    <p className={`font-semibold ${match.winner_id === match.player1_id ? 'text-white' : 'text-gray-400'}`}>
                      {match.player1?.name ?? '未定'}
                    </p>
                    {match.disadvantage_player_id === match.player1_id && (
                      <span className="text-xs text-orange-400">1勝アドバンテージ</span>
                    )}
                  </div>
                  <div className="text-center flex-shrink-0 space-y-1">
                    {match.tournament_finals_sets
                      .sort((a, b) => a.set_number - b.set_number)
                      .map(s => (
                        <p key={s.id} className="text-xs text-gray-300">
                          第{s.set_number}セット: {s.score1} - {s.score2}
                        </p>
                      ))}
                    {match.mode === 'walkover' && (
                      <span className="text-xs text-yellow-400">不戦勝</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${match.winner_id === match.player2_id ? 'text-white' : 'text-gray-400'}`}>
                      {match.player2?.name ?? '未定'}
                    </p>
                    {match.disadvantage_player_id === match.player2_id && (
                      <span className="text-xs text-orange-400">1勝アドバンテージ</span>
                    )}
                  </div>
                </div>
                {match.winner && (
                  <p className="text-xs text-green-400 text-center mt-2">🏆 {match.winner.name} の勝利</p>
                )}
                {/* 開始時間設定 */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-400 flex-shrink-0">⏰ 開始時間</span>
                  {!isFinalsLocked ? (
                    <select
                      value={matchTimes[match.id] ?? ''}
                      onChange={e => handleSetMatchTime(match.id, e.target.value)}
                      className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">未設定</option>
                      {timeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-blue-300">
                      {match.scheduled_time ?? '未設定'}
                    </span>
                  )}
                </div>
                {!isFinalsLocked && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => {
                        setEditMatch(match)
                        const currentSets = match.tournament_finals_sets
                          .sort((a, b) => a.set_number - b.set_number)
                        setEditSets([0, 1, 2].map(i => ({
                          score1: currentSets[i]?.score1?.toString() ?? '',
                          score2: currentSets[i]?.score2?.toString() ?? '',
                        })))
                      }}
                      className="text-xs px-2 py-0.5 bg-purple-700/50 hover:bg-purple-600/50 rounded text-purple-300 transition"
                    >
                      編集
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
{/* 組み合わせ自動生成・全削除 */}
      {!isFinalsLocked && (
        <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-300">🎲 組み合わせを自動生成</p>
            <p className="text-xs text-gray-400 mt-0.5">
              予選通過者をブロック順にペアリング（A vs B、C vs D...奇数の場合は最後の1人がアドバンテージ）
            </p>
          </div>
          <button
            onClick={handleAutoGenerate}
            disabled={autoGenLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition whitespace-nowrap"
          >
            {autoGenLoading ? '生成中...' : '自動生成'}
          </button>
        </div>
      )}

      {/* 全試合削除 */}
      {!isFinalsLocked && finalsMatches.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleDeleteAllFinalMatches}
            className="text-xs px-3 py-1.5 bg-red-900/30 hover:bg-red-800/50 rounded-lg text-red-400 transition"
          >
            🗑️ 全試合削除
          </button>
        </div>
      )}

      {/* 決勝トーナメント試合一覧 */}
      {roundsInFinals.map(r => (
        <div key={r}>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">{getRoundName(r)}</h2>
          <div className="space-y-3">
            {finalsMatches.filter(m => m.round === r).map(match => (
              <div key={match.id} className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-right">
                    <p className={`font-semibold ${match.winner_id === match.player1_id ? 'text-white' : 'text-gray-400'}`}>
                      {match.player1?.name ?? '未定'}
                    </p>
                    {match.disadvantage_player_id === match.player1_id && (
                      <span className="text-xs text-orange-400">1勝アドバンテージ</span>
                    )}
                  </div>
                  <div className="text-center flex-shrink-0 space-y-1">
                    {match.tournament_finals_sets
                      .sort((a, b) => a.set_number - b.set_number)
                      .map(s => (
                        <p key={s.id} className="text-xs text-gray-300">
                          第{s.set_number}セット: {s.score1} - {s.score2}
                        </p>
                      ))}
                    {match.mode === 'walkover' && (
                      <span className="text-xs text-yellow-400">不戦勝</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${match.winner_id === match.player2_id ? 'text-white' : 'text-gray-400'}`}>
                      {match.player2?.name ?? '未定'}
                    </p>
                    {match.disadvantage_player_id === match.player2_id && (
                      <span className="text-xs text-orange-400">1勝アドバンテージ</span>
                    )}
                  </div>
                </div>
                {match.winner && (
                  <p className="text-xs text-green-400 text-center mt-2">🏆 {match.winner.name} の勝利</p>
                )}
                {/* 開始時間設定 */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-400 flex-shrink-0">⏰ 開始時間</span>
                  {!isFinalsLocked ? (
                    <select
                      value={matchTimes[match.id] ?? ''}
                      onChange={e => handleSetMatchTime(match.id, e.target.value)}
                      className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">未設定</option>
                      {timeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-blue-300">
                      {match.scheduled_time ?? '未設定'}
                    </span>
                  )}
                </div>
                {!isFinalsLocked && (
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => handleDeleteMatch(match.id)}
                      className="text-xs px-2 py-0.5 bg-red-900/30 hover:bg-red-800/50 rounded text-red-400 transition"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => {
                        setEditMatch(match)
                        const currentSets = match.tournament_finals_sets
                          .sort((a, b) => a.set_number - b.set_number)
                        setEditSets([0, 1, 2].map(i => ({
                          score1: currentSets[i]?.score1?.toString() ?? '',
                          score2: currentSets[i]?.score2?.toString() ?? '',
                        })))
                      }}
                      className="text-xs px-2 py-0.5 bg-purple-700/50 hover:bg-purple-600/50 rounded text-purple-300 transition"
                    >
                      編集
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 試合登録（ロック中は非表示） */}
      {!isFinalsLocked && (
        <div>
          <button
            onClick={() => setShowMatchForm(!showMatchForm)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
          >
            {showMatchForm ? 'キャンセル' : '+ 決勝トーナメント試合を登録'}
          </button>

          {showMatchForm && (
            <div className="mt-4 p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl space-y-4">
              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div>
                <label className="block text-sm text-gray-300 mb-1">ラウンド</label>
                <select
                  value={round}
                  onChange={e => setRound(parseInt(e.target.value))}
                  className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {[1, 2, 3, 4, 5].map(r => (
                    <option key={r} value={r}>{getRoundName(r)}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 bg-black/20 rounded-lg p-1">
                {(['normal', 'walkover', 'forfeit'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${mode === m ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    {m === 'normal' ? '通常' : m === 'walkover' ? '不戦勝' : '途中棄権'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">プレーヤー1</label>
                  <select
                    value={player1Id}
                    onChange={e => setPlayer1Id(e.target.value)}
                    className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">選択</option>
                    {allPlayers.filter(p => p.id !== player2Id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">プレーヤー2</label>
                  <select
                    value={player2Id}
                    onChange={e => setPlayer2Id(e.target.value)}
                    className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">選択</option>
                    {allPlayers.filter(p => p.id !== player1Id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">1勝アドバンテージ</label>
                <select
                  value={disadvantageId}
                  onChange={e => setDisadvantageId(e.target.value)}
                  className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">なし</option>
                  {[player1Id, player2Id].filter(Boolean).filter(pid => pid !== defaultPlayerId).map(pid => {
                    const p = allPlayers.find(p => p.id === pid)
                    return p ? <option key={p.id} value={p.id}>{p.name}</option> : null
                  })}
                </select>
              </div>

              {mode !== 'walkover' && player1Id !== defaultPlayerId && player2Id !== defaultPlayerId && (
                <div className="space-y-2">
                  <label className="block text-xs text-gray-400">セットスコア（15点先取）</label>
                  {sets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-16">第{i + 1}セット</span>
                      <input
                        type="number" min="0" max="15" value={s.score1}
                        onChange={e => {
                          const updated = [...sets]
                          updated[i] = { ...updated[i], score1: e.target.value }
                          setSets(updated)
                        }}
                        className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number" min="0" max="15" value={s.score2}
                        onChange={e => {
                          const updated = [...sets]
                          updated[i] = { ...updated[i], score2: e.target.value }
                          setSets(updated)
                        }}
                        className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {(player1Id === defaultPlayerId || player2Id === defaultPlayerId) && (
                <div className="p-3 bg-orange-900/20 border border-orange-700/30 rounded-lg">
                  <p className="text-xs text-orange-400">
                    ⚠️ DEFAULTとの対戦は自動的に不戦勝として処理されます
                  </p>
                </div>
              )}

              <button
                onClick={handleRegisterMatch}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {loading ? '登録中...' : '試合結果を登録'}
              </button>
            </div>
          )}
        </div>
      )}
      

      {/* 試合編集モーダル */}
      {editMatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1e0f3a] border border-purple-800/50 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">試合を編集</h2>
            <div className="flex items-center justify-between text-sm text-gray-300">
              <span className="font-medium">{editMatch.player1?.name ?? '未定'}</span>
              <span className="text-gray-500">vs</span>
              <span className="font-medium">{editMatch.player2?.name ?? '未定'}</span>
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-gray-400">セットスコア</label>
              {editSets.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16">第{i + 1}セット</span>
                  <input
                    type="number" min="0" max="15" value={s.score1}
                    onChange={e => {
                      const updated = [...editSets]
                      updated[i] = { ...updated[i], score1: e.target.value }
                      setEditSets(updated)
                    }}
                    className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number" min="0" max="15" value={s.score2}
                    onChange={e => {
                      const updated = [...editSets]
                      updated[i] = { ...updated[i], score2: e.target.value }
                      setEditSets(updated)
                    }}
                    className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleEditMatchSave}
                disabled={editLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
              >
                {editLoading ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => setEditMatch(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}