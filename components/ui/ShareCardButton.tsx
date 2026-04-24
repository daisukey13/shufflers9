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

  const imageUrl = `/api/og/player/${playerId}`

  const handleShare = async () => {
    setLoading(true)
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const file = new File([blob], `${playerName}_card.png`, { type: 'image/png' })

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
        // フォールバック: ダウンロード
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${playerName}_card.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      // キャンセルされた場合など は無視
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
