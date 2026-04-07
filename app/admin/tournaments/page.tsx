import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminTournamentsPage() {
  const supabase = await createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  const statusLabel = (status: string) => {
    if (status === 'open') return { label: '参加受付中', color: 'text-blue-400 bg-blue-900/30' }
    if (status === 'in_progress') return { label: '開催中', color: 'text-green-400 bg-green-900/30' }
    return { label: '終了', color: 'text-gray-400 bg-gray-800' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏆 大会管理</h1>
        <Link
          href="/admin/tournaments/new"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
        >
          + 大会を作成
        </Link>
      </div>

      <div className="space-y-3">
        {tournaments?.length === 0 && (
          <p className="text-gray-400 text-sm">大会がありません</p>
        )}
        {tournaments?.map(tournament => {
          const { label, color } = statusLabel(tournament.status)
          return (
            <Link
              key={tournament.id}
              href={`/admin/tournaments/${tournament.id}`}
              className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl hover:bg-purple-900/40 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
                    {label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {tournament.type === 'singles' ? '個人戦' : 'チーム戦'}
                  </span>
                </div>
                <p className="font-medium text-white truncate">{tournament.name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(tournament.created_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
              <span className="text-gray-400 text-sm">→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}