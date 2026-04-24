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
  practice:    { label: '練習',   color: 'bg-blue-900/60 text-blue-300',     border: 'border-l-blue-500',   dot: 'bg-blue-400' },
  unofficial:  { label: '非公式', color: 'bg-purple-900/60 text-purple-300', border: 'border-l-purple-500', dot: 'bg-purple-400' },
  tournament:  { label: '大会',   color: 'bg-yellow-900/60 text-yellow-300', border: 'border-l-yellow-500', dot: 'bg-yellow-400' },
}

function toLocalDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

function EventCard({
  ev,
  isJoined,
  isLoading,
  currentPlayerId,
  participants,
  onToggle,
}: {
  ev: EventItem
  isJoined: boolean
  isLoading: boolean
  currentPlayerId: string | null
  participants: { id: string; name: string; avatar_url: string | null }[]
  onToggle: (ev: EventItem, me: { id: string; name: string; avatar_url: string | null } | null) => void
}) {
  const { date, time } = formatDate(ev.starts_at)
  const endInfo = ev.ends_at ? formatDate(ev.ends_at) : null
  const cfg = TYPE_CONFIG[ev.event_type] ?? TYPE_CONFIG.practice
  const count = participants.length
  const preview = participants.slice(0, 6)

  return (
    <div className={`bg-purple-900/10 border border-purple-800/20 border-l-4 ${cfg.border} rounded-2xl p-5 space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
            <span className="text-xs text-gray-400">{date}</span>
            <span className="text-xs text-gray-500">{time}〜{endInfo ? endInfo.time : ''}</span>
          </div>
          <h3 className="font-bold text-white text-lg leading-snug">{ev.title}</h3>
          {ev.venue && <p className="text-xs text-gray-400">📍 {ev.venue}</p>}
        </div>
      </div>

      {(ev.description || ev.notes) && (
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
          {ev.description}{ev.description && ev.notes ? '\n' : ''}{ev.notes}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {preview.map(p => (
              <div key={p.id} title={p.name}
                className="w-8 h-8 rounded-full border-2 border-[#0d0721] overflow-hidden bg-gray-800 flex-shrink-0">
                {p.avatar_url
                  ? <img src={p.avatar_url} className="w-full h-full object-cover" />
                  : <span className="text-sm flex items-center justify-center h-full">👤</span>}
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
        {count > 0 && (
          <p className="text-xs text-gray-500">{participants.map(p => p.name).join('・')}</p>
        )}
      </div>

      {currentPlayerId ? (
        <button
          onClick={() => {
            const me = participants.find(p => p.id === currentPlayerId)
              ?? { id: currentPlayerId, name: '', avatar_url: null }
            onToggle(ev, me)
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
  const [localParticipants, setLocalParticipants] = useState<
    Record<string, { id: string; name: string; avatar_url: string | null }[]>
  >({})

  // カレンダー用 state
  const today = new Date()
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth()) // 0-11
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const handleToggle = async (
    event: EventItem,
    currentPlayer: { id: string; name: string; avatar_url: string | null } | null
  ) => {
    if (!currentPlayerId || !currentPlayer) return
    setLoadingIds(prev => new Set(prev).add(event.id))
    const isJoined = myEventIds.has(event.id)
    const participants = localParticipants[event.id] ?? event.participants

    if (isJoined) {
      setMyEventIds(prev => { const n = new Set(prev); n.delete(event.id); return n })
      setLocalParticipants(prev => ({ ...prev, [event.id]: participants.filter(p => p.id !== currentPlayerId) }))
    } else {
      setMyEventIds(prev => new Set(prev).add(event.id))
      setLocalParticipants(prev => ({ ...prev, [event.id]: [...participants, currentPlayer] }))
    }

    try {
      await fetch(`/api/events/${event.id}/join`, { method: isJoined ? 'DELETE' : 'POST' })
    } catch {
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

  // イベントを日付キーでマップ化
  const eventsByDate = new Map<string, EventItem[]>()
  for (const ev of events) {
    const key = toLocalDate(ev.starts_at)
    if (!eventsByDate.has(key)) eventsByDate.set(key, [])
    eventsByDate.get(key)!.push(ev)
  }

  // カレンダーグリッド生成
  const firstDay = new Date(calYear, calMonth, 1).getDay() // 0=日
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const todayKey = toLocalDate(today.toISOString())
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
    setSelectedDate(null)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
    setSelectedDate(null)
  }
  const goToday = () => {
    setCalYear(today.getFullYear())
    setCalMonth(today.getMonth())
    setSelectedDate(null)
  }

  // リスト表示用グループ
  const groups = new Map<string, { sortKey: number; events: EventItem[] }>()
  for (const ev of events) {
    const { month, sortKey } = formatDate(ev.starts_at)
    if (!groups.has(month)) groups.set(month, { sortKey, events: [] })
    groups.get(month)!.events.push(ev)
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => a[1].sortKey - b[1].sortKey)

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : []

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📅 スケジュール</h1>
            <p className="text-xs text-gray-500 mt-1">練習・非公式イベント・大会の日程</p>
          </div>
          {/* 凡例 */}
          <div className="flex flex-col gap-1">
            {Object.entries(TYPE_CONFIG).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-gray-500">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ビュー切り替え */}
        <div className="flex gap-1 bg-black/20 rounded-lg p-1">
          <button
            onClick={() => setView('calendar')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${view === 'calendar' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            📆 カレンダー
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${view === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            📋 リスト
          </button>
        </div>

        {/* カレンダービュー */}
        {view === 'calendar' && (
          <div className="space-y-4">
            {/* ナビゲーション */}
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-lg bg-purple-900/30 hover:bg-purple-900/60 text-gray-300 transition">
                ‹
              </button>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">{calYear}年{calMonth + 1}月</span>
                {(calYear !== today.getFullYear() || calMonth !== today.getMonth()) && (
                  <button onClick={goToday} className="text-xs px-2 py-1 bg-purple-900/40 hover:bg-purple-900/70 text-purple-300 rounded-lg transition">
                    今月
                  </button>
                )}
              </div>
              <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-lg bg-purple-900/30 hover:bg-purple-900/60 text-gray-300 transition">
                ›
              </button>
            </div>

            {/* グリッド */}
            <div className="bg-purple-900/10 border border-purple-800/20 rounded-2xl overflow-hidden">
              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 border-b border-purple-800/20">
                {weekdays.map((w, i) => (
                  <div key={w} className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
                    {w}
                  </div>
                ))}
              </div>

              {/* 日付グリッド */}
              <div className="grid grid-cols-7">
                {/* 月初の空白 */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[52px] border-b border-r border-purple-800/10 last:border-r-0" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dayEvents = eventsByDate.get(dateKey) ?? []
                  const isToday = dateKey === todayKey
                  const isSelected = dateKey === selectedDate
                  const col = (firstDay + i) % 7

                  return (
                    <div
                      key={day}
                      onClick={() => dayEvents.length > 0 && setSelectedDate(isSelected ? null : dateKey)}
                      className={`min-h-[52px] p-1.5 border-b border-r border-purple-800/10 last:border-r-0 transition ${
                        dayEvents.length > 0 ? 'cursor-pointer hover:bg-purple-900/20' : ''
                      } ${isSelected ? 'bg-purple-900/30' : ''}`}
                    >
                      <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                        isToday ? 'bg-purple-600 text-white' :
                        col === 0 ? 'text-red-400' : col === 6 ? 'text-blue-400' : 'text-gray-300'
                      }`}>
                        {day}
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {dayEvents.slice(0, 3).map(ev => (
                          <span
                            key={ev.id}
                            className={`w-2 h-2 rounded-full ${TYPE_CONFIG[ev.event_type]?.dot ?? 'bg-gray-400'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 選択日のイベント */}
            {selectedDate && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-purple-400">
                  {(() => {
                    const d = new Date(selectedDate + 'T00:00:00')
                    return `${d.getMonth() + 1}月${d.getDate()}日のイベント`
                  })()}
                </h2>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-gray-500">イベントはありません</p>
                ) : (
                  selectedEvents.map(ev => (
                    <EventCard
                      key={ev.id}
                      ev={ev}
                      isJoined={myEventIds.has(ev.id)}
                      isLoading={loadingIds.has(ev.id)}
                      currentPlayerId={currentPlayerId}
                      participants={localParticipants[ev.id] ?? ev.participants}
                      onToggle={handleToggle}
                    />
                  ))
                )}
              </div>
            )}

            {/* 今月のイベント一覧（選択なし時） */}
            {!selectedDate && (() => {
              const monthKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
              const monthEvents = events.filter(ev => ev.starts_at.startsWith(monthKey) || toLocalDate(ev.starts_at).startsWith(monthKey))
              if (monthEvents.length === 0) return (
                <p className="text-sm text-gray-500 text-center py-4">この月のイベントはありません</p>
              )
              return (
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-gray-400">{calMonth + 1}月のイベント（{monthEvents.length}件）</h2>
                  {monthEvents.map(ev => (
                    <EventCard
                      key={ev.id}
                      ev={ev}
                      isJoined={myEventIds.has(ev.id)}
                      isLoading={loadingIds.has(ev.id)}
                      currentPlayerId={currentPlayerId}
                      participants={localParticipants[ev.id] ?? ev.participants}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* リストビュー */}
        {view === 'list' && (
          <div className="space-y-8">
            {events.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-16">予定されているイベントはありません</p>
            )}
            {sortedGroups.map(([month, { events: monthEvents }]) => (
              <div key={month} className="space-y-3">
                <h2 className="text-sm font-mono text-purple-400/70 tracking-widest uppercase">── {month} ──</h2>
                {monthEvents.map(ev => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    isJoined={myEventIds.has(ev.id)}
                    isLoading={loadingIds.has(ev.id)}
                    currentPlayerId={currentPlayerId}
                    participants={localParticipants[ev.id] ?? ev.participants}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
