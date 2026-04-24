'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Participant = {
  player_id: string
  player: { id: string; name: string; avatar_url: string | null }
}

type Player = { id: string; name: string; avatar_url: string | null }

export default function EditEventPage() {
  const params = useParams()
  const id = params.id as string
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<'practice' | 'unofficial' | 'tournament'>('practice')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [venue, setVenue] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 参加者管理
  const [participants, setParticipants] = useState<Participant[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [participantError, setParticipantError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [{ data: ev }, { data: parts }, { data: players }] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase
          .from('event_participants')
          .select('player_id, player:players(id, name, avatar_url)')
          .eq('event_id', id),
        supabase
          .from('players')
          .select('id, name, avatar_url')
          .eq('is_active', true)
          .eq('is_admin', false)
          .order('name'),
      ])

      if (ev) {
        setTitle(ev.title ?? '')
        setEventType(ev.event_type ?? 'practice')
        setStartsAt(ev.starts_at ? new Date(ev.starts_at).toISOString().slice(0, 16) : '')
        setEndsAt(ev.ends_at ? new Date(ev.ends_at).toISOString().slice(0, 16) : '')
        setVenue(ev.venue ?? '')
        setDescription(ev.description ?? '')
        setNotes(ev.notes ?? '')
        setIsPublished(ev.is_published ?? true)
      }
      if (parts) setParticipants(parts as any)
      if (players) setAllPlayers(players)
      setFetching(false)
    }
    load()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.from('events').update({
      title: title.trim(),
      event_type: eventType,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      venue: venue.trim() || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      is_published: isPublished,
    }).eq('id', id)

    if (error) {
      setError('更新に失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/admin/schedule')
  }

  const handleAddParticipant = async () => {
    if (!selectedPlayerId) return
    setAddingParticipant(true)
    setParticipantError(null)

    const res = await fetch(`/api/admin/events/${id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: selectedPlayerId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setParticipantError('追加に失敗しました: ' + (data.error ?? ''))
      setAddingParticipant(false)
      return
    }

    // リロード
    const { data } = await supabase
      .from('event_participants')
      .select('player_id, player:players(id, name, avatar_url)')
      .eq('event_id', id)
    if (data) setParticipants(data as any)
    setSelectedPlayerId('')
    setAddingParticipant(false)
  }

  const handleRemoveParticipant = async (playerId: string) => {
    setRemovingId(playerId)
    await fetch(`/api/admin/events/${id}/participants`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId }),
    })
    setParticipants(prev => prev.filter(p => p.player_id !== playerId))
    setRemovingId(null)
  }

  const participantIds = new Set(participants.map(p => p.player_id))
  const unregisteredPlayers = allPlayers.filter(p => !participantIds.has(p.id))

  if (fetching) return <div className="text-gray-400 text-sm p-8">読み込み中...</div>

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Link href="/admin/schedule" className="text-sm text-gray-400 hover:text-white">← 一覧へ</Link>
        <h1 className="text-2xl font-bold">📅 イベント編集</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">イベント種別</label>
          <div className="flex gap-2 bg-black/20 rounded-lg p-1">
            {([
              { v: 'practice', label: '練習' },
              { v: 'unofficial', label: '非公式' },
              { v: 'tournament', label: '大会' },
            ] as const).map(({ v, label }) => (
              <button key={v} type="button" onClick={() => setEventType(v)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${eventType === v ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">タイトル</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">開始日時</label>
            <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">終了日時</label>
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">会場</label>
          <input type="text" value={venue} onChange={e => setVenue(e.target.value)}
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">説明</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">備考・注意事項</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setIsPublished(!isPublished)}
            className={`relative w-10 h-6 rounded-full transition-colors ${isPublished ? 'bg-purple-600' : 'bg-gray-700'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isPublished ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm text-gray-300">{isPublished ? '公開' : '非公開（下書き）'}</span>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition">
          {loading ? '更新中...' : '変更を保存'}
        </button>
      </form>

      {/* 参加者管理 */}
      <div className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">👥 参加者管理（{participants.length}名）</h2>

        {/* 追加フォーム */}
        <div className="flex gap-2">
          <select
            value={selectedPlayerId}
            onChange={e => setSelectedPlayerId(e.target.value)}
            className="flex-1 bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">プレーヤーを選択...</option>
            {unregisteredPlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddParticipant}
            disabled={!selectedPlayerId || addingParticipant}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {addingParticipant ? '...' : '追加'}
          </button>
        </div>

        {participantError && (
          <p className="text-xs text-red-400">{participantError}</p>
        )}

        {/* 参加者一覧 */}
        {participants.length === 0 ? (
          <p className="text-sm text-gray-500">参加者はまだいません</p>
        ) : (
          <div className="space-y-2">
            {participants.map(p => (
              <div key={p.player_id} className="flex items-center gap-3 py-2 px-3 bg-[#12082a] border border-purple-800/20 rounded-lg">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
                  {p.player?.avatar_url
                    ? <img src={p.player.avatar_url} className="w-full h-full object-cover" />
                    : <span className="text-sm">👤</span>
                  }
                </div>
                <span className="flex-1 text-sm text-white">{p.player?.name ?? '不明'}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveParticipant(p.player_id)}
                  disabled={removingId === p.player_id}
                  className="text-xs px-2 py-1 bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded-lg transition disabled:opacity-50"
                >
                  {removingId === p.player_id ? '...' : '削除'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
