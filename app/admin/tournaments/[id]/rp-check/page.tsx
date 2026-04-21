import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function RpCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, bonus_points')
    .eq('id', id)
    .single()
  if (!tournament) notFound()

  const { data: blocks } = await supabase
    .from('tournament_blocks')
    .select('id, block_name')
    .eq('tournament_id', id)
    .order('block_name')

  const { data: matches } = await supabase
    .from('tournament_qualifying_matches')
    .select(`
      *,
      player1:players!player1_id(id, name),
      player2:players!player2_id(id, name)
    `)
    .in('block_id', (blocks ?? []).map(b => b.id))
    .not('player1_rating_before', 'is', null)
    .order('created_at')

  const blockMap = new Map((blocks ?? []).map(b => [b.id, b.block_name]))

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 RP影響確認</h1>
          <p className="text-sm text-gray-400 mt-1">{tournament.name}</p>
        </div>
        <Link
          href={`/admin/tournaments/${id}/qualifying`}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          ← 予選管理
        </Link>
      </div>

      <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-xl">
        <p className="text-xs text-blue-300">
          ⚠️ スコアを入れ間違えた場合は、この画面で「本来の変化量」を確認し、Supabaseで手動修正してください。<br />
          修正方法：現在のRPから誤った変化量を引き、正しい変化量を足す。
        </p>
      </div>

      {(!matches || matches.length === 0) ? (
        <p className="text-gray-400 text-sm">RP記録のある試合がありません</p>
      ) : (
        <div className="space-y-6">
          {(blocks ?? []).map(block => {
            const blockMatches = (matches ?? []).filter(m => m.block_id === block.id)
            if (blockMatches.length === 0) return null
            return (
              <div key={block.id} className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-yellow-100 mb-4">ブロック {block.block_name}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-purple-800/30 text-xs">
                        <th className="text-left py-2 pr-3">試合</th>
                        <th className="text-center py-2 pr-3">スコア</th>
                        <th className="text-center py-2 pr-3 text-purple-300">登録前RP</th>
                        <th className="text-center py-2 pr-3 text-green-300">変化量</th>
                        <th className="text-center py-2 pr-3 text-yellow-300">登録後RP</th>
                        <th className="text-center py-2 pr-3">勝敗（前）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockMatches.map((m: any, idx) => {
                        const p1AfterRating = (m.player1_rating_before ?? 0) + (m.player1_rating_change ?? 0)
                        const p2AfterRating = (m.player2_rating_before ?? 0) + (m.player2_rating_change ?? 0)
                        const p1won = m.winner_id === m.player1_id
                        return (
                          <tr key={m.id} className="border-b border-purple-800/20">
                            <td className="py-3 pr-3">
                              <p className="text-xs text-gray-500 mb-0.5">第{idx + 1}試合</p>
                              <p className="font-medium text-white">{m.player1?.name}</p>
                              <p className="font-medium text-white">{m.player2?.name}</p>
                            </td>
                            <td className="text-center py-3 pr-3">
                              <p className={`font-bold ${p1won ? 'text-green-400' : 'text-red-400'}`}>
                                {m.score1}
                              </p>
                              <p className={`font-bold ${!p1won ? 'text-green-400' : 'text-red-400'}`}>
                                {m.score2}
                              </p>
                            </td>
                            <td className="text-center py-3 pr-3 text-purple-300">
                              <p>{m.player1_rating_before}</p>
                              <p>{m.player2_rating_before}</p>
                            </td>
                            <td className="text-center py-3 pr-3">
                              <p className={`font-bold ${
                                (m.player1_rating_change ?? 0) > 0 && (tournament.bonus_points ?? 0) > 0
                                  ? 'neon-bonus'
                                  : (m.player1_rating_change ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {(m.player1_rating_change ?? 0) >= 0 ? '+' : ''}{m.player1_rating_change}
                                {(m.player1_rating_change ?? 0) > 0 && (tournament.bonus_points ?? 0) > 0 && <span className="text-xs ml-0.5">★</span>}
                              </p>
                              <p className={`font-bold ${
                                (m.player2_rating_change ?? 0) > 0 && (tournament.bonus_points ?? 0) > 0
                                  ? 'neon-bonus'
                                  : (m.player2_rating_change ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {(m.player2_rating_change ?? 0) >= 0 ? '+' : ''}{m.player2_rating_change}
                                {(m.player2_rating_change ?? 0) > 0 && (tournament.bonus_points ?? 0) > 0 && <span className="text-xs ml-0.5">★</span>}
                              </p>
                            </td>
                            <td className="text-center py-3 pr-3 text-yellow-300">
                              <p>{p1AfterRating}</p>
                              <p>{p2AfterRating}</p>
                            </td>
                            <td className="text-center py-3 pr-3 text-xs text-gray-400">
                              <p>{m.player1_wins_before}勝{m.player1_losses_before}敗</p>
                              <p>{m.player2_wins_before}勝{m.player2_losses_before}敗</p>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 修正方法の説明 */}
      <div className="p-5 bg-gray-900/40 border border-gray-700/40 rounded-2xl space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">🔧 手動修正の方法</h2>
        <p className="text-xs text-gray-400">スコアを入れ間違えた場合の修正手順：</p>
        <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
          <li>上の表で間違えた試合の「変化量」を確認</li>
          <li>Supabaseのplayersテーブルを開く</li>
          <li>該当プレーヤーの現在のratingから「誤った変化量」を引く</li>
          <li>正しいスコアで再計算した変化量を足す</li>
          <li>wins・lossesも同様に修正</li>
        </ol>
        <p className="text-xs text-gray-500 mt-2">例：本来+20のところ-15になった場合 → 現在のrating + 15 + 20 = 正しいrating</p>
      </div>
    </div>
  )
}