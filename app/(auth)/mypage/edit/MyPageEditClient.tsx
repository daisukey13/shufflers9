'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AvatarPicker from '@/components/ui/AvatarPicker'
import { ADDRESS_OPTIONS } from '@/lib/constants'
import { Player } from '@/types'

type Avatar = { id: string; url: string }

export default function MyPageEditClient({
  player,
  avatars,
  email,
}: {
  player: Player
  avatars: Avatar[]
  email: string
}) {
  const [name, setName] = useState(player.name)
  const [fullName, setFullName] = useState(player.full_name ?? '')
  const [phone, setPhone] = useState(player.phone ?? '')
  const [address, setAddress] = useState(player.address ?? '')
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // 画像をリサイズしてアップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      // canvasでリサイズ（200x200px）
      const resized = await resizeImage(file, 200, 200)

      const fileName = `${player.id}_${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(`uploads/${fileName}`, resized, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        setError('アップロードに失敗しました: ' + uploadError.message)
        setUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(`uploads/${fileName}`)

      setAvatarUrl(publicUrl)
    } catch (err) {
      setError('画像の処理に失敗しました')
    }

    setUploading(false)
  }

  // 画像リサイズ関数
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * maxWidth / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * maxHeight / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        canvas.toBlob(blob => {
          if (blob) resolve(blob)
          else reject(new Error('変換失敗'))
        }, 'image/jpeg', 0.8)
      }
      img.onerror = reject
      img.src = url
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const { error } = await supabase
      .from('players')
      .update({
        name: name.trim(),
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        address: address || null,
        avatar_url: avatarUrl || null,
      })
      .eq('id', player.id)

    if (error) {
      setError('保存に失敗しました')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/mypage'), 1000)
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">✏️ プロフィール編集</h1>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← 戻る
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-400 bg-green-900/20 px-3 py-2 rounded-lg">✅ 保存しました！</p>
          )}

          {/* アバター */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">アバター</label>
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full border-2 border-purple-500 overflow-hidden bg-gray-800 flex items-center justify-center">
                {avatarUrl
                  ? <img src={avatarUrl} className="w-full h-full object-cover" />
                  : <span className="text-4xl">👤</span>
                }
              </div>

              {/* 画像アップロードボタン */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-1.5 bg-blue-700/50 hover:bg-blue-600/50 rounded-lg text-xs text-blue-300 transition disabled:opacity-50"
                >
                  {uploading ? 'アップロード中...' : '📷 写真をアップロード'}
                </button>
                <p className="text-xs text-gray-500">JPG/PNG・自動で200×200pxにリサイズ</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* プリセットアバター */}
            <div>
              <p className="text-xs text-gray-400 mb-2">またはプリセットから選択：</p>
              <AvatarPicker avatars={avatars} selected={avatarUrl} onSelect={setAvatarUrl} />
            </div>
          </div>

          {/* 表示名 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              表示名 <span className="text-purple-400 text-xs">（公開）</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* メールアドレス（表示のみ） */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              メールアドレス <span className="text-gray-500 text-xs">（変更不可）</span>
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400"
            />
          </div>

          {/* 住所 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              お住まいの地域 <span className="text-purple-400 text-xs">（公開）</span>
            </label>
            <select
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選択してください</option>
              {ADDRESS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* 氏名（非公開） */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              氏名 <span className="text-red-400 text-xs">（非公開・管理者のみ閲覧）</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 電話番号（非公開） */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              電話番号 <span className="text-red-400 text-xs">（非公開・管理者のみ閲覧）</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="090-0000-0000"
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
          >
            {loading ? '保存中...' : '保存する'}
          </button>
        </form>
      </div>
    </div>
  )
}