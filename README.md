# HS明け早見アプリ（#コンパス）

「#コンパス」の **HS合わせ**（相手のヒーロースキルが明けた瞬間に攻撃を合わせる技術）のタイミングを、キャラの組み合わせごとに文字と動画で確認できる Web アプリです。投稿はログイン不要、公開は管理者の承認制です。

- 仕様書：[docs/SPEC.md](docs/SPEC.md)
- 決定事項（仕様書の補足）：[docs/DECISIONS.md](docs/DECISIONS.md)
- 見た目の正：[docs/hs-awase.html](docs/hs-awase.html)（試作版）

---

## 1. 構成

すべて Cloudflare の無料枠で動きます（R2 は支払い方法の登録が必要。無料枠内なら請求なし）。

| 役割 | サービス | 無料枠の目安 |
|---|---|---|
| 画面・API の配信 | Cloudflare Workers（静的アセット込み、1 つの Worker） | 1 日 10 万リクエスト |
| データベース | Cloudflare D1 | 5GB |
| 動画・キャラ画像 | Cloudflare R2（バケット 1 つ） | 10GB、転送量無料 |
| ボット対策 | Cloudflare Turnstile | 無料 |
| 管理画面の認証 | Cloudflare Access（Zero Trust Free） | 50 ユーザーまで |
| 毎日の自動処理 | Workers Cron Triggers | 無料 |

```
ブラウザ ─┬─ 画面（React）・/api/*（Hono）・/media/*（公開動画・画像） ── Worker ─┬─ D1
          │                                                               └─ R2（pending/ public/ heroes/）
          └─ 動画のアップロード：署名付き URL で R2 に直接 PUT
```

| R2 のプレフィックス | 中身 | 見られる人 |
|---|---|---|
| `pending/` | 承認待ちの動画 | 管理者のみ（`/api/admin/media/*` から配信） |
| `public/` | 承認済みの動画 | 全員（`/media/*`） |
| `heroes/` | キャラ画像 | 全員（`/media/*`） |

### ディレクトリ

| パス | 内容 |
|---|---|
| `src/worker/` | Worker（Hono の API、`/media` 配信、Access の JWT 検証、Cron） |
| `src/client/` | フロント（React ＋ Vite。CSS は試作版をそのまま移植） |
| `src/shared/` | フロントと Worker で共通の定数・入力チェック（zod） |
| `migrations/` | D1 マイグレーション（`0002_seed_heroes.sql` が初期キャラ 27 体） |
| `scripts/` | 開発用のサンプルデータ |
| `tests/` | 単体テスト（`npm test`） |

---

## 2. ローカル開発

必要なもの：Node.js 20 以上。

```bash
npm install
cp .dev.vars.example .dev.vars   # ローカル用の secret（空のままで動きます）
npm run db:migrate:local         # D1（ローカル）にマイグレーションと初期データを適用
npm run sample:local             # （任意）表示確認用のサンプルデータと動画を投入
npm run dev                      # http://localhost:5173 （Vite ＋ Workers ランタイム。D1・R2 ともローカル）
```

- 管理画面は http://localhost:5173/admin を直接開きます。
- ローカル（localhost）では、次の確認を **省略** します。本番では必須で、設定が抜けていると投稿・管理画面は動きません（素通りしません）。
  - Turnstile（`TURNSTILE_SECRET_KEY` が空のとき）
  - Cloudflare Access の JWT（`ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` が空のとき）
- R2 の認証情報（`R2_*`）が空のときは、動画を Worker 経由でローカルの R2 に保存します（R2 の署名付き URL はローカルでは使えないため）。
- D1・R2 のローカルデータは `.wrangler/state` に保存されます。消せば初期状態に戻ります。

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run preview` | ビルドして `wrangler dev`（本番に近い構成、http://localhost:8787） |
| `npm test` | 単体テスト（Access の JWT 検証、署名付き URL、動画の圧縮サイズ計算） |
| `npm run typecheck` | 型チェック |

---

## 3. 本番の初期設定（はじめての 1 回）

workers.dev のアドレス（例：`https://hs-awase.<サブドメイン>.workers.dev`）で公開する前提の手順です。
アドレスは最初のデプロイで決まるので、**先にデプロイしてから** Turnstile・CORS・Access を設定し、もう一度デプロイします。

### 3-1. Cloudflare にログイン

```bash
npx wrangler login
```

### 3-2. D1 を作る

```bash
npx wrangler d1 create hs-awase
```

表示された `database_id` を `wrangler.jsonc` の `d1_databases[0].database_id` に書き換え、マイグレーションを適用します（初期キャラ 27 体も入ります）。

```bash
npm run db:migrate:remote
```

### 3-3. R2 を有効にしてバケットを作る

1. ダッシュボードの **R2** を開き、R2 を有効にします。
   - **支払い方法の登録が必要** です。無料枠（10GB など）を超えなければ請求はありません。
   - 本アプリは、合計 9GB・承認待ち 2GB を超えると動画の受付を止めるので、無料枠を超えないようにしています（8 章の安全装置）。
2. バケットを作ります。

   ```bash
   npx wrangler r2 bucket create hs-awase-media
   ```

3. **公開設定（r2.dev の公開 URL・カスタムドメイン）はしません**。
   - r2.dev はテスト用でレート制限があります。
   - バケットごと公開すると、承認待ちの動画（`pending/`）まで見えてしまいます。
   - 動画と画像は Worker の `/media/*` から配信します（承認済み・キャラ画像だけを返し、Range にも対応）。

### 3-4. 最初のデプロイ

```bash
npm run deploy
```

表示された URL（`https://hs-awase.<サブドメイン>.workers.dev`）を控えます。以降、この URL を「アプリの URL」と呼びます。

> この時点では Turnstile・R2 の認証情報・Access が未設定なので、投稿と管理画面は使えません（閲覧のみ）。

### 3-5. 動画アップロード用の R2 API トークン（署名付き URL の発行用）

1. ダッシュボードの **R2 → API トークンの管理**（Manage R2 API Tokens）で、トークンを作成します。
   - 権限：**オブジェクトの読み取りと書き込み**（Object Read & Write）
   - 対象：`hs-awase-media` バケットだけに限定
2. 表示される **アクセスキー ID** と **シークレットアクセスキー**（この画面でしか見られません）と、**アカウント ID** を secret に登録します。

```bash
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_BUCKET_NAME        # hs-awase-media
```

### 3-6. R2 の CORS 設定

ブラウザから R2 へ直接アップロードするために必要です。`r2-cors.example.json` をコピーして `origins` をアプリの URL に書き換え、設定します。

```bash
cp r2-cors.example.json r2-cors.json   # origins を書き換える
npx wrangler r2 bucket cors set hs-awase-media --file r2-cors.json
npx wrangler r2 bucket cors list hs-awase-media   # 確認
```

| 項目 | 値 | 理由 |
|---|---|---|
| origins | アプリの URL だけ | ほかのサイトから使わせない |
| methods | `PUT` だけ | アップロードにしか使わない（読み出しは Worker 経由） |
| headers | `content-type` | 署名付き URL に Content-Type（`video/mp4`）を含めているため |

> ダッシュボード（R2 → バケット → 設定 → CORS ポリシー）で設定する場合は、S3 形式で次のように入力します。
> `[{"AllowedOrigins":["https://hs-awase.<サブドメイン>.workers.dev"],"AllowedMethods":["PUT"],"AllowedHeaders":["content-type"],"MaxAgeSeconds":3600}]`

### 3-7. Turnstile

1. ダッシュボードの **Turnstile → ウィジェットを追加** で作成します。
   - ホスト名：`hs-awase.<サブドメイン>.workers.dev`
   - モード：マネージド（推奨）
2. **サイトキー** を `wrangler.jsonc` の `vars.TURNSTILE_SITE_KEY` に書きます（公開してよい値）。
3. **シークレットキー** を secret に登録します。

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

### 3-8. 管理画面の認証（Cloudflare Access）

> **⚠ 要確認（オーナーと相談中）**：workers.dev のアドレスで `/admin` と `/api/admin` の **パスだけ** を Access で保護できるかを、実際のダッシュボードで確認する必要があります。結果に合わせてこの節を確定します。

管理画面は、次の 2 重で守っています。
- **Cloudflare 側**：Access のログイン（登録したメールアドレスに届くワンタイムコード）
- **Worker 側**：Access が付ける JWT（`Cf-Access-Jwt-Assertion` ヘッダー、または `CF_Authorization` Cookie）を、公開鍵で検証

Access の保護対象にするパス：
- `/admin`、`/admin/*`（管理画面）
- `/api/admin/*`（管理 API・承認待ち動画の配信）

設定の大まかな流れ：
1. Zero Trust ダッシュボードでチーム名を決めます（例：`myteam` → `myteam.cloudflareaccess.com`）。プランは Free（50 ユーザーまで無料）。
2. ログイン方法は「ワンタイム PIN」（初期状態で有効）を使います。
3. Access アプリケーションを作り、ポリシーで **管理者のメールアドレスだけを許可** します。
4. アプリケーションの **AUD タグ** とチームのドメインを `wrangler.jsonc` に書きます。

```jsonc
"vars": {
  "ACCESS_TEAM_DOMAIN": "myteam.cloudflareaccess.com",  // https:// の有無は問わない
  "ACCESS_AUD": "（Access アプリケーションの AUD タグ）"
}
```

確認方法：
- ログインしていない状態でアプリの URL の `/admin` と `/api/admin/pending` を開くと、Access のログイン画面になること
- ログイン後は管理画面が表示されること
- 一般向けの画面（`/`）はログインなしで見られること

### 3-9. もう一度デプロイ

```bash
npm run deploy
```

投稿 → 管理画面で承認 → 詳細画面に表示、まで通しで確認します。

---

## 4. 環境変数・バインディング

`wrangler.jsonc` の `vars`（公開してよい値）と、`wrangler secret put` で登録する secret（秘密の値）に分かれます。

| 名前 | 種類 | 内容 | 初期値 |
|---|---|---|---|
| `DB` | D1 バインディング | データベース | — |
| `MEDIA` | R2 バインディング | 動画・画像のバケット | — |
| `ASSETS` | アセット | 画面（ビルド済みのフロント） | — |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | secret | 署名付き URL の発行用（3-5） | — |
| `TURNSTILE_SITE_KEY` | vars | Turnstile のサイトキー（3-7） | 空 |
| `TURNSTILE_SECRET_KEY` | secret | Turnstile のシークレットキー（3-7） | — |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | vars | Access の JWT 検証用（3-8） | 空 |
| `STORAGE_LIMIT_BYTES` | vars | 動画の受付を止める合計容量 | `9663676416`（9GB） |
| `PENDING_LIMIT_BYTES` | vars | 承認待ちの容量上限 | `2147483648`（2GB） |
| `MEDIA_BASE_URL` | vars | 動画・画像の配信元 | `/media` |
| `PENDING_EXPIRE_ACTION` | vars | 14 日以上審査されない承認待ち：`keep`（残す）／`delete`（却下扱いにして動画を削除） | `keep` |

フロント側（ビルド時）：

| 名前 | 内容 | 初期値 |
|---|---|---|
| `VITE_FFMPEG_CORE_URL` | ffmpeg.wasm のコアの読み込み元（WebCodecs が使えないブラウザで動画を変換するときだけ使う。約 31MB で Workers の静的アセットの上限を超えるため CDN から読み込む） | `https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm` |

---

## 5. 日々の運用

### 管理画面

アプリの URL の `/admin` を **直接** 開きます（一般向けの画面にはリンクを置いていません）。ブックマークやホーム画面への追加がおすすめです。

| タブ | できること |
|---|---|
| 承認待ち | タイミングごとに承認／却下／編集して承認。修正提案は公開中の内容と並べて表示。上部に容量メーター |
| キャラ管理 | 追加（「名前, slug」をまとめて貼り付け）・名前／slug の変更・画像の設定と削除・▲▼で並べ替え・削除 |
| 設定 | 制作者の応援コード、フッターの注意事項、「このアプリについて」の文面 |

### 毎日の自動処理（Cron：日本時間 3:17）

- 使われていない動画・画像を削除します。対象は、却下・取り下げ・修正で置き換えられたもの、アップロードされたのに 24 時間以上登録されなかったものです。
- D1 に記録している容量を、R2 の実際の一覧と照合して直します。
- `PENDING_EXPIRE_ACTION=delete` のときは、14 日以上審査されていない承認待ちを却下扱いにします。

実行結果は Workers のログ（ダッシュボード → Workers → hs-awase → ログ）に `maintenance {...}` として出ます。

### 容量の上限（課金を防ぐ安全装置）

- 合計が `STORAGE_LIMIT_BYTES`、または承認待ちが `PENDING_LIMIT_BYTES` を超えると、新しい動画の受付を止めます。
- 動画は必須なので、受付停止中は投稿もできません（決定事項 A）。投稿フォームには「現在、動画の受付を停止しています」と表示します。
- 承認待ちを審査する（承認すると `public/` に移り、却下すると削除される）か、不要なキャラ・投稿を削除すると再開します。

### 変更をデプロイする

```bash
npm run db:migrate:remote   # migrations/ に新しいファイルを追加したときだけ
npm run deploy
```

---

## 6. 独自ドメインを取得した場合（未決事項 2）

当面は workers.dev で運用し、動画は Worker 経由で配信します。独自ドメインを取得した場合：

- **アプリ自体**：Workers のカスタムドメインに設定すると、Access をパス単位（`/admin` など）で設定しやすくなります。CORS の origins と Turnstile のホスト名も新しいドメインに変えます。
- **メディアの配信元**：`MEDIA_BASE_URL` を変えると、動画・画像の URL の前半が切り替わります（例：`https://media.example.com`）。
  - ただし、今のバケットにそのままカスタムドメインを接続すると、**承認待ちの `pending/` も公開されてしまいます**。
  - 直接配信に切り替える場合は、公開用のバケット（`public/` と `heroes/` だけを置く）を別に作る改修が必要です。
  - それまでは `MEDIA_BASE_URL=/media`（Worker 経由）のままにしてください。

---

## 7. うまく動かないとき

| 症状 | 確認すること |
|---|---|
| 投稿で「ロボットではないことの確認に失敗しました」 | `TURNSTILE_SITE_KEY`（vars）と `TURNSTILE_SECRET_KEY`（secret）が同じウィジェットの組か。ウィジェットのホスト名がアプリの URL と一致しているか |
| 動画のアップロードで失敗する | R2 の CORS（3-6）の origins がアプリの URL と一致しているか。`R2_*` の secret が揃っているか。API トークンが対象バケットに書き込めるか |
| 管理画面が「管理者としてログインしていません」 | `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` が正しいか。Access の保護対象に `/api/admin/*` も入っているか |
| 管理画面・投稿が 503 になる | 本番で Access や Turnstile の設定が空のまま（設定漏れで素通りしないよう、わざと止めています） |
| 古いブラウザで「変換機能を読み込めませんでした」 | WebCodecs が使えず、ffmpeg.wasm を CDN から読み込めなかった（通信状況を確認） |
