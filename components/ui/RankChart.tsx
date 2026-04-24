type RankPoint = {
  label: string
  rank: number
}

export default function RankChart({ points }: { points: RankPoint[] }) {
  if (points.length < 2) return null

  const ranks = points.map(p => p.rank)
  const minRank = Math.min(...ranks)
  const maxRank = Math.max(...ranks)
  const range = Math.max(maxRank - minRank, 2)

  const W = 300
  const H = 90
  const padX = 20
  const padY = 14
  const innerW = W - padX * 2
  const innerH = H - padY * 2

  const xOf = (i: number) => padX + (i / (points.length - 1)) * innerW
  // Y is inverted: lower rank number = higher on chart
  const yOf = (rank: number) => padY + ((rank - minRank) / range) * innerH

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(p.rank).toFixed(1)}`)
    .join(' ')

  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-purple-400 mb-2">順位推移（直近5試合）</p>
      <div className="bg-[#12082a] border border-purple-800/30 rounded-xl p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
          {/* Grid lines */}
          {[minRank, Math.round((minRank + maxRank) / 2), maxRank].filter((v, i, a) => a.indexOf(v) === i).map(r => (
            <line
              key={r}
              x1={padX} y1={yOf(r)}
              x2={W - padX} y2={yOf(r)}
              stroke="#4c1d95" strokeWidth="0.5" strokeDasharray="3,3"
            />
          ))}

          {/* Line */}
          <path d={pathD} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Dots + labels */}
          {points.map((p, i) => {
            const x = xOf(i)
            const y = yOf(p.rank)
            const isLast = i === points.length - 1
            const labelY = y < padY + 16 ? y + 14 : y - 6
            return (
              <g key={i}>
                <circle
                  cx={x} cy={y} r="4"
                  fill={isLast ? '#a855f7' : '#1e0a3c'}
                  stroke="#a855f7" strokeWidth="2"
                />
                <text
                  x={x} y={labelY}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isLast ? '#d8b4fe' : '#9ca3af'}
                  fontWeight={isLast ? 'bold' : 'normal'}
                >
                  {p.rank}位
                </text>
              </g>
            )
          })}

          {/* X-axis labels */}
          {points.map((p, i) => (
            <text
              key={i}
              x={xOf(i)} y={H - 1}
              textAnchor="middle"
              fontSize="8"
              fill={i === points.length - 1 ? '#d8b4fe' : '#6b7280'}
            >
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
