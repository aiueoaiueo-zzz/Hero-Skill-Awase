import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AdminHero } from "../../../shared/types";
import { ATTACK_LABEL, HERO_ROLES, type NgAttackType } from "../../../shared/constants";
import { Avatar } from "../../components/Avatar";
import { api, ApiError, useApi } from "../../lib/api";
import { useData } from "../../lib/data";
import { useBootFx } from "../../lib/fx";
import { toast } from "../../lib/ui";
import { AdminLayout, adminErrorMessage } from "./AdminLayout";

const ERRORS: Record<string, string> = {
  duplicate_name: "同じ名前のキャラがすでにいます",
  duplicate_slug: "同じ slug のキャラがすでにいます",
  invalid_type: "画像の形式に対応していません",
  invalid_size: "画像が大きすぎます",
};
const errMsg = (e: unknown) =>
  e instanceof ApiError ? (ERRORS[e.message] ?? (e.status === 400 ? "入力内容を確認してください（slug は英小文字・数字・ハイフン）" : "操作に失敗しました")) : "操作に失敗しました";

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
          <div className="box">
            <p>
              名前（カードに出す短い名前）・正式名称・slug（URL 用の英数字）はタップで直接編集できます。
              <br />
              正式名称（任意）は、カードの下・キャラを選ぶ画面に表示され、検索でも当たるようになります。空にすると未設定に戻ります。
              <br />
              攻撃方法（ヒーロースキル・通常攻撃・ヒーローアクション・スキルカード）ごとに、そのキャラで合わせられるかを「可／不可」で選びます。不可にすると、詳細画面のそのタブがグレーになって選べなくなり、投稿でも選べなくなります。
              <br />
              HS のダメージ発生（秒）と無敵時間（秒）を入れると、相手の無敵時間が自分のダメージ発生より短い組み合わせも、HS が「合わせ不可」になります（ヒーロースキルが「不可」のキャラはダメージ発生を入力できません）。
              <br />
              ロールはキャラを選ぶ画面の「ロールで絞り込み」に使います。HS合わせ重要度（★1〜3・−）は攻撃する側（自分）を選ぶ画面の「HS合わせ重要度順」、HS被合わせ重要度（★1〜3）は相手を選ぶ画面の「HS被合わせ重要度順」の並べ替えに使います（−は★1の後、未入力は最後）。
              <br />
              キャラ名をタップすると開閉します。▲▼で並び順を入れ替えられます（トップ画面などの表示順になります）。キャラ画像は一般向けの画面には表示されません。
            </p>
          </div>
          {heroes.map((h, i) => (
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
function HeroCard({ h, first, last, save, move, remove, removeImage }: { h: AdminHero; first: boolean; last: boolean; save: Save; move: (dir: -1 | 1) => void; remove: () => void; removeImage: () => void }) {
  return (
    <div className="hcard">
      <div className="htop">
        {/* キャラ画像は権利への配慮で使わないため、追加はできない（登録済みの画像は「画像を削除」で外せる） */}
        <div className="hico">
          <Avatar hero={h} showImage />
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
          <ImpRow label="重要度" aria="HS合わせ重要度" value={h.hsAttackImportance} dash onChange={(v) => save({ hsAttackImportance: v }, "HS合わせ重要度を保存しました")} />
          <AtkRow h={h} k="hs" save={save} />
          <div className={`hline sub ${h.ngAttacks.includes("hs") ? "off" : ""}`}>
            <span>└ ダメージ発生</span>
            <SecInput label="ダメージ発生" value={h.hsAttackTime} disabled={h.ngAttacks.includes("hs")} onCommit={(v) => save({ hsAttackTime: v }, "ダメージ発生の時間を保存しました")} />
          </div>
        </div>
        <div>
          <AtkRow h={h} k="normal" save={save} />
          <AtkRow h={h} k="action" save={save} />
          <AtkRow h={h} k="card" save={save} />
        </div>
      </div>
      <div className="hsec">被HS合わせ（受）</div>
      <div className="hbot">
        <div>
          <ImpRow label="重要度" aria="HS被合わせ重要度" value={h.hsTargetImportance} onChange={(v) => save({ hsTargetImportance: v }, "HS被合わせ重要度を保存しました")} />
          <div className="hline">
            <span>無敵</span>
            <SecInput label="無敵" value={h.hsInvincibleTime} onCommit={(v) => save({ hsInvincibleTime: v }, "無敵時間を保存しました")} />
          </div>
        </div>
        <div className="hacts">
          {h.imageUrl && <ArmedButton className="sbtn imgdel" label="画像を削除" armedLabel="削除する" onConfirm={removeImage} />}
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

/** 重要度（★1〜3。dash：「−」（対象外）も選べる） */
function ImpRow({ label, aria, value, dash, onChange }: { label: string; aria: string; value: number | null; dash?: boolean; onChange: (v: number | null) => void }) {
  return (
    <label className="hline">
      <span>{label}</span>
      <select aria-label={aria} className={`imp ${value == null ? "unset" : ""}`} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
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

/** 秒の入力欄（空にすると未入力に戻す。フォーカスが外れたら保存） */
function SecInput({ label, value, disabled, onCommit }: { label: string; value: number | null; disabled?: boolean; onCommit: (v: number | null) => Promise<boolean> }) {
  const [v, setV] = useState(value == null ? "" : String(value));
  useEffect(() => setV(value == null ? "" : String(value)), [value]);
  return (
    <span className="secin">
      <input
        aria-label={label}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        max="60"
        value={v}
        disabled={disabled}
        placeholder="—"
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        onBlur={async () => {
          const t = v.trim();
          const n = t === "" ? null : Number(t);
          if (n === value) return;
          if (n !== null && (!Number.isFinite(n) || n < 0 || n > 60)) return setV(value == null ? "" : String(value));
          if (!(await onCommit(n))) setV(value == null ? "" : String(value));
        }}
      />
      秒
    </span>
  );
}
