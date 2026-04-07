import { getTeamById, getTeamMembers } from '@/lib/queries/teams'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function TeamPage({ params }: { params: { id: string } }) {
  const [team, members] = await Promise.all([
    getTeamById(params.id),
    getTeamMembers(params.id),
  ])

  if (!team) notFound()

  const winRate = team.wins + team.losses > 0
    ? Math.round((team.wins / (team.wins + team.losses)) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* チームプロフィール */}
      <div className="flex items-center gap-6 p-6 bg-white rounded-xl border border-gray-200">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-4xl flex-shrink-0">
          {team.avatar_url ? (
            <img src={team.avatar_url} className="w-20 h-20 rounded-full object-cover" />
          ) : '👥'}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          <div className="flex gap-6 mt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{team.rating}</p>
              <p className="text-xs text-gray-400">レーティング</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{team.wins}</p>
              <p className="text-xs text-gray-400">勝利</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{team.losses}</p>
              <p className="text-xs text-gray-400">敗北</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{winRate}%</p>
              <p className="text-xs text-gray-400">勝率</p>
            </div>
          </div>
        </div>
      </div>

      {/* メンバー */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">メンバー</h2>
        {members.length === 0 ? (
          <p className="text-gray-400 text-sm">メンバーがいません</p>
        ) : (
          <div className="space-y-2">
            {members.map(member => (
              <Link
                key={member.id}
                href={`/players/${member.player_id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {member.player?.avatar_url ? (
                    <img src={member.player.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                  ) : '👤'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{member.player?.name}</p>
                </div>
                <span className="font-bold text-blue-600">{member.player?.rating} pt</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}