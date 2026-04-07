'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Config = {
  initial_rating: number
  min_rating: number
  k_factor_beginner: number
  k_factor_intermediate: number
  k_factor_advanced: number
  beginner_threshold: number
  advanced_threshold: number
  initial_hc: number
  hc_min_matches: number
  hc_weight_winrate: number
  hc_weight_score: number
  hc_weight_experience: number
  hc_max_matches: number
}

type Props = { config: Config }

export default function RankingConfigClient({ config }: Props) {
  const [values, setValues] = useState<Config>(config)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()

  const update = (key: keyof Config, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  const weightTotal = values.hc_weight_winrate + values.hc_weight_score + values.hc_weight_experience
  const weightValid = Math.abs(weightTotal - 1.0) < 0.01

  const handleSave = async () => {
    if (!weightValid) {
      setMessage('❌ HCの重みの合計が1.0になるようにしてください')
      return
    }
    setLoading(true)
    setMessage(null)

    const { error } = await supabase
      .from('ranking_config')
      .update(values)
      .eq('id', 1)

    setLoading(false)
    setMessage(error ? '❌ 保存に失敗しました' : '✅ 保存しました')
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">⚙️ ランキング設定</h1>

      {message && (
        <p className={`px-4 py-2 rounded-lg text-sm ${
          message.startsWith('✅') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
        }`}>
          {message}
        </p>
      )}

      {/* RPセクション */}
      <section className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-purple-300">🏆 RPパラメータ</h2>

        <div className="grid grid-cols-2 gap-6">
          <ConfigItem
            label="初期RP"
            description="登録直後のレーティング（業界標準: 1000）"
            value={values.initial_rating}
            min={500} max={2000} step={100}
            onChange={v => update('initial_rating', v)}
          />
          <ConfigItem
            label="最低RP"
            description="RPの下限値。これ以下には下がらない"
            value={values.min_rating}
            min={0} max={900} step={50}
            onChange={v => update('min_rating', v)}
          />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <ConfigItem
            label="Kファクター（初心者）"
            description={`${values.beginner_threshold}試合未満の変動幅`}
            value={values.k_factor_beginner}
            min={10} max={60} step={2}
            onChange={v => update('k_factor_beginner', v)}
          />
          <ConfigItem
            label="Kファクター（中級者）"
            description={`${values.beginner_threshold}〜${values.advanced_threshold}試合の変動幅`}
            value={values.k_factor_intermediate}
            min={10} max={60} step={2}
            onChange={v => update('k_factor_intermediate', v)}
          />
          <ConfigItem
            label="Kファクター（上級者）"
            description={`${values.advanced_threshold}試合以上の変動幅`}
            value={values.k_factor_advanced}
            min={10} max={60} step={2}
            onChange={v => update('k_factor_advanced', v)}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <ConfigItem
            label="初心者閾値（試合数）"
            description="この試合数未満は初心者扱い"
            value={values.beginner_threshold}
            min={1} max={20} step={1}
            onChange={v => update('beginner_threshold', v)}
          />
          <ConfigItem
            label="上級者閾値（試合数）"
            description="この試合数以上は上級者扱い"
            value={values.advanced_threshold}
            min={10} max={100} step={5}
            onChange={v => update('advanced_threshold', v)}
          />
        </div>
      </section>

      {/* HCセクション */}
      <section className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-purple-300">🎯 HCパラメータ</h2>

        <div className="grid grid-cols-2 gap-6">
          <ConfigItem
            label="初期HC"
            description="登録直後のHC（最大値 = 最も弱い）"
            value={values.initial_hc}
            min={10} max={54} step={1}
            onChange={v => update('initial_hc', v)}
          />
          <ConfigItem
            label="HC有効化最低試合数"
            description="この試合数未満は初期HCのまま"
            value={values.hc_min_matches}
            min={1} max={20} step={1}
            onChange={v => update('hc_min_matches', v)}
          />
        </div>

        <ConfigItem
          label="経験値最大試合数"
          description="この試合数以上は経験値補正が最大（1.0）になる"
          value={values.hc_max_matches}
          min={10} max={200} step={10}
          onChange={v => update('hc_max_matches', v)}
        />

        {/* 重み設定 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">HC計算の重み</h3>
            <span className={`text-sm font-bold ${weightValid ? 'text-green-400' : 'text-red-400'}`}>
              合計: {weightTotal.toFixed(2)} {weightValid ? '✅' : '❌ （1.0にしてください）'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <ConfigItem
              label="勝率の重み"
              description="勝ち負けの影響度"
              value={values.hc_weight_winrate}
              min={0} max={1} step={0.05}
              isDecimal
              onChange={v => update('hc_weight_winrate', v)}
            />
            <ConfigItem
              label="平均得点の重み"
              description="平均スコアの影響度"
              value={values.hc_weight_score}
              min={0} max={1} step={0.05}
              isDecimal
              onChange={v => update('hc_weight_score', v)}
            />
            <ConfigItem
              label="経験値の重み"
              description="試合数の影響度"
              value={values.hc_weight_experience}
              min={0} max={1} step={0.05}
              isDecimal
              onChange={v => update('hc_weight_experience', v)}
            />
          </div>
        </div>

        {/* HC計算プレビュー */}
        <div className="bg-black/20 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">📊 HC計算プレビュー</h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              { label: '強者', wins: 40, matches: 50, avgScore: 12 },
              { label: '中級者', wins: 25, matches: 50, avgScore: 9 },
              { label: '初心者', wins: 10, matches: 50, avgScore: 6 },
            ].map(example => {
              const winRate = example.wins / example.matches
              const avgScoreRate = example.avgScore / 15
              const experience = Math.min(example.matches / values.hc_max_matches, 1.0)
              const totalScore =
                winRate * values.hc_weight_winrate +
                avgScoreRate * values.hc_weight_score +
                experience * values.hc_weight_experience
              const hc = Math.round((1 - totalScore) * values.initial_hc)
              return (
                <div key={example.label} className="bg-purple-900/30 rounded-lg p-3 text-center">
                  <p className="text-gray-300 font-medium mb-1">{example.label}</p>
                  <p className="text-gray-400">{example.wins}勝/{example.matches}試合</p>
                  <p className="text-gray-400">平均{example.avgScore}点</p>
                  <p className="text-purple-400 font-bold text-base mt-1">HC {hc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={loading || !weightValid}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition"
      >
        {loading ? '保存中...' : '設定を保存'}
      </button>
    </div>
  )
}

// 共通スライダーコンポーネント
function ConfigItem({
  label,
  description,
  value,
  min,
  max,
  step,
  isDecimal = false,
  onChange,
}: {
  label: string
  description: string
  value: number
  min: number
  max: number
  step: number
  isDecimal?: boolean
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white">{label}</label>
        <span className="text-purple-400 font-bold text-sm">
          {isDecimal ? value.toFixed(2) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(isDecimal ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-full accent-purple-500"
      />
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}