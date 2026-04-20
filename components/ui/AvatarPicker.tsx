'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Avatar = { id: string; url: string }
type Props = {
  avatars: Avatar[]
  selected: string
  onSelect: (url: string) => void
  size?: 'sm' | 'md'
  playerId?: string
}

export default function AvatarPicker({ avatars, selected, onSelect, size = 'md', playerId }: Props) {
  const [page, setPage] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const perPage = 30
  const totalPages = Math.ceil(avatars.length / perPage)
  const visible = avatars.slice(page * perPage, (page + 1) * perPage)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !playerId) return

    setUploading(true)
    setUploadError(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filePath = `${playerId}/avatar.${ext}`
    const supabase = createClient()

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (error) {
      setUploadError('アップロードに失敗しました: ' + error.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    // キャッシュバスティングのためにタイムスタンプを付与
    const url = data.publicUrl + '?t=' + Date.now()
    onSelect(url)
    setUploading(false)
    // inputをリセット
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      {playerId && (
        <div className="space-y-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-2 px-3 text-sm border border-dashed border-purple-500/60 rounded-lg text-purple-300 hover:border-purple-400 hover:text-purple-200 hover:bg-purple-900/20 transition disabled:opacity-50"
          >
            {uploading ? 'アップロード中...' : '📁 画像をアップロード'}
          </button>
          {uploadError && (
            <p className="text-xs text-red-400">{uploadError}</p>
          )}
        </div>
      )}

      <div className={size === 'sm' ? 'grid grid-cols-10 gap-1' : 'grid grid-cols-5 gap-2'}>
        {visible.map(avatar => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.url)}
            className={`rounded-full overflow-hidden border-2 transition flex-shrink-0 ${
              size === 'sm' ? 'w-9 h-9' : 'aspect-square'
            } ${
              selected === avatar.url
                ? 'border-purple-400 scale-110'
                : 'border-transparent hover:border-purple-600'
            }`}
          >
            <img src={avatar.url} alt={avatar.id} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-xs bg-purple-800/50 rounded disabled:opacity-30 hover:bg-purple-700/50 transition"
          >
            ←
          </button>
          <span className="text-xs text-gray-400 py-1">{page + 1} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="px-3 py-1 text-xs bg-purple-800/50 rounded disabled:opacity-30 hover:bg-purple-700/50 transition"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
