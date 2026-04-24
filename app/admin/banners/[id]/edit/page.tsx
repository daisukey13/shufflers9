import { getAllBanners } from '@/lib/queries/banners'
import BannerForm from '../../BannerForm'
import { notFound } from 'next/navigation'

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const banners = await getAllBanners()
  const banner = banners.find(b => b.id === id)
  if (!banner) notFound()

  return <BannerForm banner={banner} />
}
