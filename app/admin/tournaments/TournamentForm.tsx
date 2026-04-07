'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Tournament = {
  id: string
  name: string
  type: 'singles' | 'teams'
  status: 'open' | 'in_progress' | 'finished'
  description: string | null
}

export default function TournamentForm({ tournament }: { tournament?: Tournament }) {
  const isEdit = !!tournament
  const [name, setName] = useState(tournament?.name ?? '')
  const [type, setType] = useState<'singles' | 'teams'>(tournament?.type ?? 'singles')
  const [status, setStatus] = useState<'open' | 'in_progress' | 'finished'>(tournament?.status ?? 'open')
  const [description, setDescription] = useState(tournament?.description ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isEdit) {
      const { error } = await supabase
        .from('tournaments')
        .update({ name, type, status, description: description || null })
        .eq('id', tournament.id)

      if (error) {
        setError('更新に失敗しました')
        setLoading(false)
        return
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user!.id)
        .single()

      const { error } = await supabase
        .from('tournaments')
        .insert({
          name,
          type,
          status,
          description: description || null,
          created_by: player?.id,
        })

      if (error) {
        setError('作成に失敗しました')
        setLoading(false)
        return
      }
    }

    router.push('/admin/tournaments')
    router.refresh()
  }

  const handleDelete = async () => {
    if (!isEdit) return
    if (!confirm('この大会を削除しますか？')) return

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournament.id)

    if (error) {
      setError('削除に失敗しました')
      return
    }

    router.push('/admin/tournaments')
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isEdit ? '🏆 大会を編集' : '🏆 大会を作成'}
        </h1>
        {isEdit && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm transition"
          >
            削除
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">大会名</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="例：第1回 豊浦シャッフラーズ杯"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">種別</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as 'singles' | 'teams')}
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="singles">個人戦</option>
              <option value="teams">チーム戦</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">ステータス</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'open' | 'in_progress' | 'finished')}
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="open">参加受付中</option>
              <option value="in_progress">開催中</option>
              <option value="finished">終了</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">説明（任意）</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="大会の説明や注意事項など"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
          >
            {loading ? '保存中...' : isEdit ? '更新する' : '作成する'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}