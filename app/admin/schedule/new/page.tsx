'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewEventPage() {
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<'practice' | 'unofficial' | 'tournament'>('practice')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [venue, setVenue] = useState('とわにー交流ホール（北海道豊浦町）')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lineMsg, setLineMsg] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.from('events').insert({
      title: title.trim(),
      event_type: eventType,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      venue: venue.trim() || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      is_published: isPublished,
    })

    if (error) {
      setError('作成に失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    const typeLabel = eventType === 'practice' ? '練習' : eventType === 'unofficial' ? '非公式イベント' : '大会'
    setLineMsg(`【スケジュール更新】${typeLabel}「${title.trim()}」が追加されました。詳細はスケジュールページでご確認ください。\nhttps://toyoura.online/schedule`)
    setLoading(false)
  }

  if (lineMsg) {
    return (
      <div className="space-y-6 max-w-lg">
        <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-6 space-y-4">
          <p className="text-green-400 font-semibold text-lg">✅ イベントを作成しました</p>
          <p className="text-sm text-gray-400">LINEフォロワーへの通知を送りますか？</p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => router.push(`/admin/line?msg=${encodeURIComponent(lineMsg)}`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition"
            >
              💬 LINEで通知する
            </button>
            <button
              onClick={() => { router.push('/admin/schedule'); router.refresh() }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
            >
              スケジュール一覧へ →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Link href="/admin/schedule" className="text-sm text-gray-400 hover:text-white">← 一覧へ</Link>
        <h1 className="text-2xl font-bold">📅 新規イベント作成</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* タイプ */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">イベント種別</label>
          <div className="flex gap-2 bg-black/20 rounded-lg p-1">
            {([
              { v: 'practice', label: '練習' },
              { v: 'unofficial', label: '非公式' },
              { v: 'tournament', label: '大会' },
            ] as const).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => setEventType(v)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${eventType === v ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="春の練習会"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 開始日時 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">開始日時</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">終了日時 <span className="text-gray-500 text-xs">（任意）</span></label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* 会場 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">会場</label>
          <input
            type="text"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            placeholder="とわにー交流ホール（北海道豊浦町）"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 説明 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">説明 <span className="text-gray-500 text-xs">（任意）</span></label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="イベントの説明を入力..."
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 備考 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">備考・注意事項 <span className="text-gray-500 text-xs">（任意）</span></label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="持ち物・集合時間など..."
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 公開設定 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className={`relative w-10 h-6 rounded-full transition-colors ${isPublished ? 'bg-purple-600' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isPublished ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm text-gray-300">{isPublished ? '公開' : '非公開（下書き）'}</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          {loading ? '作成中...' : 'イベントを作成'}
        </button>
      </form>
    </div>
  )
}
