'use client'

import { useState } from 'react'

type Avatar = { id: string; url: string }

type Props = {
  avatars: Avatar[]
  selected: string
  onSelect: (url: string) => void
}

export default function AvatarPicker({ avatars, selected, onSelect }: Props) {
  const [page, setPage] = useState(0)
  const perPage = 20
  const totalPages = Math.ceil(avatars.length / perPage)
  const visible = avatars.slice(page * perPage, (page + 1) * perPage)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {visible.map(avatar => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.url)}
            className={`rounded-full overflow-hidden border-2 transition aspect-square ${
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