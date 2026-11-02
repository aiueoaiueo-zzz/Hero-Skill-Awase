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
