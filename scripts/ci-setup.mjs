// GitHub Actions 用の準備スクリプト（スマホだけで運用するため、PC でのコマンド操作の代わりに実行する）
//   1. workers.dev のサブドメインを確認（アプリの URL を決める）
//   2. D1 データベース hs-awase を探す／なければ作る → wrangler.jsonc の database_id に書き込む
//   3. R2 バケット hs-awase-media を探す／なければ作る
//   4. R2 の CORS を設定（アプリの URL からの PUT だけ許可）
//   5. GitHub の Variables の値を wrangler.jsonc に書き込む（Turnstile のサイトキー、Access）
//   6. Worker の secret 用の JSON を作る（あとで wrangler secret bulk で登録）
// 使い方：node scripts/ci-setup.mjs   （環境変数 CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID が必要）
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const DB_NAME = "hs-awase";
const BUCKET = "hs-awase-media";
const WORKER = "hs-awase";
const ADMIN_WORKER = "hs-awase-admin";

const env = process.env;
const token = env.CLOUDFLARE_API_TOKEN;
const account = env.CLOUDFLARE_ACCOUNT_ID;

const summary = (s) => env.GITHUB_STEP_SUMMARY && appendFileSync(env.GITHUB_STEP_SUMMARY, s + "\n");
const output = (k, v) => env.GITHUB_OUTPUT && appendFileSync(env.GITHUB_OUTPUT, `${k}=${v}\n`);
function fail(msg) {
  console.error(`::error::${msg}`);
  summary(`### ❌ 準備に失敗しました\n\n${msg}\n`);
  process.exit(1);
}

if (!token || !account) fail("GitHub の Secrets に CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID を登録してください（docs/SETUP-MOBILE.md の手順 3・4）。");

async function cf(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, status: res.status, data };
}
const errText = (r) => (r.data.errors || []).map((e) => `${e.code}: ${e.message}`).join(" / ") || `HTTP ${r.status}`;

// 1. workers.dev のサブドメイン
const sub = await cf("/workers/subdomain");
if (!sub.ok || !sub.data.result?.subdomain)
  fail(
    `workers.dev のサブドメインが見つかりません（${errText(sub)}）。Cloudflare ダッシュボードの「Workers & Pages」を一度開き、サブドメインを決めてください。API トークンの権限も確認してください。`,
  );
const appUrl = `https://${WORKER}.${sub.data.result.subdomain}.workers.dev`;
const adminUrl = `https://${ADMIN_WORKER}.${sub.data.result.subdomain}.workers.dev`;
console.log(`アプリの URL: ${appUrl}\n管理画面の URL: ${adminUrl}`);

// 2. D1
let db = await cf(`/d1/database/${DB_NAME}`);
if (!db.ok) {
  console.log(`D1「${DB_NAME}」を作成します`);
  db = await cf("/d1/database", { method: "POST", body: JSON.stringify({ name: DB_NAME }) });
  if (!db.ok) fail(`D1 データベースを作れませんでした（${errText(db)}）。API トークンに「D1：編集」の権限があるか確認してください。`);
}
const dbId = db.data.result?.uuid;
if (!dbId) fail("D1 データベースの ID を取得できませんでした。");
console.log(`D1: ${DB_NAME} (${dbId})`);

// 3. R2 バケット
let bucket = await cf(`/r2/buckets/${BUCKET}`);
if (!bucket.ok) {
  console.log(`R2 バケット「${BUCKET}」を作成します`);
  bucket = await cf("/r2/buckets", { method: "POST", body: JSON.stringify({ name: BUCKET }) });
  if (!bucket.ok)
    fail(
      `R2 バケットを作れませんでした（${errText(bucket)}）。Cloudflare ダッシュボードで R2 を有効にしたか（支払い方法の登録が必要）、API トークンに「Workers R2 ストレージ：編集」の権限があるか確認してください。`,
    );
}

// 4. R2 の CORS（ブラウザから署名付き URL で PUT するため。読み出しは Worker 経由なので PUT だけ）
const cors = await cf(`/r2/buckets/${BUCKET}/cors`, {
  method: "PUT",
  body: JSON.stringify({ rules: [{ allowed: { origins: [appUrl], methods: ["PUT"], headers: ["content-type"] }, maxAgeSeconds: 3600 }] }),
});
if (!cors.ok) fail(`R2 の CORS を設定できませんでした（${errText(cors)}）。`);

// 5. wrangler.jsonc に書き込む（CI の中だけ。リポジトリのファイルは変わらない）
let conf = readFileSync("wrangler.jsonc", "utf8");
const setAll = (key, value) => {
  const re = new RegExp(`("${key}"\\s*:\\s*)"[^"]*"`, "g");
  if (!re.test(conf)) fail(`wrangler.jsonc に ${key} が見つかりません。`);
  conf = conf.replace(new RegExp(`("${key}"\\s*:\\s*)"[^"]*"`, "g"), `$1${JSON.stringify(value)}`);
};
setAll("database_id", dbId);
if (env.TURNSTILE_SITE_KEY) setAll("TURNSTILE_SITE_KEY", env.TURNSTILE_SITE_KEY);
if (env.ACCESS_TEAM_DOMAIN) setAll("ACCESS_TEAM_DOMAIN", env.ACCESS_TEAM_DOMAIN);
if (env.ACCESS_AUD) setAll("ACCESS_AUD", env.ACCESS_AUD);
writeFileSync("wrangler.jsonc", conf);

// 6. 一般向け Worker の secret
const secrets = {};
if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
  Object.assign(secrets, {
    R2_ACCOUNT_ID: account,
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: BUCKET,
  });
}
if (env.TURNSTILE_SECRET_KEY) secrets.TURNSTILE_SECRET_KEY = env.TURNSTILE_SECRET_KEY;
writeFileSync(env.RUNNER_TEMP ? `${env.RUNNER_TEMP}/secrets.json` : "secrets.json", JSON.stringify(secrets));
output("has_secrets", Object.keys(secrets).length ? "true" : "false");
output("app_url", appUrl);
output("admin_url", adminUrl);

// 足りない設定をまとめて表示
const missing = [];
if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) missing.push("Secrets：R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY（動画のアップロードに必要）");
if (!env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY) missing.push("Variables：TURNSTILE_SITE_KEY ／ Secrets：TURNSTILE_SECRET_KEY（投稿に必要）");
if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) missing.push("Variables：ACCESS_TEAM_DOMAIN / ACCESS_AUD（管理画面に必要）");

summary(`## デプロイ先

| | URL |
|---|---|
| アプリの URL（一般向け） | ${appUrl} |
| 管理画面の URL | ${adminUrl} |

- D1：\`${DB_NAME}\`（${dbId}）
- R2：\`${BUCKET}\`（CORS：${appUrl} からの PUT を許可）
`);
summary(
  missing.length
    ? `### ⚠ まだ設定されていないもの\n\n${missing.map((m) => `- ${m}`).join("\n")}\n\n設定するまで、その機能は使えません（閲覧はできます）。docs/SETUP-MOBILE.md を見て登録し、もう一度このワークフローを実行してください。\n`
    : "### ✅ 必要な設定はすべて揃っています\n",
);
