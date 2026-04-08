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
  disadvantage_player_id: string | null; mode: string
  player1: Player | null; player2: Player | null; winner: Player | null
  tournament_finals_sets: FinalsSet[]
}
type Tournament = { id: string; name: string; status: string }

export default function FinalsClient({
  tournament,
  qualifiers,
  finalsMatches,
}: {
  tournament: Tournament
  qualifiers: Qualifier[]
  finalsMatches: FinalsMatch[]
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
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const maxRound = finalsMatches.length > 0
    ? Math.max(...finalsMatches.map(m => m.round))
    : 0

  const roundNames = ['1回戦', '2回戦', '3回戦', '準決勝', '決勝']
  const getRoundName = (r: number) => roundNames[r - 1] ?? `第${r}回戦`

  // 勝者を計算
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

  const handleRegisterMatch = async () => {
    setLoading(true)
    setError(null)

    if (!player1Id || !player2Id) {
      setError('プレーヤーを選択してください')
      setLoading(false)
      return
    }

    const winnerId = mode === 'walkover' ? player1Id : calcWinner(sets)
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

    // セット結果を登録
    if (mode !== 'walkover') {
      const setsToInsert = sets
        .map((s, i) => ({
          match_id: match.id,
          set_number: i + 1,
          score1: parseInt(s.score1),
          score2: parseInt(s.score2),
        }))
        .filter(s => !isNaN(s.score1) && !isNaN(s.score2))

      if (setsToInsert.length > 0) {
        await supabase.from('tournament_finals_sets').insert(setsToInsert)
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

  const allPlayers = qualifiers.map(q => q.winner?.player).filter(Boolean) as Player[]
  const roundsInFinals = Array.from(new Set(finalsMatches.map(m => m.round))).sort()

  // 優勝者
  const champion = finalsMatches
    .filter(m => m.round === maxRound && m.winner)
    .sort((a, b) => b.match_number - a.match_number)[0]?.winner

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🏆 {tournament.name}</h1>
          <p className="text-sm text-gray-400 mt-1">本戦管理</p>
        </div>
        <Link href={`/admin/tournaments/${tournament.id}/qualifying`} className="text-sm text-gray-400 hover:text-white transition">
          ← 予選管理
        </Link>
      </div>

      {/* 優勝者 */}
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

      {/* 本戦試合一覧 */}
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
                  <div className="text-center flex-shrink-0">
                    <div className="space-y-1">
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
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 試合登録 */}
      <div>
        <button
          onClick={() => setShowMatchForm(!showMatchForm)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
        >
          {showMatchForm ? 'キャンセル' : '+ 本戦試合を登録'}
        </button>

        {showMatchForm && (
          <div className="mt-4 p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl space-y-4">
            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            {/* ラウンド選択 */}
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

            {/* モード */}
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

            {/* プレーヤー選択 */}
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

            {/* 1勝アドバンテージ */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">1勝アドバンテージ（DEFAULTブロックからの勝ち上がり）</label>
              <select
                value={disadvantageId}
                onChange={e => setDisadvantageId(e.target.value)}
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">なし</option>
                {[player1Id, player2Id].filter(Boolean).map(pid => {
                  const p = allPlayers.find(p => p.id === pid)
                  return p ? <option key={p.id} value={p.id}>{p.name}</option> : null
                })}
              </select>
            </div>

            {/* セットスコア */}
            {mode !== 'walkover' && (
              <div className="space-y-2">
                <label className="block text-xs text-gray-400">セットスコア（15点先取）</label>
                {sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-16">第{i + 1}セット</span>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={s.score1}
                      onChange={e => {
                        const updated = [...sets]
                        updated[i] = { ...updated[i], score1: e.target.value }
                        setSets(updated)
                      }}
                      className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={s.score2}
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
    </div>
  )
}