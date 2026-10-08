'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { notifyStatsChanged } from '@/lib/revalidate-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Player } from '@/types'

export default function RegisterDoublesPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [pair1p2, setPair1p2] = useState('')
  const [pair2p1, setPair2p1] = useState('')
  const [pair2p2, setPair2p2] = useState('')
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: me } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (me) setCurrentPlayer(me)

      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('is_active', true)
        .eq('is_admin', false)
        .order('name')
      if (data) setPlayers(data)
    }
    load()
  }, [])

  const pair1p1 = currentPlayer?.id ?? ''

  const available = (exclude: string[]) =>
    players.filter(p => !exclude.includes(p.id) && p.id !== pair1p1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pair1p1 || !pair1p2 || !pair2p1 || !pair2p2) {
      setError('4人全員を選択してください')
      return
    }

    const s1 = parseInt(score1)
    const s2 = parseInt(score2)
    if (isNaN(s1) || isNaN(s2)) {
      setError('スコアを入力してください')
      return
    }
    if (s1 === s2) {
      setError('引き分けは登録できません')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 4人分の成績更新は RLS の関係でサーバー側（adminClient）で行う
      const res = await fetch('/api/matches/register/doubles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: pair1p2,
          opp1_id: pair2p1,
          opp2_id: pair2p2,
          score1: s1,
          score2: s2,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? '登録に失敗しました')
        setLoading(false)
        return
      }

      notifyStatsChanged()
      setSuccess(true)
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1500)

    } catch (err) {
      setError('予期しないエラーが発生しました')
      setLoading(false)
    }
  }

  if (!currentPlayer) {
    return <div className="text-center text-gray-400 py-10">読み込み中...</div>
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🎾 ダブルス試合登録</h1>
        <Link href="/" className="text-sm text-gray-400 hover:text-white transition">
          ← トップへ
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-400 bg-green-900/20 px-3 py-2 rounded-lg">✅ 登録しました！</p>
        )}

        {/* ペア1 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-purple-300 border-b border-purple-800/30 pb-1">
            ペア1（あなたのチーム）
          </h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1">プレーヤー1（自分）</label>
            <div className="w-full bg-purple-900/10 border border-purple-700/30 rounded-lg px-3 py-2 text-sm text-gray-300">
              {currentPlayer.name}（自動設定）
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">プレーヤー2（パートナー）</label>
            <select
              value={pair1p2}
              onChange={e => setPair1p2(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {available([pair2p1, pair2p2]).map(p => (
                <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
              ))}
            </select>
          </div>
        </div>

        {/* ペア2 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-orange-300 border-b border-purple-800/30 pb-1">
            ペア2（対戦相手）
          </h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1">プレーヤー1</label>
            <select
              value={pair2p1}
              onChange={e => setPair2p1(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {available([pair1p2, pair2p2]).map(p => (
                <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">プレーヤー2</label>
            <select
              value={pair2p2}
              onChange={e => setPair2p2(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {available([pair1p2, pair2p1]).map(p => (
                <option key={p.id} value={p.id}>{p.name} (D-RP:{p.doubles_rating ?? 1000})</option>
              ))}
            </select>
          </div>
        </div>

        {/* スコア */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 border-b border-purple-800/30 pb-1 mb-3">
            スコア
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">ペア1のスコア</label>
              <input
                type="number" min="0" max="15" value={score1}
                onChange={e => setScore1(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <span className="text-gray-400 pb-2 font-bold text-lg">-</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">ペア2のスコア</label>
              <input
                type="number" min="0" max="15" value={score2}
                onChange={e => setScore2(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          {loading ? '登録中...' : success ? '登録完了！' : '登録する'}
        </button>
      </form>
    </div>
  )
}