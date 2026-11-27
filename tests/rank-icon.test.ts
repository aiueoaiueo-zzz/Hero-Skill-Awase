import { describe, expect, it } from "vitest";
import { computeScores, eventWindow, rank } from "../src/worker/lib/ranking";

const fakeEnv = (posts: unknown[], fixes: unknown[]) =>
  ({
    DB: {
      prepare: (sql: string) => ({
        first: async () => null,
        all: async () => ({ results: sql.includes("featured_heroes") ? [] : sql.includes("f.status = 'merged' AND t.status") ? fixes : posts }),
      }),
    },
  }) as never;

describe("ランキングのアイコン（docs/DECISIONS.md BT）", () => {
  it("投稿がなく修正提案だけの人は、直した合わせの攻撃側のキャラ", async () => {
    const { users } = await computeScores(
      fakeEnv(
        [{ id: "1", x: "poster", at: "2026-11-28T00:00:00Z", posted: "2026-11-28T00:00:00Z", a: "h1", t: "h2", fixed: 0 }],
        [{ x: "fixer", at: "2026-11-28T01:00:00Z", a: "h9" }],
      ),
      Date.parse("2026-11-29T00:00:00Z"),
      eventWindow("2026-11-27", "2026-12-24"),
    );
    const rows = rank([...users.values()], "event");
    expect(rows.find((r) => r.xId === "poster")?.hero).toBe("h1");
    expect(rows.find((r) => r.xId === "fixer")?.hero).toBe("h9");
  });
  it("その期間に投稿がなければ、全期間の投稿のキャラ", async () => {
    const { users } = await computeScores(
      fakeEnv(
        [{ id: "1", x: "old", at: "2026-11-01T00:00:00Z", posted: "2026-11-01T00:00:00Z", a: "h5", t: "h2", fixed: 0 }],
        [{ x: "old", at: "2026-11-28T01:00:00Z", a: "h9" }],
      ),
      Date.parse("2026-11-29T00:00:00Z"),
      eventWindow("2026-11-27", "2026-12-24"),
    );
    // イベント中は修正提案だけ → まずその期間の修正提案のキャラ
    expect(rank([...users.values()], "event")[0].hero).toBe("h9");
    expect(rank([...users.values()], "total")[0].hero).toBe("h5");
  });
});
