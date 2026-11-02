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
| 画面・API の配信 | Cloudflare Workers（静的アセット込み。同じソースを一般向け・管理用の 2 つの Worker としてデプロイ） | 1 日 10 万リクエスト（アカウント全体） |
| データベース | Cloudflare D1 | 5GB |
| 動画・キャラ画像 | Cloudflare R2（バケット 1 つ） | 10GB、転送量無料 |
| ボット対策 | Cloudflare Turnstile | 無料 |
| 管理画面の認証 | Cloudflare Access（Zero Trust Free） | 50 ユーザーまで |
| 毎日の自動処理 | Workers Cron Triggers | 無料 |

```
一般の利用者 ─┬─ hs-awase.<サブドメイン>.workers.dev ──────── Worker「hs-awase」（APP_ROLE=public）──┐
              │    画面・/api/*・/media/*（/admin と /api/admin は 404）                              ├─ D1
              └─ 動画のアップロード：署名付き URL で R2 に直接 PUT ────────────────────────────────── ├─ R2（pending/ public/ heroes/）
管理者 ──── Cloudflare Access のログイン ── hs-awase-admin.<サブドメイン>.workers.dev                 │
                                             Worker「hs-awase-admin」（APP_ROLE=admin）─────────────┘
                                             アドレス全体を Access で保護 ＋ Worker でも JWT を検証
```

**管理画面を別の Worker にしている理由**：独自ドメインを使わず workers.dev で運用するため（未決事項 2）。workers.dev では Cloudflare Access を「Worker のアドレス全体」に対して設定するので、管理用の Worker を分け、そちらを丸ごと保護しています。ソースと設定ファイルは 1 つで、`APP_ROLE` で役割を切り替えます（決定事項 C）。Cron（毎日の自動処理）は一般向けの Worker だけで動きます。

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
cp .dev.vars.example .dev.vars   # ローカル用の設定（APP_ROLE=all で一般向け・管理画面の両方が動く）
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

表示された `database_id` を `wrangler.jsonc` の **2 か所**（一番上の `d1_databases` と、`env.admin` の `d1_databases`）に書き換え、マイグレーションを適用します（初期キャラ 27 体も入ります）。

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

### 3-4. 最初のデプロイ（2 つの Worker）

```bash
npm run deploy         # 一般向け：hs-awase
npm run deploy:admin   # 管理用：hs-awase-admin（CLOUDFLARE_ENV=admin でビルドしてデプロイ）
```

表示された 2 つの URL を控えます。

| 呼び方 | URL | 使う人 |
|---|---|---|
| アプリの URL | `https://hs-awase.<サブドメイン>.workers.dev` | 一般の利用者 |
| 管理画面の URL | `https://hs-awase-admin.<サブドメイン>.workers.dev` | 管理者のみ |

> この時点では Turnstile・R2 の認証情報・Access が未設定なので、投稿と管理画面は使えません（閲覧のみ。管理用の Worker は設定漏れで素通りしないよう 503 を返します）。

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

> 動画をアップロードするのは一般向けの Worker だけなので、secret は `hs-awase` にだけ登録すれば足ります（管理用の Worker のキャラ画像は Worker 経由で保存するため不要）。

### 3-6. R2 の CORS 設定

ブラウザから R2 へ直接アップロードするために必要です。`r2-cors.example.json` をコピーして `origins` をアプリの URL に書き換え、設定します。

```bash
cp r2-cors.example.json r2-cors.json   # origins を書き換える
npx wrangler r2 bucket cors set hs-awase-media --file r2-cors.json
npx wrangler r2 bucket cors list hs-awase-media   # 確認
```

| 項目 | 値 | 理由 |
|---|---|---|
| origins | アプリの URL だけ（管理画面の URL は不要） | ほかのサイトから使わせない |
| methods | `PUT` だけ | アップロードにしか使わない（読み出しは Worker 経由） |
| headers | `content-type` | 署名付き URL に Content-Type（`video/mp4`）を含めているため |

> ダッシュボード（R2 → バケット → 設定 → CORS ポリシー）で設定する場合は、S3 形式で次のように入力します。
> `[{"AllowedOrigins":["https://hs-awase.<サブドメイン>.workers.dev"],"AllowedMethods":["PUT"],"AllowedHeaders":["content-type"],"MaxAgeSeconds":3600}]`

### 3-7. Turnstile

1. ダッシュボードの **Turnstile → ウィジェットを追加** で作成します。
   - ホスト名：`hs-awase.<サブドメイン>.workers.dev`（一般向けだけ。投稿は一般向けの Worker で受け付けます）
   - モード：マネージド（推奨）
2. **サイトキー** を `wrangler.jsonc` の `vars.TURNSTILE_SITE_KEY` に書きます（公開してよい値）。
3. **シークレットキー** を secret に登録します。

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
```

### 3-8. 管理画面の認証（Cloudflare Access）

管理画面は、次の 2 重で守っています。
- **Cloudflare 側**：管理用の Worker（`hs-awase-admin`）の **アドレス全体** を Access で保護します。登録したメールアドレスに届くワンタイムコードでログインします。
- **Worker 側**：Access が付ける JWT（`Cf-Access-Jwt-Assertion` ヘッダー、または `CF_Authorization` Cookie）を、公開鍵で検証します。
- 一般向けの Worker（`hs-awase`）には、管理画面と管理 API がそもそもありません（404）。

手順：
1. **Zero Trust を有効にする**（初回のみ）
   - ダッシュボードの **Zero Trust** を開き、チーム名（例：`myteam` → `myteam.cloudflareaccess.com`）を決めます。
   - プランは **Free**（50 ユーザーまで無料）です。
2. **管理用の Worker に Access をかける**
   - **Workers & Pages → hs-awase-admin → 設定 → ドメインとルート** を開きます。
   - `workers.dev` の行で **Cloudflare Access を有効にする**（Enable Cloudflare Access）を選びます。
   - 表示される **AUD（Audience）タグ** と **JWKs の URL**（`https://<チーム名>.cloudflareaccess.com/cdn-cgi/access/certs`）を控えます。
3. **ログインできる人を管理者だけにする**
   - 「Cloudflare Access を管理」（Manage Cloudflare Access）から、作られた Access アプリケーションのポリシーを開きます。
   - **Include → Emails** に管理者のメールアドレスだけを入れます。初期状態ではアカウントのメンバー全員が対象なので、必ず確認してください。
   - ログイン方法は **ワンタイム PIN**（初期状態で有効）のままで構いません。
4. **Worker 側の JWT 検証の設定**
   - `wrangler.jsonc` の **`env.admin.vars`** に書きます（一番上の `vars` ではありません）。

   ```jsonc
   "env": {
     "admin": {
       "vars": {
         "ACCESS_TEAM_DOMAIN": "myteam.cloudflareaccess.com",  // https:// の有無は問わない
         "ACCESS_AUD": "（手順 2 で控えた AUD タグ）",
         ...
   ```

確認方法：
- ログインしていない状態で **管理画面の URL** を開くと、Access のログイン画面になること
- ログイン後、`/admin`（トップを開くと自動で移動）に管理画面が表示されること
- **アプリの URL** の `/admin` と `/api/admin/pending` が 404 になること
- アプリの URL のトップ（`/`）が、ログインなしで見られること

> 両方の Worker で `preview_urls: false` にしています。バージョンごとのプレビュー用 URL が、Access を通らない入口にならないようにするためです。

### 3-9. もう一度デプロイ

```bash
npm run deploy:all     # 一般向け → 管理用の順にデプロイ
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
| `APP_ROLE` | vars | Worker の役割：`public`（一般向け）／`admin`（管理用）／`all`（ローカル開発：両方） | 一般向け `public`、`env.admin` は `admin`、`.dev.vars` は `all` |
| `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` | vars | Access の JWT 検証用（3-8。`env.admin.vars` に書く） | 空 |
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

**管理画面の URL**（`https://hs-awase-admin.<サブドメイン>.workers.dev`）を開きます。一般向けの画面にはリンクを置いていないので、ブックマークやホーム画面への追加がおすすめです。

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
npm run deploy:all          # 一般向け・管理用の両方
```

> 片方だけデプロイすると、2 つの Worker でバージョンがずれます。基本は `deploy:all` を使ってください。

---

## 6. 独自ドメインを取得した場合（未決事項 2）

当面は workers.dev で運用し、動画は Worker 経由で配信します。独自ドメインを取得した場合：

- **アプリ自体**：Workers のカスタムドメインに設定します。CORS の origins と Turnstile のホスト名も新しいドメインに変えます。管理用の Worker は今の構成（別アドレスを丸ごと保護）のままで構いません（例：`admin.example.com`）。
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
| 管理画面が「管理者としてログインしていません」 | `env.admin.vars` の `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` が正しいか（一番上の `vars` に書いていないか）。`npm run deploy:admin` し直したか |
| 管理画面・投稿が 503 になる | 本番で Access や Turnstile の設定が空のまま（設定漏れで素通りしないよう、わざと止めています） |
| アプリの URL で `/admin` が 404 | 正常です。管理画面は管理画面の URL（`hs-awase-admin`）で開きます |
| ローカルで `/admin` が 404 | `.dev.vars` に `APP_ROLE=all` があるか（`cp .dev.vars.example .dev.vars`） |
| 古いブラウザで「変換機能を読み込めませんでした」 | WebCodecs が使えず、ffmpeg.wasm を CDN から読み込めなかった（通信状況を確認） |
