'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NewTournamentPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        format,
        type: 'singles',
        status: 'open',
      })
      .select()
      .single()

    if (error) {
      setError('大会の作成に失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    router.push(`/admin/tournaments/${data.id}/qualifying`)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">🏆 新規大会作成</h1>

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
            placeholder="第1回豊浦シャッフルボード大会"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

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
          {loading ? '作成中...' : '大会を作成して予選設定へ →'}
        </button>
      </form>
    </div>
  )
}
