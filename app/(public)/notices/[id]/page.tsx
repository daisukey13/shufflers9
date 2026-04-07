import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function NoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: notice } = await supabase
    .from('notices')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!notice) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/notices" className="text-sm text-gray-400 hover:text-white transition">
        ← お知らせ一覧
      </Link>

      <article className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{notice.title}</h1>
          <p className="text-xs text-gray-400">
            {new Date(notice.published_at).toLocaleDateString('ja-JP')}
          </p>
        </div>
        <hr className="border-purple-800/30" />
        <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
          {notice.body}
        </div>
      </article>
    </div>
  )
}