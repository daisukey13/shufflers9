import { getTeams } from '@/lib/queries/teams'
import Link from 'next/link'

export default async function TeamsPage() {
  const teams = await getTeams()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">👥 チーム一覧</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.length === 0 ? (
          <p className="text-gray-400 text-sm">チームがありません</p>
        ) : (
          teams.map(team => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                {team.avatar_url ? (
                  <img src={team.avatar_url} className="w-12 h-12 rounded-full object-cover" />
                ) : '👥'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{team.name}</p>
                <p className="text-xs text-gray-400">{team.wins}勝 {team.losses}敗</p>
              </div>
              <span className="font-bold text-blue-600 flex-shrink-0">{team.rating} pt</span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}