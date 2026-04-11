import { createClient } from '@/lib/supabase/server'

export async function getRecentNotices(limit = 5) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notices')
    .select('id, title, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data
}