type BadgeProps = {
  wins: number
  runnerUps: number
  qualifications: number
  size?: 'sm' | 'md'
}

type BadgeItem = {
  emoji: string
  count: number
  label: string
  color: string
}

function BadgeGroup({ emoji, count, label, color, size }: {
  emoji: string
  count: number
  label: string
  color: string
  size: 'sm' | 'md'
}) {
  if (count === 0) return null

  const groups5 = Math.floor(count / 5)
  const remainder = count % 5

  return (
    <div className="flex items-center gap-0.5" title={`${label} ${count}回`}>
      {/* 5回ごとに大きいバッジ */}
      {Array.from({ length: groups5 }).map((_, i) => (
        <span
          key={`big-${i}`}
          className={size === 'sm' ? 'text-xl' : 'text-2xl'}
          title={`${label} 5回`}
        >
          {emoji}
        </span>
      ))}
      {/* 残り */}
      {Array.from({ length: remainder }).map((_, i) => (
        <span
          key={`sm-${i}`}
          className={size === 'sm' ? 'text-sm' : 'text-base'}
          title={label}
        >
          {emoji}
        </span>
      ))}
    </div>
  )
}

export default function TournamentBadges({ wins, runnerUps, qualifications, size = 'sm' }: BadgeProps) {
  if (wins === 0 && runnerUps === 0 && qualifications === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <BadgeGroup
        emoji="🥇"
        count={wins}
        label="優勝"
        color="text-yellow-400"
        size={size}
      />
      <BadgeGroup
        emoji="🥈"
        count={runnerUps}
        label="準優勝"
        color="text-gray-400"
        size={size}
      />
      <BadgeGroup
        emoji="🎖️"
        count={qualifications}
        label="本戦進出"
        color="text-orange-400"
        size={size}
      />
    </div>
  )
}