import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminNoticesPage() {
  const supabase = await createClient()
  const { data: notices } = await supabase
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📢 お知らせ管理</h1>
        <Link
          href="/admin/notices/new"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
        >
          + 新規作成
        </Link>
      </div>

      <div className="space-y-3">
        {notices?.length === 0 && (
          <p className="text-gray-400 text-sm">お知らせがありません</p>
        )}
        {notices?.map(notice => (
          <div
            key={notice.id}
            className="flex items-center gap-4 p-4 bg-purple-900/20 border border-purple-800/30 rounded-xl"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  notice.is_published
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-gray-800 text-gray-400'
                }`}>
                  {notice.is_published ? '公開中' : '下書き'}
                </span>
                <p className="font-medium text-white truncate">{notice.title}</p>
              </div>
              <p className="text-xs text-gray-400">
                {new Date(notice.created_at).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <Link
              href={`/admin/notices/${notice.id}`}
              className="text-sm text-purple-400 hover:text-purple-300 transition flex-shrink-0"
            >
              編集 →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}