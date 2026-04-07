import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-purple-900/30 bg-[#12082a]">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-gray-500">
        <span className="font-medium text-gray-400">Toyoura Shufflers Club</span>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-gray-300 transition">利用規約</Link>
          <Link href="/notices" className="hover:text-gray-300 transition">お知らせ</Link>
        </div>
        <span>© 2026 Toyoura Shufflers Club</span>
      </div>
    </footer>
  )
}