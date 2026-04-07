import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: playerCount },
    { count: matchCount },
    { count: teamCount },
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('singles_matches').select('*', { count: 'exact', head: true }),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'メンバー数', value: playerCount ?? 0 },
          { label: '試合数', value: matchCount ?? 0 },
          { label: 'チーム数', value: teamCount ?? 0 },
        ].map(stat => (
          <div key={stat.label} className="p-6 bg-purple-900/20 border border-purple-800/30 rounded-2xl text-center">
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* クイックリンク */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { href: '/admin/players', label: '👤 メンバー管理', sub: 'メンバーの追加・編集' },
          { href: '/admin/notices', label: '📢 お知らせ管理', sub: 'お知らせの作成・編集' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="p-6 bg-purple-900/20 border border-purple-800/30 rounded-2xl hover:bg-purple-900/40 transition"
          >
            <p className="font-semibold text-white">{item.label}</p>
            <p className="text-sm text-gray-400 mt-1">{item.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}