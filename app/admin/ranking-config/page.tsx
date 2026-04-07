import { createClient } from '@/lib/supabase/server'
import RankingConfigClient from './RankingConfigClient'

export default async function RankingConfigPage() {
  const supabase = await createClient()
  const { data: config } = await supabase
    .from('ranking_config')
    .select('*')
    .single()

  return <RankingConfigClient config={config} />
}