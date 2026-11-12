import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AdminHero, HsInvincible } from "../../../shared/types";
import { invincibleToText, parseInvincibleText } from "../../../shared/hs";
import { ATTACK_LABEL, HERO_ROLES, type NgAttackType } from "../../../shared/constants";
import { Avatar } from "../../components/Avatar";
import { api, ApiError, useApi } from "../../lib/api";
import { useData } from "../../lib/data";
import { useBootFx } from "../../lib/fx";
import { sniffImageType } from "../../lib/image";
import { toast } from "../../lib/ui";
import { AdminLayout, adminErrorMessage } from "./AdminLayout";
import { HeroSearch, matchHero, useHeroQuery } from "./HeroSearch";

const ERRORS: Record<string, string> = {
  duplicate_name: "同じ名前のキャラがすでにいます",
  duplicate_slug: "同じ slug のキャラがすでにいます",
  invalid_type: "画像の形式に対応していません",
  invalid_size: "画像が大きすぎます",
  images_disabled: "画像の設定が止まっています（管理画面が古いままの可能性があります）",
};
const errMsg = (e: unknown) =>
  e instanceof ApiError ? (ERRORS[e.message] ?? (e.status === 400 ? "入力内容を確認してください（slug は英小文字・数字・ハイフン）" : "操作に失敗しました")) : "操作に失敗しました";

/** 画像を読み込む。中身の形式で読み直し、createImageBitmap（向きの情報も反映）→ だめなら <img> で読む */
async function decodeImage(input: File): Promise<{ src: CanvasImageSource; w: number; h: number }> {
  const type = await sniffImageType(input).catch(() => null);
  const file = type && type !== input.type ? new Blob([input], { type }) : input;
  try {
    const bmp = await createImageBitmap(file);
    return { src: bmp, w: bmp.width, h: bmp.height };
  } catch {
    // 古いブラウザ・一部の形式は <img> の方が読める
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("decode_failed"));
      i.src = url;
    });
    if (img.decode) await img.decode().catch(() => {});
    return { src: img, w: img.naturalWidth, h: img.naturalHeight };
  } finally {
    // 描画が終わるまで URL は必要なので、少し待ってから解放する
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

/** 画像を正方形に切り抜いて 256×256 の WebP に縮小する（WebP を作れないブラウザでは JPEG） */
async function resizeImage(file: File): Promise<Blob> {
  const { src, w, h } = await decodeImage(file);
  if (!w || !h) throw new Error("decode_failed");
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const s = Math.min(w, h);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("encode_failed");
  ctx.fillStyle = "#fff"; // 透明な部分は白にする（JPEG になったときに黒くならないように）
  ctx.fillRect(0, 0, S, S);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, (w - s) / 2, (h - s) / 2, s, s, 0, 0, S, S);
  const toBlob = (type: string) => new Promise<Blob | null>((r) => c.toBlob(r, type, 0.85));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpg = await toBlob("image/jpeg");
  if (!jpg) throw new Error("encode_failed");
  return jpg;
}

/** 1 回目で確認の表示に変わり、2.5 秒以内にもう一度押すと実行（試作版 armed） */
export function ArmedButton({ className, label, armedLabel, onConfirm, ...rest }: { className: string; label: ReactNode; armedLabel: string; onConfirm: () => void; "aria-label"?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={`${className} ${armed ? "armed" : ""}`}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
      {...rest}
    >
      {armed ? armedLabel : label}
    </button>
  );
}

/** その場で編集して、フォーカスが外れたら保存する入力欄 */
function InlineInput({ value, onCommit, style, allowEmpty, ...rest }: { value: string; onCommit: (v: string) => Promise<boolean>; style?: React.CSSProperties; allowEmpty?: boolean; "aria-label": string; placeholder?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      value={v}
      style={style}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      onBlur={async () => {
        const t = v.trim();
        if (t === value) return setV(value);
        if ((!t && !allowEmpty) || !(await onCommit(t))) setV(value);
      }}
      {...rest}
    />
  );
}

/** 8. 管理：キャラ管理 */
export function AdminHeroes() {
  const pending = useApi<{ groups: { timings: unknown[] }[] }>("/api/admin/pending");
  const { reload } = useData();
  const [heroes, setHeroes] = useState<AdminHero[] | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [bulk, setBulk] = useState("");
  const rows = useRef(new Map<string, HTMLDivElement>());
  // 検索・絞り込み（▲▼の並べ替えは全体の順番のまま）
  const [cond, setCond] = useHeroQuery();
  // 開いているキャラ（最初は全部閉じる）
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpened((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  useEffect(() => {
    api<{ heroes: AdminHero[] }>("/api/admin/heroes").then(
      (r) => setHeroes(r.heroes),
      (e) => setError(e instanceof ApiError ? e.status : 0),
    );
  }, []);
  useBootFx(!!heroes || error !== null);

  /** 操作して一覧を更新し、トップなどの表示にもすぐ反映する */
  const run = async (fn: () => Promise<{ heroes: AdminHero[] }>, msg?: string) => {
    try {
      const r = await fn();
      setHeroes(r.heroes);
      await reload();
      if (msg) toast(msg);
      return true;
    } catch (e) {
      toast(errMsg(e));
      return false;
    }
  };
  const call = (url: string, method: string, body?: unknown) => () =>
    api<{ heroes: AdminHero[] }>(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });

  const move = async (h: AdminHero, dir: -1 | 1) => {
    await run(call(`/api/admin/heroes/${h.id}/move`, "POST", { dir }));
    requestAnimationFrame(() => rows.current.get(h.id)?.scrollIntoView({ block: "center" }));
  };
  const setImage = async (h: AdminHero, file: File | undefined) => {
    if (!file) return;
    let blob: Blob;
    // どこで失敗したか分かるように、形式と大きさを添えて知らせる
    const sniffed = await sniffImageType(file).catch(() => null);
    const info = `${file.name || "名前なし"}・形式：${file.type || "不明"}${sniffed && sniffed !== file.type ? `（中身は ${sniffed}）` : ""}・${Math.max(1, Math.round(file.size / 1024))}KB`;
    try {
      blob = await resizeImage(file);
    } catch (e) {
      const heic = sniffed === "image/heic" || /heic|heif/i.test(file.type + file.name);
      return toast(
        heic
          ? `HEIC の画像はこのブラウザで読み込めませんでした（${info}）。JPEG か PNG で保存し直してください`
          : !sniffed
            ? `画像ファイルではないようです（${info}）。お絵描きアプリの作品ファイルではなく、PNG か JPEG で書き出した画像を選んでください`
            : `画像を読み込めませんでした（${info}${e instanceof Error && e.message === "encode_failed" ? "・変換に失敗" : ""}）。PNG か JPEG で保存し直してお試しください`,
      );
    }
    try {
      const res = await fetch(`/api/admin/heroes/${h.id}/image`, { method: "PUT", headers: { "Content-Type": blob.type }, body: blob });
      const data = (await res.json().catch(() => ({}))) as { error?: string; heroes?: AdminHero[] };
      if (!res.ok || !data.heroes) {
        const code = data.error || `HTTP ${res.status}`;
        return toast(`${ERRORS[code] ?? "画像を保存できませんでした"}（${code}）`);
      }
      setHeroes(data.heroes);
      await reload();
      toast("画像を設定しました");
    } catch {
      toast("画像を送信できませんでした。通信状況を確認して、もう一度お試しください");
    }
  };
  const add = async () => {
    const items = bulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^(.+?)\s*[,，、\t]\s*([a-z0-9][a-z0-9-]*)$/);
        return m ? { name: m[1].trim(), slug: m[2] } : { name: l };
      });
    if (!items.length) return toast("追加するキャラがありません");
    try {
      const r = await api<{ added: number; skipped: string[]; heroes: AdminHero[] }>("/api/admin/heroes", { method: "POST", body: JSON.stringify({ items }) });
      setHeroes(r.heroes);
      await reload();
      toast(r.added ? `${r.added}キャラ追加しました` : "追加するキャラがありません（同じ名前は追加しません）");
      if (r.added) setBulk("");
    } catch (e) {
      toast(errMsg(e));
    }
  };

  return (
    <AdminLayout tab="heroes" pendingCount={pending.data?.groups.reduce((s, g) => s + g.timings.length, 0)}>
      {error !== null && <div className="empty">{adminErrorMessage(error)}</div>}
      {heroes && (
        <>
          {/* 使い方（最初は閉じておく） */}
          <details className="box hhelp">
            <summary>キャラ管理の使い方</summary>
            <ul>
              <li>キャラ名をタップで開閉。名前・正式名称・slug はタップして直接編集（正式名称は空で未設定）。</li>
              <li>アイコン：左上をタップして画像を選ぶ（正方形・256×256 に縮小）。</li>
              <li>攻撃方法ごとの「可／不可」：不可は詳細画面のタブがグレーになり、投稿でも選べない。</li>
              <li>ダメージ発生・無敵（秒）：「3.1」または場面ごとに「1回目:1.5 / 2回目以降:5.5」。無敵が足りない組み合わせは HS が「合わせ不可」（一部の場面だけなら「一部不可」）。</li>
              <li>ロール：キャラ選択の絞り込み。HS合わせ適性（★・−）／HS警戒度（★）：キャラ選択の並び順。</li>
              <li>▲▼：表示順の入れ替え。</li>
            </ul>
          </details>
          <HeroSearch c={cond} set={setCond} shown={heroes.filter((h) => matchHero(h, cond)).length} total={heroes.length} />
          {!heroes.some((h) => matchHero(h, cond)) && <div className="empty">条件に合うキャラがいません</div>}
          {heroes.map((h, i) => !matchHero(h, cond) ? null : (
            <div
              className="hrow"
              key={h.id}
              ref={(el) => {
                if (el) rows.current.set(h.id, el);
                else rows.current.delete(h.id);
              }}
            >
              <button className={`hhead ${opened.has(h.id) ? "on" : ""}`} aria-expanded={opened.has(h.id)} onClick={() => toggle(h.id)}>
                <span className="tri">{opened.has(h.id) ? "▼" : "▶"}</span>
                <span className="hn">{h.name}</span>
              </button>
              {opened.has(h.id) && (
                <HeroCard
                  h={h}
                  first={i === 0}
                  last={i === heroes.length - 1}
                  save={(patch, msg) => run(call(`/api/admin/heroes/${h.id}`, "PATCH", patch), msg)}
                  move={(dir) => move(h, dir)}
                  remove={() => run(call(`/api/admin/heroes/${h.id}`, "DELETE"), "削除しました")}
                  removeImage={() => run(call(`/api/admin/heroes/${h.id}/image`, "DELETE"), "画像を削除しました")}
                  setImage={(f) => setImage(h, f)}
                />
              )}
            </div>
          ))}
          <div className="box" style={{ marginTop: 14 }}>
            <p>
              キャラを追加（1行に1キャラ、まとめて貼り付けOK）
              <br />
              「キャラ名, slug」の形で slug も指定できます（省略すると仮の slug を付けます）。
            </p>
            <textarea placeholder={"キャラ名, slug\nキャラ名"} value={bulk} onChange={(e) => setBulk(e.target.value)} />
            <div className="btns">
              <button className="primary" onClick={add}>
                追加
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

type Save = (patch: Record<string, unknown>, msg: string) => Promise<boolean>;

/** キャラ 1 体の編集カード（開いたときだけ出す）。変えたらすぐ保存 */
function HeroCard({ h, first, last, save, move, remove, removeImage, setImage }: { h: AdminHero; first: boolean; last: boolean; save: Save; move: (dir: -1 | 1) => void; remove: () => void; removeImage: () => void; setImage: (f: File | undefined) => void }) {
  // ヒーロースキルが不可なら、HS合わせ適性は「−」で固定
  const hsNg = h.ngAttacks.includes("hs");
  return (
    <div className="hcard">
      <div className="htop">
        {/* アイコン：タップして画像を選ぶ（正方形に切り抜いて 256×256 に縮小。docs/DECISIONS.md AI） */}
        <div className="hico">
          <label className="imgpick" aria-label={`${h.name}のアイコンを設定`}>
            <Avatar hero={h} />
            <span className="imgbtn">{h.imageUrl ? "変更" : "画像を選ぶ"}</span>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                setImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {h.imageUrl && <ArmedButton className="imgbtn imgdel2" label="画像を外す" armedLabel="外す" onConfirm={removeImage} />}
          <div className="slug">
            /h/
            <InlineInput aria-label="slug" value={h.slug} onCommit={(v) => save({ slug: v }, "保存しました")} />
          </div>
        </div>
        <div className="hnames">
          <InlineInput aria-label="名前" value={h.name} style={{ fontSize: 18, fontWeight: 800 }} onCommit={(v) => save({ name: v }, "保存しました")} />
          <InlineInput
            aria-label="正式名称"
            allowEmpty
            value={h.fullName ?? ""}
            placeholder="正式名称（任意）"
            style={{ fontSize: 12.5 }}
            onCommit={(v) => save({ fullName: v }, v ? "正式名称を保存しました" : "正式名称を消しました")}
          />
        </div>
        <div className="hsel">
          <select aria-label="ロール" className={h.role ? "" : "unset"} value={h.role ?? ""} onChange={(e) => save({ role: e.target.value || null }, "ロールを保存しました")}>
            <option value="">ロール</option>
            {HERO_ROLES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="hsec">HS合わせ（攻撃）</div>
      <div className="hatk">
        <div>
          <ImpRow label="HS合わせ適性" aria="HS合わせ適性" value={hsNg ? 0 : h.hsAttackImportance} dash fixed={hsNg} onChange={(v) => save({ hsAttackImportance: v }, "HS合わせ適性を保存しました")} />
          <AtkRow h={h} k="hs" save={save} />
        </div>
        <div>
          <AtkRow h={h} k="normal" save={save} />
          <AtkRow h={h} k="action" save={save} />
          <AtkRow h={h} k="card" save={save} />
        </div>
      </div>
      <div className={`hline hinv hatkt ${h.ngAttacks.includes("hs") ? "off" : ""}`}>
        <span>└ ヒーロースキルのダメージ発生</span>
        <AtkTimeInput h={h} disabled={h.ngAttacks.includes("hs")} save={save} />
      </div>
      <div className="hsec">被HS合わせ（受）</div>
      <div className="hline hinv">
        <span>無敵</span>
        <InvInput value={h.hsInvincible} onCommit={(v) => save({ hsInvincible: v }, "無敵時間を保存しました")} />
        <span className="u">秒</span>
      </div>
      <div className="hint hinvh">場面で変わるときは「1回目:1.5 / 2回目以降:5.5」、補足は「最短距離時:4.7」のように入力</div>
      <div className="hbot">
        <div>
          <ImpRow label="HS警戒度" aria="HS警戒度" value={h.hsTargetImportance} onChange={(v) => save({ hsTargetImportance: v }, "HS警戒度を保存しました")} />
        </div>
        <div className="hacts">
          <button className="sbtn" disabled={first} aria-label="上へ" onClick={() => move(-1)}>
            ▲
          </button>
          <button className="sbtn" disabled={last} aria-label="下へ" onClick={() => move(1)}>
            ▼
          </button>
          <ArmedButton className="sbtn danger" label="削除" armedLabel={h.timingCount ? `投稿${h.timingCount}件も削除・確定` : "確定"} onConfirm={remove} />
        </div>
      </div>
    </div>
  );
}

/** HS合わせ適性・HS警戒度（★1〜3。dash：「−」（対象外）も選べる。fixed：変更できない） */
function ImpRow({ label, aria, value, dash, fixed, onChange }: { label: string; aria: string; value: number | null; dash?: boolean; fixed?: boolean; onChange: (v: number | null) => void }) {
  return (
    <label className={`hline ${fixed ? "off" : ""}`}>
      <span>{label}</span>
      <select aria-label={aria} className={`imp ${value == null ? "unset" : ""}`} value={value ?? ""} disabled={fixed} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
        <option value="">未入力</option>
        <option value="3">★★★</option>
        <option value="2">★★☆</option>
        <option value="1">★☆☆</option>
        {dash && <option value="0">−</option>}
      </select>
    </label>
  );
}

/** 攻撃方法 1 つの「可／不可」 */
function AtkRow({ h, k, save }: { h: AdminHero; k: NgAttackType; save: Save }) {
  const ng = h.ngAttacks.includes(k);
  return (
    <label className="hline">
      <span>{ATTACK_LABEL[k]}</span>
      <select
        aria-label={`${ATTACK_LABEL[k]}での合わせ`}
        className={ng ? "ng" : ""}
        value={ng ? "ng" : "ok"}
        onChange={(e) =>
          save(
            { ngAttacks: e.target.value === "ng" ? [...h.ngAttacks, k] : h.ngAttacks.filter((x) => x !== k) },
            `${ATTACK_LABEL[k]}を「${e.target.value === "ng" ? "不可" : "可"}」にしました`,
          )
        }
      >
        <option value="ok">可</option>
        <option value="ng">不可</option>
      </select>
    </label>
  );
}

/** 無敵時間の入力欄（「7.34」または「1回目:1.5 / 2回目以降:5.5」。空にすると未入力。フォーカスが外れたら保存） */
function InvInput({ value, onCommit }: { value: HsInvincible[]; onCommit: (v: HsInvincible[]) => Promise<boolean> }) {
  const text = invincibleToText(value);
  const [v, setV] = useState(text);
  useEffect(() => setV(text), [text]);
  return (
    <input
      aria-label="無敵"
      className="invin"
      value={v}
      placeholder="—"
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      onBlur={async () => {
        const list = parseInvincibleText(v);
        if (!list) {
          toast("無敵時間は「7.34」か「1回目:1.5 / 2回目以降:5.5」の形で、0〜60 秒で入力してください");
          return setV(text);
        }
        if (invincibleToText(list) === text) return setV(text);
        if (!(await onCommit(list))) setV(text);
      }}
    />
  );
}

/** ダメージ発生の入力欄（「3.1」または補足付きの「2回目以降:3.1」。空にすると未入力。フォーカスが外れたら保存） */
function AtkTimeInput({ h, disabled, save }: { h: AdminHero; disabled: boolean; save: Save }) {
  const cur: HsInvincible[] = h.hsAttackTime == null ? [] : [{ label: h.hsAttackLabel, sec: h.hsAttackTime }];
  const text = invincibleToText(cur);
  const [v, setV] = useState(text);
  useEffect(() => setV(text), [text]);
  return (
    <span className="secin">
      <input
        aria-label="ダメージ発生"
        className="atkin"
        value={v}
        disabled={disabled}
        placeholder="—"
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        onBlur={async () => {
          const list = parseInvincibleText(v);
          if (!list || list.length > 1) {
            toast("ダメージ発生は「3.1」か「2回目以降:3.1」の形で、0〜60 秒を 1 つだけ入力してください");
            return setV(text);
          }
          if (invincibleToText(list) === text) return setV(text);
          const x = list[0];
          if (!(await save({ hsAttackTime: x ? x.sec : null, hsAttackLabel: x ? x.label : "" }, "ダメージ発生を保存しました"))) setV(text);
        }}
      />
      秒
    </span>
  );
}

