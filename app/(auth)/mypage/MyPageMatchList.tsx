'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MyPageMatchList({
  matches,
  playerId,
}: {
  matches: any[]
  playerId: string
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, { comment1?: string | null; comment2?: string | null }>>({})
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (matchId: string, myField: 'comment1' | 'comment2') => {
    const text = drafts[matchId]?.trim()
    if (!text) return
    setSaving(prev => new Set(prev).add(matchId))
    setErrors(prev => { const n = { ...prev }; delete n[matchId]; return n })
    try {
      const res = await fetch(`/api/matches/${matchId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: text, field: myField }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaved(prev => ({ ...prev, [matchId]: { ...prev[matchId], [data.field]: text } }))
        setDrafts(prev => { const n = { ...prev }; delete n[matchId]; return n })
      } else {
        setErrors(prev => ({ ...prev, [matchId]: data.error ?? '送信に失敗しました' }))
      }
    } catch {
      setErrors(prev => ({ ...prev, [matchId]: '通信エラーが発生しました' }))
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(matchId); return n })
    }
  }

  const del = async (matchId: string, field: 'comment1' | 'comment2') => {
    if (!confirm('コメントを削除しますか？')) return
    await fetch(`/api/matches/${matchId}/comment`, { method: 'DELETE' })
    setSaved(prev => ({ ...prev, [matchId]: { ...prev[matchId], [field]: null } }))
  }

  return (
    <div className="space-y-2">
      {matches.map((match: any) => {
        const isP1 = match.player1_id === playerId
        const opponent = isP1 ? match.player2 : match.player1
        const myScore = isP1 ? match.score1 : match.score2
        const oppScore = isP1 ? match.score2 : match.score1
        const isWin = match.winner_id === playerId
        const ratingChange: number | null = isP1 ? match.rating_change1 : match.rating_change2
        const date = new Date(match.played_at)
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`

        // コメントはシングルス（通常試合）のみ
        const isSingles = match.source === 'singles'
        const myField = isSingles ? (isP1 ? 'comment1' as const : 'comment2' as const) : null
        const c1 = saved[match.id]?.comment1 !== undefined ? saved[match.id].comment1 : match.comment1
        const c2 = saved[match.id]?.comment2 !== undefined ? saved[match.id].comment2 : match.comment2
        const myComment = myField === 'comment1' ? c1 : myField === 'comment2' ? c2 : null
        const oppComment = myField === 'comment1' ? c2 : myField === 'comment2' ? c1 : null
        const draft = drafts[match.id] ?? ''
        const isSav = saving.has(match.id)

        return (
          <div
            key={match.id}
            className={`p-4 rounded-xl border-l-4 ${isWin ? 'border-green-500 bg-green-900/10' : 'border-red-500 bg-red-900/10'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">
                  {dateStr}
                  {match.tournament_name && (
                    <span className="ml-1 text-purple-400">【{match.tournament_name}】</span>
                  )}
                </p>
                <p className="text-sm font-medium text-white mt-0.5">
                  <span className={isWin ? 'text-green-400' : 'text-red-400'}>
                    {isWin ? '勝利' : '敗北'}
                  </span>
                  ：{opponent?.name ?? '不明'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">{myScore} - {oppScore}</p>
                {ratingChange != null && (
                  <p className={`text-sm font-medium ${ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {ratingChange >= 0 ? '+' : ''}{ratingChange}pt
                  </p>
                )}
              </div>
            </div>

            {opponent?.is_active !== false && (
              <div className="mt-1 text-right">
                <Link href={`/players/${opponent?.id}`} className="text-xs text-purple-400 hover:text-purple-300">
                  相手プロフィール →
                </Link>
              </div>
            )}

            {/* コメントセクション（シングルスのみ） */}
            {isSingles && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
                {/* 自分のコメント */}
                {myComment ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">💬</span>
                    <span className="text-blue-300 font-medium flex-shrink-0">自分:</span>
                    <span className="text-gray-300 flex-1">"{myComment}"</span>
                    <button
                      onClick={() => del(match.id, myField!)}
                      className="text-gray-600 hover:text-red-400 flex-shrink-0"
                    >✕</button>
                  </div>
                ) : (
                  <div className="space-y-1">
                  {errors[match.id] && (
                    <p className="text-xs text-red-400">{errors[match.id]}</p>
                  )}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={draft}
                      onChange={e => setDrafts(prev => ({ ...prev, [match.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && myField && submit(match.id, myField)}
                      placeholder="一言コメント（30文字以内）"
                      maxLength={30}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                    />
                    <span className="text-xs text-gray-600 flex-shrink-0">{draft.length}/30</span>
                    <button
                      onClick={() => myField && submit(match.id, myField)}
                      disabled={isSav || !draft.trim()}
                      className="px-3 py-1.5 bg-purple-700/50 hover:bg-purple-700/80 disabled:opacity-40 text-white text-xs rounded-lg transition flex-shrink-0"
                    >
                      {isSav ? '...' : '送信'}
                    </button>
                  </div>
                  </div>
                )}
                {/* 相手のコメント */}
                {oppComment && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">💬</span>
                    <span className="text-purple-300 font-medium flex-shrink-0">{opponent?.name}:</span>
                    <span className="text-gray-300">"{oppComment}"</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
