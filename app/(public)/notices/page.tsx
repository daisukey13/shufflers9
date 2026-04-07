import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function NoticesPage() {
  const supabase = await createClient()
  const { data: notices } = await supabase
    .from('notices')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white">📢 お知らせ</h1>

      {notices?.length === 0 ? (
        <p className="text-gray-400 text-sm">お知らせはありません</p>
      ) : (
        <div className="space-y-3">
          {notices?.map(notice => (
            <Link
              key={notice.id}
              href={`/notices/${notice.id}`}
              className="block p-5 bg-purple-900/20 border border-purple-800/30 rounded-xl hover:bg-purple-900/40 transition"
            >
              <p className="font-semibold text-white mb-1">{notice.title}</p>
              <p className="text-xs text-gray-400">
                {new Date(notice.published_at).toLocaleDateString('ja-JP')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}