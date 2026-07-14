# Shufflers9 — CLAUDE.md

## プロジェクト概要

**豊浦シャッフラーズクラブ** (Toyoura Shufflers Club) の会員管理・ランキングシステム。
テーブルシャッフルボードクラブ向けの会員・試合・トーナメント・ランキング管理 Web アプリ。
本番URL: https://toyoura.online

---

## 技術スタック

| 項目 | 内容 |
|------|------|
| Framework | Next.js 16.2.1 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Auth / DB | Supabase (PostgreSQL + RLS) |
| Hosting | Vercel |
| Notifications | Nodemailer (email), LINE Official Account |
| CAPTCHA | Cloudflare Turnstile |

---

## ディレクトリ構成

```
app/
  (public)/         # 認証不要の公開ページ
  (auth)/mypage/    # ログイン必須ページ
  admin/            # 管理者専用ページ
  auth/             # 認証フロー (callback, confirm, reset)
  api/              # API ルート
components/         # 共通コンポーネント
lib/
  supabase/
    server.ts       # SSR クライアント (cookie ベース)
    admin.ts        # 管理者クライアント (service role key / RLS バイパス)
    client.ts       # クライアントサイドクライアント (anon key)
  queries/          # DB クエリ関数群
  elo.ts            # ELO レーティング計算 (K=32)
types/index.ts      # 全 TypeScript 型定義
```

---

## 主要機能

### 公開ページ
- `/` — ホームページ (統計・トップ5・バナー・告知・最近の試合)
- `/players` — 会員一覧 (HC/レーティング順ソート、検索)
- `/rankings` — ランキング (週次/月次/全期間)
- `/matches` — 試合結果一覧
- `/tournaments` — トーナメント一覧・詳細

### ユーザーページ (要ログイン)
- `/mypage` — マイページ (勝敗・stats)
- `/matches/register/singles` — シングルス試合登録
- `/matches/register/doubles` — ダブルス試合登録

### 管理者ページ
- `/admin` — ダッシュボード
- `/admin/players` — 会員管理 (作成/編集/非活性化)
- `/admin/matches` — 試合管理 (編集/削除)
- `/admin/tournaments/[id]` — トーナメント進行 (エントリー → 予選 → 決勝)
- `/admin/ranking-config` — ランキング計算パラメータ調整
- `/admin/line` — LINE ブロードキャスト

---

## データベース主要テーブル

| テーブル | 目的 |
|---------|------|
| `players` | 会員プロフィール・stats (rating, hc, wins, losses 等) |
| `singles_matches` | シングルス試合記録 |
| `doubles_matches` | ダブルス試合記録 |
| `tournaments` | トーナメント情報 |
| `tournament_entries` | 出場登録 |
| `tournament_blocks` | 予選ブロック |
| `tournament_block_players` | ブロック配置 |
| `tournament_qualifying_matches` | 予選試合 |
| `tournament_finals_matches` | 決勝トーナメント試合 |
| `tournament_finals_sets` | 決勝セットスコア |
| `tournament_pairs` | ダブルスペア |
| `notices` | 告知 |
| `ranking_config` | ランキング計算設定 |

---

## 重要な注意事項

### RLS (Row-Level Security)
- Supabase の RLS が有効。ユーザー操作は `createClient()` (anon key)、管理者操作は `createAdminClient()` (service role key) を使う
- 試合登録など RLS に引っかかる操作は API ルート経由で adminClient を使う設計になっている

### 試合ステータス
- `pending` — 未確定
- `confirmed` — 通常試合
- `retirement` — 途中棄権 (レーティング変動なし)
- `walkover` — 不戦勝 (レーティング変動なし、stats 更新なし)

### ELO レーティング
- K 係数: 32
- 期待スコア: `1 / (1 + 10^((ratingB - ratingA) / 400))`
- 実装: `lib/elo.ts`

### Supabase RPC 関数
- `calc_elo(...)` — ELO 計算
- `calc_hc(...)` — ハンデ計算
- `update_tournament_stats(tournament_id)` — トーナメント終了時にバッジ更新

### 特殊プレーヤー
- `user_id = 00000000-0000-0000-0000-000000000000` — ダミープレーヤー。予選ブロックが3人未満の場合に自動補填

### 管理者チェック
- `players.is_admin = true` で判定
- 管理者ページは layout.tsx でリダイレクト
- 管理者 API は全てリクエスト内で admin 確認を行う

---

## 環境変数

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
LINE_CHANNEL_ACCESS_TOKEN
```

GitHub Actions 用シークレット: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `APP_URL`

---

## GitHub Actions

| ワークフロー | 実行タイミング | 内容 |
|------------|-------------|------|
| `backup.yml` | 毎日 16:00 UTC (01:00 JST) | 全テーブルを JSON で `backups` ブランチに保存 (7日分) |
| `deactivate-inactive.yml` | 毎日 16:00 UTC | 1年間試合なしの会員を非活性化 |

---

## 開発コマンド

```bash
npm run dev     # 開発サーバー起動
npm run build   # ビルド
npm run lint    # ESLint
```
