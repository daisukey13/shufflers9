'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Banner } from '@/lib/queries/banners'

export default function BannerForm({ banner }: { banner?: Banner }) {
  const isEdit = !!banner
  const [title, setTitle] = useState(banner?.title ?? '')
  const [body, setBody] = useState(banner?.body ?? '')
  const [linkUrl, setLinkUrl] = useState(banner?.link_url ?? '')
  const [startsAt, setStartsAt] = useState(
    banner?.starts_at ? new Date(banner.starts_at).toISOString().slice(0, 16) : ''
  )
  const [endsAt, setEndsAt] = useState(
    banner?.ends_at ? new Date(banner.ends_at).toISOString().slice(0, 16) : ''
  )
  const [isActive, setIsActive] = useState(banner?.is_active ?? true)
  const [sortOrder, setSortOrder] = useState(banner?.sort_order ?? 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      title: title.trim(),
      body: body.trim() || null,
      link_url: linkUrl.trim() || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      is_active: isActive,
      sort_order: sortOrder,
    }

    const { error } = isEdit
      ? await supabase.from('banners').update(payload).eq('id', banner.id)
      : await supabase.from('banners').insert(payload)

    if (error) {
      setError((isEdit ? '更新' : '作成') + 'に失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/admin/banners')
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Link href="/admin/banners" className="text-sm text-gray-400 hover:text-white">← 一覧へ</Link>
        <h1 className="text-2xl font-bold">
          📣 {isEdit ? 'バナーを編集' : '新規バナー作成'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">タイトル <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="大会エントリー受付開始！"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 本文 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            本文 <span className="text-gray-500 text-xs">（任意）</span>
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={2}
            placeholder="詳細はこちらからご確認ください"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* リンクURL */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            リンクURL <span className="text-gray-500 text-xs">（任意・クリック時の遷移先）</span>
          </label>
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://toyoura.online/tournaments"
            className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 表示期間 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              表示開始 <span className="text-gray-500 text-xs">（任意）</span>
            </label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              取り下げ <span className="text-gray-500 text-xs">（任意）</span>
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* 表示順 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            表示順 <span className="text-gray-500 text-xs">（小さいほど先頭）</span>
          </label>
          <input
            type="number"
            value={sortOrder}
            onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
            className="w-32 bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* 公開設定 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-purple-600' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm text-gray-300">{isActive ? '公開' : '非公開（下書き）'}</span>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
          >
            {loading ? '保存中...' : isEdit ? '変更を保存' : 'バナーを作成'}
          </button>
          <Link
            href="/admin/banners"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
          >
            キャンセル
          </Link>
        </div>
      </form>

      {/* プレビュー */}
      {title && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">プレビュー</p>
          <div className="relative w-full bg-gradient-to-r from-[#1a0533] via-[#2d0a6e] to-[#0f1a4a] border border-purple-500/40 rounded-2xl overflow-hidden shadow-lg min-h-[88px] flex items-center px-5 py-4 gap-4">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.04),transparent_60%)] pointer-events-none" />
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white/20 to-transparent rounded-l-2xl" />
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-700/60 text-purple-200 flex items-center justify-center text-xl shadow">
              📣
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm sm:text-base leading-snug">{title}</p>
              {body && <p className="text-xs text-gray-300 mt-0.5">{body}</p>}
            </div>
            {linkUrl && <span className="flex-shrink-0 text-xs text-gray-400">詳細 →</span>}
          </div>
        </div>
      )}
    </div>
  )
}
