'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Banner } from '@/lib/queries/banners'

function statusLabel(banner: Banner) {
  const now = new Date()
  if (!banner.is_active) return { text: '非公開', color: 'bg-gray-700 text-gray-400' }
  if (banner.starts_at && new Date(banner.starts_at) > now)
    return { text: '公開前', color: 'bg-yellow-900/60 text-yellow-400' }
  if (banner.ends_at && new Date(banner.ends_at) < now)
    return { text: '掲載終了', color: 'bg-red-900/60 text-red-400' }
  return { text: '公開中', color: 'bg-green-900/60 text-green-400' }
}

function formatDt(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function BannerAdminClient({ banners }: { banners: Banner[] }) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return
    setDeleting(id)
    await supabase.from('banners').delete().eq('id', id)
    setDeleting(null)
    router.refresh()
  }

  if (banners.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 text-sm">
        バナーがありません。新規作成してください。
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {banners.map(banner => {
        const status = statusLabel(banner)
        return (
          <div
            key={banner.id}
            className="bg-purple-900/20 border border-purple-800/30 rounded-xl p-4 flex items-start gap-4"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                  {status.text}
                </span>
                <span className="text-xs text-gray-500">順序: {banner.sort_order}</span>
              </div>
              <p className="font-semibold text-white truncate">{banner.title}</p>
              {banner.body && (
                <p className="text-xs text-gray-400 line-clamp-1">{banner.body}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span>開始: {formatDt(banner.starts_at)}</span>
                <span>終了: {formatDt(banner.ends_at)}</span>
                {banner.link_url && (
                  <span className="text-purple-400 truncate max-w-[160px]">🔗 {banner.link_url}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/admin/banners/${banner.id}/edit`}
                className="px-3 py-1.5 text-xs bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition"
              >
                編集
              </Link>
              <button
                onClick={() => handleDelete(banner.id, banner.title)}
                disabled={deleting === banner.id}
                className="px-3 py-1.5 text-xs bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded-lg transition disabled:opacity-50"
              >
                {deleting === banner.id ? '...' : '削除'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
