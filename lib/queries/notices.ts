import { createPublicClient } from '@/lib/supabase/public'
import { unstable_cache } from 'next/cache'

export const getRecentNotices = unstable_cache(
  async (limit = 5) => {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('notices')
      .select('id, title, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return data
  },
  ['recent-notices'],
  { revalidate: 120 } // 2分（管理画面がクライアント直更新のため短め）
)
