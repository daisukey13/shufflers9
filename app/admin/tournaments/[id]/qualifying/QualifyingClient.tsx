'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Player = { id: string; name: string; avatar_url: string | null; hc: number; rating: number }
type BlockPlayer = { id: string; block_id: string; player_id: string; is_default: boolean; player: Player }
type Block = { id: string; tournament_id: string; block_name: string; match_time_1: string | null; match_time_2: string | null; match_time_3: string | null; scores_finalized: boolean; tournament_block_players: BlockPlayer[] }
type Match = {
  id: string; block_id: string; player1_id: string; player2_id: string
  score1: number | null; score2: number | null; winner_id: string | null
  mode: string; affects_ranking: boolean; scheduled_time: string | null
  player1: { id: string; name: string; avatar_url: string | null }
  player2: { id: string; name: string; avatar_url: string | null }
  player1_rating_change: number | null; player2_rating_change: number | null
  player1_rating_before: number | null; player2_rating_before: number | null
  player1_wins_before: number | null; player2_wins_before: number | null
  player1_losses_before: number | null; player2_losses_before: number | null
}
type Tournament = { id: string; name: string; status: string; format: string; bonus_points: number }

const timeOptions = (() => {
  const options: string[] = []
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 5) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return options
})()

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
  enteredPlayers: Player[]
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

  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [editScore1, setEditScore1] = useState('')
  const [editScore2, setEditScore2] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [rpPreview, setRpPreview] = useState<{
    s1: number; s2: number; newWinnerId: string | null
    newChangeA: number; newChangeB: number
    p1Delta: number; p2Delta: number
    p1WinsDelta: number; p1LossesDelta: number
    p2WinsDelta: number; p2LossesDelta: number
  } | null>(null)

  const [matchTimes, setMatchTimes] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(blocks.map(b => [b.id, [b.match_time_1 ?? '', b.match_time_2 ?? '', b.match_time_3 ?? '']]))
  )

  const [statusLoading, setStatusLoading] = useState(false)
  const [autoMatchLoading, setAutoMatchLoading] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const blockNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const isQualifyingLocked = ['qualifying_done', 'finals', 'finished'].includes(tournament.status)

  const getBlockTimes = (blockId: string) =>
    matchTimes[blockId] ?? ['', '', '']

  const setBlockTime = async (blockId: string, index: number, value: string) => {
    const current = getBlockTimes(blockId)
    const updated = [...current]
    updated[index] = value
    setMatchTimes(prev => ({ ...prev, [blockId]: updated }))
    const colName = `match_time_${index + 1}`
    await supabase
      .from('tournament_blocks')
      .update({ [colName]: value || null })
      .eq('id', blockId)
  }

  // 予選完了
  const handleCompleteQualifying = async () => {
    if (!confirm('予選を完了し、本戦管理へ進みますか？')) return
    setStatusLoading(true)
    await supabase
      .from('tournaments')
      .update({ status: 'qualifying_done' })
      .eq('id', tournament.id)
    setStatusLoading(false)
    router.push(`/admin/tournaments/${tournament.id}/finals`)
  }

  // ブロック試合自動作成
  const handleAutoCreateMatches = async (block: Block) => {
    if (!confirm(`ブロック${block.block_name}の試合を自動作成しますか？`)) return
    setAutoMatchLoading(block.id)

    const bp = block.tournament_block_players
    if (bp.length < 2) {
      alert(`ブロック${block.block_name}にプレーヤーが${bp.length}名しか登録されていません。\n先にブロックを削除して再作成してください。`)
      setAutoMatchLoading(null)
      return
    }

    // 全有効ペアを動的生成（同一player_idの組み合わせを除外）
    const pairs: [BlockPlayer, BlockPlayer][] = []
    for (let i = 0; i < bp.length; i++) {
      for (let j = i + 1; j < bp.length; j++) {
        if (bp[i].player_id !== bp[j].player_id) {
          pairs.push([bp[i], bp[j]])
        }
      }
    }

    if (pairs.length === 0) {
      alert(`ブロック${block.block_name}に有効なペアが見つかりません。`)
      setAutoMatchLoading(null)
      return
    }

    const times = getBlockTimes(block.id)
    let timeIdx = 0

    for (const [p1, p2] of pairs) {
      const hasDefault = p1.is_default || p2.is_default

      const alreadyExists = matches.some(m =>
        m.block_id === block.id &&
        ((m.player1_id === p1.player_id && m.player2_id === p2.player_id) ||
         (m.player1_id === p2.player_id && m.player2_id === p1.player_id))
      )
      if (alreadyExists) { timeIdx++; continue }

      const scheduledTime = hasDefault ? null : (times[timeIdx] || null)

      await supabase.from('tournament_qualifying_matches').insert({
        block_id: block.id,
        player1_id: p1.player_id,
        player2_id: p2.player_id,
        score1: null,
        score2: null,
        winner_id: null,
        mode: 'normal',
        affects_ranking: true,
        scheduled_time: scheduledTime,
      })
      timeIdx++
    }

    setAutoMatchLoading(null)
    router.refresh()
  }

  // スコア登録完了
  const handleFinalizeScores = async (block: Block) => {
    if (!confirm(`ブロック${block.block_name}のスコア登録を完了し、順位を公開しますか？`)) return
    await supabase
      .from('tournament_blocks')
      .update({ scores_finalized: true })
      .eq('id', block.id)
    router.refresh()
  }

  // ブロック内のRP登録済み試合をロールバックするヘルパー
  const rollbackBlockMatches = async (blockId: string) => {
    const { data: blockMatches } = await supabase
      .from('tournament_qualifying_matches')
      .select('*')
      .eq('block_id', blockId)
      .eq('affects_ranking', true)
      .not('winner_id', 'is', null)
      .not('player1_rating_change', 'is', null)

    if (!blockMatches || blockMatches.length === 0) return

    const isDoubles = tournament.format === 'doubles'
    // プレーヤーごとにRP差分を集計
    const playerDeltas = new Map<string, { ratingDelta: number; winsDelta: number; lossesDelta: number }>()
    for (const m of blockMatches) {
      const p1Won = m.winner_id === m.player1_id
      const get = (id: string) => playerDeltas.get(id) ?? { ratingDelta: 0, winsDelta: 0, lossesDelta: 0 }
      const d1 = get(m.player1_id)
      playerDeltas.set(m.player1_id, {
        ratingDelta: d1.ratingDelta - m.player1_rating_change,
        winsDelta: d1.winsDelta - (p1Won ? 1 : 0),
        lossesDelta: d1.lossesDelta - (p1Won ? 0 : 1),
      })
      const d2 = get(m.player2_id)
      playerDeltas.set(m.player2_id, {
        ratingDelta: d2.ratingDelta - m.player2_rating_change,
        winsDelta: d2.winsDelta - (p1Won ? 0 : 1),
        lossesDelta: d2.lossesDelta - (p1Won ? 1 : 0),
      })
    }

    // プレーヤー一括更新
    for (const [playerId, delta] of playerDeltas.entries()) {
      const { data: p } = await supabase.from('players')
        .select('rating, doubles_rating, wins, losses, doubles_wins, doubles_losses')
        .eq('id', playerId).single()
      if (!p) continue
      if (isDoubles) {
        await supabase.from('players').update({
          doubles_rating: (p.doubles_rating ?? 1000) + delta.ratingDelta,
          doubles_wins: (p.doubles_wins ?? 0) + delta.winsDelta,
          doubles_losses: (p.doubles_losses ?? 0) + delta.lossesDelta,
        }).eq('id', playerId)
      } else {
        await supabase.from('players').update({
          rating: p.rating + delta.ratingDelta,
          wins: (p.wins ?? 0) + delta.winsDelta,
          losses: (p.losses ?? 0) + delta.lossesDelta,
        }).eq('id', playerId)
      }
    }
  }

  // ブロック全試合削除
  const handleDeleteAllMatches = async (blockId: string, blockName: string) => {
    if (!confirm(`ブロック${blockName}の試合を全て削除しますか？\nRP・勝敗も自動的に元に戻します。`)) return
    await rollbackBlockMatches(blockId)
    await supabase.from('tournament_qualifying_matches').delete().eq('block_id', blockId)
    router.refresh()
  }

  // ブロック削除
  const handleDeleteBlock = async (blockId: string, blockName: string) => {
    if (!confirm(`ブロック${blockName}を削除しますか？\n試合データも全て削除され、RP・勝敗も元に戻します。`)) return
    await rollbackBlockMatches(blockId)
    await supabase.from('tournament_qualifying_matches').delete().eq('block_id', blockId)
    await supabase.from('tournament_block_players').delete().eq('block_id', blockId)
    await supabase.from('tournament_blocks').delete().eq('id', blockId)
    router.refresh()
  }

  // ランダムブロック自動生成
  const handleAutoGenerate = async () => {
    if (enteredPlayers.length === 0) {
      setAutoError('エントリー済みのプレーヤーがいません')
      return
    }
    if (!confirm(`${enteredPlayers.length}名をランダムにブロック分けします。よろしいですか？`)) return

    setAutoLoading(true)
    setAutoError(null)

    const shuffled = [...enteredPlayers].sort(() => Math.random() - 0.5)
    const blockGroups: Player[][] = []
    for (let i = 0; i < shuffled.length; i += 3) {
      blockGroups.push(shuffled.slice(i, i + 3))
    }

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
      // DEFAULTは最大1人まで補充（同一player_idの重複INSERT=UNIQUE制約違反を防ぐ）
      if (blockPlayers.length < 3) {
        blockPlayers.push({ id: defaultPlayerId } as Player)
      }

      const { error: bpErr } = await supabase.from('tournament_block_players').insert(
        blockPlayers.map(p => ({
          block_id: block.id,
          player_id: p.id,
          is_default: p.id === defaultPlayerId,
        }))
      )
      if (bpErr) {
        console.error(`ブロック${blockName} プレーヤー登録エラー:`, bpErr.message)
      }
    }

    setAutoLoading(false)
    router.refresh()
  }

  // 個別試合削除（RP自動ロールバック）
  const handleDeleteMatch = async (match: Match) => {
    const hasRp = match.affects_ranking && match.winner_id != null && match.player1_rating_change != null
    const msg = hasRp
      ? `この試合を削除します。\nRPと勝敗を自動的に元に戻します。\n\n${match.player1.name}: ${match.player1_rating_change! >= 0 ? '+' : ''}${match.player1_rating_change}pt → 取消\n${match.player2.name}: ${match.player2_rating_change! >= 0 ? '+' : ''}${match.player2_rating_change}pt → 取消\n\nよろしいですか？`
      : `この試合を削除しますか？`
    if (!confirm(msg)) return

    const isDoubles = tournament.format === 'doubles'

    if (hasRp) {
      const { data: p1 } = await supabase.from('players')
        .select('rating, doubles_rating, wins, losses, doubles_wins, doubles_losses')
        .eq('id', match.player1_id).single()
      const { data: p2 } = await supabase.from('players')
        .select('rating, doubles_rating, wins, losses, doubles_wins, doubles_losses')
        .eq('id', match.player2_id).single()

      if (p1 && p2) {
        const p1Won = match.winner_id === match.player1_id
        if (isDoubles) {
          await supabase.from('players').update({
            doubles_rating: (p1.doubles_rating ?? 1000) - match.player1_rating_change!,
            doubles_wins: (p1.doubles_wins ?? 0) - (p1Won ? 1 : 0),
            doubles_losses: (p1.doubles_losses ?? 0) - (p1Won ? 0 : 1),
          }).eq('id', match.player1_id)
          await supabase.from('players').update({
            doubles_rating: (p2.doubles_rating ?? 1000) - match.player2_rating_change!,
            doubles_wins: (p2.doubles_wins ?? 0) - (p1Won ? 0 : 1),
            doubles_losses: (p2.doubles_losses ?? 0) - (p1Won ? 1 : 0),
          }).eq('id', match.player2_id)
        } else {
          await supabase.from('players').update({
            rating: p1.rating - match.player1_rating_change!,
            wins: (p1.wins ?? 0) - (p1Won ? 1 : 0),
            losses: (p1.losses ?? 0) - (p1Won ? 0 : 1),
          }).eq('id', match.player1_id)
          await supabase.from('players').update({
            rating: p2.rating - match.player2_rating_change!,
            wins: (p2.wins ?? 0) - (p1Won ? 0 : 1),
            losses: (p2.losses ?? 0) - (p1Won ? 1 : 0),
          }).eq('id', match.player2_id)
        }
      }
    }

    await supabase.from('tournament_qualifying_matches').delete().eq('id', match.id)
    router.refresh()
  }

  // Step1: スコア変更内容とRP差分をプレビュー表示
  const handleEditMatch = async () => {
    if (!editMatch) return
    const s1 = parseInt(editScore1)
    const s2 = parseInt(editScore2)
    if (isNaN(s1) || isNaN(s2)) return

    const newWinnerId = s1 > s2 ? editMatch.player1_id : s2 > s1 ? editMatch.player2_id : null

    // RP記録がない試合（未登録 or affects_ranking=false）はそのまま保存
    if (!editMatch.affects_ranking || editMatch.winner_id == null) {
      setEditLoading(true)
      await supabase.from('tournament_qualifying_matches')
        .update({ score1: s1, score2: s2, winner_id: newWinnerId })
        .eq('id', editMatch.id)
      setEditMatch(null)
      setRpPreview(null)
      setEditLoading(false)
      router.refresh()
      return
    }

    // RP再計算：新スコアでELOを算出
    setEditLoading(true)
    const isDoubles = tournament.format === 'doubles'
    const { data: p1 } = await supabase.from('players')
      .select('rating, doubles_rating, wins, losses, doubles_wins, doubles_losses, total_matches')
      .eq('id', editMatch.player1_id).single()
    const { data: p2 } = await supabase.from('players')
      .select('rating, doubles_rating, wins, losses, doubles_wins, doubles_losses, total_matches')
      .eq('id', editMatch.player2_id).single()

    if (!p1 || !p2) { setEditLoading(false); return }

    const r1 = editMatch.player1_rating_before ?? (isDoubles ? (p1.doubles_rating ?? 1000) : p1.rating)
    const r2 = editMatch.player2_rating_before ?? (isDoubles ? (p2.doubles_rating ?? 1000) : p2.rating)

    const { data: elo } = await supabase.rpc('calc_elo', {
      rating_a: r1, rating_b: r2,
      score_a: s1, score_b: s2,
      matches_a: p1.total_matches ?? 0,
      matches_b: p2.total_matches ?? 0,
    })

    setEditLoading(false)
    if (!elo?.[0]) return

    const bonusRate = (tournament.bonus_points ?? 0) / 100
    let newChangeA = elo[0].change_a
    let newChangeB = elo[0].change_b
    if (bonusRate > 0) {
      if (newChangeA > 0) newChangeA = Math.round(newChangeA * (1 + bonusRate))
      if (newChangeB > 0) newChangeB = Math.round(newChangeB * (1 + bonusRate))
    }

    const oldChangeA = editMatch.player1_rating_change ?? 0
    const oldChangeB = editMatch.player2_rating_change ?? 0
    const p1Delta = newChangeA - oldChangeA
    const p2Delta = newChangeB - oldChangeB

    // 勝敗変化の計算
    const oldWinnerId = editMatch.winner_id
    const p1WinsDelta = (newWinnerId === editMatch.player1_id ? 1 : 0) - (oldWinnerId === editMatch.player1_id ? 1 : 0)
    const p1LossesDelta = (newWinnerId === editMatch.player2_id ? 1 : 0) - (oldWinnerId === editMatch.player2_id ? 1 : 0)
    const p2WinsDelta = (newWinnerId === editMatch.player2_id ? 1 : 0) - (oldWinnerId === editMatch.player2_id ? 1 : 0)
    const p2LossesDelta = (newWinnerId === editMatch.player1_id ? 1 : 0) - (oldWinnerId === editMatch.player1_id ? 1 : 0)

    setRpPreview({ s1, s2, newWinnerId, newChangeA, newChangeB, p1Delta, p2Delta, p1WinsDelta, p1LossesDelta, p2WinsDelta, p2LossesDelta })
  }

  // Step2: RP修正を適用して保存
  const handleConfirmEdit = async () => {
    if (!editMatch || !rpPreview) return
    setEditLoading(true)
    const isDoubles = tournament.format === 'doubles'

    const { data: p1 } = await supabase.from('players')
      .select('rating, doubles_rating, wins, losses, doubles_wins, doubles_losses')
      .eq('id', editMatch.player1_id).single()
    const { data: p2 } = await supabase.from('players')
      .select('rating, doubles_rating, wins, losses, doubles_wins, doubles_losses')
      .eq('id', editMatch.player2_id).single()

    if (p1 && p2) {
      // 試合レコード更新
      await supabase.from('tournament_qualifying_matches').update({
        score1: rpPreview.s1, score2: rpPreview.s2,
        winner_id: rpPreview.newWinnerId,
        player1_rating_change: rpPreview.newChangeA,
        player2_rating_change: rpPreview.newChangeB,
      }).eq('id', editMatch.id)

      // プレーヤーRP・勝敗を差分で修正
      if (isDoubles) {
        await supabase.from('players').update({
          doubles_rating: (p1.doubles_rating ?? 1000) + rpPreview.p1Delta,
          doubles_wins: (p1.doubles_wins ?? 0) + rpPreview.p1WinsDelta,
          doubles_losses: (p1.doubles_losses ?? 0) + rpPreview.p1LossesDelta,
        }).eq('id', editMatch.player1_id)
        await supabase.from('players').update({
          doubles_rating: (p2.doubles_rating ?? 1000) + rpPreview.p2Delta,
          doubles_wins: (p2.doubles_wins ?? 0) + rpPreview.p2WinsDelta,
          doubles_losses: (p2.doubles_losses ?? 0) + rpPreview.p2LossesDelta,
        }).eq('id', editMatch.player2_id)
      } else {
        await supabase.from('players').update({
          rating: p1.rating + rpPreview.p1Delta,
          wins: (p1.wins ?? 0) + rpPreview.p1WinsDelta,
          losses: (p1.losses ?? 0) + rpPreview.p1LossesDelta,
        }).eq('id', editMatch.player1_id)
        await supabase.from('players').update({
          rating: p2.rating + rpPreview.p2Delta,
          wins: (p2.wins ?? 0) + rpPreview.p2WinsDelta,
          losses: (p2.losses ?? 0) + rpPreview.p2LossesDelta,
        }).eq('id', editMatch.player2_id)
      }
    }

    setEditMatch(null)
    setRpPreview(null)
    setEditLoading(false)
    router.refresh()
  }

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

  // 試合登録
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

    const { data: insertedMatch, error } = await supabase
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
      .select('id')
      .single()

    if (error) {
      setMatchError('登録に失敗しました: ' + error.message)
      setMatchLoading(false)
      return
    }

    if (isNormal && winnerId && finalScore1 !== null && finalScore2 !== null) {
      const isDoubles = tournament.format === 'doubles'
      const { data: p1 } = await supabase
        .from('players')
        .select('rating, doubles_rating, wins, losses, doubles_wins, doubles_losses, total_score, total_matches, hc')
        .eq('id', matchPlayer1)
        .single()
      const { data: p2 } = await supabase
        .from('players')
        .select('rating, doubles_rating, wins, losses, doubles_wins, doubles_losses, total_score, total_matches, hc')
        .eq('id', matchPlayer2)
        .single()

      if (p1 && p2) {
        const r1 = isDoubles ? (p1.doubles_rating ?? 1000) : p1.rating
        const r2 = isDoubles ? (p2.doubles_rating ?? 1000) : p2.rating
        const { data: elo } = await supabase.rpc('calc_elo', {
          rating_a: r1,
          rating_b: r2,
          score_a: finalScore1,
          score_b: finalScore2,
          matches_a: p1.total_matches ?? 0,
          matches_b: p2.total_matches ?? 0,
        })
        if (elo?.[0]) {
          const eloResult = elo[0]

          // ボーナスレート適用（プラスRPのみ。マイナスRP・HCは対象外）
          const bonusRate = (tournament.bonus_points ?? 0) / 100
          let changeA = eloResult.change_a
          let changeB = eloResult.change_b
          if (bonusRate > 0) {
            if (changeA > 0) changeA = Math.round(changeA * (1 + bonusRate))
            if (changeB > 0) changeB = Math.round(changeB * (1 + bonusRate))
          }

          const p1Win = finalScore1 > finalScore2
          const p1NewWins = isDoubles ? p1.doubles_wins ?? 0 : p1.wins
          const p1NewLosses = isDoubles ? p1.doubles_losses ?? 0 : p1.losses
          const p2NewWins = isDoubles ? p2.doubles_wins ?? 0 : p2.wins
          const p2NewLosses = isDoubles ? p2.doubles_losses ?? 0 : p2.losses
          const p1WinsAfter = p1Win ? p1NewWins + 1 : p1NewWins
          const p1LossesAfter = !p1Win ? p1NewLosses + 1 : p1NewLosses
          const p2WinsAfter = !p1Win ? p2NewWins + 1 : p2NewWins
          const p2LossesAfter = p1Win ? p2NewLosses + 1 : p2NewLosses

          // 登録前の値・変化量を試合レコードに保存（ボーナス適用済み）
          if (insertedMatch?.id) {
            await supabase.from('tournament_qualifying_matches').update({
              player1_rating_before: r1,
              player2_rating_before: r2,
              player1_rating_change: changeA,
              player2_rating_change: changeB,
              player1_wins_before: p1NewWins,
              player2_wins_before: p2NewWins,
              player1_losses_before: p1NewLosses,
              player2_losses_before: p2NewLosses,
            }).eq('id', insertedMatch.id)
          }

          if (isDoubles) {
            await supabase.from('players').update({
              doubles_rating: r1 + changeA,
              doubles_wins: p1WinsAfter,
              doubles_losses: p1LossesAfter,
              total_score: (p1.total_score ?? 0) + finalScore1,
              total_matches: (p1.total_matches ?? 0) + 1,
            }).eq('id', matchPlayer1)
            await supabase.from('players').update({
              doubles_rating: r2 + changeB,
              doubles_wins: p2WinsAfter,
              doubles_losses: p2LossesAfter,
              total_score: (p2.total_score ?? 0) + finalScore2,
              total_matches: (p2.total_matches ?? 0) + 1,
            }).eq('id', matchPlayer2)
          } else {
            await supabase.from('players').update({
              rating: r1 + changeA,
              wins: p1WinsAfter,
              losses: p1LossesAfter,
              total_score: (p1.total_score ?? 0) + finalScore1,
              total_matches: (p1.total_matches ?? 0) + 1,
            }).eq('id', matchPlayer1)
            await supabase.from('players').update({
              rating: r2 + changeB,
              wins: p2WinsAfter,
              losses: p2LossesAfter,
              total_score: (p2.total_score ?? 0) + finalScore2,
              total_matches: (p2.total_matches ?? 0) + 1,
            }).eq('id', matchPlayer2)
          }

          const { data: hc1 } = await supabase.rpc('calc_hc', {
            p_wins: p1WinsAfter,
            p_losses: p1LossesAfter,
            p_total_score: (p1.total_score ?? 0) + finalScore1,
            p_total_matches: (p1.total_matches ?? 0) + 1,
          })
          if (hc1 !== null) await supabase.from('players').update({ hc: hc1 }).eq('id', matchPlayer1)

          const { data: hc2 } = await supabase.rpc('calc_hc', {
            p_wins: p2WinsAfter,
            p_losses: p2LossesAfter,
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

  const calcBlockStandings = (block: Block, blockMatches: Match[]) => {
    return block.tournament_block_players.map(bp => {
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
  }

  const getRegisteredPairs = (blockMatches: Match[]) =>
    blockMatches.map(m => `${m.player1_id}-${m.player2_id}`)

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">🏆 {tournament.name}</h1>
          <p className="text-sm text-gray-400 mt-1">予選管理</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/tournaments" className="text-sm text-gray-400 hover:text-white transition">
            ← 大会一覧
          </Link>
          <Link
            href={`/admin/tournaments/${tournament.id}/rp-check`}
            className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-sm font-medium transition"
          >
            📊 RP確認
          </Link>
          <Link
            href={`/tournaments/${tournament.id}`}
            target="_blank"
            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded-lg text-sm font-medium transition"
          >
            公開ページ →
          </Link>
          <Link
            href={`/admin/tournaments/${tournament.id}/finals`}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition"
          >
            本戦管理 →
          </Link>
        </div>
      </div>

      {/* 予選完了ボタン */}
      {!isQualifyingLocked && blocks.length > 0 && (
        <div className="p-4 bg-green-900/20 border border-green-700/40 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-300">予選完了・本戦へ進む</p>
            <p className="text-xs text-gray-400 mt-0.5">予選を締め切り、本戦管理ページへ移動します</p>
          </div>
          <button
            onClick={handleCompleteQualifying}
            disabled={statusLoading}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-bold transition whitespace-nowrap"
          >
            {statusLoading ? '処理中...' : '予選完了 → 本戦へ'}
          </button>
        </div>
      )}

      {/* ランダムブロック自動生成 */}
      {!isQualifyingLocked && blocks.length === 0 && enteredPlayers.length > 0 && (
        <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-300">🎲 ランダムブロック自動生成</p>
              <p className="text-xs text-gray-400 mt-0.5">エントリー済み{enteredPlayers.length}名をランダムに3人ずつブロック分けします</p>
            </div>
            <button
              onClick={handleAutoGenerate}
              disabled={autoLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition"
            >
              {autoLoading ? '生成中...' : '自動生成'}
            </button>
          </div>
          {autoError && <p className="text-sm text-red-400">{autoError}</p>}
        </div>
      )}

      {/* ブロック追加 */}
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

              {/* エントリー済みで未配置のプレーヤーを一覧表示 */}
              {(() => {
                const assignedIds = new Set(blocks.flatMap(b => b.tournament_block_players.map(bp => bp.player_id)))
                const unassigned = enteredPlayers.filter(p => !assignedIds.has(p.id) && !selectedPlayers.includes(p.id))
                if (unassigned.length === 0) return null
                return (
                  <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-xl">
                    <p className="text-xs font-semibold text-green-400 mb-2">📋 エントリー済み・未配置 ({unassigned.length}名)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {unassigned.map(p => (
                        <span key={p.id} className="text-xs px-2 py-0.5 bg-green-900/40 border border-green-600/40 text-green-300 rounded-full">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {[0, 1, 2].map(i => {
                const assignedIds = new Set(blocks.flatMap(b => b.tournament_block_players.map(bp => bp.player_id)))
                const enteredIds = new Set(enteredPlayers.map(p => p.id))
                const availablePlayers = players.filter(p => !selectedPlayers.includes(p.id) || selectedPlayers[i] === p.id)
                const enteredUnassigned = availablePlayers.filter(p => enteredIds.has(p.id) && !assignedIds.has(p.id))
                const enteredAssigned = availablePlayers.filter(p => enteredIds.has(p.id) && assignedIds.has(p.id))
                const others = availablePlayers.filter(p => !enteredIds.has(p.id))
                return (
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
                      <option value="">── 空欄（DEFAULT補充）──</option>
                      {enteredUnassigned.length > 0 && (
                        <optgroup label="✅ エントリー済み・未配置">
                          {enteredUnassigned.map(p => (
                            <option key={p.id} value={p.id}>{p.name}（HC:{p.hc} RP:{p.rating}）</option>
                          ))}
                        </optgroup>
                      )}
                      {enteredAssigned.length > 0 && (
                        <optgroup label="⚠️ エントリー済み・配置済み">
                          {enteredAssigned.map(p => (
                            <option key={p.id} value={p.id}>{p.name}（HC:{p.hc} RP:{p.rating}）※配置済み</option>
                          ))}
                        </optgroup>
                      )}
                      {others.length > 0 && (
                        <optgroup label="── エントリー外のプレーヤー ──">
                          {others.map(p => (
                            <option key={p.id} value={p.id}>{p.name}（HC:{p.hc} RP:{p.rating}）</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )
              })}
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
            const times = getBlockTimes(block.id)

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

            // N人ブロックの試合数 = N*(N-1)/2（重複player_idは除く）
            const uniquePlayerIds = new Set(block.tournament_block_players.map(bp => bp.player_id))
            const uniqueCount = uniquePlayerIds.size
            const expectedMatches = (uniqueCount * (uniqueCount - 1)) / 2
            const allMatchesCreated = expectedMatches > 0 && blockMatches.length >= expectedMatches
            const blockWinnerConfirmed = pendingPairs.length === 0 && blockMatches.some(m => m.winner_id)

            return (
              <div key={block.id} className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-yellow-100">ブロック {block.block_name}</h2>
                  {!isQualifyingLocked && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteAllMatches(block.id, block.block_name)}
                        className="text-xs px-2 py-1 bg-yellow-900/30 hover:bg-yellow-800/50 rounded-lg text-yellow-400 transition"
                      >
                        試合削除
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(block.id, block.block_name)}
                        className="text-xs px-2 py-1 bg-red-900/30 hover:bg-red-800/50 rounded-lg text-red-400 transition"
                      >
                        ブロック削除
                      </button>
                    </div>
                  )}
                </div>

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
                              {block.scores_finalized ? (
                                <span className={`font-bold ${idx === 0 && isQualifyingLocked ? 'text-yellow-400' : 'text-gray-400'}`}>
                                  {idx + 1}{idx === 0 && !s.is_default && isQualifyingLocked ? ' 👑' : ''}
                                </span>
                              ) : (
                                <span className="text-gray-600 font-bold">－</span>
                              )}
                            </td>
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-2">
                                {s.player.avatar_url && (
                                  <img
                                    src={s.player.avatar_url}
                                    className={`w-6 h-6 rounded-full object-cover ${idx === 0 && !s.is_default && blockWinnerConfirmed ? 'avatar-glow' : ''}`}
                                  />
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

                {/* 試合開始予定時間 */}
                <div className="p-4 bg-black/20 rounded-xl space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300">⏰ 試合開始予定時間</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map(i => (
                      <div key={i}>
                        <label className="block text-xs text-gray-400 mb-1">第{i + 1}試合</label>
                        <select
                          value={times[i] ?? ''}
                          onChange={e => setBlockTime(block.id, i, e.target.value)}
                          className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="">未設定</option>
                          {timeOptions.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  {times.some(t => t) && (
                    <p className="text-xs text-purple-300">
                      {times.map((t, i) => t ? `第${i + 1}試合 ${t}` : null).filter(Boolean).join('　')}
                    </p>
                  )}
                </div>

                {/* 試合自動作成ボタン */}
                {!isQualifyingLocked && (
                  <div className="flex items-center justify-between gap-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-blue-300">🎲 試合を自動作成</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        第1試合〜第3試合を自動生成（登録済みはスキップ）
                      </p>
                    </div>
                    <button
                      onClick={() => handleAutoCreateMatches(block)}
                      disabled={autoMatchLoading === block.id || allMatchesCreated}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition whitespace-nowrap"
                    >
                      {autoMatchLoading === block.id ? '作成中...' : allMatchesCreated ? '作成済み' : '自動作成'}
                    </button>
                  </div>
                )}

                {/* スコア登録完了ボタン */}
                {!isQualifyingLocked && !block.scores_finalized && (
                  <div className="flex items-center justify-between gap-4 p-3 bg-green-900/20 border border-green-700/30 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-green-300">✅ スコア登録完了</p>
                      <p className="text-xs text-gray-400 mt-0.5">押すと公開ページに順位が表示されます</p>
                    </div>
                    <button
                      onClick={() => handleFinalizeScores(block)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition whitespace-nowrap"
                    >
                      順位を公開
                    </button>
                  </div>
                )}
                {block.scores_finalized && (
                  <div className="p-3 bg-green-900/10 border border-green-700/20 rounded-xl">
                    <p className="text-xs text-green-400">✅ スコア登録完了・順位公開中</p>
                  </div>
                )}

                {/* 試合結果一覧 */}
                {blockMatches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">試合結果</h3>
                    <div className="space-y-1">
                      {blockMatches.map((m, idx) => (
                        <div key={m.id} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg text-sm">
                          <span className="text-xs text-gray-500 flex-shrink-0 w-12">
                            {m.scheduled_time ? `⏰ ${m.scheduled_time}` : `第${idx + 1}試合`}
                          </span>
                          <span className={m.winner_id === m.player1_id ? 'text-white font-bold' : 'text-gray-400'}>{m.player1.name}</span>
                          <span className="text-white font-bold flex-shrink-0">
                            {m.winner_id ? (m.mode === 'walkover' ? 'W/O' : `${m.score1} - ${m.score2}`) : '－'}
                          </span>
                          <span className={m.winner_id === m.player2_id ? 'text-white font-bold' : 'text-gray-400'}>{m.player2.name}</span>
                          {m.mode !== 'normal' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400">
                              {m.mode === 'walkover' ? '不戦勝' : '途中棄権'}
                            </span>
                          )}
                          <div className="ml-auto flex gap-1">
                            <button
                              onClick={() => {
                                setEditMatch(m)
                                setEditScore1(m.score1?.toString() ?? '')
                                setEditScore2(m.score2?.toString() ?? '')
                                setRpPreview(null)
                              }}
                              className="text-xs px-2 py-0.5 bg-purple-700/50 hover:bg-purple-600/50 rounded text-purple-300 transition"
                            >
                              {m.winner_id ? '編集' : 'スコア入力'}
                            </button>
                            <button
                              onClick={() => handleDeleteMatch(m)}
                              className="text-xs px-2 py-0.5 bg-red-900/50 hover:bg-red-700/60 rounded text-red-400 transition"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 手動試合登録 */}
                {!isQualifyingLocked && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-300">
                        手動試合登録 {pendingPairs.length > 0 && <span className="text-gray-500">（残り{pendingPairs.length}試合）</span>}
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
                        {showMatchForm === block.id ? 'キャンセル' : '+ 手動登録'}
                      </button>
                    </div>

                    {showMatchForm === block.id && (
                      <div className="p-4 bg-black/20 rounded-xl space-y-3">
                        {matchError && <p className="text-sm text-red-400">{matchError}</p>}

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
                                type="number" min="0" max="15" value={score1}
                                onChange={e => setScore1(e.target.value)}
                                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                            <span className="text-gray-400 mt-4">-</span>
                            <div className="flex-1">
                              <label className="block text-xs text-gray-400 mb-1">スコア2</label>
                              <input
                                type="number" min="0" max="15" value={score2}
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

      {/* 試合編集モーダル */}
      {editMatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1e0f3a] border border-purple-800/50 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">
              {editMatch.winner_id ? '試合を編集' : 'スコアを入力'}
            </h2>
            <div className="flex items-center justify-between text-sm text-gray-300">
              <span className="font-medium">{editMatch.player1.name}</span>
              <span className="text-gray-500">vs</span>
              <span className="font-medium">{editMatch.player2.name}</span>
            </div>

            {!rpPreview ? (
              <>
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">{editMatch.player1.name}</label>
                    <input type="number" min="0" max="15" value={editScore1}
                      onChange={e => { setEditScore1(e.target.value) }}
                      className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <span className="text-gray-400 mt-4">-</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">{editMatch.player2.name}</label>
                    <input type="number" min="0" max="15" value={editScore2}
                      onChange={e => { setEditScore2(e.target.value) }}
                      className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleEditMatch} disabled={editLoading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition">
                    {editLoading ? '計算中...' : editMatch.winner_id ? 'RP変化を確認 →' : '登録する'}
                  </button>
                  <button onClick={() => { setEditMatch(null); setRpPreview(null) }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition">
                    キャンセル
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* RP差分プレビュー */}
                <div className="bg-orange-900/20 border border-orange-700/40 rounded-xl p-4 space-y-2 text-sm">
                  <p className="text-orange-300 font-semibold text-xs mb-3">⚠️ RP修正内容の確認</p>
                  <p className="text-gray-300 text-center font-bold">
                    {rpPreview.s1} - {rpPreview.s2}
                    <span className="text-xs text-gray-500 ml-2">
                      ({rpPreview.newWinnerId === editMatch.player1_id ? editMatch.player1.name : rpPreview.newWinnerId === editMatch.player2_id ? editMatch.player2.name : '引き分け'} 勝ち)
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { name: editMatch.player1.name, delta: rpPreview.p1Delta, newChange: rpPreview.newChangeA, wDelta: rpPreview.p1WinsDelta, lDelta: rpPreview.p1LossesDelta },
                      { name: editMatch.player2.name, delta: rpPreview.p2Delta, newChange: rpPreview.newChangeB, wDelta: rpPreview.p2WinsDelta, lDelta: rpPreview.p2LossesDelta },
                    ].map(({ name, delta, newChange, wDelta, lDelta }) => (
                      <div key={name} className="text-center bg-black/30 rounded-lg p-2">
                        <p className="text-xs text-gray-400 mb-1">{name}</p>
                        <p className={`text-base font-bold ${newChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {newChange >= 0 ? '+' : ''}{newChange}pt
                        </p>
                        <p className={`text-xs font-semibold ${delta > 0 ? 'text-blue-400' : delta < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                          RP差分: {delta > 0 ? '+' : ''}{delta}
                        </p>
                        {(wDelta !== 0 || lDelta !== 0) && (
                          <p className="text-xs text-yellow-400">
                            {wDelta > 0 ? '勝+1' : wDelta < 0 ? '勝-1' : ''}{lDelta > 0 ? ' 敗+1' : lDelta < 0 ? ' 敗-1' : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleConfirmEdit} disabled={editLoading}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition">
                    {editLoading ? '保存中...' : '✓ RP修正して保存'}
                  </button>
                  <button onClick={() => setRpPreview(null)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition">
                    戻る
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