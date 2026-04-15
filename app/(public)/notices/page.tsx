import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const PER_PAGE = 10

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? '1'))

  const supabase = await createClient()

  const { count } = await supabase
    .from('notices')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true)

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  const { data: notices } = await supabase
    .from('notices')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE - 1)

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white">📢 お知らせ</h1>

      {notices?.length === 0 ? (
        <p className="text-gray-400 text-sm">お知らせはありません</p>
      ) : (
        <>
          <div className="space-y-3">
            {notices?.map(notice => {
              const publishedAt = new Date(notice.published_at)
              const isNew = (Date.now() - publishedAt.getTime()) < 7 * 24 * 60 * 60 * 1000
              const dateStr = publishedAt.toLocaleDateString('ja-JP')
              const preview = notice.body
                ? notice.body.slice(0, 15) + (notice.body.length > 15 ? '...' : '')
                : ''
              return (
                <Link
                  key={notice.id}
                  href={`/notices/${notice.id}`}
                  className="block p-5 bg-purple-900/20 border border-purple-800/30 rounded-xl hover:bg-purple-900/40 transition"
                >
                  <div className="flex items-start gap-2 mb-1">
                    {isNew && (
                      <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
                        NEW
                      </span>
                    )}
                    <p className="font-semibold text-white">{notice.title}</p>
                  </div>
                  {preview && (
                    <p className="text-sm text-gray-400 mb-1">{preview}</p>
                  )}
                  <p className="text-xs text-gray-500">{dateStr}</p>
                </Link>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              {currentPage > 1 && (
                <Link
                  href={`/notices?page=${currentPage - 1}`}
                  className="px-4 py-2 bg-purple-900/30 border border-purple-800/30 rounded-lg text-sm text-purple-400 hover:bg-purple-900/50 transition"
                >
                  ← 前へ
                </Link>
              )}
              <span className="text-sm text-gray-400">{currentPage} / {totalPages}</span>
              {currentPage < totalPages && (
                <Link
                  href={`/notices?page=${currentPage + 1}`}
                  className="px-4 py-2 bg-purple-900/30 border border-purple-800/30 rounded-lg text-sm text-purple-400 hover:bg-purple-900/50 transition"
                >
                  次へ →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
