import { getAllBanners } from '@/lib/queries/banners'
import Link from 'next/link'
import BannerAdminClient from './BannerAdminClient'

export default async function BannersAdminPage() {
  const banners = await getAllBanners()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📣 バナー管理</h1>
        <Link
          href="/admin/banners/new"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
        >
          ＋ 新規作成
        </Link>
      </div>

      <BannerAdminClient banners={banners} />
    </div>
  )
}
