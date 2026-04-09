export type Player = {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  rating: number
  hc: number
  wins: number
  losses: number
  total_score: number
  total_matches: number
  is_active: boolean
  is_admin: boolean
  full_name: string | null
  phone: string | null
  address: string | null
  tournament_wins: number
  tournament_runner_ups: number
  tournament_qualifications: number
  created_at: string
}
export type Team = {
  id: string
  name: string
  avatar_url: string | null
  rating: number
  wins: number
  losses: number
  is_active: boolean
  created_at: string
}

export type TeamMember = {
  id: string
  team_id: string
  player_id: string
  joined_at: string
  player?: Player
}