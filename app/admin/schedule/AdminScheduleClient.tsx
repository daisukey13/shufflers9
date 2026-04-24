'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type EventRow = {
  id: string
  title: string
  event_type: string
  starts_at: string
  ends_at: string | null
  venue: string | null
  is_published: boolean
  participant_count: number
}

const TYPE_LABELS: Record<string, string> = {
  practice: '練習',
  unofficial: '非公式',
  tournament: '大会',
}

export default function AdminScheduleClient({ events }: { events: EventRow[] }) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？参加予定者の情報も削除されます。`)) return
    setDeleting(id)
    await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    setDeleting(null)
    router.refresh()
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const weekdays = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}） ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-3">
      {events.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-10">イベントがありません</p>
      )}
      {events.map(ev => (
        <div
          key={ev.id}
          className="bg-purple-900/20 border border-purple-800/30 rounded-xl p-4 flex items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300">
                {TYPE_LABELS[ev.event_type] ?? ev.event_type}
              </span>
              {!ev.is_published && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">非公開</span>
              )}
              <span className="text-xs text-gray-400">{formatDate(ev.starts_at)}</span>
            </div>
            <p className="font-semibold text-white truncate">{ev.title}</p>
            {ev.venue && <p className="text-xs text-gray-500">📍 {ev.venue}</p>}
            <p className="text-xs text-gray-500 mt-0.5">参加予定: {ev.participant_count}名</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/admin/schedule/${ev.id}/edit`}
              className="px-3 py-1.5 text-xs bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition"
            >
              編集
            </Link>
            <button
              onClick={() => handleDelete(ev.id, ev.title)}
              disabled={deleting === ev.id}
              className="px-3 py-1.5 text-xs bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded-lg transition disabled:opacity-50"
            >
              {deleting === ev.id ? '...' : '削除'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
