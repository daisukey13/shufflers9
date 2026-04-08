import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TournamentsPage() {
  const supabase = await createClient()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

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
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  t.status === 'finished' ? 'bg-gray-700 text-gray-400' :
                  t.status === 'finals' ? 'bg-red-900/50 text-red-400' :
                  t.status === 'qualifying' ? 'bg-blue-900/50 text-blue-400' :
                  'bg-green-900/50 text-green-400'
                }`}>
                  {t.status === 'open' ? '受付中' :
                   t.status === 'qualifying' ? '予選中' :
                   t.status === 'finals' ? '本戦中' : '終了'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}