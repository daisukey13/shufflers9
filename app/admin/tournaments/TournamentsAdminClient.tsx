'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Tournament = {
  id: string
  name: string
  status: string
  format: string
  description: string | null
}

const STATUS_LABELS: Record<string, string> = {
  open: '受付中',
  entry_closed: 'エントリー終了',
  qualifying: '予選中',
  qualifying_done: '予選完了',
  finals: '本戦中',
  finished: '終了',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-900/50 text-green-400',
  entry_closed: 'bg-yellow-900/50 text-yellow-400',
  qualifying: 'bg-blue-900/50 text-blue-400',
  qualifying_done: 'bg-purple-900/50 text-purple-400',
  finals: 'bg-red-900/50 text-red-400',
  finished: 'bg-gray-700 text-gray-400',
}

const NEXT_STATUS: Record<string, { status: string; label: string; color: string }> = {
  open: { status: 'entry_closed', label: 'エントリー締切', color: 'bg-yellow-600 hover:bg-yellow-700' },
  entry_closed: { status: 'qualifying', label: '予選開始', color: 'bg-blue-600 hover:bg-blue-700' },
  qualifying: { status: 'qualifying_done', label: '予選完了', color: 'bg-purple-600 hover:bg-purple-700' },
  qualifying_done: { status: 'finals', label: '本戦開始', color: 'bg-red-600 hover:bg-red-700' },
  finals: { status: 'finished', label: '大会終了', color: 'bg-gray-600 hover:bg-gray-700' },
}

export default function TournamentsAdminClient({ tournaments }: { tournaments: Tournament[] }) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleStatusChange = async (tournament: Tournament) => {
  const next = NEXT_STATUS[tournament.status]
  if (!next) return
  if (!confirm(`「${tournament.name}」を「${next.label}」しますか？`)) return

  setLoading(tournament.id)

  await supabase
    .from('tournaments')
    .update({ status: next.status })
    .eq('id', tournament.id)

  // 大会終了時に戦績を自動集計
  if (next.status === 'finished') {
    await supabase.rpc('update_tournament_stats', {
      p_tournament_id: tournament.id,
    })
  }

  setLoading(null)
  router.refresh()
}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏆 大会管理</h1>
        <Link
          href="/admin/tournaments/new"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
        >
          + 新規大会
        </Link>
      </div>

      <div className="space-y-3">
        {tournaments.length === 0 ? (
          <p className="text-gray-400 text-sm">大会がありません</p>
        ) : (
          tournaments.map(t => (
            <div key={t.id} className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{t.name}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? 'bg-gray-700 text-gray-400'}`}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {t.format === 'doubles' ? 'ダブルス' : '個人戦'}
                    </span>
                  </div>
                </div>

                {/* ステータス変更ボタン */}
                {NEXT_STATUS[t.status] && (
                  <button
                    onClick={() => handleStatusChange(t)}
                    disabled={loading === t.id}
                    className={`text-xs px-3 py-1.5 rounded-lg text-white font-medium transition disabled:opacity-50 ${NEXT_STATUS[t.status].color}`}
                  >
                    {loading === t.id ? '処理中...' : NEXT_STATUS[t.status].label}
                  </button>
                )}
              </div>

              {/* 管理リンク */}
              <div className="flex gap-2 flex-wrap">
                <Link
                  href={`/admin/tournaments/${t.id}/entries`}
                  className="text-xs px-3 py-1 bg-green-700/50 hover:bg-green-600/50 rounded-lg text-green-300 transition"
                >
                  📋 エントリー管理
                </Link>
                <Link
                  href={`/admin/tournaments/${t.id}/qualifying`}
                  className="text-xs px-3 py-1 bg-blue-700/50 hover:bg-blue-600/50 rounded-lg text-blue-300 transition"
                >
                  予選管理
                </Link>
                <Link
                  href={`/admin/tournaments/${t.id}/finals`}
                  className="text-xs px-3 py-1 bg-orange-700/50 hover:bg-orange-600/50 rounded-lg text-orange-300 transition"
                >
                  本戦管理
                </Link>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="text-xs px-3 py-1 bg-purple-700/50 hover:bg-purple-600/50 rounded-lg text-purple-300 transition"
                >
                  公開ページ
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}