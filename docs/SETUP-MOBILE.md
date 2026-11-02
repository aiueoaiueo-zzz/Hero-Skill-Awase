# スマホだけで本番を準備する手順

PC でのコマンド操作は不要です。**ブラウザで Cloudflare と GitHub の画面を操作するだけ** で、残りは GitHub Actions（`.github/workflows/deploy.yml`）が自動で行います。

GitHub Actions が自動で行うこと：
- D1 データベースと R2 バケットの作成（初回のみ）
- D1 のマイグレーション（初期キャラ 27 体の登録を含む）
- R2 の CORS 設定
- 一般向け・管理用の 2 つの Worker のビルドとデプロイ
- 一般向けの Worker への secret（秘密の値）の登録

> **スマホでのコツ**
> - Cloudflare のダッシュボードは、スマホだと一部のメニューが隠れることがあります。見つからないときは、ブラウザの「PC 版サイトを表示」（Safari：ぁあ → デスクトップ用 Web サイトを表示、Chrome：︙ → PC 版サイト）に切り替えてください。
> - トークンやキーは、表示された画面からコピーして GitHub の Secrets に貼り付けます。**チャットやメモアプリには貼らないでください**。

---

## 全体の流れ

| # | 場所 | やること | 所要時間の目安 |
|---|---|---|---|
| 1 | GitHub | このブランチを main に取り込む | 2 分 |
| 2 | Cloudflare | アカウント作成・workers.dev のサブドメインを決める | 5 分 |
| 3 | Cloudflare | R2 を有効にする（支払い方法の登録） | 5 分 |
| 4 | Cloudflare | デプロイ用の API トークンを作る | 5 分 |
| 5 | GitHub | Secrets に API トークンとアカウント ID を登録 | 3 分 |
| 6 | GitHub | 1 回目のデプロイを実行（URL が決まる） | 5 分 |
| 7 | Cloudflare → GitHub | 動画アップロード用の R2 API トークン | 5 分 |
| 8 | Cloudflare → GitHub | Turnstile（ボット対策） | 3 分 |
| 9 | Cloudflare → GitHub | 管理画面のログイン（Access） | 10 分 |
| 10 | GitHub | 2 回目のデプロイを実行して確認 | 5 分 |

---

## 1. このブランチを main に取り込む（GitHub）

デプロイの自動化（「Run workflow」ボタン）は、**main ブランチにワークフローのファイルがあるときだけ** 表示されます。

1. GitHub のリポジトリを開き、「Pull requests」で、このブランチのプルリクエストを開きます。
2. 「Merge pull request」→「Confirm merge」を押します。

> main に変更が入るとデプロイも自動で動きます。ただし、手順 5 の Secrets が未登録の間は「デプロイを省略しました」と表示されるだけで、エラーにはなりません。

## 2. Cloudflare のアカウントと workers.dev のサブドメイン（Cloudflare）

1. https://dash.cloudflare.com/ でアカウントを作成し、ログインします。
2. メニューの **「Workers & Pages」** を開きます。初回はサブドメイン（`<ここ>.workers.dev`）を決める画面が出るので、好きな名前を決めます。
   - アプリの URL は `https://hs-awase.<サブドメイン>.workers.dev` になります。

## 3. R2 を有効にする（Cloudflare）

1. メニューの **「R2 オブジェクトストレージ」**（R2 Object Storage）を開きます。
2. 案内に従って R2 を有効にします。**支払い方法（クレジットカードなど）の登録が必要** です。
   - 無料枠（保存 10GB など）を超えなければ請求はありません。
   - このアプリは、合計 9GB・承認待ち 2GB を超えると自動で動画の受付を止めます。
3. バケットは作らなくて構いません（手順 6 で自動で作ります）。

## 4. デプロイ用の API トークンを作る（Cloudflare）

1. 右上の人のアイコン → **「プロフィール」** → **「API トークン」** → **「トークンを作成する」** を開きます。
2. 一番下の **「カスタムトークンを作成する」** →「始める」を押します。
3. 次のように設定します。
   - トークン名：`hs-awase-deploy`
   - 権限（「+ さらに追加」で行を増やす）。すべて「**アカウント**」の行です。

     | 権限 | レベル |
     |---|---|
     | Workers スクリプト（Workers Scripts） | 編集 |
     | D1 | 編集 |
     | Workers R2 ストレージ（Workers R2 Storage） | 編集 |
     | アカウント設定（Account Settings） | 読み取り |

   - アカウント リソース：「含む」→ 自分のアカウント
4. 「概要に進む」→「トークンを作成する」を押します。表示されたトークンを **コピー** します（この画面でしか見られません）。
5. **アカウント ID** も控えます。「Workers & Pages」の画面の右側（または下の方）に「アカウント ID」と表示されています。

## 5. GitHub の Secrets に登録する（GitHub）

1. リポジトリの **「Settings」** → **「Secrets and variables」** → **「Actions」** を開きます。
2. **「Secrets」** タブで「New repository secret」を押し、次の 2 つを登録します。

   | Name | Secret（値） |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | 手順 4 でコピーしたトークン |
   | `CLOUDFLARE_ACCOUNT_ID` | 手順 4 で控えたアカウント ID |

## 6. 1 回目のデプロイ（GitHub）

1. リポジトリの **「Actions」** → 左の一覧（スマホでは「All workflows」）から **「デプロイ（Cloudflare）」** を選びます。
2. **「Run workflow」** → ブランチが `main` になっていることを確認して、緑の「Run workflow」を押します。
3. 数分で完了します。実行結果を開き、**「Summary」** を見ると次が表示されています。
   - アプリの URL（一般向け）：`https://hs-awase.<サブドメイン>.workers.dev`
   - 管理画面の URL：`https://hs-awase-admin.<サブドメイン>.workers.dev`
   - 「まだ設定されていないもの」の一覧
4. この時点で、アプリの URL を開くとトップ画面（キャラ 27 体）が見られます。投稿と管理画面は、手順 7〜9 が終わるまで使えません。

> 赤い ✕ で失敗した場合は、Summary か失敗したステップを開くと、理由が日本語で表示されます（例：「R2 を有効にしたか」「API トークンの権限」）。

## 7. 動画アップロード用の R2 API トークン（Cloudflare → GitHub）

1. Cloudflare の **「R2 オブジェクトストレージ」** → **「API トークンの管理」**（Manage R2 API Tokens / Manage API tokens）→ **「API トークンを作成する」** を開きます。
2. 次のように設定して作成します。
   - 権限：**オブジェクトの読み取りと書き込み**（Object Read & Write）
   - 特定のバケットのみに適用：`hs-awase-media`
3. 表示される **アクセスキー ID** と **シークレットアクセスキー** をコピーします（この画面でしか見られません）。
4. GitHub の **Secrets** に登録します。

   | Name | 値 |
   |---|---|
   | `R2_ACCESS_KEY_ID` | アクセスキー ID |
   | `R2_SECRET_ACCESS_KEY` | シークレットアクセスキー |

## 8. Turnstile（ボット対策）（Cloudflare → GitHub）

1. Cloudflare のメニューの **「Turnstile」** →「ウィジェットを追加」を開きます。
   - ウィジェット名：`hs-awase`
   - ホスト名：`hs-awase.<サブドメイン>.workers.dev`（`https://` は付けない）
   - ウィジェットモード：マネージド
2. 作成すると **サイトキー** と **シークレットキー** が表示されます。
3. GitHub に登録します。**サイトキーは「Variables」タブ** です（公開してよい値のため）。

   | タブ | Name | 値 |
   |---|---|---|
   | Variables | `TURNSTILE_SITE_KEY` | サイトキー |
   | Secrets | `TURNSTILE_SECRET_KEY` | シークレットキー |

## 9. 管理画面のログイン（Cloudflare Access）（Cloudflare → GitHub）

1. Cloudflare のメニューの **「Zero Trust」** を開きます。初回はチーム名（例：`myteam`）とプランを選ぶ画面が出るので、**Free** を選びます（50 ユーザーまで無料。支払い方法の確認が出る場合があります）。
   - チームのドメインは `myteam.cloudflareaccess.com` になります。
2. Cloudflare のメニューの **「Workers & Pages」** → **`hs-awase-admin`** → **「設定」** → **「ドメインとルート」** を開きます。
3. `workers.dev` の行の「…」（または編集）から **「Cloudflare Access を有効にする」**（Enable Cloudflare Access）を選びます。
4. 表示される **AUD タグ**（Audience）をコピーします。
5. **ログインできる人を自分だけにする**：同じ画面の「Cloudflare Access を管理」（Manage Cloudflare Access）から Access アプリケーションを開きます。ポリシーの **Include を「Emails」にして、自分のメールアドレスだけ** を入れて保存します。
   - 初期状態ではアカウントのメンバー全員が対象になっていることがあるので、必ず確認してください。
6. GitHub の **Variables** に登録します。

   | Name | 値 |
   |---|---|
   | `ACCESS_TEAM_DOMAIN` | `myteam.cloudflareaccess.com`（手順 1 のチーム名） |
   | `ACCESS_AUD` | 手順 4 の AUD タグ |

## 10. 2 回目のデプロイと確認（GitHub → スマホのブラウザ）

1. 手順 6 と同じように **「Run workflow」** を実行します。Summary に「✅ 必要な設定はすべて揃っています」と出れば完了です。
2. 次を確認します。

   | # | 確認すること |
   |---|---|
   | 1 | **管理画面の URL** を開くと Cloudflare Access のログイン画面になる → メールに届くコードでログイン → 管理画面が表示される |
   | 2 | **アプリの URL** の末尾に `/admin` を付けて開くと「Not Found」になる |
   | 3 | アプリの URL で「投稿する」を開くと、確認画面に Turnstile が表示され、申請できる（受付番号が出る） |
   | 4 | 動画を選ぶと「動画を軽くしています… ○%」と出て、申請までできる |
   | 5 | 管理画面で承認すると、アプリの詳細画面に表示され、動画が再生できる |
   | 6 | 翌日以降、Cloudflare の「Workers & Pages」→ `hs-awase` →「ログ」に `maintenance {...}` が出ている（毎日 3:17 の自動処理） |

3. 管理画面の URL は、スマホのホーム画面に追加しておくと便利です（Safari：共有 →「ホーム画面に追加」）。

---

## これ以降の更新

- アプリを直したときは、変更を main に取り込むと **自動でデプロイ** されます。
- 手動でやり直したいときは、手順 6 と同じく「Run workflow」を押します。
- 容量の上限などの設定を変えたいときは、`wrangler.jsonc` を GitHub の画面で編集して main に取り込みます（「Edit this file」から編集できます）。

## 登録するもの一覧

| タブ | Name | どこで手に入るか | 使い道 |
|---|---|---|---|
| Secrets | `CLOUDFLARE_API_TOKEN` | 手順 4 | デプロイ |
| Secrets | `CLOUDFLARE_ACCOUNT_ID` | 手順 4 | デプロイ |
| Secrets | `R2_ACCESS_KEY_ID` | 手順 7 | 動画のアップロード |
| Secrets | `R2_SECRET_ACCESS_KEY` | 手順 7 | 動画のアップロード |
| Secrets | `TURNSTILE_SECRET_KEY` | 手順 8 | 投稿のボット対策 |
| Variables | `TURNSTILE_SITE_KEY` | 手順 8 | 投稿のボット対策 |
| Variables | `ACCESS_TEAM_DOMAIN` | 手順 9 | 管理画面のログイン確認 |
| Variables | `ACCESS_AUD` | 手順 9 | 管理画面のログイン確認 |

## うまくいかないとき

| 症状 | 確認すること |
|---|---|
| 「Run workflow」ボタンがない | 手順 1 で main に取り込んだか |
| 「workers.dev のサブドメインが見つかりません」 | 手順 2 で「Workers & Pages」を開いてサブドメインを決めたか。API トークンに「アカウント設定：読み取り」があるか |
| 「R2 バケットを作れませんでした」 | 手順 3 で R2 を有効にしたか。API トークンに「Workers R2 ストレージ：編集」があるか |
| 「D1 データベースを作れませんでした」 | API トークンに「D1：編集」があるか |
| デプロイのステップで Authentication error | API トークンに「Workers スクリプト：編集」があるか。`CLOUDFLARE_ACCOUNT_ID` が正しいか |
| 投稿で「ロボットではないことの確認に失敗しました」 | Turnstile のホスト名がアプリの URL と一致しているか。サイトキー（Variables）とシークレットキー（Secrets）が同じウィジェットのものか |
| 動画のアップロードで失敗する | 手順 7 の Secrets が登録されているか。2 回目のデプロイを実行したか |
| 管理画面が「管理者としてログインしていません」 | 手順 9 の Variables が正しいか。登録後に「Run workflow」を実行したか |

> ダッシュボードのメニュー名は、Cloudflare の画面の変更で少し違うことがあります。見つからない項目があれば、画面の様子を教えてください。
