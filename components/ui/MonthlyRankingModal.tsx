'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { MonthlyRankingEntry } from '@/lib/queries/monthly-ranking'

const MEDAL = ['🥇', '🥈', '🥉']
const MEDAL_BG = [
  'from-yellow-500/30 to-amber-700/20 border-yellow-400/60',
  'from-gray-400/20 to-gray-600/10 border-gray-400/50',
  'from-orange-500/20 to-orange-700/10 border-orange-500/50',
]
const RANK_COLOR = [
  'text-yellow-400',
  'text-gray-300',
  'text-orange-400',
  'text-green-400',
  'text-green-400',
]

type Props = {
  entries: MonthlyRankingEntry[]
  month: string
}

export default function MonthlyRankingModal({ entries, month }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // 50%の確率で表示
    if (Math.random() < 0.5) {
      setOpen(true)
    }
  }, [])

  if (!open || entries.length === 0) return null

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0f1f35 0%, #0a1628 60%, #111827 100%)',
          border: '1px solid rgba(250,200,50,0.25)',
          boxShadow: '0 0 40px rgba(250,200,50,0.15), 0 20px 60px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 transition flex items-center justify-center text-white font-bold text-sm"
        >
          ✕
        </button>

        {/* ヘッダー */}
        <div className="px-5 pt-5 pb-3 text-center"
          style={{ background: 'linear-gradient(180deg, rgba(250,180,20,0.12) 0%, transparent 100%)' }}
        >
          <div className="text-xs text-amber-400/80 font-semibold tracking-widest uppercase mb-1">Monthly Results</div>
          <h2 className="text-lg font-extrabold text-amber-100 leading-tight">
            🏆 {month} 月間勝敗ランキング
          </h2>
        </div>

        {/* TOP 3 */}
        <div className="px-4 pb-3 space-y-2">
          {top3.map((entry, i) => (
            <Link
              key={entry.id}
              href={`/players/${entry.id}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r border transition hover:opacity-90 ${MEDAL_BG[i]}`}
            >
              {/* 順位 */}
              <div className="flex flex-col items-center w-10 flex-shrink-0">
                <span className="text-xl leading-none">{MEDAL[i]}</span>
                <span className={`text-xs font-extrabold ${RANK_COLOR[i]}`}>{i + 1}位</span>
              </div>

              {/* アバター */}
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-amber-500/40 flex-shrink-0 bg-gray-800">
                {entry.avatar_url
                  ? <img src={entry.avatar_url} className="w-full h-full object-cover" />
                  : <span className="text-2xl flex items-center justify-center h-full">👤</span>
                }
              </div>

              {/* 名前・住所 */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-100 truncate text-sm">{entry.name}</p>
                {entry.address && (
                  <p className="text-xs text-gray-400 truncate">{entry.address}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  現在 <span className="text-amber-300 font-semibold">{entry.currentRank}位</span>
                  <span className="ml-1 text-gray-500">RP {entry.rating}</span>
                </p>
              </div>

              {/* 勝敗 */}
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-base font-extrabold text-green-400 leading-tight">
                  {entry.wins}勝
                </span>
                <span className="text-sm font-bold text-red-400 leading-tight">
                  {entry.losses}敗
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* 4位・5位 */}
        {rest.length > 0 && (
          <div className="px-4 pb-4 space-y-1.5">
            <div className="h-px bg-amber-500/10 mb-2" />
            {rest.map((entry, i) => {
              const rank = i + 4
              return (
                <Link
                  key={entry.id}
                  href={`/players/${entry.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition"
                >
                  <div className={`w-8 h-8 rounded-full font-extrabold flex items-center justify-center text-sm flex-shrink-0 ${RANK_COLOR[rank - 1]} bg-black/30`}>
                    {rank}
                  </div>
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-600 flex-shrink-0 bg-gray-800">
                    {entry.avatar_url
                      ? <img src={entry.avatar_url} className="w-full h-full object-cover" />
                      : <span className="text-lg flex items-center justify-center h-full">👤</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-200 truncate text-sm">{entry.name}</p>
                    <p className="text-xs text-gray-500">
                      現在 {entry.currentRank}位 · RP {entry.rating}
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm font-bold flex-shrink-0">
                    <span className="text-green-400">{entry.wins}勝</span>
                    <span className="text-red-400">{entry.losses}敗</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* フッター */}
        <div className="px-4 py-2 border-t border-amber-500/10 text-center">
          <p className="text-xs text-gray-600">タップして閉じる</p>
        </div>
      </div>
    </div>
  )
}
