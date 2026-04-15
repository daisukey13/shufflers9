# Toyoura Shufflers Club (shufflers9) 仕様書・引き継ぎ書

## プロジェクト概要

**サービス名：** 豊浦シャッフラーズクラブ
**URL：** https://toyoura.online
**リポジトリ：** https://github.com/daisukey13/shufflers9
**ホスティング：** Vercel
**DB：** Supabase

---

## 技術スタック

- **フレームワーク：** Next.js 16.2.1 (App Router)
- **言語：** TypeScript
- **スタイル：** Tailwind CSS v4
- **認証：** Supabase Auth + Cloudflare Turnstile
- **DB：** Supabase (PostgreSQL)
- **ホスティング：** Vercel
- **バックアップ：** GitHub Actions（毎日深夜1時、backupsブランチ）

---

## ディレクトリ構成

```
app/
  (public)/          # 公開ページ
    page.tsx         # トップページ
    players/         # メンバー一覧・詳細
    rankings/        # ランキング
    matches/         # 試合結果
    tournaments/     # 大会一覧・詳細
    register/        # 新規会員登録
    login/           # ログイン
  (auth)/            # 要ログインページ
    mypage/          # マイページ
    matches/register/ # 試合登録
  admin/             # 管理者ページ
    players/         # プレーヤー管理
    matches/         # 試合管理
    notices/         # お知らせ管理
    tournaments/     # 大会管理
      [id]/
        entries/     # エントリー管理
        qualifying/  # 予選管理
        finals/      # 決勝管理
        rp-check/    # RP影響確認
  api/               # APIルート
    auth/
    turnstile/
components/
  layout/            # Header, Footer
  ui/                # 共通UIコンポーネント
lib/
  queries/           # DBクエリ関数
  supabase/          # Supabaseクライアント
```

---

## DBテーブル一覧

| テーブル | 説明 |
|---------|------|
| players | プレーヤー情報・RP・HC・勝敗 |
| singles_matches | シングルス試合 |
| doubles_matches | ダブルス試合 |
| teams / team_members / teams_matches | チーム関連 |
| notices | お知らせ |
| ranking_config | ランキング設定 |
| tournaments | 大会 |
| tournament_entries | エントリー |
| tournament_blocks | 予選ブロック |
| tournament_block_players | ブロックメンバー |
| tournament_qualifying_matches | 予選試合 |
| tournament_finals_matches | 決勝試合 |
| tournament_finals_sets | 決勝セットスコア |

### 主要カラム（最近追加分）

**tournament_blocks：**
- `match_time_1/2/3` text — 各試合の開始予定時間
- `scores_finalized` boolean — スコア登録完了フラグ

**tournament_qualifying_matches：**
- `scheduled_time` text — 試合開始予定時間
- `player1/2_rating_before` integer — 登録前RP
- `player1/2_rating_change` integer — RP変化量
- `player1/2_wins/losses_before` integer — 登録前勝敗

**tournament_finals_matches：**
- `scheduled_time` text — 試合開始予定時間

**tournaments：**
- `qualifying_start_time` text — 予選開始時間
- `finals_start_time` text — 決勝開始時間
- `bonus_points` integer — ボーナスポイント
- `notes` text — 注意事項

---

## 大会フロー

```
新規大会作成
  ↓
エントリー管理（status: open）
  ↓ 締切ボタン
エントリー締切（status: entry_closed）
  ↓ 予選開始ボタン
予選管理（status: qualifying）
  ・ブロック自動生成
  ・試合自動作成
  ・スコア入力
  ・スコア登録完了ボタン（公開ページに順位表示）
  ↓ 予選完了ボタン
予選完了（status: qualifying_done）
  ↓
決勝トーナメント管理（status: finals）
  ・組み合わせ自動生成（ラウンド名選択）
  ・スコア編集（3セットマッチ・不戦勝・棄権）
  ↓ 大会終了ボタン
大会終了（status: finished）
  ・update_tournament_stats RPC実行
  ・優勝者・準優勝者のバッジ更新
```

---

## RP・HC計算仕様

- **calc_elo** RPC：ELOレーティング計算
- **calc_hc** RPC：ハンディキャップ計算
- 試合登録時に登録前RP・変化量を`tournament_qualifying_matches`に保存
- **編集時はRP更新しない**（スコア・winner_idのみ更新）
- RP修正が必要な場合は`/admin/tournaments/[id]/rp-check`で確認してSupabaseで手動修正

---

## 環境変数（.env.local / Vercel）

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

**GitHub Secrets（バックアップ用）：**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 本日の変更（2026-04-15）

### シングルス試合登録に途中棄権・不戦勝を追加

**対象ファイル：**
- `app/admin/matches/register/AdminMatchRegisterClient.tsx`
- `types/index.ts`

**変更内容：**

管理者の試合登録画面（個人戦）に「結果種別」タブを追加。

| 種別 | status値 | ELO/Rating | 勝敗 | スコア集計 | HC再計算 |
|------|---------|-----------|------|-----------|---------|
| 通常 | `confirmed` | 変動あり | 更新 | 更新 | あり |
| 途中棄権 | `retirement` | **変動なし** | 更新 | 更新 | あり |
| 不戦勝 | `walkover` | **変動なし** | 更新 | **更新なし** | **なし** |

**UI の動作：**
- 途中棄権 → 「棄権したプレーヤー」を選択（= 敗者）、スコアは任意入力
- 不戦勝 → 「不戦勝プレーヤー（勝者）」を選択、スコア入力欄は非表示（0-0 で保存）

**`SinglesMatch.status` の型変更：**
```ts
// 変更前
status: 'pending' | 'confirmed'
// 変更後
status: 'pending' | 'confirmed' | 'retirement' | 'walkover'
```

**⚠️ Supabase 側の対応が必要：**
`singles_matches.status` カラムが `enum` 型の場合、`'retirement'` と `'walkover'` の値を追加すること。
`text` 型であれば対応不要。

---

## 引き継ぎ書

### 現在の状況

テストデータが入った状態で本番移行前の最終確認段階。

### 次にやること（優先順）

**① Supabase の status カラム確認**

`singles_matches.status` が enum 型であれば以下を実行：

```sql
ALTER TYPE singles_match_status ADD VALUE 'retirement';
ALTER TYPE singles_match_status ADD VALUE 'walkover';
```

text 型であれば不要。

**② テストデータの全削除**

Supabaseで以下のSQLを順番に実行：

```sql
delete from tournament_finals_sets;
delete from tournament_finals_matches;
delete from tournament_qualifying_matches;
delete from tournament_block_players;
delete from tournament_blocks;
delete from tournament_entries;
delete from tournaments;
delete from doubles_matches;
delete from singles_matches;
delete from notices;
delete from players where is_admin = false;
```

**③ 本番データで最終テスト**

1. 管理者がプレーヤーを登録
2. 大会を1つ作成してフルフローを確認
   - エントリー → 予選 → 決勝 → 終了
3. RP・HC・勝敗が正しく反映されるか確認
4. 途中棄権・不戦勝の登録が正しく動作するか確認
5. 問題なければ再度データ全削除

**④ 本番運用開始**

### 既知の注意事項

1. **予選試合のスコア入れ間違い** → `/admin/tournaments/[id]/rp-check`で変化量確認 → Supabaseで手動修正
2. **DEFAULTプレーヤー** → user_id: `00000000-0000-0000-0000-000000000000` の特殊プレーヤー。ブロックが3人未満の場合に自動補充
3. **決勝トーナメントの組み合わせ自動生成** → 試合が1つの場合はラウンド名をpromptで選択
4. **バックアップ** → 毎日深夜1時にGitHub ActionsがSupabaseの全テーブルをJSONでbackupsブランチに保存
5. **`vercel-build`スクリプト** → `package.json`に定義済み。削除しないこと
6. **途中棄権・不戦勝はシングルス（個人戦）のみ** → チーム戦には結果種別UIは表示されない

### 管理者アカウント

- 管理者は`is_admin = true`のプレーヤー
- 管理画面URL: `/admin`

### 重要なRPC関数

| 関数名 | 用途 |
|--------|------|
| calc_elo | ELOレーティング計算 |
| calc_hc | ハンディキャップ計算 |
| update_tournament_stats | 大会終了時の優勝・準優勝バッジ更新 |

---

次のチャットでは冒頭に「shufflers9プロジェクトの続きです。トランスクリプトを確認してください。」と伝えてください！
