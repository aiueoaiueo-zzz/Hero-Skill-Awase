import { EVENT_TIER_STARS } from "../../shared/ranking";
import type { EventBadgeKind } from "../../shared/types";

/** イベントのバッジ（docs/DECISIONS.md BM）。1〜3 位は金・銀・銅で数字を大きく＋キラキラ、合わせ賞は★の数 */
export function EventBadge({ label, kind, title }: { label: string; kind: EventBadgeKind; title?: string }) {
  if (kind === "rank1" || kind === "rank2" || kind === "rank3") {
    const m = label.match(/^(.*?)(\d+)位$/);
    return (
      <span className={`evb ${kind}`} title={title}>
        <i className="sp a" aria-hidden />
        <i className="sp b" aria-hidden />
        <i className="sp c" aria-hidden />
        {m ? (
          <>
            {m[1]}
            <b className="n">{m[2]}</b>位
          </>
        ) : (
          label
        )}
      </span>
    );
  }
  return (
    <span className={`evb ${kind}`} title={title}>
      <span className="st">{"★".repeat(EVENT_TIER_STARS[kind])}</span>
      {label}
    </span>
  );
}
