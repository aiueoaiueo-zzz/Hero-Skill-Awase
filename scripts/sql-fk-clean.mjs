// 確認用サイト（staging）に本番のデータを入れる前に、参照切れ（外部キーの参照先がない行）を見つけて取り除く（docs/DECISIONS.md BG）
//   本番の書き出しに参照切れが 1 件でもあると、確認用の D1 への取り込み全体が
//   「FOREIGN KEY constraint failed」で失敗し、確認用サイトが空のままになる。
//   → 書き出しをいったんメモリ上の SQLite に入れて PRAGMA foreign_key_check で探し、
//     参照の列が空にできる（NULL 可）なら空に、できなければその行を消す SQL を、取り込む SQL の最後に足す。
//   本番のデータには一切さわらない（確認用に入れるコピーだけを直す）。見つけた件数はログに出す。
// 使い方：node scripts/sql-fk-clean.mjs <sql-reorder.mjs で並べ替えた SQL>（同じファイルに追記する）
import { DatabaseSync } from "node:sqlite";
import { appendFileSync, readFileSync } from "node:fs";
import { splitSql } from "./sql-reorder.mjs";

const lit = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" || typeof v === "bigint" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const q = (name) => `"${String(name).replace(/"/g, '""')}"`;

export function cleanForeignKeys(sql) {
  const db = new DatabaseSync(":memory:", { enableForeignKeyConstraints: false });
  for (const s of splitSql(sql)) {
    if (/^\s*PRAGMA\b/i.test(s)) continue;
    db.exec(s);
  }
  const fixes = [];
  const summary = new Map();
  for (let round = 0; round < 20; round++) {
    const bad = db.prepare("PRAGMA foreign_key_check").all();
    if (!bad.length) break;
    for (const b of bad) {
      const fk = db.prepare(`PRAGMA foreign_key_list(${q(b.table)})`).all().find((f) => f.id === b.fkid);
      const info = db.prepare(`PRAGMA table_info(${q(b.table)})`).all();
      const pk = info.filter((c) => c.pk > 0).sort((x, y) => x.pk - y.pk).map((c) => c.name);
      const col = info.find((c) => c.name === fk?.from);
      const keyRow = pk.length ? db.prepare(`SELECT ${pk.map(q).join(", ")} FROM ${q(b.table)} WHERE rowid = ?`).get(b.rowid) : null;
      const where = keyRow ? pk.map((k) => `${q(k)} = ${lit(keyRow[k])}`).join(" AND ") : `rowid = ${b.rowid}`;
      const nullable = col && !col.notnull && !col.pk;
      const stmt = nullable ? `UPDATE ${q(b.table)} SET ${q(col.name)} = NULL WHERE ${where};` : `DELETE FROM ${q(b.table)} WHERE ${where};`;
      db.exec(stmt);
      fixes.push(stmt);
      const k = `${b.table}.${fk?.from ?? "?"} → ${b.parent}（${nullable ? "空にした" : "行を消した"}）`;
      summary.set(k, (summary.get(k) ?? 0) + 1);
    }
  }
  const left = db.prepare("PRAGMA foreign_key_check").all().length;
  db.close();
  return { fixes, summary, left };
}

if (process.argv[1] && process.argv[1].endsWith("sql-fk-clean.mjs")) {
  const [, , file] = process.argv;
  if (!file) {
    console.error("使い方：node scripts/sql-fk-clean.mjs <SQL>");
    process.exit(1);
  }
  const { fixes, summary, left } = cleanForeignKeys(readFileSync(file, "utf8"));
  if (!fixes.length) console.log("参照切れはありませんでした");
  else {
    console.log(`::warning::本番のデータに参照切れが ${fixes.length} 件ありました（確認用のコピーだけ直します。本番はそのまま）`);
    for (const [k, n] of summary) console.log(`  ${k}：${n} 件`);
    appendFileSync(file, "\n" + fixes.join("\n") + "\n");
  }
  if (left) {
    console.error(`::error::参照切れを直しきれませんでした（残り ${left} 件）`);
    process.exit(1);
  }
}
