import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-yellow-600/20 bg-[#0b1520]/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-amber-100 text-sm">Toyoura Shufflers Club</p>
            <p className="text-xs text-gray-500 mt-0.5">© {year} Toyoura Shufflers Club</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link href="/about" className="hover:text-amber-400 transition">
              当サイトについて
            </Link>
            <Link href="/terms" className="hover:text-amber-400 transition">
              利用規約
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
