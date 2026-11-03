// 本番データの確認・削除（GitHub Actions の「データの確認・削除」から実行する。PC は不要）
//   ACTION=list    投稿の一覧と、保存容量の記録・最後の自動処理の形跡を表示する（何も変更しない）
//   ACTION=delete  CODES（受付番号、カンマ区切り）の投稿を、D1 と R2 の両方から削除する
//   ACTION=delete-hero-images  全キャラの画像を、D1（image_key）と R2（heroes/）の両方から削除する
// 必要な環境変数：CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
import { appendFileSync } from "node:fs";

const DB_NAME = "hs-awase";
const BUCKET = "hs-awase-media";
const env = process.env;
const action = (env.ACTION || "list").trim();
const summary = (s) => env.GITHUB_STEP_SUMMARY && appendFileSync(env.GITHUB_STEP_SUMMARY, s + "\n");
const log = (s) => {
  console.log(s);
  summary(s);
};
function fail(msg) {
  console.error(`::error::${msg}`);
  summary(`### ❌ ${msg}`);
  process.exit(1);
}
if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) fail("Secrets に CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID がありません。");

async function cf(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json", ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(`${init.method || "GET"} ${path}: ${(data.errors || []).map((e) => e.message).join(" / ") || res.status}`);
  return data.result;
}

const db = await cf(`/d1/database/${DB_NAME}`);
/** D1 に SQL を送る（? にパラメータを入れる） */
async function sql(query, params = []) {
  const r = await cf(`/d1/database/${db.uuid}/query`, { method: "POST", body: JSON.stringify({ sql: query, params }) });
  return r[0]?.results ?? [];
}
const deleteObject = (key) => cf(`/r2/buckets/${BUCKET}/objects/${key.split("/").map(encodeURIComponent).join("/")}`, { method: "DELETE" });
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;

if (action === "list") {
  const subs = await sql(
    `SELECT s.code, s.created_at, a.name AS attacker, t.name AS target, s.nickname, s.replaces_timing_id IS NOT NULL AS is_fix,
            (SELECT GROUP_CONCAT(x.status, ',') FROM timings x WHERE x.submission_id = s.id) AS statuses
       FROM submissions s JOIN heroes a ON a.id = s.attacker_id JOIN heroes t ON t.id = s.target_id
      ORDER BY s.created_at`,
  );
  log(`## 投稿の一覧（${subs.length} 件）\n`);
  log("| 受付番号 | 投稿日時（UTC） | 組み合わせ | 投稿者 | 種類 | タイミングの状態 |");
  log("|---|---|---|---|---|---|");
  for (const s of subs) {
    const counts = {};
    for (const st of String(s.statuses || "").split(",").filter(Boolean)) counts[st] = (counts[st] || 0) + 1;
    const st = Object.entries(counts)
      .map(([k, v]) => `${k}×${v}`)
      .join(" ");
    log(`| ${s.code} | ${String(s.created_at).slice(0, 16).replace("T", " ")} | ${s.attacker} → ${s.target} | ${s.nickname || "（なし）"} | ${s.is_fix ? "修正提案" : "投稿"} | ${st} |`);
  }
  const usage = await sql(
    "SELECT COUNT(*) AS n, COALESCE(SUM(size),0) AS total, COALESCE(SUM(CASE WHEN key LIKE 'pending/%' THEN size ELSE 0 END),0) AS pending, MAX(updated_at) AS last FROM media_objects",
  );
  const u = usage[0] || {};
  log(`\n## 保存容量の記録\n\n- ファイル数：${u.n}／合計：${mb(u.total || 0)}／うち承認待ち：${mb(u.pending || 0)}`);
  log(`- 記録の最終更新：${u.last || "なし"}`);
  const own = (await sql("SELECT value FROM settings WHERE key = 'owner_support_code'"))[0];
  const img = (await sql("SELECT COUNT(*) AS n FROM heroes WHERE image_key IS NOT NULL"))[0];
  log(`\n## 設定\n\n- 制作者の応援コード：${own?.value || "（未設定）"}\n- 画像が設定されているキャラ：${img?.n ?? 0} 体`);
  const last = (await sql("SELECT value FROM settings WHERE key = 'maintenance_last_run'"))[0];
  if (last) {
    const m = JSON.parse(last.value);
    const jst = new Date(new Date(m.at).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
    log(`\n## 毎日の自動処理（3:17）\n\n- 最後に動いた日時：${jst}（日本時間）`);
    log(`- 結果：R2 のファイル ${m.r2Objects} 個を確認／不要なファイル ${m.deleted} 個を削除／記録の補正 ${m.ledgerFixed} 件／期限切れの承認待ち ${m.expiredPending} 件`);
  } else {
    log("\n## 毎日の自動処理（3:17）\n\n- まだ一度も動いていません（初回は次の 3:17 ごろ）");
  }
} else if (action === "delete") {
  const codes = String(env.CODES || "")
    .toUpperCase()
    .split(/[\s,、]+/)
    .filter(Boolean);
  if (!codes.length) fail("削除する受付番号（codes）を入力してください。");
  const bad = codes.filter((c) => !/^HS-[A-Z0-9]{6}$/.test(c));
  if (bad.length) fail(`受付番号の形式が正しくありません：${bad.join(", ")}`);

  log(`## 削除：${codes.join(", ")}\n`);
  for (const code of codes) {
    const sub = (await sql("SELECT id FROM submissions WHERE code = ?", [code]))[0];
    if (!sub) {
      log(`- ${code}：見つかりませんでした（削除済みか、番号の誤り）`);
      continue;
    }
    const timings = await sql("SELECT id, video_key, status FROM timings WHERE submission_id = ?", [sub.id]);
    const ids = timings.map((t) => t.id);
    // ほかの投稿（修正提案）からの参照を外してから削除する
    if (ids.length) await sql(`UPDATE submissions SET replaces_timing_id = NULL WHERE replaces_timing_id IN (${ids.map(() => "?").join(",")})`, ids);
    await sql("UPDATE timings SET credit_submission_id = NULL WHERE credit_submission_id = ?", [sub.id]);
    await sql("DELETE FROM timings WHERE submission_id = ?", [sub.id]);
    await sql("DELETE FROM submissions WHERE id = ?", [sub.id]);
    // どこからも使われなくなった動画を R2 と容量の記録から削除
    const deleted = [];
    for (const key of [...new Set(timings.map((t) => t.video_key))]) {
      const used = await sql("SELECT 1 FROM timings WHERE video_key = ? AND status IN ('pending','approved') LIMIT 1", [key]);
      if (used.length) continue;
      await deleteObject(key).catch((e) => console.warn(`R2 の削除に失敗：${key}：${e.message}`));
      await sql("DELETE FROM media_objects WHERE key = ?", [key]);
      deleted.push(key);
    }
    log(`- ${code}：タイミング ${timings.length} 件（${timings.map((t) => t.status).join(", ")}）と動画 ${deleted.length} 本を削除しました`);
  }
} else if (action === "delete-hero-images") {
  // 1. データベースに登録されている画像
  const heroes = await sql("SELECT id, name, image_key FROM heroes WHERE image_key IS NOT NULL");
  const keys = new Set(heroes.map((h) => h.image_key));
  // 2. R2 に残っている heroes/ のファイル（データベースから外れたものも含めて消す）
  try {
    let cursor = "";
    do {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects?prefix=heroes/&per_page=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, {
        headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      });
      const data = await res.json();
      for (const o of data.result || []) keys.add(o.key);
      cursor = data.result_info?.is_truncated ? data.result_info.cursor : "";
    } while (cursor);
  } catch (e) {
    console.warn(`R2 の一覧を取得できませんでした（データベースに登録された分だけ消します）：${e.message}`);
  }
  log(`## キャラ画像の削除\n\n- データベースに登録された画像：${heroes.length} 体\n- 削除するファイル：${keys.size} 個`);
  let ok = 0;
  for (const key of keys) {
    try {
      await deleteObject(key);
      ok++;
    } catch (e) {
      console.warn(`R2 の削除に失敗：${key}：${e.message}`);
    }
    await sql("DELETE FROM media_objects WHERE key = ?", [key]);
  }
  await sql("UPDATE heroes SET image_key = NULL WHERE image_key IS NOT NULL");
  const left = (await sql("SELECT COUNT(*) AS n FROM heroes WHERE image_key IS NOT NULL"))[0];
  log(`- R2 から ${ok} 個を削除しました`);
  log(`- 画像が設定されているキャラ：${left?.n ?? "?"} 体（0 なら完了）`);
} else {
  fail(`action は list・delete・delete-hero-images のどれかを指定してください（${action}）`);
}
