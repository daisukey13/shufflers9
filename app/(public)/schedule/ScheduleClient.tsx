'use client'

import { useState } from 'react'

export type EventItem = {
  id: string
  title: string
  description: string | null
  event_type: 'practice' | 'unofficial' | 'tournament'
  starts_at: string
  ends_at: string | null
  venue: string | null
  notes: string | null
  participants: { id: string; name: string; avatar_url: string | null }[]
}

const TYPE_CONFIG = {
  practice:    { label: '練習',     color: 'bg-blue-900/60 text-blue-300',   border: 'border-l-blue-500' },
  unofficial:  { label: '非公式',   color: 'bg-purple-900/60 text-purple-300', border: 'border-l-purple-500' },
  tournament:  { label: '大会',     color: 'bg-yellow-900/60 text-yellow-300', border: 'border-l-yellow-500' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  return {
    date: `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    month: `${d.getFullYear()}年${d.getMonth() + 1}月`,
    sortKey: d.getFullYear() * 100 + d.getMonth(),
  }
}

export default function ScheduleClient({
  events,
  currentPlayerId,
  initialMyEventIds,
}: {
  events: EventItem[]
  currentPlayerId: string | null
  initialMyEventIds: string[]
}) {
  const [myEventIds, setMyEventIds] = useState<Set<string>>(new Set(initialMyEventIds))
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  // ローカルで参加者リストを管理（楽観的更新用）
  const [localParticipants, setLocalParticipants] = useState<
    Record<string, { id: string; name: string; avatar_url: string | null }[]>
  >({})

  const handleToggle = async (event: EventItem, currentPlayer: { id: string; name: string; avatar_url: string | null } | null) => {
    if (!currentPlayerId || !currentPlayer) return
    setLoadingIds(prev => new Set(prev).add(event.id))

    const isJoined = myEventIds.has(event.id)
    const participants = localParticipants[event.id] ?? event.participants

    // 楽観的更新
    if (isJoined) {
      setMyEventIds(prev => { const n = new Set(prev); n.delete(event.id); return n })
      setLocalParticipants(prev => ({
        ...prev,
        [event.id]: participants.filter(p => p.id !== currentPlayerId),
      }))
    } else {
      setMyEventIds(prev => new Set(prev).add(event.id))
      setLocalParticipants(prev => ({
        ...prev,
        [event.id]: [...participants, currentPlayer],
      }))
    }

    try {
      await fetch(`/api/events/${event.id}/join`, {
        method: isJoined ? 'DELETE' : 'POST',
      })
    } catch {
      // ロールバック
      if (isJoined) {
        setMyEventIds(prev => new Set(prev).add(event.id))
        setLocalParticipants(prev => ({ ...prev, [event.id]: participants }))
      } else {
        setMyEventIds(prev => { const n = new Set(prev); n.delete(event.id); return n })
        setLocalParticipants(prev => ({ ...prev, [event.id]: participants }))
      }
    } finally {
      setLoadingIds(prev => { const n = new Set(prev); n.delete(event.id); return n })
    }
  }

  // 月ごとにグループ化
  const groups = new Map<string, { sortKey: number; events: EventItem[] }>()
  for (const ev of events) {
    const { month, sortKey } = formatDate(ev.starts_at)
    if (!groups.has(month)) groups.set(month, { sortKey, events: [] })
    groups.get(month)!.events.push(ev)
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => a[1].sortKey - b[1].sortKey)

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">📅 スケジュール</h1>
          <p className="text-xs text-gray-500 mt-1">練習・非公式イベント・大会の日程</p>
        </div>

        {events.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-16">予定されているイベントはありません</p>
        )}

        {sortedGroups.map(([month, { events: monthEvents }]) => (
          <div key={month} className="space-y-3">
            <h2 className="text-sm font-mono text-purple-400/70 tracking-widest uppercase">── {month} ──</h2>
            {monthEvents.map(ev => {
              const { date, time } = formatDate(ev.starts_at)
              const endInfo = ev.ends_at ? formatDate(ev.ends_at) : null
              const cfg = TYPE_CONFIG[ev.event_type] ?? TYPE_CONFIG.practice
              const isJoined = myEventIds.has(ev.id)
              const isLoading = loadingIds.has(ev.id)
              const participants = localParticipants[ev.id] ?? ev.participants
              const count = participants.length
              const preview = participants.slice(0, 6)

              return (
                <div
                  key={ev.id}
                  className={`bg-purple-900/10 border border-purple-800/20 border-l-4 ${cfg.border} rounded-2xl p-5 space-y-4`}
                >
                  {/* ヘッダー */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{date}</span>
                        <span className="text-xs text-gray-500">
                          {time}〜{endInfo ? endInfo.time : ''}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-lg leading-snug">{ev.title}</h3>
                      {ev.venue && (
                        <p className="text-xs text-gray-400">📍 {ev.venue}</p>
                      )}
                    </div>
                  </div>

                  {/* 説明・メモ */}
                  {(ev.description || ev.notes) && (
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {ev.description}{ev.description && ev.notes ? '\n' : ''}{ev.notes}
                    </p>
                  )}

                  {/* 参加者 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {preview.map(p => (
                          <div
                            key={p.id}
                            title={p.name}
                            className="w-8 h-8 rounded-full border-2 border-[#0d0721] overflow-hidden bg-gray-800 flex-shrink-0"
                          >
                            {p.avatar_url
                              ? <img src={p.avatar_url} className="w-full h-full object-cover" />
                              : <span className="text-sm flex items-center justify-center h-full">👤</span>
                            }
                          </div>
                        ))}
                        {count > 6 && (
                          <div className="w-8 h-8 rounded-full border-2 border-[#0d0721] bg-purple-900/60 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-purple-300 font-bold">+{count - 6}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">
                        {count > 0 ? `${count}名が参加予定` : 'まだ参加予定者なし'}
                      </span>
                    </div>

                    {/* 参加者名一覧 */}
                    {count > 0 && (
                      <p className="text-xs text-gray-500">
                        {participants.map(p => p.name).join('・')}
                      </p>
                    )}
                  </div>

                  {/* RSVP ボタン */}
                  {currentPlayerId ? (
                    <button
                      onClick={() => {
                        const me = participants.find(p => p.id === currentPlayerId)
                          ?? { id: currentPlayerId, name: '', avatar_url: null }
                        handleToggle(ev, me)
                      }}
                      disabled={isLoading}
                      className={`w-full py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 ${
                        isJoined
                          ? 'bg-green-800/50 border border-green-600/40 text-green-300 hover:bg-red-900/30 hover:border-red-600/40 hover:text-red-300'
                          : 'bg-purple-700/40 border border-purple-600/40 text-white hover:bg-purple-700/70'
                      }`}
                    >
                      {isLoading ? '...' : isJoined ? '✅ 参加予定（タップでキャンセル）' : '＋ 参加予定に追加'}
                    </button>
                  ) : (
                    <p className="text-xs text-gray-600 text-center">
                      参加予定を登録するには<a href="/login" className="text-purple-400 hover:underline ml-1">ログイン</a>が必要です
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
