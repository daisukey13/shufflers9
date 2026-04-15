import { createClient } from '@/lib/supabase/server'
import { Player, Team } from '@/types'

export async function getPlayerRankings(): Promise<Player[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .eq('is_admin', false)
    .order('rating', { ascending: false })
    .order('hc', { ascending: false })
    .order('total_matches', { ascending: false })

  if (error) throw error
  return data
}

// 同ポイント同順位・以下繰り下げのランク付与（汎用）
export function calcRanks<T>(
  players: T[],
  isTie: (a: T, b: T) => boolean
): (T & { rank: number })[] {
  const result: (T & { rank: number })[] = []
  for (let i = 0; i < players.length; i++) {
    let rank: number
    if (i === 0) {
      rank = 1
    } else if (isTie(players[i], players[i - 1])) {
      rank = result[i - 1].rank
    } else {
      rank = i + 1
    }
    result.push({ ...players[i], rank })
  }
  return result
}

// シングルス同順位判定: RP = HC = 試合数
export const singlesTie = (a: Player, b: Player) =>
  a.rating === b.rating && a.hc === b.hc && a.total_matches === b.total_matches

// ダブルス同順位判定: ダブルスRP = HC = ダブルス試合数
export const doublesTie = (a: Player, b: Player) =>
  a.doubles_rating === b.doubles_rating &&
  a.hc === b.hc &&
  (a.doubles_wins + a.doubles_losses) === (b.doubles_wins + b.doubles_losses)

export async function getTeamRankings(): Promise<Team[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false })

  if (error) throw error
  return data
}
