import { describe, expect, it } from "vitest";
import { genShareCode, SHARE_CODE_RE } from "../src/worker/lib/share-code";
import { shortLink } from "../src/shared/share";

describe("共有用の短いコード", () => {
  it("英小文字と数字の 6 文字（紛らわしい i・l・o・0・1 を含まない）", () => {
    for (let i = 0; i < 2000; i++) {
      const c = genShareCode();
      expect(c).toMatch(SHARE_CODE_RE);
      expect(c).not.toMatch(/[ilo01]/);
    }
  });
  it("重複しにくい（2000 個でほぼ重複なし）", () => {
    const s = new Set(Array.from({ length: 2000 }, genShareCode));
    expect(s.size).toBeGreaterThan(1995);
  });
  it("短いリンク", () => {
    expect(shortLink("https://hs-awase.cmps.workers.dev/", "k7q9px")).toBe("https://hs-awase.cmps.workers.dev/s/k7q9px");
  });
});

import { approvedShareText, timingShareText, X_LIMIT, xWeight } from "../src/shared/share";

describe("共有の文面", () => {
  const base = { attacker: "リュウ", target: "乃保", attackType: "hs", cueType: "motion", timingText: "繭から飛び出て着地した瞬間", nickname: "noppo_pan34", supportCode: "C-GPnz" } as const;
  it("利用者の共有：区切り・目印・全角の＠・ハッシュタグ", () => {
    expect(timingShareText(base)).toBe(
      ["【HS合わせ】", "リュウ（攻撃方法：ヒーロースキル）→ 乃保", "", "繭から飛び出て着地した瞬間（目印：動き）", "", "投稿者：＠noppo_pan34", "応援コード：C-GPnz", "#ヒロアプ #HS合わせ #コンパス"].join("\n"),
    );
  });
  it("管理者のお知らせ：1 行目と区切り線（修正の承認は「更新」）", () => {
    const t = approvedShareText(base).split("\n");
    expect(t[0]).toBe("以下の合わせが公開されました！");
    expect(t[1]).toBe("-".repeat(20));
    expect(t[2]).toBe("【HS合わせ】");
    expect(approvedShareText({ ...base, updated: true }).split("\n")[0]).toBe("以下の合わせが更新されました！");
  });
  it("古い自由入力の名前は @ を全角にしてそのまま", () => {
    expect(timingShareText({ ...base, nickname: "たろう@x" })).toContain("投稿者：たろう＠x");
  });
  it("投稿者名・応援コードがなければ行ごと出さない", () => {
    const t = timingShareText({ ...base, nickname: null, supportCode: null });
    expect(t).not.toContain("投稿者");
    expect(t).not.toContain("応援コード");
  });
  it("長いときはタイミングの文だけを短くして、URL を含めて X の上限に収める", () => {
    const long = { ...base, attacker: "ギルガメッシュ", target: "ニーズヘッグ", attackType: "action", cueType: "voice", timingText: "あ".repeat(200), nickname: "い".repeat(20), supportCode: "ABCDEFGHIJKLMNOPQRST" } as const;
    const t = approvedShareText(long);
    expect(xWeight(t) + 1 + 23).toBeLessThanOrEqual(X_LIMIT);
    expect(t).toContain("…（目印：ボイス）");
    // ふつうの長さなら投稿者名は削らない
    const t2 = approvedShareText({ ...long, attacker: "リュウ", target: "乃保", supportCode: null });
    expect(xWeight(t2) + 1 + 23).toBeLessThanOrEqual(X_LIMIT);
    expect(t2).toContain("投稿者：" + "い".repeat(20));
  });
});

import { badgeFor, isXId, jstMonthStart, jstWeek, normalizeXId } from "../src/shared/ranking";

describe("ランキングの共通ルール", () => {
  it("X の ID：@ を外して、英数字と _ の 15 文字まで", () => {
    expect(normalizeXId(" @noppo_pan34 ")).toBe("noppo_pan34");
    expect(normalizeXId("＠abc")).toBe("abc");
    expect(isXId("noppo_pan34")).toBe(true);
    expect(isXId("のっぽ")).toBe(false);
    expect(isXId("a".repeat(16))).toBe(false);
    expect(isXId("a-b")).toBe(false);
  });
  it("バッジは累計ポイントで決まる", () => {
    expect(badgeFor(0)).toBe(null);
    expect(badgeFor(0.5)).toBe(null);
    expect(badgeFor(1)).toBe("ルーキー");
    expect(badgeFor(9.5)).toBe("合わせ見習い");
    expect(badgeFor(10)).toBe("合わせ職人");
    expect(badgeFor(50)).toBe("レジェンド");
  });
  it("週は日本時間の月曜 0 時から、月は 1 日 0 時から", () => {
    // 2026-11-08（日）23:59 JST は 11/2 の週、11/9（月）0:00 JST は 11/9 の週
    expect(jstWeek(Date.parse("2026-11-08T14:59:00Z")).key).toBe("2026-11-02");
    expect(jstWeek(Date.parse("2026-11-08T15:00:00Z")).key).toBe("2026-11-09");
    expect(new Date(jstWeek(Date.parse("2026-11-08T15:00:00Z")).start).toISOString()).toBe("2026-11-08T15:00:00.000Z");
    expect(new Date(jstMonthStart(Date.parse("2026-11-30T15:30:00Z"))).toISOString()).toBe("2026-11-30T15:00:00.000Z");
  });
});

import { blockedAttacks, fmtInvincible, hsJudge, invincibleToText, parseInvincibleText } from "../src/shared/hs";

describe("合わせられるかの判定", () => {
  const atk = (t: number | null, ng: ("hs" | "normal" | "action" | "card")[] = []) => ({ ngAttacks: ng, hsAttackTime: t, hsInvincible: [] });
  const tgt = (...v: (number | [string, number])[]) => ({
    ngAttacks: [],
    hsAttackTime: null,
    hsInvincible: v.map((x) => (typeof x === "number" ? { label: "", sec: x } : { label: x[0], sec: x[1] })),
  });
  it("相手の無敵時間がダメージ発生より短いと HS は合わせ不可能", () => {
    expect(hsJudge(atk(1.5), tgt(1.2))).toEqual({ attackTime: 1.5, short: [{ label: "", sec: 1.2 }], all: true });
    expect([...blockedAttacks(atk(1.5), tgt(1.2))]).toEqual(["hs"]);
  });
  it("同じか長ければ合わせられる", () => {
    expect(hsJudge(atk(1.5), tgt(1.5))).toBe(null);
    expect(blockedAttacks(atk(1.5), tgt(2)).size).toBe(0);
  });
  it("情報が足りなければ判定しない", () => {
    expect(hsJudge(atk(null), tgt(1))).toBe(null);
    expect(hsJudge(atk(1), tgt())).toBe(null);
  });
  it("キャラで不可にした攻撃方法は合わせ不可（HS が不可なら時間の判定はしない）", () => {
    expect(hsJudge(atk(1.5, ["hs"]), tgt(1))).toBe(null);
    expect([...blockedAttacks(atk(1.5, ["hs", "card"]), tgt(1))].sort()).toEqual(["card", "hs"]);
    expect([...blockedAttacks(atk(null, ["normal"]), null)]).toEqual(["normal"]);
  });
  it("無敵時間が場面で変わるときは、全部の場面で足りないときだけ HS を不可にする", () => {
    const j = hsJudge(atk(2), tgt(["1,2回目", 1.3], ["3回目", 5.5]));
    expect(j).toEqual({ attackTime: 2, short: [{ label: "1,2回目", sec: 1.3 }], all: false });
    expect(blockedAttacks(atk(2), tgt(["1,2回目", 1.3], ["3回目", 5.5])).size).toBe(0);
    expect(hsJudge(atk(6), tgt(["1,2回目", 1.3], ["3回目", 5.5]))?.all).toBe(true);
  });
});

describe("無敵時間の表示と入力", () => {
  it("表示", () => {
    expect(fmtInvincible([{ label: "", sec: 7.34 }])).toBe("7.34秒");
    expect(fmtInvincible([{ label: "最短距離時", sec: 4.7 }])).toBe("4.7秒（最短距離時）");
    expect(fmtInvincible([{ label: "1,2回目", sec: 1.3 }, { label: "3回目", sec: 5.5 }])).toBe("1,2回目 1.3秒／3回目 5.5秒");
  });
  it("入力の読み取り", () => {
    expect(parseInvincibleText("")).toEqual([]);
    expect(parseInvincibleText(" 7.34 ")).toEqual([{ label: "", sec: 7.34 }]);
    expect(parseInvincibleText("1,2回目:1.3 / 3回目：5.5秒")).toEqual([{ label: "1,2回目", sec: 1.3 }, { label: "3回目", sec: 5.5 }]);
    expect(parseInvincibleText("最短距離時:4.7")).toEqual([{ label: "最短距離時", sec: 4.7 }]);
    expect(parseInvincibleText("abc")).toBe(null);
    expect(parseInvincibleText("61")).toBe(null);
    expect(invincibleToText([{ label: "1回目", sec: 1.5 }, { label: "2回目以降", sec: 5.5 }])).toBe("1回目:1.5 / 2回目以降:5.5");
  });
});

import { sniffImageType } from "../src/client/lib/image";

describe("画像の形式を中身から調べる", () => {
  const blob = (...b: number[]) => new Blob([new Uint8Array([...b, ...new Array(16).fill(0)])], { type: "application/x-photo" });
  const str = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
  it("形式の表示が違っても中身で判断する", async () => {
    expect(await sniffImageType(blob(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a))).toBe("image/png");
    expect(await sniffImageType(blob(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(await sniffImageType(blob(...str("RIFF"), 0, 0, 0, 0, ...str("WEBP")))).toBe("image/webp");
    expect(await sniffImageType(blob(0, 0, 0, 0x18, ...str("ftypheic")))).toBe("image/heic");
    expect(await sniffImageType(blob(...str("PK")))).toBe(null);
  });
});

// @ts-expect-error JS のスクリプト（型定義なし）
import { reorderSql, splitSql } from "../scripts/sql-reorder.mjs";

describe("確認用サイトに入れる SQL の並べ替え", () => {
  const sql = [
    "PRAGMA defer_foreign_keys=TRUE;",
    "CREATE TABLE a (id TEXT, b_id TEXT REFERENCES b(id));",
    "INSERT INTO \"a\" VALUES('x;y','it''s\n;ok');",
    "CREATE TABLE b (id TEXT);",
    "INSERT INTO \"b\" VALUES('1');",
    "CREATE INDEX i ON a(id);",
  ].join("\n");
  it("文字列の中の ; では区切らない", () => {
    expect(splitSql(sql)).toHaveLength(6);
  });
  it("テーブルを全部作ってからデータ、最後に索引", () => {
    const lines = splitSql(reorderSql(sql));
    expect(lines.map((s: string) => s.split(" ")[0] + " " + s.split(" ")[1])).toEqual([
      "PRAGMA defer_foreign_keys=TRUE;",
      "CREATE TABLE",
      "CREATE TABLE",
      'INSERT INTO',
      'INSERT INTO',
      "CREATE INDEX",
    ]);
    expect(reorderSql(sql)).toContain("'it''s\n;ok'");
  });
});

import { eventWindow } from "../src/worker/lib/ranking";

describe("イベントランキングの期間", () => {
  it("日本時間の開始日 0 時から、終了日の翌日 0 時まで", () => {
    const w = eventWindow("2026-11-21", "2026-12-18");
    expect(new Date(w.start).toISOString()).toBe("2026-11-20T15:00:00.000Z");
    expect(new Date(w.end).toISOString()).toBe("2026-12-18T15:00:00.000Z");
  });
});
