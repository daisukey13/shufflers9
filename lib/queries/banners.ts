import { createClient } from '@/lib/supabase/server'

export type Banner = {
  id: string
  title: string
  body: string | null
  link_url: string | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  sort_order: number
}

export async function getActiveBanners(): Promise<Banner[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return data ?? []
}

export async function getAllBanners(): Promise<Banner[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  return data ?? []
}
