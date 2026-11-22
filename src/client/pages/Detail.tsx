import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import type { AttackType } from "../../shared/constants";
import type { PairResponse } from "../../shared/types";
import { blockedAttacks } from "../../shared/hs";
import { Header } from "../components/Header";
import { PairView, tabMemory } from "../components/PairView";
import { shortLink, timingLink, timingShareText } from "../../shared/share";
import { useApi } from "../lib/api";
import { useData } from "../lib/data";
import { openShare } from "../lib/share";
import { PROG, useBootFx } from "../lib/fx";

/** 3. タイミング詳細 */
export function Detail() {
  const { a = "", t = "" } = useParams();
  const nav = useNavigate();
  const { data, error } = useApi<PairResponse>(
    `/api/pairs/${encodeURIComponent(a)}/${encodeURIComponent(t)}`,
    { cached: true },
  );
  const key = `${a}/${t}`;
  const [tab, setTab] = useState<AttackType | undefined>(tabMemory.get(key));
  const { publicAppUrl, heroes } = useData();
  const { hash } = useLocation();
  // 共有リンク（#t-<タイミングID>）で開いたとき：そのタイミングのタブを開いて、そこまで移動する
  const linkedId = hash.startsWith("#t-")
    ? decodeURIComponent(hash.slice(3))
    : null;
  const [flashId, setFlashId] = useState<string | null>(null);
  const scrolled = useRef<string | null>(null);
  useEffect(() => {
    if (!data || !linkedId || scrolled.current === linkedId) return;
    const t = data.timings.find((x) => x.id === linkedId);
    if (!t || blockedAttacks(data.attacker, data.target).has(t.attackType)) return;
    if (tab !== t.attackType) {
      setTab(t.attackType);
      return; // タブが切り替わってから移動する
    }
    scrolled.current = linkedId;
    requestAnimationFrame(() => {
      document
        .getElementById(`t-${linkedId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFlashId(linkedId);
      setTimeout(() => setFlashId(null), 2500);
    });
  }, [data, linkedId, tab]);
  useBootFx(!!data || !!error);
  if (error?.status === 404) return <Navigate to="/" replace />;

  // キャラは最初の読み込みで分かっているので、タイミングを待たずに見出しと VS を出す
  const A = data?.attacker ?? heroes.find((h) => h.slug === a);
  const T = data?.target ?? heroes.find((h) => h.slug === t);
  const select = (k: AttackType) => {
    tabMemory.set(key, k);
    setTab(k);
  };

  return (
    <>
      <Header
        title={A && T ? `${A.name} → ${T.name}` : ""}
        sub={T ? `${T.name}のHS明けに合わせるタイミング` : ""}
        back={`/h/${a}`}
        prog={PROG.step3}
      />
      {error && <div className="empty">読み込みに失敗しました</div>}
      <PairView
        A={A}
        T={T}
        timings={data?.timings ?? []}
        loaded={!!data}
        tab={tab}
        onTab={select}
        flashId={flashId}
        emptyText={
          <>
            まだ情報がありません。
            <br />
            知っている方はぜひ投稿してください！
          </>
        }
        actions={(x) => (
          <>
            <button
              className="sbtn"
              onClick={() =>
                openShare({
                  title: `${A!.name} → ${T!.name}｜ヒロアプ`,
                  text: timingShareText({
                    attacker: A!.name,
                    target: T!.name,
                    attackType: x.attackType,
                    cueType: x.cueType,
                    timingText: x.timingText,
                    nickname: x.nickname,
                    supportCode: x.supportCode,
                  }),
                  url: x.shareCode ? shortLink(publicAppUrl, x.shareCode) : timingLink(publicAppUrl, A!.slug, T!.slug, x.id),
                })
              }
            >
              共有
            </button>
            <button className="sbtn" onClick={() => nav(`/submit?fix=${x.id}`)}>
              修正を提案
            </button>
          </>
        )}
      />
      {data && (
        <button className="fab" onClick={() => nav(`/submit?a=${encodeURIComponent(a)}&t=${encodeURIComponent(t)}`)}>
          ＋ この組み合わせを投稿
        </button>
      )}
    </>
  );
}
