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

  const menuItems = [
    { href: '/admin/players', label: '👤 メンバー管理', sub: 'メンバーの追加・編集・脱退処理', icon: null },
    { href: '/admin/matches', label: '試合管理', sub: '試合の編集・削除', icon: null, emoji: '📋' },
    { href: '/admin/matches/register', label: 'シングルス登録', sub: '個人戦の結果登録', icon: '/shuffleboard-puck-blue.png' },
    { href: '/admin/matches/register/doubles', label: 'ダブルス登録', sub: 'ダブルス試合の結果登録', icon: '/shuffleboard-puck-red.png' },
    { href: '/admin/tournaments', label: '🏆 大会管理', sub: '大会の作成・予選・本戦管理', icon: null },
    { href: '/admin/notices', label: '📢 お知らせ管理', sub: 'お知らせの作成・編集', icon: null },
    { href: '/admin/ranking-config', label: '⚙️ ランキング設定', sub: 'ランキング計算パラメータ設定', icon: null },
    { href: '/admin/line', label: '💬 LINE通知', sub: 'フォロワー全員へ一斉配信', icon: null },
    { href: '/admin/schedule', label: '📅 スケジュール管理', sub: '練習・イベント日程の作成・編集', icon: null },
    { href: '/admin/banners', label: '📣 バナー管理', sub: 'トップページのバナーを作成・編集', icon: null },
  ]

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

      {/* メニュー */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {menuItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl hover:bg-purple-900/40 transition"
          >
            <div className="flex items-center gap-2 mb-1">
              {item.icon && (
                <img src={item.icon} className="w-5 h-5 object-contain" />
              )}
              <p className="font-semibold text-white">{item.label}</p>
            </div>
            <p className="text-sm text-gray-400">{item.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}