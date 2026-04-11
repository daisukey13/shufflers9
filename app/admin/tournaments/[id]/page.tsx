import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function AdminTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-sm text-gray-400 mt-1">大会管理</p>
        </div>
        <Link href="/admin/tournaments" className="text-sm text-gray-400 hover:text-white transition">
          ← 大会一覧
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href={`/admin/tournaments/${id}/entries`} className="p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl hover:bg-purple-900/40 transition">
          <p className="font-semibold text-white">📋 エントリー管理</p>
          <p className="text-sm text-gray-400 mt-1">エントリーの確認・管理</p>
        </Link>
        <Link href={`/admin/tournaments/${id}/qualifying`} className="p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl hover:bg-purple-900/40 transition">
          <p className="font-semibold text-white">🏒 予選管理</p>
          <p className="text-sm text-gray-400 mt-1">予選ブロック・試合管理</p>
        </Link>
        <Link href={`/admin/tournaments/${id}/finals`} className="p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl hover:bg-purple-900/40 transition">
          <p className="font-semibold text-white">🏆 本戦管理</p>
          <p className="text-sm text-gray-400 mt-1">本戦トーナメント管理</p>
        </Link>
        <Link href={`/tournaments/${id}`} target="_blank" className="p-5 bg-purple-900/20 border border-purple-800/30 rounded-2xl hover:bg-purple-900/40 transition">
          <p className="font-semibold text-white">🌐 公開ページ</p>
          <p className="text-sm text-gray-400 mt-1">公開ページを確認</p>
        </Link>
      </div>
    </div>
  )
}