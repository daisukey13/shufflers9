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

export type SinglesMatch = {
  id: string
  player1_id: string
  player2_id: string
  score1: number
  score2: number
  winner_id: string | null
  rating_change1: number
  rating_change2: number
  player1_hc: number | null
  player2_hc: number | null
  player1_rank: number | null
  player2_rank: number | null
  status: 'pending' | 'confirmed'
  tournament_id: string | null
  tournament_round: number | null
  registered_by: string | null
  played_at: string
  created_at: string
  player1?: Player
  player2?: Player
}

export type TeamsMatch = {
  id: string
  team1_id: string
  team2_id: string
  score1: number
  score2: number
  winner_id: string | null
  rating_change1: number
  rating_change2: number
  status: 'pending' | 'confirmed'
  tournament_id: string | null
  tournament_round: number | null
  registered_by: string | null
  played_at: string
  created_at: string
  team1?: Team
  team2?: Team
}

export type Tournament = {
  id: string
  name: string
  type: 'singles' | 'teams'
  status: 'open' | 'in_progress' | 'finished'
  description: string | null
  started_at: string | null
  finished_at: string | null
  created_by: string | null
  created_at: string
}

export type Notice = {
  id: string
  title: string
  body: string
  is_published: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
}