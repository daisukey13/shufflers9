'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const timeOptions = (() => {
  const options: string[] = []
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 5) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return options
})()

export default function NewTournamentPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles')
  const [startedAt, setStartedAt] = useState('')
  const [venue, setVenue] = useState('とわにーホール')
  const [qualifyingStartTime, setQualifyingStartTime] = useState('')
  const [finalsStartTime, setFinalsStartTime] = useState('')
  const [bonusPoints, setBonusPoints] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const dateObj = startedAt ? new Date(startedAt) : null
    const weekdays = ['日', '月', '火', '水', '木', '金', '土']
    const dateText = dateObj
      ? `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日（${weekdays[dateObj.getDay()]}曜日）`
      : null
    const venueText = venue.trim() ? `場所：${venue.trim()}` : null
    const qualifyingText = qualifyingStartTime ? `予選開始：${qualifyingStartTime}（※Aブロック第1試合）` : null
    const finalsText = finalsStartTime ? `決勝開始予定：${finalsStartTime}` : null
    const bonusText = bonusPoints ? `ボーナスポイント：${bonusPoints}pt` : null
    const noteText = notes.trim() ? `【注意事項】${notes.trim()}` : null

    const extraLines = [dateText, venueText, qualifyingText, finalsText, bonusText, noteText].filter(Boolean)
    const fullDescription = [description.trim(), ...extraLines].filter(Boolean).join('\n')

    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        description: fullDescription || null,
        format,
        type: 'singles',
        status: 'open',
        started_at: startedAt ? new Date(startedAt).toISOString() : null,
        qualifying_start_time: qualifyingStartTime || null,
        finals_start_time: finalsStartTime || null,
        bonus_points: bonusPoints ? parseInt(bonusPoints) : 0,
        notes: notes.trim() || null,
      })
      .select()
      .single()

    if (error) {
      setError('大会の作成に失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    router.push(`/admin/tournaments/${data.id}/entries`)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">🏆 新規大会作成</h1>

      <form onSubmit={handleSubmit} className="space-y-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* 大会名 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">大会名</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="第1回豊浦シャッフルボード大会"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 開催日時 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">開催日</label>
          <input
            type="date"
            value={startedAt}
            onChange={e => setStartedAt(e.target.value)}
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {startedAt && (() => {
            const d = new Date(startedAt + 'T00:00:00')
            const weekdays = ['日', '月', '火', '水', '木', '金', '土']
            return (
              <p className="text-xs text-purple-300 mt-1">
                {d.getFullYear()}年{d.getMonth() + 1}月{d.getDate()}日（{weekdays[d.getDay()]}曜日）
              </p>
            )
          })()}
        </div>

        {/* 開催場所 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">開催場所</label>
          <input
            type="text"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            placeholder="とわにーホール"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 予選開始予定時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            予選開始予定時間
            <span className="text-xs text-gray-500 ml-1">（※Aブロック第1試合）</span>
          </label>
          <select
            value={qualifyingStartTime}
            onChange={e => setQualifyingStartTime(e.target.value)}
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">未設定</option>
            {timeOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">自分の試合を組み合わせ予定表でチェックしてください</p>
        </div>

        {/* 決勝開始予定時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">本線開始予定時間</label>
          <select
            value={finalsStartTime}
            onChange={e => setFinalsStartTime(e.target.value)}
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">未設定</option>
            {timeOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* ボーナスポイント */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            ボーナスレート
            <span className="text-xs text-gray-500 ml-1">（プラスRPのみ。マイナスRP・HCは対象外）</span>
          </label>
          <select
            value={bonusPoints}
            onChange={e => setBonusPoints(e.target.value)}
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="0">なし（0%）</option>
            {[10,20,30,40,50,60,70,80,90,100].map(v => (
              <option key={v} value={String(v)}>{v}%ボーナス（×{(1 + v/100).toFixed(1)}倍）</option>
            ))}
          </select>
        </div>

        {/* その他注意事項 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">その他注意事項</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="参加者への注意事項など..."
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 説明（任意） */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">説明（任意）</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="大会の説明..."
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 形式 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">形式</label>
          <div className="flex gap-2 bg-black/20 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setFormat('singles')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${format === 'singles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              個人戦
            </button>
            <button
              type="button"
              onClick={() => setFormat('doubles')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${format === 'doubles' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              ダブルス
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          {loading ? '作成中...' : '大会を作成してエントリー管理へ →'}
        </button>
      </form>
    </div>
  )
}