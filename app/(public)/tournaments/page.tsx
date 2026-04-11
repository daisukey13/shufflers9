export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TournamentsPage() {
  const supabase = await createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  const statusLabel = (status: string) => {
    switch (status) {
      case 'open': return '受付中'
      case 'entry_closed': return 'エントリー終了'
      case 'qualifying': return '予選中'
      case 'qualifying_done': return '予選完了'
      case 'finals': return '本戦中'
      case 'finished': return '終了'
      default: return status
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-900/50 text-green-400'
      case 'entry_closed': return 'bg-yellow-900/50 text-yellow-400'
      case 'qualifying': return 'bg-blue-900/50 text-blue-400'
      case 'qualifying_done': return 'bg-purple-900/50 text-purple-400'
      case 'finals': return 'bg-red-900/50 text-red-400'
      case 'finished': return 'bg-gray-700 text-gray-400'
      default: return 'bg-gray-700 text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">🏆 大会一覧</h1>

        {!tournaments || tournaments.length === 0 ? (
          <p className="text-gray-400 text-sm">大会がありません</p>
        ) : (
          <div className="space-y-3">
            {tournaments.map(t => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl hover:bg-purple-900/40 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t.format === 'doubles' ? 'ダブルス' : '個人戦'}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(t.status)}`}>
                  {statusLabel(t.status)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}