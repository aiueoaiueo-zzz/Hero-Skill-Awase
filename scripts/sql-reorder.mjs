// D1 の書き出し（wrangler d1 export）の SQL を、別の D1 に入れられる順番に並べ替える（docs/DECISIONS.md AK）
//   書き出しはテーブルごとに「CREATE TABLE → そのデータ」の順で、submissions（timings を参照する）のデータが
//   timings を作る前に入ってしまい「no such table: main.timings」になる。
//   → PRAGMA → すべての CREATE TABLE → データ（INSERT など）→ CREATE INDEX の順にする。
// 使い方：node scripts/sql-reorder.mjs <入力の SQL> <出力の SQL>
import { readFileSync, writeFileSync } from "node:fs";

/** 文字列（'…'）・識別子（"…"・`…`・[…]）の中の ; では区切らずに、SQL を文に分ける */
export function splitSql(sql) {
  const out = [];
  let cur = "";
  let q = null; // いま中にいる引用符
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    cur += ch;
    if (q) {
      if (ch === q) {
        if (sql[i + 1] === q) cur += sql[++i]; // '' のような引用符の重ね書き
        else q = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") q = ch;
    else if (ch === "[") q = "]";
    else if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end < 0 ? sql.length : end;
      cur += sql.slice(i + 1, stop);
      i = stop - 1;
    } else if (ch === ";") {
      if (/^\s*CREATE\s+TRIGGER\b/i.test(cur) && !/\bEND\s*;$/i.test(cur.trim())) continue; // トリガーは END; まで
      out.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((s) => s && s !== ";");
}

export function reorderSql(sql) {
  const stmts = splitSql(sql);
  const kind = (s) => {
    const t = s.replace(/^(\s*--[^\n]*\n)*/, "").trimStart();
    if (/^PRAGMA\b/i.test(t)) return 0;
    if (/^CREATE\s+TABLE\b/i.test(t)) return 1;
    if (/^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(t) || /^CREATE\s+(TRIGGER|VIEW)\b/i.test(t)) return 3;
    return 2;
  };
  const groups = [[], [], [], []];
  for (const s of stmts) groups[kind(s)].push(s);
  if (!groups[0].some((s) => /defer_foreign_keys/i.test(s))) groups[0].unshift("PRAGMA defer_foreign_keys=TRUE;");
  return groups.flat().map((s) => (s.endsWith(";") ? s : s + ";")).join("\n") + "\n";
}

if (process.argv[1] && process.argv[1].endsWith("sql-reorder.mjs")) {
  const [, , input, output] = process.argv;
  if (!input || !output) {
    console.error("使い方：node scripts/sql-reorder.mjs <入力> <出力>");
    process.exit(1);
  }
  const src = readFileSync(input, "utf8");
  const res = reorderSql(src);
  writeFileSync(output, res);
  console.log(`並べ替えました：${splitSql(src).length} 文`);
}
