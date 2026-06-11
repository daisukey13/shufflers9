// クライアントサイドから players/matches のクエリキャッシュ無効化を依頼する。
// 失敗してもUXを妨げない（キャッシュは最大5分で自然更新されるため）。
export function notifyStatsChanged(): void {
  fetch('/api/revalidate', { method: 'POST' }).catch(() => {})
}
