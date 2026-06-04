'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Player = { id: string; name: string; avatar_url: string | null; hc: number; rating: number; doubles_rating: number }
type Entry = {
  id: string
  player_id: string
  preferred_partner_id: string | null
  player: Player
  preferred_partner: { id: string; name: string } | null
}
type Pair = {
  id: string
  player1: Player
  player2: Player
}
type Tournament = { id: string; name: string; status: string }

export default function PairingClient({
  tournament,
  entries,
  pairs,
}: {
  tournament: Tournament
  entries: Entry[]
  pairs: Pair[]
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualP1, setManualP1] = useState('')
  const [manualP2, setManualP2] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // ペア済みプレーヤーIDセット
  const pairedIds = new Set(pairs.flatMap(p => [p.player1.id, p.player2.id]))

  // 未ペアエントリー
  const unpaired = entries.filter(e => !pairedIds.has(e.player_id))

  // 相互希望ペア（両者が互いを希望している）
  const mutualPairs: [Entry, Entry][] = []
  const mutualIds = new Set<string>()
  for (const e of unpaired) {
    if (!e.preferred_partner_id || mutualIds.has(e.player_id)) continue
    const partner = unpaired.find(x => x.player_id === e.preferred_partner_id && x.preferred_partner_id === e.player_id)
    if (partner && !mutualIds.has(partner.player_id)) {
      mutualPairs.push([e, partner])
      mutualIds.add(e.player_id)
      mutualIds.add(partner.player_id)
    }
  }

  // 片方のみ希望（相互ではない）
  const oneWayRequests = unpaired.filter(e =>
    e.preferred_partner_id &&
    !mutualIds.has(e.player_id) &&
    !pairedIds.has(e.player_id)
  )

  // ペア希望なし
  const noPreference = unpaired.filter(e =>
    !e.preferred_partner_id &&
    !mutualIds.has(e.player_id)
  )

  // 相互希望を一括ペア確定
  const handleConfirmMutual = async () => {
    if (mutualPairs.length === 0) return
    if (!confirm(`${mutualPairs.length}組の相互希望ペアを確定しますか？`)) return
    setLoading(true)
    setError(null)
    for (const [a, b] of mutualPairs) {
      const { error: err } = await supabase.from('tournament_pairs').insert({
        tournament_id: tournament.id,
        player1_id: a.player_id,
        player2_id: b.player_id,
      })
      if (err) { setError('登録失敗: ' + err.message); setLoading(false); router.refresh(); return }
    }
    setLoading(false)
    router.refresh()
  }

  // 手動ペア作成
  const handleAddPair = async () => {
    if (!manualP1 || !manualP2) { setError('2名選択してください'); return }
    if (manualP1 === manualP2) { setError('同じプレーヤーは選択できません'); return }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.from('tournament_pairs').insert({
      tournament_id: tournament.id,
      player1_id: manualP1,
      player2_id: manualP2,
    })
    if (err) { setError('登録失敗: ' + err.message); setLoading(false); return }
    setManualP1('')
    setManualP2('')
    setLoading(false)
    router.refresh()
  }

  // HC均等自動ペアリング（スネークドラフト方式）
  // 未ペアを HC 昇順ソート → 1番目と最後, 2番目と2番目最後... でペアリング
  const handleAutoPair = async () => {
    const remaining = unpaired
      .filter(e => !mutualIds.has(e.player_id))
      .sort((a, b) => a.player.hc - b.player.hc)

    if (remaining.length < 2) { setError('ペアリングできる人数が足りません（最低2名必要）'); return }
    if (remaining.length % 2 !== 0) {
      if (!confirm(`未ペアが${remaining.length}名（奇数）のため、1名が余ります。続行しますか？`)) return
    } else {
      if (!confirm(`未ペアの${remaining.length}名をHC均等で自動ペアリングします。よろしいですか？`)) return
    }

    setLoading(true)
    setError(null)

    // スネーク: [0, n-1], [1, n-2], ...
    const newPairs: [string, string][] = []
    let lo = 0, hi = remaining.length - 1
    while (lo < hi) {
      newPairs.push([remaining[lo].player_id, remaining[hi].player_id])
      lo++; hi--
    }

    for (const [p1, p2] of newPairs) {
      const { error: err } = await supabase.from('tournament_pairs').insert({
        tournament_id: tournament.id,
        player1_id: p1,
        player2_id: p2,
      })
      if (err) { setError('登録失敗: ' + err.message); setLoading(false); router.refresh(); return }
    }
    setLoading(false)
    router.refresh()
  }

  // ペア削除
  const handleDeletePair = async (pairId: string) => {
    if (!confirm('このペアを削除しますか？')) return
    await supabase.from('tournament_pairs').delete().eq('id', pairId)
    router.refresh()
  }

  // ペア作成完了 → 予選へ
  const handleStartQualifying = async () => {
    if (unpaired.length > 0) {
      if (!confirm(`${unpaired.length}名がまだペアになっていません。このまま予選を開始しますか？`)) return
    } else {
      if (!confirm('ペア作成を完了し、予選管理へ進みますか？')) return
    }
    setLoading(true)
    await supabase.from('tournaments').update({ status: 'qualifying' }).eq('id', tournament.id)
    setLoading(false)
    router.push(`/admin/tournaments/${tournament.id}/qualifying`)
  }

  const isLocked = !['open', 'entry_closed', 'qualifying'].includes(tournament.status)

  const allUnpairedIds = new Set(unpaired.map(e => e.player_id))
  const availableForManual = (slot: 'p1' | 'p2') =>
    entries.filter(e => {
      const otherId = slot === 'p1' ? manualP2 : manualP1
      return !pairedIds.has(e.player_id) && e.player_id !== otherId
    })

  return (
    <div className="space-y-8 max-w-3xl mx-auto">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🤝 ペア作成</h1>
          <p className="text-sm text-gray-400 mt-1">{tournament.name}</p>
        </div>
        <Link href={`/admin/tournaments/${tournament.id}`} className="text-sm text-gray-400 hover:text-white transition">
          ← 大会管理
        </Link>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

      {/* 予選開始ボタン */}
      {!isLocked && (
        <div className="p-4 bg-green-900/20 border border-green-700/40 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-300">ペア確定 → 予選開始</p>
            <p className="text-xs text-gray-400 mt-0.5">
              確定済み：{pairs.length}ペア　未ペア：{unpaired.length}名
            </p>
          </div>
          <button
            onClick={handleStartQualifying}
            disabled={loading || pairs.length === 0}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-bold transition whitespace-nowrap"
          >
            予選管理へ →
          </button>
        </div>
      )}

      {/* 相互希望ペア */}
      {mutualPairs.length > 0 && !isLocked && (
        <div className="p-5 bg-blue-900/20 border border-blue-700/30 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-300">💌 相互希望ペア（{mutualPairs.length}組）</p>
              <p className="text-xs text-gray-400 mt-0.5">両者が互いを希望しています</p>
            </div>
            <button
              onClick={handleConfirmMutual}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition"
            >
              一括確定
            </button>
          </div>
          <div className="space-y-2">
            {mutualPairs.map(([a, b]) => (
              <div key={a.player_id} className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-xl text-sm">
                <span className="text-white font-medium">{a.player.name}</span>
                <span className="text-blue-400">↔</span>
                <span className="text-white font-medium">{b.player.name}</span>
                <span className="text-xs text-gray-500 ml-auto">HC {a.player.hc} / {b.player.hc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 片方のみ希望 */}
      {oneWayRequests.length > 0 && (
        <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-2xl space-y-2">
          <p className="text-sm font-semibold text-yellow-300">⚠️ 片方のみ希望（要確認）</p>
          {oneWayRequests.map(e => (
            <div key={e.player_id} className="text-sm text-gray-300">
              <span className="font-medium">{e.player.name}</span>
              <span className="text-gray-500"> → </span>
              <span>{e.preferred_partner?.name ?? '（未エントリー）'}</span>
              {!entries.find(x => x.player_id === e.preferred_partner_id) && (
                <span className="text-red-400 text-xs ml-2">希望相手が未エントリー</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 自動ペアリング */}
      {!isLocked && unpaired.filter(e => !mutualIds.has(e.player_id)).length >= 2 && (
        <div className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-purple-300">🎲 HC均等 自動ペアリング</p>
            <p className="text-xs text-gray-400 mt-0.5">
              未ペア{unpaired.filter(e => !mutualIds.has(e.player_id)).length}名をHCが均等になるようにペアリング
            </p>
          </div>
          <button
            onClick={handleAutoPair}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm font-medium transition"
          >
            自動ペアリング
          </button>
        </div>
      )}

      {/* 手動ペア作成 */}
      {!isLocked && (
        <div className="p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl space-y-3">
          <p className="text-sm font-semibold text-gray-300">手動ペア作成</p>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={manualP1}
              onChange={e => setManualP1(e.target.value)}
              className="bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">プレーヤー1</option>
              {availableForManual('p1').map(e => (
                <option key={e.player_id} value={e.player_id}>
                  {e.player.name}（HC:{e.player.hc}）
                </option>
              ))}
            </select>
            <select
              value={manualP2}
              onChange={e => setManualP2(e.target.value)}
              className="bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">プレーヤー2</option>
              {availableForManual('p2').map(e => (
                <option key={e.player_id} value={e.player_id}>
                  {e.player.name}（HC:{e.player.hc}）
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddPair}
            disabled={loading || !manualP1 || !manualP2}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
          >
            ペア確定
          </button>
        </div>
      )}

      {/* 確定済みペア一覧 */}
      <div>
        <h2 className="font-semibold text-gray-300 mb-3">
          確定済みペア <span className="text-purple-400">{pairs.length}組</span>
        </h2>
        {pairs.length === 0 ? (
          <p className="text-gray-500 text-sm">まだペアがありません</p>
        ) : (
          <div className="space-y-2">
            {pairs.map((pair, i) => {
              const avgHc = ((pair.player1.hc + pair.player2.hc) / 2).toFixed(1)
              return (
                <div key={pair.id} className="flex items-center gap-3 p-3 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                  <span className="text-xs text-gray-500 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 flex items-center gap-2">
                    {pair.player1.avatar_url && (
                      <img src={pair.player1.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                    )}
                    <span className="text-sm font-medium text-white">{pair.player1.name}</span>
                    <span className="text-gray-500 text-xs">HC{pair.player1.hc}</span>
                    <span className="text-purple-400 mx-1">&amp;</span>
                    {pair.player2.avatar_url && (
                      <img src={pair.player2.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                    )}
                    <span className="text-sm font-medium text-white">{pair.player2.name}</span>
                    <span className="text-gray-500 text-xs">HC{pair.player2.hc}</span>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">平均HC {avgHc}</span>
                  {!isLocked && (
                    <button
                      onClick={() => handleDeletePair(pair.id)}
                      className="text-xs px-2 py-1 bg-red-900/40 hover:bg-red-800/50 rounded text-red-400 transition flex-shrink-0"
                    >
                      削除
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 未ペア一覧 */}
      {unpaired.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-500 mb-3">未ペア {unpaired.length}名</h2>
          <div className="space-y-1">
            {unpaired.map(e => (
              <div key={e.player_id} className="flex items-center gap-3 p-2 bg-gray-900/30 border border-gray-700/30 rounded-lg text-sm">
                {e.player.avatar_url && (
                  <img src={e.player.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                )}
                <span className="text-gray-300">{e.player.name}</span>
                <span className="text-gray-600 text-xs">HC {e.player.hc}</span>
                {e.preferred_partner_id && (
                  <span className="text-xs text-yellow-600 ml-auto">
                    希望：{e.preferred_partner?.name ?? '—'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
