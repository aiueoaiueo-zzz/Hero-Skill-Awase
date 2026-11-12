// 確認用サイト（staging）に本番のデータをコピーする（GitHub Actions 用。docs/DECISIONS.md AK）
//   1. 本番の D1「hs-awase」を SQL に書き出す（本番は読むだけ。変更しない）
//   2. 確認用の D1「hs-awase-staging」を消す（このあと ci-setup.mjs が空の状態で作り直し、書き出した SQL を入れる）
// 動画・画像は確認用の Worker が本番の公開メディアから読む（MEDIA_FALLBACK_URL）ので、コピーしない。
// 使い方：node scripts/ci-staging-sync.mjs <書き出し先の SQL ファイル>
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const PROD_DB = "hs-awase";
const STAGING_DB = "hs-awase-staging";
const out = process.argv[2];
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, RUNNER_TEMP } = process.env;
const fail = (m) => {
  console.error(`::error::${m}`);
  process.exit(1);
};
if (!out) fail("書き出し先のファイル名を指定してください。");
if (!token || !account) fail("CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID が必要です。");

async function cf(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.success !== false, status: res.status, data };
}

// 1. 本番の D1 を書き出す（wrangler は設定ファイルの database_id を使うので、本番の ID だけを書いた一時的な設定を作る）
const prod = await cf(`/d1/database/${PROD_DB}`);
const prodId = prod.data.result?.uuid;
if (!prod.ok || !prodId) fail(`本番の D1「${PROD_DB}」が見つかりません。`);
const cfg = `${RUNNER_TEMP || "."}/prod-export.json`;
writeFileSync(cfg, JSON.stringify({ name: "hs-awase-export", compatibility_date: "2026-10-01", d1_databases: [{ binding: "PROD", database_name: PROD_DB, database_id: prodId }] }));
execFileSync("npx", ["wrangler", "d1", "export", PROD_DB, "--remote", "--output", out, "--config", cfg], { stdio: "inherit" });
console.log(`本番のデータを書き出しました：${out}`);

// 2. 確認用の D1 を消す（名前を必ず確かめる。本番の D1 は絶対に消さない）
const stg = await cf(`/d1/database/${STAGING_DB}`);
const stgId = stg.data.result?.uuid;
if (stg.ok && stgId) {
  if (stg.data.result?.name !== STAGING_DB || stgId === prodId) fail("確認用の D1 の確認に失敗しました（消さずに止めます）。");
  const del = await cf(`/d1/database/${stgId}`, { method: "DELETE" });
  if (!del.ok) fail(`確認用の D1 を作り直せませんでした（HTTP ${del.status}）。`);
  console.log(`確認用の D1「${STAGING_DB}」を消しました（このあと作り直して本番のデータを入れます）`);
}
