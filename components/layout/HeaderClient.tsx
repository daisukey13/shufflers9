'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/rankings',   label: 'ランキング',   icon: '🏆' },
  { href: '/players',    label: 'メンバー',     icon: '👥' },
  { href: '/matches',    label: '試合結果',     icon: '📋' },
  { href: '/tournaments',label: '大会',         icon: '🥇' },
  { href: '/schedule',   label: 'スケジュール', icon: '📅' },
]

export default function HeaderClient({
  isLoggedIn,
  avatarUrl,
}: {
  isLoggedIn: boolean
  avatarUrl: string | null
}) {
  const pathname = usePathname()

  return (
    <header className="bg-[#0b1520]/95 border-b border-yellow-600/20 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img
            src="/shuffleboard-puck-blue.png"
            alt="ホーム"
            className="w-10 h-10 object-contain hover:opacity-80 transition"
          />
        </Link>
        <nav className="flex gap-1 sm:gap-5">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition ${
                pathname.startsWith(item.href)
                  ? 'text-amber-400'
                  : 'text-gray-400 hover:text-amber-300'
              }`}
            >
              <span className="text-xl sm:text-base leading-none">{item.icon}</span>
              <span className={`hidden sm:block text-xs font-medium ${pathname.startsWith(item.href) ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
        <Link
          href="/mypage"
          className="w-10 h-10 rounded-full border-2 border-amber-500/60 overflow-hidden flex items-center justify-center hover:border-amber-400 transition flex-shrink-0"
        >
          {isLoggedIn && avatarUrl ? (
            <img src={avatarUrl} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">👤</span>
          )}
        </Link>
      </div>
    </header>
  )
}
