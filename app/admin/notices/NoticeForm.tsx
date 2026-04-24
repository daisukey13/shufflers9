'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Notice = {
  id: string
  title: string
  body: string
  is_published: boolean
}

export default function NoticeForm({ notice }: { notice?: Notice }) {
  const isEdit = !!notice
  const [title, setTitle] = useState(notice?.title ?? '')
  const [body, setBody] = useState(notice?.body ?? '')
  const [isPublished, setIsPublished] = useState(notice?.is_published ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lineMsg, setLineMsg] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isEdit) {
      const { error } = await supabase
        .from('notices')
        .update({
          title,
          body,
          is_published: isPublished,
          published_at: isPublished ? new Date().toISOString() : null,
        })
        .eq('id', notice.id)

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
        .from('notices')
        .insert({
          title,
          body,
          is_published: isPublished,
          published_at: isPublished ? new Date().toISOString() : null,
          created_by: player?.id,
        })

      if (error) {
        setError('作成に失敗しました')
        setLoading(false)
        return
      }

      // 新規作成時は成功パネルを表示
      setLoading(false)
      setLineMsg(`【お知らせ】${title}\n詳細はサイトをご確認ください。\nhttps://toyoura.online/notices`)
      return
    }

    router.push('/admin/notices')
    router.refresh()
  }

  const handleDelete = async () => {
    if (!isEdit) return
    if (!confirm('このお知らせを削除しますか？')) return

    const { error } = await supabase
      .from('notices')
      .delete()
      .eq('id', notice.id)

    if (error) {
      setError('削除に失敗しました')
      return
    }

    router.push('/admin/notices')
    router.refresh()
  }

  if (lineMsg) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-6 space-y-4">
          <p className="text-green-400 font-semibold text-lg">✅ お知らせを作成しました</p>
          <p className="text-sm text-gray-400">LINEフォロワーへの通知を送りますか？</p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => router.push(`/admin/line?msg=${encodeURIComponent(lineMsg)}`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition"
            >
              💬 LINEで通知する
            </button>
            <button
              onClick={() => { router.push('/admin/notices'); router.refresh() }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
            >
              お知らせ一覧へ →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isEdit ? '📢 お知らせを編集' : '📢 お知らせを作成'}
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
          <label className="block text-sm font-medium text-gray-300 mb-1">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="お知らせのタイトル"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">本文</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            required
            rows={8}
            placeholder="お知らせの内容を入力してください"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className={`relative w-11 h-6 rounded-full transition ${
              isPublished ? 'bg-purple-600' : 'bg-gray-700'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              isPublished ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
          <span className="text-sm text-gray-300">
            {isPublished ? '公開する' : '下書き保存'}
          </span>
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