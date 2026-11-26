import { useLayoutEffect, useRef } from "react";
import { Link, useParams } from "react-router";
import { ATTACK_LABEL, CUE_LABEL } from "../../shared/constants";
import { BADGES, EVENT_TIER_LABEL, EVENT_TIER_STARS, fmtPoints } from "../../shared/ranking";
import type { Hero, UserResponse } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { EventBadge } from "../components/EventBadge";
import { Header } from "../components/Header";
import { useApi } from "../lib/api";
import { useData } from "../lib/data";
import { PROG, useBootFx } from "../lib/fx";
import { openShare } from "../lib/share";
import { copyText, fmtDate } from "../lib/ui";

/** 投稿者のページ：名刺のようなプロフィールカード・バッジ・マイヒーローと、その人の公開中の合わせ（docs/DECISIONS.md BK） */
export function User() {
  const { xid = "" } = useParams();
  const { data, error } = useApi<UserResponse>(`/api/users/${encodeURIComponent(xid)}`);
  const { publicAppUrl } = useData();
  useBootFx(!!data || !!error);

  // マイヒーロー：攻撃側に選んだ回数が多い順（同じ数なら新しく使ったほう）
  const heroes: { h: Hero; n: number; at: string }[] = [];
  for (const t of data?.timings ?? []) {
    const e = heroes.find((x) => x.h.id === t.attacker.id);
    if (e) {
      e.n++;
      if (t.at > e.at) e.at = t.at;
    } else heroes.push({ h: t.attacker, n: 1, at: t.at });
  }
  heroes.sort((a, b) => b.n - a.n || (a.at < b.at ? 1 : -1));
  const posts = (data?.timings ?? []).filter((t) => t.kind === "post").length;
  const fixes = (data?.timings.length ?? 0) - posts;
  const since = (data?.timings ?? []).map((t) => t.at).sort()[0];
  const bi = data?.badge ? BADGES.findIndex((b) => b.name === data.badge) : -1;
  // イベント期間中は、ポイント・順位・バッジのゲージをイベントのものに切り替える（docs/DECISIONS.md BN）
  const ev = data?.event ?? null;
  const evTiers = ev?.badgeName
    ? (["low", "mid", "high"] as const).filter((k) => ev.tiers[k] != null).map((k) => ({ kind: k, name: EVENT_TIER_LABEL[k], min: ev.tiers[k]!, stars: EVENT_TIER_STARS[k] }))
    : [];
  const ei = ev ? evTiers.reduce((n, t, i) => (ev.points >= t.min ? i : n), -1) : -1;
  // 「今は ○位！」は、名刺の順位と同じく、イベントランキングが公開されているときだけ
  const evRankNow = ev?.rank && ev.rank <= 3 ? ev.rank : null;
  const pageUrl = `${publicAppUrl.replace(/\/+$/, "")}/u/${encodeURIComponent(data?.xId ?? xid)}`;

  // 長い X の ID は、カードからはみ出さない大きさまで縮める
  const idRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const e = idRef.current;
    if (!e) return;
    e.style.fontSize = "";
    const w = e.parentElement!.clientWidth - 8;
    let f = parseFloat(getComputedStyle(e).fontSize);
    while (e.scrollWidth > w && f > 15) e.style.fontSize = `${--f}px`;
  }, [data]);

  return (
    <>
      <Header title={`@${data?.xId ?? xid}`} sub="投稿者のページ" back="/ranking" prog={PROG.other} />
      {error && <div className="empty">{error.status === 404 ? "この投稿者の公開中の合わせはありません" : "読み込みに失敗しました"}</div>}
      {data && (
        <>
          <div className="pcard">
            <div className="pc-top">
              <div className="pc-ic">{heroes[0] ? <Avatar hero={heroes[0].h} /> : <div className="av">?</div>}</div>
              <div className="pc-nm">
                <div className="pc-lbl">HS AWASE PLAYER</div>
                <div className="pc-id" ref={idRef}>
                  @{data.xId}
                </div>
                {data.badge ? (
                  <div className="pc-bdg">
                    <i>★</i>
                    {data.badge}
                  </div>
                ) : (
                  <div className="pc-bdg none">バッジなし</div>
                )}
                {since && <div className="pc-since">SINCE {since.slice(0, 10).replace(/-/g, ".")}</div>}
              </div>
              <span className="pc-no">HIROAPP PLAYER CARD</span>
            </div>
            {/* ランキングの対象外の人も、合わせポイントと件数は出す（順位は「−」） */}
            <div className="pc-stats">
              <div>
                <b>
                  {fmtPoints(ev ? ev.points : data.total)}
                  <small>pt</small>
                </b>
                <span>{ev ? "イベントポイント" : "合わせポイント"}</span>
              </div>
              <div className="mid">
                <b>
                  {(ev ? ev.rank : data.rankTotal) ?? "−"}
                  {(ev ? ev.rank : data.rankTotal) && <small>位</small>}
                </b>
                <span>{ev ? "イベントランキング" : "累計ランキング"}</span>
              </div>
              <div>
                <b>
                  {data.timings.length}
                  <small>件</small>
                </b>
                <span>
                  投稿{posts}・修正{fixes}
                </span>
              </div>
            </div>
          </div>
          {/* 今月の行は期間外だけ（イベント期間中は名刺の数字がイベントのものになる。docs/DECISIONS.md BN） */}
          {!data.event && data.showMonth && data.rankMonth && (
            <div className="pc-sub">
              今月：<b>{fmtPoints(data.month)}pt</b>（{data.rankMonth}位）
            </div>
          )}
          <div className="pc-acts">
            <a className="pc-btn" href={`https://x.com/${data.xId}`} target="_blank" rel="noopener noreferrer">
              𝕏 プロフィール ↗
            </a>
            <button
              type="button"
              className="pc-btn dark"
              onClick={() =>
                openShare({
                  title: `#${data.xId} の投稿者ページ｜ヒロアプ`,
                  text: `#${data.xId} の HS合わせ\n合わせポイント ${fmtPoints(data.total)}pt${data.rankTotal ? `・累計 ${data.rankTotal}位` : ""}${data.badge ? `・${data.badge}` : ""}\n\n#ヒロアプ #HS合わせ #コンパス`,
                  url: pageUrl,
                })
              }
            >
              𝕏 このページを共有
            </button>
            {data.supportCode && (
              <button type="button" className="pc-btn code" onClick={() => copyText(data.supportCode!, "応援コードをコピーしました")}>
                応援コード {data.supportCode} 📋
              </button>
            )}
          </div>
          {ev && evTiers.length > 0 ? (
            <div className={`pc-ladder ev ${ei === evTiers.length - 1 ? "max" : ""}`}>
              <div className="ttl">
                <span>{ev.name}</span>
                <small>
                  {evRankNow
                    ? `今は ${evRankNow}位！ 上位 3人は特別なバッジ`
                    : ei === evTiers.length - 1
                      ? `「${evTiers[ei].name}」到達！`
                      : `次は「${evTiers[ei + 1].name}」`}
                </small>
              </div>
              <div className="steps">
                {evTiers.map((t, i) => (
                  <div key={t.kind} className={`${i <= ei ? "on" : ""} ${i === ei ? "now" : ""}`}>
                    <i />
                    {"★".repeat(t.stars)} {t.name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <div className={`pc-ladder ${bi === BADGES.length - 1 ? "max" : ""}`}>
            <div className="ttl">
              <span>バッジ</span>
              <small>{bi === BADGES.length - 1 ? "最高ランク到達！" : bi >= 0 ? `次は「${BADGES[bi + 1].name}」（${BADGES[bi + 1].min}pt）` : `「${BADGES[0].name}」まであと少し`}</small>
            </div>
            <div className="steps">
              {BADGES.map((b, i) => (
                <div key={b.name} className={`${i <= bi ? "on" : ""} ${i === bi ? "now" : ""}`}>
                  <i />
                  {b.name}
                </div>
              ))}
            </div>
          </div>
          )}
          {/* イベントで確定したバッジ（docs/DECISIONS.md BM） */}
          {data.eventBadges.length > 0 && (
            <>
              <div className="sec">獲得したイベントバッジ</div>
              <div className="pc-evb">
                {data.eventBadges.map((b) => (
                  <EventBadge key={b.eventName + b.endsOn} label={b.label} kind={b.kind} title={b.eventName} />
                ))}
              </div>
            </>
          )}
          {heroes.length > 0 && (
            <>
              <div className="sec">マイヒーロー</div>
              <div className="pc-fav">
                {heroes.slice(0, 2).map((f) => (
                  <div key={f.h.id}>
                    <Avatar hero={f.h} />
                    <span>
                      {f.h.name}
                      <b>
                        {f.n}
                        <small>件</small>
                      </b>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="sec">公開中の合わせ（{data.timings.length} 件）</div>
          {data.timings.map((t) => (
            <Link key={t.kind + t.id} className="entry ulink" to={`/h/${t.attacker.slug}/${t.target.slug}#t-${t.id}`}>
              <div className="pc-mu">
                <Avatar hero={t.attacker} />
                <b>{t.attacker.name}</b>
                <span className="ar">▶</span>
                <Avatar hero={t.target} />
                <b>{t.target.name}</b>
                <span className="dt">{fmtDate(t.at)}</span>
              </div>
              <div className="tim" style={{ marginTop: 8 }}>
                {t.timingText}
              </div>
              <div className="pc-meta">
                <span className="chip atk">⚔ {ATTACK_LABEL[t.attackType]}</span>
                <span className="chip">目印：{CUE_LABEL[t.cueType]}</span>
                {t.kind === "fix" && <span className="chip st-merged">修正</span>}
              </div>
            </Link>
          ))}
        </>
      )}
    </>
  );
}
