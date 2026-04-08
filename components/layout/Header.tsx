'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/rankings', label: 'ランキング' },
  { href: '/players', label: 'メンバー' },
  { href: '/matches', label: '試合結果' },
  { href: '/tournaments', label: '大会' },
]

export default function Header() {
  const pathname = usePathname()
  return (
    <header className="bg-[#12082a]/90 border-b border-purple-900/40 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-lg tracking-wider">🏒</Link>
        <nav className="flex gap-4 sm:gap-6">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition ${
                pathname.startsWith(item.href)
                  ? 'text-purple-400 font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/mypage"
          className="w-9 h-9 rounded-full border-2 border-purple-600 flex items-center justify-center text-purple-400 hover:text-white hover:border-purple-400 transition"
        >
          👤
        </Link>
      </div>
    </header>
  )
}