export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AdminScheduleClient from './AdminScheduleClient'

export default async function AdminSchedulePage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select(`
      id, title, event_type, starts_at, ends_at, venue, is_published,
      event_participants(count)
    `)
    .order('starts_at', { ascending: false })

  const items = (events ?? []).map((ev: any) => ({
    id: ev.id,
    title: ev.title,
    event_type: ev.event_type,
    starts_at: ev.starts_at,
    ends_at: ev.ends_at,
    venue: ev.venue,
    is_published: ev.is_published,
    participant_count: ev.event_participants?.[0]?.count ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📅 スケジュール管理</h1>
        <Link
          href="/admin/schedule/new"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
        >
          ＋ 新規イベント作成
        </Link>
      </div>

      <AdminScheduleClient events={items} />
    </div>
  )
}
