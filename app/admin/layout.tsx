import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!player?.is_admin) redirect('/')

  return (
    <div className="min-h-screen bg-transparent text-white">
      <header className="bg-[#12082a]/90 border-b border-purple-900/40 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition">← サイトへ</Link>
          <span className="text-white font-bold">管理画面</span>
          <nav className="flex gap-4 ml-4">
            {[
              { href: '/admin', label: 'ダッシュボード' },
              { href: '/admin/players', label: 'メンバー管理' },
              { href: '/admin/matches', label: '🏒 試合管理' },
              { href: '/admin/matches/register', label: '➕ 試合登録' },
              { href: '/admin/tournaments', label: '🏆 大会管理' },
              { href: '/admin/notices', label: 'お知らせ' },
              { href: '/admin/ranking-config', label: '⚙️ ランキング設定' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-gray-400 hover:text-white transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}