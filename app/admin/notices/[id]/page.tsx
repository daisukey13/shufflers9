import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import NoticeForm from '../NoticeForm'

export default async function EditNoticePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: notice } = await supabase
    .from('notices')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!notice) notFound()

  return <NoticeForm notice={notice} />
}