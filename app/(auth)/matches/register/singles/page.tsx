'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Player } from '@/types'

export default function RegisterSinglesPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [opponent, setOpponent] = useState('')
  const [myScore, setMyScore] = useState('')
  const [oppScore, setOppScore] = useState('')
  const [myComment, setMyComment] = useState('')
  const [isHandicap, setIsHandicap] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: me } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (me) setMyId(me.id)

      const { data: allPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('is_active', true)
        .eq('is_admin', false)
        .order('rating', { ascending: false })

      if (allPlayers) setPlayers(allPlayers)
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myId || !opponent || myScore === '' || oppScore === '') return
    if (myId === opponent) {
      setError('対戦相手は自分以外を選んでください')
      return
    }

    setLoading(true)
    setError(null)

    const s1 = parseInt(myScore)
    const s2 = parseInt(oppScore)

    const player1Rank = players.findIndex(p => p.id === myId) + 1
    const player2Rank = players.findIndex(p => p.id === opponent) + 1
    const player1Hc = players.find(p => p.id === myId)?.hc ?? 36
    const player2Hc = players.find(p => p.id === opponent)?.hc ?? 36

    const res = await fetch('/api/matches/register/singles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opponent_id: opponent,
        score1: s1,
        score2: s2,
        comment1: myComment.trim() || null,
        player1_hc: player1Hc,
        player2_hc: player2Hc,
        player1_rank: player1Rank,
        player2_rank: player2Rank,
        is_handicap: isHandicap,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? '登録に失敗しました')
      setLoading(false)
      return
    }

    router.push('/mypage')
  }

  const opponentPlayers = players.filter(p => p.id !== myId)

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-10">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">🏒 個人戦を登録</h1>

        <form onSubmit={handleSubmit} className="space-y-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">対戦相手</label>
            <select
              value={opponent}
              onChange={e => setOpponent(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {opponentPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">自分のスコア</label>
              <input
                type="number"
                min="0"
                max="15"
                value={myScore}
                onChange={e => setMyScore(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <span className="text-gray-400 pb-2 font-bold">-</span>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">相手のスコア</label>
              <input
                type="number"
                min="0"
                max="15"
                value={oppScore}
                onChange={e => setOppScore(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer bg-purple-900/30 border border-purple-700/40 rounded-lg px-3 py-2.5">
            <input
              type="checkbox"
              checked={isHandicap}
              onChange={e => setIsHandicap(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-amber-500"
            />
            <span className="text-sm text-gray-300">
              <span className="font-medium text-amber-300">ハンディキャップ戦</span>（両者合意）
              <span className="block text-xs text-gray-500 mt-0.5">
                実力差を埋めるスコア調整を行った試合。RPは両者を対等（勝ち＋・負け−を同幅）として計算します。
              </span>
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              一言コメント <span className="text-gray-500 font-normal">（任意・30文字以内）</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={myComment}
                onChange={e => setMyComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                maxLength={30}
                placeholder="例：いい試合でした！"
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                {myComment.length}/30
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              💡 ログインしていればマイページからも自分の試合のコメントができます
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
          >
            {loading ? '登録中...' : '登録する'}
          </button>
        </form>
      </div>
    </div>
  )
}