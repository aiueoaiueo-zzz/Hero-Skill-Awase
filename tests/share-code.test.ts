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
