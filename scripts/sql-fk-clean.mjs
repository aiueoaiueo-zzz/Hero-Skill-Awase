// 確認用サイト（staging）に本番のデータを入れる前に、取り込む SQL を「外部キーの順番どおり」に組み立て直す（docs/DECISIONS.md BG）
//   D1 は大きな SQL を何回かに分けて確定するため、PRAGMA defer_foreign_keys が全体に効かず、
//   参照先より先に参照する行が入ると「FOREIGN KEY constraint failed」で取り込みが丸ごと失敗する
//   （submissions と timings はお互いを参照しているので、どちらを先にしても足りない。2026-11-22 に発生）。
//   → 書き出しをいったんメモリ上の SQLite に入れ、
//     1. 参照切れ（参照先がない行）があれば、列を空にする（NULL 可）か行を消す（本番にはさわらない。件数をログに出す）
//     2. 参照される表から順に INSERT を作り直す。お互いに参照し合う列はいったん NULL で入れ、最後に UPDATE で埋める
//     3. できた SQL を、外部キーを「その場で」確かめる SQLite に 1 文ずつ入れて、どこで区切っても通ることを確かめる
// 使い方：node scripts/sql-fk-clean.mjs <sql-reorder.mjs で並べ替えた SQL>（同じファイルを書き換える）
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync } from "node:fs";
import { splitSql } from "./sql-reorder.mjs";

const lit = (v) =>
  v === null || v === undefined
    ? "NULL"
    : typeof v === "number" || typeof v === "bigint"
      ? String(v)
      : v instanceof Uint8Array
        ? `X'${Buffer.from(v).toString("hex")}'`
        : `'${String(v).replace(/'/g, "''")}'`;
const q = (name) => `"${String(name).replace(/"/g, '""')}"`;
const isData = (s) => /^\s*(INSERT|REPLACE|UPDATE|DELETE)\b/i.test(s);
const isIndex = (s) => /^\s*CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(s) || /^\s*CREATE\s+(TRIGGER|VIEW)\b/i.test(s);
const touchesInternal = (s) => /\bsqlite_sequence\b/i.test(s);

export function rebuild(sql) {
  const stmts = splitSql(sql);
  const db = new DatabaseSync(":memory:", { enableForeignKeyConstraints: false });
  for (const s of stmts) if (!/^\s*PRAGMA\b/i.test(s) && !touchesInternal(s)) db.exec(s);

  // 1. 参照切れを直す
  const summary = new Map();
  let fixed = 0;
  for (let round = 0; round < 20; round++) {
    const bad = db.prepare("PRAGMA foreign_key_check").all();
    if (!bad.length) break;
    for (const b of bad) {
      const fk = db.prepare(`PRAGMA foreign_key_list(${q(b.table)})`).all().find((f) => f.id === b.fkid);
      const info = db.prepare(`PRAGMA table_info(${q(b.table)})`).all();
      const col = info.find((c) => c.name === fk?.from);
      const nullable = col && !col.notnull && !col.pk;
      db.exec(nullable ? `UPDATE ${q(b.table)} SET ${q(col.name)} = NULL WHERE rowid = ${b.rowid}` : `DELETE FROM ${q(b.table)} WHERE rowid = ${b.rowid}`);
      fixed++;
      const k = `${b.table}.${fk?.from ?? "?"} → ${b.parent}（${nullable ? "空にした" : "行を消した"}）`;
      summary.set(k, (summary.get(k) ?? 0) + 1);
    }
  }
  if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("参照切れを直しきれませんでした");

  // 2. 表の順番：参照される表を先に。お互いに参照し合う（順番が決まらない）ときは、NULL にできる参照の列を後回しにする
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY rowid")
    .all()
    .map((r) => r.name);
  const info = new Map(tables.map((t) => [t, db.prepare(`PRAGMA table_info(${q(t)})`).all()]));
  const fks = new Map(tables.map((t) => [t, db.prepare(`PRAGMA foreign_key_list(${q(t)})`).all().filter((f) => f.table !== t && tables.includes(f.table))]));
  const later = new Map(tables.map((t) => [t, new Set()])); // 最初は NULL で入れて、あとで埋める列
  const order = [];
  const done = new Set();
  while (order.length < tables.length) {
    const ready = tables.filter((t) => !done.has(t) && fks.get(t).every((f) => done.has(f.table) || later.get(t).has(f.from)));
    if (ready.length) {
      for (const t of ready) (order.push(t), done.add(t));
      continue;
    }
    // 順番が決まらない：まだの表の、NULL にできる参照の列を 1 つ後回しにする
    const cand = tables
      .filter((t) => !done.has(t))
      .flatMap((t) => fks.get(t).filter((f) => !done.has(f.table) && !later.get(t).has(f.from)).map((f) => ({ t, f })))
      .find(({ t, f }) => !info.get(t).find((c) => c.name === f.from)?.notnull);
    if (!cand) throw new Error("表の順番を決められませんでした（NULL にできない参照が循環しています）");
    later.get(cand.t).add(cand.f.from);
  }

  // INSERT を作り直す
  const data = [];
  const updates = [];
  for (const t of order) {
    const cols = info.get(t).map((c) => c.name);
    const pk = info.get(t).filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
    for (const row of db.prepare(`SELECT * FROM ${q(t)} ORDER BY rowid`).all()) {
      data.push(`INSERT INTO ${q(t)} (${cols.map(q).join(", ")}) VALUES (${cols.map((c) => (later.get(t).has(c) ? "NULL" : lit(row[c]))).join(", ")});`);
      for (const c of later.get(t)) {
        if (row[c] === null || row[c] === undefined) continue;
        if (!pk.length) throw new Error(`${t} に主キーがないため、${c} をあとで埋められません`);
        updates.push(`UPDATE ${q(t)} SET ${q(c)} = ${lit(row[c])} WHERE ${pk.map((k) => `${q(k)} = ${lit(row[k])}`).join(" AND ")};`);
      }
    }
  }
  const internal = stmts.filter((s) => isData(s) && touchesInternal(s)); // sqlite_sequence などはそのまま最後に
  db.close();

  const head = stmts.filter((s) => /^\s*PRAGMA\b/i.test(s));
  const creates = stmts.filter((s) => !/^\s*PRAGMA\b/i.test(s) && !isData(s) && !isIndex(s));
  const indexes = stmts.filter(isIndex);
  const out = [...head, ...creates, ...data, ...updates, ...internal, ...indexes].map((s) => (s.trim().endsWith(";") ? s.trim() : s.trim() + ";"));

  // 3. 外部キーを「その場で」確かめる SQLite に 1 文ずつ入れて、どこで区切っても通ることを確かめる
  const check = new DatabaseSync(":memory:", { enableForeignKeyConstraints: true });
  for (const s of out) {
    if (/^\s*PRAGMA\b/i.test(s) || touchesInternal(s)) continue;
    check.exec(s);
  }
  check.close();
  return { sql: out.join("\n") + "\n", fixed, summary, tables: order, later, rows: data.length };
}

if (process.argv[1] && process.argv[1].endsWith("sql-fk-clean.mjs")) {
  const [, , file] = process.argv;
  if (!file) {
    console.error("使い方：node scripts/sql-fk-clean.mjs <SQL>");
    process.exit(1);
  }
  try {
    const r = rebuild(readFileSync(file, "utf8"));
    writeFileSync(file, r.sql);
    if (r.fixed) {
      console.log(`::warning::本番のデータに参照切れが ${r.fixed} 件ありました（確認用のコピーだけ直します。本番はそのまま）`);
      for (const [k, n] of r.summary) console.log(`  ${k}：${n} 件`);
    } else console.log("参照切れはありませんでした");
    const deferred = [...r.later].filter(([, s]) => s.size).map(([t, s]) => `${t}.${[...s].join(",")}`);
    console.log(`表の順番：${r.tables.join(" → ")}（${r.rows} 行${deferred.length ? `。あとで埋める列：${deferred.join("、")}` : ""}）`);
  } catch (e) {
    console.error(`::error::${e.message}`);
    process.exit(1);
  }
}
