import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const URL_REGEX = /https?:\/\/[^\s\u3000\u3001\u3002\uff0e\uff0c\uff01\uff1f\u300d\u300f\u3011\u3015\uff09\uff3d\uff5d]+/g

function renderBody(text: string) {
  const parts = text.split(URL_REGEX)
  const urls = text.match(URL_REGEX) ?? []
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {urls[i] && (
        <a
          href={urls[i]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 underline break-all"
        >
          {urls[i]}
        </a>
      )}
    </span>
  ))
}

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
          {renderBody(notice.body)}
        </div>
      </article>
    </div>
  )
}