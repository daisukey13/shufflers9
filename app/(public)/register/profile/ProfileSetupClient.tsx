'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AvatarPicker from '@/components/ui/AvatarPicker'

type Avatar = { id: string; url: string }

export default function ProfileSetupClient({ avatars }: { avatars: Avatar[] }) {
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(avatars[0]?.url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | undefined>(undefined)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('players').select('id').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setPlayerId(data.id) })
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    console.log('user:', user?.id)
    console.log('avatarUrl:', avatarUrl)

    if (!user) {
      setError('認証エラーが発生しました')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('players')
      .update({ name: name.trim(), avatar_url: avatarUrl })
      .eq('user_id', user.id)
      .select()

    console.log('update result:', data, error)

    if (error) {
      setError(`プロフィールの保存に失敗しました: ${error.message}`)
      setLoading(false)
      return
    }

    router.push('/mypage')
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-10">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">🎨 プロフィール設定</h1>
          <p className="text-sm text-gray-400">メール確認が完了しました！プロフィールを設定してください。</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* 選択中のアバター */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full border-2 border-purple-500 overflow-hidden bg-gray-800 flex items-center justify-center">
              {avatarUrl
                ? <img src={avatarUrl} className="w-full h-full object-cover" />
                : <span className="text-4xl">👤</span>
              }
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">表示名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="クラブ内での表示名"
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">アバターを選択</label>
            <AvatarPicker
              avatars={avatars}
              selected={avatarUrl}
              onSelect={setAvatarUrl}
              playerId={playerId}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
          >
            {loading ? '保存中...' : '登録完了 🎉'}
          </button>
        </form>
      </div>
    </div>
  )
}