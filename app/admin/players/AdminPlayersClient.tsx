'use client'

import { useState } from 'react'
import { Player } from '@/types'
import AvatarPicker from '@/components/ui/AvatarPicker'
import Link from 'next/link'
import { ADDRESS_OPTIONS } from '@/lib/constants'

type Avatar = { id: string; url: string }

export default function AdminPlayersClient({
  players,
  avatars,
}: {
  players: Player[]
  avatars: Avatar[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(avatars[0]?.url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ email: string; password: string } | null>(null)
  const [localPlayers, setLocalPlayers] = useState(players)

  const generateEmail = () => {
    const now = new Date()
    const mmdd = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
    const random = Math.random().toString(36).substring(2, 6)
    return `${mmdd}.${random}@toyoura.online`
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const resetForm = () => {
    setName('')
    setFullName('')
    setPhone('')
    setAddress('')
    setAvatarUrl(avatars[0]?.url ?? '')
    setError(null)
    setResult(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('表示名を入力してください'); return }
    if (!fullName.trim()) { setError('氏名を入力してください'); return }
    if (!phone.trim()) { setError('電話番号を入力してください'); return }
    if (!address) { setError('地域を選択してください'); return }

    setLoading(true)
    setError(null)
    setResult(null)

    const email = generateEmail()
    const password = generatePassword()

    const res = await fetch('/api/admin/create-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, avatarUrl, fullName, phone, address }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? '登録に失敗しました')
      setLoading(false)
      return
    }

    setResult({ email, password })
    setLocalPlayers(prev => [{
      id: data.id,
      user_id: data.user_id,
      name,
      avatar_url: avatarUrl,
      rating: 1000,
      hc: 36,
      wins: 0,
      losses: 0,
      is_active: true,
      is_admin: false,
      created_at: new Date().toISOString(),
      total_score: 0,
      total_matches: 0,
      full_name: fullName,
      phone,
      address,
      tournament_wins: 0,
      tournament_runner_ups: 0,
      tournament_qualifications: 0,
      doubles_rating: 1000,
      doubles_wins: 0,
      doubles_losses: 0,
    } as any, ...prev])
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">👤 メンバー管理</h1>
        <button
          onClick={() => { setShowForm(!showForm); resetForm() }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
        >
          {showForm ? 'キャンセル' : '+ メンバーを追加'}
        </button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-lg">新しいメンバーを追加</h2>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* 登録結果 */}
          {result && (
            <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-4 space-y-3">
              <p className="text-green-400 font-semibold text-sm">✅ 登録完了！以下をメンバーに渡してください：</p>
              <div className="bg-black/30 rounded-lg p-3 font-mono text-sm space-y-1">
                <p>🌐 サイト: https://toyoura.online/login</p>
                <p>📧 ログインID: {result.email}</p>
                <p>🔑 パスワード: {result.password}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `🌐 サイト: https://toyoura.online/login\n📧 ログインID: ${result.email}\n🔑 パスワード: ${result.password}`
                    )
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                >
                  📋 コピーする
                </button>
                <button
                  onClick={resetForm}
                  className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition"
                >
                  続けて登録 →
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            {/* 表示名 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                表示名 <span className="text-red-400 text-xs">*必須</span>
                <span className="text-purple-400 text-xs ml-1">（公開）</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="クラブ内での名前"
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 氏名 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                氏名 <span className="text-red-400 text-xs">*必須</span>
                <span className="text-gray-500 text-xs ml-1">（非公開）</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="山田 太郎"
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 電話番号 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                電話番号 <span className="text-red-400 text-xs">*必須</span>
                <span className="text-gray-500 text-xs ml-1">（非公開）</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                placeholder="090-0000-0000"
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 住む地域 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                住む地域 <span className="text-red-400 text-xs">*必須</span>
                <span className="text-purple-400 text-xs ml-1">（公開）</span>
              </label>
              <select
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
                className="w-full bg-purple-900/30 border border-purple-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">選択してください</option>
                {ADDRESS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* アバター */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">アバター</label>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full border-2 border-purple-500 overflow-hidden bg-gray-800 flex-shrink-0 flex items-center justify-center">
                  {avatarUrl
                    ? <img src={avatarUrl} className="w-full h-full object-cover" />
                    : <span className="text-xl">👤</span>
                  }
                </div>
                <span className="text-sm text-gray-400">選択中のアバター</span>
              </div>
              <div className="transform scale-75 origin-top-left w-[133%]">
                <AvatarPicker avatars={avatars} selected={avatarUrl} onSelect={setAvatarUrl} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              {loading ? '登録中...' : '登録してパスワードを生成'}
            </button>
          </form>
        </div>
      )}

      {/* メンバー一覧 */}
      <div className="space-y-2">
        {localPlayers.map(player => (
          <div
            key={player.id}
            className={`flex items-center gap-4 p-4 border rounded-xl ${
              player.is_active
                ? 'bg-purple-900/20 border-purple-800/30'
                : 'bg-gray-900/40 border-gray-700/30 opacity-60'
            }`}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 flex items-center justify-center">
              {player.avatar_url
                ? <img src={player.avatar_url} className="w-full h-full object-cover" />
                : <span className="text-xl">👤</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{player.name || '（未設定）'}</p>
              <p className="text-xs text-gray-400">
                {new Date(player.created_at).toLocaleDateString('ja-JP')}
                {!player.is_active && ' · 脱退済み'}
              </p>
            </div>
            <div className="flex gap-2 items-center flex-shrink-0">
              {player.is_admin && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">管理者</span>
              )}
              {!player.is_active && (
                <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">非表示</span>
              )}
              <span className="text-sm font-bold text-purple-400">{player.rating} pt</span>
              <Link
                href={`/admin/players/${player.id}`}
                className="text-xs px-3 py-1 bg-purple-700/50 hover:bg-purple-600/50 rounded-lg text-purple-300 transition"
              >
                編集
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}