'use client'

import { useState } from 'react'

export default function ShareCardButton({
  playerId,
  playerName,
}: {
  playerId: string
  playerName: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const imageUrl = `/api/og/player/${playerId}`

  const handleShare = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('image')) throw new Error('Not an image')

      const blob = await res.blob()
      const pngBlob = new Blob([blob], { type: 'image/png' })
      const file = new File([pngBlob], `${playerName}_card.png`, { type: 'image/png' })

      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `${playerName} - Toyoura Shufflers Club`,
        })
      } else {
        // フォールバック: 新タブで開く（モバイルは長押しで保存可能）
        const url = URL.createObjectURL(pngBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${playerName}_card.png`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        // ダウンロードできない場合は新タブで開く
        window.open(imageUrl, '_blank')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-700/40 hover:bg-purple-700/70 border border-purple-600/40 text-white text-sm font-medium rounded-full transition disabled:opacity-50"
    >
      {loading ? (
        <>
          <span className="animate-spin text-xs">⏳</span>
          <span>生成中...</span>
        </>
      ) : (
        <>
          <span>📤</span>
          <span>カードをシェア</span>
        </>
      )}
    </button>
  )
}
