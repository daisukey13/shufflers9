import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminTournamentsPage() {
  const supabase = await createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

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

      <div className="space-y-2">
        {!tournaments || tournaments.length === 0 ? (
          <p className="text-gray-400 text-sm">大会がありません</p>
        ) : (
          tournaments.map(t => (
            <div key={t.id} className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{t.name}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.status === 'finished' ? 'bg-gray-700 text-gray-400' :
                    t.status === 'finals' ? 'bg-red-900/50 text-red-400' :
                    t.status === 'qualifying' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-green-900/50 text-green-400'
                  }`}>
                    {t.status === 'open' ? '受付中' :
                     t.status === 'qualifying' ? '予選中' :
                     t.status === 'finals' ? '本戦中' : '終了'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {t.format === 'doubles' ? 'ダブルス' : '個人戦'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
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