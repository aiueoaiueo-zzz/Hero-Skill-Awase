# HS明け早見アプリ（#コンパス）

仕様書：[docs/SPEC.md](docs/SPEC.md)　／　見た目の正：[docs/hs-awase.html](docs/hs-awase.html)（試作版）

Cloudflare Workers（静的アセット配信込み）＋ D1 ＋ R2。フロントは React ＋ Vite ＋ TypeScript、API は Hono。

> Cloudflare の各サービスの設定・デプロイ手順は、実装ステップ 8 で追記します。

## ローカル開発

```bash
npm install
cp .dev.vars.example .dev.vars   # ローカル用の secret
npm run db:migrate:local         # D1（ローカル）にマイグレーションと初期データを適用
npm run sample:local             # （任意）表示確認用のサンプルデータと動画を投入
npm run dev                      # http://localhost:5173 （Vite ＋ Workers ランタイム。D1・R2 ともローカル）
```

ビルド後の構成を `wrangler dev` で確認する場合：

```bash
npm run preview                  # build → wrangler dev（http://localhost:8787）
```

管理画面は http://localhost:5173/admin を直接開きます（ローカルでは Cloudflare Access の確認を省略します。本番では必須）。

単体テスト：`npm test`

D1・R2 のローカルデータは `.wrangler/state` に保存されます（`npm run dev` と `wrangler dev` で共通）。

## ディレクトリ

| パス | 内容 |
|---|---|
| `src/worker/` | Worker（Hono の API、`/media` 配信、Cron） |
| `src/client/` | フロント（React） |
| `src/shared/` | フロントと Worker で共通の定数・入力チェック |
| `migrations/` | D1 マイグレーション（`0002_seed_heroes.sql` が初期データ） |
| `scripts/` | 開発用スクリプト・サンプルデータ（`npm run sample:local` でローカルに投入） |
