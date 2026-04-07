import { createClient } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export function getPresetAvatarUrl(filename: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${filename}`
}

export async function getPresetAvatars(): Promise<{ id: string; url: string }[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('storage.objects' as any)
      .select('name')
      .eq('bucket_id', 'avatars')
      .like('name', 'preset/%')
      .order('name')
      .limit(200)

    if (error || !data) {
      // フォールバック：DBから直接取得
      const { data: objects } = await supabase.rpc('get_preset_avatars')
      if (objects) {
        return objects.map((name: string) => ({
          id: name,
          url: getPresetAvatarUrl(name),
        }))
      }
      return []
    }

    return data
      .filter((obj: any) => obj.name.match(/\.(jpg|jpeg|png|webp)$/i))
      .map((obj: any) => ({
        id: obj.name,
        url: getPresetAvatarUrl(obj.name),
      }))
  } catch {
    return []
  }
}