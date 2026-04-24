import { getRecentSinglesMatches } from '@/lib/queries/matches'
import { createClient } from '@/lib/supabase/server'
import MatchesClient from './MatchesClient'

export default async function MatchesPage() {
  const supabase = await createClient()

  const [singles, doublesResult, qualifyingResult, finalsResult] = await Promise.all([
    getRecentSinglesMatches(50),
    supabase.from('doubles_matches').select(`
      *,
      pair1_player1:players!pair1_player1_id(id, name, avatar_url, hc, rating, is_active),
      pair1_player2:players!pair1_player2_id(id, name, avatar_url, hc, rating, is_active),
      pair2_player1:players!pair2_player1_id(id, name, avatar_url, hc, rating, is_active),
      pair2_player2:players!pair2_player2_id(id, name, avatar_url, hc, rating, is_active)
    `).eq('mode', 'normal').order('played_at', { ascending: false }).limit(50),
    supabase.from('tournament_qualifying_matches').select('*, block:tournament_blocks(block_name, tournament:tournaments(id, name)), player1:players!player1_id(id, name, avatar_url, hc, rating, is_active), player2:players!player2_id(id, name, avatar_url, hc, rating, is_active)').eq('mode', 'normal').not('winner_id', 'is', null).order('played_at', { ascending: false }).limit(50),
    supabase.from('tournament_finals_matches').select('*, tournament:tournaments(id, name), player1:players!player1_id(id, name, avatar_url, hc, rating, is_active), player2:players!player2_id(id, name, avatar_url, hc, rating, is_active), tournament_finals_sets(*)').not('winner_id', 'is', null).order('played_at', { ascending: false }).limit(50),
  ])

  type MatchItem = {
    id: string
    played_at: string
    type: 'singles' | 'teams' | 'qualifying' | 'finals' | 'doubles'
    tournamentName?: string
    tournamentId?: string
    blockName?: string
    winnerId: string | null
    player1Id: string
    player2Id: string
    player1Name: string
    player2Name: string
    player1Avatar: string | null
    player2Avatar: string | null
    player1IsActive?: boolean
    player2IsActive?: boolean
    score1: number | null
    score2: number | null
    mode?: string
    sets?: { set_number: number; score1: number; score2: number }[]
    player1_hc?: number | null
    player2_hc?: number | null
    player1_rp?: number | null
    player2_rp?: number | null
    player1_rank?: number | null
    player2_rank?: number | null
    winnerPair?: number | null
    pair1p1Name?: string
    pair1p2Name?: string
    pair2p1Name?: string
    pair2p2Name?: string
    pair1p1Avatar?: string | null
    pair1p2Avatar?: string | null
    pair2p1Avatar?: string | null
    pair2p2Avatar?: string | null
  }

  const singlesMatches: MatchItem[] = singles
    .filter(m => m.player1?.name !== 'DEFAULT' && m.player2?.name !== 'DEFAULT')
    .map(m => ({
      id: m.id,
      played_at: m.played_at,
      type: 'singles' as const,
      winnerId: m.winner_id,
      player1Id: m.player1_id,
      player2Id: m.player2_id,
      player1Name: m.player1?.name ?? '不明',
      player2Name: m.player2?.name ?? '不明',
      player1Avatar: m.player1?.avatar_url ?? null,
      player2Avatar: m.player2?.avatar_url ?? null,
      player1IsActive: m.player1?.is_active !== false,
      player2IsActive: m.player2?.is_active !== false,
      score1: m.score1,
      score2: m.score2,
      player1_hc: m.player1_hc,
      player2_hc: m.player2_hc,
      player1_rp: m.player1?.rating ?? null,
      player2_rp: m.player2?.rating ?? null,
      player1_rank: m.player1_rank,
      player2_rank: m.player2_rank,
    }))

  const doublesMatches: MatchItem[] = (doublesResult.data ?? [])
    .filter((m: any) => m.pair1_player1?.name !== 'DEFAULT' && m.pair2_player1?.name !== 'DEFAULT')
    .map((m: any) => ({
      id: m.id,
      played_at: m.played_at,
      type: 'doubles' as const,
      winnerId: null,
      winnerPair: m.winner_pair,
      player1Id: m.pair1_player1_id,
      player2Id: m.pair2_player1_id,
      player1Name: `${m.pair1_player1?.name ?? '不明'} / ${m.pair1_player2?.name ?? '不明'}`,
      player2Name: `${m.pair2_player1?.name ?? '不明'} / ${m.pair2_player2?.name ?? '不明'}`,
      player1Avatar: m.pair1_player1?.avatar_url ?? null,
      player2Avatar: m.pair2_player1?.avatar_url ?? null,
      score1: m.score1,
      score2: m.score2,
      pair1p1Name: m.pair1_player1?.name ?? '不明',
      pair1p2Name: m.pair1_player2?.name ?? '不明',
      pair2p1Name: m.pair2_player1?.name ?? '不明',
      pair2p2Name: m.pair2_player2?.name ?? '不明',
      pair1p1Avatar: m.pair1_player1?.avatar_url ?? null,
      pair1p2Avatar: m.pair1_player2?.avatar_url ?? null,
      pair2p1Avatar: m.pair2_player1?.avatar_url ?? null,
      pair2p2Avatar: m.pair2_player2?.avatar_url ?? null,
    }))

  const tournamentMatches: MatchItem[] = [
    ...(qualifyingResult.data ?? [])
      .filter((m: any) => m.player1?.name !== 'DEFAULT' && m.player2?.name !== 'DEFAULT')
      .map((m: any) => ({
        id: m.id,
        played_at: m.played_at,
        type: 'qualifying' as const,
        tournamentName: m.block?.tournament?.name,
        tournamentId: m.block?.tournament?.id,
        blockName: m.block?.block_name,
        winnerId: m.winner_id,
        player1Id: m.player1_id,
        player2Id: m.player2_id,
        player1Name: m.player1?.name ?? '不明',
        player2Name: m.player2?.name ?? '不明',
        player1Avatar: m.player1?.avatar_url ?? null,
        player2Avatar: m.player2?.avatar_url ?? null,
        player1IsActive: m.player1?.is_active !== false,
        player2IsActive: m.player2?.is_active !== false,
        score1: m.score1,
        score2: m.score2,
        mode: m.mode,
        player1_hc: m.player1?.hc ?? null,
        player2_hc: m.player2?.hc ?? null,
        player1_rp: m.player1?.rating ?? null,
        player2_rp: m.player2?.rating ?? null,
      })),
    ...(finalsResult.data ?? [])
      .filter((m: any) => m.player1?.name !== 'DEFAULT' && m.player2?.name !== 'DEFAULT')
      .map((m: any) => ({
        id: m.id,
        played_at: m.played_at,
        type: 'finals' as const,
        tournamentName: m.tournament?.name,
        tournamentId: m.tournament?.id,
        winnerId: m.winner_id,
        player1Id: m.player1_id,
        player2Id: m.player2_id,
        player1Name: m.player1?.name ?? '不明',
        player2Name: m.player2?.name ?? '不明',
        player1Avatar: m.player1?.avatar_url ?? null,
        player2Avatar: m.player2?.avatar_url ?? null,
        player1IsActive: m.player1?.is_active !== false,
        player2IsActive: m.player2?.is_active !== false,
        score1: null,
        score2: null,
        sets: m.tournament_finals_sets?.sort((a: any, b: any) => a.set_number - b.set_number),
        player1_hc: m.player1?.hc ?? null,
        player2_hc: m.player2?.hc ?? null,
        player1_rp: m.player1?.rating ?? null,
        player2_rp: m.player2?.rating ?? null,
      })),
  ].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())

  return (
    <MatchesClient
      singlesMatches={singlesMatches}
      doublesMatches={doublesMatches}
      tournamentMatches={tournamentMatches}
    />
  )
}
