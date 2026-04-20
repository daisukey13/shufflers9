'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AvatarPicker from '@/components/ui/AvatarPicker'
import { ADDRESS_OPTIONS } from '@/lib/constants'

type Player = {
  id: string
  name: string
  full_name: string | null
  phone: string | null
  address: string | null
  avatar_url: string | null
  rating: number
  hc: number
  wins: number
  losses: number
  total_score: number
  total_matches: number
  is_active: boolean
  is_admin: boolean
}

type Avatar = { id: string; url: string }

export default function AdminPlayerEditClient({
  player,
  email,
  avatars,
}: {
  player: Player
  email: string
  avatars: Avatar[]
}) {
  const [name, setName] = useState(player.name)
  const [fullName, setFullName] = useState(player.full_name ?? '')
  const [phone, setPhone] = useState(player.phone ?? '')
  const [address, setAddress] = useState(player.address ?? '')
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url ?? '')
  const [rating, setRating] = useState(player.rating)
  const [hc, setHc] = useState(player.hc)
  const [wins, setWins] = useState(player.wins)
  const [losses, setLosses] = useState(player.losses)
  const [isActive, setIsActive] = useState(player.is_active)
  const [isAdmin, setIsAdmin] = useState(player.is_admin)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
        rating,
        hc,
        wins,
        losses,
        is_active: isActive,
        is_admin: isAdmin,
      })
      .eq('id', player.id)

    if (error) {
      setError('保存に失敗しました: ' + error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/admin/players'), 1500)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">👤 メンバー編集</h1>
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
  
  {/* 現在のアバター（大きく表示） */}
  <div className="flex justify-center">
    <div className="w-32 h-32 rounded-full border-2 border-purple-500 overflow-hidden bg-gray-800 flex items-center justify-center">
      {avatarUrl
        ? <img src={avatarUrl} className="w-full h-full object-cover" />
        : <span className="text-5xl">👤</span>
      }
    </div>
  </div>

  {/* アバター選択（小さく） */}
  <p className="text-xs text-gray-400 text-center">アバターを選択して変更</p>
  <AvatarPicker avatars={avatars} selected={avatarUrl} onSelect={setAvatarUrl} playerId={player.id} />
</div>

        {/* 基本情報 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">表示名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">メールアドレス</label>
            <input
              type="text"
              value={email}
              disabled
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">氏名（非公開）</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">電話番号（非公開）</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="090-0000-0000"
              className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">お住まいの地域</label>
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

        {/* ランキング情報 */}
        <div className="border-t border-purple-800/30 pt-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">📊 ランキング情報</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">レーティング（RP）</label>
              <input
                type="number"
                value={rating}
                onChange={e => setRating(parseInt(e.target.value))}
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ハンディキャップ（HC）</label>
              <input
                type="number"
                value={hc}
                min={0}
                max={36}
                onChange={e => setHc(parseInt(e.target.value))}
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">勝利数</label>
              <input
                type="number"
                value={wins}
                min={0}
                onChange={e => setWins(parseInt(e.target.value))}
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">敗北数</label>
              <input
                type="number"
                value={losses}
                min={0}
                onChange={e => setLosses(parseInt(e.target.value))}
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* ステータス */}
        <div className="border-t border-purple-800/30 pt-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">⚙️ ステータス</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
              <div>
                <p className="text-sm font-medium text-white">アクティブ</p>
                <p className="text-xs text-gray-400">オフにすると脱退扱いになりランキングから非表示</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative w-11 h-6 rounded-full transition ${isActive ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
              <div>
                <p className="text-sm font-medium text-white">管理者権限</p>
                <p className="text-xs text-gray-400">管理画面へのアクセスを許可する</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdmin(!isAdmin)}
                className={`relative w-11 h-6 rounded-full transition ${isAdmin ? 'bg-yellow-500' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isAdmin ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition"
        >
          {loading ? '保存中...' : '保存する'}
        </button>
      </form>
    </div>
  )
}