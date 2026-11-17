import { useNavigate } from "react-router";
import { keyOf, secLabel, starsOf, type PickKind } from "./HeroFilter";
import { useData } from "../lib/data";
import { displayName } from "../../shared/text";
import type { Hero } from "../../shared/types";
import { prefetch } from "../lib/api";
import { Avatar } from "./Avatar";

/** キャラの一覧。preload：タップした瞬間に次の画面のデータを読み始める（画面の切り替えを速くする） */
/** ng：合わせ不可能な相手（カードに「HS合わせ不可」を付ける）。partial：一部の場面だけ合わせ不可（「HS一部不可」）。kind：カードに ★ と秒数を出す（attack：HS合わせ適性・HS ダメージ発生／target：HS警戒度・無敵時間） */
export function HeroGrid({ heroes, to, preload, ng, partial, kind }: { heroes: Hero[]; to: (h: Hero) => string; preload?: (h: Hero) => string; ng?: Set<string>; partial?: Set<string>; kind?: PickKind }) {
  const nav = useNavigate();
  // 今週のキャラ（docs/DECISIONS.md AL）
  const { featured } = useData();
  const feat = new Set(featured.map((f) => f.heroId));
  return (
    <div className="grid">
      {heroes.map((h) => (
        <button
          key={h.id}
          className={`card ${ng?.has(h.id) ? "ng" : ""} ${feat.has(h.id) ? "feat" : ""}`}
          onPointerDown={() => preload && prefetch(preload(h)).catch(() => {})}
          onClick={() => {
            if (preload) prefetch(preload(h)).catch(() => {});
            nav(to(h));
          }}
        >
          <Avatar hero={h} />
          {/* 合わせ不可の帯はアイコンの下の端に重ねる（カードの高さは変えない。docs/DECISIONS.md AU） */}
          {ng?.has(h.id) ? <span className="ngmark">
              HS<small>で</small>合わせ不可
            </span> : partial?.has(h.id) ? <span className="ngmark part">HS一部不可</span> : null}
          <div className="nm" title={displayName(h)} style={nameStyle(h.name)}>
            {h.name}
          </div>
          {kind && <Badge stars={starsOf(h, kind)} text={secLabel(h, kind)} />}
          {feat.has(h.id) && <span className="featmark">今週</span>}
          {/* 重要タグ（右上・丸め。docs/DECISIONS.md AT・AU） */}
          {kind && keyOf(h, kind) && <span className="keymark">重要！</span>}
        </button>
      ))}
    </div>
  );
}

/** 秒数（上）と ★（下）。どの並び順でも出す。秒数は数字を大きく、「秒」を小さく出す（docs/DECISIONS.md AQ） */
function Badge({ stars, text }: { stars: string; text: string }) {
  // ヒーロースキルが不可などで秒数が無く ★ が「−」のときは、「−」を 2 行ぶんの高さの真ん中に出す（高さはほかのカードとそろえる）
  const dash = !text && stars === "−";
  return (
    <div className={`cbadge ${dash ? "dash" : ""}`}>
      <div className={`stars bsec ${text.length > 6 ? "long" : ""}`}>{text.split(/(秒)/).map((t, i) => (t === "秒" ? <small key={i}>秒</small> : t))}</div>
      <div className="stars">{stars}</div>
      {dash && <div className="dashmark">−</div>}
    </div>
  );
}

/**
 * カードの名前は略称（短い名前）を 1 行で出す。カードの幅に収まらない長さのときだけ文字を小さくして全部見せる（docs/DECISIONS.md AR）。
 * 文字の大きさはカードの幅（100cqw）÷ 文字数（半角は 0.6 文字ぶん）で、最大 10px。狭い画面のスマホでも切れない
 */
function nameStyle(name: string) {
  const w = [...name].reduce((n, c) => n + (c.charCodeAt(0) < 0x80 ? 0.6 : 1), 0);
  return { fontSize: `min(10px, calc(100cqw / ${Math.max(w, 4).toFixed(1)}))` };
}
