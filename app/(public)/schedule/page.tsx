export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ScheduleClient from './ScheduleClient'
import type { EventItem } from './ScheduleClient'

export default async function SchedulePage() {
  const supabase = await createClient()

  // 過去30日〜未来全て
  const from = new Date()
  from.setDate(from.getDate() - 30)

  const { data: events } = await supabase
    .from('events')
    .select(`
      id, title, description, event_type, starts_at, ends_at, venue, notes,
      event_participants(
        player:players(id, name, avatar_url)
      )
    `)
    .eq('is_published', true)
    .gte('starts_at', from.toISOString())
    .order('starts_at', { ascending: true })

  // ログイン中のプレーヤーIDと参加イベントIDを取得
  const { data: { user } } = await supabase.auth.getUser()
  let currentPlayerId: string | null = null
  let myEventIds: string[] = []

  if (user) {
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (player) {
      currentPlayerId = player.id
      const { data: myParticipations } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('player_id', player.id)
      myEventIds = (myParticipations ?? []).map(p => p.event_id)
    }
  }

  const eventItems: EventItem[] = (events ?? []).map((ev: any) => ({
    id: ev.id,
    title: ev.title,
    description: ev.description,
    event_type: ev.event_type,
    starts_at: ev.starts_at,
    ends_at: ev.ends_at,
    venue: ev.venue,
    notes: ev.notes,
    participants: (ev.event_participants ?? [])
      .map((ep: any) => ep.player)
      .filter(Boolean),
  }))

  return (
    <ScheduleClient
      events={eventItems}
      currentPlayerId={currentPlayerId}
      initialMyEventIds={myEventIds}
    />
  )
}
